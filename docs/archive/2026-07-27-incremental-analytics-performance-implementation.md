# Incremental Analytics Performance Implementation

## Delivered behavior

- `EchoRecord` and `SubstatRoll` remain the analytics fact source. A persistent, per-`GameAccount` analytics state serves ready statistics, prediction, and evaluation reads without replaying account history.
- Normal new rolls append incrementally. Deletes, out-of-order writes, roll moves, and Echo context changes mark only the affected old/new account states dirty; repair streams the single account's ordered events.
- Removed the process-global roll-summary cache and its signal invalidation paths. The remaining compatibility summary helper always performs an explicit load and is not used by ready reads.
- Workspace initialization now awaits statistics and schedules active prediction in the background. It does not fetch model evaluation until the evaluation page is opened or its retry action is used.
- Successful analytics API response fields are unchanged. Bounded repair contention returns `503` with `code: analytics_state_unavailable`; private state tables are not a Web or external recognition-client contract.

## Data migration/rebuild result

No database migration, `migrate`, or development backfill/rebuild was executed on this workstation: PostgreSQL was not listening at `127.0.0.1:5432`. Before deployment, run `manage.py migrate` and `manage.py rebuild_analytics_states --all` against the target PostgreSQL database.

## Parity evidence

- Batch B's pure incremental-state and performance-contract tests completed `12/12` before this batch.
- Compatibility coverage verifies a current account summary and that the rebuild iterator is account-scoped and ordered by `tuned_at`, then `id`.
- Ready-read contract tests retain the assertion that statistics, prediction, and evaluation do not invoke the historical summary loader.

## Performance contract

- Ready statistics, prediction, and evaluation consume one account's current derived state rather than process-global cached history or an all-history replay.
- Dirty recovery is a bounded, per-account streaming rebuild. It preserves database ownership filtering and does not return partial data after repair contention is exhausted.
- Redis is not introduced. It remains a future optional acceleration or distributed-coordination tool, never the source of truth.
- No worker is introduced; a dedicated worker remains contingent on measured load.

## Mutation/account isolation

- Append advances one account state when ordering is safe.
- Deletion captures the account before removal and dirties that account.
- Moving a `SubstatRoll` or changing an Echo context dirties both applicable old/new account states while unrelated account states remain ready.
- All facts and rebuilt state stay behind existing authenticated `GameAccount` ownership checks.

## Commands/results

- `npm test -- --test-name-pattern="workspace refresh|dashboard navigation"`: passed, 55 tests (the Node runner loaded the full suite under this pattern).
- `npm run build`: passed (Vite 8.0.10 production build).
- `py -3 -m compileall -q analytics api`: passed. The required repository `.venv` is absent and the launcher interpreter has no Django installation, so `manage.py test analytics.tests.test_incremental_state analytics.tests.test_performance_contract --keepdb -v1` could not be run here.
- `Test-NetConnection 127.0.0.1:5432`: failed; confirms the local PostgreSQL limitation above. `git diff --check` and the production cache-symbol scan passed.

## Deferred

- Choose the recent-history window using measured data: evaluate 120, 300, and 500.
- Recalibrate base model weights with production-quality samples.
- Consider Redis cache/distributed coordination only when measured load warrants it.
- Consider a dedicated worker only after measured-load evidence.
