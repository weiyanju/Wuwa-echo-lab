from .models import GameAccount


def owned_game_account(user, account_id):
    return GameAccount.objects.get(id=account_id, user=user)


def default_game_account(user):
    return user.game_accounts.get(is_default=True)


def game_account_for_user(user, account_id=None):
    if account_id:
        return owned_game_account(user, account_id)
    return default_game_account(user)
