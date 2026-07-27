# Incremental Analytics Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the current per-`GameAccount` prediction, statistics, and evaluation semantics while replacing request-time full-history replay with persistent incremental analytics state and one-pass repair rebuilds.

**Architecture:** PostgreSQL remains the source of truth for raw rolls and gains one bounded `GameAccountAnalyticsState` row per `GameAccount`. Normal append operations synchronously advance that row; destructive, out-of-order, or context-changing mutations mark it dirty, and a one-pass rebuild restores it. Prediction, statistics, and evaluation read the ready state without rescanning account history; Redis, task queues, model-window tuning, and weight-schedule tuning remain separate follow-up work.

**Tech Stack:** Django 6, PostgreSQL, Django ORM transactions/signals/management commands, existing Python model math, Django `TestCase`/`TransactionTestCase`, Vue 3 and `node:test` for removal of the unnecessary initial evaluation request.

---

## Scope and invariants

This plan deliberately separates computation optimization from model tuning.

- Keep the current model keys, base weight schedule, dynamic shift cap, API response fields, candidate filtering, and confidence labels.
- Do not decide whether a future general-purpose recent sequence should contain 120, 300, or 500 entries. The persisted state keeps only the bounded suffix required by the current direct sequence consumers, while all-history information is represented by cumulative counters and pattern tables.
- Preserve every raw `SubstatRoll`; analytics state is derived and rebuildable.
- Keep all state and queries scoped to one authenticated user's `GameAccount`.
- Do not add Redis, Celery, RQ, a new service, a GPU dependency, table partitioning, or an HTTP API version in this phase.
- Do not use wall-clock assertions in automated tests. Assert query shape, absence of legacy scans, bounded payload size, and exact output parity instead.

### Target complexity

| Operation | Before | After |
| --- | --- | --- |
| Normal roll append | cache invalidation; next read rescans history | bounded synchronous state transition |
| Prediction GET | `O(N)` history work with a large constant | `O(K × M)`, where model and substat counts are fixed |
| Statistics GET | cached or `O(N)` scan | one state-row read |
| Evaluation GET | approximately `O(N²)` | one state-row read |
| Repair after delete/edit/model change | next request repeats expensive work | one explicit `O(N)` streaming rebuild |

### Persisted state contract

`GameAccountAnalyticsState.payload` is private backend data, not an API response. Schema version 1 contains:

```python
{
    "counts": {"crit_rate": 12},
    "set_counts": {"moonlit_clouds": 18},
    "patterns": {
        "1": {"crit_rate": {"crit_damage": 4}},
        "2": {"crit_rate|crit_damage": {"atk_percent": 2}},
        "3": {"flat_atk|crit_rate|crit_damage": {"atk_percent": 1}},
    },
    "recent_sequence": ["crit_rate", "crit_damage"],
    "dynamic_outcomes": [
        {
            "evaluated": True,
            "hits": {"rule": False, "bayes": True, "markov": False, "cycle": True, "context": False},
        }
    ],
    "evaluation": {
        "evaluated_count": 0,
        "loss_sum": 0.0,
        "brier_sum": 0.0,
        "top_hits": {"1": 0, "3": 0, "5": 0},
        "model_hits": {},
        "model_loss_sums": {},
        "model_evaluated": {},
    },
}
```

The row also stores `total_rolls`, `source_version`, `schema_version`, `model_version`, the last `(tuned_at, roll_id)` ordering key, status, error code, and timestamps. `source_version` is a monotonic mutation revision, not a roll count.

## File map

### Create

- `Wuwa/analytics/models.py` — persistent state row and lifecycle status.
- `Wuwa/analytics/migrations/0001_initial.py` — analytics state schema only; no expensive data migration.
- `Wuwa/analytics/services/model_config.py` — shared model keys, dynamic-weight limits, and sample-stage lookup without importing service orchestration.
- `Wuwa/analytics/services/metrics.py` — shared pure Log Loss, Brier, and Top-K scoring without importing evaluation orchestration.
- `Wuwa/analytics/services/incremental_state.py` — pure payload creation, one-event transition, pattern-table lookup, online metrics, and response-ready snapshot helpers.
- `Wuwa/analytics/services/state_store.py` — locking, ready-state lookup, append, dirty marking, and safe compare-and-swap rebuild persistence.
- `Wuwa/analytics/services/state_rebuild.py` — ordered streaming rebuild and rebuild result type.
- `Wuwa/analytics/management/__init__.py`
- `Wuwa/analytics/management/commands/__init__.py`
- `Wuwa/analytics/management/commands/rebuild_analytics_states.py` — explicit all/dirty/account rebuild command.
- `Wuwa/analytics/tests/__init__.py`
- `Wuwa/analytics/tests/test_incremental_state.py` — pure state-transition and model-parity tests.
- `Wuwa/analytics/tests/test_state_store.py` — persistence, locking, dirty-state, and isolation tests.
- `Wuwa/analytics/tests/test_state_rebuild.py` — one-pass rebuild, mutation-race, and command tests.
- `Wuwa/analytics/tests/test_performance_contract.py` — no-full-scan read-path and bounded-state tests.
- `docs/archive/2026-07-27-incremental-analytics-performance-implementation.md` — implementation and verification record, created only after implementation succeeds.

### Modify

- `Wuwa/analytics/services/prediction.py` — retain public serialization but source model inputs and dynamic weights from ready state.
- `Wuwa/analytics/services/statistics.py` — source counts and set counts from ready state.
- `Wuwa/analytics/services/evaluation.py` — retain metric helpers/response shape but serialize accumulated state instead of replaying history.
- `Wuwa/analytics/views.py` — translate exhausted repair races into a stable retryable 503 response.
- `Wuwa/analytics/services/roll_summary.py` — become streaming rebuild input only, then remove the process-global unbounded cache.
- `Wuwa/analytics/signals.py` — advance state on valid append; mark state dirty on delete or context changes.
- `Wuwa/echoes/services.py` — make manual roll creation transactional so roll and state advance commit together.
- `Wuwa/api/tests/test_prediction.py` — preserve prediction and weight response contracts.
- `Wuwa/api/tests/test_statistics.py` — preserve statistics shape using persisted state.
- `Wuwa/api/tests/test_evaluation.py` — preserve evaluation shape using online totals.
- `Wuwa/api/tests/test_roll_summary.py` — replace process-cache tests with state/read-path contracts.
- `Wuwa/api/tests/test_views.py` — cover API ownership and response compatibility after state-backed reads.
- `WuwaFrontend/src/features/workspace/useEchoWorkspace.js` — stop loading evaluation during general workspace initialization.
- `WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js` — assert evaluation is requested only when the evaluation page opens or a retry is requested.
- `docs/architecture.md` — register persistent analytics state under the `analytics/` owner.
- `docs/api-and-data-contracts.md` — document that derived state remains private and API response shapes remain stable.
- `docs/performance-and-background-runtime.md` — make incremental analytics and rebuild behavior a long-term rule.
- `docs/engineering-quality.md` — add state parity and bounded-read verification requirements.

---

### Task 1: Lock current behavior and performance boundaries

**Files:**
- Create: `Wuwa/analytics/tests/__init__.py`
- Create: `Wuwa/analytics/tests/test_incremental_state.py`
- Create: `Wuwa/analytics/tests/test_performance_contract.py`
- Modify: `Wuwa/api/tests/test_prediction.py`
- Modify: `Wuwa/api/tests/test_evaluation.py`

- [ ] **Step 1: Add pure model-parity fixtures before adding state code**

Create a fixture that contains multiple echoes, valid per-echo candidates, repeated 1–3 item patterns, and enough events to activate dynamic weights:

```python
from datetime import datetime, timedelta, timezone

from django.test import SimpleTestCase

from analytics.services.prediction import (
    _bayes_distribution_from_sequence,
    _cycle_window_distribution_from_sequence,
    _dynamic_weight_result_from_events,
    _markov_distribution_from_sequence,
    _model_weights,
    _rule_distribution_from_counts,
)
from echoes.constants import SUBSTAT_TYPES


def model_events(size=180):
    pattern = ("crit_rate", "crit_damage", "atk_percent", "flat_atk", "energy_regen")
    started_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return [
        {
            "id": index + 1,
            "echo_id": (index // 5) + 1,
            "substat_type": pattern[index % len(pattern)],
            "set_name": "moonlit_clouds" if index % 2 else "freezing_frost",
            "tuned_at": started_at + timedelta(seconds=index),
        }
        for index in range(size)
    ]


class IncrementalStateParityTests(SimpleTestCase):
    def test_incremental_distributions_match_sequence_implementation(self):
        from analytics.services.incremental_state import build_payload_from_events, distributions_from_payload

        events = model_events()
        sequence = [event["substat_type"] for event in events]
        counts = {key: sequence.count(key) for key in SUBSTAT_TYPES}
        candidates = ["skill_damage", "heavy_attack_damage", "flat_hp"]
        payload = build_payload_from_events(events)

        expected = {
            "rule": _rule_distribution_from_counts(counts, len(sequence), candidates),
            "bayes": _bayes_distribution_from_sequence(sequence, candidates),
            "markov": _markov_distribution_from_sequence(sequence, candidates),
            "cycle": _cycle_window_distribution_from_sequence(sequence, candidates),
        }
        actual = distributions_from_payload(payload, candidates)

        for model_key, distribution in expected.items():
            for substat_type in candidates:
                self.assertAlmostEqual(actual[model_key][substat_type], distribution[substat_type], places=12)

    def test_incremental_dynamic_weights_match_replay_implementation(self):
        from analytics.services.incremental_state import build_payload_from_events, dynamic_weights_from_payload

        events = model_events()
        expected, _ = _dynamic_weight_result_from_events(events, _model_weights(len(events)))
        payload = build_payload_from_events(events)
        actual, _ = dynamic_weights_from_payload(payload, _model_weights(len(events)))

        for model_key in expected:
            self.assertAlmostEqual(actual[model_key], expected[model_key], places=12)
```

- [ ] **Step 2: Run the parity tests and verify the new module is missing**

Run:

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test analytics.tests.test_incremental_state
```

Expected: FAIL with `ModuleNotFoundError: No module named 'analytics.services.incremental_state'`.

- [ ] **Step 3: Add a read-path contract that forbids account-history replay**

Add this test skeleton to `test_performance_contract.py`; it will fail until the state-backed path exists:

```python
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase

from analytics.services.prediction import predict_next_substat
from analytics.services.state_rebuild import rebuild_game_account_state
from echoes.models import EchoRecord, SubstatRoll


class AnalyticsReadPathContractTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="perf", password="pw")
        self.account = self.user.game_accounts.get()
        self.account.uid = "123456789"
        self.account.save(update_fields=["uid", "updated_at"])
        self.echo = EchoRecord.objects.create(
            user=self.user,
            game_account=self.account,
            echo_uid="perf-1",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
        )
        SubstatRoll.objects.create(
            echo=self.echo,
            position=1,
            substat_type="crit_rate",
            tier_value=6.3,
        )
        rebuild_game_account_state(self.account.id)

    def test_ready_prediction_does_not_load_account_roll_summary(self):
        with patch(
            "analytics.services.roll_summary._load_roll_summary",
            side_effect=AssertionError("ready reads must not scan account history"),
        ):
            result = predict_next_substat(self.echo, include_diagnostics=False)

        self.assertEqual(result["sample_size"], 1)
        self.assertTrue(result["candidates"])
```

- [ ] **Step 4: Run the new contract and record the expected failure**

Run:

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test analytics.tests.test_performance_contract
```

Expected: FAIL because `state_rebuild` does not exist.

- [ ] **Step 5: Commit the red tests**

```powershell
git add Wuwa/analytics/tests Wuwa/api/tests/test_prediction.py Wuwa/api/tests/test_evaluation.py
git commit -m "test(analytics): define incremental state contracts"
```

---

### Task 2: Add the persistent analytics state schema

**Files:**
- Create: `Wuwa/analytics/models.py`
- Create: `Wuwa/analytics/migrations/0001_initial.py`
- Create: `Wuwa/analytics/tests/test_state_store.py`

- [ ] **Step 1: Write model lifecycle tests**

```python
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.test import TestCase

from analytics.models import GameAccountAnalyticsState


class GameAccountAnalyticsStateModelTests(TestCase):
    def test_state_is_unique_per_game_account_and_starts_dirty(self):
        user = User.objects.create_user(username="state", password="pw")
        account = user.game_accounts.get()

        state = GameAccountAnalyticsState.objects.create(game_account=account)

        self.assertEqual(state.status, GameAccountAnalyticsState.Status.DIRTY)
        self.assertEqual(state.total_rolls, 0)
        self.assertEqual(state.source_version, 0)
        self.assertEqual(state.payload, {})
        with self.assertRaises(IntegrityError), transaction.atomic():
            GameAccountAnalyticsState.objects.create(game_account=account)
```

- [ ] **Step 2: Run the model test and verify it fails**

Run:

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test analytics.tests.test_state_store.GameAccountAnalyticsStateModelTests
```

Expected: FAIL because `analytics.models` does not exist.

- [ ] **Step 3: Add the model**

Create `Wuwa/analytics/models.py`:

```python
from django.db import models


class GameAccountAnalyticsState(models.Model):
    class Status(models.TextChoices):
        DIRTY = "dirty", "Dirty"
        BUILDING = "building", "Building"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    game_account = models.OneToOneField(
        "accounts.GameAccount",
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="analytics_state",
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DIRTY)
    schema_version = models.PositiveSmallIntegerField(default=1)
    model_version = models.CharField(max_length=40, default="incremental-v1")
    source_version = models.PositiveBigIntegerField(default=0)
    total_rolls = models.PositiveBigIntegerField(default=0)
    last_tuned_at = models.DateTimeField(null=True, blank=True)
    last_roll_id = models.BigIntegerField(null=True, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    error_code = models.CharField(max_length=80, blank=True)
    built_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "analytics_game_account_state"
        indexes = [models.Index(fields=["status", "updated_at"])]
```

- [ ] **Step 4: Generate and inspect the migration**

Run:

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py makemigrations analytics
.\.venv\Scripts\python.exe manage.py sqlmigrate analytics 0001
```

Expected: one `analytics_game_account_state` table, a one-to-one foreign key to `accounts_gameaccount`, and a `(status, updated_at)` index. The migration must not read `SubstatRoll` or backfill payloads.

- [ ] **Step 5: Run model and migration checks**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test analytics.tests.test_state_store.GameAccountAnalyticsStateModelTests
.\.venv\Scripts\python.exe manage.py makemigrations --check
```

Expected: PASS and `No changes detected`.

- [ ] **Step 6: Commit the schema**

```powershell
git add Wuwa/analytics/models.py Wuwa/analytics/migrations/0001_initial.py Wuwa/analytics/tests/test_state_store.py
git commit -m "feat(analytics): add per-account analytics state"
```

---

### Task 3: Implement shared model configuration and the pure one-event accumulator

**Files:**
- Create: `Wuwa/analytics/services/model_config.py`
- Create: `Wuwa/analytics/services/metrics.py`
- Create: `Wuwa/analytics/services/incremental_state.py`
- Modify: `Wuwa/analytics/tests/test_incremental_state.py`

- [ ] **Step 1: Add transition, boundedness, and evaluation tests**

Add tests proving that an event updates counts/patterns only once, the direct sequence suffix is bounded by the current model requirement rather than lifetime history, dynamic outcomes retain exactly the configured 120 raw event slots, and evaluation starts only after the existing minimum history:

```python
from analytics.services.incremental_state import (
    DIRECT_SEQUENCE_CAPACITY,
    apply_event,
    empty_payload,
)
from analytics.services.prediction import DYNAMIC_WEIGHT_BACKTEST_WINDOW


class IncrementalStateTransitionTests(SimpleTestCase):
    def test_apply_event_updates_all_time_and_pattern_counts(self):
        payload = empty_payload()
        events = model_events(5)
        for event in events:
            payload = apply_event(payload, event, candidates=list(SUBSTAT_TYPES))

        self.assertEqual(sum(payload["counts"].values()), 5)
        self.assertEqual(payload["patterns"]["1"]["crit_rate"]["crit_damage"], 1)
        self.assertEqual(
            payload["patterns"]["2"]["crit_rate|crit_damage"]["atk_percent"],
            1,
        )

    def test_state_payload_is_bounded_after_large_history(self):
        payload = build_payload_from_events(model_events(10_000))

        self.assertLessEqual(len(payload["recent_sequence"]), DIRECT_SEQUENCE_CAPACITY)
        self.assertEqual(len(payload["dynamic_outcomes"]), DYNAMIC_WEIGHT_BACKTEST_WINDOW)
        self.assertEqual(sum(payload["counts"].values()), 10_000)

    def test_online_evaluation_uses_only_prior_state(self):
        payload = empty_payload()
        events = model_events(50)
        for event in events:
            payload = apply_event(payload, event, candidates=list(SUBSTAT_TYPES))

        evaluation = payload["evaluation"]
        self.assertGreaterEqual(evaluation["evaluated_count"], 20)
        self.assertGreater(evaluation["loss_sum"], 0)
        self.assertGreaterEqual(evaluation["top_hits"]["3"], evaluation["top_hits"]["1"])
```

- [ ] **Step 2: Run the transition tests and verify they fail**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test analytics.tests.test_incremental_state.IncrementalStateTransitionTests
```

Expected: FAIL because the exported accumulator functions do not exist.

- [ ] **Step 3: Create orchestration-free shared model configuration**

Create `model_config.py` so incremental state never imports `prediction.py` and the later prediction read path cannot form a circular import:

```python
from echoes.constants import MODEL_WEIGHT_SCHEDULE


MODEL_KEYS = ("rule", "bayes", "markov", "cycle", "context")
DYNAMIC_WEIGHT_MIN_EVENTS = 20
DYNAMIC_WEIGHT_BACKTEST_WINDOW = 120
DYNAMIC_WEIGHT_MAX_SHIFT = 0.025
RECENT_SEQUENCE_WINDOW = 12
CYCLE_DIRECT_WINDOW = 30


def base_model_weights(total_rolls):
    for stage in MODEL_WEIGHT_SCHEDULE:
        if total_rolls >= stage["min"] and (stage["max"] is None or total_rolls < stage["max"]):
            return dict(stage["weights"])
    return dict(MODEL_WEIGHT_SCHEDULE[-1]["weights"])


def normalize_weights(weights):
    total = sum(weights.values())
    if not total:
        return dict(weights)
    return {key: value / total for key, value in weights.items()}
```

In the later prediction task, keep `_model_weights` as a compatibility wrapper around `base_model_weights` so existing private-helper tests and imports do not change in the performance refactor.

Create `metrics.py` by moving the current formulas without changing their behavior:

```python
import math


def log_loss(prediction, actual):
    probability = max(prediction.get(actual, 0), 1e-15)
    return -math.log(probability)


def brier_score(prediction, actual):
    return sum(
        (prediction.get(label, 0) - (1 if label == actual else 0)) ** 2
        for label in set(prediction) | {actual}
    )


def top_k_hit(prediction, actual, k):
    if k <= 0:
        return False
    ranked = sorted(prediction.items(), key=lambda item: item[1], reverse=True)
    return actual in [label for label, _ in ranked[:k]]
```

`evaluation.py` must import and re-export these names so existing `analytics.services.evaluation` imports remain compatible.

- [ ] **Step 4: Implement the state schema and pattern updates**

Implement these stable public functions in `incremental_state.py`:

```python
from collections import Counter

from echoes.constants import SUBSTAT_TYPES

from .model_config import (
    CYCLE_DIRECT_WINDOW,
    DYNAMIC_WEIGHT_BACKTEST_WINDOW,
    MODEL_KEYS,
    RECENT_SEQUENCE_WINDOW,
    base_model_weights,
)


CURRENT_SCHEMA_VERSION = 1
CURRENT_MODEL_VERSION = "incremental-v1"
DIRECT_SEQUENCE_CAPACITY = max(RECENT_SEQUENCE_WINDOW, CYCLE_DIRECT_WINDOW, 3)


def empty_evaluation_totals():
    return {
        "evaluated_count": 0,
        "loss_sum": 0.0,
        "brier_sum": 0.0,
        "top_hits": {"1": 0, "3": 0, "5": 0},
        "model_hits": {key: 0 for key in MODEL_KEYS},
        "model_loss_sums": {key: 0.0 for key in MODEL_KEYS},
        "model_evaluated": {key: 0 for key in MODEL_KEYS},
    }


def empty_payload():
    return {
        "counts": {key: 0 for key in SUBSTAT_TYPES},
        "set_counts": {},
        "patterns": {"1": {}, "2": {}, "3": {}},
        "recent_sequence": [],
        "dynamic_outcomes": [],
        "evaluation": empty_evaluation_totals(),
    }


def _increment_nested(counter, context, actual):
    targets = counter.setdefault(context, {})
    targets[actual] = targets.get(actual, 0) + 1


def _record_patterns(payload, actual):
    sequence = payload["recent_sequence"]
    for size in (1, 2, 3):
        if len(sequence) < size:
            continue
        context = "|".join(sequence[-size:])
        _increment_nested(payload["patterns"][str(size)], context, actual)


def _append_bounded(items, value, capacity):
    next_items = [*items, value]
    return next_items[-capacity:]


def apply_event(payload, event, candidates):
    actual = event["substat_type"]
    distributions = distributions_from_payload(payload, candidates)
    weights, _ = dynamic_weights_from_payload(
        payload,
        base_model_weights(sum(payload["counts"].values())),
    )
    record_online_outcomes(payload, distributions, weights, actual, candidates)
    _record_patterns(payload, actual)
    payload["counts"][actual] = payload["counts"].get(actual, 0) + 1
    set_name = event.get("set_name", "")
    payload["set_counts"][set_name] = payload["set_counts"].get(set_name, 0) + 1
    payload["recent_sequence"] = _append_bounded(
        payload["recent_sequence"], actual, DIRECT_SEQUENCE_CAPACITY
    )
    return payload


def build_payload_from_events(events):
    payload = empty_payload()
    seen_by_echo = {}
    for event in events:
        seen = seen_by_echo.setdefault(event["echo_id"], set())
        candidates = [key for key in SUBSTAT_TYPES if key not in seen]
        payload = apply_event(payload, event, candidates)
        seen.add(event["substat_type"])
    return payload
```

Implement `distributions_from_payload`, `dynamic_weights_from_payload`, and `record_online_outcomes` by applying this exact mapping:

| Incremental model | Persisted input | Existing behavior to preserve |
| --- | --- | --- |
| rule | `counts`, `total_rolls` | `_rule_distribution_from_counts` |
| bayes exact | `patterns["1".."3"]`, last 3 sequence items | alpha and prefix weights from `_bayes_exact_distribution_from_sequence` |
| bayes wildcard | two-item pattern table, last 2 sequence items | sum matching anchor entries whose stored middle differs from the current middle |
| markov | last 12 sequence items | `_markov_distribution_from_sequence` |
| cycle | last 30 sequence items plus all-time counts | preserve 5/12/30 recent rates and replace full-sequence global rates with `counts / total_rolls` |
| context | no persisted feature in this phase | current uniform candidate distribution |
| dynamic weights | last 120 raw-event outcome records | current hit-rate comparison, `±0.025` clamp, and normalization |

Do not call `_historical_roll_events`, `build_roll_summary`, or any ORM method from this module. Add one parity assertion for every row in this table before moving to the next model.

- [ ] **Step 5: Make dynamic outcomes equivalent to the current last-120 replay**

Each raw event appends one record, including events that are not valid evaluation candidates:

```python
def _record_dynamic_outcome(payload, distributions, actual, candidates):
    evaluated = actual in candidates
    outcome = {
        "evaluated": evaluated,
        "hits": {
            key: bool(evaluated and max(distribution, key=distribution.get) == actual)
            if distribution else False
            for key, distribution in distributions.items()
        },
    }
    payload["dynamic_outcomes"] = _append_bounded(
        payload["dynamic_outcomes"],
        outcome,
        DYNAMIC_WEIGHT_BACKTEST_WINDOW,
    )
```

`dynamic_weights_from_payload` must preserve the current rules: fewer than 20 evaluated outcomes returns base weights, inactive zero-weight models do not shift, each active shift is clamped to `±0.025`, and the result is normalized.

- [ ] **Step 6: Make online evaluation equivalent to time-ordered backtesting**

Score the actual event before adding it to counts/patterns/recent sequence. Start fused evaluation only when the prior sample count is at least `MIN_BACKTEST_HISTORY`; require `MIN_EVALUATED_SAMPLES` only when serializing readiness. Keep per-model loss totals and evaluated counts so `build_model_evaluation` can reproduce its current response without replay.

- [ ] **Step 7: Run pure tests**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test analytics.tests.test_incremental_state
```

Expected: PASS, including distribution and dynamic-weight parity to 12 decimal places.

- [ ] **Step 8: Commit the accumulator**

```powershell
git add Wuwa/analytics/services/model_config.py Wuwa/analytics/services/metrics.py Wuwa/analytics/services/incremental_state.py Wuwa/analytics/tests/test_incremental_state.py
git commit -m "feat(analytics): add one-pass incremental accumulator"
```

---

### Task 4: Add safe persistence, streaming rebuild, and repair command

**Files:**
- Create: `Wuwa/analytics/services/state_store.py`
- Create: `Wuwa/analytics/services/state_rebuild.py`
- Create: `Wuwa/analytics/management/__init__.py`
- Create: `Wuwa/analytics/management/commands/__init__.py`
- Create: `Wuwa/analytics/management/commands/rebuild_analytics_states.py`
- Create: `Wuwa/analytics/tests/test_state_rebuild.py`
- Modify: `Wuwa/analytics/tests/test_state_store.py`

- [ ] **Step 1: Add ready-state and stale-build tests**

```python
from django.contrib.auth.models import User
from django.test import TestCase

from analytics.models import GameAccountAnalyticsState
from analytics.services.state_rebuild import rebuild_game_account_state
from analytics.services.state_store import mark_game_account_state_dirty, ready_state_for_account


class AnalyticsStateStoreTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="store", password="pw")
        self.account = self.user.game_accounts.get()

    def test_ready_state_is_scoped_to_exact_game_account(self):
        result = rebuild_game_account_state(self.account.id)
        self.assertTrue(result.saved)
        self.assertEqual(ready_state_for_account(self.account).pk, result.state.pk)

        other = User.objects.create_user(username="other-store", password="pw")
        with self.assertRaises(GameAccountAnalyticsState.DoesNotExist):
            ready_state_for_account(other.game_accounts.get())

    def test_dirty_mark_increments_mutation_revision(self):
        state = rebuild_game_account_state(self.account.id).state
        original_version = state.source_version

        mark_game_account_state_dirty(self.account.id, error_code="roll_deleted")

        state.refresh_from_db()
        self.assertEqual(state.status, GameAccountAnalyticsState.Status.DIRTY)
        self.assertEqual(state.source_version, original_version + 1)
        self.assertEqual(state.error_code, "roll_deleted")
```

- [ ] **Step 2: Run store tests and verify they fail**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test analytics.tests.test_state_store analytics.tests.test_state_rebuild
```

Expected: FAIL because store and rebuild services do not exist.

- [ ] **Step 3: Implement state locking and lifecycle helpers**

`state_store.py` must expose:

```python
from django.db import transaction
from django.db.models import F

from accounts.models import GameAccount
from analytics.models import GameAccountAnalyticsState


def _locked_state_for_account_id(game_account_id):
    account = GameAccount.objects.select_for_update().get(pk=game_account_id)
    state, _ = GameAccountAnalyticsState.objects.get_or_create(game_account=account)
    return state


def ready_state_for_account(game_account):
    return GameAccountAnalyticsState.objects.get(
        game_account=game_account,
        status=GameAccountAnalyticsState.Status.READY,
    )


@transaction.atomic
def mark_game_account_state_dirty(game_account_id, *, error_code):
    state = _locked_state_for_account_id(game_account_id)
    state.status = GameAccountAnalyticsState.Status.DIRTY
    state.source_version = F("source_version") + 1
    state.error_code = error_code
    state.save(update_fields=["status", "source_version", "error_code", "updated_at"])
```

After saving an `F()` expression, refresh the row before returning it. Keep `error_code` diagnostic-only and free of user content.

- [ ] **Step 4: Implement a one-pass ordered event iterator**

`state_rebuild.py` must stream only required columns:

```python
def ordered_roll_events(game_account_id, *, chunk_size=2000):
    return (
        SubstatRoll.objects
        .filter(echo__game_account_id=game_account_id)
        .order_by("tuned_at", "id")
        .values("id", "echo_id", "substat_type", "tuned_at", "echo__set_name")
        .iterator(chunk_size=chunk_size)
    )
```

Convert `echo__set_name` to `set_name` at the iterator boundary. Maintain an in-memory `seen_by_echo` set only for the duration of rebuilding so candidates match the original per-echo legality rules.

- [ ] **Step 5: Implement compare-and-swap rebuild persistence**

`rebuild_game_account_state(game_account_id)` must:

1. Lock/create the state, capture `source_version`, set `building`, and release the transaction.
2. Stream the account's events once and build a local payload.
3. Lock the state again.
4. Save the rebuilt payload as `ready` only if `source_version` still equals the captured version.
5. If a mutation occurred, leave the state `dirty` and return a result with `saved=False`.
6. On a controlled failure, set `failed` with a stable diagnostic code and re-raise.

On a successful compare-and-swap, assign every derived field together: `payload`, `total_rolls`, `last_tuned_at`, `last_roll_id`, `schema_version`, `model_version`, `status=ready`, `error_code=""`, and `built_at=timezone.now()`. Do not change `source_version` during a read-only rebuild. On failure, write `failed` only when the captured version is still current; if a concurrent mutation already incremented it, preserve `dirty` so a later repair is not suppressed.

Use a result type with an explicit contract:

```python
@dataclass(frozen=True)
class RebuildResult:
    state: GameAccountAnalyticsState
    saved: bool
    processed_rolls: int
```

- [ ] **Step 6: Add the management command**

Support exactly one of `--all`, `--dirty`, or `--game-account-id`. Default to `--dirty` when none is provided. Print one summary line with attempted, saved, stale, and failed counts. The command must never print UID, username, raw OCR text, or roll contents.

Run:

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py rebuild_analytics_states --all
```

Expected on an empty test/development database: command exits 0 and prints numeric summary counts.

- [ ] **Step 7: Run store/rebuild tests**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test analytics.tests.test_state_store analytics.tests.test_state_rebuild
```

Expected: PASS.

- [ ] **Step 8: Commit persistence and repair**

```powershell
git add Wuwa/analytics/services/state_store.py Wuwa/analytics/services/state_rebuild.py Wuwa/analytics/management Wuwa/analytics/tests/test_state_store.py Wuwa/analytics/tests/test_state_rebuild.py
git commit -m "feat(analytics): persist and rebuild account state"
```

---

### Task 5: Advance state on append and mark unsafe mutations dirty

**Files:**
- Modify: `Wuwa/analytics/signals.py`
- Modify: `Wuwa/analytics/services/state_store.py`
- Modify: `Wuwa/echoes/services.py`
- Modify: `Wuwa/analytics/tests/test_state_store.py`
- Modify: `Wuwa/api/tests/test_views.py`

- [ ] **Step 1: Add append, delete, context, and isolation tests**

Cover these exact cases:

```python
def test_new_roll_advances_ready_state_without_rebuild(self):
    state = rebuild_game_account_state(self.account.id).state
    roll = SubstatRoll.objects.create(
        echo=self.echo,
        position=1,
        substat_type="crit_rate",
        tier_value=6.3,
    )
    state.refresh_from_db()
    self.assertEqual(state.status, GameAccountAnalyticsState.Status.READY)
    self.assertEqual(state.total_rolls, 1)
    self.assertEqual(state.payload["counts"]["crit_rate"], 1)
    self.assertEqual(state.last_roll_id, roll.id)


def test_delete_marks_only_owning_account_dirty(self):
    roll = self._create_roll(self.echo, "crit_rate")
    rebuild_game_account_state(self.account.id)
    other_state = rebuild_game_account_state(self.other_account.id).state

    roll.delete()

    self.account.analytics_state.refresh_from_db()
    other_state.refresh_from_db()
    self.assertEqual(self.account.analytics_state.status, GameAccountAnalyticsState.Status.DIRTY)
    self.assertEqual(other_state.status, GameAccountAnalyticsState.Status.READY)


def test_set_name_change_marks_state_dirty_but_image_change_does_not(self):
    rebuild_game_account_state(self.account.id)
    update_echo(self.echo, {"echo_image": "/echo-images/preview.png"})
    self.account.analytics_state.refresh_from_db()
    self.assertEqual(self.account.analytics_state.status, GameAccountAnalyticsState.Status.READY)

    update_echo(self.echo, {"set_name": "Changed Set"})
    self.account.analytics_state.refresh_from_db()
    self.assertEqual(self.account.analytics_state.status, GameAccountAnalyticsState.Status.DIRTY)
```

Also add API tests proving manual undo, echo deletion, and recognition snapshot revert mark only the affected state dirty.

- [ ] **Step 2: Run mutation tests and verify they fail**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test analytics.tests.test_state_store api.tests.test_views
```

Expected: new state lifecycle assertions FAIL.

- [ ] **Step 3: Implement safe append**

Add `advance_state_for_roll(roll)` to `state_store.py`. Under the `GameAccount` row lock:

- If no state exists and the account has no earlier roll, create an empty ready state and apply the event.
- If state is ready/current and `(roll.tuned_at, roll.id)` is strictly later than the stored ordering key, derive candidates from the same echo's earlier rolls, apply one event, increment `source_version`, and save.
- If the state is missing for an account with earlier data, already dirty/failed/building, has another model/schema version, or receives an out-of-order event, mark it dirty without pretending to advance.
- Never rebuild history inside a model signal.

The saved fields must be explicit:

```python
state.payload = apply_event(state.payload, event, candidates)
state.total_rolls += 1
state.last_tuned_at = roll.tuned_at
state.last_roll_id = roll.id
state.source_version += 1
state.status = GameAccountAnalyticsState.Status.READY
state.error_code = ""
state.save(update_fields=[
    "payload",
    "total_rolls",
    "last_tuned_at",
    "last_roll_id",
    "source_version",
    "status",
    "error_code",
    "updated_at",
])
```

- [ ] **Step 4: Replace cache invalidation signals with state lifecycle signals**

```python
@receiver(post_save, sender=SubstatRoll)
def advance_analytics_after_roll_save(sender, instance, created, **kwargs):
    if created:
        advance_state_for_roll(instance)
    else:
        mark_game_account_state_dirty(instance.echo.game_account_id, error_code="roll_updated")


@receiver(pre_delete, sender=SubstatRoll)
def remember_analytics_owner_before_roll_delete(sender, instance, **kwargs):
    instance._analytics_game_account_id = instance.echo.game_account_id


@receiver(post_delete, sender=SubstatRoll)
def dirty_analytics_after_roll_delete(sender, instance, **kwargs):
    mark_game_account_state_dirty(instance._analytics_game_account_id, error_code="roll_deleted")
```

Import `pre_delete` explicitly. Capturing the owner before deletion avoids dereferencing an already-cascaded `EchoRecord` during echo deletion or recognition revert. Keep the existing context-field allowlist for `EchoRecord`, but call `mark_game_account_state_dirty` instead of process-cache invalidation.

- [ ] **Step 5: Make the manual append transaction atomic**

Add `@transaction.atomic` to `create_substat_roll` so the roll, echo status, and state transition commit or roll back together. Do not move analytics rules into `echoes/services.py`.

- [ ] **Step 6: Run mutation and recognition tests**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test analytics.tests.test_state_store api.tests.test_views
```

Expected: PASS for manual create/undo/delete and recognition submit/revert ownership paths.

- [ ] **Step 7: Commit mutation integration**

```powershell
git add Wuwa/analytics/signals.py Wuwa/analytics/services/state_store.py Wuwa/echoes/services.py Wuwa/analytics/tests/test_state_store.py Wuwa/api/tests/test_views.py
git commit -m "feat(analytics): update account state on roll mutations"
```

---

### Task 6: Switch statistics to persisted state

**Files:**
- Modify: `Wuwa/analytics/services/statistics.py`
- Modify: `Wuwa/api/tests/test_statistics.py`
- Modify: `Wuwa/api/tests/test_roll_summary.py`

- [ ] **Step 1: Add state-backed statistics tests**

Add a test that rebuilds state, patches `build_roll_summary` to raise, and asserts the existing response shape and values remain unchanged:

```python
with patch(
    "analytics.services.statistics.build_roll_summary",
    side_effect=AssertionError("statistics must use ready analytics state"),
):
    result = build_user_statistics(self.account)

self.assertEqual(result["total_rolls"], 3)
self.assertEqual(result["substat_frequency"]["crit_rate"]["count"], 1)
self.assertEqual(result["context_factors"]["set_name"]["groups"], {"moonlit_clouds": 3})
```

- [ ] **Step 2: Run the statistics tests and verify the new assertion fails**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test api.tests.test_statistics api.tests.test_roll_summary
```

Expected: FAIL because statistics still calls `build_roll_summary`.

- [ ] **Step 3: Add a ready-or-rebuild accessor**

Expose `state_snapshot_for_account(game_account)` from `state_store.py`. It returns a ready, current-version state; if missing or dirty, it performs one synchronous repair rebuild and returns the saved state. If a concurrent mutation makes the rebuild stale, retry once; if the second attempt is stale, raise a stable `AnalyticsStateUnavailable` exception rather than returning inconsistent data.

Preserve the current internal service compatibility used by tests: if the argument is a `GameAccount`, use it directly; if it is an authenticated `User`, resolve that user's default `GameAccount` through `accounts.ownership.default_game_account`. Never infer an account from an unowned numeric ID.

- [ ] **Step 4: Replace roll-summary input in statistics**

Use:

```python
state = state_snapshot_for_account(owner)
total_rolls = state.total_rolls
counts = Counter(state.payload["counts"])
set_counts = dict(state.payload["set_counts"])
```

Keep `_sample_stage`, `_context_status`, labels, baselines, and response fields unchanged.

- [ ] **Step 5: Run statistics tests**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test api.tests.test_statistics api.tests.test_roll_summary
```

Expected: PASS with no account-history scan after state is ready.

- [ ] **Step 6: Commit state-backed statistics**

```powershell
git add Wuwa/analytics/services/statistics.py Wuwa/analytics/services/state_store.py Wuwa/api/tests/test_statistics.py Wuwa/api/tests/test_roll_summary.py
git commit -m "perf(analytics): serve statistics from account state"
```

---

### Task 7: Switch prediction and dynamic weights to persisted state

**Files:**
- Modify: `Wuwa/analytics/services/prediction.py`
- Modify: `Wuwa/api/tests/test_prediction.py`
- Modify: `Wuwa/analytics/tests/test_performance_contract.py`

- [ ] **Step 1: Add ready-state prediction parity tests at every weight boundary**

For event counts `0`, `20`, `499`, `500`, `2999`, and `3000`, compare state-derived base/final weights and candidate distributions against the existing sequence implementation. Generate events in memory for parity and persist only the smaller integration fixtures.

```python
for size in (0, 20, 499, 500, 2999, 3000):
    with self.subTest(size=size):
        events = model_events(size)
        payload = build_payload_from_events(events)
        expected, _ = _dynamic_weight_result_from_events(events, _model_weights(size))
        actual, _ = dynamic_weights_from_payload(payload, _model_weights(size))
        for key in expected:
            self.assertAlmostEqual(actual[key], expected[key], places=12)
```

- [ ] **Step 2: Run prediction/parity tests before changing orchestration**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test analytics.tests.test_incremental_state api.tests.test_prediction
```

Expected: existing tests PASS; any new ready-read test FAILS because `predict_next_substat` still builds a roll summary.

- [ ] **Step 3: Change prediction orchestration only**

Import `MODEL_KEYS`, dynamic-weight constants, and `base_model_weights` from `model_config.py`. Remove their duplicate definitions from `prediction.py`, but retain this compatibility wrapper because existing tests import it:

```python
def _model_weights(total_rolls):
    return base_model_weights(total_rolls)
```

`predict_next_substat` must:

```python
def predict_next_substat(echo, include_diagnostics=True):
    candidates = _legal_candidates(echo)
    state = state_snapshot_for_account(echo.game_account)
    payload = state.payload
    total_rolls = state.total_rolls
    base_weights = _model_weights(total_rolls)
    weights, weight_adjustments = dynamic_weights_from_payload(payload, base_weights)
    distributions = distributions_from_payload(payload, candidates)
    distributions["context"] = _context_distribution_for_candidates(candidates)
    final = _weighted_distribution(distributions, weights)
    # Preserve the existing response construction and optional diagnostics.
```

Diagnostics must use bounded sequence/counter inputs from payload and must not trigger a raw account-history query. Keep the current echo-only query used to remove already rolled substats.

- [ ] **Step 4: Run prediction and performance-contract tests**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test analytics.tests.test_incremental_state analytics.tests.test_performance_contract api.tests.test_prediction api.tests.test_views
```

Expected: PASS; the patched legacy summary loader is never called for a ready-state prediction.

- [ ] **Step 5: Commit state-backed prediction**

```powershell
git add Wuwa/analytics/services/prediction.py Wuwa/analytics/tests/test_incremental_state.py Wuwa/analytics/tests/test_performance_contract.py Wuwa/api/tests/test_prediction.py
git commit -m "perf(analytics): serve prediction from incremental state"
```

---

### Task 8: Switch model evaluation to online totals

**Files:**
- Modify: `Wuwa/analytics/services/evaluation.py`
- Modify: `Wuwa/analytics/views.py`
- Modify: `Wuwa/api/tests/test_evaluation.py`
- Modify: `Wuwa/api/tests/test_views.py`
- Modify: `Wuwa/analytics/tests/test_performance_contract.py`

- [ ] **Step 1: Add evaluation response-parity and no-replay tests**

```python
def test_ready_evaluation_does_not_replay_history(self):
    rebuild_game_account_state(self.account.id)
    with patch(
        "analytics.services.evaluation._historical_roll_events",
        side_effect=AssertionError("evaluation GET must not replay history"),
    ):
        result = build_model_evaluation(self.account)

    self.assertEqual(
        result["sample_size"],
        SubstatRoll.objects.filter(echo__game_account=self.account).count(),
    )
    self.assertIn(result["status"], {"insufficient_data", "ready"})
```

Keep existing assertions for `None` metrics below readiness, top-hit ordering, model keys, and score ranges.

- [ ] **Step 2: Run evaluation tests and verify the no-replay test fails**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test api.tests.test_evaluation analytics.tests.test_performance_contract
```

Expected: FAIL because `build_model_evaluation` still calls `_historical_roll_events`.

- [ ] **Step 3: Serialize accumulated totals**

Import `log_loss`, `brier_score`, and `top_k_hit` from `metrics.py` at module scope so the existing public import path remains valid, then replace request-time replay with:

```python
def build_model_evaluation(owner, min_history=MIN_BACKTEST_HISTORY):
    state = state_snapshot_for_account(owner)
    totals = state.payload["evaluation"]
    evaluated = totals["evaluated_count"]
    if evaluated < MIN_EVALUATED_SAMPLES:
        result = empty_evaluation()
        result["sample_size"] = state.total_rolls
        result["evaluated_count"] = evaluated
        return result

    return {
        "status": "ready",
        "sample_size": state.total_rolls,
        "evaluated_count": evaluated,
        "log_loss": totals["loss_sum"] / evaluated,
        "brier_score": totals["brier_sum"] / evaluated,
        "top_1_hit_rate": totals["top_hits"]["1"] / evaluated,
        "top_3_hit_rate": totals["top_hits"]["3"] / evaluated,
        "top_5_hit_rate": totals["top_hits"]["5"] / evaluated,
        "model_scores": {
            key: {
                "hit_rate": totals["model_hits"][key] / totals["model_evaluated"][key],
                "loss": totals["model_loss_sums"][key] / totals["model_evaluated"][key],
                "evaluated": totals["model_evaluated"][key],
            }
            for key in MODEL_KEYS
        },
        "message": "ready",
    }
```

Guard every model denominator even though valid state should keep them aligned; malformed state must raise `AnalyticsStateUnavailable` and trigger repair rather than divide by zero or return partial metrics.

- [ ] **Step 4: Run evaluation tests and the synthetic regression benchmark**

Before running the suite, add one view test for each analytics endpoint by patching its imported service to raise `AnalyticsStateUnavailable`. Catch that exception in `analytics/views.py` and return:

```python
return error_response(
    "Analytics state is refreshing. Retry shortly.",
    status=503,
    code="analytics_state_unavailable",
)
```

Do not expose state payloads, revisions, exception text, usernames, or UID values in the response.

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test api.tests.test_evaluation analytics.tests.test_performance_contract
```

Expected: PASS. A ready evaluation request must perform no loop over historical events and no query returning all account rolls.

- [ ] **Step 5: Commit online evaluation reads**

```powershell
git add Wuwa/analytics/services/evaluation.py Wuwa/analytics/views.py Wuwa/api/tests/test_evaluation.py Wuwa/api/tests/test_views.py Wuwa/analytics/tests/test_performance_contract.py
git commit -m "perf(analytics): read evaluation from online totals"
```

---

### Task 9: Remove the process-global history cache and unnecessary initial request

**Files:**
- Modify: `Wuwa/analytics/services/roll_summary.py`
- Modify: `Wuwa/analytics/signals.py`
- Modify: `Wuwa/api/tests/test_roll_summary.py`
- Modify: `WuwaFrontend/src/features/workspace/useEchoWorkspace.js`
- Modify: `WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js`

- [ ] **Step 1: Replace cache tests with rebuild-only iterator tests**

Delete assertions tied to `_summary_cache`, `clear_roll_summary_cache`, and cross-request in-memory reuse. Add a test asserting rebuild iteration is scoped to one account and ordered by `(tuned_at, id)`.

- [ ] **Step 2: Add a frontend test that workspace initialization skips evaluation**

Use the existing fetch harness and assert:

```javascript
assert.equal(requestOrder.filter((item) => item === 'model-evaluation').length, 0)
assert.equal(requestOrder.filter((item) => item === 'stats').length, 1)
assert.equal(requestOrder.filter((item) => item === 'prediction').length, 1)
```

Keep `useDashboardNavigation` coverage proving that opening the evaluation page still calls `refreshEvaluation()`.

- [ ] **Step 3: Run backend and frontend red tests**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test api.tests.test_roll_summary
cd ..\WuwaFrontend
..\.tools\node\npm.cmd test -- --test-name-pattern="workspace refresh|dashboard navigation"
```

Expected: backend fails while cache APIs remain expected; frontend fails because `refresh()` still awaits evaluation.

- [ ] **Step 4: Reduce `roll_summary.py` to an uncached rebuild helper**

Remove `_summary_cache`, `_summary_cache_lock`, cache-key helpers, invalidation functions, and their signal imports. Keep only an explicitly named streaming/event helper if `state_rebuild.py` still shares it; otherwise delete `roll_summary.py` and update imports/tests in the same commit.

- [ ] **Step 5: Remove initial evaluation from workspace refresh**

Change the end of `refresh()` to:

```javascript
refreshActiveInBackground()
if (!isCurrent()) return
await refreshStats()
```

Do not remove evaluation-page refresh, retry behavior, request state, loading state, or API helper.

- [ ] **Step 6: Run focused backend and frontend tests**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test api.tests.test_roll_summary analytics.tests.test_performance_contract
cd ..\WuwaFrontend
..\.tools\node\npm.cmd test
```

Expected: PASS.

- [ ] **Step 7: Commit cache/request cleanup**

```powershell
git add Wuwa/analytics/services/roll_summary.py Wuwa/analytics/signals.py Wuwa/api/tests/test_roll_summary.py WuwaFrontend/src/features/workspace/useEchoWorkspace.js WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js
git commit -m "perf(analytics): remove full-history cache and eager evaluation"
```

---

### Task 10: Add rollout verification and long-term documentation

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/api-and-data-contracts.md`
- Modify: `docs/performance-and-background-runtime.md`
- Modify: `docs/engineering-quality.md`
- Create after implementation: `docs/archive/2026-07-27-incremental-analytics-performance-implementation.md`

- [ ] **Step 1: Document the architecture boundary**

Add these durable rules in the appropriate existing sections rather than creating a parallel policy document:

```text
- Raw EchoRecord/SubstatRoll rows remain the authoritative facts.
- analytics owns rebuildable per-GameAccount derived state.
- Ready prediction/statistics/evaluation reads do not replay complete account history.
- Normal append advances state incrementally; destructive or out-of-order changes mark it dirty.
- Dirty state is repaired by a one-pass account-scoped rebuild.
- Derived state and repair commands never weaken GameAccount ownership boundaries.
- Redis is optional acceleration and coordination, not a source of truth.
```

State explicitly that successful public API fields remain unchanged in this phase, exhausted repair races return the stable retryable error code `analytics_state_unavailable`, and the external recognition client does not consume the private analytics table.

- [ ] **Step 2: Apply migrations and backfill in development**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py rebuild_analytics_states --all
```

Expected: migration succeeds; every existing `GameAccount` is either ready with a matching roll count or reported as stale/failed with a numeric summary.

- [ ] **Step 3: Run focused backend verification**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test analytics.tests api.tests.test_prediction api.tests.test_evaluation api.tests.test_statistics api.tests.test_roll_summary api.tests.test_views
.\.venv\Scripts\python.exe manage.py makemigrations --check
```

Expected: PASS and `No changes detected`.

- [ ] **Step 4: Run the complete backend suite**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test
```

Expected: PASS.

- [ ] **Step 5: Run frontend verification**

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test
..\.tools\node\npm.cmd run build
```

Expected: tests PASS and production build succeeds.

- [ ] **Step 6: Verify repository hygiene**

```powershell
git status --short --branch
git diff --check
git diff --stat
```

Expected: no whitespace errors, no generated database/cache/build artifacts, and only intended source/tests/docs changes.

- [ ] **Step 7: Write the implementation record**

Create `docs/archive/2026-07-27-incremental-analytics-performance-implementation.md` with:

```markdown
# Incremental Analytics Performance Implementation Record

## Delivered behavior

## Data migration and rebuild result

## Prediction/statistics/evaluation parity evidence

## Performance contract evidence

## Mutation and GameAccount-isolation evidence

## Commands executed and results

## Deferred work

- Recent sequence window selection (120/300/500)
- Base-weight recalibration
- Redis response cache and distributed coordination
- Dedicated background worker when measured load requires it
```

Populate every section with actual results from this implementation. Do not record planned or unexecuted verification as completed.

- [ ] **Step 8: Commit documentation and final verification record**

```powershell
git add docs/architecture.md docs/api-and-data-contracts.md docs/performance-and-background-runtime.md docs/engineering-quality.md docs/archive/2026-07-27-incremental-analytics-performance-implementation.md
git commit -m "docs: record incremental analytics architecture"
```

---

## Rollout and rollback

1. Apply the schema migration; it is additive and does not modify raw roll data.
2. Run `rebuild_analytics_states --all` before production traffic is switched to the new code when practical.
3. Ready reads may synchronously repair a missing/dirty state during this pre-release phase, so correctness does not depend on an external worker.
4. Monitor synchronous repair count, rebuild duration, prediction latency, evaluation latency, state payload size, and stale rebuild count.
5. If parity fails, switch the three service orchestrators back to the legacy read path; keep the additive state table for diagnosis and rebuild. Do not delete raw data or force-drop the state table during emergency rollback.
6. A later production-hardening plan may replace synchronous repair with a durable worker and Redis coordination after real queue/concurrency measurements exist.

## Acceptance checklist

- [ ] Existing prediction candidates, base weights, final weights, confidence, diagnostics, and tier tables remain API-compatible.
- [ ] Existing statistics and evaluation response shapes remain API-compatible.
- [ ] Ready reads never load all rolls for a `GameAccount`.
- [ ] Normal append updates state without a full rebuild.
- [ ] Delete, undo, recognition revert, context mutation, and out-of-order append cannot silently leave a ready but incorrect state.
- [ ] Full repair scans history once and discards stale results if a concurrent mutation occurs.
- [ ] State payload remains bounded as lifetime history grows.
- [ ] Cross-user and cross-`GameAccount` tests pass.
- [ ] Redis is not required for correctness or availability in this phase.
- [ ] Window-size and weight-schedule tuning remain unchanged and separately testable.
