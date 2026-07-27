from math import isfinite

from django.db import transaction
from django.db.models import Q

from accounts.models import GameAccount
from echoes.constants import SUBSTAT_TYPES
from echoes.models import SubstatRoll

from analytics.models import GameAccountAnalyticsState
from .incremental_state import (
    CURRENT_MODEL_VERSION,
    CURRENT_SCHEMA_VERSION,
    DIRECT_SEQUENCE_CAPACITY,
    MAX_SET_COUNT_KEYS,
    apply_event,
    empty_payload,
    persistent_payload,
)
from .model_config import DYNAMIC_WEIGHT_BACKTEST_WINDOW, MODEL_KEYS
from .pattern_store import (
    InvalidPatternAggregate,
    affected_prefixes,
    clear_pattern_aggregates,
    pattern_tables_for_recent,
    upsert_pattern_prefixes,
)


class AnalyticsStateUnavailable(Exception):
    """A stable service-level failure; callers must not expose its details."""


def _nonnegative_int(value):
    return type(value) is int and value >= 0


def _nonnegative_number(value):
    return type(value) in (int, float) and isfinite(value) and value >= 0


def _game_account_id(game_account):
    return getattr(game_account, "pk", game_account)


def _locked_account(game_account):
    return GameAccount.objects.select_for_update().get(pk=_game_account_id(game_account))


def _locked_state(game_account):
    account = _locked_account(game_account)
    state, _ = GameAccountAnalyticsState.objects.select_for_update().get_or_create(game_account=account)
    return account, state


def ready_state_for_account(game_account):
    """Return a ready row, preserving the DoesNotExist contract for non-ready rows."""
    return GameAccountAnalyticsState.objects.get(
        game_account_id=_game_account_id(game_account),
        status=GameAccountAnalyticsState.Status.READY,
    )


def _mark_dirty_locked(state, error_code):
    state.status = GameAccountAnalyticsState.Status.DIRTY
    state.source_version += 1
    state.error_code = error_code
    state.rebuild_token = None
    state.rebuild_started_at = None
    state.save(update_fields=[
        "status", "source_version", "error_code", "rebuild_token",
        "rebuild_started_at", "updated_at",
    ])
    return state


def mark_game_account_state_dirty(game_account, *, error_code=""):
    with transaction.atomic():
        _, state = _locked_state(game_account)
        return _mark_dirty_locked(state, error_code)


def _payload_is_valid(payload, total_rolls):
    if (
        not isinstance(payload, dict)
        or not isinstance(total_rolls, int)
        or total_rolls < 0
        or payload.get("total_rolls") != total_rolls
    ):
        return False
    required = {
        "counts", "set_counts", "set_counts_overflow", "recent_sequence",
        "dynamic_outcomes", "online_evaluation",
    }
    if not required.issubset(payload) or "patterns" in payload:
        return False
    if not isinstance(payload["counts"], dict) or not isinstance(payload["set_counts"], dict):
        return False
    if len(payload["set_counts"]) > MAX_SET_COUNT_KEYS:
        return False
    if not _nonnegative_int(payload["set_counts_overflow"]):
        return False
    if any(key not in SUBSTAT_TYPES for key in payload["counts"]):
        return False
    if any(not _nonnegative_int(value) for value in payload["counts"].values()):
        return False
    if any(not isinstance(key, str) or not _nonnegative_int(value) for key, value in payload["set_counts"].items()):
        return False
    if (
        sum(payload["counts"].values()) != total_rolls
        or sum(payload["set_counts"].values()) + payload["set_counts_overflow"] != total_rolls
    ):
        return False
    if not isinstance(payload["recent_sequence"], list) or not isinstance(payload["dynamic_outcomes"], list):
        return False
    if len(payload["recent_sequence"]) != min(total_rolls, DIRECT_SEQUENCE_CAPACITY):
        return False
    if any(value not in SUBSTAT_TYPES for value in payload["recent_sequence"]):
        return False
    if len(payload["dynamic_outcomes"]) != min(total_rolls, DYNAMIC_WEIGHT_BACKTEST_WINDOW):
        return False
    for outcome in payload["dynamic_outcomes"]:
        if not isinstance(outcome, dict) or set(outcome) != {"evaluated", "hits"}:
            return False
        if not isinstance(outcome["evaluated"], bool) or not isinstance(outcome["hits"], dict):
            return False
        if set(outcome["hits"]) != set(MODEL_KEYS):
            return False
        if any(not isinstance(hit, bool) for hit in outcome["hits"].values()):
            return False
    evaluation = payload["online_evaluation"]
    if not isinstance(evaluation, dict) or not isinstance(evaluation.get("models"), dict):
        return False
    if not {"evaluated", "loss_total", "brier_total", "top_hits"}.issubset(evaluation):
        return False
    if not _nonnegative_int(evaluation["evaluated"]):
        return False
    if not all(_nonnegative_number(evaluation[key]) for key in ("loss_total", "brier_total")):
        return False
    top_hits = evaluation["top_hits"]
    if not isinstance(top_hits, dict) or set(top_hits) != {"1", "3", "5"}:
        return False
    if not all(_nonnegative_int(top_hits[str(key)]) for key in (1, 3, 5)):
        return False
    if evaluation["evaluated"] > total_rolls:
        return False
    if any(value > evaluation["evaluated"] for value in top_hits.values()):
        return False
    if not top_hits["1"] <= top_hits["3"] <= top_hits["5"]:
        return False
    if set(evaluation["models"]) != set(MODEL_KEYS):
        return False
    for key in MODEL_KEYS:
        model = evaluation["models"].get(key)
        if not isinstance(model, dict) or not _nonnegative_int(model.get("evaluated")):
            return False
        if not _nonnegative_int(model.get("hits")) or not _nonnegative_number(model.get("loss_total")):
            return False
        if model["evaluated"] != evaluation["evaluated"]:
            return False
        if model["hits"] < 0 or model["hits"] > model["evaluated"] or model["loss_total"] < 0:
            return False
    return True


def _state_is_current(state):
    return (
        state.status == GameAccountAnalyticsState.Status.READY
        and state.schema_version == CURRENT_SCHEMA_VERSION
        and state.model_version == CURRENT_MODEL_VERSION
        and _payload_is_valid(state.payload, state.total_rolls)
    )


def _resolve_owned_account(owner):
    if isinstance(owner, GameAccount):
        return owner
    if getattr(owner, "is_authenticated", False):
        from accounts.ownership import default_game_account
        try:
            return default_game_account(owner)
        except GameAccount.DoesNotExist as exc:
            raise AnalyticsStateUnavailable() from exc
    raise AnalyticsStateUnavailable()


def state_snapshot_for_account(owner):
    """Return one current state, attempting at most two CAS-safe repairs."""
    account = _resolve_owned_account(owner)
    try:
        state = ready_state_for_account(account)
        if _state_is_current(state):
            return state
    except GameAccountAnalyticsState.DoesNotExist:
        pass

    from .state_rebuild import rebuild_game_account_state

    for _ in range(2):
        try:
            result = rebuild_game_account_state(account)
        except Exception as exc:
            raise AnalyticsStateUnavailable() from exc
        if result.saved and _state_is_current(result.state):
            return result.state
        try:
            state = ready_state_for_account(account)
        except GameAccountAnalyticsState.DoesNotExist:
            continue
        if _state_is_current(state):
            return state
    raise AnalyticsStateUnavailable()


def pattern_tables_for_state(state):
    """Load the bounded pattern slice and reject a mixed state/aggregate read."""
    try:
        tables = pattern_tables_for_recent(
            state.game_account_id,
            state.payload["recent_sequence"],
        )
    except InvalidPatternAggregate as exc:
        mark_game_account_state_dirty(
            state.game_account_id,
            error_code="analytics_pattern_invalid",
        )
        raise AnalyticsStateUnavailable() from exc
    current = GameAccountAnalyticsState.objects.filter(
        game_account_id=state.game_account_id,
    ).values("status", "schema_version", "model_version", "source_version").get()
    if (
        current["status"] != GameAccountAnalyticsState.Status.READY
        or current["schema_version"] != state.schema_version
        or current["model_version"] != state.model_version
        or current["source_version"] != state.source_version
    ):
        raise AnalyticsStateUnavailable()
    return tables


def _roll_is_after(roll, state):
    if state.last_tuned_at is None or state.last_roll_id is None:
        return True
    return (roll.tuned_at, roll.id) > (state.last_tuned_at, state.last_roll_id)


def _other_rolls_exist(account, roll):
    return SubstatRoll.objects.filter(echo__game_account=account).exclude(pk=roll.pk).exists()


def _candidates_from_earlier_types(earlier_types):
    seen = set()
    for earlier_type in earlier_types:
        substat_type = (
            earlier_type.get("substat_type")
            if isinstance(earlier_type, dict)
            else earlier_type
        )
        if substat_type in SUBSTAT_TYPES:
            seen.add(substat_type)
    return [substat_type for substat_type in SUBSTAT_TYPES if substat_type not in seen]


def _candidates_before_roll(roll):
    earlier_types = getattr(roll, "_analytics_earlier_types", None)
    if earlier_types is not None:
        return _candidates_from_earlier_types(earlier_types)
    earlier_types = SubstatRoll.objects.filter(echo_id=roll.echo_id).exclude(pk=roll.pk).filter(
        Q(tuned_at__lt=roll.tuned_at) | Q(tuned_at=roll.tuned_at, id__lt=roll.id)
    ).order_by("tuned_at", "id").values_list("substat_type", flat=True)
    return _candidates_from_earlier_types(earlier_types)


def advance_state_for_roll(roll):
    """Safely append one newly-created roll; unsafe ordering is repair-only."""
    with transaction.atomic(savepoint=False):
        try:
            state = GameAccountAnalyticsState.objects.select_for_update().get(
                game_account_id=roll.echo.game_account_id,
            )
            created = False
        except GameAccountAnalyticsState.DoesNotExist:
            account = _locked_account(roll.echo.game_account_id)
            try:
                state = GameAccountAnalyticsState.objects.select_for_update().get(game_account=account)
                created = False
            except GameAccountAnalyticsState.DoesNotExist:
                state = GameAccountAnalyticsState(game_account=account)
                created = True

        if created:
            if _other_rolls_exist(account, roll):
                state.save(force_insert=True)
                return _mark_dirty_locked(state, "roll_state_missing_with_history")
            clear_pattern_aggregates(account)
            state.payload = persistent_payload(empty_payload())
            state.total_rolls = 0
            state.schema_version = CURRENT_SCHEMA_VERSION
            state.model_version = CURRENT_MODEL_VERSION
            state.status = GameAccountAnalyticsState.Status.READY
        elif not _state_is_current(state) or not _roll_is_after(roll, state):
            return _mark_dirty_locked(state, "roll_out_of_order")

        prior_sequence = list(state.payload["recent_sequence"])
        prefixes = affected_prefixes(prior_sequence)
        try:
            patterns = pattern_tables_for_recent(
                roll.echo.game_account_id,
                prior_sequence,
            )
        except InvalidPatternAggregate:
            return _mark_dirty_locked(state, "analytics_pattern_invalid")
        state.payload["patterns"] = patterns
        event = {
            "id": roll.id,
            "echo_id": roll.echo_id,
            "substat_type": roll.substat_type,
            "tuned_at": roll.tuned_at,
            "set_name": roll.echo.set_name,
        }
        state.payload = apply_event(state.payload, event, _candidates_before_roll(roll))
        upsert_pattern_prefixes(
            roll.echo.game_account_id,
            state.payload["patterns"],
            prefixes,
        )
        state.payload = persistent_payload(state.payload)
        state.total_rolls += 1
        state.last_tuned_at = roll.tuned_at
        state.last_roll_id = roll.id
        state.source_version += 1
        state.status = GameAccountAnalyticsState.Status.READY
        state.error_code = ""
        if created:
            state.save(force_insert=True)
        else:
            state.save(update_fields=[
                "payload", "total_rolls", "last_tuned_at", "last_roll_id", "source_version",
                "status", "error_code", "updated_at",
            ])
        return state
