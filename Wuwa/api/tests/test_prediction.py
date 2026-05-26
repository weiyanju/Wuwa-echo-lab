from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from api.models import EchoRecord, SubstatRoll
from api.services.prediction import (
    _bayes_component_weights,
    _bayes_distribution_from_sequence,
    _bayes_exact_distribution_from_sequence,
    _bayes_wildcard_distribution_from_sequence,
    _cycle_window_distribution_from_sequence,
    _cycle_window_probabilities_from_sequence,
    _general_cycle_group_probabilities_from_sequence,
    _markov_distribution_from_sequence,
    predict_next_substat,
)


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

    def test_bayes_smoothing_becomes_less_conservative_with_more_samples(self):
        candidates = ["crit_rate", "crit_damage", "flat_atk"]
        short_sequence = ["crit_rate", "flat_atk", "crit_damage", "crit_rate", "flat_atk"]
        long_sequence = ["energy_regen"] * 495 + short_sequence

        short_distribution = _bayes_distribution_from_sequence(short_sequence, candidates)
        long_distribution = _bayes_distribution_from_sequence(long_sequence, candidates)

        self.assertGreater(long_distribution["crit_damage"], short_distribution["crit_damage"])
        self.assertLess(long_distribution["crit_rate"], short_distribution["crit_rate"])

    def test_bayes_model_boosts_wildcard_middle_cycle_continuation(self):
        candidates = ["crit_rate", "crit_damage", "flat_atk", "flat_hp"]
        sequence = [
            "atk_percent", "flat_atk", "crit_damage",
            "atk_percent", "hp_percent", "crit_damage",
            "atk_percent", "energy_regen", "crit_damage",
            "atk_percent", "def_percent",
        ]

        distribution = _bayes_distribution_from_sequence(sequence, candidates)

        self.assertGreater(distribution["crit_damage"], distribution["crit_rate"])
        self.assertGreater(distribution["crit_damage"], distribution["flat_atk"])

    def test_bayes_model_blends_exact_and_wildcard_subsignals(self):
        candidates = ["crit_rate", "crit_damage", "flat_atk", "flat_hp"]
        sequence = [
            "atk_percent", "flat_atk", "crit_damage",
            "atk_percent", "hp_percent", "crit_damage",
            "atk_percent", "energy_regen", "crit_damage",
            "atk_percent", "def_percent",
        ]

        exact = _bayes_exact_distribution_from_sequence(sequence, candidates)
        wildcard = _bayes_wildcard_distribution_from_sequence(sequence, candidates)
        weights = _bayes_component_weights(len(sequence))
        distribution = _bayes_distribution_from_sequence(sequence, candidates)

        self.assertGreater(weights["exact"], weights["wildcard"])
        self.assertAlmostEqual(weights["exact"] + weights["wildcard"], 1.0, places=6)
        for substat_type in candidates:
            expected = (
                weights["exact"] * exact[substat_type]
                + weights["wildcard"] * wildcard[substat_type]
            )
            self.assertAlmostEqual(distribution[substat_type], expected, places=6)

    def test_bayes_wildcard_weight_grows_with_more_samples(self):
        early_weights = _bayes_component_weights(20)
        mature_weights = _bayes_component_weights(2000)

        self.assertGreater(early_weights["exact"], early_weights["wildcard"])
        self.assertGreater(mature_weights["wildcard"], early_weights["wildcard"])

    def test_prediction_includes_tier_probabilities_and_weights(self):
        result = predict_next_substat(self.echo)
        first = result["candidates"][0]

        self.assertIn("tier_table", first)
        self.assertIn("weights", result)
        self.assertIn("model_labels", result)
        self.assertIn("p_cycle", first)
        self.assertIn("cycle", result["weights"])
        self.assertEqual(result["model_labels"]["bayes"], "周期规律")
        self.assertEqual(result["weights"]["context"], 0.0)

    def test_cycle_window_probabilities_identify_double_window(self):
        sequence = (
            ["flat_atk", "hp_percent", "def_percent", "energy_regen"] * 6
            + ["crit_rate", "flat_atk", "crit_damage", "atk_percent", "crit_rate"]
        )

        probabilities = _cycle_window_probabilities_from_sequence(sequence)

        self.assertGreater(probabilities["double"], probabilities["single_rate"])
        self.assertGreater(probabilities["double"], probabilities["single_damage"])
        self.assertGreater(probabilities["double"], probabilities["cooldown"])
        self.assertAlmostEqual(sum(probabilities.values()), 1.0, places=6)

    def test_cycle_window_probabilities_identify_single_rate_window(self):
        sequence = (
            ["flat_atk", "hp_percent", "def_percent", "energy_regen"] * 6
            + ["crit_rate", "flat_atk", "crit_rate", "atk_percent", "crit_rate"]
        )

        probabilities = _cycle_window_probabilities_from_sequence(sequence)

        self.assertGreater(probabilities["single_rate"], probabilities["double"])
        self.assertGreater(probabilities["single_rate"], probabilities["single_damage"])
        self.assertGreater(probabilities["single_rate"], probabilities["cooldown"])

    def test_cycle_window_probabilities_identify_cooldown_window(self):
        sequence = (
            ["flat_atk", "hp_percent", "def_percent", "energy_regen"] * 6
            + ["crit_rate", "crit_damage", "crit_rate", "crit_damage"]
        )

        probabilities = _cycle_window_probabilities_from_sequence(sequence)

        self.assertGreater(probabilities["cooldown"], probabilities["double"])
        self.assertGreater(probabilities["cooldown"], probabilities["single_rate"])
        self.assertGreater(probabilities["cooldown"], probabilities["single_damage"])

    def test_cycle_window_distribution_blends_window_states(self):
        candidates = ["crit_rate", "crit_damage", "flat_atk", "flat_hp"]
        sequence = (
            ["flat_atk", "hp_percent", "def_percent", "energy_regen"] * 6
            + ["crit_rate", "flat_atk", "crit_damage", "atk_percent", "crit_rate"]
        )

        distribution = _cycle_window_distribution_from_sequence(sequence, candidates)

        self.assertGreater(distribution["crit_rate"], distribution["flat_atk"])
        self.assertGreater(distribution["crit_damage"], distribution["flat_hp"])
        self.assertAlmostEqual(sum(distribution.values()), 1.0, places=6)

    def test_general_cycle_group_probabilities_identify_attack_window(self):
        sequence = (
            ["hp_percent", "def_percent", "energy_regen", "skill_damage"] * 6
            + ["atk_percent", "flat_atk", "atk_percent", "flat_atk", "atk_percent"]
        )

        probabilities = _general_cycle_group_probabilities_from_sequence(sequence)

        self.assertNotIn("crit", probabilities)
        self.assertGreater(probabilities["attack"], probabilities["hp"])
        self.assertGreater(probabilities["attack"], probabilities["defense"])
        self.assertGreater(probabilities["attack"], probabilities["damage_bonus"])
        self.assertAlmostEqual(sum(probabilities.values()), 1.0, places=6)

    def test_cycle_window_distribution_includes_noncrit_group_windows(self):
        candidates = ["atk_percent", "flat_atk", "hp_percent", "flat_hp"]
        sequence = (
            ["hp_percent", "def_percent", "energy_regen", "skill_damage"] * 6
            + ["atk_percent", "flat_atk", "atk_percent", "flat_atk", "atk_percent"]
        )

        distribution = _cycle_window_distribution_from_sequence(sequence, candidates)

        self.assertGreater(distribution["atk_percent"], distribution["hp_percent"])
        self.assertGreater(distribution["flat_atk"], distribution["flat_hp"])
        self.assertAlmostEqual(sum(distribution.values()), 1.0, places=6)

    def test_mutating_returned_weights_does_not_change_model_defaults(self):
        result = predict_next_substat(self.echo)
        result["weights"]["rule"] = 0

        next_result = predict_next_substat(self.echo)

        self.assertEqual(next_result["weights"]["rule"], 0.70)

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
            {"rule": 0.48, "bayes": 0.26, "markov": 0.12, "cycle": 0.14, "context": 0.00},
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

        self.assertGreater(result["weights"]["bayes"], 0.09)
        self.assertEqual(result["weight_adjustments"]["bayes"]["direction"], "up")
        self.assertLessEqual(result["weights"]["bayes"], 0.13)

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

    def test_markov_model_only_penalizes_recently_overheated_candidates(self):
        candidates = ["skill_damage", "crit_rate", "flat_atk"]
        sequence = [
            "skill_damage", "flat_hp", "skill_damage", "flat_def",
            "skill_damage", "hp_percent", "skill_damage", "def_percent",
            "atk_percent", "flat_atk", "crit_rate", "hp_percent",
        ]

        distribution = _markov_distribution_from_sequence(sequence, candidates)

        self.assertLess(distribution["skill_damage"], distribution["crit_rate"])
        self.assertLess(distribution["skill_damage"], distribution["flat_atk"])
        self.assertAlmostEqual(distribution["crit_rate"], distribution["flat_atk"], places=6)

    def test_markov_model_ignores_light_recent_noise(self):
        candidates = ["skill_damage", "crit_rate", "flat_atk"]
        sequence = [
            "skill_damage", "flat_hp", "def_percent", "energy_regen",
            "atk_percent", "hp_percent", "flat_def", "basic_attack_damage",
            "heavy_attack_damage", "flat_atk", "crit_rate", "hp_percent",
        ]

        distribution = _markov_distribution_from_sequence(sequence, candidates)

        self.assertAlmostEqual(distribution["skill_damage"], distribution["crit_rate"], places=6)
        self.assertAlmostEqual(distribution["skill_damage"], distribution["flat_atk"], places=6)

    def test_markov_model_uses_short_recent_window_only(self):
        candidates = ["skill_damage", "crit_rate", "flat_atk"]
        sequence = [
            "skill_damage", "skill_damage", "skill_damage", "skill_damage",
            "hp_percent", "def_percent", "energy_regen", "atk_percent",
            "flat_hp", "flat_def", "basic_attack_damage", "heavy_attack_damage",
            "liberation_damage", "hp_percent", "crit_rate", "flat_atk",
        ]

        distribution = _markov_distribution_from_sequence(sequence, candidates)

        self.assertAlmostEqual(distribution["skill_damage"], distribution["crit_rate"], places=6)
        self.assertAlmostEqual(distribution["skill_damage"], distribution["flat_atk"], places=6)

    def test_markov_model_requires_minimum_recent_overheat_count(self):
        candidates = ["skill_damage", "crit_rate", "flat_atk"]
        sequence = [
            "skill_damage", "flat_hp", "def_percent", "energy_regen",
            "atk_percent", "hp_percent", "skill_damage", "basic_attack_damage",
            "heavy_attack_damage", "flat_def", "crit_rate", "flat_atk",
        ]

        distribution = _markov_distribution_from_sequence(sequence, candidates)

        self.assertAlmostEqual(distribution["skill_damage"], distribution["crit_rate"], places=6)
        self.assertAlmostEqual(distribution["skill_damage"], distribution["flat_atk"], places=6)
