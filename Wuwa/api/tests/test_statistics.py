from django.contrib.auth.models import User
from django.test import TestCase

from api.models import EchoRecord, SubstatRoll
from api.services.statistics import build_user_statistics


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
