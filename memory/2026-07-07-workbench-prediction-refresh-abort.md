# Workbench Prediction Refresh Abort

## Symptom
- When a user clicked the next substat before the prediction panel appeared, the workbench could briefly feel stuck.
- The jank was most visible after quick repeated entry because old prediction requests were still in flight while a new roll was being saved.

## Root Cause
- `useEchoWorkspace` invalidated stale prediction responses with a token, but it did not cancel the underlying `/prediction/` fetch.
- The next click could therefore overlap with an obsolete prediction request that still consumed browser and backend work.
- Prediction refresh also waited 300ms after a roll, which made the panel feel slower than necessary once the save returned.

## Fix
- Added `echoPredictionRefresh.js` as the owner for active prediction timers, tokens, and abort controllers.
- New tier clicks, active echo switches, selection changes, and reset now cancel any pending timer and abort stale prediction requests.
- Reduced the active prediction refresh delay to 80ms so the UI gets a useful next prediction sooner after the roll save settles.
- `getPrediction` now accepts request options so `AbortSignal` can reach `fetch`.

## Evidence
- `..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js`: 19/19 pass.
- `..\.tools\node\npm.cmd test -- src/App.test.js src/architecture.test.js`: 37/37 pass.
- `..\.tools\node\npm.cmd test`: 158/158 pass.
- `..\.tools\node\npm.cmd run build`: Vite build succeeds.

## Follow-Up
- Backend prediction still scans historical roll data per request. If traffic or sample size grows, add a backend aggregate cache keyed by game account and invalidate it on roll mutation.
