# Wuwa Auto Echo Recognition MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an end-to-end MVP where the web app, Django backend, PostgreSQL database, and a minimal WPF local assistant can share accounts, bind a Wuwa game UID, write echo data to the database, submit sample recognition snapshots, and review results.

**Architecture:** Use Django Session + Cookie authentication for both the Vue frontend and the WPF assistant. Store durable business data under `GameAccount`, with `EchoRecord` and `SubstatRoll` as the formal statistical sample, and `RecognitionSession` / `RecognitionSnapshot` as raw recognition logs. Keep frontend-only layout preferences in localStorage and derive prediction/statistics/model-evaluation from formal samples.

**Tech Stack:** Django 6, PostgreSQL 16, psycopg 3, Vue + Vite, Windows WPF for the local assistant MVP.

---

## Current Baseline

The project has already moved from SQLite-style prototype storage toward PostgreSQL-backed schema design.

Implemented backend schema baseline:

- `GameAccount`
- `EchoRecord`
- `SubstatRoll`
- `RecognitionSession`
- `RecognitionSnapshot`

Current verified backend state:

- `python manage.py check` passes.
- `python manage.py makemigrations --check --dry-run` reports no changes.
- `python manage.py test api --verbosity 1 --noinput` passes 83 tests.
- PostgreSQL contains the core tables:
  - `api_gameaccount`
  - `api_echorecord`
  - `api_substatroll`
  - `api_recognitionsession`
  - `api_recognitionsnapshot`

The remaining MVP work is primarily API completion, frontend GameAccount integration, recognition service behavior, and WPF assistant link-up.

## MVP Scope

Included:

- Real system account registration and login.
- Default empty `GameAccount` creation after user registration.
- Workbench locked until a valid game UID is bound.
- GameAccount-aware echo CRUD, substat recording, undo, prediction, statistics, and model evaluation.
- Recognition sessions and recognition snapshots.
- Sample payload recognition import that writes real `EchoRecord` and `SubstatRoll` rows.
- Idempotency for repeated recognition snapshot submission.
- Revert for the most recent automatic import.
- Frontend GameAccount binding screen, auto collection summary, and conflict list.
- Minimal WPF assistant that can log in, read GameAccount, submit a sample snapshot, and revert it.

Not included in MVP:

- OCR implementation.
- Window capture.
- Enhancement-success template matching.
- Full in-game floating prediction window.
- Screenshot upload and retention.
- Exception correction/apply workflow.
- Prediction/statistics/evaluation cache tables.
- Multi-account switcher polish beyond backend support and a minimal frontend path.

## Product Decisions

- The system account is the login identity.
- Wuwa UID is not a login credential.
- One system account can have multiple `GameAccount` rows.
- Registration creates one default `GameAccount` with an empty UID.
- Empty UID means the workbench is locked.
- UID validation in MVP is only non-empty.
- `server` is reserved and may be empty.
- Existing fake data can be discarded; no old business sample migration is required.
- PostgreSQL is the target database for migrations and verification.
- The WPF MVP uses Session + Cookie auth first; token/device auth can come later.
- The WPF MVP submits fixed sample payloads; OCR normalization is a later phase.

## Milestones

### Milestone 1: Backend Account And GameAccount APIs

**Purpose:** Make the new account boundary explicit and usable by both frontend and WPF.

Deliverables:

- `POST /api/auth/register/` creates a Django user and a default empty `GameAccount`.
- `POST /api/auth/login/` and `POST /api/auth/logout/` continue to use session auth.
- `GET /api/me/` returns login identity plus default GameAccount and `workspace_locked`.
- `GET /api/game-accounts/` lists the current user’s game accounts.
- `POST /api/game-accounts/` creates a game account.
- `PATCH /api/game-accounts/{id}/` updates `uid`, `server`, `nickname`, and `is_default`.
- Backend rejects attempts to bind duplicate non-empty `uid + server` under the same user.
- Backend keeps at most one default GameAccount per user.

Implementation tasks:

- [ ] Add serializers/helpers for `GameAccount`.
- [ ] Add game account API views.
- [ ] Add URL routes for game account APIs.
- [ ] Update registration response to include default account state.
- [ ] Add tests for registration creating default empty GameAccount.
- [ ] Add tests for workspace lock response.
- [ ] Add tests for UID binding and duplicate UID rejection.
- [ ] Add tests for user isolation.

Acceptance checks:

- A new registered user has exactly one default GameAccount.
- `GET /api/me/` reports `workspace_locked: true` before UID binding.
- After `PATCH /api/game-accounts/{id}/` with non-empty UID, `workspace_locked` is false.
- Another user cannot read or update the account.

### Milestone 2: GameAccount-Aware Manual Echo Workflow

**Purpose:** Make the existing frontend workbench data durable under the correct game UID.

Deliverables:

- `GET /api/echoes/?game_account_id=...` returns only echoes under that GameAccount.
- `POST /api/echoes/` requires a usable GameAccount and creates a formal echo record.
- If `echo_uid` is omitted, backend allocates it from `GameAccount.next_echo_sequence`.
- `PATCH /api/echoes/{id}/` preserves ownership and GameAccount boundary.
- `POST /api/echoes/{id}/substats/` records a formal substat sample.
- `DELETE /api/echoes/{id}/substats/latest/` reopens status if needed.
- `GET /api/echoes/{id}/prediction/` uses only the echo’s GameAccount history.
- `GET /api/stats/?game_account_id=...` uses only that GameAccount.
- `GET /api/model-evaluation/?game_account_id=...` uses only that GameAccount.

Implementation tasks:

- [ ] Add API tests for unbound GameAccount rejecting echo creation.
- [ ] Add API tests for backend-generated `echo_uid`.
- [ ] Add API tests for two GameAccounts with same `echo_uid`.
- [ ] Add API tests for cross-GameAccount list isolation.
- [ ] Add API tests for stats/prediction/evaluation isolation.
- [ ] Update frontend API service to pass `game_account_id`.
- [ ] Remove frontend dependency on `wuwa-echo-sequence-${uid}` for new records.

Acceptance checks:

- A user with two GameAccounts can create echoes in both without data mixing.
- Statistics, prediction, and evaluation do not use another GameAccount’s samples.
- Frontend no longer needs localStorage sequence state to create an echo.

### Milestone 3: Frontend UID Binding And Locked Workbench

**Purpose:** Replace UID-as-login behavior with real account login plus UID binding.

Deliverables:

- Login/register screen uses username/password, not UID-derived credentials.
- After login, frontend calls `GET /api/me/` and `GET /api/game-accounts/`.
- If default GameAccount has no UID, workbench shows only a UID binding form.
- Binding UID calls `PATCH /api/game-accounts/{id}/`.
- After binding, workbench loads echoes, stats, prediction, and evaluation for that account.
- Existing pure UI preferences remain in localStorage.

Implementation tasks:

- [ ] Update `src/services/api.js` with GameAccount endpoints.
- [ ] Replace UID-derived login flow in `App.vue`.
- [ ] Add locked-workbench state.
- [ ] Add default UID binding form.
- [ ] Pass selected `game_account_id` to echo, stats, and evaluation calls.
- [ ] Keep theme/floating-panel preferences in localStorage.
- [ ] Remove recent UID quick-switch from MVP path or convert it to GameAccount list.

Acceptance checks:

- A new user can register and log in.
- Workbench is locked until UID is saved.
- Saving UID unlocks the workbench without re-login.
- Manual echo recording still works after binding.

### Milestone 4: Recognition Session And Sample Snapshot API

**Purpose:** Give the WPF assistant a real backend contract before OCR exists.

Deliverables:

- `POST /api/recognition/sessions/` creates an active session under a GameAccount.
- `GET /api/recognition/sessions/?game_account_id=...` lists recent sessions.
- `GET /api/recognition/sessions/{id}/` returns session summary and counts.
- `POST /api/recognition/snapshots/` accepts a fixed sample payload.
- The backend stores raw fields in `RecognitionSnapshot`.
- The backend validates normalized substats against constants and tier tables.
- Legal sample snapshots can create a new `EchoRecord` and `SubstatRoll` rows.
- Conflict snapshots do not create formal samples.

Implementation tasks:

- [ ] Add recognition serializers/helpers.
- [ ] Add recognition API routes.
- [ ] Add service for sample-payload validation.
- [ ] Add service for creating formal echo/substat rows from normalized snapshot.
- [ ] Add session count updates.
- [ ] Add tests for legal sample snapshot import.
- [ ] Add tests for invalid tier value producing conflict.
- [ ] Add tests that conflict records do not affect stats.

Acceptance checks:

- A sample WPF-like request creates `RecognitionSnapshot`.
- A legal sample also creates or updates formal echo data.
- The response includes `snapshot_id`, `status`, `match_status`, and `created_roll_count`.
- A conflict response is visible later but does not enter statistics.

### Milestone 5: Recognition Idempotency And Revert

**Purpose:** Make assistant writes safe to retry and reversible.

Deliverables:

- `session + client_event_id` prevents duplicate snapshot processing.
- `game_account + detail_screenshot_hash` can mark duplicate detail snapshots.
- `created_roll_ids` records every formal `SubstatRoll` created by the snapshot.
- `POST /api/recognition/snapshots/{id}/revert/` removes the rows created by that snapshot.
- Reverting updates `RecognitionSnapshot.status` to `reverted`.
- Reverting updates session counters and echo status.
- The WPF shortcut path can call revert for the most recent applicable snapshot.

Implementation tasks:

- [ ] Add idempotency service branch for duplicate `client_event_id`.
- [ ] Add duplicate hash handling.
- [ ] Add revert service.
- [ ] Add tests for repeated snapshot submission.
- [ ] Add tests for revert removing created rolls.
- [ ] Add tests for reverting a snapshot-created echo with no other rolls.
- [ ] Add tests that users cannot revert another user’s snapshot.

Acceptance checks:

- Submitting the same snapshot twice does not duplicate formal samples.
- Revert removes only rows created by that snapshot.
- Reverted samples no longer affect stats/prediction/evaluation.

### Milestone 6: Frontend Auto Collection Summary And Conflict List

**Purpose:** Let the web app show what the assistant wrote and what needs review.

Deliverables:

- A workbench section or page shows the latest recognition session.
- Summary includes snapshot count, saved roll count, created echo count, updated echo count, conflict count, and reverted count.
- Conflict list shows current GameAccount’s `conflict` / `rejected` snapshots.
- Revert action is available for recent saved snapshots.
- No exception editing/apply workflow in MVP.

Implementation tasks:

- [ ] Add `src/services/recognition.js`.
- [ ] Add `RecognitionSessionSummary` component.
- [ ] Add `RecognitionConflictList` component.
- [ ] Add revert button and response handling.
- [ ] Add frontend tests for GameAccount-scoped recognition calls.

Acceptance checks:

- After a sample snapshot import, web UI shows updated session summary.
- Conflict snapshots appear in the conflict list.
- Revert action updates the UI after backend success.

### Milestone 7: Minimal WPF Assistant MVP

**Purpose:** Prove a local Windows client can access backend APIs and write real database rows.

Deliverables:

- WPF app can configure backend base URL.
- WPF app can log in with system account credentials.
- WPF app stores session/cookie securely enough for development MVP.
- WPF app loads GameAccount list.
- If no UID is bound, WPF tells the user to bind UID first.
- WPF app can create a recognition session.
- WPF app can submit one fixed sample recognition snapshot.
- WPF app displays backend response.
- WPF app can call revert for the last submitted snapshot.

Implementation tasks:

- [ ] Create separate WPF repository or project folder as agreed.
- [ ] Implement `AuthClient`.
- [ ] Implement `GameAccountClient`.
- [ ] Implement `RecognitionClient`.
- [ ] Add sample payload button.
- [ ] Add last snapshot state.
- [ ] Add revert button.
- [ ] Add basic diagnostics log panel.

Acceptance checks:

- User logs in from WPF.
- WPF sees the same GameAccount as the web app.
- WPF sample submission creates real database rows.
- Web app can show the resulting summary.
- WPF revert removes the formal rows.

## Fixed Sample Payloads

MVP should include two or three fixed sample payloads. Keep them legal against backend constants.

Example sample shape:

```json
{
  "game_account_id": 1,
  "session_id": 1,
  "trigger_type": "sample_payload",
  "client_event_id": "sample-echo-001",
  "captured_at": "2026-06-07T12:00:00+08:00",
  "hashes": {
    "detail": "sample-detail-hash-001"
  },
  "detail_snapshot_raw": {
    "name_text": "Sample Echo",
    "sonata_text": "Sierra Gale",
    "cost_text": "4",
    "main_stat_text": "crit_rate",
    "substats": [
      {
        "position": 1,
        "label_text": "crit_rate",
        "value_text": "6.3",
        "confidence": 1.0
      }
    ]
  },
  "normalized_snapshot": {
    "display_name": "Sample Echo",
    "set_name": "Sierra Gale",
    "cost": 4,
    "main_stat": "crit_rate",
    "substats": [
      {
        "position": 1,
        "substat_type": "crit_rate",
        "tier_value": 6.3
      }
    ]
  },
  "field_confidence": {
    "detail_page": 1.0
  }
}
```

## Data Persistence Decisions

Persist:

- System user.
- GameAccount UID/server/nickname/default state.
- EchoRecord.
- SubstatRoll.
- RecognitionSession.
- RecognitionSnapshot.
- Created roll IDs for revert.

Do not persist in MVP:

- Frontend theme.
- Floating history panel position and size.
- Save-login toggle.
- Prediction result cache.
- Statistics result cache.
- Model evaluation result cache.
- OCR screenshots.

Derive:

- History counts and status chips.
- `pending` / `completed` display state.
- Statistics charts.
- Prediction candidates.
- Model evaluation cards.

## End-To-End MVP Acceptance

The MVP is complete when this flow works:

1. User registers with system username/password.
2. Backend creates default empty GameAccount.
3. User logs in.
4. Web workbench is locked.
5. User binds a Wuwa UID.
6. Web workbench unlocks.
7. User manually creates an echo and records a substat.
8. Stats and prediction use that GameAccount’s data.
9. WPF logs in with the same system account.
10. WPF loads the bound GameAccount.
11. WPF creates a recognition session.
12. WPF submits a sample snapshot.
13. Backend writes `RecognitionSnapshot` and formal echo/substat data.
14. Web UI shows recognition summary.
15. WPF or web UI reverts the snapshot.
16. Formal sample rows created by the snapshot disappear from stats.

## Verification Commands

Backend:

```powershell
cd C:\Users\qifan\Wuwa\Wuwa
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test api --verbosity 1 --noinput
```

Frontend:

```powershell
cd C:\Users\qifan\Wuwa\WuwaFrontend
..\ .tools\node\npm.cmd test
..\ .tools\node\npm.cmd run build
```

The frontend commands may need path correction depending on the local Node runtime path used in the workspace.

WPF assistant:

```text
Manual MVP verification:
1. Start Django backend.
2. Log in from WPF.
3. Load GameAccount list.
4. Submit sample snapshot.
5. Confirm response includes snapshot_id and saved status.
6. Confirm web summary updates.
7. Revert snapshot.
8. Confirm formal rows are removed.
```

## Risks And Controls

- Risk: Different UIDs sharing one statistical sample pool.
  - Control: Every core query must filter by `game_account`.
- Risk: Frontend creates business rows before UID binding.
  - Control: Backend rejects echo creation for locked GameAccounts.
- Risk: Assistant retries duplicate snapshots.
  - Control: `session + client_event_id` idempotency.
- Risk: OCR conflict pollutes statistics.
  - Control: Conflict snapshots do not create formal samples.
- Risk: WPF implementation gets blocked by OCR.
  - Control: WPF MVP uses fixed sample payloads first.

## Next Recommended Step

Start with Milestone 1 and Milestone 2 API completion, because frontend and WPF both depend on stable account and GameAccount-aware echo endpoints.
