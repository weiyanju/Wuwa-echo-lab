# 2026-07-07 Workbench Tier Entry Jank

## Symptom

Clicking a substat tier during echo entry felt sticky or janky.

## Root Cause

Two frontend updates were happening for every tier entry:

- `EchoWorkbenchView.vue` used the global `pendingTierKey` in every substat row's `v-memo`, so setting and clearing pending state invalidated all 13 rows instead of only the clicked row.
- `useEchoWorkbenchLayout.js` watched `activeEcho.substats.length` and re-measured the gallery height on every entry, even though the active record panel has a fixed desktop height.

## Fix

- Added `rowPendingTierKey(row)` and used it in `v-memo` so only the pending row rerenders for pending-state changes.
- Removed `substats.length` from the setup-panel height synchronization watcher.

## Evidence

- Red test added for row-scoped pending memoization failed before the fix.
- Red test added for avoiding substat-count height sync failed before the fix.
- `npm test` passed with 153/153 tests.
- `npm run build` completed successfully.

## Status

DONE
