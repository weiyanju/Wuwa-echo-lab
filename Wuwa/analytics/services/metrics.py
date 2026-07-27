import math


PROBABILITY_TIE_TOLERANCE = 1e-12


def stable_top_key(distribution, *, tolerance=PROBABILITY_TIE_TOLERANCE):
    """Return the first key within tolerance of the mathematical maximum."""
    if not distribution:
        return None
    maximum = max(distribution.values())
    return next(
        key
        for key, value in distribution.items()
        if maximum - value <= tolerance
    )


def log_loss(prediction, actual):
    return -math.log(max(prediction.get(actual, 0), 1e-15))


def brier_score(prediction, actual):
    return sum((prediction.get(label, 0) - (1 if label == actual else 0)) ** 2 for label in set(prediction) | {actual})


def top_k_hit(prediction, actual, k):
    return k > 0 and actual in [label for label, _ in sorted(prediction.items(), key=lambda item: item[1], reverse=True)[:k]]
