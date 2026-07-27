from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from accounts.models import GameAccount
from analytics.services.roll_summary import build_roll_summary
from analytics.services.state_rebuild import ordered_roll_events
from echoes.models import EchoRecord, SubstatRoll


class RollSummaryCompatibilityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pw")
        self.account = self.user.game_accounts.get()
        self.account.uid = "123456789"
        self.account.save(update_fields=["uid", "updated_at"])
        self.echo = EchoRecord.objects.create(
            user=self.user,
            game_account=self.account,
            echo_uid="summary-1",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
        )

    def test_compatibility_summary_loads_current_account_history(self):
        self.assertEqual(build_roll_summary(self.account).total_rolls, 0)

        SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
        )

        summary = build_roll_summary(self.account)
        self.assertEqual(summary.total_rolls, 1)
        self.assertEqual(summary.counts["crit_rate"], 1)
        self.assertEqual(summary.set_counts, {"Set": 1})

    def test_rebuild_iterator_is_account_scoped_and_orders_by_tuned_at_then_id(self):
        other_account = GameAccount.objects.create(user=self.user, uid="987654321")
        other_echo = EchoRecord.objects.create(
            user=self.user,
            game_account=other_account,
            echo_uid="summary-other",
            cost=1,
            set_name="Other Set",
            main_stat="atk_percent",
        )
        now = timezone.now()
        later = SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
            tuned_at=now + timedelta(minutes=1),
        )
        earlier = SubstatRoll.objects.create(
            echo=self.echo,
            position=2,
            substat_type="flat_atk",
            tier_value=30,
            tuned_at=now,
        )
        SubstatRoll.objects.create(
            echo=other_echo,
            position=1,
            substat_type="crit_damage",
            tier_value=12.6,
            tuned_at=now - timedelta(minutes=1),
        )

        events = list(ordered_roll_events(self.account))

        self.assertEqual([event["id"] for event in events], [earlier.id, later.id])
        self.assertEqual([event["echo_id"] for event in events], [self.echo.id, self.echo.id])
        self.assertEqual([event["substat_type"] for event in events], ["flat_atk", "crit_rate"])
