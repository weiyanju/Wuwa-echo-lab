# Floating History Panel Unified Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make compact, showcase, and minimized history-panel transitions share one state model and one animation path without rendering an intermediate layout.

**Architecture:** Add a pure three-mode transition resolver in the history feature and make `FloatingHistoryPanel.vue` render from its single mode value. Route size and showcase controls through one exit/swap/enter transition function that changes mode only while the panel is hidden.

**Tech Stack:** Vue 3 Composition API, JavaScript ES modules, CSS, Node test runner

---

### Task 1: Add the three-mode transition model

**Files:**
- Create: `WuwaFrontend/src/features/history/floatingHistoryMode.js`
- Create: `WuwaFrontend/src/features/history/floatingHistoryMode.test.js`

- [ ] **Step 1: Write the failing transition tests**

Add tests that import `HISTORY_PANEL_MODE`, `initialHistoryPanelState`, and `resolveHistoryPanelTransition`, then assert:

```js
assert.deepEqual(
  resolveHistoryPanelTransition(
    { mode: HISTORY_PANEL_MODE.SHOWCASE, lastExpandedMode: HISTORY_PANEL_MODE.SHOWCASE },
    'toggle-minimized',
  ),
  { mode: HISTORY_PANEL_MODE.MINIMIZED, lastExpandedMode: HISTORY_PANEL_MODE.SHOWCASE },
)
```

Also cover compact minimization, restoring each expanded mode, compact/showcase toggling, and legacy minimized initialization.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test src/features/history/floatingHistoryMode.test.js`

Expected: FAIL because `floatingHistoryMode.js` does not exist.

- [ ] **Step 3: Implement the pure mode resolver**

Create the constants and functions with these public signatures:

```js
export function initialHistoryPanelState(storedMinimized) {}
export function resolveHistoryPanelTransition(state, intent) {}
```

`toggle-minimized` stores the current expanded mode or restores `lastExpandedMode`. `toggle-showcase` switches only between compact and showcase. Return a single state object for each intent.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test src/features/history/floatingHistoryMode.test.js`

Expected: all mode tests pass.

### Task 2: Integrate the single rendered mode

**Files:**
- Modify: `WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js`
- Modify: `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`

- [ ] **Step 1: Write failing component contract tests**

Assert that the component imports the mode module, owns `historyPanelMode` and `lastExpandedMode`, renders `historyPanelMode` as its mode class, and does not define mutable `isHistoryMinimized` or `isHistoryShowcase` refs. Assert that the unified animation transition contains only opacity and transform.

- [ ] **Step 2: Run the component test and verify RED**

Run: `node --test src/features/history/FloatingHistoryPanel.test.js`

Expected: FAIL because the component still uses two mutable booleans and separate transition handlers.

- [ ] **Step 3: Replace the booleans and duplicated handlers**

Import the mode helpers, initialize the legacy minimized preference, and define:

```js
const initialPanelState = initialHistoryPanelState(localStorage.getItem('wuwa-floating-history-minimized'))
const historyPanelMode = ref(initialPanelState.mode)
const lastExpandedMode = ref(initialPanelState.lastExpandedMode)
const isHistoryMinimized = computed(() => historyPanelMode.value === HISTORY_PANEL_MODE.MINIMIZED)
const isHistoryShowcase = computed(() => historyPanelMode.value === HISTORY_PANEL_MODE.SHOWCASE)
```

Replace both old animation handlers with `transitionFloatingHistoryPanel(intent)`. Fade out first, hide the element, update `historyPanelMode` exactly once, adjust coordinates, wait for `nextTick`, then fade in. Keep `toggleFloatingHistorySize()` and `toggleFloatingHistoryShowcase()` as small event wrappers so the template API stays readable.

- [ ] **Step 4: Run the mode and component tests**

Run: `node --test src/features/history/floatingHistoryMode.test.js src/features/history/FloatingHistoryPanel.test.js`

Expected: both files pass.

### Task 3: Verify integration and document delivery

**Files:**
- Create: `docs/archive/2026-07-14-floating-history-panel-transitions.md`

- [ ] **Step 1: Run the complete frontend tests**

Run: `npm test`

Expected: all frontend tests pass with zero failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Vite exits with code 0 and emits the production bundle.

- [ ] **Step 3: Run browser QA**

At the authenticated workbench, verify compact ↔ showcase, compact ↔ minimized, and showcase ↔ minimized. Rapidly click each control once during motion, test light and dark themes, and confirm no intermediate compact frame appears during showcase minimization.

- [ ] **Step 4: Record the implementation result**

Document the final state model, timing values, changed files, automated command results, browser observations, and any unavailable verification in `docs/archive/2026-07-14-floating-history-panel-transitions.md`.

- [ ] **Step 5: Check repository hygiene**

Run: `git diff --check` and `git status --short`

Expected: no whitespace errors and only the intended source, test, design, plan, and archive files are changed.
