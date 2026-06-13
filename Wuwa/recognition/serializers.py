def serialize_session(session):
    return {
        "id": session.id,
        "game_account_id": session.game_account_id,
        "client_name": session.client_name,
        "client_version": session.client_version,
        "game_window_title": session.game_window_title,
        "screen_resolution": session.screen_resolution,
        "started_at": session.started_at.isoformat(),
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "status": session.status,
        "snapshot_count": session.snapshot_count,
        "saved_roll_count": session.saved_roll_count,
        "created_echo_count": session.created_echo_count,
        "updated_echo_count": session.updated_echo_count,
        "conflict_count": session.conflict_count,
        "reverted_count": session.reverted_count,
        "last_snapshot_at": session.last_snapshot_at.isoformat() if session.last_snapshot_at else None,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
    }


def serialize_snapshot_result(snapshot):
    return {
        "snapshot_id": snapshot.id,
        "session_id": snapshot.session_id,
        "game_account_id": snapshot.game_account_id,
        "status": snapshot.status,
        "match_status": snapshot.match_status,
        "created_echo_id": snapshot.created_echo_id,
        "created_roll_ids": snapshot.created_roll_ids,
        "created_roll_count": snapshot.created_roll_count,
        "warnings": snapshot.warnings,
        "error_code": snapshot.error_code,
        "applied_at": snapshot.applied_at.isoformat() if snapshot.applied_at else None,
        "reverted_at": snapshot.reverted_at.isoformat() if snapshot.reverted_at else None,
        "created_at": snapshot.created_at.isoformat(),
        "client_event_id": snapshot.client_event_id,
        "trigger_type": snapshot.trigger_type,
        "captured_at": snapshot.captured_at.isoformat(),
    }
