from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from accounts.models import GameAccount
from analytics.models import GameAccountAnalyticsState
from analytics.services.roll_summary import build_roll_summary
from analytics.services.state_rebuild import rebuild_game_account_state
from analytics.services.state_store import (
    AnalyticsStateUnavailable,
    mark_game_account_state_dirty,
    ready_state_for_account,
    state_snapshot_for_account,
)
from echoes.models import EchoRecord, SubstatRoll
from echoes.services import update_echo


class StateStoreTests(TestCase):
    def setUp(self):
        self.account = User.objects.create_user(username="analytics-state", password="pw").game_accounts.get()
        self.account.uid = "123456789"
        self.account.save(update_fields=["uid", "updated_at"])
        self.echo = EchoRecord.objects.create(
            user=self.account.user,
            game_account=self.account,
            echo_uid="analytics-state-echo",
            cost=1,
            set_name="Moonlit",
            main_stat="atk_percent",
        )

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

    def test_dirty_mark_records_requested_error_and_non_ready_lookup_raises(self):
        mark_game_account_state_dirty(self.account, error_code="analytics_source_changed")

        with self.assertRaises(GameAccountAnalyticsState.DoesNotExist):
            ready_state_for_account(self.account.pk)
        state = GameAccountAnalyticsState.objects.get(game_account=self.account)
        self.assertEqual(state.error_code, "analytics_source_changed")

    def test_new_direct_orm_roll_advances_a_ready_state_without_rebuild(self):
        rebuild_game_account_state(self.account)

        roll = SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
        )

        state = state_snapshot_for_account(self.account)
        self.assertEqual(state.status, GameAccountAnalyticsState.Status.READY)
        self.assertEqual(state.total_rolls, 1)
        self.assertEqual(state.payload["counts"]["crit_rate"], 1)
        self.assertEqual(state.last_roll_id, roll.id)

    def test_delete_marks_only_the_owning_account_dirty(self):
        roll = SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
        )
        other_account = GameAccount.objects.create(user=self.account.user, uid="987654321")
        rebuild_game_account_state(self.account)
        other_state = rebuild_game_account_state(other_account).state

        roll.delete()

        self.account.analytics_state.refresh_from_db()
        other_state.refresh_from_db()
        self.assertEqual(self.account.analytics_state.status, GameAccountAnalyticsState.Status.DIRTY)
        self.assertEqual(self.account.analytics_state.error_code, "roll_deleted")
        self.assertEqual(other_state.status, GameAccountAnalyticsState.Status.READY)

    def test_context_change_dirties_but_image_change_does_not(self):
        rebuild_game_account_state(self.account)

        update_echo(self.echo, {"echo_image": "/echo-images/preview.png"})
        self.account.analytics_state.refresh_from_db()
        self.assertEqual(self.account.analytics_state.status, GameAccountAnalyticsState.Status.READY)

        update_echo(self.echo, {"set_name": "Changed Set"})
        self.account.analytics_state.refresh_from_db()
        self.assertEqual(self.account.analytics_state.status, GameAccountAnalyticsState.Status.DIRTY)

    def test_snapshot_rejects_unowned_numeric_account_ids(self):
        with self.assertRaises(AnalyticsStateUnavailable):
            state_snapshot_for_account(self.account.id)

    def test_missing_state_with_any_existing_account_history_stays_dirty(self):
        later = SubstatRoll.objects.create(
            echo=self.echo,
            position=2,
            substat_type="flat_atk",
            tier_value=30,
            tuned_at=timezone.now(),
        )
        GameAccountAnalyticsState.objects.filter(game_account=self.account).delete()

        earlier = SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
            tuned_at=later.tuned_at - timedelta(minutes=1),
        )

        state = GameAccountAnalyticsState.objects.get(game_account=self.account)
        self.assertEqual(state.status, GameAccountAnalyticsState.Status.DIRTY)
        self.assertEqual(state.error_code, "roll_state_missing_with_history")
        self.assertNotEqual(state.total_rolls, 1)
        self.assertNotEqual(state.last_roll_id, earlier.id)

    def test_moving_existing_roll_dirties_old_and_new_accounts_and_invalidates_both_caches(self):
        second_account = GameAccount.objects.create(user=self.account.user, uid="987654321")
        third_account = GameAccount.objects.create(user=self.account.user, uid="456789123")
        second_echo = EchoRecord.objects.create(
            user=self.account.user,
            game_account=second_account,
            echo_uid="analytics-state-second-echo",
            cost=1,
            set_name="Moonlit",
            main_stat="atk_percent",
        )
        roll = SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
        )
        rebuild_game_account_state(self.account)
        rebuild_game_account_state(second_account)
        third_state = rebuild_game_account_state(third_account).state
        self.assertEqual(build_roll_summary(self.account).total_rolls, 1)
        self.assertEqual(build_roll_summary(second_account).total_rolls, 0)

        roll.echo = second_echo
        roll.save()

        self.account.analytics_state.refresh_from_db()
        second_account.analytics_state.refresh_from_db()
        third_state.refresh_from_db()
        self.assertEqual(self.account.analytics_state.status, GameAccountAnalyticsState.Status.DIRTY)
        self.assertEqual(second_account.analytics_state.status, GameAccountAnalyticsState.Status.DIRTY)
        self.assertEqual(third_state.status, GameAccountAnalyticsState.Status.READY)
        self.assertEqual(build_roll_summary(self.account).total_rolls, 0)
        self.assertEqual(build_roll_summary(second_account).total_rolls, 1)
