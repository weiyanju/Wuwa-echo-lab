# 2026-07-07 Workbench Next Echo Jank

## Symptom

After recording 5 substats, clicking "next" to prepare another echo caused a noticeable pause.

## Root Cause

`createNextEchoFromActive()` created the next echo and then awaited `refresh()`. That full refresh reloaded the echo list, active prediction, stats, and model evaluation before the interaction could settle. For the "next echo" workflow, `createEchoWithConfig()` already inserts and activates the new draft locally, so the full refresh was redundant work on the critical path.

`ensureActiveEcho()` had the same redundant full refresh after creating a draft.

## Fix

- Clear stale prediction when a newly created echo becomes active.
- Remove the blocking `await refresh()` from `ensureActiveEcho()`.
- Change `createNextEchoFromActive()` to create and activate the next draft immediately, then refresh only active prediction in the background.

## Evidence

- Added a regression test proving "next echo" does not issue another `/echoes/?game_account_id=...` list refresh.
- `npm test` passed with 154/154 tests.
- `npm run build` completed successfully.

## Status

DONE
