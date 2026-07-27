from django.core.management.base import BaseCommand

from accounts.models import GameAccount
from analytics.models import GameAccountAnalyticsState
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
            accounts = GameAccount.objects.filter(analytics_state__status=GameAccountAnalyticsState.Status.DIRTY)
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
