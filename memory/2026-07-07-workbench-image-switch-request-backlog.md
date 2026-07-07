# Workbench Image Switch Request Backlog

## Symptom
- Recording substats is smooth before switching the echo image.
- After switching echo images, substat entry feels like several requests are squeezed together.

## Root Cause
- Every preview image change immediately sent `PATCH /echoes/:id/`.
- Rapid image switching could send multiple PATCH requests for the same echo while substat entry was trying to send `POST /substats/`.
- The PATCH responses were guarded against substat rollback, but the requests still consumed browser/backend work on the entry path.

## Fix
- Echo image selection now updates the local UI immediately and delays persistence by 360ms.
- Rapid image switches are coalesced so only the latest selected image is PATCHed.
- If a tier is clicked while an image PATCH is pending, the image PATCH is deferred again so the substat save goes first.
- Image PATCHes are serialized, so a newer selection waits instead of adding another concurrent mutation for the same echo.

## Evidence
- Added regression coverage for rapid preview changes coalescing to one PATCH.
- Added regression coverage for tier entry taking priority over pending image PATCH.
- `..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js`: 21/21 pass.
- `..\.tools\node\npm.cmd test -- src/App.test.js src/architecture.test.js`: 37/37 pass.
- `..\.tools\node\npm.cmd test`: 160/160 pass.
- `..\.tools\node\npm.cmd run build`: Vite build succeeds.

## Status
DONE
