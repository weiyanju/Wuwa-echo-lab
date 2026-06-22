# Multi-Game UID Onboarding And Switcher Design

## Goal

Improve the first-run UID binding experience and let one system account bind and switch among up to five game UIDs without weakening `GameAccount` data isolation.

## Product Decisions

- A user with no bound UID must bind one before using the workbench.
- One system account can bind at most five game UIDs.
- Every UID must contain exactly nine decimal digits.
- The UI displays the UID itself. It does not expose or require a nickname.
- A bound UID is immutable. Users add another `GameAccount` instead of editing an existing UID.
- This iteration does not expose account deletion. In particular, an account with business data must never be directly deleted.
- Switching the active UID also updates the backend default `GameAccount`, keeping Web and WPF selection aligned.
- The first-run media area uses a static placeholder in this iteration and reserves a stable slot for a future animation.

## Existing System

The backend already models one user to many `GameAccount` rows, provides list/create/update endpoints, enforces per-user UID uniqueness, and supports one default account. Business APIs are already scoped by `game_account_id`.

The Web client currently narrows this model to the default account. It locks the whole workbench when that account has no UID, presents a sparse standalone binding view, and deliberately omits quick switching from the top-bar UID chip.

## First-Run Experience

When no bound `GameAccount` exists, the application keeps its normal top bar but does not load workbench business data. Navigation remains visible as application orientation but is disabled until binding succeeds.

The page body contains one focused two-column activation card:

- The left column is a media slot with a static abstract placeholder.
- The right column contains `绑定游戏 UID`, one short sentence, the UID field, the primary bind action, and one short hint explaining where to find the UID.
- The page does not explain multi-account limits, deletion rules, model behavior, or every product feature.
- Desktop uses a two-column card. Narrow layouts stack the media slot above the form and reduce its height.
- A future animation may replace the placeholder without changing the form or layout contract. It must be muted, lightweight, loop without distraction, provide a static fallback, and respect reduced-motion preferences.

The first binding updates the empty default `GameAccount` created during registration. Success immediately loads the workbench for that account without another login.

## UID Capsule And Menu

After binding, the top-right capsule becomes a button and displays the current UID directly. It uses the existing line-icon system for the status indicator, chevron, and selected checkmark; text glyphs such as `v` and `✓` are not final assets.

Opening the capsule shows a compact popover:

- Header: `游戏 UID` and the current count such as `3 / 5`.
- Body: one row per bound UID.
- Current row: a light selected background and one check icon. It does not repeat `当前 ✓`.
- Other rows: selecting a row switches the active account.
- Footer: `绑定新 UID`.
- At five accounts, the add action is disabled and labelled `已达上限`.

The popover supports keyboard navigation, visible focus, `Escape` to close, and outside-click dismissal. Focus returns to the capsule when the menu closes.

## Adding Another UID

Selecting `绑定新 UID` replaces the popover list with a compact inline form. It does not navigate away and does not open a large modal.

The form contains a back action, a digits-only UID field, a bind action, inline validation, and the available-capacity context. On success, the new account becomes the backend default and the current Web account, the menu closes, and all scoped data reloads.

The client prevents duplicate submission, but the backend remains responsible for duplicate UID rejection and the five-bound-UID limit. If an owned empty account exists, the client binds that row before creating another one.

## Selection Rules

The frontend account composable exposes an explicit current account instead of assuming that the first/default row is always usable.

Selection order after loading accounts:

1. Use the default account when it has a bound UID.
2. Otherwise use the first bound account and persist it as default.
3. If no bound account exists, enter the first-run binding state using the existing empty default account.

Creating an additional UID sets the new account as default. Selecting another UID patches that account with `is_default=true` before reloading scoped data.

## Switching Data Safely

Switching accounts is an application-wide scope change:

1. Disable additional account actions and close the menu.
2. Invalidate in-flight workspace and recognition operations.
3. Clear state derived from the previous `GameAccount`.
4. Persist the selected account as backend default.
5. Load workspace, recognition, statistics, and evaluation data for the new account.
6. Re-enable interaction after the active account and all visible state agree.

Existing lifecycle generation checks are extended so delayed responses from the previous account cannot restore stale data. If scoped data loading fails after the default switch succeeds, the new UID remains selected and the UI shows a retryable error; old UID data must not reappear.

## Backend Rules

The backend enforces the business rules independently of the Web client:

- `POST /game-accounts/` requires a non-empty UID; registration remains the only path that creates an empty account.
- Every non-empty UID accepted by create or update must match `^\d{9}$`.
- Account binding or creation is rejected when the user already owns five bound `GameAccount` rows.
- The limit check and mutation lock the owning user row in one transaction so concurrent requests cannot exceed the limit.
- A non-empty bound UID cannot be changed to a different UID or cleared through `PATCH`.
- The initial empty account may be assigned its first UID.
- Per-user UID uniqueness and ownership checks remain in force.
- Only one account can remain default.
- The existing `nickname` database and API field remains for compatibility, but this Web feature neither sends nor renders it.

No business endpoint may infer the active account only from client-local state. Existing explicit `game_account_id` scoping remains unchanged.

## Validation And Errors

- The Web input removes non-digit characters while typing and accepts submission only when the normalized value matches `^\d{9}$`.
- The backend independently applies the same exact nine-digit rule; client validation is only immediate feedback and cannot bypass the domain constraint.
- Empty, malformed, duplicate, immutable-UID, ownership, and limit violations produce inline or top-level actionable errors.
- Add and switch controls remain disabled while their request is active.
- An account-list refresh reconciles the client with backend truth after ambiguous failures.
- Error handling never falls back to mixing data from another UID.

## Component Boundaries

- `useGameAccount` owns account loading, usable-account selection, first binding, adding, switching, capacity, loading, and account errors.
- A top-bar UID switcher component owns popover visibility, focus, list/add modes, and emits account commands.
- The first-run UID view owns UID input normalization, local validation, responsive presentation, and the media slot.
- `App.vue` remains the coordinator for authentication, application-wide scope reset, and cross-feature refresh.
- Backend account limits and UID immutability stay in `accounts` domain services, not in API views.

## Testing

Backend tests cover:

- Initial empty default account binding.
- Creating accounts two through five.
- Rejecting a sixth account, including concurrent attempts where practical.
- Rejecting duplicate UIDs.
- Rejecting changes or clearing of a bound UID.
- Switching the unique default account.
- Ownership and cross-account data isolation.

Frontend tests cover:

- Selecting a usable bound account when the nominal default is empty.
- First-run lock only when no bound account exists.
- First binding, additional binding, capacity state, and switching.
- Resetting old account state and ignoring delayed old-account responses.
- Popover list/add modes and keyboard dismissal.
- No nickname presentation or payload dependency.

Final verification includes the complete Django suite, complete frontend suite, production frontend build, and browser checks in light, dark, and 860-pixel layouts. Browser acceptance covers first-run binding, the UID menu, inline add form, five-account limit, and scoped workspace, recognition, statistics, and evaluation reloads.

## Out Of Scope

- Producing or licensing the final animated media asset.
- Editing or renaming a bound UID.
- Deleting a `GameAccount` or its business data.
- Adding server/region selection.
- Adding UID nicknames to the Web UI.
- Changing echo, recognition, statistics, prediction, or evaluation contracts beyond selecting their existing `GameAccount` scope.
