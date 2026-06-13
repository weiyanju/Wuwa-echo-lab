import math
from collections import Counter

from echoes.constants import SUBSTAT_TYPES
from analytics.services.prediction import (
    MODEL_KEYS,
    _bayes_distribution_from_sequence,
    _context_distribution_for_candidates,
    _cycle_window_distribution_from_sequence,
    _dynamic_weight_result_from_events,
    _historical_roll_events,
    _markov_distribution_from_sequence,
    _model_weights,
    _rule_distribution_from_counts,
    _weighted_distribution,
)


MIN_BACKTEST_HISTORY = 20
MIN_EVALUATED_SAMPLES = 20


def log_loss(prediction, actual):
    probability = max(prediction.get(actual, 0), 1e-15)
    return -math.log(probability)


def brier_score(prediction, actual):
    total = 0
    for label in set(prediction) | {actual}:
        probability = prediction.get(label, 0)
        expected = 1 if label == actual else 0
        total += (probability - expected) ** 2
    return total


def top_k_hit(prediction, actual, k):
    if k <= 0:
        return False
    ranked = sorted(prediction.items(), key=lambda item: item[1], reverse=True)
    return actual in [label for label, _ in ranked[:k]]


def empty_evaluation():
    return {
        "status": "insufficient_data",
        "sample_size": 0,
        "evaluated_count": 0,
        "log_loss": None,
        "brier_score": None,
        "top_1_hit_rate": None,
        "top_3_hit_rate": None,
        "top_5_hit_rate": None,
        "model_scores": {},
        "message": "insufficient_data",
    }


def _average(values):
    return sum(values) / len(values) if values else None


def _distributions_for_prefix(sequence, counts, total, candidates):
    return {
        "rule": _rule_distribution_from_counts(counts, total, candidates),
        "bayes": _bayes_distribution_from_sequence(sequence, candidates),
        "markov": _markov_distribution_from_sequence(sequence, candidates),
        "cycle": _cycle_window_distribution_from_sequence(sequence, candidates),
        "context": _context_distribution_for_candidates(candidates),
    }


def build_model_evaluation(user, min_history=MIN_BACKTEST_HISTORY):
    events = _historical_roll_events(user)
    if len(events) <= min_history:
        result = empty_evaluation()
        result["sample_size"] = len(events)
        return result

    sequence = []
    counts = Counter()
    total = 0
    seen_by_echo = {}
    top_hits = {1: 0, 3: 0, 5: 0}
    losses = []
    brier_scores = []
    model_hits = Counter()
    model_losses = {key: [] for key in MODEL_KEYS}
    evaluated = 0

    for index, event in enumerate(events):
        actual = event["substat_type"]
        echo_seen = seen_by_echo.setdefault(event["echo_id"], set())
        candidates = [substat_type for substat_type in SUBSTAT_TYPES if substat_type not in echo_seen]
        should_evaluate = index >= min_history and actual in candidates

        if should_evaluate:
            distributions = _distributions_for_prefix(sequence, counts, total, candidates)
            base_weights = _model_weights(total)
            weights, _ = _dynamic_weight_result_from_events(events[:index], base_weights)
            final_distribution = _weighted_distribution(distributions, weights)
            losses.append(log_loss(final_distribution, actual))
            brier_scores.append(brier_score(final_distribution, actual))
            for k in top_hits:
                if top_k_hit(final_distribution, actual, k):
                    top_hits[k] += 1
            for key, distribution in distributions.items():
                if top_k_hit(distribution, actual, 1):
                    model_hits[key] += 1
                model_losses[key].append(log_loss(distribution, actual))
            evaluated += 1

        echo_seen.add(actual)
        sequence.append(actual)
        counts[actual] += 1
        total += 1

    if evaluated < MIN_EVALUATED_SAMPLES:
        result = empty_evaluation()
        result["sample_size"] = len(events)
        result["evaluated_count"] = evaluated
        return result

    return {
        "status": "ready",
        "sample_size": len(events),
        "evaluated_count": evaluated,
        "log_loss": _average(losses),
        "brier_score": _average(brier_scores),
        "top_1_hit_rate": top_hits[1] / evaluated,
        "top_3_hit_rate": top_hits[3] / evaluated,
        "top_5_hit_rate": top_hits[5] / evaluated,
        "model_scores": {
            key: {
                "hit_rate": model_hits[key] / len(model_losses[key]) if model_losses[key] else None,
                "loss": _average(model_losses[key]),
                "evaluated": len(model_losses[key]),
            }
            for key in MODEL_KEYS
        },
        "message": "ready",
    }
