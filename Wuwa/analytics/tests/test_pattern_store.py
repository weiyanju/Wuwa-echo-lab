from django.contrib.auth.models import User
from django.test import TestCase

from analytics.models import GameAccountPatternAggregate
from analytics.services.pattern_store import pattern_tables_for_recent
from analytics.services.state_rebuild import rebuild_game_account_state
from echoes.models import EchoRecord, SubstatRoll


class PatternAggregateStoreTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="pattern-store", password="pw")
        self.account = self.user.game_accounts.get()
        self.account.uid = "123456789"
        self.account.save(update_fields=["uid", "updated_at"])
        self.echo = EchoRecord.objects.create(
            user=self.user,
            game_account=self.account,
            echo_uid="pattern-store-echo",
            cost=1,
            set_name="Moonlit",
            main_stat="atk_percent",
        )

    def add_roll(self, position, substat_type, tier_value):
        return SubstatRoll.objects.create(
            echo=self.echo,
            position=position,
            substat_type=substat_type,
            tier_value=tier_value,
        )

    def test_append_keeps_patterns_out_of_state_and_updates_three_prefixes(self):
        self.add_roll(1, "crit_rate", 6.3)
        self.add_roll(2, "flat_atk", 40)
        self.add_roll(3, "crit_damage", 12.6)
        self.add_roll(4, "energy_regen", 6.8)

        state = self.account.analytics_state
        state.refresh_from_db()
        self.assertNotIn("patterns", state.payload)
        expected = {
            (1, "crit_damage"): {"energy_regen": 1},
            (2, "flat_atk\x1fcrit_damage"): {"energy_regen": 1},
            (3, "crit_rate\x1fflat_atk\x1fcrit_damage"): {"energy_regen": 1},
        }
        rows = GameAccountPatternAggregate.objects.filter(
            game_account=self.account,
            prefix__in=[prefix for _, prefix in expected],
        )
        self.assertEqual(
            {(row.length, row.prefix): row.next_counts for row in rows},
            expected,
        )

    def test_recent_lookup_loads_exact_contexts_and_length_two_wildcards_only(self):
        GameAccountPatternAggregate.objects.bulk_create([
            GameAccountPatternAggregate(
                game_account=self.account,
                length=length,
                prefix=prefix,
                anchor=prefix.split("\x1f", 1)[0],
                next_counts=next_counts,
            )
            for length, prefix, next_counts in (
                (1, "crit_damage", {"energy_regen": 2}),
                (1, "flat_atk", {"flat_def": 9}),
                (2, "flat_atk\x1fcrit_damage", {"energy_regen": 3}),
                (2, "flat_atk\x1fcrit_rate", {"energy_regen": 4}),
                (2, "atk_percent\x1fcrit_damage", {"flat_def": 7}),
                (3, "crit_rate\x1fflat_atk\x1fcrit_damage", {"energy_regen": 5}),
                (3, "flat_def\x1fflat_atk\x1fcrit_damage", {"energy_regen": 8}),
            )
        ])

        tables = pattern_tables_for_recent(
            self.account,
            ["crit_rate", "flat_atk", "crit_damage"],
        )

        self.assertEqual(set(tables["1"]), {"crit_damage"})
        self.assertEqual(
            set(tables["2"]),
            {"flat_atk\x1fcrit_damage", "flat_atk\x1fcrit_rate"},
        )
        self.assertEqual(
            set(tables["3"]),
            {"crit_rate\x1fflat_atk\x1fcrit_damage"},
        )

    def test_rebuild_replaces_account_pattern_rows(self):
        self.add_roll(1, "crit_rate", 6.3)
        self.add_roll(2, "flat_atk", 40)
        GameAccountPatternAggregate.objects.create(
            game_account=self.account,
            length=1,
            prefix="flat_def",
            anchor="flat_def",
            next_counts={"flat_hp": 99},
        )

        result = rebuild_game_account_state(self.account)

        self.assertTrue(result.saved)
        self.assertNotIn("patterns", result.state.payload)
        self.assertFalse(
            GameAccountPatternAggregate.objects.filter(
                game_account=self.account,
                prefix="flat_def",
            ).exists()
        )
        aggregate = GameAccountPatternAggregate.objects.get(
            game_account=self.account,
            length=1,
            prefix="crit_rate",
        )
        self.assertEqual(aggregate.next_counts, {"flat_atk": 1})

    def test_missing_state_with_no_facts_clears_orphaned_pattern_rows(self):
        self.add_roll(1, "crit_rate", 6.3)
        self.add_roll(2, "flat_atk", 40)
        SubstatRoll.objects.filter(echo=self.echo).delete()
        self.account.analytics_state.delete()
        self.assertTrue(
            GameAccountPatternAggregate.objects.filter(game_account=self.account).exists()
        )

        self.add_roll(1, "crit_damage", 12.6)

        self.assertFalse(
            GameAccountPatternAggregate.objects.filter(game_account=self.account).exists()
        )
