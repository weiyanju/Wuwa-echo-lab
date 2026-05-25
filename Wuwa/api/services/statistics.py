from collections import Counter, defaultdict

from api.constants import SAMPLE_STAGES, SUBSTAT_LABELS, SUBSTAT_TYPES


def _sample_stage(total_rolls):
    for stage in SAMPLE_STAGES:
        if stage["max"] is None or stage["min"] <= total_rolls < stage["max"]:
            return stage
    return SAMPLE_STAGES[0]


def _context_status(total_rolls):
    if total_rolls < 3000:
        return "insufficient_data"
    return "monitoring"


def build_user_statistics(user):
    rolls = []
    for echo in user.echo_records.prefetch_related("substat_rolls"):
        for roll in echo.substat_rolls.all():
            rolls.append((echo, roll))

    total_rolls = len(rolls)
    counts = Counter(roll.substat_type for _, roll in rolls)
    baseline = 1 / len(SUBSTAT_TYPES)

    substat_frequency = {}
    for substat_type in SUBSTAT_TYPES:
        count = counts[substat_type]
        observed = count / total_rolls if total_rolls else 0
        substat_frequency[substat_type] = {
            "label": SUBSTAT_LABELS[substat_type],
            "count": count,
            "observed_rate": observed,
            "baseline_rate": baseline,
            "deviation": observed - baseline if total_rolls else 0,
        }

    set_counts = defaultdict(int)
    for echo, roll in rolls:
        set_counts[echo.set_name] += 1

    context_status = _context_status(total_rolls)
    return {
        "total_rolls": total_rolls,
        "sample_stage": _sample_stage(total_rolls),
        "substat_frequency": substat_frequency,
        "context_factors": {
            "set_name": {
                "status": context_status,
                "sample_size": total_rolls,
                "groups": dict(set_counts),
                "message": "套装变量后台持续监控；证据不足时不参与预测。",
            },
            "cost": {"status": context_status, "sample_size": total_rolls},
            "main_stat": {"status": context_status, "sample_size": total_rolls},
            "position": {"status": context_status, "sample_size": total_rolls},
        },
    }
