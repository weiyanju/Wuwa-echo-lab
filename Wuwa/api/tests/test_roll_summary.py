from django.contrib.auth.models import User
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from analytics.services.roll_summary import build_roll_summary, clear_roll_summary_cache
from analytics.services.statistics import build_user_statistics
from echoes.services import update_echo
from echoes.models import EchoRecord, SubstatRoll


class RollSummaryCacheTests(TestCase):
    def setUp(self):
        clear_roll_summary_cache()
        self.user = User.objects.create_user(username="tester", password="pw")
        self.user.game_accounts.update(uid="123456789")
        self.echo = EchoRecord.objects.create(
            user=self.user,
            echo_uid="summary-1",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
        )

    def tearDown(self):
        clear_roll_summary_cache()

    def test_roll_summary_cache_invalidates_on_direct_roll_save_and_delete(self):
        self.assertEqual(build_roll_summary(self.user).total_rolls, 0)

        roll = SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
        )

        self.assertEqual(build_roll_summary(self.user).total_rolls, 1)

        roll.delete()

        self.assertEqual(build_roll_summary(self.user).total_rolls, 0)

    def test_statistics_reuses_warmed_roll_summary_without_rescanning_roll_rows(self):
        SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
        )
        build_roll_summary(self.user)

        with CaptureQueriesContext(connection) as queries:
            stats = build_user_statistics(self.user)

        roll_queries = [
            query["sql"]
            for query in queries.captured_queries
            if "api_substatroll" in query["sql"].lower()
        ]
        self.assertEqual(stats["total_rolls"], 1)
        self.assertEqual(roll_queries, [])

    def test_echo_context_update_invalidates_summary_but_image_patch_does_not(self):
        SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
        )

        self.assertEqual(build_user_statistics(self.user)["context_factors"]["set_name"]["groups"], {"Set": 1})

        update_echo(self.echo, {"echo_name": "Preview"})
        self.assertEqual(build_user_statistics(self.user)["context_factors"]["set_name"]["groups"], {"Set": 1})

        update_echo(self.echo, {"set_name": "Changed Set"})
        self.assertEqual(
            build_user_statistics(self.user)["context_factors"]["set_name"]["groups"],
            {"Changed Set": 1},
        )
