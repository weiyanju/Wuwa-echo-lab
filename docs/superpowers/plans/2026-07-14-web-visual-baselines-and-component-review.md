# Web Visual Baselines and Component Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the approved Web design-governance follow-up by archiving eight current light/dark baselines, finishing zero-drift token mappings for remaining feature CSS, and reviewing cards, summary color, and motion as three separately approved component families.

**Architecture:** Use the real local application and authenticated browser state for screenshots rather than a duplicated mock UI. Restrict token work to exact value-and-semantics matches already defined by global theme tokens. Treat card, summary-color, and motion findings as report-only design proposals until the user approves each family.

**Tech Stack:** Vue 3, CSS, Node test runner, Vite, Impeccable detector, in-app browser

---

### Task 1: Archive the current light/dark visual baseline

**Files:**
- Create: `docs/design-baselines/web/2026-07-14/README.md`
- Create: `docs/design-baselines/web/2026-07-14/login-light.png`
- Create: `docs/design-baselines/web/2026-07-14/login-dark.png`
- Create: `docs/design-baselines/web/2026-07-14/workspace-light.png`
- Create: `docs/design-baselines/web/2026-07-14/workspace-dark.png`
- Create: `docs/design-baselines/web/2026-07-14/statistics-light.png`
- Create: `docs/design-baselines/web/2026-07-14/statistics-dark.png`
- Create: `docs/design-baselines/web/2026-07-14/evaluation-light.png`
- Create: `docs/design-baselines/web/2026-07-14/evaluation-dark.png`

- [x] **Step 1: Create the baseline manifest**

Document the viewport, local URL, theme, page state, capture date, expected filenames, and the rule that these images are comparison evidence rather than normative replacements for `DESIGN.md`.

- [x] **Step 2: Capture the light login page**

Open `http://127.0.0.1:61975/` at the desktop viewport and save a full-page screenshot as `login-light.png`.

- [x] **Step 3: Enter the authenticated application**

Use the user's existing local development account in the in-app browser. Do not create, change, or commit credentials and do not create a second visual implementation.

- [x] **Step 4: Capture authenticated light pages**

Capture the current workbench, statistics page, and evaluation page as `workspace-light.png`, `statistics-light.png`, and `evaluation-light.png` without changing application data.

- [x] **Step 5: Capture authenticated dark pages and dark login**

Use the existing theme toggle, capture the workbench, statistics, and evaluation pages in dark mode, then sign out without resetting the theme and capture `login-dark.png`.

- [x] **Step 6: Verify the baseline set**

Run:

```powershell
Get-ChildItem docs/design-baselines/web/2026-07-14 -File | Select-Object Name,Length
```

Expected: the manifest plus exactly eight non-empty PNG files.

### Task 2: Finish exact feature-token mappings without visual drift

**Files:**
- Modify: `WuwaFrontend/src/design-state-accent.test.js`
- Modify: `WuwaFrontend/src/styles/features/statistics.css`
- Modify: `WuwaFrontend/src/styles/features/recognition.css`
- Modify: `WuwaFrontend/src/styles/features/uid-setup.css`

- [x] **Step 1: Write failing token-ownership tests**

Add tests that require the remaining exact dark-theme matches to consume existing semantic tokens:

```js
test('remaining feature dark themes reuse exact semantic tokens without remapping feature colors', async () => {
  const statistics = await read('./styles/features/statistics.css')
  const recognition = await read('./styles/features/recognition.css')
  const uidSetup = await read('./styles/features/uid-setup.css')

  for (const value of ['#17232d', '#e7eef4', '#a9bac7', '#98aab7', '#5da8ff']) {
    assert.doesNotMatch(statistics, new RegExp(value, 'i'))
  }
  for (const value of ['#37b37f', '#e7eef4', '#a9bac7']) {
    assert.doesNotMatch(recognition, new RegExp(value, 'i'))
  }
  for (const value of ['#98aab7', '#8dc3ff']) {
    assert.doesNotMatch(uidSetup, new RegExp(value, 'i'))
  }
  assert.match(statistics, /var\(--surface-soft\)/)
  assert.match(recognition, /var\(--success\)/)
  assert.match(uidSetup, /var\(--primary-deep\)/)
})
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
..\.tools\node\npm.cmd test -- --test-name-pattern="remaining feature dark themes"
```

Expected: fail because the literal values are still present.

- [x] **Step 3: Replace only exact semantic matches**

Apply these mappings without changing any token source value:

- `#17232d` → `var(--surface-soft)`
- `#e7eef4` → `var(--ink-deep)`
- `#a9bac7` → `var(--charcoal)`
- `#98aab7` → `var(--steel)`
- `#5da8ff` → `var(--primary)`
- `#37b37f` → `var(--success)`
- `#8dc3ff` → `var(--primary-deep)`

Do not migrate statistics chart colors, recognition status colors, login terminal-local tokens, gradients, translucent overlays, or values that merely look similar.

- [x] **Step 4: Run focused tests and verify GREEN**

Run the focused test again. Expected: pass.

- [x] **Step 5: Compare computed styles against the archived baseline**

Verify the touched statistics, recognition, and UID selectors resolve to the same colors before and after migration in the browser.

- [x] **Step 6: Commit the zero-drift token batch**

Stage only the test and three feature CSS files plus its implementation record, then commit with:

```powershell
git commit -m "refactor: finish feature dark theme token reuse"
```

### Task 3: Review the card component family

**Files:**
- Create: `docs/archive/2026-07-14-card-component-family-review.md`
- Reference: `DESIGN.md`
- Reference: `WuwaFrontend/src/styles/controls.css`
- Reference: `WuwaFrontend/src/styles/features/*.css`

- [x] **Step 1: Inventory card containers, borders, radii, nesting, and shadows**

Record only verified inconsistencies against the approved baseline, including exact selector and file location. Keep Bayes path structure and data visualization containers out of decorative-card findings.

- [x] **Step 2: Produce one localized recommendation**

Compare keeping the current card, flattening it, or reducing only an unjustified shadow/radius. Recommend no change when the current hierarchy already serves the task.

- [x] **Step 3: Stop at the visual approval gate**

Present the current and proposed local comparison to the user. Do not modify card CSS until that family is approved.

### Task 4: Review summary-color language

**Files:**
- Create: `docs/archive/2026-07-14-summary-color-family-review.md`
- Reference: `WuwaFrontend/src/styles/features/evaluation.css`
- Reference: `WuwaFrontend/src/styles/features/recognition.css`
- Reference: `WuwaFrontend/src/styles/features/statistics.css`

- [x] **Step 1: Inventory every visible summary/callout color**

Classify each as neutral guidance, positive state, warning state, model-specific data, or structural context. Do not require unrelated summaries to share a color when their semantics differ.

- [x] **Step 2: Identify accidental differences only**

Report mismatches where the same semantic role uses different foreground, border, or surface treatment. Preserve deliberate model and state colors.

- [x] **Step 3: Stop at the visual approval gate**

Present one localized before/after recommendation at a time. Do not batch recolor summaries.

Result: the proposed statistics reliability recolor was withdrawn after confirming that `DESIGN.md` permits prediction green for progress. The user chose to keep the existing summary colors, so no summary CSS changed.

### Task 5: Review motion language

**Files:**
- Create: `docs/archive/2026-07-14-motion-language-review.md`
- Reference: `WuwaFrontend/src/styles/features/auth.css`
- Reference: `WuwaFrontend/src/styles/features/history.css`
- Reference: `WuwaFrontend/src/styles/features/workspace.css`
- Reference: `WuwaFrontend/src/styles/features/evaluation.css`

- [x] **Step 1: Inventory keyframes and transitions**

Classify motion as state feedback, loading/progress, structural reveal, or decoration. Flag layout-property animation, content visibility gating, duplicated timings, and missing reduced-motion alternatives.

- [x] **Step 2: Preserve approved functional motion**

Keep the login typing caret, status feedback, progress, and state transitions when they communicate real meaning. Recommend removal only for motion that is purely decorative or slows task flow.

- [x] **Step 3: Stop at the visual approval gate**

Present one localized motion proposal with normal and reduced-motion behavior. Do not perform a global animation rewrite.

Result: the user approved only the evaluation reduced-motion cascade fix. The final override now follows all evaluation animation declarations; normal motion and the remaining motion candidates are unchanged.

### Task 6: Verify and record each completed batch

**Files:**
- Create: `docs/archive/2026-07-14-web-visual-baseline-and-token-completion.md`
- Modify: `docs/superpowers/plans/2026-07-14-web-visual-baselines-and-component-review.md`

- [x] **Step 1: Run focused and full frontend tests**

```powershell
..\.tools\node\npm.cmd test
```

Expected: all tests pass.

- [x] **Step 2: Run the production build**

```powershell
..\.tools\node\npm.cmd run build
```

Expected: Vite exits 0.

- [x] **Step 3: Check repository scope**

```powershell
git diff --check
git status --short
git diff --name-only
```

Expected: no unrelated existing workspace changes are staged or overwritten.

- [x] **Step 4: Record actual results**

Document generated baselines, exact token mappings, browser comparisons, tests, build result, and the three component-family approval states. Do not mark unapproved visual work complete.
