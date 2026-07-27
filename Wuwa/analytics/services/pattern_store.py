from django.db.models import Q

from analytics.models import GameAccountPatternAggregate
from echoes.constants import SUBSTAT_TYPES


PATTERN_SEPARATOR = "\x1f"


class InvalidPatternAggregate(Exception):
    pass


def empty_pattern_tables():
    return {"1": {}, "2": {}, "3": {}}


def pattern_key(parts):
    return PATTERN_SEPARATOR.join(parts)


def affected_prefixes(recent_sequence):
    return {
        length: pattern_key(recent_sequence[-length:])
        for length in (1, 2, 3)
        if len(recent_sequence) >= length
    }


def _validated_next_counts(row):
    parts = row.prefix.split(PATTERN_SEPARATOR)
    if (
        len(parts) != row.length
        or row.anchor != parts[0]
        or any(part not in SUBSTAT_TYPES for part in parts)
        or not isinstance(row.next_counts, dict)
    ):
        raise InvalidPatternAggregate()
    if any(
        substat_type not in SUBSTAT_TYPES or type(count) is not int or count < 0
        for substat_type, count in row.next_counts.items()
    ):
        raise InvalidPatternAggregate()
    return dict(row.next_counts)


def pattern_tables_for_recent(game_account, recent_sequence):
    tables = empty_pattern_tables()
    prefixes = affected_prefixes(recent_sequence)
    query = Q()
    if 1 in prefixes:
        query |= Q(length=1, prefix=prefixes[1])
    if 2 in prefixes:
        query |= Q(length=2, anchor=recent_sequence[-2])
    if 3 in prefixes:
        query |= Q(length=3, prefix=prefixes[3])
    if not query:
        return tables
    rows = GameAccountPatternAggregate.objects.filter(
        query,
        game_account_id=getattr(game_account, "pk", game_account),
    )
    for row in rows:
        tables[str(row.length)][row.prefix] = _validated_next_counts(row)
    return tables


def upsert_pattern_prefixes(game_account, patterns, prefixes):
    account_id = getattr(game_account, "pk", game_account)
    rows = []
    for length, prefix in prefixes.items():
        next_counts = patterns[str(length)].get(prefix)
        if not next_counts:
            continue
        rows.append(GameAccountPatternAggregate(
            game_account_id=account_id,
            length=length,
            prefix=prefix,
            anchor=prefix.split(PATTERN_SEPARATOR, 1)[0],
            next_counts=dict(next_counts),
        ))
    if rows:
        GameAccountPatternAggregate.objects.bulk_create(
            rows,
            update_conflicts=True,
            update_fields=["anchor", "next_counts"],
            unique_fields=["game_account", "length", "prefix"],
        )


def clear_pattern_aggregates(game_account):
    GameAccountPatternAggregate.objects.filter(
        game_account_id=getattr(game_account, "pk", game_account),
    ).delete()


def replace_pattern_aggregates(game_account, patterns):
    account_id = getattr(game_account, "pk", game_account)
    rows = [
        GameAccountPatternAggregate(
            game_account_id=account_id,
            length=length,
            prefix=prefix,
            anchor=prefix.split(PATTERN_SEPARATOR, 1)[0],
            next_counts=dict(next_counts),
        )
        for length in (1, 2, 3)
        for prefix, next_counts in patterns[str(length)].items()
    ]
    clear_pattern_aggregates(account_id)
    if rows:
        GameAccountPatternAggregate.objects.bulk_create(rows, batch_size=500)
