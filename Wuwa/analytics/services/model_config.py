from echoes.constants import MODEL_WEIGHT_SCHEDULE

MODEL_KEYS = ("rule", "bayes", "markov", "cycle", "context")
DYNAMIC_WEIGHT_MIN_EVENTS = 20
DYNAMIC_WEIGHT_BACKTEST_WINDOW = 120
MAX_SHIFT = 0.025
RECENT_SEQUENCE_WINDOW = 12
CYCLE_DIRECT_WINDOW = 30


def base_model_weights(total_rolls):
    for stage in MODEL_WEIGHT_SCHEDULE:
        if total_rolls >= stage["min"] and (stage["max"] is None or total_rolls < stage["max"]):
            return dict(stage["weights"])
    return dict(MODEL_WEIGHT_SCHEDULE[-1]["weights"])


def normalize_weights(weights):
    total = sum(weights.values())
    return dict(weights) if not total else {key: value / total for key, value in weights.items()}
