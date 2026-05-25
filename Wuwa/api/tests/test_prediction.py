from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from api.models import EchoRecord, SubstatRoll
from api.services.prediction import predict_next_substat


class PredictionServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pw")
        self.echo = EchoRecord.objects.create(
            user=self.user,
            echo_uid="e-1",
            cost=1,
            set_name="啸谷长风",
            main_stat="atk_percent",
        )

    def test_rule_baseline_excludes_existing_substats_and_normalizes(self):
        SubstatRoll.objects.create(echo=self.echo, position=1, substat_type="crit_rate", tier_value=6.3)

        result = predict_next_substat(self.echo)
        candidates = result["candidates"]

        self.assertNotIn("crit_rate", [row["substat_type"] for row in candidates])
        self.assertEqual(len(candidates), 12)
        self.assertAlmostEqual(sum(row["p_rule"] for row in candidates), 1.0, places=6)
        self.assertTrue(all(abs(row["p_rule"] - 1 / 12) < 0.000001 for row in candidates))

    def test_rule_baseline_balances_overrepresented_cross_echo_substats(self):
        for index in range(10):
            echo = EchoRecord.objects.create(
                user=self.user,
                echo_uid=f"global-skill-repeat-{index}",
                cost=1,
                set_name="閸熸瓕鑳洪梹鍧楊棑",
                main_stat="atk_percent",
            )
            SubstatRoll.objects.create(
                echo=echo,
                position=1,
                substat_type="skill_damage",
                tier_value=6.4,
            )

        result = predict_next_substat(self.echo)
        skill_row = next(row for row in result["candidates"] if row["substat_type"] == "skill_damage")
        crit_row = next(row for row in result["candidates"] if row["substat_type"] == "crit_rate")

        self.assertLess(skill_row["p_rule"], crit_row["p_rule"])
        self.assertAlmostEqual(sum(row["p_rule"] for row in result["candidates"]), 1.0, places=6)

    def test_bayes_smoothing_keeps_unseen_candidates_nonzero(self):
        for index, substat_type in enumerate(["crit_rate", "crit_damage", "flat_atk"], start=1):
            echo = EchoRecord.objects.create(
                user=self.user,
                echo_uid=f"history-{index}",
                cost=1,
                set_name="啸谷长风",
                main_stat="atk_percent",
            )
            SubstatRoll.objects.create(
                echo=echo,
                position=1,
                substat_type=substat_type,
                tier_value={"crit_rate": 6.3, "crit_damage": 12.6, "flat_atk": 30}[substat_type],
            )

        result = predict_next_substat(self.echo)
        self.assertTrue(all(row["p_bayes"] > 0 for row in result["candidates"]))

    def test_bayes_model_boosts_historical_cycle_continuation(self):
        sequence = [
            "atk_percent", "flat_atk", "crit_damage",
            "energy_regen",
            "atk_percent", "flat_atk", "crit_damage",
            "def_percent",
            "atk_percent", "flat_atk", "crit_damage",
            "atk_percent", "flat_atk",
        ]
        tier_values = {
            "atk_percent": 6.4,
            "flat_atk": 30,
            "crit_damage": 12.6,
            "energy_regen": 6.8,
            "def_percent": 8.1,
        }
        base_time = timezone.now() - timedelta(minutes=len(sequence))
        for index, substat_type in enumerate(sequence):
            echo = EchoRecord.objects.create(
                user=self.user,
                echo_uid=f"cycle-{index}",
                cost=1,
                set_name="鍟歌胺闀块",
                main_stat="atk_percent",
            )
            SubstatRoll.objects.create(
                echo=echo,
                position=1,
                substat_type=substat_type,
                tier_value=tier_values[substat_type],
                tuned_at=base_time + timedelta(minutes=index),
            )

        result = predict_next_substat(self.echo)
        crit_damage_row = next(row for row in result["candidates"] if row["substat_type"] == "crit_damage")
        flat_atk_row = next(row for row in result["candidates"] if row["substat_type"] == "flat_atk")

        self.assertGreater(crit_damage_row["p_bayes"], flat_atk_row["p_bayes"])

    def test_prediction_includes_tier_probabilities_and_weights(self):
        result = predict_next_substat(self.echo)
        first = result["candidates"][0]

        self.assertIn("tier_table", first)
        self.assertIn("weights", result)
        self.assertIn("model_labels", result)
        self.assertEqual(result["model_labels"]["bayes"], "周期规律")
        self.assertEqual(result["weights"]["context"], 0.0)

    def test_mutating_returned_weights_does_not_change_model_defaults(self):
        result = predict_next_substat(self.echo)
        result["weights"]["rule"] = 0

        next_result = predict_next_substat(self.echo)

        self.assertEqual(next_result["weights"]["rule"], 0.80)

    def test_prediction_weights_follow_sample_size_schedule(self):
        for index in range(500):
            echo = EchoRecord.objects.create(
                user=self.user,
                echo_uid=f"weight-stage-{index}",
                cost=1,
                set_name="鍟歌胺闀块",
                main_stat="atk_percent",
            )
            SubstatRoll.objects.create(
                echo=echo,
                position=1,
                substat_type="flat_atk",
                tier_value=30,
            )

        result = predict_next_substat(self.echo)

        self.assertEqual(
            result["base_weights"],
            {"rule": 0.65, "bayes": 0.15, "markov": 0.20, "context": 0.00},
        )
        self.assertEqual(result["weight_stage"], "500-3000")

    def test_prediction_weights_reward_frequently_hitting_cycle_model(self):
        pattern = ["atk_percent", "flat_atk", "crit_damage"]
        tier_values = {"atk_percent": 6.4, "flat_atk": 30, "crit_damage": 12.6}
        base_time = timezone.now() - timedelta(minutes=90)
        for index in range(60):
            substat_type = pattern[index % len(pattern)]
            echo = EchoRecord.objects.create(
                user=self.user,
                echo_uid=f"dynamic-cycle-{index}",
                cost=1,
                set_name="鍟歌胺闀块",
                main_stat="atk_percent",
            )
            SubstatRoll.objects.create(
                echo=echo,
                position=1,
                substat_type=substat_type,
                tier_value=tier_values[substat_type],
                tuned_at=base_time + timedelta(minutes=index),
            )

        result = predict_next_substat(self.echo)

        self.assertGreater(result["weights"]["bayes"], 0.05)
        self.assertEqual(result["weight_adjustments"]["bayes"]["direction"], "up")
        self.assertLessEqual(result["weights"]["bayes"], 0.08)

    def test_markov_sequence_model_cools_recent_cross_echo_repeats(self):
        for index in range(8):
            echo = EchoRecord.objects.create(
                user=self.user,
                echo_uid=f"skill-repeat-{index}",
                cost=1,
                set_name="鍟歌胺闀块",
                main_stat="atk_percent",
            )
            SubstatRoll.objects.create(
                echo=echo,
                position=1,
                substat_type="skill_damage",
                tier_value=6.4,
            )

        result = predict_next_substat(self.echo)
        skill_row = next(row for row in result["candidates"] if row["substat_type"] == "skill_damage")
        top_row = result["candidates"][0]

        self.assertLess(skill_row["p_markov"], skill_row["p_rule"])
        self.assertLess(skill_row["p_final"], skill_row["p_bayes"])
        self.assertNotEqual(top_row["substat_type"], "skill_damage")
