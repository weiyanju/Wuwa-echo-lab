# 2026-07-07 Workbench Image Patch Paused During Save

## Symptom

The user still felt obvious jank when entering substats after switching the echo image. The previous fix aborted in-flight image PATCH requests, but the issue could still reproduce when a substat save took longer than the image retry delay.

## Root Cause

`deferPendingEchoAssetUpdate()` only delayed image persistence by a fixed 360ms. If the substat POST was still in flight after that delay, the deferred image PATCH resumed and overlapped with the critical save path. This recreated the request pile-up even though pending and already in-flight image PATCHes were handled.

## Fix

- `WuwaFrontend/src/features/workspace/echoAssetIdentity.js` now pauses image persistence while tier entry is saving.
- Pending image patches keep their payload but do not schedule a retry while paused.
- In-flight image PATCHes are still aborted and requeued, but their retry is held until the save settles.
- `WuwaFrontend/src/features/workspace/useEchoWorkspace.js` resumes deferred image persistence in the `clickTier` `finally` block, after the substat save path exits.

## Regression Test

`WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js` includes `tier entry keeps deferred echo image patches paused until substat save settles`.

The test intentionally keeps the substat POST pending beyond the image retry delay. It failed before the fix because `image-patch` started before `substat-save` settled. It now verifies the image PATCH starts only after the save completes and the deferred retry delay elapses.

## Evidence

- `..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js --test-name-pattern "keeps deferred echo image patches paused"`: failed before the fix, passed after.
- `..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js`: 23 passed.
- `..\.tools\node\npm.cmd test`: 162 passed.
- `..\.tools\node\npm.cmd run build`: passed.

## Status

DONE
