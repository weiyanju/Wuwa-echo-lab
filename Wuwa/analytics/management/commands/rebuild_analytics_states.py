from django.core.management.base import BaseCommand
from django.db.models import Q

from accounts.models import GameAccount
from analytics.models import GameAccountAnalyticsState
from analytics.services.incremental_state import CURRENT_MODEL_VERSION, CURRENT_SCHEMA_VERSION
from analytics.services.state_rebuild import rebuild_game_account_state


class Command(BaseCommand):
    help = "Rebuild persistent analytics states."

    def add_arguments(self, parser):
        group = parser.add_mutually_exclusive_group()
        group.add_argument("--all", action="store_true", dest="all_accounts")
        group.add_argument("--dirty", action="store_true")
        group.add_argument("--game-account-id", type=int)

    def handle(self, *args, **options):
        if options["game_account_id"] is not None:
            accounts = GameAccount.objects.filter(pk=options["game_account_id"])
        elif options["all_accounts"]:
            accounts = GameAccount.objects.all()
        else:
            accounts = GameAccount.objects.filter(
                Q(analytics_state__isnull=True)
                | ~Q(analytics_state__status=GameAccountAnalyticsState.Status.READY)
                | ~Q(analytics_state__schema_version=CURRENT_SCHEMA_VERSION)
                | ~Q(analytics_state__model_version=CURRENT_MODEL_VERSION)
            ).distinct()
        attempted = saved = stale = failed = 0
        for account in accounts.iterator(chunk_size=200):
            attempted += 1
            try:
                result = rebuild_game_account_state(account)
            except Exception:
                failed += 1
            else:
                if result.saved:
                    saved += 1
                else:
                    stale += 1
        self.stdout.write(f"attempted={attempted} saved={saved} stale={stale} failed={failed}")
