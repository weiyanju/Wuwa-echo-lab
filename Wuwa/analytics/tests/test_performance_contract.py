from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from analytics.services.evaluation import build_model_evaluation
from analytics.services.statistics import build_user_statistics


class ReadyStatePerformanceContractTests(SimpleTestCase):
    def test_statistics_uses_a_ready_state_without_the_legacy_summary_loader(self):
        state = SimpleNamespace(
            total_rolls=3,
            payload={"counts": {"crit_rate": 1}, "set_counts": {"moonlit_clouds": 3}},
        )

        with patch("analytics.services.statistics.state_snapshot_for_account", return_value=state), patch(
            "analytics.services.statistics.build_roll_summary",
            side_effect=AssertionError("ready statistics must not replay history"),
        ):
            result = build_user_statistics(object())

        self.assertEqual(result["total_rolls"], 3)
        self.assertEqual(result["substat_frequency"]["crit_rate"]["count"], 1)

    def test_evaluation_uses_serialized_online_totals_without_history_replay(self):
        models = {
            key: {"evaluated": 20, "hits": 5, "loss_total": 10.0}
            for key in ("rule", "bayes", "markov", "cycle", "context")
        }
        state = SimpleNamespace(
            total_rolls=40,
            payload={
                "online_evaluation": {
                    "evaluated": 20,
                    "loss_total": 12.0,
                    "brier_total": 6.0,
                    "top_hits": {"1": 5, "3": 10, "5": 15},
                    "models": models,
                },
            },
        )

        with patch("analytics.services.evaluation.state_snapshot_for_account", return_value=state), patch(
            "analytics.services.evaluation._historical_roll_events",
            side_effect=AssertionError("ready evaluation must not replay history"),
        ):
            result = build_model_evaluation(object())

        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["sample_size"], 40)
        self.assertEqual(result["evaluated_count"], 20)
