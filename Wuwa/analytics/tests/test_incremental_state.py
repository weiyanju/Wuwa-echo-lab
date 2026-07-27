from unittest import TestCase

from analytics.services.incremental_state import (
    apply_event,
    distributions_from_payload,
    dynamic_weights_from_payload,
    empty_payload,
)
from analytics.services.model_config import DYNAMIC_WEIGHT_BACKTEST_WINDOW
from analytics.services.prediction import (
    _bayes_distribution_from_sequence,
    _cycle_window_distribution_from_sequence,
    _dynamic_weight_result_from_events,
    _markov_distribution_from_sequence,
    _model_weights,
    _rule_distribution_from_counts,
)
from collections import Counter
from echoes.constants import SUBSTAT_TYPES


def _event(index, substat_type):
    return {
        "id": index + 1,
        "echo_id": (index % 9) + 1,
        "substat_type": substat_type,
        "set_name": "moonlit" if index % 2 else "freezing",
    }


class IncrementalStateTests(TestCase):
    def test_apply_event_accumulates_once_and_bounds_windows(self):
        payload = empty_payload()
        for index in range(10_000):
            apply_event(payload, _event(index, SUBSTAT_TYPES[index % len(SUBSTAT_TYPES)]))

        self.assertEqual(payload["total_rolls"], 10_000)
        self.assertEqual(sum(payload["counts"].values()), 10_000)
        self.assertEqual(len(payload["recent_sequence"]), 30)
        self.assertEqual(len(payload["dynamic_outcomes"]), DYNAMIC_WEIGHT_BACKTEST_WINDOW)
        self.assertEqual(sum(sum(next_counts.values()) for next_counts in payload["patterns"]["1"].values()), 9_999)

    def test_distribution_and_dynamic_weights_have_stable_public_shape(self):
        payload = empty_payload()
        candidates = SUBSTAT_TYPES[:5]
        for index in range(30):
            apply_event(payload, _event(index, SUBSTAT_TYPES[index % len(SUBSTAT_TYPES)]))

        distributions = distributions_from_payload(payload, candidates)
        weights = dynamic_weights_from_payload(payload)

        self.assertEqual(set(distributions), {"rule", "bayes", "markov", "cycle", "context"})
        self.assertTrue(all(set(distribution) == set(candidates) for distribution in distributions.values()))
        self.assertEqual(set(weights), set(distributions))
        self.assertLess(abs(sum(weights.values()) - 1), 1e-12)

    def test_projection_matches_replay_helpers_for_multi_echo_history(self):
        payload = empty_payload()
        events = [_event(index, SUBSTAT_TYPES[(index * 2 + index // 3) % len(SUBSTAT_TYPES)]) for index in range(180)]
        for event in events:
            apply_event(payload, event)
        candidates = SUBSTAT_TYPES[:]
        sequence = [event["substat_type"] for event in events]
        replay = {
            "rule": _rule_distribution_from_counts(Counter(sequence), len(sequence), candidates),
            "bayes": _bayes_distribution_from_sequence(sequence, candidates),
            "markov": _markov_distribution_from_sequence(sequence, candidates),
            "cycle": _cycle_window_distribution_from_sequence(sequence, candidates),
        }
        incremental = distributions_from_payload(payload, candidates)
        for name, expected in replay.items():
            for key, value in expected.items():
                self.assertAlmostEqual(incremental[name][key], value, places=12)
        expected_weights, _ = _dynamic_weight_result_from_events(events, _model_weights(len(events)))
        for key, value in expected_weights.items():
            self.assertAlmostEqual(dynamic_weights_from_payload(payload)[key], value, places=12)
