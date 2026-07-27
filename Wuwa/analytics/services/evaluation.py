from .metrics import brier_score, log_loss, top_k_hit  # re-exported public helpers
from .model_config import MODEL_KEYS
from .prediction import _historical_roll_events  # legacy patch seam; never called on reads
from .state_store import AnalyticsStateUnavailable, state_snapshot_for_account


MIN_BACKTEST_HISTORY = 20
MIN_EVALUATED_SAMPLES = 20


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


def _online_totals(payload):
    totals = payload.get("online_evaluation")
    required = {"evaluated", "loss_total", "brier_total", "top_hits", "models"}
    if not isinstance(totals, dict) or not required.issubset(totals):
        raise AnalyticsStateUnavailable()
    if not all(str(key) in totals["top_hits"] for key in (1, 3, 5)):
        raise AnalyticsStateUnavailable()
    if not all(key in totals["models"] for key in MODEL_KEYS):
        raise AnalyticsStateUnavailable()
    return totals


def build_model_evaluation(owner, min_history=MIN_BACKTEST_HISTORY):
    # The persisted accumulator is intentionally configured with the stable
    # default history threshold.  Altering it at read time would require replay.
    if min_history != MIN_BACKTEST_HISTORY:
        raise ValueError("Incremental evaluation history is fixed at 20 events.")
    state = state_snapshot_for_account(owner)
    totals = _online_totals(state.payload)
    evaluated = totals["evaluated"]
    if not isinstance(evaluated, int) or evaluated < 0:
        raise AnalyticsStateUnavailable()
    if evaluated < MIN_EVALUATED_SAMPLES:
        result = empty_evaluation()
        result["sample_size"] = state.total_rolls
        result["evaluated_count"] = evaluated
        return result

    model_scores = {}
    for key in MODEL_KEYS:
        model = totals["models"][key]
        denominator = model.get("evaluated") if isinstance(model, dict) else None
        if not isinstance(denominator, int) or denominator <= 0:
            raise AnalyticsStateUnavailable()
        model_scores[key] = {
            "hit_rate": model["hits"] / denominator,
            "loss": model["loss_total"] / denominator,
            "evaluated": denominator,
        }

    return {
        "status": "ready",
        "sample_size": state.total_rolls,
        "evaluated_count": evaluated,
        "log_loss": totals["loss_total"] / evaluated,
        "brier_score": totals["brier_total"] / evaluated,
        "top_1_hit_rate": totals["top_hits"]["1"] / evaluated,
        "top_3_hit_rate": totals["top_hits"]["3"] / evaluated,
        "top_5_hit_rate": totals["top_hits"]["5"] / evaluated,
        "model_scores": model_scores,
        "message": "ready",
    }
