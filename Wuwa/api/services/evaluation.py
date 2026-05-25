import math


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
        "log_loss": None,
        "brier_score": None,
        "top_1_hit_rate": None,
        "top_3_hit_rate": None,
        "message": "样本量不足，暂不展示稳定评估指标。",
    }
