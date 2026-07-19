import re
from dataclasses import dataclass

from django.contrib.auth.models import User
from django.db import IntegrityError, transaction

from api.serializers import clean_string, parse_bool

from .models import GameAccount


MAX_BOUND_GAME_ACCOUNTS = 5
GAME_UID_PATTERN = re.compile(r"^[0-9]{9}$")


class UsernameAlreadyExists(Exception):
    pass


class RegistrationCredentialsInvalid(Exception):
    pass


class RegistrationAlreadyComplete(Exception):
    pass


@dataclass(frozen=True)
class RegistrationResult:
    user: User
    outcome: str


def _validate_game_uid(uid):
    if not GAME_UID_PATTERN.fullmatch(uid):
        raise ValueError("游戏 UID 必须恰好为 9 位数字。")


def _ensure_game_account_capacity(owner):
    bound_count = owner.game_accounts.exclude(uid="").count()
    if bound_count >= MAX_BOUND_GAME_ACCOUNTS:
        raise ValueError(f"每个用户最多只能绑定 {MAX_BOUND_GAME_ACCOUNTS} 个游戏 UID。")


def register_user(username, password):
    if User.objects.filter(username=username).exists():
        raise UsernameAlreadyExists
    return User.objects.create_user(username=username, password=password)


def _resume_registration(user, password):
    if not user.check_password(password):
        raise RegistrationCredentialsInvalid
    if not user.is_active:
        raise RegistrationCredentialsInvalid
    if user.game_accounts.exclude(uid="").exists():
        raise RegistrationAlreadyComplete
    return RegistrationResult(user=user, outcome="resumed")


def start_registration(username, password):
    try:
        with transaction.atomic():
            user = register_user(username, password)
    except (UsernameAlreadyExists, IntegrityError):
        user = User.objects.get(username=username)
        return _resume_registration(user, password)
    return RegistrationResult(user=user, outcome="created")


@transaction.atomic
def create_game_account(user, payload):
    owner = User.objects.select_for_update().get(pk=user.pk)
    uid = clean_string(payload, "uid")
    _validate_game_uid(uid)
    _ensure_game_account_capacity(owner)

    is_default = parse_bool(payload.get("is_default", False))
    if is_default:
        owner.game_accounts.update(is_default=False)
    account = GameAccount(
        user=owner,
        uid=uid,
        is_default=is_default,
    )
    account.full_clean()
    account.save()
    return account


@transaction.atomic
def update_game_account(account, payload):
    owner = User.objects.select_for_update().get(pk=account.user_id)
    account = owner.game_accounts.get(pk=account.pk)

    if "uid" in payload:
        uid = clean_string(payload, "uid")
        if account.uid:
            if uid != account.uid:
                raise ValueError("已绑定的游戏 UID 不可更改或清空。")
        else:
            _validate_game_uid(uid)
            _ensure_game_account_capacity(owner)
            account.uid = uid
    if "is_default" in payload:
        account.is_default = parse_bool(payload["is_default"])
        if account.is_default:
            owner.game_accounts.exclude(id=account.id).update(is_default=False)
    account.full_clean()
    account.save()
    return account
