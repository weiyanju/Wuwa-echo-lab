from collections import Counter
from math import exp

from api.constants import MODEL_LABELS, MODEL_WEIGHT_SCHEDULE, SUBSTAT_LABELS, SUBSTAT_TYPES, TIER_TABLES


DIRICHLET_ALPHA = 1.0
RECENT_SEQUENCE_WINDOW = 20
RECENT_BALANCE_STRENGTH = 0.85
GLOBAL_BALANCE_STRENGTH = 0.65
BAYES_PATTERN_MAX_PREFIX = 3
BAYES_PATTERN_WEIGHTS = {1: 1.0, 2: 3.0, 3: 5.0}
MODEL_KEYS = ("rule", "bayes", "markov", "context")
DYNAMIC_WEIGHT_MIN_EVENTS = 20
DYNAMIC_WEIGHT_BACKTEST_WINDOW = 120
DYNAMIC_WEIGHT_MAX_SHIFT = 0.025


def _existing_substats(echo):
    return set(echo.substat_rolls.values_list("substat_type", flat=True))


def _legal_candidates(echo):
    existing = _existing_substats(echo)
    return [substat_type for substat_type in SUBSTAT_TYPES if substat_type not in existing]


def _uniform_distribution(candidates):
    if not candidates:
        return {}
    probability = 1 / len(candidates)
    return {substat_type: probability for substat_type in candidates}


def _historical_substat_counts(user):
    counts = Counter()
    total = 0
    rolls = user.echo_records.values_list("substat_rolls__substat_type", flat=True)
    for substat_type in rolls:
        if substat_type in SUBSTAT_TYPES:
            counts[substat_type] += 1
            total += 1
    return counts, total


def _historical_roll_events(user):
    from api.models import SubstatRoll

    rows = SubstatRoll.objects.filter(echo__user=user).values_list(
        "substat_type",
        "tuned_at",
        "id",
        "echo_id",
    )
    events = [
        {
            "substat_type": substat_type,
            "tuned_at": tuned_at,
            "id": roll_id,
            "echo_id": echo_id,
        }
        for substat_type, tuned_at, roll_id, echo_id in rows
        if substat_type in SUBSTAT_TYPES and tuned_at is not None
    ]
    events.sort(key=lambda row: (row["tuned_at"], row["id"]))
    return events


def _model_weights(total_rolls):
    for stage in MODEL_WEIGHT_SCHEDULE:
        if total_rolls >= stage["min"] and (stage["max"] is None or total_rolls < stage["max"]):
            return dict(stage["weights"])
    return dict(MODEL_WEIGHT_SCHEDULE[-1]["weights"])


def _weight_stage(total_rolls):
    for stage in MODEL_WEIGHT_SCHEDULE:
        if total_rolls >= stage["min"] and (stage["max"] is None or total_rolls < stage["max"]):
            if stage["max"] is None:
                return f'{stage["min"]}+'
            return f'{stage["min"]}-{stage["max"]}'
    return f'{MODEL_WEIGHT_SCHEDULE[-1]["min"]}+'


def _historical_substat_sequence(user):
    return [event["substat_type"] for event in _historical_roll_events(user)]


def _rule_distribution_from_counts(counts, total, candidates):
    if not candidates:
        return {}

    if total < 3:
        return _uniform_distribution(candidates)

    expected = total / len(SUBSTAT_TYPES)
    raw = {}
    for substat_type in candidates:
        excess = (counts[substat_type] - expected) / max(expected, 1)
        raw[substat_type] = exp(-GLOBAL_BALANCE_STRENGTH * excess)

    candidate_total = sum(raw.values())
    if not candidate_total:
        return _uniform_distribution(candidates)
    return {substat_type: value / candidate_total for substat_type, value in raw.items()}


def _rule_distribution(user, candidates):
    counts, total = _historical_substat_counts(user)
    return _rule_distribution_from_counts(counts, total, candidates)


def _bayes_distribution_from_sequence(sequence, candidates):
    if len(sequence) < 3:
        return _uniform_distribution(candidates)

    raw = {substat_type: DIRICHLET_ALPHA for substat_type in candidates}
    max_prefix = min(BAYES_PATTERN_MAX_PREFIX, len(sequence) - 1)
    for prefix_length in range(1, max_prefix + 1):
        prefix = tuple(sequence[-prefix_length:])
        weight = BAYES_PATTERN_WEIGHTS[prefix_length]
        for index in range(0, len(sequence) - prefix_length):
            if tuple(sequence[index:index + prefix_length]) != prefix:
                continue
            next_substat = sequence[index + prefix_length]
            if next_substat in raw:
                raw[next_substat] += weight

    candidate_total = sum(raw.values())
    if candidate_total == 0:
        return _uniform_distribution(candidates)
    return {substat_type: value / candidate_total for substat_type, value in raw.items()}


def _bayes_distribution(user, candidates):
    return _bayes_distribution_from_sequence(_historical_substat_sequence(user), candidates)


def _markov_distribution_from_sequence(sequence, candidates):
    if not candidates:
        return {}

    recent_types = sequence[-RECENT_SEQUENCE_WINDOW:]
    if len(recent_types) < 3:
        return _uniform_distribution(candidates)

    counts = Counter(recent_types)
    expected = len(recent_types) / len(SUBSTAT_TYPES)
    raw = {}
    for substat_type in candidates:
        excess = (counts[substat_type] - expected) / max(expected, 1)
        raw[substat_type] = exp(-RECENT_BALANCE_STRENGTH * excess)

    latest_type = recent_types[-1]
    streak = 0
    for substat_type in reversed(recent_types):
        if substat_type != latest_type:
            break
        streak += 1
    if latest_type in raw and streak > 1:
        raw[latest_type] /= streak

    total = sum(raw.values())
    if not total:
        return _uniform_distribution(candidates)
    return {substat_type: value / total for substat_type, value in raw.items()}


def _markov_distribution(echo, candidates):
    return _markov_distribution_from_sequence(_historical_substat_sequence(echo.user), candidates)


def _context_distribution(echo, candidates):
    return _uniform_distribution(candidates)


def _context_distribution_for_candidates(candidates):
    return _uniform_distribution(candidates)


def _top_key(distribution):
    if not distribution:
        return None
    return max(distribution.items(), key=lambda item: item[1])[0]


def _normalize_weights(weights):
    total = sum(weights.values())
    if not total:
        return weights
    return {key: value / total for key, value in weights.items()}


def _dynamic_weight_result(user, base_weights):
    events = _historical_roll_events(user)
    if len(events) < DYNAMIC_WEIGHT_MIN_EVENTS:
        return dict(base_weights), {
            key: {"hit_rate": None, "evaluated": 0, "direction": "flat", "shift": 0.0}
            for key in MODEL_KEYS
        }

    hits = Counter()
    evaluated = 0
    sequence = []
    counts = Counter()
    total = 0
    seen_by_echo = {}
    start_index = max(0, len(events) - DYNAMIC_WEIGHT_BACKTEST_WINDOW)

    for index, event in enumerate(events):
        actual = event["substat_type"]
        echo_seen = seen_by_echo.setdefault(event["echo_id"], set())
        candidates = [substat_type for substat_type in SUBSTAT_TYPES if substat_type not in echo_seen]
        if actual in candidates and index >= start_index:
            distributions = {
                "rule": _rule_distribution_from_counts(counts, total, candidates),
                "bayes": _bayes_distribution_from_sequence(sequence, candidates),
                "markov": _markov_distribution_from_sequence(sequence, candidates),
                "context": _context_distribution_for_candidates(candidates),
            }
            for key, distribution in distributions.items():
                if _top_key(distribution) == actual:
                    hits[key] += 1
            evaluated += 1

        echo_seen.add(actual)
        sequence.append(actual)
        counts[actual] += 1
        total += 1

    if evaluated < DYNAMIC_WEIGHT_MIN_EVENTS:
        return dict(base_weights), {
            key: {"hit_rate": None, "evaluated": evaluated, "direction": "flat", "shift": 0.0}
            for key in MODEL_KEYS
        }

    hit_rates = {key: hits[key] / evaluated for key in MODEL_KEYS}
    active_keys = [key for key in MODEL_KEYS if base_weights.get(key, 0) > 0]
    average_hit_rate = sum(hit_rates[key] for key in active_keys) / len(active_keys)
    adjusted = dict(base_weights)
    adjustments = {}
    for key in MODEL_KEYS:
        if base_weights.get(key, 0) <= 0:
            shift = 0.0
        else:
            shift = max(
                -DYNAMIC_WEIGHT_MAX_SHIFT,
                min(DYNAMIC_WEIGHT_MAX_SHIFT, hit_rates[key] - average_hit_rate),
            )
            adjusted[key] = max(0.01, adjusted[key] + shift)
        adjustments[key] = {
            "hit_rate": hit_rates[key],
            "evaluated": evaluated,
            "direction": "up" if shift > 0 else "down" if shift < 0 else "flat",
            "shift": shift,
        }

    return _normalize_weights(adjusted), adjustments


def _weighted_distribution(distributions, weights):
    result = {}
    for substat_type in distributions["rule"]:
        result[substat_type] = (
            weights["rule"] * distributions["rule"][substat_type]
            + weights["bayes"] * distributions["bayes"][substat_type]
            + weights["markov"] * distributions["markov"][substat_type]
            + weights["context"] * distributions["context"][substat_type]
        )
    total = sum(result.values())
    if total:
        result = {key: value / total for key, value in result.items()}
    return result


def _serializable_tier_table(substat_type):
    return [dict(row) for row in TIER_TABLES[substat_type]]


def predict_next_substat(echo):
    candidates = _legal_candidates(echo)
    _, total_rolls = _historical_substat_counts(echo.user)
    base_weights = _model_weights(total_rolls)
    weights, weight_adjustments = _dynamic_weight_result(echo.user, base_weights)
    distributions = {
        "rule": _rule_distribution(echo.user, candidates),
        "bayes": _bayes_distribution(echo.user, candidates),
        "markov": _markov_distribution(echo, candidates),
        "context": _context_distribution(echo, candidates),
    }
    final = _weighted_distribution(distributions, weights)

    rows = []
    for substat_type in candidates:
        p_rule = distributions["rule"][substat_type]
        p_final = final[substat_type]
        rows.append({
            "substat_type": substat_type,
            "label": SUBSTAT_LABELS[substat_type],
            "p_rule": p_rule,
            "p_bayes": distributions["bayes"][substat_type],
            "p_markov": distributions["markov"][substat_type],
            "p_context": distributions["context"][substat_type],
            "p_final": p_final,
            "baseline_deviation": p_final - p_rule,
            "tier_table": _serializable_tier_table(substat_type),
            "evidence": "规则均衡负责长期回归；周期规律匹配历史片段；近期序列检测短期重复；上下文模型按样本阶段谨慎参与。",
        })

    rows.sort(key=lambda row: row["p_final"], reverse=True)
    return {
        "echo_id": echo.id,
        "weights": weights,
        "base_weights": base_weights,
        "weight_adjustments": weight_adjustments,
        "model_labels": dict(MODEL_LABELS),
        "weight_stage": _weight_stage(total_rolls),
        "confidence": "low" if total_rolls < 500 else "medium",
        "candidates": rows,
    }
