import math
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import SimpleTestCase
from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch

from analytics.services.state_rebuild import rebuild_game_account_state
from analytics.services.evaluation import brier_score, build_model_evaluation, empty_evaluation, log_loss, top_k_hit
from echoes.models import EchoRecord, SubstatRoll


class EvaluationServiceTests(SimpleTestCase):
    def test_brier_score_for_multiclass_distribution(self):
        prediction = {"crit_rate": 0.7, "crit_damage": 0.2, "flat_atk": 0.1}
        self.assertAlmostEqual(brier_score(prediction, "crit_rate"), 0.14, places=6)

    def test_brier_score_penalizes_missing_actual_label(self):
        prediction = {"crit_rate": 0.7}
        self.assertAlmostEqual(brier_score(prediction, "crit_damage"), 1.49, places=6)

    def test_log_loss_for_actual_label_probability(self):
        self.assertAlmostEqual(log_loss({"crit_rate": 0.5}, "crit_rate"), -math.log(0.5), places=6)

    def test_empty_evaluation_reports_unavailable_metrics(self):
        evaluation = empty_evaluation()
        self.assertIsNone(evaluation["log_loss"])
        self.assertIsNone(evaluation["brier_score"])
        self.assertIsNone(evaluation["top_1_hit_rate"])
        self.assertIsNone(evaluation["top_3_hit_rate"])

    def test_top_k_hit(self):
        prediction = {"crit_rate": 0.7, "crit_damage": 0.2, "flat_atk": 0.1}
        self.assertTrue(top_k_hit(prediction, "crit_damage", 2))
        self.assertFalse(top_k_hit(prediction, "flat_atk", 2))

    def test_top_k_hit_returns_false_for_non_positive_k(self):
        prediction = {"crit_rate": 0.7, "crit_damage": 0.2, "flat_atk": 0.1}
        self.assertFalse(top_k_hit(prediction, "crit_rate", 0))
        self.assertFalse(top_k_hit(prediction, "crit_rate", -1))


class ModelEvaluationBacktestTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pw")
        self.user.game_accounts.update(uid="123456789")

    def _add_roll(self, index, substat_type):
        tier_values = {
            "crit_rate": 6.3,
            "crit_damage": 12.6,
            "atk_percent": 6.4,
            "flat_atk": 30,
            "skill_damage": 6.4,
            "energy_regen": 6.8,
            "flat_hp": 320,
            "def_percent": 8.1,
        }
        echo = EchoRecord.objects.create(
            user=self.user,
            echo_uid=f"eval-{index}",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
        )
        return SubstatRoll.objects.create(
            echo=echo,
            position=1,
            substat_type=substat_type,
            tier_value=tier_values[substat_type],
            tuned_at=timezone.now() + timedelta(minutes=index),
        )

    def test_model_evaluation_reports_insufficient_data_without_preview_numbers(self):
        self._add_roll(0, "crit_rate")

        result = build_model_evaluation(self.user)

        self.assertEqual(result["status"], "insufficient_data")
        self.assertEqual(result["sample_size"], 1)
        self.assertEqual(result["evaluated_count"], 0)
        self.assertIsNone(result["log_loss"])
        self.assertIsNone(result["brier_score"])
        self.assertIsNone(result["top_1_hit_rate"])
        self.assertIsNone(result["top_3_hit_rate"])
        self.assertIsNone(result["top_5_hit_rate"])
        self.assertEqual(result["model_scores"], {})

    def test_model_evaluation_waits_for_enough_evaluated_samples(self):
        sequence = [
            "crit_rate",
            "crit_damage",
            "atk_percent",
            "flat_atk",
            "skill_damage",
            "crit_rate",
            "crit_damage",
            "atk_percent",
            "flat_atk",
            "energy_regen",
        ]
        for index, substat_type in enumerate(sequence):
            self._add_roll(index, substat_type)

        result = build_model_evaluation(self.user)

        self.assertEqual(result["status"], "insufficient_data")
        self.assertEqual(result["sample_size"], len(sequence))
        self.assertLess(result["evaluated_count"], 20)
        self.assertIsNone(result["top_1_hit_rate"])

    def test_ready_evaluation_does_not_replay_history(self):
        sequence = ["crit_rate", "crit_damage", "atk_percent", "flat_atk", "skill_damage"] * 10
        for index, substat_type in enumerate(sequence):
            self._add_roll(index, substat_type)
        rebuild_game_account_state(self.user.game_accounts.get())

        with patch(
            "analytics.services.evaluation._historical_roll_events",
            side_effect=AssertionError("evaluation GET must not replay history"),
        ):
            result = build_model_evaluation(self.user.game_accounts.get())

        self.assertEqual(result["sample_size"], len(sequence))
        self.assertIn(result["status"], {"insufficient_data", "ready"})

    def test_model_evaluation_backtests_user_history_with_real_scores(self):
        sequence = [
            "crit_rate",
            "crit_damage",
            "atk_percent",
            "flat_atk",
            "skill_damage",
            "energy_regen",
            "flat_hp",
            "def_percent",
        ] * 6
        for index, substat_type in enumerate(sequence):
            self._add_roll(index, substat_type)

        result = build_model_evaluation(self.user)

        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["sample_size"], len(sequence))
        self.assertGreaterEqual(result["evaluated_count"], 20)
        self.assertIsInstance(result["log_loss"], float)
        self.assertIsInstance(result["brier_score"], float)
        self.assertGreaterEqual(result["top_1_hit_rate"], 0)
        self.assertLessEqual(result["top_1_hit_rate"], 1)
        self.assertGreaterEqual(result["top_3_hit_rate"], result["top_1_hit_rate"])
        self.assertGreaterEqual(result["top_5_hit_rate"], result["top_3_hit_rate"])
        self.assertEqual(
            set(result["model_scores"]),
            {"rule", "bayes", "markov", "cycle", "context"},
        )
        for score in result["model_scores"].values():
            self.assertGreater(score["evaluated"], 0)
            self.assertIsInstance(score["hit_rate"], float)
            self.assertIsInstance(score["loss"], float)

    def test_model_evaluation_uses_prefix_dynamic_weights_for_fusion(self):
        sequence = [
            "crit_rate",
            "crit_damage",
            "atk_percent",
            "flat_atk",
            "skill_damage",
            "energy_regen",
            "flat_hp",
            "def_percent",
        ] * 6
        for index, substat_type in enumerate(sequence):
            self._add_roll(index, substat_type)

        calls = []

        def fake_dynamic_weight_result(events, base_weights):
            calls.append(len(events))
            weights = {key: 0 for key in base_weights}
            weights["context"] = 1
            return weights, {}

        with patch(
            "analytics.services.evaluation._dynamic_weight_result_from_events",
            side_effect=fake_dynamic_weight_result,
        ):
            result = build_model_evaluation(self.user)

        self.assertEqual(result["status"], "ready")
        self.assertGreaterEqual(len(calls), 20)
        self.assertTrue(all(call_size < len(sequence) for call_size in calls))
