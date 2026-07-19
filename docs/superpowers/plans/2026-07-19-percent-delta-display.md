# Percent Delta Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every active user-facing percentage-point display with a signed `%` value while preserving the existing absolute-difference calculation and historical documentation.

**Architecture:** Reuse the existing `formatSignedPercent` formatter as the single presentation path for signed ratio values. Statistics and evaluation keep ownership of their comparison semantics, while the shared formatter only converts `0..1` values into signed percentage strings. Remove the obsolete percentage-point formatter after both consumers migrate, then align the active design rules and record the completed change without rewriting historical plans or archives.

**Tech Stack:** Vue 3 Single-File Components, JavaScript ES modules, Node.js test runner, Vite, Markdown

---

## Scope and file map

The approved design is:

- `docs/superpowers/specs/2026-07-19-percent-delta-display-design.md`

Files changed by this implementation:

| File | Responsibility |
|---|---|
| `WuwaFrontend/src/features/statistics/StatisticsView.test.js` | Locks statistics deviation formatting and prevents deviation summaries from leaking into the page header. |
| `WuwaFrontend/src/features/statistics/StatisticsView.vue` | Owns visible statistics deviation labels, values, and comparison descriptions. |
| `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.test.js` | Locks evaluation gain formatting and accessible comparison text. |
| `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.vue` | Owns Top1/Top3/Top5 coverage comparison and adjacent gain labels. |
| `WuwaFrontend/src/services/formatters.test.js` | Locks the shared signed-percent behavior used by both feature owners. |
| `WuwaFrontend/src/services/formatters.js` | Owns percentage string formatting and removes the obsolete unit-specific export. |
| `DESIGN.md` | Defines the current long-term visible unit and zero-sample examples. |
| `docs/archive/2026-07-19-percent-delta-display-implementation.md` | Records what was actually changed and verified. |

Do not modify CSS, APIs, backend code, archived plans, or prior implementation records. The current worktree may contain unrelated user changes; every commit below stages only the explicitly listed files.

### Task 1: Migrate statistics deviations to signed percentages

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js:74-88`
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js:163-179`
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.vue:1-60`
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.vue:151-189`

- [ ] **Step 1: Change the statistics source contract to require `formatSignedPercent`**

In `WuwaFrontend/src/features/statistics/StatisticsView.test.js`, update the deviation-owner assertions to:

```js
  assert.match(deviationSection, /<h3>副词条分布偏差<\/h3>/)
  assert.match(deviationSection, /class="stats-diagnostic-deviations"/)
  assert.match(deviationSection, /class="substat-deviation-chart"/)
  assert.match(source, /formatSignedPercent\(row\.deviation\)/)
  assert.match(source, /sortedStatFrequency\.value\.find\(\(row\) => row\.deviation < 0\)/)
```

In the page-header test, replace the old formatter-specific negative assertion with an owner-level assertion that contains no obsolete identifier:

```js
  assert.doesNotMatch(headerSection, /最大偏差|hottestStatRow|coldestStatRow/)
```

- [ ] **Step 2: Run the statistics test and verify the new contract fails**

Run from the repository root:

```powershell
Set-Location WuwaFrontend
..\.tools\node\npm.cmd test -- src/features/statistics/StatisticsView.test.js
```

Expected: FAIL because `StatisticsView.vue` still calls the old percentage-point formatter and does not match `formatSignedPercent(row.deviation)`.

- [ ] **Step 3: Replace the statistics formatter import and all four deviation calls**

In `WuwaFrontend/src/features/statistics/StatisticsView.vue`, use:

```js
import { formatPercent, formatSignedPercent } from '../../services/formatters.js'
```

Update `deviationTitle`:

```js
function deviationTitle(row, direction) {
  if (!row) {
    return `基于 ${totalSamples.value} 条样本，暂无${direction}项`
  }
  const relation = direction === '偏高' ? '高于' : '低于'
  return `基于 ${totalSamples.value} 条样本，${row.label} 当前观察值${relation}基线 ${formatSignedPercent(row.deviation)}`
}
```

Update the visible hot, cold, and row values:

```vue
<em v-if="hottestStatRow" class="stats-number">{{ formatSignedPercent(hottestStatRow.deviation) }}</em>
```

```vue
<em v-if="coldestStatRow" class="stats-number">{{ formatSignedPercent(coldestStatRow.deviation) }}</em>
```

```vue
<strong class="substat-deviation-value">{{ formatSignedPercent(row.deviation) }}</strong>
```

Do not change sorting, `maxAbsStatDeviation`, track widths, colors, or markup structure.

- [ ] **Step 4: Run the statistics test and verify it passes**

Run:

```powershell
Set-Location WuwaFrontend
..\.tools\node\npm.cmd test -- src/features/statistics/StatisticsView.test.js
```

Expected: PASS with all tests in `StatisticsView.test.js` successful.

- [ ] **Step 5: Check and commit only the statistics files**

Run from the repository root:

```powershell
git diff --check -- WuwaFrontend/src/features/statistics/StatisticsView.test.js WuwaFrontend/src/features/statistics/StatisticsView.vue
git add -- WuwaFrontend/src/features/statistics/StatisticsView.test.js WuwaFrontend/src/features/statistics/StatisticsView.vue
git commit -m "feat: show statistic deltas as percentages"
```

Expected: the diff check reports no errors and the commit contains exactly the two statistics files.

### Task 2: Migrate evaluation gains and accessible text

**Files:**
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.test.js:5-18`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.vue:1-63`

- [ ] **Step 1: Change the core-backtest contract to signed percentages**

Replace the first test in `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.test.js` with:

```js
test('core backtest uses proportional comparison rows and signed percent gains', async () => {
  const source = await readFile(new URL('./EvaluationCoreBacktest.vue', import.meta.url), 'utf8')

  assert.match(source, /import \{ getCoverageScale \} from '\.\/coverageScale\.js'/)
  assert.match(source, /formatSignedPercent/)
  assert.match(
    source,
    /return `相对\$\{row\.deltaFrom\}新增 \$\{formatSignedPercent\(row\.delta\)\}`/,
  )
  assert.match(source, /class="coverage-comparison"/)
  assert.match(source, /class="coverage-axis"/)
  assert.match(source, /class="coverage-row"/)
  assert.match(source, /class="coverage-bar-fill"/)
  assert.match(source, /class="coverage-delta"/)
  assert.match(source, /row\.value \/ coverageScale\.value\.max/)
  assert.doesNotMatch(source, /coverage-band|coverageNodePosition|coverageNodeClass/)
})
```

This locks both the visible value and the accessible comparison description to the same shared formatter.

- [ ] **Step 2: Run the core-backtest test and verify the new contract fails**

Run from the repository root:

```powershell
Set-Location WuwaFrontend
..\.tools\node\npm.cmd test -- src/features/evaluation/EvaluationCoreBacktest.test.js
```

Expected: FAIL because the component still imports the old formatter and its accessible label still spells out the old unit.

- [ ] **Step 3: Reuse `formatSignedPercent` for visible and accessible gains**

In `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.vue`, use:

```js
import { formatPercent, formatSignedPercent } from '../../services/formatters.js'
```

Replace the two delta helpers with:

```js
function deltaText(row) {
  return Number.isFinite(row.delta)
    ? formatSignedPercent(row.delta)
    : '--'
}

function deltaAriaLabel(row) {
  return `相对${row.deltaFrom}新增 ${formatSignedPercent(row.delta)}`
}
```

Do not change `metricDelta`, cumulative hit rates, coverage scaling, calibration metrics, chart geometry, or template structure.

- [ ] **Step 4: Run the core-backtest test and verify it passes**

Run:

```powershell
Set-Location WuwaFrontend
..\.tools\node\npm.cmd test -- src/features/evaluation/EvaluationCoreBacktest.test.js
```

Expected: PASS with all tests in `EvaluationCoreBacktest.test.js` successful.

- [ ] **Step 5: Check and commit only the evaluation files**

Run from the repository root:

```powershell
git diff --check -- WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.test.js WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.vue
git add -- WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.test.js WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.vue
git commit -m "feat: show evaluation gains as percentages"
```

Expected: the commit contains exactly the core-backtest component and its test; unrelated `EvaluationBacktest` or CSS changes remain unstaged.

### Task 3: Remove the obsolete formatter

**Files:**
- Modify: `WuwaFrontend/src/services/formatters.test.js:7-35`
- Modify: `WuwaFrontend/src/services/formatters.js:1-16`

- [ ] **Step 1: Expand the existing signed-percent test to cover the migrated values**

In `WuwaFrontend/src/services/formatters.test.js`, keep the `formatSignedPercent` import and replace its current test with:

```js
test('formats signed percentages for deviations and deltas', () => {
  assert.equal(formatSignedPercent(0.0123), '+1.23%')
  assert.equal(formatSignedPercent(-0.004), '-0.40%')
  assert.equal(formatSignedPercent(0.1818), '+18.18%')
  assert.equal(formatSignedPercent(-0.0664), '-6.64%')
  assert.equal(formatSignedPercent(0), '+0.00%')
})
```

Delete the obsolete formatter from the import list and delete the superseded unit-specific test block. No old formatter identifier or old unit example should remain in this test file.

- [ ] **Step 2: Run the formatter and both consumer tests before deleting the export**

Run from the repository root:

```powershell
Set-Location WuwaFrontend
..\.tools\node\npm.cmd test -- src/services/formatters.test.js src/features/statistics/StatisticsView.test.js src/features/evaluation/EvaluationCoreBacktest.test.js
```

Expected: PASS. This proves all active consumers already use the retained formatter before the dead export is removed.

- [ ] **Step 3: Delete the obsolete export from `formatters.js`**

Remove this entire function from `WuwaFrontend/src/services/formatters.js`:

```js
export function formatSignedPercentagePoints(value, digits = 2) {
  const numericValue = Number.isFinite(value) ? value : 0
  const sign = numericValue >= 0 ? '+' : ''
  return `${sign}${(numericValue * 100).toFixed(digits)}pp`
}
```

The top of the file must retain:

```js
export function formatPercent(value, digits = 2) {
  const numericValue = Number.isFinite(value) ? value : 0
  return `${(numericValue * 100).toFixed(digits)}%`
}

export function formatSignedPercent(value, digits = 2) {
  const numericValue = Number.isFinite(value) ? value : 0
  const sign = numericValue >= 0 ? '+' : ''
  return `${sign}${formatPercent(numericValue, digits)}`
}
```

- [ ] **Step 4: Run the formatter and consumer tests after deletion**

Run:

```powershell
Set-Location WuwaFrontend
..\.tools\node\npm.cmd test -- src/services/formatters.test.js src/features/statistics/StatisticsView.test.js src/features/evaluation/EvaluationCoreBacktest.test.js
```

Expected: PASS with no missing-export or source-contract failures.

- [ ] **Step 5: Check and commit only the formatter files**

Run from the repository root:

```powershell
git diff --check -- WuwaFrontend/src/services/formatters.test.js WuwaFrontend/src/services/formatters.js
git add -- WuwaFrontend/src/services/formatters.test.js WuwaFrontend/src/services/formatters.js
git commit -m "refactor: remove percentage point formatter"
```

Expected: the commit contains exactly the shared formatter and its test.

### Task 4: Align active documentation and verify the complete change

**Files:**
- Modify: `DESIGN.md:406-420`
- Create: `docs/archive/2026-07-19-percent-delta-display-implementation.md`

- [ ] **Step 1: Update the current long-term design rules**

In `DESIGN.md`, replace the statistics unit rule with:

```markdown
- 观察率和理论率使用 `%`；两个比例的差值也使用带正负号的 `%`，例如 `+18.18%`。差值语义由“偏差”“相对某项新增”等业务标签表达，不写成相对增长率。
```

Replace the empty-metric and zero-sample rules with:

```markdown
- 真实计数显示 `0`；请求成功但尚未形成的指标显示半角 `--`；语义状态显示短文案。`--` 不附带 `%` 或其他单位，不表达 loading 或 error。全局置信度在零样本时固定显示 `--`。
- 零样本列表和图表整体隐藏，由一张行动导向的准备面板替代，不渲染成排的 `0.00%`、`+0.00%` 或“样本不足”。
```

Do not edit historical files under `docs/archive/`, completed plans, or prior design records.

- [ ] **Step 2: Verify active source and current rules contain no obsolete display**

Run from the repository root:

```powershell
rg -n --pcre2 '(?i)(?<![A-Za-z])pp(?![A-Za-z])|百分点|formatSignedPercentagePoints' WuwaFrontend/src DESIGN.md
```

Expected: no output and ripgrep exit code `1`, meaning there are no matches in product source, tests, or the active design entry. Historical documents are intentionally outside this check.

- [ ] **Step 3: Run the complete frontend test suite**

Run:

```powershell
Set-Location WuwaFrontend
..\.tools\node\npm.cmd test
```

Expected: PASS with zero failed tests.

- [ ] **Step 4: Run the production build**

Run:

```powershell
Set-Location WuwaFrontend
..\.tools\node\npm.cmd run build
```

Expected: Vite completes successfully and writes the production bundle without compilation errors.

- [ ] **Step 5: Create the implementation record**

Create `docs/archive/2026-07-19-percent-delta-display-implementation.md` with:

```markdown
# 百分比差值展示实施记录

**日期：** 2026-07-19

## 实施结果

- 统计诊断的偏高、偏低和逐行偏差统一显示为带正负号的 `%`。
- 模型评估 Top3、Top5 的新增覆盖统一显示为带正负号的 `%`，可访问名称保留明确比较对象。
- 统计与评估统一复用 `formatSignedPercent`，旧的单位专属格式化函数已经删除。
- 比例原始值、绝对差计算、排序、图表比例、API 和数据契约均未改变。

## 文档边界

- `DESIGN.md` 已更新为当前有效的百分号展示规则。
- 既有计划和归档继续保留当时的原始设计事实，没有批量改写。

## 验证

- `npm test`：通过。
- `npm run build`：通过。
- 活跃前端源码、测试和 `DESIGN.md` 的旧单位静态检查：无匹配。
- `git diff --check`：通过。
```

- [ ] **Step 6: Run scoped whitespace and status checks**

Run from the repository root:

```powershell
git diff --check -- DESIGN.md docs/archive/2026-07-19-percent-delta-display-implementation.md
git status --short
```

Expected: the scoped diff check reports no errors. `git status` may still list unrelated user changes, but the only uncommitted files from this task are `DESIGN.md` and the new implementation record.

- [ ] **Step 7: Commit the active rule and implementation record**

Run:

```powershell
git add -- DESIGN.md docs/archive/2026-07-19-percent-delta-display-implementation.md
git diff --cached --check
git commit -m "docs: record percent delta display"
```

Expected: the final task commit contains exactly `DESIGN.md` and the new archive record.

## Final acceptance checklist

- [ ] Statistics hot, cold, row, and title values use signed `%`.
- [ ] Evaluation Top3 and Top5 gains use signed `%`.
- [ ] Accessible evaluation text names the comparison source and uses `%`.
- [ ] `formatSignedPercent` is the only shared formatter used for signed ratio display.
- [ ] The obsolete formatter and its tests are removed.
- [ ] Empty metrics still show `--` without a unit.
- [ ] Zero-sample views do not render `+0.00%` fake results.
- [ ] `DESIGN.md` reflects the new current rule.
- [ ] Historical plans and archives remain unchanged.
- [ ] Targeted tests, full frontend tests, build, static search, and diff checks pass.
