# Floating History Panel Unified Transitions Delivery

## Result

The floating history panel now renders from one mutually exclusive mode: `compact`, `showcase`, or `minimized`. Showcase minimization no longer clears the showcase layout while it is visible, so the transition goes directly from the large panel to the terminal without a compact-panel frame.

The terminal restores the last expanded mode, including after a page reload. Compact ↔ showcase and either expanded mode ↔ terminal all use the same exit/swap/enter choreography.

## Implementation

- Added `floatingHistoryMode.js` as the pure owner of mode initialization and transition resolution.
- Replaced the two mutable mode booleans with one `historyPanelMode` ref and computed projections.
- Routed both toolbar actions through `transitionFloatingHistoryPanel(intent)`.
- Changed mode and position only while the panel is fully transparent and hidden.
- Standardized motion to opacity plus corner-relative translation:
  - exit: 120ms
  - enter: 140ms
  - frame buffer: 24ms
- Removed blur and layout-property animation from the transition.
- Ignored pointer and toggle input while a transition is active.
- Preserved legacy minimized-state storage and added persisted last-expanded-mode storage.
- Kept reduced-motion behavior atomic and animation-free.

## Automated verification

- Focused mode and component tests: 16 passed, 0 failed.
- Full frontend suite: 253 passed, 0 failed.
- Production build: Vite 8.0.10, 72 modules transformed, exit code 0.
- Component size remains below the repository limit: 607 lines versus the 650-line ceiling.

## Visual verification status

Automated browser QA could not be completed. The previously open localhost page no longer had a live server, and after starting the frontend service the browser-control URL policy blocked reloading that localhost page. No alternate browser or policy workaround was attempted.

Manual follow-up should verify these six paths on the authenticated workbench:

- compact → showcase
- showcase → compact
- compact → minimized
- minimized → compact
- showcase → minimized
- minimized → showcase

The critical observation is that showcase → minimized must never display the compact width or one-column list between the two target states.

## Files

- `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`
- `WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js`
- `WuwaFrontend/src/features/history/floatingHistoryMode.js`
- `WuwaFrontend/src/features/history/floatingHistoryMode.test.js`
- `docs/superpowers/specs/2026-07-14-floating-history-panel-transitions-design.md`
- `docs/superpowers/plans/2026-07-14-floating-history-panel-transitions.md`
