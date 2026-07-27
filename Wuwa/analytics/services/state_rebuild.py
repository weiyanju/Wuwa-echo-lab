from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone

from analytics.models import GameAccountAnalyticsState
from echoes.models import SubstatRoll

from .incremental_state import CURRENT_MODEL_VERSION, CURRENT_SCHEMA_VERSION, build_payload_from_events


@dataclass(frozen=True)
class RebuildResult:
    state: GameAccountAnalyticsState
    saved: bool
    processed_rolls: int


def ordered_roll_events(game_account):
    rows = (SubstatRoll.objects.filter(echo__game_account=game_account)
            .order_by("tuned_at", "id")
            .values("id", "echo_id", "substat_type", "tuned_at", "echo__set_name")
            .iterator(chunk_size=2000))
    for row in rows:
        yield {"id": row["id"], "echo_id": row["echo_id"], "substat_type": row["substat_type"],
               "tuned_at": row["tuned_at"], "set_name": row["echo__set_name"]}


def rebuild_game_account_state(game_account):
    with transaction.atomic():
        state, _ = GameAccountAnalyticsState.objects.select_for_update().get_or_create(game_account=game_account)
        source_version = state.source_version
        state.status = GameAccountAnalyticsState.Status.BUILDING
        state.error_code = ""
        state.save(update_fields=["status", "error_code", "updated_at"])
    processed = 0
    last_event = None
    try:
        def events():
            nonlocal processed, last_event
            for event in ordered_roll_events(game_account):
                processed += 1
                last_event = event
                yield event
        payload = build_payload_from_events(events())
    except Exception:
        with transaction.atomic():
            state = GameAccountAnalyticsState.objects.select_for_update().get(game_account=game_account)
            if state.source_version == source_version:
                state.status = GameAccountAnalyticsState.Status.FAILED
                state.error_code = "analytics_rebuild_failed"
                state.save(update_fields=["status", "error_code", "updated_at"])
        raise
    with transaction.atomic():
        state = GameAccountAnalyticsState.objects.select_for_update().get(game_account=game_account)
        if state.source_version != source_version:
            if state.status == GameAccountAnalyticsState.Status.BUILDING:
                state.status = GameAccountAnalyticsState.Status.DIRTY
                state.save(update_fields=["status", "updated_at"])
            return RebuildResult(state=state, saved=False, processed_rolls=processed)
        state.payload = payload
        state.total_rolls = payload["total_rolls"]
        state.last_tuned_at = last_event["tuned_at"] if last_event else None
        state.last_roll_id = last_event["id"] if last_event else None
        state.schema_version = CURRENT_SCHEMA_VERSION
        state.model_version = CURRENT_MODEL_VERSION
        state.status = GameAccountAnalyticsState.Status.READY
        state.error_code = ""
        state.built_at = timezone.now()
        state.save()
        return RebuildResult(state=state, saved=True, processed_rolls=processed)
