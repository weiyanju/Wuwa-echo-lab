"""Pure, bounded state transitions for the persistent analytics projection."""
from collections import Counter
from math import exp

from echoes.constants import SUBSTAT_TYPES

from .metrics import brier_score, log_loss, top_k_hit
from .model_config import (
    CYCLE_DIRECT_WINDOW, DYNAMIC_WEIGHT_BACKTEST_WINDOW, DYNAMIC_WEIGHT_MIN_EVENTS,
    MAX_SHIFT, MODEL_KEYS, RECENT_SEQUENCE_WINDOW, base_model_weights, normalize_weights,
)

CURRENT_SCHEMA_VERSION = 1
CURRENT_MODEL_VERSION = "incremental-v1"
DIRECT_SEQUENCE_CAPACITY = max(RECENT_SEQUENCE_WINDOW, CYCLE_DIRECT_WINDOW, 3)

BAYES_ALPHA_MIN, BAYES_ALPHA_MAX, BAYES_ALPHA_DECAY_SAMPLES = 1.0, 5.0, 500
BAYES_PATTERN_WEIGHTS = {1: 1.0, 2: 3.0, 3: 5.0}
CRIT_SUBSTATS = ("crit_rate", "crit_damage")
SUBSTAT_GROUPS = {
    "attack": ("atk_percent", "flat_atk"), "hp": ("hp_percent", "flat_hp"),
    "defense": ("def_percent", "flat_def"),
    "damage_bonus": ("basic_attack_damage", "skill_damage", "heavy_attack_damage", "liberation_damage"),
    "energy": ("energy_regen",),
}
MIN_BACKTEST_HISTORY = 20


def empty_payload():
    return {
        "total_rolls": 0, "counts": {}, "set_counts": {}, "patterns": {"1": {}, "2": {}, "3": {}},
        "recent_sequence": [], "dynamic_outcomes": [], "online_evaluation": _empty_evaluation(),
    }


def _empty_evaluation():
    return {"evaluated": 0, "loss_total": 0.0, "brier_total": 0.0, "top_hits": {"1": 0, "3": 0, "5": 0},
            "models": {key: {"evaluated": 0, "hits": 0, "loss_total": 0.0} for key in MODEL_KEYS}}


def _uniform(candidates):
    return {} if not candidates else {key: 1 / len(candidates) for key in candidates}


def _normal(raw, candidates):
    total = sum(raw.values())
    return _uniform(candidates) if not total else {key: value / total for key, value in raw.items()}


def _key(parts): return "\x1f".join(parts)


def _sequence_patterns(sequence, length):
    return Counter(_key(sequence[index:index + length]) for index in range(len(sequence) - length + 1))


def _rule(counts, total, candidates):
    if not candidates or total < 3: return _uniform(candidates)
    expected = total / len(SUBSTAT_TYPES)
    return _normal({key: exp(-.65 * ((counts.get(key, 0) - expected) / max(expected, 1))) for key in candidates}, candidates)


def _alpha(total):
    return BAYES_ALPHA_MAX - (BAYES_ALPHA_MAX - BAYES_ALPHA_MIN) * min(total, BAYES_ALPHA_DECAY_SAMPLES) / BAYES_ALPHA_DECAY_SAMPLES


def _bayes(payload, candidates):
    total, recent, patterns = payload["total_rolls"], payload["recent_sequence"], payload["patterns"]
    if total < 3: return _uniform(candidates)
    raw = {key: _alpha(total) for key in candidates}
    for length, weight in BAYES_PATTERN_WEIGHTS.items():
        if len(recent) < length: continue
        prefix = _key(recent[-length:])
        for next_key, count in patterns[str(length)].get(prefix, {}).items():
            if next_key in raw:
                raw[next_key] += weight * count
    exact = _normal(raw, candidates)
    if total < 4: wildcard = _uniform(candidates)
    else:
        wildcard_raw = {key: _alpha(total) for key in candidates}; anchor, middle = recent[-2:]
        for joined, next_counts in patterns["2"].items():
            left, middle_seen = joined.split("\x1f")
            if left == anchor and middle_seen != middle:
                for next_key, count in next_counts.items():
                    if next_key in wildcard_raw:
                        wildcard_raw[next_key] += 2 * count
        wildcard = _normal(wildcard_raw, candidates)
    wildcard_weight = .15 + (.35 - .15) * min(total, 2000) / 2000
    return _normal({key: (1 - wildcard_weight) * exact[key] + wildcard_weight * wildcard[key] for key in candidates}, candidates)


def _markov(recent, candidates):
    recent = recent[-RECENT_SEQUENCE_WINDOW:]
    if not candidates or len(recent) < 3: return _uniform(candidates)
    counts, expected = Counter(recent), len(recent) / len(SUBSTAT_TYPES)
    raw = {key: exp(-.85 * ((counts[key] - expected) / max(expected, 1))) if counts[key] >= 3 and counts[key] > expected else 1.0 for key in candidates}
    latest, streak = recent[-1], 0
    for key in reversed(recent):
        if key != latest: break
        streak += 1
    if latest in raw and streak >= 3: raw[latest] /= streak
    return _normal(raw, candidates)


def _rate(sequence, key, window):
    values = sequence[-window:]; return values.count(key) / len(values) if values else 0


def _group_rate(sequence, group, window):
    values = sequence[-window:]; return sum(value in group for value in values) / len(values) if values else 0


def _gap(sequence, group):
    for index, value in enumerate(reversed(sequence), 1):
        if value in group: return index - 1
    return len(sequence)


def _cycle(payload, candidates):
    recent, counts, total = payload["recent_sequence"][-CYCLE_DIRECT_WINDOW:], payload["counts"], payload["total_rolls"]
    if not candidates: return {}
    # Same recent signals as prediction; all-time group rate comes from persistent counts.
    if len(recent) < 8:
        group_probs = {name: 1 / len(SUBSTAT_GROUPS) for name in SUBSTAT_GROUPS}
    else:
        group_probs = {}
        for name, group in SUBSTAT_GROUPS.items():
            r5, r12, r30 = _group_rate(recent, group, 5), _group_rate(recent, group, 12), _group_rate(recent, group, 30)
            global_rate = sum(counts.get(key, 0) for key in group) / total
            streak = 0
            for value in reversed(recent):
                if value not in group: break
                streak += 1
            group_probs[name] = max(.01, .35 + 1.30 * max(r12-global_rate, 0) + .90*r5 + .55*max(r12-r30, 0) + .035*min(_gap(recent, group),12) - .25*max(streak-2,0))
        normalizer = sum(group_probs.values()); group_probs = {key: value/normalizer for key, value in group_probs.items()}
    general = {key: 1.0 for key in candidates}
    for name, group in SUBSTAT_GROUPS.items():
        for key in group:
            if key in general: general[key] *= .70 + 1.80 * group_probs[name]
    general = _normal(general, candidates)
    # Preserve the exact critical-cycle weighting from the replay implementation.
    if not any(key in candidates for key in CRIT_SUBSTATS):
        crit = _uniform(candidates)
        return _normal({key:.75*crit[key]+.25*general[key] for key in candidates},candidates)
    if len(recent) < 8:
        raw_states = {"double": .25, "single_rate": .25, "single_damage": .25, "cooldown": .25}
        multipliers={"double":(1.3,1.3),"single_rate":(1.45,.92),"single_damage":(.92,1.45),"cooldown":(.72,.72)}
        crit={key:0 for key in candidates}
        for state, probability in raw_states.items():
            state_distribution = _normal({key: multipliers[state][0] if key == "crit_rate" else multipliers[state][1] if key == "crit_damage" else 1 for key in candidates}, candidates)
            for key in candidates: crit[key] += probability * state_distribution[key]
        return _normal({key:.75*crit[key]+.25*general[key] for key in candidates},candidates)
    r5r, r5d = _rate(recent,"crit_rate",5), _rate(recent,"crit_damage",5)
    r12 = _group_rate(recent, CRIT_SUBSTATS, 12); r30 = _group_rate(recent, CRIT_SUBSTATS, 30)
    global_crit = sum(counts.get(key,0) for key in CRIT_SUBSTATS)/total
    pair_density = sum({left,right} == set(CRIT_SUBSTATS) for left,right in zip(recent[-12:], recent[-11:])) / max(len(recent[-12:])-1,1)
    rate_gap, damage_gap, any_gap = _gap(recent,{"crit_rate"}), _gap(recent,{"crit_damage"}), _gap(recent,set(CRIT_SUBSTATS))
    crit_streak=0
    for value in reversed(recent):
        if value not in CRIT_SUBSTATS: break
        crit_streak += 1
    raw_states={"double":.35+1.4*max(r12-global_crit,0)+1.2*min(r5r,r5d)+1.2*pair_density+.04*min(rate_gap,12)+.04*min(damage_gap,12), "single_rate":.35+1.6*max(r5r-r5d,0)+.8*max(r12-r30,0)+.03*min(damage_gap,12), "single_damage":.35+1.6*max(r5d-r5r,0)+.8*max(r12-r30,0)+.03*min(rate_gap,12), "cooldown":.35+.75*max(r12-global_crit,0)+.9*max(r5r+r5d-.45,0)+.35*max(crit_streak-1,0)-.04*min(any_gap,12)}
    state_total=sum(max(value,.01) for value in raw_states.values()); raw_states={key:max(value,.01)/state_total for key,value in raw_states.items()}
    multipliers={"double":(1.3,1.3),"single_rate":(1.45,.92),"single_damage":(.92,1.45),"cooldown":(.72,.72)}
    crit={key:0 for key in candidates}
    for state, probability in raw_states.items():
        state_distribution = _normal({
            key: multipliers[state][0] if key == "crit_rate" else multipliers[state][1] if key == "crit_damage" else 1
            for key in candidates
        }, candidates)
        for key in candidates:
            crit[key] += probability * state_distribution[key]
    return _normal({key:.75*crit[key]+.25*general[key] for key in candidates},candidates)


def distributions_from_payload(payload, candidates):
    return {"rule": _rule(payload["counts"], payload["total_rolls"], candidates), "bayes": _bayes(payload,candidates), "markov": _markov(payload["recent_sequence"],candidates), "cycle": _cycle(payload,candidates), "context": _uniform(candidates)}


def _top(distribution): return max(distribution.items(),key=lambda row:row[1])[0] if distribution else None


def dynamic_weights_from_payload(payload, base_weights=None, include_details=False):
    """Derive bounded dynamic weights without replaying historical rows.

    ``include_details`` used to be the second positional argument.  Keep that
    call form working while allowing request orchestration to supply the
    already-selected base schedule.
    """
    if isinstance(base_weights, bool) and include_details is False:
        include_details = base_weights
        base_weights = None
    base = dict(base_model_weights(payload.get("total_rolls", 0)) if base_weights is None else base_weights)
    outcomes=payload["dynamic_outcomes"]
    if len(outcomes) < DYNAMIC_WEIGHT_MIN_EVENTS: return (base, _flat(0)) if include_details else base
    hits=Counter(); evaluated=0
    for outcome in outcomes:
        actual=outcome["actual"]
        if actual not in outcome["candidates"]: continue
        for key, distribution in outcome["distributions"].items():
            if _top(distribution)==actual: hits[key]+=1
        evaluated+=1
    if evaluated < DYNAMIC_WEIGHT_MIN_EVENTS: return (base,_flat(evaluated)) if include_details else base
    rates={key:hits[key]/evaluated for key in MODEL_KEYS}; active=[key for key in MODEL_KEYS if base.get(key,0)>0]; average=sum(rates[key] for key in active)/len(active)
    adjusted=dict(base); details={}
    for key in MODEL_KEYS:
        shift=0 if base.get(key,0)<=0 else max(-MAX_SHIFT,min(MAX_SHIFT,rates[key]-average))
        if base.get(key,0)>0: adjusted[key]=max(.01,adjusted[key]+shift)
        details[key]={"hit_rate":rates[key],"evaluated":evaluated,"direction":"up" if shift>0 else "down" if shift<0 else "flat","shift":shift}
    result=normalize_weights(adjusted); return (result,details) if include_details else result


def _flat(evaluated): return {key:{"hit_rate":None,"evaluated":evaluated,"direction":"flat","shift":0.0} for key in MODEL_KEYS}


def record_online_outcomes(payload, distributions, weights, actual, candidates):
    if actual not in candidates: return
    evaluation=payload["online_evaluation"]
    if payload["total_rolls"] < MIN_BACKTEST_HISTORY: return
    final={key:sum(weights[name]*distributions[name][key] for name in MODEL_KEYS) for key in candidates}; final=_normal(final,candidates)
    evaluation["evaluated"]+=1; evaluation["loss_total"]+=log_loss(final,actual); evaluation["brier_total"]+=brier_score(final,actual)
    for k in (1,3,5): evaluation["top_hits"][str(k)]+=int(top_k_hit(final,actual,k))
    for key, distribution in distributions.items():
        model=evaluation["models"][key]; model["evaluated"]+=1; model["hits"]+=int(top_k_hit(distribution,actual,1)); model["loss_total"]+=log_loss(distribution,actual)


def apply_event(payload, event, candidates):
    """Mutate *payload* exactly once, scoring the event before observing it."""
    distributions=distributions_from_payload(payload,candidates); weights=dynamic_weights_from_payload(payload)
    actual=event["substat_type"]; record_online_outcomes(payload,distributions,weights,actual,candidates)
    payload["dynamic_outcomes"].append({"actual":actual,"candidates":candidates,"distributions":distributions})
    del payload["dynamic_outcomes"][:-DYNAMIC_WEIGHT_BACKTEST_WINDOW]
    sequence=payload["recent_sequence"]; prior=list(sequence)
    sequence.append(actual); del sequence[:-DIRECT_SEQUENCE_CAPACITY]
    counts=payload["counts"]; counts[actual]=counts.get(actual,0)+1
    set_name=event.get("set_name",""); payload["set_counts"][set_name]=payload["set_counts"].get(set_name,0)+1
    for length in (1,2,3):
        prefix=prior[-length:]
        if len(prefix)==length:
            table=payload["patterns"][str(length)].setdefault(_key(prefix), {})
            table[actual]=table.get(actual,0)+1
    payload["total_rolls"]=payload.get("total_rolls",0)+1
    return payload


def build_payload_from_events(events):
    payload=empty_payload()
    seen_by_echo = {}
    for event in events:
        echo_seen = seen_by_echo.setdefault(event["echo_id"], set())
        candidates = [key for key in SUBSTAT_TYPES if key not in echo_seen]
        apply_event(payload, event, candidates)
        echo_seen.add(event["substat_type"])
    return payload
