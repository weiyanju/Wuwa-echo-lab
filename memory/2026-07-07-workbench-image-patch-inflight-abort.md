# 2026-07-07 Workbench Image Patch In-Flight Abort

## Symptom

After switching the echo artwork several times, tier entry still felt janky. The user observed that normal entry was fast when the image was not switched, but requests appeared to pile up after image switching.

## Root Cause

The previous image persistence optimization only deferred a pending image PATCH before it started. Once the 360ms debounce elapsed and the image PATCH was already in flight, `clickTier` could no longer move it out of the hot tier-entry path. That allowed the image PATCH, substat POST, and prediction refresh work to overlap again.

## Fix

- `WuwaFrontend/src/services/echoApi.js` now lets `updateEcho` pass request options such as `AbortSignal`.
- `WuwaFrontend/src/features/workspace/echoAssetIdentity.js` tracks the in-flight image persistence request and abort controller.
- Starting tier entry now aborts any in-flight image PATCH, requeues the latest image fields, prioritizes the substat save, and retries the image PATCH after the debounce.
- Abort errors from this deliberate cancellation are ignored instead of shown as user-facing failures.

## Regression Test

`WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js` includes `tier entry aborts in-flight echo image patches and retries them later`.

The test failed before the fix because image PATCH requests had no `AbortSignal`. It now confirms:

1. The image PATCH starts.
2. Tier entry aborts that in-flight PATCH.
3. The substat save runs next.
4. The image PATCH is retried later.

## Evidence

- `..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js --test-name-pattern "aborts in-flight"`: 22 passed.
- `..\.tools\node\npm.cmd test`: 161 passed.
- `..\.tools\node\npm.cmd run build`: passed.

## Status

DONE
