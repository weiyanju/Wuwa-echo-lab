# Web State Accent Audit Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the incomplete Web edge-accent audit by removing the remaining decorative side stripe and redundant evaluation-card top rails while preserving the approved functional Bayes path marker and other data graphics.

**Architecture:** Keep all production changes inside the existing evaluation feature stylesheet and strengthen the existing cross-feature static design guard. The guard scans Web CSS rules rather than test source text, applies a small named allowlist for functional graphics, and adds selector-specific checks for the approved evaluation design.

**Tech Stack:** Vue 3, feature-scoped CSS, Node.js built-in test runner, Vite, impeccable local detector

---

### Task 1: Add failing whole-Web edge-accent guard tests

**Files:**
- Modify: `WuwaFrontend/src/design-state-accent.test.js`
- Test: `WuwaFrontend/src/design-state-accent.test.js`

- [x] **Step 1: Replace the four-file side-accent scan with a CSS-only whole-Web scan**

Add all style owners and parse their rule bodies so regex text inside JavaScript tests cannot become a false positive:

```js
const styleFiles = [
  './styles/base.css',
  './styles/controls.css',
  './styles/shell.css',
  './styles/tokens.css',
  './styles/features/auth.css',
  './styles/features/evaluation.css',
  './styles/features/history.css',
  './styles/features/recognition.css',
  './styles/features/statistics.css',
  './styles/features/uid-setup.css',
  './styles/features/workspace.css',
  './styles/features/workspace-active.css',
]

function cssRules(source) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1].replace(/\s+/g, ' ').trim(),
    body: match[2],
  }))
}

function selectorParts(selector) {
  return selector.split(',').map((part) => part.trim())
}
```

- [x] **Step 2: Add semantic side-accent detection with explicit functional exceptions**

Use a narrow allowlist whose entries can be reviewed by name. `bayes-path-list article::before` is the user-approved path encoding; the other entries are cursors, arrowheads, bullets, or chart markers:

```js
const functionalSideLineSelectors = new Set([
  '.terminal-title',
  '.terminal-brand-icon::after',
  '.wordmark-symbol::after',
  '.bayes-path-list article::before',
  '.markov-time-legend b::after',
  '.markov-axis-line::after',
  '.rule-deviation-axis b::after',
  '.rule-deviation-chart .warn .rule-deviation-axis b::after',
  '.model-insight-side li::before',
])

function hasThickSideBorder(body) {
  return [...body.matchAll(/border-(?:left|right)(?:-width)?:\s*(\d+(?:\.\d+)?)px\b/g)]
    .some((match) => Number(match[1]) > 1)
}

function hasHorizontalInsetStripe(body) {
  return [...body.matchAll(/box-shadow:[^;]*inset\s+(-?\d+(?:\.\d+)?)px\s+0(?:\s+0)?\b/g)]
    .some((match) => Math.abs(Number(match[1])) > 1)
}

function hasPseudoSideStripe(selector, body) {
  const width = body.match(/\bwidth:\s*(\d+(?:\.\d+)?)px\b/)
  return /::(?:before|after)/.test(selector)
    && /\bposition:\s*absolute\b/.test(body)
    && /\b(?:left|right|inset):/.test(body)
    && Boolean(width && Number(width[1]) > 1)
    && /\bbackground(?:-image)?:/.test(body)
}
```

Assert that every detected rule is either clean or explicitly allowlisted:

```js
const violations = rules.filter(({ selector, body }) => {
  const parts = selectorParts(selector)
  const exempt = parts.every((part) => functionalSideLineSelectors.has(part))
  return !exempt && (
    hasThickSideBorder(body)
    || hasHorizontalInsetStripe(body)
    || hasPseudoSideStripe(selector, body)
  )
})

assert.deepEqual(violations, [])
```

- [x] **Step 3: Add selector-specific assertions for the approved evaluation treatment**

Add helpers that collect every body belonging to one selector, including grouped dark-theme rules:

```js
function bodiesFor(source, target) {
  return cssRules(source)
    .filter(({ selector }) => selectorParts(selector).includes(target))
    .map(({ body }) => body)
    .join('\n')
}
```

Assert the remaining decorative rail is removed, Bayes encoding remains, and the five top-accent families are clean:

```js
assert.doesNotMatch(evaluationStyle, /\.model-detail-thumb::before\s*\{/)
assert.match(bodiesFor(evaluationStyle, '.bayes-path-list article::before'), /width:\s*3px/)
assert.match(
  bodiesFor(evaluationStyle, '.bayes-path-list article.secondary::before'),
  /repeating-linear-gradient/
)

for (const selector of [
  '.cycle-window-grid article',
  '.model-group-bars div',
  '.model-bars-large div',
  '.markov-penalty-grid article',
  '.model-bars article.expanded',
  '.model-bars article.best',
  '.model-bars article.best.expanded',
]) {
  const bodies = bodiesFor(evaluationStyle, selector)
  const thickTopBorders = [...bodies.matchAll(/border-top:\s*(\d+(?:\.\d+)?)px/g)]
    .filter((match) => Number(match[1]) > 1)
  const thickTopInsets = [...bodies.matchAll(/box-shadow:\s*inset\s+0\s+(-?\d+(?:\.\d+)?)px/g)]
    .filter((match) => Math.abs(Number(match[1])) > 1)
  assert.deepEqual(thickTopBorders, [])
  assert.deepEqual(thickTopInsets, [])
}

assert.doesNotMatch(
  evaluationStyle,
  /border-top-color:\s*color-mix\(in srgb, var\(--window-accent, var\(--model-accent\)\)/
)
```

- [x] **Step 4: Run the guard and verify the red state**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src/design-state-accent.test.js
```

Expected: FAIL. The failure must name `.model-detail-thumb::before` and/or one of the existing `border-top` / `inset 0 3px` rules. The Bayes retention assertions must pass.

### Task 2: Implement the approved restrained evaluation styling

**Files:**
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:565-573`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:1253-1303`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:1900-1907`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:2431-2438`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:2659-2668`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:2893-2900`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:3266-3295`
- Test: `WuwaFrontend/src/design-state-accent.test.js`

- [x] **Step 1: Remove the dormant model-detail thumbnail side stripe**

Delete the complete `.model-detail-thumb::before` and `.model-detail-thumb.active::before` rules. Remove the now-unused `transform 160ms ease` entry so the remaining transition is:

```css
.model-detail-thumb {
  transition:
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}
```

Do not change `.model-detail-thumb:hover`, `:focus-visible`, or `.active`; their complete border and surface continue to express state.

- [x] **Step 2: Remove the redundant top borders from evaluation data cards**

For each of the following rules, keep the existing full `border: 1px solid #dce5ec` declaration and delete only the thicker `border-top` declaration:

```css
.cycle-window-grid article { border: 1px solid #dce5ec; }
.model-group-bars div { border: 1px solid #dce5ec; }
.model-bars-large div { border: 1px solid #dce5ec; }
.markov-penalty-grid article { border: 1px solid #dce5ec; }
```

In the grouped dark-theme rule for those four families, delete `border-top-color`; retain the uniform dark `border-color`, semantic background tint, and `box-shadow: none`.

- [x] **Step 3: Remove model-row top inset rails without changing state semantics**

Delete these three exact declarations from their respective rules:

```css
box-shadow: inset 0 3px 0 rgba(47, 131, 216, 0.34);
box-shadow: inset 0 3px 0 rgba(44, 159, 112, 0.38);
box-shadow: inset 0 3px 0 rgba(44, 159, 112, 0.42);
```

The affected selectors are:

```css
.model-bars article.expanded
.model-bars article.best
.model-bars article.best.expanded
```

Retain their existing full borders, backgrounds, `最高命中` badge, hit-rate color, progress track, expansion button, and disabled-state `box-shadow: none`.

- [x] **Step 4: Preserve the approved Bayes path marker unchanged**

Confirm these rules remain byte-for-byte present apart from unrelated formatter changes:

```css
.bayes-path-list article::before { width: 3px; }
.bayes-path-list article.primary::before { background: #31a872; }
.bayes-path-list article.secondary::before {
  background: repeating-linear-gradient(
    to bottom,
    #8c80c8 0,
    #8c80c8 6px,
    transparent 6px,
    transparent 10px
  );
}
```

- [x] **Step 5: Run the targeted guard and verify green**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src/design-state-accent.test.js
```

Expected: PASS with no side-accent or top-accent assertion failures.

### Task 3: Run technical and visual verification

**Files:**
- Verify: `WuwaFrontend/src/styles/features/evaluation.css`
- Verify: `WuwaFrontend/src/design-state-accent.test.js`

- [x] **Step 1: Run the affected component tests**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src/design-state-accent.test.js src/features/evaluation/EvaluationBacktest.test.js src/App.test.js src/architecture.test.js
```

Expected: PASS.

- [x] **Step 2: Run the complete frontend suite**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test
```

Expected: all tests pass with 0 failures.

- [x] **Step 3: Run the production build**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd run build
```

Expected: Vite exits with code 0 and produces the normal build summary.

- [x] **Step 4: Re-run the relevant impeccable detector family**

Run the detector against the production stylesheet and filter only the edge-accent families relevant to this correction:

```powershell
cd WuwaFrontend
$detector = Join-Path $HOME '.agents\skills\impeccable\scripts\detect.mjs'
$findings = (& ..\.tools\node\node.exe $detector --json 'src\styles\features\evaluation.css' 2>$null) | ConvertFrom-Json
$edgeFindings = @($findings | Where-Object { $_.antipattern -in @('side-tab', 'border-accent-on-rounded') })
$edgeFindings | Format-Table antipattern,file,line,snippet -AutoSize
if ($edgeFindings.Count -gt 0) { exit 1 }
```

Expected: no `side-tab` or `border-accent-on-rounded` findings in `evaluation.css`.

- [x] **Step 5: Check for a reusable real evaluation session without modifying local PostgreSQL data**

Use the user's existing authenticated local session if available. At desktop width and a narrow breakpoint, inspect:

- the expanded best-model row has no colored top rail;
- the Exact/Wildcard cards retain their internal solid/dashed path marker;
- cycle-window, group-weight, large-bar, and Markov-penalty cards use a uniform 1px perimeter;
- progress bars, arrowheads, chart axes, labels, and values remain visible;
- light and dark themes preserve hierarchy without overflow or overlap.

If browser automation cannot access the local URL, request a screenshot from the existing session and record that limitation explicitly rather than creating accounts or fake business data.

- [x] **Step 6: Check repository hygiene**

Run from the repository root:

```powershell
git diff --check
git status --short
```

Expected: `git diff --check` prints no whitespace errors; status contains no generated `dist/`, logs, caches, databases, or brainstorm artifacts.

### Task 4: Correct the audit evidence and close the implementation record

**Files:**
- Modify: `docs/archive/2026-07-13-web-state-accent-polish-implementation.md`
- Modify: `docs/archive/2026-07-13-project-documentation-audit.md`
- Modify: `docs/superpowers/plans/2026-07-13-web-state-accent-polish.md`

- [x] **Step 1: Record the second audit and the approved exception**

Add a “二次复核纠正” section to the implementation record containing:

```markdown
## 二次复核纠正

- 首轮守卫只覆盖四个 feature CSS，并漏掉伪元素与粗顶部强调，原“全站已解决”结论过早。
- 删除 `model-detail-thumb::before` 的遗留 3px 装饰侧条。
- 按用户确认保留 Bayes 卡片内部的实线/虚线路径编码，并将豁免限定到该选择器。
- 移除评估页五组无数据含义的粗顶部强调，保留完整 1px 边框、语义表面、标签和数据图形。
```

Replace old test counts and browser statements with the actual commands and results from Task 3. Do not claim automated visual verification if only a user screenshot was available.

- [x] **Step 2: Correct the project audit conclusion**

Update the P1 processing result so it states that the first resolution was re-opened after the missed pseudo/top-edge review and closed only after the second guard, tests, build, and available visual evidence passed. Explicitly state that the Bayes marker is retained as functional path encoding rather than a general exception for card side accents.

- [x] **Step 3: Mark completed plan checkboxes and run the final documentation checks**

Mark only steps with recorded evidence as complete, then run:

```powershell
$markers = @('T' + 'BD', 'TO' + 'DO', '待' + '定', '未验' + '证')
Select-String -Pattern $markers -Path docs/superpowers/plans/2026-07-13-web-state-accent-polish.md,docs/archive/2026-07-13-web-state-accent-polish-implementation.md
git diff --check
```

Expected: no placeholders; any intentionally unverified visual item is written as a concrete limitation rather than a future placeholder; no whitespace errors.

- [x] **Step 4: Review the complete scoped diff before any commit**

Run:

```powershell
git diff -- WuwaFrontend/src/design-state-accent.test.js WuwaFrontend/src/styles/features/evaluation.css docs/archive/2026-07-13-web-state-accent-polish-implementation.md docs/archive/2026-07-13-project-documentation-audit.md docs/superpowers/plans/2026-07-13-web-state-accent-polish.md
```

Expected: the diff contains only the approved guard, evaluation styling, evidence corrections, and plan status. Do not stage unrelated working-tree changes.

### Task 5: Commit the completed state-accent feature as an isolated change

**Files:**
- Stage only: `WuwaFrontend/src/design-state-accent.test.js`
- Stage only: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`
- Stage only: `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`
- Stage only: `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`
- Stage only: `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`
- Stage only: `WuwaFrontend/src/styles/features/auth.css`
- Stage only: `WuwaFrontend/src/styles/features/evaluation.css`
- Stage only: `WuwaFrontend/src/styles/features/history.css`
- Stage only: `WuwaFrontend/src/styles/features/workspace.css`
- Stage only: `docs/archive/2026-07-13-web-state-accent-polish-implementation.md`
- Stage only: `docs/archive/2026-07-13-project-documentation-audit.md`
- Stage only: `docs/superpowers/plans/2026-07-13-web-state-accent-polish.md`

- [x] **Step 1: Confirm every staged source change belongs to the approved feature**

First inspect the complete diffs for the listed files. If a file contains unrelated edits, do not stage the file until the unrelated hunk has been separated with the user’s approval.

- [x] **Step 2: Stage the explicitly scoped files**

Run from the repository root:

```powershell
git add -- WuwaFrontend/src/design-state-accent.test.js WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue WuwaFrontend/src/features/history/FloatingHistoryPanel.vue WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js WuwaFrontend/src/styles/features/auth.css WuwaFrontend/src/styles/features/evaluation.css WuwaFrontend/src/styles/features/history.css WuwaFrontend/src/styles/features/workspace.css docs/archive/2026-07-13-web-state-accent-polish-implementation.md docs/archive/2026-07-13-project-documentation-audit.md docs/superpowers/plans/2026-07-13-web-state-accent-polish.md
git diff --cached --check
git diff --cached --stat
```

Expected: only the Web state-accent feature files are staged and the cached diff has no whitespace errors.

- [x] **Step 3: Create the implementation commit**

Run:

```powershell
git commit -m "fix: refine web state accents"
```

Expected: one commit containing the already-implemented state-language work plus this second-audit correction; unrelated documentation and local files remain unstaged.
