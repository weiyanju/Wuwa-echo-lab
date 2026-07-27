from django.db import transaction
from django.db.models import F
from django.utils import timezone

from accounts.models import GameAccount
from analytics.models import GameAccountAnalyticsState


def _game_account_id(game_account):
    return getattr(game_account, "pk", game_account)


def _locked_account(game_account):
    return GameAccount.objects.select_for_update().get(pk=_game_account_id(game_account))


def _locked_state(game_account):
    account = _locked_account(game_account)
    state, _ = GameAccountAnalyticsState.objects.select_for_update().get_or_create(game_account=account)
    return account, state


def ready_state_for_account(game_account):
    return GameAccountAnalyticsState.objects.get(
        game_account_id=_game_account_id(game_account),
        status=GameAccountAnalyticsState.Status.READY,
    )


def mark_game_account_state_dirty(game_account, *, error_code=""):
    with transaction.atomic():
        account, state = _locked_state(game_account)
        GameAccountAnalyticsState.objects.filter(pk=state.pk).update(
            status=GameAccountAnalyticsState.Status.DIRTY,
            source_version=F("source_version") + 1,
            error_code=error_code,
            updated_at=timezone.now(),
        )
        state.refresh_from_db()
        return state
