import json
from unittest import TestCase

from analytics.services.incremental_state import (
    apply_event,
    build_payload_from_events,
    distributions_from_payload,
    dynamic_weights_from_payload,
    empty_payload,
)
from analytics.services.model_config import DYNAMIC_WEIGHT_BACKTEST_WINDOW, MODEL_KEYS
from analytics.services.state_store import _candidates_from_earlier_types
from analytics.services.prediction import (
    _bayes_distribution_from_sequence,
    _cycle_window_distribution_from_sequence,
    _dynamic_weight_result_from_events,
    _markov_distribution_from_sequence,
    _model_diagnostics,
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
    def test_dynamic_weights_match_replay_when_cycle_probabilities_are_nearly_tied(self):
        rows = [
            (197, "flat_def", "set-13"),
            (20, "heavy_attack_damage", "set-16"),
            (248, "atk_percent", "set-9"),
            (244, "liberation_damage", "set-18"),
            (111, "def_percent", "set-4"),
            (144, "basic_attack_damage", "set-3"),
            (128, "def_percent", "set-19"),
            (75, "heavy_attack_damage", "set-3"),
            (37, "flat_hp", "set-10"),
            (241, "def_percent", "set-3"),
            (181, "atk_percent", "set-10"),
            (104, "def_percent", "set-15"),
            (226, "def_percent", "set-8"),
            (31, "flat_def", "set-17"),
            (7, "crit_damage", "set-12"),
            (0, "flat_atk", "set-15"),
            (170, "skill_damage", "set-10"),
            (32, "skill_damage", "set-18"),
            (113, "skill_damage", "set-4"),
            (278, "hp_percent", "set-2"),
        ]
        events = [
            {"id": index + 1, "echo_id": echo_id, "substat_type": substat_type, "set_name": set_name}
            for index, (echo_id, substat_type, set_name) in enumerate(rows)
        ]

        expected_weights, expected_details = _dynamic_weight_result_from_events(
            events,
            _model_weights(len(events)),
        )
        payload = build_payload_from_events(events)
        actual_weights, actual_details = dynamic_weights_from_payload(
            payload,
            base_weights=_model_weights(len(events)),
            include_details=True,
        )

        self.assertEqual(actual_weights, expected_weights)
        self.assertEqual(actual_details, expected_details)

    def test_apply_event_accumulates_once_and_bounds_windows(self):
        payload = empty_payload()
        for index in range(10_000):
            apply_event(payload, _event(index, SUBSTAT_TYPES[index % len(SUBSTAT_TYPES)]), SUBSTAT_TYPES)

        self.assertEqual(payload["total_rolls"], 10_000)
        self.assertEqual(sum(payload["counts"].values()), 10_000)
        self.assertEqual(len(payload["recent_sequence"]), 30)
        self.assertEqual(len(payload["dynamic_outcomes"]), DYNAMIC_WEIGHT_BACKTEST_WINDOW)
        self.assertEqual(sum(sum(next_counts.values()) for next_counts in payload["patterns"]["1"].values()), 9_999)

    def test_persisted_state_keeps_compact_outcomes_and_bounded_set_groups(self):
        events = [
            {
                **_event(index, SUBSTAT_TYPES[index % len(SUBSTAT_TYPES)]),
                "set_name": f"untrusted-set-{index}",
            }
            for index in range(1_000)
        ]

        payload = build_payload_from_events(events)

        self.assertLessEqual(len(payload["set_counts"]), 128)
        self.assertLess(len(json.dumps(payload, separators=(",", ":")).encode()), 64 * 1024)
        for outcome in payload["dynamic_outcomes"]:
            self.assertEqual(set(outcome), {"evaluated", "hits"})
            self.assertIsInstance(outcome["evaluated"], bool)
            self.assertEqual(set(outcome["hits"]), set(MODEL_KEYS))
            self.assertTrue(all(isinstance(hit, bool) for hit in outcome["hits"].values()))

    def test_literal_other_set_name_does_not_collide_with_overflow(self):
        events = [
            {**_event(0, "crit_rate"), "set_name": "__other__"},
            *[
                {
                    **_event(index + 1, SUBSTAT_TYPES[(index + 1) % len(SUBSTAT_TYPES)]),
                    "set_name": f"set-{index}",
                }
                for index in range(200)
            ],
        ]

        payload = build_payload_from_events(events)

        self.assertEqual(payload["set_counts"]["__other__"], 1)
        self.assertEqual(len(payload["set_counts"]), 128)
        self.assertEqual(payload["set_counts_overflow"], 73)

    def test_distribution_and_dynamic_weights_have_stable_public_shape(self):
        payload = empty_payload()
        candidates = SUBSTAT_TYPES[:5]
        for index in range(30):
            apply_event(payload, _event(index, SUBSTAT_TYPES[index % len(SUBSTAT_TYPES)]), candidates)

        distributions = distributions_from_payload(payload, candidates)
        weights = dynamic_weights_from_payload(payload)

        self.assertEqual(set(distributions), {"rule", "bayes", "markov", "cycle", "context"})
        self.assertTrue(all(set(distribution) == set(candidates) for distribution in distributions.values()))
        self.assertEqual(set(weights), set(distributions))
        self.assertLess(abs(sum(weights.values()) - 1), 1e-12)

    def test_projection_matches_replay_helpers_for_multi_echo_history(self):
        payload = empty_payload()
        events = [_event(index, SUBSTAT_TYPES[(index * 2 + index // 3) % len(SUBSTAT_TYPES)]) for index in range(180)]
        payload = build_payload_from_events(events)
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

    def test_payload_weights_match_replay_at_every_schedule_boundary(self):
        """State-backed reads retain the replay model's 12/30/120 schedule semantics."""
        for size in (0, 20, 499, 500, 2999, 3000):
            with self.subTest(size=size):
                events = [
                    _event(index, SUBSTAT_TYPES[(index * 2 + index // 7) % len(SUBSTAT_TYPES)])
                    for index in range(size)
                ]
                payload = build_payload_from_events(events)
                base_weights = _model_weights(size)

                expected, expected_details = _dynamic_weight_result_from_events(events, base_weights)
                actual, actual_details = dynamic_weights_from_payload(
                    payload,
                    base_weights=base_weights,
                    include_details=True,
                )

                for key in expected:
                    self.assertAlmostEqual(actual[key], expected[key], places=12)
                    self.assertEqual(actual_details[key], expected_details[key])

    def test_cycle_matches_legacy_before_eight_events(self):
        events = [_event(index, SUBSTAT_TYPES[index]) for index in range(7)]
        payload = build_payload_from_events(events)
        candidates = SUBSTAT_TYPES[:5]

        expected = _cycle_window_distribution_from_sequence(
            [event["substat_type"] for event in events], candidates,
        )

        for key, value in expected.items():
            self.assertAlmostEqual(distributions_from_payload(payload, candidates)["cycle"][key], value, places=12)

    def test_cycle_matches_legacy_without_critical_candidates(self):
        events = [_event(index, SUBSTAT_TYPES[index % len(SUBSTAT_TYPES)]) for index in range(12)]
        payload = build_payload_from_events(events)
        candidates = ["atk_percent", "hp_percent", "flat_atk"]

        expected = _cycle_window_distribution_from_sequence(
            [event["substat_type"] for event in events], candidates,
        )

        for key, value in expected.items():
            self.assertAlmostEqual(distributions_from_payload(payload, candidates)["cycle"][key], value, places=12)

    def test_payload_never_persists_per_echo_seen_map(self):
        events = [_event(index, "crit_rate") for index in range(500)]

        payload = build_payload_from_events(events)

        self.assertNotIn("echo_seen", payload)

    def test_candidate_derivation_uses_prior_types_even_with_unusual_positions(self):
        candidates = _candidates_from_earlier_types([
            {"position": 99, "substat_type": "crit_rate"},
            {"position": 1, "substat_type": "crit_rate"},
            {"position": 0, "substat_type": "not_a_substat"},
            {"position": 8, "substat_type": "flat_atk"},
        ])

        self.assertNotIn("crit_rate", candidates)
        self.assertNotIn("flat_atk", candidates)
        self.assertEqual(len(candidates), len(SUBSTAT_TYPES) - 2)

    def test_diagnostics_keep_all_time_bayes_and_cycle_signals_after_recent_window_rolls(self):
        events = [_event(index, SUBSTAT_TYPES[(index * 3 + index // 5) % len(SUBSTAT_TYPES)]) for index in range(180)]
        payload = build_payload_from_events(events)
        sequence = [event["substat_type"] for event in events]
        candidates = SUBSTAT_TYPES[:]
        weights = _model_weights(len(events))
        legacy_distributions = {
            "rule": _rule_distribution_from_counts(Counter(sequence), len(sequence), candidates),
            "bayes": _bayes_distribution_from_sequence(sequence, candidates),
            "markov": _markov_distribution_from_sequence(sequence, candidates),
            "cycle": _cycle_window_distribution_from_sequence(sequence, candidates),
            "context": {key: 1 / len(candidates) for key in candidates},
        }

        expected = _model_diagnostics(sequence, candidates, len(sequence), weights, legacy_distributions)
        actual = _model_diagnostics(
            payload["recent_sequence"],
            candidates,
            len(sequence),
            weights,
            distributions_from_payload(payload, candidates),
            all_time_counts=payload["counts"],
        )

        self.assertAlmostEqual(actual["bayes"]["exact_weight"], expected["bayes"]["exact_weight"])
        self.assertAlmostEqual(actual["bayes"]["wildcard_weight"], expected["bayes"]["wildcard_weight"])
        self.assertAlmostEqual(actual["bayes"]["alpha"], expected["bayes"]["alpha"])
        for key, value in expected["cycle"]["windows"].items():
            self.assertAlmostEqual(actual["cycle"]["windows"][key], value)
        for key, value in expected["cycle"]["group_scores"].items():
            self.assertAlmostEqual(actual["cycle"]["group_scores"][key], value)
