import math


def log_loss(prediction, actual):
    return -math.log(max(prediction.get(actual, 0), 1e-15))


def brier_score(prediction, actual):
    return sum((prediction.get(label, 0) - (1 if label == actual else 0)) ** 2 for label in set(prediction) | {actual})


def top_k_hit(prediction, actual, k):
    return k > 0 and actual in [label for label, _ in sorted(prediction.items(), key=lambda item: item[1], reverse=True)[:k]]
