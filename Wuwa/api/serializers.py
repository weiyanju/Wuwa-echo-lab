import json

from api.models import EchoRecord, SubstatRoll


def json_body(request):
    if not request.body:
        return {}
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError("请求 JSON 格式错误。") from exc
    if not isinstance(payload, dict):
        raise ValueError("请求 JSON 必须是对象。")
    return payload


def clean_string(payload, field, default=""):
    value = payload.get(field, default)
    if value is None:
        return default
    if not isinstance(value, str):
        raise ValueError(f"{field} 必须是字符串。")
    return value.strip()


def require_string(payload, field, default=""):
    value = payload.get(field, default)
    if value is None:
        return default
    if not isinstance(value, str):
        raise ValueError(f"{field} 必须是字符串。")
    return value


def parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off", ""}:
            return False
    raise ValueError("布尔值格式错误。")


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


def create_echo_from_payload(user, payload):
    echo = EchoRecord(
        user=user,
        echo_uid=clean_string(payload, "echo_uid"),
        display_name=clean_string(payload, "display_name"),
        cost=int(payload.get("cost")),
        set_name=clean_string(payload, "set_name"),
        main_stat=clean_string(payload, "main_stat"),
        source=clean_string(payload, "source"),
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


def create_roll_from_payload(echo, payload):
    next_position = echo.substat_rolls.count() + 1
    roll = SubstatRoll(
        echo=echo,
        position=int(payload.get("position", next_position)),
        substat_type=clean_string(payload, "substat_type"),
        tier_value=float(payload.get("tier_value")),
        enhance_phase=clean_string(payload, "enhance_phase"),
        tuning_order=payload.get("tuning_order"),
    )
    roll.full_clean()
    roll.save()
    return roll
