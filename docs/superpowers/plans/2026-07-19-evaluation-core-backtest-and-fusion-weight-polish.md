# 模型评估核心回测与融合权重优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“核心回测”改为使用真实数值比例和自适应横轴的紧凑水平比较图，同时把“当前融合权重”的进度条统一为单一品牌蓝，并保留既有零样本门槛、子模型回测、API 与算法。

**Architecture:** `EvaluationView.vue` 继续负责 `loading / error / not-ready / ready` 编排，只有 `evaluation.status === 'ready'` 时挂载三个结果模块。新增一个纯函数文件负责覆盖率横轴计算，`EvaluationCoreBacktest.vue` 只负责把现有评估字段映射为三行图表；融合权重保留现有五项网格、基础权重标记和结论摘要，只调整视觉角色与断点。

**Tech Stack:** Vue 3 `<script setup>`、Vite 8、原生 CSS、Node.js `node:test`、IBM Plex Sans SC、现有 Wuwa 设计 token。

---

## 1. 范围和实施边界

### 本轮修改

- “核心回测”改为同基线水平条形比较图。
- Top1、Top3、Top5 的条长按真实命中率比例计算。
- 横轴根据当前最大值使用友好上界，避免未来 30%、50% 数据溢出。
- Top3 相对 Top1、Top5 相对 Top3 的新增覆盖放在相邻百分比之间。
- Log Loss 和 Brier Score 保留在模块标题右侧，不附加好坏判断。
- 融合权重当前值统一使用 `var(--primary)`；基础值使用中性刻度线。
- 1180px 保持五列，1000px 以下直接改为单列分析行，不出现 3+2。
- 保留并回归验证零样本/未就绪状态。

### 本轮不修改

- `EvaluationBacktest.vue` 及其子模型详情交互。
- 后端 API、字段名、评估阈值、命中率算法、权重算法。
- `EvaluationView.vue` 的模块顺序。
- 既有融合权重数据结构、tooltip、结论摘要和模型联动。
- 统计页、工作台、全局导航和主题切换。

### 已确认的状态契约

```text
evaluation 尚未返回
  -> InsightRequestState（loading 或 error）

evaluation.status !== "ready"
  -> EvaluationReadinessState
  -> 不挂载核心回测、融合权重、子模型回测

evaluation.status === "ready"
  -> EvaluationCoreBacktest
  -> EvaluationOverview
  -> EvaluationBacktest
```

零样本状态不在图表里显示一排 `0%`。现有 `EvaluationReadinessState.vue`、`evaluationReadinessState()` 和 `EvaluationView.vue` 已符合此契约，本轮只做回归验证。

## 2. 文件结构

| 文件 | 动作 | 单一职责 |
|---|---|---|
| `WuwaFrontend/src/features/evaluation/coverageScale.js` | 新建 | 计算覆盖率图的友好横轴上界和刻度 |
| `WuwaFrontend/src/features/evaluation/coverageScale.test.js` | 新建 | 覆盖 20%、30%、50%、82% 和空值边界 |
| `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.vue` | 修改 | 把评估字段映射为三行真实比例图 |
| `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.test.js` | 新建 | 锁定组件结构、百分点文案和旧时间轴移除 |
| `WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js` | 修改 | 锁定融合权重颜色、基础刻度与响应式结构 |
| `WuwaFrontend/src/features/evaluation/EvaluationView.test.js` | 验证 | 确认未 ready 时不挂载任何结果图表 |
| `WuwaFrontend/src/App.test.js:649-705` | 修改 | 将旧发光节点断言改为单色比例图断言 |
| `WuwaFrontend/src/styles/features/evaluation.css` | 修改 | 核心图表和融合权重的组件视觉 |
| `WuwaFrontend/src/styles/features/evaluation-layout.css` | 修改 | 融合权重在 1180/1000/520px 的页面级布局 |
| `docs/archive/2026-07-19-evaluation-core-backtest-and-fusion-weight-polish-implementation.md` | 新建 | 记录最终实现和验证证据 |

## 3. 执行前置条件

当前工作树已经存在与本任务无关、且与 `evaluation.css` 和 `App.test.js` 重叠的未提交改动。正式执行前必须先保护这些改动，不能直接切分支、重置或把它们混入本任务提交。

- [ ] **Step 1: 记录当前分支和重叠改动**

```powershell
git status --short --branch
git diff -- WuwaFrontend/src/styles/features/evaluation.css WuwaFrontend/src/App.test.js WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js
```

Expected: 能明确区分现有改动与本计划新增改动；不执行 `reset`、`checkout --` 或自动暂存。

- [ ] **Step 2: 在执行时使用独立功能分支**

如果现有改动已经被用户提交，则从对应基线创建：

```powershell
git switch -c codex/evaluation-core-backtest-bars
```

如果现有改动仍未提交，先由用户决定保存方式，再使用 `superpowers:using-git-worktrees` 创建独立工作树。不得擅自暂存或提交用户现有改动。

---

### Task 1: 建立自适应覆盖率横轴纯函数

**Files:**

- Create: `WuwaFrontend/src/features/evaluation/coverageScale.test.js`
- Create: `WuwaFrontend/src/features/evaluation/coverageScale.js`

- [ ] **Step 1: 先写失败测试**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { getCoverageScale } from './coverageScale.js'

test('coverage scale keeps low rates on a readable 0-20 percent axis', () => {
  assert.deepEqual(getCoverageScale([0.1159, 0.1304, 0.1884]), {
    max: 0.2,
    ticks: [0, 0.1, 0.2],
  })
})

test('coverage scale expands to friendly bounds as rates grow', () => {
  assert.deepEqual(getCoverageScale([0.3, 0.31, 0.32]), {
    max: 0.4,
    ticks: [0, 0.2, 0.4],
  })
  assert.deepEqual(getCoverageScale([0.5]), {
    max: 0.6,
    ticks: [0, 0.3, 0.6],
  })
  assert.deepEqual(getCoverageScale([0.82]), {
    max: 1,
    ticks: [0, 0.5, 1],
  })
})

test('coverage scale ignores invalid values and never exceeds 100 percent', () => {
  assert.deepEqual(getCoverageScale([]), {
    max: 0.2,
    ticks: [0, 0.1, 0.2],
  })
  assert.deepEqual(getCoverageScale([Number.NaN, -1, 1.4]), {
    max: 1,
    ticks: [0, 0.5, 1],
  })
})
```

- [ ] **Step 2: 运行测试，确认因模块缺失而失败**

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src\features\evaluation\coverageScale.test.js
```

Expected: FAIL，错误指向 `coverageScale.js` 不存在。

- [ ] **Step 3: 实现最小纯函数**

```js
const FRIENDLY_COVERAGE_MAXES = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]

export function getCoverageScale(values = []) {
  const dataMax = Math.max(
    0,
    ...values
      .filter(Number.isFinite)
      .map((value) => Math.min(Math.max(value, 0), 1)),
  )
  const targetMax = dataMax <= 0.2 ? 0.2 : dataMax * 1.1
  const max = FRIENDLY_COVERAGE_MAXES.find((candidate) => candidate >= targetMax) ?? 1

  return {
    max,
    ticks: [0, max / 2, max],
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

```powershell
..\.tools\node\node.exe --test src\features\evaluation\coverageScale.test.js
```

Expected: 3 tests PASS。

- [ ] **Step 5: 提交纯函数**

```powershell
git add WuwaFrontend/src/features/evaluation/coverageScale.js WuwaFrontend/src/features/evaluation/coverageScale.test.js
git commit -m "feat: add adaptive evaluation coverage scale"
```

---

### Task 2: 将核心回测改为真实比例水平图

**Files:**

- Create: `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.test.js`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.vue`
- Modify: `WuwaFrontend/src/App.test.js:649-705`

- [ ] **Step 1: 写组件结构失败测试**

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('core backtest uses proportional comparison rows and percentage-point gains', async () => {
  const source = await readFile(new URL('./EvaluationCoreBacktest.vue', import.meta.url), 'utf8')

  assert.match(source, /import \{ getCoverageScale \} from '\.\/coverageScale\.js'/)
  assert.match(source, /formatSignedPercentagePoints/)
  assert.match(source, /class="coverage-comparison"/)
  assert.match(source, /class="coverage-axis"/)
  assert.match(source, /class="coverage-row"/)
  assert.match(source, /class="coverage-bar-fill"/)
  assert.match(source, /class="coverage-delta"/)
  assert.match(source, /row\.value \/ coverageScale\.value\.max/)
  assert.doesNotMatch(source, /coverage-band|coverageNodePosition|coverageNodeClass/)
  assert.doesNotMatch(source, /\bformatSignedPercent\b/)
})

test('core backtest keeps calibration metrics factual and compact', async () => {
  const source = await readFile(new URL('./EvaluationCoreBacktest.vue', import.meta.url), 'utf8')

  assert.match(source, /<dl class="calibration-metrics"/)
  assert.match(source, /<dt>Log Loss<\/dt>/)
  assert.match(source, /<dt>Brier Score<\/dt>/)
  assert.doesNotMatch(source, /优秀|较差|健康|异常/)
})
```

- [ ] **Step 2: 运行测试，确认旧时间轴结构导致失败**

```powershell
..\.tools\node\node.exe --test src\features\evaluation\EvaluationCoreBacktest.test.js
```

Expected: FAIL，缺少 `coverage-comparison`、`coverage-axis` 和 `getCoverageScale`。

- [ ] **Step 3: 替换组件脚本的数据映射**

`EvaluationCoreBacktest.vue` 的脚本改为以下职责，不保留固定节点位置函数：

```vue
<script setup>
import { computed } from 'vue'

import {
  formatPercent,
  formatSignedPercentagePoints,
} from '../../services/formatters.js'
import { getCoverageScale } from './coverageScale.js'

const props = defineProps({
  evaluation: { type: Object, default: null },
})

const hitRateRows = computed(() => {
  const top1 = props.evaluation?.top_1_hit_rate
  const top3 = props.evaluation?.top_3_hit_rate
  const top5 = props.evaluation?.top_5_hit_rate

  return [
    { key: 'top1', label: '首选', code: 'Top1', value: top1, delta: null, deltaFrom: null },
    { key: 'top3', label: '前三', code: 'Top3', value: top3, delta: metricDelta(top3, top1), deltaFrom: '首选' },
    { key: 'top5', label: '前五', code: 'Top5', value: top5, delta: metricDelta(top5, top3), deltaFrom: '前三' },
  ]
})

const coverageScale = computed(() =>
  getCoverageScale(hitRateRows.value.map((row) => row.value)),
)

const calibrationMetrics = computed(() => [
  { label: 'Log Loss', value: props.evaluation?.log_loss },
  { label: 'Brier Score', value: props.evaluation?.brier_score },
])

const coverageAriaLabel = computed(() =>
  hitRateRows.value
    .map((row) => `${row.label} ${metricText(row.value)}`)
    .join('，'),
)

function metricDelta(current, previous) {
  return Number.isFinite(current) && Number.isFinite(previous)
    ? current - previous
    : null
}

function metricText(value) {
  return Number.isFinite(value) ? formatPercent(value) : '--'
}

function calibrationText(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '--'
}

function coverageWidth(row) {
  if (!Number.isFinite(row.value) || coverageScale.value.max <= 0) return '0%'
  return formatPercent(Math.min(Math.max(row.value / coverageScale.value.max, 0), 1))
}

function deltaText(row) {
  return Number.isFinite(row.delta)
    ? formatSignedPercentagePoints(row.delta)
    : '--'
}

function deltaAriaLabel(row) {
  return `相对${row.deltaFrom}新增 ${(row.delta * 100).toFixed(2)} 个百分点`
}
</script>
```

- [ ] **Step 4: 替换组件模板**

```vue
<template>
  <section class="evaluation-card evaluation-module evaluation-core-module">
    <header class="evaluation-module-header core-header">
      <h3>核心回测</h3>
      <dl class="calibration-metrics" aria-label="概率校准指标">
        <div v-for="metric in calibrationMetrics" :key="metric.label">
          <dt>{{ metric.label }}</dt>
          <dd>{{ calibrationText(metric.value) }}</dd>
        </div>
      </dl>
    </header>

    <div
      class="coverage-comparison"
      role="img"
      :aria-label="coverageAriaLabel"
    >
      <div class="coverage-axis" aria-hidden="true">
        <span></span>
        <div>
          <span v-for="tick in coverageScale.ticks" :key="tick">
            {{ formatPercent(tick, 0) }}
          </span>
        </div>
        <span></span>
      </div>

      <div
        v-for="row in hitRateRows"
        :key="row.key"
        class="coverage-row"
        :title="`${row.code} ${metricText(row.value)}`"
      >
        <div class="coverage-name">
          <strong>{{ row.label }}</strong>
          <span>{{ row.code }}</span>
        </div>
        <div class="coverage-bar" aria-hidden="true">
          <span class="coverage-bar-fill" :style="{ width: coverageWidth(row) }"></span>
        </div>
        <div class="coverage-value">
          <strong>{{ metricText(row.value) }}</strong>
          <span
            v-if="row.delta != null"
            class="coverage-delta"
            :aria-label="deltaAriaLabel(row)"
          >{{ deltaText(row) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 5: 更新旧节点回归测试**

将 `App.test.js` 中 `coverage band nodes keep colored fills in dark mode` 替换为：

```js
test('core coverage chart uses one semantic fill in both themes', async () => {
  const coreSource = await readFile(
    new URL('./features/evaluation/EvaluationCoreBacktest.vue', import.meta.url),
    'utf8',
  )
  const styleSource = await readFile(
    new URL('./styles/features/evaluation.css', import.meta.url),
    'utf8',
  )

  assert.match(coreSource, /class="coverage-bar-fill"/)
  assert.match(styleSource, /\.coverage-bar-fill \{[\s\S]+background: var\(--primary\);/)
  assert.doesNotMatch(coreSource, /coverage-band-node/)
  assert.doesNotMatch(styleSource, /\.coverage-band-node/)
})
```

同时把 `evaluation metrics use backend values instead of preview fallbacks` 中旧的“缺值显示样本不足”断言改为：

```js
assert.match(coreBacktestSource, /Number\.isFinite\(value\) \? formatPercent\(value\) : '--'/)
```

- [ ] **Step 6: 运行组件测试**

```powershell
..\.tools\node\node.exe --test src\features\evaluation\EvaluationCoreBacktest.test.js src\App.test.js
```

Expected: 新组件结构测试通过；如果 CSS 尚未实现，单色填充断言可以继续失败并进入 Task 3。

- [ ] **Step 7: 暂存组件层改动**

不要在 CSS 断言仍失败时提交。继续执行 Task 3，使组件和视觉测试一起转绿。

---

### Task 3: 实现核心回测图表视觉和响应式

**Files:**

- Modify: `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.test.js`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css`
- Modify: `WuwaFrontend/src/styles/features/evaluation-layout.css:28-82`

- [ ] **Step 1: 补充 CSS 失败断言**

追加到 `EvaluationCoreBacktest.test.js`：

```js
test('core coverage chart is compact, proportional, and non-decorative', async () => {
  const styles = await readFile(
    new URL('../../styles/features/evaluation.css', import.meta.url),
    'utf8',
  )

  assert.match(styles, /\.coverage-comparison \{[^}]*max-width: 1280px;/s)
  assert.match(styles, /\.coverage-bar \{[^}]*background: transparent;/s)
  assert.match(styles, /\.coverage-bar-fill \{[^}]*background: var\(--primary\);/s)
  assert.match(styles, /\.coverage-delta \{[^}]*position: absolute;/s)
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*\.coverage-delta \{[^}]*position: static;/s)
  assert.doesNotMatch(styles, /coverage-band-(?:track|fill|node|labels)/)
})
```

- [ ] **Step 2: 运行测试，确认旧 CSS 导致失败**

```powershell
..\.tools\node\node.exe --test src\features\evaluation\EvaluationCoreBacktest.test.js
```

Expected: FAIL，旧 `coverage-band-*` 样式仍存在。

- [ ] **Step 3: 删除旧时间轴样式并加入新图表样式**

从 `evaluation.css` 删除所有只服务于以下类的规则和暗色覆盖：

```text
coverage-band-chart
coverage-band-track
coverage-band-fill
coverage-band-node
coverage-labels
coverage-label-kicker
coverage-gain-note
```

加入：

```css
.calibration-metrics,
.calibration-metrics div {
  display: flex;
  align-items: center;
}

.calibration-metrics {
  gap: 22px;
  margin: 0;
}

.calibration-metrics div {
  gap: 8px;
}

.calibration-metrics dt,
.calibration-metrics dd {
  margin: 0;
  white-space: nowrap;
}

.calibration-metrics dt {
  color: var(--steel);
  font-size: var(--text-caption);
  font-weight: var(--weight-supporting);
}

.calibration-metrics dd {
  color: var(--ink-deep);
  font-family: var(--font-data);
  font-size: var(--text-data-sm);
  font-variant-numeric: tabular-nums;
  font-weight: var(--weight-data);
  line-height: var(--leading-data);
}

.coverage-comparison {
  display: grid;
  gap: 10px;
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
  padding-top: 4px;
}

.coverage-axis,
.coverage-row {
  display: grid;
  grid-template-columns: 96px minmax(280px, 1fr) 172px;
  gap: 18px;
  align-items: center;
}

.coverage-axis {
  color: var(--stone);
  font-family: var(--font-data);
  font-size: var(--text-micro);
  font-variant-numeric: tabular-nums;
  font-weight: var(--weight-supporting);
  line-height: var(--leading-caption);
}

.coverage-axis div {
  display: flex;
  justify-content: space-between;
}

.coverage-row {
  min-height: 38px;
}

.coverage-name {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.coverage-name strong {
  color: var(--ink-deep);
  font-size: var(--text-control);
  font-weight: var(--weight-control);
}

.coverage-name span {
  color: var(--steel);
  font-size: var(--text-caption);
  font-weight: var(--weight-supporting);
}

.coverage-bar {
  position: relative;
  height: 14px;
  overflow: visible;
  border-right: 1px solid var(--hairline-soft);
  border-left: 1px solid var(--hairline-soft);
  background: transparent;
}

.coverage-bar::before,
.coverage-bar::after {
  position: absolute;
  z-index: 0;
  content: "";
  pointer-events: none;
}

.coverage-bar::before {
  top: -6px;
  bottom: -6px;
  left: 50%;
  width: 1px;
  background: var(--hairline-soft);
}

.coverage-bar::after {
  top: 50%;
  right: 0;
  left: 0;
  height: 1px;
  background: color-mix(in srgb, var(--hairline-soft) 70%, transparent);
}

.coverage-bar-fill {
  position: absolute;
  top: 50%;
  z-index: 1;
  left: 0;
  height: 10px;
  border-radius: 3px;
  background: var(--primary);
  transform: translateY(-50%);
}

.coverage-value {
  position: relative;
  display: flex;
  align-items: baseline;
  min-width: 0;
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
}

.coverage-value strong {
  color: var(--ink-deep);
  font-size: var(--text-data-md);
  font-weight: var(--weight-emphasis);
  line-height: var(--leading-data);
}

.coverage-delta {
  position: absolute;
  top: 50%;
  left: 0;
  color: var(--steel);
  font-size: var(--text-caption);
  font-weight: var(--weight-label);
  transform: translateY(calc(-50% - 24px));
  white-space: nowrap;
}
```

- [ ] **Step 4: 加入明确断点，不缩小核心字体**

在现有断点中加入：

```css
@media (max-width: 860px) {
  .coverage-axis,
  .coverage-row {
    grid-template-columns: 74px minmax(140px, 1fr) 132px;
    gap: 12px;
  }
}

@media (max-width: 520px) {
  .calibration-metrics {
    gap: 14px;
  }

  .coverage-comparison {
    gap: 12px;
  }

  .coverage-axis {
    display: none;
  }

  .coverage-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 14px;
  }

  .coverage-value {
    grid-column: 2;
    justify-content: flex-end;
    gap: 8px;
  }

  .coverage-delta {
    position: static;
    transform: none;
  }

  .coverage-bar {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
```

`evaluation-layout.css` 当前为 259 行，受 `architecture.test.js` 的 260 行上限约束。不要在该文件堆叠核心图表细节；只删除不再使用的 `.evaluation-core-module .chart-heading*` 与 `.coverage-band-chart` 页面级规则，使行数回落。

- [ ] **Step 5: 运行核心测试和架构测试**

```powershell
..\.tools\node\node.exe --test src\features\evaluation\EvaluationCoreBacktest.test.js src\App.test.js src\architecture.test.js
```

Expected: 全部 PASS，`evaluation-layout.css` 不超过 260 行。

- [ ] **Step 6: 提交核心回测**

```powershell
git add WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.vue WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.test.js WuwaFrontend/src/styles/features/evaluation.css WuwaFrontend/src/styles/features/evaluation-layout.css WuwaFrontend/src/App.test.js
git commit -m "feat: rebuild core evaluation coverage chart"
```

提交前使用 `git diff --cached` 确认没有把执行前已存在的无关改动混入提交。

---

### Task 4: 统一融合权重颜色并修正响应式

**Files:**

- Modify: `WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:820-1050`
- Modify: `WuwaFrontend/src/styles/features/evaluation-layout.css:82-260`

- [ ] **Step 1: 添加失败测试**

追加到 `EvaluationOverview.test.js`：

```js
test('fusion weights use one brand fill and a neutral base marker', async () => {
  const styles = await readFile(
    new URL('../../styles/features/evaluation.css', import.meta.url),
    'utf8',
  )
  const layout = await readFile(
    new URL('../../styles/features/evaluation-layout.css', import.meta.url),
    'utf8',
  )

  const fillRule = styles.match(/\.fusion-weight-grid article b \{([^}]+)\}/)?.[1] || ''
  const baseRule = styles.match(/\.base-marker \{([^}]+)\}/)?.[1] || ''

  assert.match(fillRule, /background: var\(--primary\);/)
  assert.doesNotMatch(fillRule, /gradient|#2c9f70/)
  assert.match(baseRule, /background: var\(--steel\);/)
  assert.doesNotMatch(baseRule, /box-shadow/)
  assert.doesNotMatch(layout, /@media \(max-width: 1180px\)/)
  assert.match(layout, /@media \(max-width: 1000px\)[\s\S]*grid-template-columns: 1fr;/)
})
```

- [ ] **Step 2: 运行测试，确认渐变和 3+2 布局导致失败**

```powershell
..\.tools\node\node.exe --test src\features\evaluation\EvaluationOverview.test.js
```

Expected: FAIL，当前填充仍为蓝绿渐变，1180px 仍为三列。

- [ ] **Step 3: 修改融合权重视觉角色**

在 `evaluation.css` 中进行精确替换：

```css
.fusion-weight-card.disabled,
.evaluation-panel .fusion-weight-grid article.disabled {
  border-color: color-mix(in srgb, var(--hairline) 74%, transparent);
  background: var(--surface-soft);
  box-shadow: none;
}

.fusion-weight-grid article i {
  position: relative;
  display: block;
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--hairline-soft) 72%, var(--surface-soft));
}

.fusion-weight-grid article b {
  position: relative;
  z-index: 1;
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
}

.fusion-weight-card.disabled b {
  background: var(--stone);
}

.base-marker {
  top: calc(50% - 5px);
  width: 2px;
  height: 24px;
  border-radius: 999px;
  background: var(--steel);
  box-shadow: none;
}

.fusion-weight-card.disabled .base-marker {
  background: var(--stone);
  box-shadow: none;
}
```

不得为不同模型新增不同颜色；上调和下调继续由 tooltip 文字表达，不使用红绿方向色。

- [ ] **Step 4: 删除 1180px 的 3+2，增加 1000px 分析行**

从 `evaluation.css` 的 `@media (max-width: 1180px)` 分组中移除 `.fusion-weight-grid`。

把 `evaluation-layout.css` 现有 1180px 融合权重块替换为不超过原行数的 1000px 规则：

```css
@media (max-width: 1000px) {
  .evaluation-panel .evaluation-fusion-module .fusion-weight-grid {
    grid-template-columns: 1fr;
  }

  .evaluation-panel .evaluation-fusion-module .fusion-weight-card {
    grid-template-columns: minmax(180px, 0.72fr) minmax(240px, 1.28fr);
    min-height: 64px;
    border-right: 0;
    border-bottom: 1px solid #e1e9ef;
    align-items: center;
  }

  .evaluation-panel .evaluation-fusion-module .fusion-weight-card:last-child {
    border-bottom: 0;
  }
}
```

在现有 520px 规则中补充：

```css
.evaluation-panel .evaluation-fusion-module .fusion-weight-card {
  grid-template-columns: 1fr;
  gap: 12px;
}
```

- [ ] **Step 5: 运行融合权重与架构测试**

```powershell
..\.tools\node\node.exe --test src\features\evaluation\EvaluationOverview.test.js src\architecture.test.js src\App.test.js
```

Expected: 全部 PASS；五列宽屏、1000px 单列分析行、520px 纵向卡片规则同时存在。

- [ ] **Step 6: 提交融合权重改动**

```powershell
git add WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js WuwaFrontend/src/styles/features/evaluation.css WuwaFrontend/src/styles/features/evaluation-layout.css WuwaFrontend/src/App.test.js
git commit -m "style: clarify evaluation fusion weights"
```

提交前再次检查 `git diff --cached`，避免混入原工作树已有改动。

---

### Task 5: 回归零样本门槛和页面编排

**Files:**

- Verify: `WuwaFrontend/src/features/evaluation/EvaluationView.vue`
- Verify: `WuwaFrontend/src/features/evaluation/EvaluationReadinessState.vue`
- Verify: `WuwaFrontend/src/shared/sampleExperience.js`
- Verify: `WuwaFrontend/src/features/evaluation/EvaluationView.test.js`
- Verify: `WuwaFrontend/src/shared/sampleExperience.test.js`

- [ ] **Step 1: 运行状态契约测试**

```powershell
..\.tools\node\node.exe --test src\features\evaluation\EvaluationView.test.js src\shared\sampleExperience.test.js
```

Expected:

- `evaluated_count = 0` 且非 ready：`key === 'empty'`。
- `evaluated_count = 7` 且非 ready：`key === 'collecting'`。
- 只有 `status === 'ready'` 时 `readiness.ready === true`。
- `EvaluationReadinessState` 位于结果模块分支之后。
- 零样本和 collecting 状态都不接收图表数据 props。

- [ ] **Step 2: 确认没有把空状态逻辑下沉到图表组件**

```powershell
rg -n "EvaluationReadinessState|readiness.ready|evaluation-module-stack" src\features\evaluation\EvaluationView.vue
rg -n "零样本|待录入|去工作台录入" src\features\evaluation\EvaluationCoreBacktest.vue src\features\evaluation\EvaluationOverview.vue
```

Expected: 第一条命中页面编排；第二条在两个结果组件中无命中。结果组件只处理 ready 数据。

本任务不修改后端 20 条有效回测阈值，也不在图表内部增加 0% 占位状态。

---

### Task 6: 全量验证与视觉验收

**Files:**

- Create: `docs/archive/2026-07-19-evaluation-core-backtest-and-fusion-weight-polish-implementation.md`

- [ ] **Step 1: 运行完整前端测试**

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test
```

Expected: 退出码 0，无新增失败。

- [ ] **Step 2: 运行生产构建**

```powershell
..\.tools\node\npm.cmd run build
```

Expected: Vite 构建成功，`dist/` 不进入提交。

- [ ] **Step 3: 启动本地页面**

```powershell
..\.tools\node\npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

打开：

```text
http://127.0.0.1:5173/
```

- [ ] **Step 4: 验收 ready 状态**

在真实本地评估数据下检查：

1. Top1、Top3、Top5 从同一零点起算，条长与数值比例一致。
2. 正常示例 11.59%、13.04%、18.84% 使用 `0 / 10 / 20%` 横轴。
3. `+1.45pp` 位于 11.59% 与 13.04% 之间。
4. `+5.80pp` 位于 13.04% 与 18.84% 之间。
5. 差值前没有装饰圆点。
6. Log Loss 和 Brier Score 只显示事实值，不出现好坏标签。
7. 融合权重所有活跃进度条均为品牌蓝。
8. 基础权重刻度为中性灰；未启用模型为灰色。
9. 子模型回测外观和交互与实施前一致。

- [ ] **Step 5: 验收自适应横轴**

自动化测试必须证明：

| 最大命中率 | 横轴 |
|---:|---|
| `18.84%` | `0 / 10 / 20%` |
| `32%` | `0 / 20 / 40%` |
| `50%` | `0 / 30 / 60%` |
| `82%` | `0 / 50 / 100%` |

条宽计算必须使用 `row.value / coverageScale.value.max`，禁止写死 20% 上界。

- [ ] **Step 6: 验收响应式**

| 宽度 | 验收要求 |
|---:|---|
| `1440px+` | 核心图最大宽度 1280px；融合权重保持五列，不无限拉伸 |
| `1180px` | 融合权重仍为五列，不出现 3+2 |
| `1000px / 860px` | 融合权重切为单列分析行；标题和校准指标自然换行 |
| `520px` | 核心图每行改为“名称+数值、下一行图条”；差值回到数值旁；融合权重纵向排列；无页面级横向溢出 |

浅色和深色使用相同 DOM 结构。深色只依赖既有 token 映射，不新增渐变、光晕或玻璃效果。

- [ ] **Step 7: 验收未就绪状态**

使用安全的本地空 UID，或仅依靠既有状态测试验证：

- 页面显示“待录入”和数据准备动作。
- 核心回测、当前融合权重、子模型回测均不挂载。
- 页面不存在伪造的 `0.00%`、Log Loss `0` 或 Brier `0`。
- loading/error 仍由 `InsightRequestState` 处理，不与零样本混用。

- [ ] **Step 8: 检查控制台、溢出和键盘焦点**

- 浏览器控制台无新增 error/warn。
- 1440、1180、860、520px 下 `document.documentElement.scrollWidth <= window.innerWidth`。
- 图表本身无虚假可点击态。
- 融合权重摘要中的可聚焦模型名称仍有可见 `focus-visible`。

- [ ] **Step 9: 运行仓库卫生检查**

```powershell
cd ..
git diff --check
git status --short
git diff -- WuwaFrontend/src/features/evaluation WuwaFrontend/src/styles/features/evaluation.css WuwaFrontend/src/styles/features/evaluation-layout.css WuwaFrontend/src/App.test.js
```

Expected: `git diff --check` 无输出；diff 不包含 API、算法、子模型回测实现、`dist/`、日志或本地配置。

- [ ] **Step 10: 写实施记录**

创建：

```markdown
# 模型评估核心回测与融合权重优化实施记录

## 结果

- 核心回测改为真实比例水平比较图，Top1、Top3、Top5 共用动态横轴。
- 新增覆盖使用百分点表达，并放在相邻累计命中率之间。
- 融合权重当前值统一为品牌蓝，基础权重和禁用模型使用中性灰。
- 1180px 不再使用 3+2；1000px 以下切换为单列分析行。
- 未就绪时继续隐藏全部结果模块，子模型回测和后端契约未修改。

## 验证

- 定向 Node 测试：记录实际命令、通过数量与退出码。
- 前端全量测试：记录实际命令、通过数量与退出码。
- Vite 生产构建：记录实际命令、构建摘要与退出码。
- 1440 / 1180 / 860 / 520px、浅色 / 深色：逐项记录通过或失败以及失败原因。
- `git diff --check`：记录实际命令和退出码。

## 未修改范围

- Django API、数据库、评估算法、权重算法和 20 条有效回测阈值。
- `EvaluationBacktest.vue` 的子模型回测视觉与交互。
```

实施记录必须来自当次真实命令和浏览器检查，不能预先写成“通过”。

- [ ] **Step 11: 提交实施记录**

```powershell
git add docs/archive/2026-07-19-evaluation-core-backtest-and-fusion-weight-polish-implementation.md
git commit -m "docs: record evaluation backtest polish"
```

## 4. 最终验收清单

- [ ] 图条位置和长度由真实命中率决定，不再是固定 10/50/90% 节点。
- [ ] 横轴最大值随数据扩大，并保留约 10% 视觉余量。
- [ ] 所有横轴上界不超过 100%。
- [ ] Top3 和 Top5 新增覆盖使用 `pp`，可访问名称写明“个百分点”。
- [ ] 差值位于相邻百分比之间且没有 `·`。
- [ ] 同组百分比保留两位小数，刻度使用整数百分比。
- [ ] 数字使用 `--font-data` 和 `tabular-nums`。
- [ ] Log Loss 与 Brier Score 不附加无基准的定性判断。
- [ ] 融合当前权重只使用 `var(--primary)`，不存在蓝绿渐变。
- [ ] 基础权重只使用中性刻度线，不把上调/下调涂成红绿。
- [ ] 0% 且未启用的模型保持低对比度。
- [ ] 1180px 不出现 3+2。
- [ ] 520px 无横向溢出，不通过缩小字体解决布局。
- [ ] 深色模式无新增渐变、光晕、玻璃和大阴影。
- [ ] 零样本、collecting、loading、error、ready 五类状态没有混用。
- [ ] 看到三组数据图表时，后端状态一定是 `ready`。
- [ ] 子模型回测、API、算法和数据结构未修改。
- [ ] 全量测试、生产构建、浏览器验收和 `git diff --check` 通过。

## 5. Self-review

- **Spec coverage:** 核心图表语义、动态横轴、百分点差值、校准指标、融合权重配色、响应式、零样本契约、深色模式、无障碍和验证均有对应任务。
- **Scope:** 改动只落在评估 feature、评估样式、定向测试与实施记录；不重构子模型回测或数据契约。
- **Type consistency:** 横轴函数统一接收 `0..1` 概率；组件继续使用后端原始小数值；展示通过现有 `formatPercent` 和 `formatSignedPercentagePoints`。
- **Owner consistency:** 纯计算位于 evaluation feature；页面门槛仍由 `EvaluationView` 和 `sampleExperience` 拥有；CSS 沿用现有 evaluation 入口。
- **Workspace safety:** 计划明确识别当前重叠未提交改动，并要求执行时隔离，禁止自动重置、暂存或混合提交。
