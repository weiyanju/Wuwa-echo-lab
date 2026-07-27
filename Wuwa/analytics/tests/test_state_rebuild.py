from django.contrib.auth.models import User
from django.test import TestCase
from unittest.mock import patch

from analytics.models import GameAccountAnalyticsState
from analytics.services.state_store import mark_game_account_state_dirty
from analytics.services.state_rebuild import rebuild_game_account_state
from echoes.models import EchoRecord, SubstatRoll


class StateRebuildTests(TestCase):
    def setUp(self):
        self.account = User.objects.create_user(username="analytics-rebuild", password="pw").game_accounts.get()
        self.account.uid = "123456789"
        self.account.save(update_fields=["uid", "updated_at"])
        self.echo = EchoRecord.objects.create(user=self.account.user, game_account=self.account, echo_uid="analytics-echo", cost=1, set_name="Moonlit", main_stat="atk_percent")

    def test_rebuild_persists_ordered_projection(self):
        SubstatRoll.objects.create(echo=self.echo, position=1, substat_type="crit_rate", tier_value=6.3)

        result = rebuild_game_account_state(self.account)

        self.assertTrue(result.saved)
        self.assertEqual(result.processed_rolls, 1)
        self.assertEqual(result.state.total_rolls, 1)
        self.assertEqual(result.state.status, "ready")

    def test_stale_rebuild_cannot_overwrite_newer_mutation(self):
        GameAccountAnalyticsState.objects.create(game_account=self.account)

        def events(_account):
            mark_game_account_state_dirty(self.account)
            yield {"id": 1, "echo_id": self.echo.id, "substat_type": "crit_rate", "set_name": "Moonlit", "tuned_at": None}

        with patch("analytics.services.state_rebuild.ordered_roll_events", events):
            result = rebuild_game_account_state(self.account)

        self.assertFalse(result.saved)
        self.assertEqual(result.state.status, "dirty")
