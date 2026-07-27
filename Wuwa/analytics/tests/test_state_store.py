from datetime import timedelta
from unittest.mock import patch
from types import SimpleNamespace

from django.contrib.auth.models import User
from django.test import TestCase, TransactionTestCase
from django.utils import timezone

from accounts.models import GameAccount
from analytics.models import GameAccountAnalyticsState
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

    def test_new_game_account_starts_with_ready_empty_state(self):
        self.assertTrue(GameAccountAnalyticsState.objects.filter(game_account=self.account).exists())
        state = GameAccountAnalyticsState.objects.get(game_account=self.account)

        self.assertEqual(state.status, GameAccountAnalyticsState.Status.READY)
        self.assertEqual(state.payload["total_rolls"], 0)
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

    def test_context_change_rolls_back_when_state_cannot_be_marked_dirty(self):
        SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
        )
        rebuild_game_account_state(self.account)

        with patch(
            "analytics.signals.mark_game_account_state_dirty",
            side_effect=RuntimeError("forced analytics failure"),
        ):
            with self.assertRaises(RuntimeError):
                update_echo(self.echo, {"set_name": "Changed Set"})

        self.echo.refresh_from_db()
        self.account.analytics_state.refresh_from_db()
        self.assertEqual(self.echo.set_name, "Moonlit")
        self.assertEqual(self.account.analytics_state.status, GameAccountAnalyticsState.Status.READY)
        self.assertEqual(self.account.analytics_state.payload["set_counts"], {"Moonlit": 1})

    def test_direct_context_save_rolls_back_when_state_cannot_be_marked_dirty(self):
        rebuild_game_account_state(self.account)
        self.echo.set_name = "Changed Set"

        with patch(
            "analytics.signals.mark_game_account_state_dirty",
            side_effect=RuntimeError("forced analytics failure"),
        ):
            with self.assertRaises(RuntimeError):
                self.echo.save(update_fields=["set_name", "updated_at"])

        self.echo.refresh_from_db()
        self.assertEqual(self.echo.set_name, "Moonlit")

    def test_semantically_invalid_ready_state_is_rebuilt_before_use(self):
        SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
        )
        state = rebuild_game_account_state(self.account).state
        state.payload["online_evaluation"]["evaluated"] = 20
        state.save(update_fields=["payload", "updated_at"])

        repaired = state_snapshot_for_account(self.account)

        self.assertEqual(repaired.status, GameAccountAnalyticsState.Status.READY)
        self.assertEqual(repaired.payload["online_evaluation"]["evaluated"], 0)

    def test_invalid_pattern_aggregate_marks_state_dirty_before_prediction_can_read_it(self):
        SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
        )
        SubstatRoll.objects.create(
            echo=self.echo,
            position=2,
            substat_type="flat_atk",
            tier_value=40,
        )
        second_echo = EchoRecord.objects.create(
            user=self.account.user,
            game_account=self.account,
            echo_uid="invalid-pattern-second",
            cost=1,
            set_name="Moonlit",
            main_stat="atk_percent",
        )
        SubstatRoll.objects.create(
            echo=second_echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
        )
        state = rebuild_game_account_state(self.account).state
        from analytics.models import GameAccountPatternAggregate
        from analytics.services.state_store import AnalyticsStateUnavailable, pattern_tables_for_state

        aggregate = GameAccountPatternAggregate.objects.get(
            game_account=self.account,
            length=1,
            prefix="crit_rate",
        )
        aggregate.next_counts = []
        aggregate.save(update_fields=["next_counts"])

        with self.assertRaises(AnalyticsStateUnavailable):
            pattern_tables_for_state(state)

        state.refresh_from_db()
        self.assertEqual(state.status, GameAccountAnalyticsState.Status.DIRTY)

    def test_invalid_extra_metric_value_is_rebuilt_without_a_validator_error(self):
        SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
        )
        state = rebuild_game_account_state(self.account).state
        state.payload["online_evaluation"]["top_hits"]["unexpected"] = "bad"
        state.save(update_fields=["payload", "updated_at"])

        try:
            repaired = state_snapshot_for_account(self.account)
        except Exception as exc:  # pragma: no cover - the assertion records the regression cleanly.
            self.fail(f"state validation raised instead of rebuilding: {exc}")

        self.assertNotIn("unexpected", repaired.payload["online_evaluation"]["top_hits"])

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

    def test_moving_existing_roll_dirties_old_and_new_accounts(self):
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

        roll.echo = second_echo
        roll.save()

        self.account.analytics_state.refresh_from_db()
        second_account.analytics_state.refresh_from_db()
        third_state.refresh_from_db()
        self.assertEqual(self.account.analytics_state.status, GameAccountAnalyticsState.Status.DIRTY)
        self.assertEqual(second_account.analytics_state.status, GameAccountAnalyticsState.Status.DIRTY)
        self.assertEqual(third_state.status, GameAccountAnalyticsState.Status.READY)

    def test_roll_move_invalidates_accounts_in_stable_ascending_order(self):
        from analytics.signals import advance_analytics_after_roll_save

        instance = SimpleNamespace(
            echo=SimpleNamespace(game_account_id=1),
            _analytics_previous_game_account_id=65,
        )
        with patch("analytics.signals.mark_game_account_state_dirty") as mark_dirty:
            advance_analytics_after_roll_save(SubstatRoll, instance, created=False)

        self.assertEqual(
            [call.args[0] for call in mark_dirty.call_args_list],
            [1, 65],
        )

    def test_raw_game_account_fixture_save_does_not_create_derived_state(self):
        from analytics.signals import initialize_analytics_state_for_new_account

        with patch("analytics.signals.GameAccountAnalyticsState.objects.create") as create_state:
            initialize_analytics_state_for_new_account(
                GameAccount,
                self.account,
                created=True,
                raw=True,
            )

        create_state.assert_not_called()

    def test_raw_roll_fixture_save_does_not_advance_derived_state(self):
        from analytics.signals import advance_analytics_after_roll_save

        with patch("analytics.signals.advance_state_for_roll") as advance_state:
            advance_analytics_after_roll_save(
                SubstatRoll,
                SimpleNamespace(),
                created=True,
                raw=True,
            )

        advance_state.assert_not_called()


class StateMutationAtomicityTests(TransactionTestCase):
    def test_direct_roll_insert_rolls_back_when_state_advance_fails(self):
        account = User.objects.create_user(username="atomic-roll", password="pw").game_accounts.get()
        account.uid = "123456789"
        account.save(update_fields=["uid", "updated_at"])
        echo = EchoRecord.objects.create(
            user=account.user,
            game_account=account,
            echo_uid="atomic-roll-echo",
            cost=1,
            set_name="Moonlit",
            main_stat="atk_percent",
        )

        with patch(
            "analytics.signals.advance_state_for_roll",
            side_effect=RuntimeError("forced analytics failure"),
        ):
            with self.assertRaises(RuntimeError):
                SubstatRoll.objects.create(
                    echo=echo,
                    position=1,
                    substat_type="crit_rate",
                    tier_value=6.3,
                )

        self.assertFalse(SubstatRoll.objects.filter(echo=echo).exists())
