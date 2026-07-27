from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase

from analytics.models import GameAccountAnalyticsState


class RebuildAnalyticsStatesCommandTests(TestCase):
    def test_default_repairs_every_non_ready_or_missing_state(self):
        accounts = [
            User.objects.create_user(username=f"repair-{index}").game_accounts.get()
            for index in range(5)
        ]
        for account, status in zip(
            accounts[:3],
            (
                GameAccountAnalyticsState.Status.DIRTY,
                GameAccountAnalyticsState.Status.FAILED,
                GameAccountAnalyticsState.Status.BUILDING,
            ),
        ):
            account.analytics_state.status = status
            account.analytics_state.save(update_fields=["status", "updated_at"])
        accounts[3].analytics_state.delete()
        accounts[4].analytics_state.model_version = "obsolete"
        accounts[4].analytics_state.save(update_fields=["model_version", "updated_at"])
        output = StringIO()

        call_command("rebuild_analytics_states", stdout=output)

        self.assertEqual(output.getvalue().strip(), "attempted=5 saved=5 stale=0 failed=0")
        self.assertEqual(
            GameAccountAnalyticsState.objects.filter(
                game_account__in=accounts,
                status=GameAccountAnalyticsState.Status.READY,
            ).count(),
            5,
        )
