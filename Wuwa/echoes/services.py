from .serializers import build_roll_from_payload


def create_substat_roll(echo, payload, existing_roll_count=None):
    if existing_roll_count is None:
        existing_roll_count = echo.substat_rolls.count()
    position = int(payload.get("position", existing_roll_count + 1))
    roll = build_roll_from_payload(echo, payload, position=position)
    roll.save(validate=False, mark_echo=False)
    echo.mark_tuned(roll_count=max(existing_roll_count + 1, roll.position), tuned_at=roll.tuned_at)
    return roll
