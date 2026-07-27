from django.contrib.auth.models import User
from django.test import TestCase

from analytics.models import GameAccountAnalyticsState
from analytics.services.state_store import mark_game_account_state_dirty, ready_state_for_account


class StateStoreTests(TestCase):
    def setUp(self):
        self.account = User.objects.create_user(username="analytics-state", password="pw").game_accounts.get()

    def test_one_state_per_account_defaults_to_dirty_and_empty_payload(self):
        state = GameAccountAnalyticsState.objects.create(game_account=self.account)

        self.assertEqual(state.status, GameAccountAnalyticsState.Status.DIRTY)
        self.assertEqual(state.payload, {})
        self.assertEqual(state.pk, self.account.pk)

    def test_dirty_mark_advances_version_and_ready_lookup_is_account_scoped(self):
        first = mark_game_account_state_dirty(self.account)
        second = mark_game_account_state_dirty(self.account)
        first.status = GameAccountAnalyticsState.Status.READY
        first.save(update_fields=["status", "updated_at"])

        self.assertEqual(second.source_version, 2)
        self.assertEqual(ready_state_for_account(self.account).pk, self.account.pk)
