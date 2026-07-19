from collections import Counter
from dataclasses import dataclass
from threading import RLock

from echoes.constants import SUBSTAT_TYPES
from echoes.models import SubstatRoll


@dataclass(frozen=True)
class RollSummary:
    events: tuple
    sequence: tuple
    counts: Counter
    set_counts: dict
    total_rolls: int


_summary_cache = {}
_summary_cache_lock = RLock()


def _owner_cache_key(owner):
    return (owner._meta.label_lower, owner.pk)


def _roll_filter_for_owner(owner):
    if owner._meta.model_name == "gameaccount":
        return {"echo__game_account": owner}
    return {"echo__user": owner}


def clear_roll_summary_cache():
    with _summary_cache_lock:
        _summary_cache.clear()


def invalidate_roll_summary(owner):
    if not owner or not owner.pk:
        return
    with _summary_cache_lock:
        _summary_cache.pop(_owner_cache_key(owner), None)


def invalidate_roll_summary_for_echo(echo):
    if not echo:
        return
    with _summary_cache_lock:
        if echo.game_account_id:
            _summary_cache.pop(("accounts.gameaccount", echo.game_account_id), None)
        if echo.user_id:
            _summary_cache.pop(("auth.user", echo.user_id), None)


def _load_roll_summary(owner):
    counts = Counter()
    set_counts = Counter()
    events = []
    rows = (
        SubstatRoll.objects
        .filter(**_roll_filter_for_owner(owner))
        .values_list("substat_type", "tuned_at", "id", "echo_id", "echo__set_name")
    )

    for substat_type, tuned_at, roll_id, echo_id, set_name in rows:
        if substat_type not in SUBSTAT_TYPES:
            continue
        counts[substat_type] += 1
        set_counts[set_name] += 1
        if tuned_at is not None:
            events.append({
                "substat_type": substat_type,
                "tuned_at": tuned_at,
                "id": roll_id,
                "echo_id": echo_id,
            })

    events.sort(key=lambda row: (row["tuned_at"], row["id"]))
    sequence = tuple(event["substat_type"] for event in events)
    return RollSummary(
        events=tuple(events),
        sequence=sequence,
        counts=counts,
        set_counts=dict(set_counts),
        total_rolls=sum(counts.values()),
    )


def build_roll_summary(owner):
    key = _owner_cache_key(owner)
    with _summary_cache_lock:
        cached = _summary_cache.get(key)
        if cached is not None:
            return cached

    summary = _load_roll_summary(owner)
    with _summary_cache_lock:
        return _summary_cache.setdefault(key, summary)
