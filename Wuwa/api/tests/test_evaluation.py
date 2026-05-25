import math

from django.test import SimpleTestCase

from api.services.evaluation import brier_score, empty_evaluation, log_loss, top_k_hit


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
