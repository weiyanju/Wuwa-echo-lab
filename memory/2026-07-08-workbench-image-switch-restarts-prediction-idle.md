# 2026-07-08 Workbench Image Switch Restarts Prediction Idle

## Symptom

After making prediction refresh idle/background, the user still saw a waiting/jank window after switching the echo image.

## Root Cause

Echo image selection did not interact with the prediction scheduler. A prediction timer created by `refresh()` or a previous workspace action could continue counting down while the user switched echo artwork. That meant prediction could start shortly after the image switch, inside the user's next interaction window.

## Fix

- `WuwaFrontend/src/features/workspace/useEchoWorkspace.js` now cancels pending/in-flight prediction refreshes when selecting an echo image.
- The same image selection then schedules a fresh background prediction from the image-switch time, preserving the idle delay.
- This keeps prediction available after the user pauses, but prevents an old prediction timer from firing immediately after image switching.

## Regression Test

`WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js` adds `echo image selection restarts pending prediction refresh after the image switch idle window`.

The test failed before the fix because a prediction request started 400ms after image selection. It now verifies prediction waits for the full idle window after the image switch.

## Evidence

- `..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js --test-name-pattern "image selection restarts pending prediction"`: failed before the fix, passed after.
- `..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js`: 26 passed.
- `..\.tools\node\npm.cmd test`: 165 passed.
- `..\.tools\node\npm.cmd run build`: passed.

## Status

DONE
