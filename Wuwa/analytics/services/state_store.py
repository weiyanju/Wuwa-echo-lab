from django.db import transaction
from django.db.models import F

from analytics.models import GameAccountAnalyticsState


def _locked_state(game_account):
    return GameAccountAnalyticsState.objects.select_for_update().get_or_create(game_account=game_account)[0]


def ready_state_for_account(game_account):
    try:
        state = game_account.analytics_state
    except GameAccountAnalyticsState.DoesNotExist:
        return None
    return state if state.status == GameAccountAnalyticsState.Status.READY else None


def mark_game_account_state_dirty(game_account):
    with transaction.atomic():
        _locked_state(game_account)
        GameAccountAnalyticsState.objects.filter(game_account=game_account).update(
            status=GameAccountAnalyticsState.Status.DIRTY,
            source_version=F("source_version") + 1,
            error_code="",
        )
        return GameAccountAnalyticsState.objects.get(game_account=game_account)
