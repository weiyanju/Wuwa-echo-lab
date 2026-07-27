from django.contrib.auth.models import User
from django.test import TestCase
from unittest.mock import patch

from analytics.services.state_rebuild import rebuild_game_account_state
from analytics.services.statistics import build_user_statistics
from echoes.models import EchoRecord, SubstatRoll


class StatisticsServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pw")
        self.user.game_accounts.update(uid="123456789")

    def test_empty_statistics_reports_recording_stage(self):
        stats = build_user_statistics(self.user)
        self.assertEqual(stats["total_rolls"], 0)
        self.assertEqual(stats["sample_stage"]["key"], "recording")
        self.assertEqual(stats["context_factors"]["set_name"]["status"], "insufficient_data")

    def test_statistics_counts_substat_frequency(self):
        echo = EchoRecord.objects.create(user=self.user, echo_uid="e-1", cost=1, set_name="啸谷长风", main_stat="atk_percent")
        SubstatRoll.objects.create(echo=echo, position=1, substat_type="crit_rate", tier_value=6.3)
        SubstatRoll.objects.create(echo=echo, position=2, substat_type="flat_atk", tier_value=40)

        stats = build_user_statistics(self.user)

        self.assertEqual(stats["total_rolls"], 2)
        self.assertEqual(stats["substat_frequency"]["crit_rate"]["count"], 1)
        self.assertEqual(stats["substat_frequency"]["flat_atk"]["count"], 1)

    def test_set_name_groups_count_rolls_not_echoes(self):
        set_name = "moonlit_clouds"
        first_echo = EchoRecord.objects.create(user=self.user, echo_uid="e-1", cost=1, set_name=set_name, main_stat="atk_percent")
        second_echo = EchoRecord.objects.create(user=self.user, echo_uid="e-2", cost=1, set_name=set_name, main_stat="atk_percent")
        SubstatRoll.objects.create(echo=first_echo, position=1, substat_type="crit_rate", tier_value=6.3)
        SubstatRoll.objects.create(echo=first_echo, position=2, substat_type="flat_atk", tier_value=40)
        SubstatRoll.objects.create(echo=second_echo, position=1, substat_type="crit_damage", tier_value=12.6)

        stats = build_user_statistics(self.user)

        self.assertEqual(stats["context_factors"]["set_name"]["groups"][set_name], 3)

    def test_ready_statistics_does_not_load_legacy_roll_summary(self):
        echo = EchoRecord.objects.create(user=self.user, echo_uid="ready-stats", cost=1, set_name="moonlit_clouds", main_stat="atk_percent")
        SubstatRoll.objects.create(echo=echo, position=1, substat_type="crit_rate", tier_value=6.3)
        rebuild_game_account_state(self.user.game_accounts.get())

        with patch(
            "analytics.services.statistics.build_roll_summary",
            side_effect=AssertionError("statistics must use ready analytics state"),
        ):
            stats = build_user_statistics(self.user.game_accounts.get())

        self.assertEqual(stats["total_rolls"], 1)
        self.assertEqual(stats["substat_frequency"]["crit_rate"]["count"], 1)
        self.assertEqual(stats["context_factors"]["set_name"]["groups"], {"moonlit_clouds": 1})
