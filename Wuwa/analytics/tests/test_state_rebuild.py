from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch
from uuid import uuid4

from accounts.models import GameAccount
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
        def events(_account):
            mark_game_account_state_dirty(self.account)
            yield {"id": 1, "echo_id": self.echo.id, "substat_type": "crit_rate", "set_name": "Moonlit", "tuned_at": None}

        with patch("analytics.services.state_rebuild.ordered_roll_events", events):
            result = rebuild_game_account_state(self.account)

        self.assertFalse(result.saved)
        self.assertEqual(result.state.status, "dirty")

    def test_active_rebuild_lease_prevents_duplicate_history_scan(self):
        GameAccountAnalyticsState.objects.filter(game_account=self.account).update(
            status=GameAccountAnalyticsState.Status.BUILDING,
            rebuild_token=uuid4(),
            rebuild_started_at=timezone.now(),
        )

        with patch(
            "analytics.services.state_rebuild.ordered_roll_events",
            side_effect=AssertionError("active rebuild must be single-flight"),
        ):
            result = rebuild_game_account_state(self.account)

        self.assertFalse(result.saved)
        self.assertEqual(result.processed_rolls, 0)
        self.assertEqual(result.state.status, GameAccountAnalyticsState.Status.BUILDING)

    def test_obsolete_failed_attempt_cannot_overwrite_newer_ready_attempt(self):
        newer_token = uuid4()

        def failing_events(_account):
            GameAccountAnalyticsState.objects.filter(game_account=self.account).update(
                status=GameAccountAnalyticsState.Status.READY,
                rebuild_token=newer_token,
                rebuild_started_at=timezone.now(),
            )
            raise RuntimeError("obsolete rebuild failed")
            yield  # pragma: no cover

        with patch("analytics.services.state_rebuild.ordered_roll_events", failing_events):
            with self.assertRaisesRegex(RuntimeError, "obsolete rebuild failed"):
                rebuild_game_account_state(self.account)

        state = GameAccountAnalyticsState.objects.get(game_account=self.account)
        self.assertEqual(state.status, GameAccountAnalyticsState.Status.READY)
        self.assertEqual(state.rebuild_token, newer_token)

    def test_moving_echo_dirties_both_game_account_projections(self):
        second_account = GameAccount.objects.create(user=self.account.user, uid="987654321")
        self.assertEqual(self.account.analytics_state.status, GameAccountAnalyticsState.Status.READY)

        self.echo.game_account = second_account
        self.echo.save(update_fields=["game_account"])

        self.assertEqual(GameAccountAnalyticsState.objects.get(game_account=self.account).status, "dirty")
        self.assertEqual(GameAccountAnalyticsState.objects.get(game_account=second_account).status, "dirty")
