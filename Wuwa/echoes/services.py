from dataclasses import dataclass

from django.db import transaction

from accounts.ownership import default_game_account, owned_game_account
from api.serializers import clean_string, parse_bool

from .models import EchoRecord, SubstatRoll


class NoSubstatRollToUndo(Exception):
    pass


@dataclass(frozen=True)
class UndoSubstatResult:
    removed_roll: object
    echo: EchoRecord


def owned_echo(user, echo_id, *, prefetch_rolls=True):
    echoes = user.echo_records
    if prefetch_rolls:
        echoes = echoes.prefetch_related("substat_rolls")
    return echoes.get(id=echo_id)


def list_echoes(game_account):
    return game_account.echo_records.prefetch_related("substat_rolls").all()


def create_echo(user, payload):
    game_account_id = payload.get("game_account_id")
    game_account = owned_game_account(user, game_account_id) if game_account_id else default_game_account(user)
    echo_uid = clean_string(payload, "echo_uid")
    if not echo_uid:
        echo_uid = game_account.allocate_echo_uid()
    echo = EchoRecord(
        user=user,
        game_account=game_account,
        echo_uid=echo_uid,
        display_name=clean_string(payload, "display_name"),
        echo_asset_id=clean_string(payload, "echo_asset_id"),
        echo_name=clean_string(payload, "echo_name"),
        echo_image=clean_string(payload, "echo_image"),
        cost=int(payload.get("cost")),
        set_name=clean_string(payload, "set_name"),
        main_stat=clean_string(payload, "main_stat"),
        source=clean_string(payload, "source"),
        source_type=clean_string(payload, "source_type", EchoRecord.SourceType.MANUAL),
        tuning_batch_id=clean_string(payload, "tuning_batch_id"),
        is_continuous_tuning=parse_bool(payload.get("is_continuous_tuning", False)),
    )
    echo.full_clean()
    echo.save()
    return echo


def update_echo(echo, payload):
    changed_fields = set()
    for field in (
        "echo_uid",
        "display_name",
        "echo_asset_id",
        "echo_name",
        "echo_image",
        "set_name",
        "main_stat",
        "source",
        "tuning_batch_id",
        "status",
    ):
        if field in payload:
            value = clean_string(payload, field)
            if getattr(echo, field) != value:
                setattr(echo, field, value)
                changed_fields.add(field)
    if "cost" in payload:
        cost = int(payload["cost"])
        if echo.cost != cost:
            echo.cost = cost
            changed_fields.add("cost")
    if "is_continuous_tuning" in payload:
        is_continuous_tuning = parse_bool(payload["is_continuous_tuning"])
        if echo.is_continuous_tuning != is_continuous_tuning:
            echo.is_continuous_tuning = is_continuous_tuning
            changed_fields.add("is_continuous_tuning")
    if changed_fields:
        echo.save(update_fields=[*sorted(changed_fields), "updated_at"])
    return echo


def delete_echo(echo):
    echo_id = echo.id
    echo.delete()
    return echo_id


def build_roll_from_payload(echo, payload, position):
    roll = SubstatRoll(
        echo=echo,
        position=position,
        substat_type=clean_string(payload, "substat_type"),
        tier_value=float(payload.get("tier_value")),
        enhance_phase=clean_string(payload, "enhance_phase"),
        tuning_order=payload.get("tuning_order"),
    )
    roll.clean_fields()
    roll.clean()
    return roll


def create_substat_roll(echo, payload, existing_roll_count=None):
    if existing_roll_count is None:
        existing_roll_count = echo.substat_rolls.count()
    position = int(payload.get("position", existing_roll_count + 1))
    roll = build_roll_from_payload(echo, payload, position=position)
    roll.save(validate=False, mark_echo=False)
    echo.mark_tuned(roll_count=max(existing_roll_count + 1, roll.position), tuned_at=roll.tuned_at)
    return roll


@transaction.atomic
def undo_last_substat(echo):
    last_roll = echo.substat_rolls.order_by("-position", "-id").first()
    if last_roll is None:
        raise NoSubstatRollToUndo

    last_roll.delete()
    remaining_rolls = list(echo.substat_rolls.order_by("position", "id"))
    remaining_last_roll = remaining_rolls[-1] if remaining_rolls else None
    echo.last_tuned_at = remaining_last_roll.tuned_at if remaining_last_roll else None
    if echo.status != EchoRecord.Status.ARCHIVED:
        echo.status = EchoRecord.Status.COMPLETED if len(remaining_rolls) >= 5 else EchoRecord.Status.IN_PROGRESS
    echo.save(update_fields=["last_tuned_at", "status", "updated_at"])

    return UndoSubstatResult(removed_roll=last_roll, echo=owned_echo(echo.user, echo.id))
