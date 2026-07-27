# Incremental Analytics Performance Implementation

## Delivered behavior

- `EchoRecord` and `SubstatRoll` remain the analytics fact source. A persistent, per-`GameAccount` analytics state serves ready statistics, prediction, and evaluation reads without replaying account history.
- Normal new rolls append incrementally. Deletes, out-of-order writes, roll moves, and Echo context changes mark only the affected old/new account states dirty; repair streams the single account's ordered events.
- Removed the process-global roll-summary cache and its signal invalidation paths. The remaining compatibility summary helper always performs an explicit load and is not used by ready reads.
- Workspace initialization now awaits statistics and schedules active prediction in the background. It does not fetch model evaluation until the evaluation page is opened or its retry action is used.
- Prediction/evaluation success fields remain unchanged; statistics adds `context_factors.set_name.overflow_count`. Bounded repair contention returns `503` with `code: analytics_state_unavailable`; private state and pattern tables are not a Web or external recognition-client contract.
- Post-review hardening stores only bounded dynamic hit summaries, caps real free-text set groups at 128 with a separate overflow counter, initializes an empty ready state for new accounts, and makes Echo context mutation plus analytics invalidation atomic.
- The state-row payload no longer contains the complete length 1～3 pattern table. Independent per-prefix aggregates let a normal append update at most three rows and let prediction load only exact/current wildcard contexts; statistics and evaluation never load pattern rows.
- State validation rejects malformed windows, counters, and online metrics. Selected pattern rows are validated before prediction/append, and the default repair command includes missing, dirty, building, failed, and version-stale states.
- Rebuild attempts use a 30-minute UUID lease. Concurrent callers do not duplicate an active scan, and an obsolete success/failure cannot overwrite a newer attempt. Cross-account invalidation locks accounts in ascending ID order.

## Data migration/rebuild result

The bundled local PostgreSQL 18.4 instance was started on `127.0.0.1:5432`. Migrations `analytics.0001_initial` and `analytics.0002_gameaccountpatternaggregate` were applied to `wuwa_dev`, followed by `manage.py rebuild_analytics_states --all`: `attempted=5 saved=5 stale=0 failed=0`. Verification found five ready schema-v2 states for five accounts, 316 source rolls matching 316 accumulated state rolls, 222 pattern rows, no active rebuild lease, and no legacy `patterns` member in state payloads. Deployment environments must still run the same migration and rebuild commands against their own PostgreSQL database.

## Parity evidence

- Batch B's pure incremental-state and performance-contract tests completed `12/12` before this batch.
- Compatibility coverage verifies a current account summary and that the rebuild iterator is account-scoped and ordered by `tuned_at`, then `id`.
- Ready-read contract tests retain the assertion that statistics, prediction, and evaluation do not invoke the historical summary loader.
- A seeded high-entropy comparison covered 200 valid histories across the 20/120/500 boundaries. Before stable tie handling, 88 cases produced different dynamic weights; afterward distribution error remained at floating-point noise (`1.11e-16`) and dynamic-weight/detail mismatches were `0/200`.

## Performance contract

- Ready statistics, prediction, and evaluation consume one account's current derived state rather than process-global cached history or an all-history replay.
- Dirty recovery is a bounded, per-account streaming rebuild with a single-flight lease. It preserves database ownership filtering and does not return partial data after repair contention is exhausted.
- Redis is not introduced. It remains a future optional acceleration or distributed-coordination tool, never the source of truth.
- No worker is introduced; a dedicated worker remains contingent on measured load.
- A low-entropy cyclic 50,000-roll fixture previously produced about 13.5 KiB state, but that number was not representative. A random high-entropy fixture exposed about 514.8 KiB in the old single JSON, of which about 501.8 KiB was patterns.
- After splitting aggregates, the same 50,000-roll high-entropy fixture produced a 13.0 KiB state-row payload, 2,364 aggregate rows, and about 386.2 KiB of aggregate `next_counts` JSON before database row/index overhead. The optimization reduces hot-row reads/writes; it does not claim that historical pattern information has disappeared.
- On comparative in-memory SQLite, high-entropy rebuild took 14.79 seconds. Statistics/evaluation used one query each with P50 0.70/0.68 ms; prediction loaded a 3.8 KiB pattern slice, used four queries, and had P50 3.81 ms. A complete high-history append used 12 queries and took 27.94 ms versus the earlier single-JSON result of about 46.53 ms.

## Mutation/account isolation

- Append advances one account state when ordering is safe.
- Deletion captures the account before removal and dirties that account.
- Moving a `SubstatRoll` or changing an Echo context dirties both applicable old/new account states while unrelated account states remain ready.
- All facts and rebuilt state stay behind existing authenticated `GameAccount` ownership checks.

## Commands/results

- From `WuwaFrontend/`, `..\.tools\node\npm.cmd test`: passed, 348/348 tests.
- `npm run build`: passed (Vite 8.0.10 production build).
- From `Wuwa/`, `.\.venv\Scripts\python.exe manage.py test analytics.tests.test_incremental_state analytics.tests.test_performance_contract --keepdb -v 1`: passed, 12/12 tests.
- `py -3 -m compileall -q analytics api`: passed.
- An initial sandboxed `pg_ctl` launch failed while creating a restricted Windows token. The same bundled instance started successfully in the authorized host process environment; `pg_isready` and `psql` then confirmed PostgreSQL 18.4 accepting connections to `wuwa_dev` on `127.0.0.1:5432`.
- Final SQLite verification passed 188/188 backend tests in 59.71 seconds. `makemigrations --check --dry-run` reported no changes, and the focused high-history append query-budget test passed at a maximum of 12 queries.
- `manage.py migrate --check` returned success, both analytics migrations were marked applied, and the all-account rebuild plus state/source-count checks passed on local PostgreSQL. High-entropy performance measurements and the 200-case parity run remain comparative SQLite/Python evidence, not PostgreSQL production capacity results; production-scale JSONB/row-lock/WAL behavior still requires target-environment load testing.

## Deferred

- Choose the recent-history window using measured data: evaluate 120, 300, and 500.
- Recalibrate base model weights with production-quality samples.
- Consider Redis cache/distributed coordination only when measured load warrants it.
- Consider a dedicated worker only after measured-load evidence.
