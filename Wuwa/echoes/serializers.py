from accounts.models import GameAccount
from api.serializers import clean_string, parse_bool

from .models import EchoRecord, SubstatRoll


def serialize_roll(roll):
    return {
        "id": roll.id,
        "position": roll.position,
        "substat_type": roll.substat_type,
        "tier_value": roll.tier_value,
        "enhance_phase": roll.enhance_phase,
        "tuning_order": roll.tuning_order,
        "tuned_at": roll.tuned_at.isoformat(),
    }


def serialize_echo(echo):
    return {
        "id": echo.id,
        "game_account_id": echo.game_account_id,
        "echo_uid": echo.echo_uid,
        "display_name": echo.display_name,
        "cost": echo.cost,
        "set_name": echo.set_name,
        "main_stat": echo.main_stat,
        "source": echo.source,
        "tuning_batch_id": echo.tuning_batch_id,
        "is_continuous_tuning": echo.is_continuous_tuning,
        "status": echo.status,
        "last_tuned_at": echo.last_tuned_at.isoformat() if echo.last_tuned_at else None,
        "created_at": echo.created_at.isoformat(),
        "substats": [serialize_roll(roll) for roll in echo.substat_rolls.all()],
    }


def game_account_from_payload(user, payload):
    game_account_id = payload.get("game_account_id")
    if game_account_id:
        return GameAccount.objects.get(id=game_account_id, user=user)
    return user.game_accounts.get(is_default=True)


def create_echo_from_payload(user, payload):
    game_account = game_account_from_payload(user, payload)
    echo_uid = clean_string(payload, "echo_uid")
    if not echo_uid:
        echo_uid = game_account.allocate_echo_uid()
    echo = EchoRecord(
        user=user,
        game_account=game_account,
        echo_uid=echo_uid,
        display_name=clean_string(payload, "display_name"),
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


def update_echo_from_payload(echo, payload):
    string_fields = [
        "echo_uid",
        "display_name",
        "set_name",
        "main_stat",
        "source",
        "tuning_batch_id",
        "status",
    ]
    for field in string_fields:
        if field in payload:
            setattr(echo, field, clean_string(payload, field))

    if "cost" in payload:
        echo.cost = int(payload["cost"])
    if "is_continuous_tuning" in payload:
        echo.is_continuous_tuning = parse_bool(payload["is_continuous_tuning"])

    echo.full_clean()
    echo.save()
    return echo


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
