# Wuwa / Tethys Typography System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragmented Web typography with the approved IBM Plex-based system, enforce semantic font roles and real weights, and migrate every visible frontend page without changing layout or business behavior.

**Architecture:** Font packages and semantic tokens live in `styles/tokens.css`; shared numeric and text behavior lives in `styles/base.css`; each feature keeps ownership of its page-level selectors. A source-based Node test enforces allowed weights, sizes, tracking, font roles, and font package usage so later CSS additions cannot reintroduce arbitrary typography.

**Tech Stack:** Vue 3, Vite 8, CSS custom properties, IBM Plex Sans SC, IBM Plex Mono, Node.js `node:test`.

**Design source:** `docs/superpowers/specs/2026-07-13-wuwa-typography-system-design.md`

---

## Scope Check

This plan changes one subsystem: frontend typography. It deliberately does not change page layout, component ownership, API behavior, state management, color semantics, or business copy. Existing uncommitted workspace/prediction work must remain intact.

## Pre-existing Worktree Safety

Before implementation, run:

```powershell
git status --short
git diff -- WuwaFrontend/src/features/workspace/ActiveEchoCapturePanel.vue WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js WuwaFrontend/src/styles/features/workspace-active.css WuwaFrontend/src/styles/features/workspace.css
```

Expected: the four workspace files may already contain unrelated user changes. Preserve those hunks. Stage only files and hunks owned by the typography task; never use `git add .`, `git checkout --`, or `git reset --hard`.

## File Map

### Create

- `WuwaFrontend/src/typography.test.js` — executable typography contract for packages, tokens, weights, sizes, tracking, and semantic font roles.

### Modify

- `WuwaFrontend/package.json` — replace the bundled Noto package with official IBM Plex packages.
- `WuwaFrontend/package-lock.json` — lock the font dependencies.
- `WuwaFrontend/src/styles/tokens.css` — load selected WOFF2 split styles and define the final font tokens.
- `WuwaFrontend/src/styles/base.css` — global text rendering and numeric utility rules.
- `WuwaFrontend/src/styles/controls.css` — shared headings, buttons, labels, forms, and cards.
- `WuwaFrontend/src/styles/shell.css` — topbar, wordmark, UID, hero, and shell typography.
- `WuwaFrontend/src/styles/features/auth.css` — login title, form, brand, and technical Mono typography.
- `WuwaFrontend/src/styles/features/uid-setup.css` — UID onboarding typography.
- `WuwaFrontend/src/styles/features/history.css` — history panel typography.
- `WuwaFrontend/src/styles/features/recognition.css` — recognition typography.
- `WuwaFrontend/src/styles/features/workspace.css` — configuration and tier-matrix typography.
- `WuwaFrontend/src/styles/features/workspace-active.css` — active echo and prediction typography.
- `WuwaFrontend/src/styles/features/statistics.css` — diagnostic and chart typography.
- `WuwaFrontend/src/styles/features/evaluation.css` — evaluation dashboard and model-detail typography.
- `WuwaFrontend/src/architecture.test.js` — replace the old Noto-specific contract with IBM package/import assertions.
- `DESIGN.md` — change the canonical font family and weight definitions.
- `docs/web-ui-design-system-v2.md` — reference the approved typography specification.
- `docs/product-interface-principles.md` — align the cross-product font rule.

### Verify Without Modifying Unless Tests Require It

- `WuwaFrontend/src/App.vue`
- `WuwaFrontend/src/features/auth/LoginView.vue`
- `WuwaFrontend/src/features/workspace/UidSetupView.vue`
- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`
- `WuwaFrontend/src/features/workspace/ActiveEchoCapturePanel.vue`
- `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`
- `WuwaFrontend/src/features/recognition/RecognitionReviewPanel.vue`
- `WuwaFrontend/src/features/statistics/StatisticsView.vue`
- `WuwaFrontend/src/features/evaluation/EvaluationOverview.vue`
- `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`

Existing selectors are sufficient for the first migration. Add template classes only if visual QA proves a mixed-script fragment cannot be targeted semantically from existing markup.

---

### Task 1: Install the Font Resources and Establish Semantic Tokens

**Files:**

- Create: `WuwaFrontend/src/typography.test.js`
- Modify: `WuwaFrontend/package.json`
- Modify: `WuwaFrontend/package-lock.json`
- Modify: `WuwaFrontend/src/styles/tokens.css`
- Modify: `WuwaFrontend/src/architecture.test.js`

- [ ] **Step 1: Write the failing package and token contract**

Create `WuwaFrontend/src/typography.test.js`:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readSource = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), 'utf8')

test('typography uses the approved IBM Plex packages and semantic tokens', async () => {
  const packageJson = JSON.parse(await readSource('../package.json'))
  const tokens = await readSource('./styles/tokens.css')

  assert.equal(packageJson.dependencies['@ibm/plex-sans-sc'], '^1.1.0')
  assert.equal(packageJson.dependencies['@ibm/plex-mono'], '^2.5.0')
  assert.equal(packageJson.dependencies['@fontsource/noto-sans-sc'], undefined)

  assert.match(tokens, /IBMPlexSansSC-Regular\.css/)
  assert.match(tokens, /IBMPlexSansSC-Medium\.css/)
  assert.match(tokens, /IBMPlexSansSC-SemiBold\.css/)
  assert.match(tokens, /IBMPlexSansSC-Bold\.css/)
  assert.match(tokens, /IBMPlexMono-Medium\.css/)
  assert.match(tokens, /IBMPlexMono-SemiBold\.css/)

  for (const token of [
    '--font-cjk',
    '--font-ui',
    '--font-title',
    '--font-latin',
    '--font-data',
    '--font-mono',
    '--text-page-title',
    '--text-section-title',
    '--text-card-title',
    '--text-body',
    '--text-control',
    '--text-label',
    '--text-caption',
    '--text-micro',
    '--text-data-sm',
    '--text-data-md',
    '--text-data-lg',
    '--text-data-xl',
    '--weight-body',
    '--weight-supporting',
    '--weight-label',
    '--weight-control',
    '--weight-data',
    '--weight-title',
    '--weight-emphasis',
    '--leading-data',
    '--leading-title',
    '--leading-control',
    '--leading-label',
    '--leading-caption',
    '--leading-body',
    '--tracking-cjk',
    '--tracking-latin',
    '--tracking-abbr',
    '--tracking-caps',
    '--tracking-brand',
    '--tracking-data',
  ]) {
    assert.match(tokens, new RegExp(token.replace(/[.*+?^$()|[\]\\]/g, '\\$&') + ':'))
  }

  assert.match(tokens, /font-synthesis: none;/)
})
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```powershell
node --test src/typography.test.js
```

Expected: FAIL because IBM dependencies, selected imports, and new semantic tokens do not exist.

- [ ] **Step 3: Replace the font dependencies**

Run from `WuwaFrontend`:

```powershell
$env:IBM_TELEMETRY_DISABLED = 'true'
npm uninstall @fontsource/noto-sans-sc
npm install @ibm/plex-sans-sc@^1.1.0 @ibm/plex-mono@^2.5.0
```

Do not import the package-wide `all.css` or `default.css` files. They reference extra weights. Use only these split WOFF2 CSS entries at the top of `tokens.css`:

```css
@import "@ibm/plex-sans-sc/fonts/split/woff2/hinted/IBMPlexSansSC-Regular.css";
@import "@ibm/plex-sans-sc/fonts/split/woff2/hinted/IBMPlexSansSC-Medium.css";
@import "@ibm/plex-sans-sc/fonts/split/woff2/hinted/IBMPlexSansSC-SemiBold.css";
@import "@ibm/plex-sans-sc/fonts/split/woff2/hinted/IBMPlexSansSC-Bold.css";
@import "@ibm/plex-mono/fonts/split/woff2/IBMPlexMono-Medium.css";
@import "@ibm/plex-mono/fonts/split/woff2/IBMPlexMono-SemiBold.css";
```

Delete the three existing handwritten `@font-face` blocks for `Wuwa CJK`. Replace the current font, type-size, weight, leading, and tracking section in `:root` with the exact token block from section 17 of the design specification.

- [ ] **Step 4: Update the architecture contract**

In `architecture.test.js`, replace the old `@fontsource/noto-sans-sc` assertions with:

```js
assert.equal(packageJson.dependencies['@ibm/plex-sans-sc'], '^1.1.0')
assert.equal(packageJson.dependencies['@ibm/plex-mono'], '^2.5.0')
assert.equal(packageJson.dependencies['@fontsource/noto-sans-sc'], undefined)
assert.match(tokens, /IBMPlexSansSC-Regular\.css/)
assert.match(tokens, /IBMPlexSansSC-Medium\.css/)
assert.match(tokens, /IBMPlexSansSC-SemiBold\.css/)
assert.match(tokens, /IBMPlexSansSC-Bold\.css/)
assert.match(tokens, /IBMPlexMono-Medium\.css/)
assert.match(tokens, /IBMPlexMono-SemiBold\.css/)
assert.match(tokens, /--font-cjk: "IBM Plex Sans SC"/)
assert.match(tokens, /--font-latin: "IBM Plex Sans SC"/)
assert.match(tokens, /--font-data: "IBM Plex Sans SC"/)
assert.match(tokens, /--font-mono: "IBM Plex Mono"/)
```

Remove assertions that require `Wuwa CJK` aliases, Noto file URLs, three Noto weights, or the old 800 metric token.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
node --test src/typography.test.js src/architecture.test.js
```

Expected: both test files PASS.

- [ ] **Step 6: Commit the font foundation**

```powershell
git add WuwaFrontend/package.json WuwaFrontend/package-lock.json WuwaFrontend/src/styles/tokens.css WuwaFrontend/src/typography.test.js WuwaFrontend/src/architecture.test.js
git commit -m "style: establish IBM Plex typography foundation"
```

---

### Task 2: Enforce and Migrate Shared Typography

**Files:**

- Modify: `WuwaFrontend/src/typography.test.js`
- Modify: `WuwaFrontend/src/styles/base.css`
- Modify: `WuwaFrontend/src/styles/controls.css`
- Modify: `WuwaFrontend/src/styles/shell.css`

- [ ] **Step 1: Add reusable CSS audit helpers and a failing shared-style test**

Append to `typography.test.js`:

```js
const allowedWeights = new Set([400, 500, 600, 700])

function assertTypographyValues(source, label) {
  for (const match of source.matchAll(/font-weight\s*:\s*(\d+)/g)) {
    const weight = Number(match[1])
    assert.ok(allowedWeights.has(weight), label + ' uses unsupported weight ' + weight)
  }

  for (const match of source.matchAll(/font-size\s*:\s*([^;]+)/g)) {
    const pxValues = [...match[1].matchAll(/(\d+(?:\.\d+)?)px/g)].map((item) => Number(item[1]))
    for (const size of pxValues) {
      assert.ok(Number.isInteger(size), label + ' uses fractional px size ' + size)
      assert.ok(size >= 11, label + ' uses text smaller than 11px: ' + size)
    }
  }

  for (const match of source.matchAll(/letter-spacing\s*:\s*([^;]+)/g)) {
    const value = match[1].trim()
    assert.ok(
      value === '0' || value.startsWith('var(--tracking-'),
      label + ' uses raw tracking value ' + value,
    )
  }
}

async function assertStyleGroup(relativePaths, label) {
  const sources = await Promise.all(relativePaths.map(readSource))
  for (let index = 0; index < sources.length; index += 1) {
    assertTypographyValues(sources[index], label + ': ' + relativePaths[index])
  }
}

test('shared styles use the approved typography values', async () => {
  await assertStyleGroup([
    './styles/base.css',
    './styles/controls.css',
    './styles/shell.css',
  ], 'shared styles')
})
```

- [ ] **Step 2: Run the shared audit and verify RED**

Run:

```powershell
node --test --test-name-pattern="shared styles" src/typography.test.js
```

Expected: FAIL on raw 800/900 weights or raw non-zero tracking values in `controls.css` / `shell.css`.

- [ ] **Step 3: Normalize global numeric utilities**

Keep the existing numeric selector group in `base.css` and make it the canonical data primitive:

```css
.data-number,
.metric-value,
.rank-value,
.score-value,
.percent-value {
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
  letter-spacing: var(--tracking-data);
}
```

Add no global font-weight to this group; each component selects 600 or 700 by semantic importance.

- [ ] **Step 4: Migrate shared controls**

Apply these role mappings in `controls.css`:

| Selector/role | Target |
|---|---|
| `.eyebrow` | 12px/600/1.3; CJK tracking; uppercase only when content is genuinely Latin |
| `.display-title` | page-title/700/title-leading |
| `.section-heading h2` | section-title/700/title-leading |
| `.section-heading p` | body/400/body-leading |
| primary/secondary/danger buttons | control/600/control-leading |
| legends and form labels | label/600/label-leading |
| inputs and selects | body/400/body-leading |
| empty/error/help text | body or caption; 400/500 |

Replace raw non-zero letter spacing with the appropriate tracking token. Map 800/900 to 700; map control-oriented 700 to 600 where the design specification calls for Semibold.

- [ ] **Step 5: Migrate the application shell**

Apply these exact shell roles in `shell.css`:

| Selector | Target declaration |
|---|---|
| `.wordmark` | `font-family: var(--font-latin); font-size: 16px; font-weight: 600; line-height: 1.1; letter-spacing: var(--tracking-brand);` |
| `.pill-tabs button` | 14px/600/control-leading/CJK tracking |
| `.uid-chip-label` | 12px/600/abbr tracking |
| `.uid-chip-value` | data font, 15px/600/data-leading/data tracking |
| `.uid-switcher-*` labels | 12–14px/500 or 600 based on interaction |
| `.hero-band.compact h1` | page-title/700/title-leading |
| `.hero-stats strong` | data-xl/700/data-leading |
| `.hero-stats span` | label/600/label-leading |
| `.metric-delta-badge` | micro/600/data-leading |

Replace fluid product heading `clamp()` declarations with fixed desktop values and existing 860px/520px media-query overrides. The login display heading remains owned by `auth.css` and is handled later.

- [ ] **Step 6: Verify shared GREEN**

Run:

```powershell
node --test --test-name-pattern="shared styles" src/typography.test.js
node --test src/App.test.js src/architecture.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit shared typography**

```powershell
git add WuwaFrontend/src/typography.test.js WuwaFrontend/src/styles/base.css WuwaFrontend/src/styles/controls.css WuwaFrontend/src/styles/shell.css
git commit -m "style: normalize shared product typography"
```

---

### Task 3: Migrate Login, UID, History, and Recognition

**Files:**

- Modify: `WuwaFrontend/src/typography.test.js`
- Modify: `WuwaFrontend/src/styles/features/auth.css`
- Modify: `WuwaFrontend/src/styles/features/uid-setup.css`
- Modify: `WuwaFrontend/src/styles/features/history.css`
- Modify: `WuwaFrontend/src/styles/features/recognition.css`

- [ ] **Step 1: Add the supporting-view audit**

Append:

```js
test('supporting views use the approved typography values', async () => {
  await assertStyleGroup([
    './styles/features/auth.css',
    './styles/features/uid-setup.css',
    './styles/features/history.css',
    './styles/features/recognition.css',
  ], 'supporting views')
})
```

- [ ] **Step 2: Verify RED**

```powershell
node --test --test-name-pattern="supporting views" src/typography.test.js
```

Expected: FAIL on 650/800/900 weights, fractional tracking, or unsupported small sizes.

- [ ] **Step 3: Migrate login typography**

Use these roles in `auth.css`:

| Selector | Target |
|---|---|
| `.terminal-brand` | UI font, 16px/600; brand fragment uses brand tracking |
| `.terminal-system-status` | Mono, 12px/600/caps tracking |
| `.terminal-subtitle` | Mono, 12px/500/caps tracking |
| `.terminal-title` | 56px/700/1.1 desktop; 48px at 860px; 36px at 520px |
| `.terminal-feature-text h4` | 16px/600/1.25 |
| `.terminal-tab-btn` | 14px/600/control-leading |
| `.terminal-input-group` | label/600; only the field label uses Mono if the terminal style requires it |
| `.terminal-standard-input` | UI font, 14px/400/body-leading |
| `.terminal-primary-btn` | Mono, 14px/600/abbr tracking |
| `.terminal-form-options` | 13px/500 |

Remove all `clamp()` typography from `auth.css` and use fixed media-query values.

- [ ] **Step 4: Migrate UID setup, history, and recognition**

Use:

- UID page title: page-title/700; explanation: body/400; hints: caption/500; UID input: data font and tabular numbers.
- History panel title: card-title/700; list primary: control/600; status: caption/600; metadata: caption/500; numbers: data-sm/600.
- Recognition title: card-title/700; summary numbers: data-md/600 or data-lg/700; statuses: caption/600; metadata: caption/500.

Change 650 to 600 for controls/statuses, 700 for titles; change 11px interaction text to 12px; keep 11px only for non-interactive chart-like metadata.

- [ ] **Step 5: Verify GREEN**

```powershell
node --test --test-name-pattern="supporting views" src/typography.test.js
node --test src/features/auth/LoginView.test.js src/features/workspace/UidSetupView.test.js src/features/history/FloatingHistoryPanel.test.js src/features/recognition/RecognitionReviewPanel.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit supporting pages**

```powershell
git add WuwaFrontend/src/typography.test.js WuwaFrontend/src/styles/features/auth.css WuwaFrontend/src/styles/features/uid-setup.css WuwaFrontend/src/styles/features/history.css WuwaFrontend/src/styles/features/recognition.css
git commit -m "style: align supporting views typography"
```

---

### Task 4: Migrate Workbench and Statistics Typography

**Files:**

- Modify: `WuwaFrontend/src/typography.test.js`
- Modify: `WuwaFrontend/src/styles/features/workspace.css`
- Modify: `WuwaFrontend/src/styles/features/workspace-active.css`
- Modify: `WuwaFrontend/src/styles/features/statistics.css`

- [ ] **Step 1: Add the workbench/statistics audit**

Append:

```js
test('workbench and statistics use the approved typography values', async () => {
  await assertStyleGroup([
    './styles/features/workspace.css',
    './styles/features/workspace-active.css',
    './styles/features/statistics.css',
  ], 'workbench and statistics')
})
```

- [ ] **Step 2: Verify RED**

```powershell
node --test --test-name-pattern="workbench and statistics" src/typography.test.js
```

Expected: FAIL on 650/720/740/760 weights or 11px interaction text.

- [ ] **Step 3: Migrate configuration and tier matrix**

In `workspace.css` apply:

| Role | Target |
|---|---|
| configuration title | section-title/700 |
| description | body/400/body-leading |
| field legend | label/600 |
| option text | control/600 |
| matrix stat name | card-title/700 |
| tier value | data-md/600/data-leading |
| tier unit | label/500 |
| probability | caption/500/data font |

Use `--tracking-abbr` only for visible `COST` or `UID` abbreviations. Other Chinese text uses `--tracking-cjk`.

- [ ] **Step 4: Migrate active echo and prediction**

In `workspace-active.css` apply:

| Selector | Target |
|---|---|
| `.active-echo-name-title` | 28px/700/1.1; 24px at narrow breakpoint |
| `.active-record-pill` | caption/600/control-leading |
| `.active-record-count-badge` | data-sm/600/data-leading |
| `.roll-name` | control/600 |
| recorded roll value | data-md/600/data-leading |
| prediction heading | caption/600 |
| prediction label | caption/600 |
| prediction probability | caption/600/data font |
| buttons | control/600 |

Preserve all existing layout and prediction-color changes in the dirty worktree. Only edit typography declarations.

- [ ] **Step 5: Migrate statistics**

In `statistics.css`:

- Page/section title: section-title/700.
- Diagnostic label: label/600.
- Diagnostic value: data-lg/700.
- Chart category: label/600.
- Chart count and percentage: data-sm/600.
- Chart axes: caption/500, with micro/500 only where space is genuinely constrained.
- Explanations: label or body size with 400/500.
- Replace 740/760 with semantic data/title tokens.

- [ ] **Step 6: Verify GREEN**

```powershell
node --test --test-name-pattern="workbench and statistics" src/typography.test.js
node --test src/features/workspace/EchoWorkbenchView.test.js src/features/statistics/StatisticsView.test.js src/App.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit workbench and statistics**

Use patch staging for the pre-existing dirty workspace files:

```powershell
git add -p WuwaFrontend/src/styles/features/workspace.css
git add -p WuwaFrontend/src/styles/features/workspace-active.css
git add WuwaFrontend/src/typography.test.js WuwaFrontend/src/styles/features/statistics.css
git diff --cached --check
git commit -m "style: unify workbench and statistics typography"
```

Confirm the cached diff contains typography hunks only.

---

### Task 5: Normalize the Evaluation Typography

**Files:**

- Modify: `WuwaFrontend/src/typography.test.js`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css`

- [ ] **Step 1: Add the evaluation audit**

Append:

```js
test('evaluation uses the approved typography values', async () => {
  await assertStyleGroup([
    './styles/features/evaluation.css',
  ], 'evaluation')
})
```

- [ ] **Step 2: Verify RED**

```powershell
node --test --test-name-pattern="evaluation" src/typography.test.js
```

Expected: FAIL on 10px, 11.5px, 12.5px, 14.5px and 610/620/650/680/720/740/750/760 weights.

- [ ] **Step 3: Apply the evaluation role map**

Process `evaluation.css` by selector role, not by blind global replacement:

| Existing semantic role | Target |
|---|---|
| page and major section title | 21px/700/title-leading |
| card and chart title | 16px/700/control-leading |
| model name | 16px/600/control-leading |
| status chip, legend, table head | 12–13px/500 or 600 |
| technical explanation | 12–13px/500/1.45 |
| ordinary metric | 18px/600/data-leading |
| primary metric | 24px/700/data-leading |
| page-level score | 30px/700/data-leading |
| chart axis | 12px/500; 11px only when required |
| Loss/Brier/model parameter | data or Latin font, never Mono by default |

Apply the exact size migration table from section 18.2 of the design specification. Remove every 10px and fractional px declaration. Replace all unsupported weights by semantic tokens or 400/500/600/700.

- [ ] **Step 4: Normalize tracking**

- Chinese labels and titles: `var(--tracking-cjk)`.
- ordinary Latin/model names: `var(--tracking-latin)`.
- abbreviations: `var(--tracking-abbr)`.
- numeric values: `var(--tracking-data)`.
- remove raw non-zero values and any negative tracking.

- [ ] **Step 5: Verify GREEN**

```powershell
node --test --test-name-pattern="evaluation" src/typography.test.js
node --test src/features/evaluation/EvaluationOverview.test.js src/features/evaluation/EvaluationBacktest.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit evaluation typography**

```powershell
git add WuwaFrontend/src/typography.test.js WuwaFrontend/src/styles/features/evaluation.css
git diff --cached --check
git commit -m "style: normalize evaluation typography"
```

---

### Task 6: Add Semantic Role Assertions

**Files:**

- Modify: `WuwaFrontend/src/typography.test.js`
- Modify only if needed: `WuwaFrontend/src/styles/base.css`
- Modify only if needed: `WuwaFrontend/src/styles/shell.css`
- Modify only if needed: `WuwaFrontend/src/styles/features/auth.css`
- Modify only if needed: feature CSS files already migrated

- [ ] **Step 1: Write the failing semantic-role test**

Append:

```js
test('brand, technical text, and comparable numbers use semantic font roles', async () => {
  const base = await readSource('./styles/base.css')
  const shell = await readSource('./styles/shell.css')
  const auth = await readSource('./styles/features/auth.css')

  assert.match(shell, /\.wordmark\s*\{[^}]*font-family:\s*var\(--font-latin\);[^}]*letter-spacing:\s*var\(--tracking-brand\);/s)
  assert.match(shell, /\.uid-chip-value\s*\{[^}]*font-family:\s*var\(--font-data\);/s)
  assert.match(auth, /\.terminal-system-status\s*\{[^}]*font-family:\s*var\(--font-mono\);[^}]*letter-spacing:\s*var\(--tracking-caps\);/s)
  assert.match(base, /\.data-number,[\s\S]*\.percent-value\s*\{[^}]*font-family:\s*var\(--font-data\);[^}]*font-variant-numeric:\s*tabular-nums;[^}]*font-feature-settings:\s*"tnum";/s)
})
```

- [ ] **Step 2: Run and verify RED if any role is missing**

```powershell
node --test --test-name-pattern="semantic font roles" src/typography.test.js
```

Expected: FAIL only for roles not applied during earlier tasks.

- [ ] **Step 3: Add the minimal missing declarations**

Add only the declarations named by the failing assertion. Do not add new template classes unless the existing selectors cannot express the role.

- [ ] **Step 4: Verify GREEN**

```powershell
node --test src/typography.test.js
```

Expected: all typography contract tests PASS.

- [ ] **Step 5: Commit semantic enforcement**

```powershell
git add WuwaFrontend/src/typography.test.js WuwaFrontend/src/styles/base.css WuwaFrontend/src/styles/shell.css WuwaFrontend/src/styles/features/auth.css
git diff --cached --check
git commit -m "test: enforce semantic typography roles"
```

If some listed CSS files did not change, omit them from `git add`.

---

### Task 7: Align Canonical Documentation

**Files:**

- Modify: `DESIGN.md`
- Modify: `docs/web-ui-design-system-v2.md`
- Modify: `docs/product-interface-principles.md`
- Verify: `docs/superpowers/specs/2026-07-13-wuwa-typography-system-design.md`

- [ ] **Step 1: Update `DESIGN.md`**

Replace `Wuwa CJK` definitions with:

- Display/Body: IBM Plex Sans SC and approved fallbacks.
- Label/Mono: IBM Plex Sans SC for product labels; IBM Plex Mono only for technical metadata.
- Real weights: 400/500/600/700.
- Link to the final typography design specification.

Update the named rules to include:

- separate semantic entries for CJK, Latin, data, and Mono;
- Chinese tracking 0;
- tabular comparable numbers;
- no unsupported numeric weights;
- minimum sizes from the specification.

- [ ] **Step 2: Update active product documents**

Add a short “字体系统” paragraph to each active document:

```markdown
Web 字体以 `docs/superpowers/specs/2026-07-13-wuwa-typography-system-design.md` 为准：IBM Plex Sans SC 承担中文与常规 UI，IBM Plex Mono 只承担短技术信息；中文、拉丁、数字使用独立语义入口，正式字重为 400/500/600/700。
```

Remove the old instruction that requires `@fontsource/noto-sans-sc`.

- [ ] **Step 3: Verify documentation consistency**

Run:

```powershell
rg -n "Wuwa CJK|@fontsource/noto-sans-sc|font-weight: (650|680|720|740|750|760|800|900)" DESIGN.md docs/web-ui-design-system-v2.md docs/product-interface-principles.md
```

Expected: no active typography rule requires the old font or unsupported weights. Historical documents outside these three files are not rewritten.

- [ ] **Step 4: Commit documentation**

```powershell
git add DESIGN.md docs/web-ui-design-system-v2.md docs/product-interface-principles.md docs/superpowers/specs/2026-07-13-wuwa-typography-system-design.md
git commit -m "docs: define the Tethys typography system"
```

---

### Task 8: Full Verification and Visual QA

**Files:**

- Verify all modified files.
- Do not change code unless a failed check identifies a concrete issue.

- [ ] **Step 1: Run static searches**

```powershell
rg -n --glob '*.css' 'font-weight:\s*(610|620|650|680|720|740|750|760|800|900)' WuwaFrontend/src
rg -n --glob '*.css' 'font-size:\s*(10px|[0-9]+\.5px)' WuwaFrontend/src
rg -n --glob '*.css' 'letter-spacing:\s*(-?[0-9.]+(?:px|em))' WuwaFrontend/src
```

Expected:

- no unsupported weight matches;
- no 10px or half-pixel font size matches;
- non-zero tracking is expressed through semantic tokens rather than raw values.

- [ ] **Step 2: Run the complete test suite**

```powershell
npm test
```

Expected: all tests pass with 0 failures.

- [ ] **Step 3: Run the production build**

```powershell
npm run build
```

Expected: Vite exits 0.

- [ ] **Step 4: Audit built font assets**

```powershell
Get-ChildItem -Recurse dist -Filter *.woff2 | Group-Object { if ($_.Name -match 'IBMPlexSansSC-(Regular|Medium|SemiBold|Bold)') { $Matches[1] } elseif ($_.Name -match 'IBMPlexMono-(Medium|SemiBold)') { 'Mono-' + $Matches[1] } else { 'Unexpected' } } | Select-Object Name,Count
```

Expected:

- only Sans SC Regular/Medium/SemiBold/Bold split assets;
- only Mono Medium/SemiBold split assets;
- no Thin, ExtraLight, Light, Text, 800/900, or italic assets;
- no complete 3–4MB Sans SC WOFF2 files.

- [ ] **Step 5: Perform browser visual QA**

At desktop widths 1920 and 1366, and mobile width 390, inspect:

1. Login.
2. UID binding.
3. Workbench topbar and hero.
4. Configuration, active echo, prediction, and tier matrix.
5. History and recognition.
6. Statistics.
7. Evaluation overview and expanded model details.
8. Light and dark themes.

For each state verify:

- IBM Plex renders for Chinese without fallback gaps.
- `TETHYS` tracking is restrained and centered with its symbol.
- UID, probabilities, sample counts, ranks, and ratios align.
- no action or help text falls below the readable minimum.
- no title wraps unexpectedly at 1366 or 390.
- no component height or grid alignment regresses after the font-metric change.
- keyboard focus and 200% text zoom remain usable.

- [ ] **Step 6: Check final diff and worktree safety**

```powershell
git diff --check
git status --short
git diff -- WuwaFrontend/src/features/workspace/ActiveEchoCapturePanel.vue WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js
```

Expected: no whitespace errors; pre-existing non-typography changes are preserved and not accidentally staged.

- [ ] **Step 7: Commit any verified visual corrections**

Only if QA required corrections:

```powershell
git add -p WuwaFrontend/src/styles
git diff --cached --check
git commit -m "style: finish typography visual QA"
```

Do not create an empty commit.

## Final Acceptance Checklist

- [ ] IBM Plex Sans SC and IBM Plex Mono are self-hosted from official packages.
- [ ] Only required weights/styles are referenced.
- [ ] Semantic tokens distinguish CJK, Latin, data, and Mono roles.
- [ ] All local CSS numeric weights are 400/500/600/700.
- [ ] No 10px or half-pixel font sizes remain.
- [ ] Non-zero tracking uses named tokens.
- [ ] Comparable numbers use tabular numerals.
- [ ] All feature pages match the design specification.
- [ ] Full tests and production build pass.
- [ ] Desktop/mobile and light/dark visual QA pass.
- [ ] Existing unrelated worktree changes remain preserved.
