from django.contrib.auth.models import User
from django.db import transaction

from api.serializers import clean_string, parse_bool

from .models import GameAccount


class UsernameAlreadyExists(Exception):
    pass


def register_user(username, password):
    if User.objects.filter(username=username).exists():
        raise UsernameAlreadyExists
    return User.objects.create_user(username=username, password=password)


@transaction.atomic
def create_game_account(user, payload):
    is_default = parse_bool(payload.get("is_default", False))
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


@transaction.atomic
def update_game_account(account, payload):
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
