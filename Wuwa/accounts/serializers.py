def serialize_game_account(account):
    return {
        "id": account.id,
        "uid": account.uid,
        "server": account.server,
        "nickname": account.nickname,
        "is_default": account.is_default,
        "workspace_locked": account.workspace_locked,
        "next_echo_sequence": account.next_echo_sequence,
        "created_at": account.created_at.isoformat(),
        "updated_at": account.updated_at.isoformat(),
    }
