# 2026-07-08 Workbench Prediction Idle Refresh

## Symptom

The user identified that the remaining entry jank was caused by waiting on prediction. Entry felt blocked or delayed when prediction work was still pending.

## Root Cause

Prediction refreshes were treated too close to the hot entry path:

- `refresh()` awaited `refreshActive()`, so initial workspace loading could wait on prediction.
- Selection/config/undo flows also awaited prediction directly.
- Post-entry background prediction started after only 80ms. If the user continued recording quickly, prediction could start while the next save was imminent.
- Client-side abort prevented stale UI updates, but it could not guarantee that already-started backend prediction CPU work stopped immediately.

## Fix

- Prediction is now idle/background work instead of required work for workspace readiness.
- `refresh()`, echo selection, config changes, discard, and undo now schedule prediction in the background instead of awaiting it.
- The prediction background delay changed from 80ms to 650ms so continuous entry cancels pending prediction timers before backend work starts.
- Existing abort/token guards still prevent stale prediction responses from updating the UI.

## Regression Tests

`WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js` adds/updates:

- `workspace refresh resolves without waiting for prediction results`
- `tier entry keeps prediction refresh out of the immediate save path`
- `new tier clicks cancel stale pending prediction refreshes before they start`

The first two tests failed before the fix and passed after it.

## Evidence

- `..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js`: 25 passed.
- `..\.tools\node\npm.cmd test -- src/App.test.js src/architecture.test.js`: 37 passed.
- `..\.tools\node\npm.cmd test`: 164 passed.
- `..\.tools\node\npm.cmd run build`: passed.

## Status

DONE
