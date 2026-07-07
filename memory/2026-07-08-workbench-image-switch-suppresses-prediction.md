# 2026-07-08 Workbench Image Switch Suppresses Prediction

## Symptom

The user still saw obvious waiting after switching the echo image. The visible request stuck on the prediction endpoint, while entry without switching the image felt fine.

## Root Cause

The previous fix restarted the prediction idle window after image selection. That still created a prediction request caused by an image-only change.

Echo image identity fields (`echo_asset_id`, `echo_name`, `echo_image`) do not affect the prediction result. Triggering prediction from image selection was therefore unnecessary, and once the backend began prediction work, frontend abort could not guarantee the backend computation stopped immediately.

## Fix

- `WuwaFrontend/src/features/workspace/useEchoWorkspace.js` now cancels pending/in-flight prediction refreshes when the echo image changes.
- It does not schedule a replacement prediction for image-only changes.
- Predictions still refresh after meaningful prediction inputs change, such as substat entry, config changes, echo selection, undo, and next echo activation.

## Regression Test

`WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js` includes `echo image selection cancels prediction refresh without starting a new one`.

The test failed before the fix because image selection produced a prediction request. It now verifies no prediction request is started after image selection.

## Evidence

- `..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js --test-name-pattern "image selection cancels prediction"`: failed before the fix, passed after.
- `..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js`: 26 passed.
- `..\.tools\node\npm.cmd test`: 165 passed.
- `..\.tools\node\npm.cmd run build`: passed.

## Status

DONE
