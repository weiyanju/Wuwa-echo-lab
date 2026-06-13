from django.db import transaction

from api.serializers import clean_string, parse_bool

from .models import GameAccount


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


def create_game_account_from_payload(user, payload):
    is_default = parse_bool(payload.get("is_default", False))
    with transaction.atomic():
        if is_default:
            user.game_accounts.update(is_default=False)
        account = GameAccount(
            user=user,
            uid=clean_string(payload, "uid"),
            server=clean_string(payload, "server"),
            nickname=clean_string(payload, "nickname"),
            is_default=is_default,
        )
        account.full_clean()
        account.save()
    return account


def update_game_account_from_payload(account, payload):
    with transaction.atomic():
        if "uid" in payload:
            account.uid = clean_string(payload, "uid")
        if "server" in payload:
            account.server = clean_string(payload, "server")
        if "nickname" in payload:
            account.nickname = clean_string(payload, "nickname")
        if "is_default" in payload:
            account.is_default = parse_bool(payload["is_default"])
            if account.is_default:
                account.user.game_accounts.exclude(id=account.id).update(is_default=False)
        account.full_clean()
        account.save()
    return account

