# Fusion Weight Top1 Marker Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Top1 hit-rate presentation from the fusion-weight overview while retaining hit-rate evaluation in the core backtest.

**Architecture:** Keep evaluation data and backtest components unchanged. Narrow `EvaluationOverview.vue` to current/base weight semantics, and remove CSS that is owned only by the deleted Top1 marker.

**Tech Stack:** Vue 3 SFC, CSS, Node.js test runner, Vite

---

### Task 1: Lock the presentation boundary with a failing test

**Files:**
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js`
- Test: `WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js`

- [x] **Step 1: Add the failing overview/backtest boundary test**

Add a test that reads the overview, backtest, and evaluation CSS sources and asserts:

```js
test('fusion weight overview excludes Top1 markers while backtest keeps hit-rate evaluation', async () => {
  const overviewSource = await readFile(new URL('./EvaluationOverview.vue', import.meta.url), 'utf8')
  const backtestSource = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')
  const evaluationStyles = await readFile(new URL('../../styles/features/evaluation.css', import.meta.url), 'utf8')

  assert.doesNotMatch(overviewSource, /legend-hit-triangle|hit-marker|Top1 回测|Top1 命中率/)
  assert.doesNotMatch(evaluationStyles, /\.legend-hit-triangle|\.hit-marker/)
  assert.match(backtestSource, /aria-label="Top1 到 Top5 预测范围命中率"/)
  assert.match(backtestSource, /model\.adjustment\?\.hit_rate/)
})
```

- [x] **Step 2: Run the targeted test and verify RED**

Run:

```powershell
..\.tools\node\node.exe --test src\features\evaluation\EvaluationOverview.test.js
```

Expected: FAIL because `EvaluationOverview.vue` and `evaluation.css` still contain the Top1 legend and marker selectors.

### Task 2: Remove Top1 presentation from the overview

**Files:**
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationOverview.vue`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css`
- Test: `WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js`

- [x] **Step 1: Simplify the weight tooltip**

Change `fusionWeightTooltip` so it returns only base weight, adjustment direction, and current weight:

```js
function fusionWeightTooltip(row) {
  if (row.disabled) {
    return `${row.label}：${row.statusTitle}`
  }
  const baseText = `基础 ${formatPercent(row.baseWeight)}`
  const directionText = row.adjustment?.direction === 'up'
    ? '上调'
    : row.adjustment?.direction === 'down'
      ? '下调'
      : '持平'
  return `${baseText} · ${directionText}至 ${formatPercent(row.weight)}`
}
```

- [x] **Step 2: Remove the legend item and card marker**

Delete the `legend-hit-triangle` legend span and the `weight-marker hit-marker` span from `EvaluationOverview.vue`. Keep the current-weight bar and `base-marker` unchanged.

- [x] **Step 3: Remove marker-only CSS**

Delete all `.hit-marker`, `.fusion-weight-card.disabled .hit-marker`, `.hit-marker::before`, `.fusion-weight-card.disabled .hit-marker::before`, `.legend-hit-triangle`, and `.legend-hit-triangle::before` rules. Keep `.weight-marker` because `base-marker` still uses it.

- [x] **Step 4: Run the targeted test and verify GREEN**

Run:

```powershell
..\.tools\node\node.exe --test src\features\evaluation\EvaluationOverview.test.js
```

Expected: both evaluation overview tests PASS.

### Task 3: Verify, archive, and commit

**Files:**
- Create: `docs/archive/2026-06-22-fusion-weight-top1-marker-removal-implementation.md`

- [x] **Step 1: Run the full frontend verification**

Run:

```powershell
..\.tools\node\npm.cmd test
..\.tools\node\npm.cmd run build
```

Expected: all frontend tests pass and Vite production build succeeds.

- [x] **Step 2: Write the implementation archive**

Record the removed overview semantics, preserved core-backtest metrics, test counts, build result, and confirmation that API/data behavior did not change.

- [x] **Step 3: Check and commit**

Run:

```powershell
git diff --check
git add WuwaFrontend/src/features/evaluation/EvaluationOverview.vue WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js WuwaFrontend/src/styles/features/evaluation.css docs/archive/2026-06-22-fusion-weight-top1-marker-removal-implementation.md docs/superpowers/plans/2026-06-22-fusion-weight-top1-marker-removal.md
git commit -m "refactor: simplify fusion weight overview"
```

Expected: a focused commit containing only the approved presentation cleanup and its documentation.
