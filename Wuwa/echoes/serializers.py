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
        "echo_asset_id": echo.echo_asset_id,
        "echo_name": echo.echo_name,
        "echo_image": echo.echo_image,
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
