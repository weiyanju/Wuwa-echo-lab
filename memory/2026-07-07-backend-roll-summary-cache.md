# Backend Roll Summary Cache

## Goal
- Implement the first backend performance step from the recommended route without adding Redis or a database schema migration.
- Reduce repeated full-history roll scans across prediction, statistics, and model evaluation.

## Implementation
- Added an account/user-scoped in-process roll summary cache in `analytics.services.roll_summary`.
- The cached summary stores ordered roll events, substat sequence, substat counts, set-name counts, and total roll count.
- Prediction and statistics now read this shared summary instead of each scanning roll history independently.
- Evaluation benefits through the existing prediction helper that now returns cached historical events.

## Invalidation
- `SubstatRoll` save/delete invalidates both the owning `GameAccount` and owning `User` summary.
- `EchoRecord` context updates invalidate summaries only when fields such as `set_name`, `cost`, or `main_stat` change.
- Echo image/name PATCHes do not invalidate roll summary cache, avoiding request churn from preview image switching.

## Evidence
- Added tests for direct roll save/delete invalidation.
- Added tests proving statistics reuses a warmed summary without querying `api_substatroll`.
- Added tests proving echo image PATCH does not invalidate context summary, while set-name changes do.
- `.\.venv\Scripts\python.exe manage.py test api.tests.test_roll_summary --keepdb`: 3/3 pass.
- `.\.venv\Scripts\python.exe manage.py test api.tests.test_prediction api.tests.test_statistics api.tests.test_evaluation --keepdb`: 37/37 pass.
- `.\.venv\Scripts\python.exe manage.py test api.tests.test_roll_summary api.tests.test_prediction api.tests.test_statistics api.tests.test_evaluation api.tests.test_views api.tests.test_models --keepdb`: 108/108 pass.

## Follow-Up
- If multiple backend instances are deployed, replace or back this cache with Redis using the same cache-key and invalidation boundaries.
- For larger datasets, add a persisted aggregate/read-model table and rebuild jobs for historical backfill.
