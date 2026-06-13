from collections import Counter
from math import exp

from echoes.constants import MODEL_LABELS, MODEL_WEIGHT_SCHEDULE, SUBSTAT_LABELS, SUBSTAT_TYPES, TIER_TABLES


BAYES_ALPHA_MIN = 1.0
BAYES_ALPHA_MAX = 5.0
BAYES_ALPHA_DECAY_SAMPLES = 500
RECENT_SEQUENCE_WINDOW = 12
RECENT_BALANCE_STRENGTH = 0.85
RECENT_OVERHEAT_MIN_COUNT = 3
GLOBAL_BALANCE_STRENGTH = 0.65
BAYES_PATTERN_MAX_PREFIX = 3
BAYES_PATTERN_WEIGHTS = {1: 1.0, 2: 3.0, 3: 5.0}
BAYES_WILDCARD_MIDDLE_WEIGHT = 2.0
BAYES_WILDCARD_WEIGHT_MIN = 0.15
BAYES_WILDCARD_WEIGHT_MAX = 0.35
BAYES_WILDCARD_WEIGHT_RAMP_SAMPLES = 2000
CRIT_SUBSTATS = ("crit_rate", "crit_damage")
SUBSTAT_GROUPS = {
    "attack": ("atk_percent", "flat_atk"),
    "hp": ("hp_percent", "flat_hp"),
    "defense": ("def_percent", "flat_def"),
    "damage_bonus": (
        "basic_attack_damage",
        "skill_damage",
        "heavy_attack_damage",
        "liberation_damage",
    ),
    "energy": ("energy_regen",),
}
CYCLE_CRIT_SIGNAL_WEIGHT = 0.75
CYCLE_GENERAL_SIGNAL_WEIGHT = 0.25
MODEL_KEYS = ("rule", "bayes", "markov", "cycle", "context")
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


def _historical_substat_counts(owner):
    counts = Counter()
    total = 0
    rolls = owner.echo_records.values_list("substat_rolls__substat_type", flat=True)
    for substat_type in rolls:
        if substat_type in SUBSTAT_TYPES:
            counts[substat_type] += 1
            total += 1
    return counts, total


def _historical_roll_events(owner):
    from echoes.models import SubstatRoll

    if owner.__class__.__name__ == "GameAccount":
        queryset = SubstatRoll.objects.filter(echo__game_account=owner)
    else:
        queryset = SubstatRoll.objects.filter(echo__user=owner)

    rows = queryset.values_list(
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


def _historical_substat_sequence(owner):
    return [event["substat_type"] for event in _historical_roll_events(owner)]


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


def _rule_distribution(owner, candidates):
    counts, total = _historical_substat_counts(owner)
    return _rule_distribution_from_counts(counts, total, candidates)


def _bayes_dirichlet_alpha(sample_count):
    sample_ratio = min(sample_count, BAYES_ALPHA_DECAY_SAMPLES) / BAYES_ALPHA_DECAY_SAMPLES
    return BAYES_ALPHA_MAX - (BAYES_ALPHA_MAX - BAYES_ALPHA_MIN) * sample_ratio


def _normalize_raw_distribution(raw, candidates):
    total = sum(raw.values())
    if total == 0:
        return _uniform_distribution(candidates)
    return {substat_type: value / total for substat_type, value in raw.items()}


def _bayes_component_weights(sample_count):
    sample_ratio = min(sample_count, BAYES_WILDCARD_WEIGHT_RAMP_SAMPLES) / BAYES_WILDCARD_WEIGHT_RAMP_SAMPLES
    wildcard_weight = (
        BAYES_WILDCARD_WEIGHT_MIN
        + (BAYES_WILDCARD_WEIGHT_MAX - BAYES_WILDCARD_WEIGHT_MIN) * sample_ratio
    )
    return {"exact": 1 - wildcard_weight, "wildcard": wildcard_weight}


def _blend_distributions(distributions, weights, candidates):
    result = {}
    for substat_type in candidates:
        result[substat_type] = sum(
            weights[key] * distributions[key][substat_type]
            for key in distributions
        )
    return _normalize_raw_distribution(result, candidates)


def _bayes_exact_distribution_from_sequence(sequence, candidates):
    if len(sequence) < 3:
        return _uniform_distribution(candidates)

    raw = {substat_type: _bayes_dirichlet_alpha(len(sequence)) for substat_type in candidates}
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

    return _normalize_raw_distribution(raw, candidates)


def _bayes_wildcard_distribution_from_sequence(sequence, candidates):
    if len(sequence) < 4:
        return _uniform_distribution(candidates)

    raw = {substat_type: _bayes_dirichlet_alpha(len(sequence)) for substat_type in candidates}
    anchor = sequence[-2]
    current_middle = sequence[-1]
    for index in range(0, len(sequence) - 2):
        if sequence[index] != anchor:
            continue
        if sequence[index + 1] == current_middle:
            continue
        next_substat = sequence[index + 2]
        if next_substat in raw:
            raw[next_substat] += BAYES_WILDCARD_MIDDLE_WEIGHT

    return _normalize_raw_distribution(raw, candidates)


def _bayes_distribution_from_sequence(sequence, candidates):
    if len(sequence) < 3:
        return _uniform_distribution(candidates)

    component_weights = _bayes_component_weights(len(sequence))
    distributions = {
        "exact": _bayes_exact_distribution_from_sequence(sequence, candidates),
        "wildcard": _bayes_wildcard_distribution_from_sequence(sequence, candidates),
    }
    return _blend_distributions(distributions, component_weights, candidates)


def _bayes_distribution(owner, candidates):
    return _bayes_distribution_from_sequence(_historical_substat_sequence(owner), candidates)


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
        if counts[substat_type] >= RECENT_OVERHEAT_MIN_COUNT and excess > 0:
            raw[substat_type] = exp(-RECENT_BALANCE_STRENGTH * excess)
        else:
            raw[substat_type] = 1.0

    latest_type = recent_types[-1]
    streak = 0
    for substat_type in reversed(recent_types):
        if substat_type != latest_type:
            break
        streak += 1
    if latest_type in raw and streak >= RECENT_OVERHEAT_MIN_COUNT:
        raw[latest_type] /= streak

    total = sum(raw.values())
    if not total:
        return _uniform_distribution(candidates)
    return {substat_type: value / total for substat_type, value in raw.items()}


def _markov_distribution(echo, candidates):
    return _markov_distribution_from_sequence(_historical_substat_sequence(echo.game_account), candidates)


def _markov_recent_counts_from_sequence(sequence):
    recent_types = sequence[-RECENT_SEQUENCE_WINDOW:]
    return dict(Counter(recent_types))


def _markov_recent_sequence_from_sequence(sequence):
    return [
        {
            "substat_type": substat_type,
            "label": SUBSTAT_LABELS.get(substat_type, substat_type),
        }
        for substat_type in sequence[-RECENT_SEQUENCE_WINDOW:]
    ]


def _markov_penalties_from_sequence(sequence, candidates):
    recent_types = sequence[-RECENT_SEQUENCE_WINDOW:]
    if len(recent_types) < 3:
        return {substat_type: 0.0 for substat_type in candidates}

    counts = Counter(recent_types)
    expected = len(recent_types) / len(SUBSTAT_TYPES)
    penalties = {}
    for substat_type in candidates:
        excess = (counts[substat_type] - expected) / max(expected, 1)
        if counts[substat_type] >= RECENT_OVERHEAT_MIN_COUNT and excess > 0:
            penalties[substat_type] = 1 - exp(-RECENT_BALANCE_STRENGTH * excess)
        else:
            penalties[substat_type] = 0.0

    latest_type = recent_types[-1]
    streak = 0
    for substat_type in reversed(recent_types):
        if substat_type != latest_type:
            break
        streak += 1
    if latest_type in penalties and streak >= RECENT_OVERHEAT_MIN_COUNT:
        penalties[latest_type] = max(penalties[latest_type], 1 - (1 / streak))
    return penalties


def _rate(sequence, substat_type, window_size):
    window = sequence[-window_size:]
    if not window:
        return 0
    return window.count(substat_type) / len(window)


def _crit_group_rate(sequence, window_size):
    window = sequence[-window_size:]
    if not window:
        return 0
    return sum(1 for substat_type in window if substat_type in CRIT_SUBSTATS) / len(window)


def _gap_since(sequence, substat_type):
    for index, item in enumerate(reversed(sequence), start=1):
        if item == substat_type:
            return index - 1
    return len(sequence)


def _gap_since_any(sequence, group):
    group = set(group)
    for index, item in enumerate(reversed(sequence), start=1):
        if item in group:
            return index - 1
    return len(sequence)


def _recent_pair_density(sequence, window_size=12):
    window = sequence[-window_size:]
    if len(window) < 2:
        return 0

    pair_count = 0
    for left, right in zip(window, window[1:]):
        if {left, right} == set(CRIT_SUBSTATS):
            pair_count += 1
    return pair_count / (len(window) - 1)


def _recent_crit_streak(sequence):
    streak = 0
    for substat_type in reversed(sequence):
        if substat_type not in CRIT_SUBSTATS:
            break
        streak += 1
    return streak


def _cycle_window_probabilities_from_sequence(sequence):
    if len(sequence) < 8:
        return {"double": 0.25, "single_rate": 0.25, "single_damage": 0.25, "cooldown": 0.25}

    recent_5_rate = _rate(sequence, "crit_rate", 5)
    recent_5_damage = _rate(sequence, "crit_damage", 5)
    recent_12_group = _crit_group_rate(sequence, 12)
    recent_30_group = _crit_group_rate(sequence, 30)
    global_group = _crit_group_rate(sequence, len(sequence))
    gap_rate = _gap_since(sequence, "crit_rate")
    gap_damage = _gap_since(sequence, "crit_damage")
    gap_any = _gap_since_any(sequence, CRIT_SUBSTATS)
    pair_density = _recent_pair_density(sequence)
    crit_streak = _recent_crit_streak(sequence)
    trend = recent_12_group - global_group

    double_score = (
        0.35
        + 1.40 * max(trend, 0)
        + 1.20 * min(recent_5_rate, recent_5_damage)
        + 1.20 * pair_density
        + 0.04 * min(gap_rate, 12)
        + 0.04 * min(gap_damage, 12)
    )
    single_rate_score = (
        0.35
        + 1.60 * max(recent_5_rate - recent_5_damage, 0)
        + 0.80 * max(recent_12_group - recent_30_group, 0)
        + 0.03 * min(gap_damage, 12)
    )
    single_damage_score = (
        0.35
        + 1.60 * max(recent_5_damage - recent_5_rate, 0)
        + 0.80 * max(recent_12_group - recent_30_group, 0)
        + 0.03 * min(gap_rate, 12)
    )
    cooldown_score = (
        0.35
        + 0.75 * max(recent_12_group - global_group, 0)
        + 0.90 * max(recent_5_rate + recent_5_damage - 0.45, 0)
        + 0.35 * max(crit_streak - 1, 0)
        - 0.04 * min(gap_any, 12)
    )
    raw = {
        "double": max(double_score, 0.01),
        "single_rate": max(single_rate_score, 0.01),
        "single_damage": max(single_damage_score, 0.01),
        "cooldown": max(cooldown_score, 0.01),
    }
    total = sum(raw.values())
    return {key: value / total for key, value in raw.items()}


def _cycle_state_distribution(candidates, state):
    multipliers = {substat_type: 1.0 for substat_type in candidates}
    if state == "double":
        multipliers["crit_rate"] = 1.30
        multipliers["crit_damage"] = 1.30
    elif state == "single_rate":
        multipliers["crit_rate"] = 1.45
        multipliers["crit_damage"] = 0.92
    elif state == "single_damage":
        multipliers["crit_rate"] = 0.92
        multipliers["crit_damage"] = 1.45
    elif state == "cooldown":
        multipliers["crit_rate"] = 0.72
        multipliers["crit_damage"] = 0.72

    raw = {substat_type: multipliers.get(substat_type, 1.0) for substat_type in candidates}
    return _normalize_raw_distribution(raw, candidates)


def _group_rate(sequence, group, window_size):
    window = sequence[-window_size:]
    if not window:
        return 0
    group = set(group)
    return sum(1 for substat_type in window if substat_type in group) / len(window)


def _group_streak(sequence, group):
    group = set(group)
    streak = 0
    for substat_type in reversed(sequence):
        if substat_type not in group:
            break
        streak += 1
    return streak


def _general_cycle_group_probabilities_from_sequence(sequence):
    if len(sequence) < 8:
        probability = 1 / len(SUBSTAT_GROUPS)
        return {group_name: probability for group_name in SUBSTAT_GROUPS}

    raw = {}
    for group_name, group in SUBSTAT_GROUPS.items():
        recent_5_rate = _group_rate(sequence, group, 5)
        recent_12_rate = _group_rate(sequence, group, 12)
        recent_30_rate = _group_rate(sequence, group, 30)
        global_rate = _group_rate(sequence, group, len(sequence))
        gap = _gap_since_any(sequence, group)
        streak = _group_streak(sequence, group)
        trend = recent_12_rate - global_rate

        raw[group_name] = max(
            0.01,
            0.35
            + 1.30 * max(trend, 0)
            + 0.90 * recent_5_rate
            + 0.55 * max(recent_12_rate - recent_30_rate, 0)
            + 0.035 * min(gap, 12)
            - 0.25 * max(streak - 2, 0),
        )

    total = sum(raw.values())
    return {group_name: value / total for group_name, value in raw.items()}


def _general_cycle_distribution_from_sequence(sequence, candidates):
    if not candidates:
        return {}
    group_probabilities = _general_cycle_group_probabilities_from_sequence(sequence)
    raw = {substat_type: 1.0 for substat_type in candidates}
    for group_name, group in SUBSTAT_GROUPS.items():
        candidate_group = [substat_type for substat_type in group if substat_type in raw]
        if not candidate_group:
            continue
        multiplier = 0.70 + 1.80 * group_probabilities[group_name]
        for substat_type in candidate_group:
            raw[substat_type] *= multiplier

    return _normalize_raw_distribution(raw, candidates)


def _crit_cycle_distribution_from_sequence(sequence, candidates):
    if not candidates:
        return {}
    if not any(substat_type in candidates for substat_type in CRIT_SUBSTATS):
        return _uniform_distribution(candidates)

    window_probabilities = _cycle_window_probabilities_from_sequence(sequence)
    distributions = {
        "double": _cycle_state_distribution(candidates, "double"),
        "single_rate": _cycle_state_distribution(candidates, "single_rate"),
        "single_damage": _cycle_state_distribution(candidates, "single_damage"),
        "cooldown": _cycle_state_distribution(candidates, "cooldown"),
    }
    return _blend_distributions(distributions, window_probabilities, candidates)


def _cycle_window_distribution_from_sequence(sequence, candidates):
    if not candidates:
        return {}

    distributions = {
        "crit": _crit_cycle_distribution_from_sequence(sequence, candidates),
        "general": _general_cycle_distribution_from_sequence(sequence, candidates),
    }
    weights = {
        "crit": CYCLE_CRIT_SIGNAL_WEIGHT,
        "general": CYCLE_GENERAL_SIGNAL_WEIGHT,
    }
    return _blend_distributions(distributions, weights, candidates)


def _cycle_window_distribution(echo, candidates):
    return _cycle_window_distribution_from_sequence(_historical_substat_sequence(echo.game_account), candidates)


def _substat_labels_for_scores(scores):
    return {
        key: {
            "value": value,
            "label": SUBSTAT_LABELS.get(key, key),
        }
        for key, value in scores.items()
    }


def _dominant_model(weights):
    active = {key: value for key, value in weights.items() if value > 0}
    if not active:
        return None
    return max(active.items(), key=lambda item: item[1])[0]


def _auxiliary_models(weights, dominant):
    return [
        key
        for key, _ in sorted(weights.items(), key=lambda item: item[1], reverse=True)
        if key != dominant and weights.get(key, 0) > 0
    ][:2]


def _context_diagnostics(total_rolls, weights):
    recommended_samples = 3000
    enabled = weights.get("context", 0) > 0 and total_rolls >= recommended_samples
    status = "enabled" if enabled else "disabled"
    factor_status = "monitoring" if enabled else "insufficient_data"
    return {
        "status": status,
        "sample_size": total_rolls,
        "recommended_samples": recommended_samples,
        "factors": {
            "set_name": {"label": "set name", "status": factor_status, "sample_size": total_rolls},
            "cost": {"label": "cost", "status": factor_status, "sample_size": total_rolls},
            "main_stat": {"label": "main stat", "status": factor_status, "sample_size": total_rolls},
            "position": {"label": "position", "status": factor_status, "sample_size": total_rolls},
        },
    }


def _model_diagnostics(sequence, candidates, total_rolls, weights, distributions):
    bayes_weights = _bayes_component_weights(len(sequence))
    dominant = _dominant_model(weights)
    cycle_windows = _cycle_window_probabilities_from_sequence(sequence)
    cycle_groups = _general_cycle_group_probabilities_from_sequence(sequence)
    markov_counts = _markov_recent_counts_from_sequence(sequence)
    markov_penalties = _markov_penalties_from_sequence(sequence, candidates)
    top_rule = _top_key(distributions.get("rule", {}))
    top_cycle_window = _top_key(cycle_windows)
    top_penalty = _top_key(markov_penalties)
    return {
        "summary": {
            "dominant_model": dominant,
            "auxiliary_models": _auxiliary_models(weights, dominant),
            "context_status": "disabled" if weights.get("context", 0) <= 0 else "enabled",
            "confidence_note": "低样本阶段，结论偏观察" if total_rolls < 500 else "样本进入模型验证阶段",
        },
        "rule": {
            "top_balanced_substat": top_rule,
            "player_note": (
                f"{SUBSTAT_LABELS[top_rule]}当前更受规则均衡关注。"
                if top_rule else "等待更多样本后观察全局偏差。"
            ),
        },
        "bayes": {
            "exact_weight": bayes_weights["exact"],
            "wildcard_weight": bayes_weights["wildcard"],
            "alpha": _bayes_dirichlet_alpha(len(sequence)),
            "player_note": "周期规律正在比较精确片段和通配片段。",
        },
        "markov": {
            "window_size": RECENT_SEQUENCE_WINDOW,
            "recent_sequence": _markov_recent_sequence_from_sequence(sequence),
            "recent_counts": _substat_labels_for_scores(markov_counts),
            "penalties": _substat_labels_for_scores(markov_penalties),
            "player_note": (
                f"{SUBSTAT_LABELS[top_penalty]}近期偏热，短期被降温。"
                if top_penalty and markov_penalties[top_penalty] > 0
                else "最近窗口没有明显过热词条。"
            ),
        },
        "cycle": {
            "windows": cycle_windows,
            "group_scores": cycle_groups,
            "player_note": (
                f"当前更接近{top_cycle_window}窗口。"
                if top_cycle_window else "词条窗口信号暂不明显。"
            ),
        },
        "context": _context_diagnostics(total_rolls, weights),
    }


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


def _dynamic_weight_result_from_events(events, base_weights):
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
                "cycle": _cycle_window_distribution_from_sequence(sequence, candidates),
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


def _dynamic_weight_result(owner, base_weights):
    return _dynamic_weight_result_from_events(_historical_roll_events(owner), base_weights)


def _weighted_distribution(distributions, weights):
    result = {}
    for substat_type in distributions["rule"]:
        result[substat_type] = sum(
            weights[key] * distributions[key][substat_type]
            for key in MODEL_KEYS
            if key in weights and key in distributions
        )
    total = sum(result.values())
    if total:
        result = {key: value / total for key, value in result.items()}
    return result


def _serializable_tier_table(substat_type):
    return [dict(row) for row in TIER_TABLES[substat_type]]


def predict_next_substat(echo):
    candidates = _legal_candidates(echo)
    owner = echo.game_account
    events = _historical_roll_events(owner)
    sequence = [event["substat_type"] for event in events]
    counts = Counter(sequence)
    total_rolls = len(sequence)
    base_weights = _model_weights(total_rolls)
    weights, weight_adjustments = _dynamic_weight_result_from_events(events, base_weights)
    distributions = {
        "rule": _rule_distribution_from_counts(counts, total_rolls, candidates),
        "bayes": _bayes_distribution_from_sequence(sequence, candidates),
        "markov": _markov_distribution_from_sequence(sequence, candidates),
        "cycle": _cycle_window_distribution_from_sequence(sequence, candidates),
        "context": _context_distribution_for_candidates(candidates),
    }
    final = _weighted_distribution(distributions, weights)
    diagnostics = _model_diagnostics(sequence, candidates, total_rolls, weights, distributions)

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
            "p_cycle": distributions["cycle"][substat_type],
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
        "sample_size": total_rolls,
        "confidence": "low" if total_rolls < 500 else "medium",
        "model_diagnostics": diagnostics,
        "candidates": rows,
    }
