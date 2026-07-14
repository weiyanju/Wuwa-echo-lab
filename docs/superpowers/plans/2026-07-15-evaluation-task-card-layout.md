# Evaluation Task Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将模型评估页改造成“页面摘要 + 核心回测 + 当前融合权重 + 子模型回测”四级阅读路径，并以三个同级任务卡片取代当前外层巨型卡片与不一致的内部边界。

**Architecture:** 新增 `EvaluationView.vue` 作为评估页唯一组合 owner，由它渲染页头和三个同级任务模块；新增 `EvaluationCoreBacktest.vue` 承接核心回测，将现有 `EvaluationOverview.vue` 收窄为融合权重模块，将 `EvaluationBacktest.vue` 收窄为子模型诊断模块。视觉上保留一个边界层级：页面容器透明，三个任务模块统一外壳，模块内部的权重项、图表和模型行扁平化；深浅主题保持相同 DOM 与空间结构。

**Tech Stack:** Vue 3 `<script setup>`、Vite、原生 CSS、Node.js `node:test` 源码契约测试、Codex 应用内浏览器视觉验收。

---

## 锁定的产品与设计决策

- 阅读顺序固定为：模型评估摘要 → 核心回测 → 当前融合权重 → 子模型回测。
- 页面先回答“整体效果如何”，再回答“为什么这样融合”，最后提供“哪个子模型需要诊断”。
- `evaluation-panel` 继续承担页面布局 owner，但不再表现为包住全部内容的 24px 巨型卡片。
- 三个任务模块使用同一种外层卡片：1px 中性边框、12px 圆角、无阴影、相同标题栏和内边距。
- 模块内部不得再形成同等强度的完整卡片边界：
  - 核心回测图表直接位于模块内；
  - 五个融合权重项使用分栏与分隔线；
  - 子模型使用可展开列表行，而不是圆角卡片列表。
- 状态色只服务数据语义。绿色继续用于“观察中”“最高命中”和正向数据，不用于整张模块卡片边框。
- 子模型详情默认全部收起；一次最多展开一行；展开、收起、Markov 拖拽和各模型详情标签页行为保持可用。
- 不修改评估 API、预测算法、权重计算、命中率计算或数据契约。
- 1180px 以下权重项改为 3 + 2；860px 以下模块标题栏允许换行；520px 以下权重项单列，子模型继续隐藏 Loss 次要列。

## 文件职责图

**Create**

- `WuwaFrontend/src/features/evaluation/EvaluationView.vue`：评估页组合 owner、页头状态摘要、三个模块的语义顺序。
- `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.vue`：只负责核心回测指标、覆盖区间图和校准摘要。
- `WuwaFrontend/src/features/evaluation/EvaluationView.test.js`：评估页组合顺序、同级模块边界和 App 接线契约。
- `WuwaFrontend/src/styles/features/evaluation-layout.css`：评估页任务卡片、内部扁平化、深色层级和响应式；避免继续加厚接近行数上限的 `evaluation.css`。
- `docs/archive/2026-07-15-evaluation-task-card-layout-implementation.md`：实施完成后的实际结果、验证和视觉证据。
- `docs/design-baselines/web/2026-07-15/README.md`：本次评估页视觉基线说明。
- `docs/design-baselines/web/2026-07-15/evaluation-light.png`：1440px 以上桌面浅色视觉基线。
- `docs/design-baselines/web/2026-07-15/evaluation-dark.png`：1440px 以上桌面深色视觉基线。

**Modify**

- `WuwaFrontend/src/App.vue`：用单一 `EvaluationView` 替换 App 内对两个评估子组件的直接编排。
- `WuwaFrontend/src/App.test.js`：更新核心回测与评估组合 owner 的源码读取位置。
- `WuwaFrontend/src/architecture.test.js`：为新增评估 owner 和核心回测组件设置行数边界，收紧已拆分的 Backtest 边界。
- `WuwaFrontend/src/features/evaluation/EvaluationOverview.vue`：移除页头职责，改成完整的融合权重任务模块。
- `WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js`：验证融合模块边界、移除状态栏职责并保留权重联动。
- `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`：移除核心回测，改成完整的子模型任务模块；默认不自动展开模型详情。
- `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`：验证子模型模块边界、单行披露与默认收起行为。
- `WuwaFrontend/src/styles/features/evaluation.css`：导入新的 layout 文件，并删除已废弃的核心回测嵌套卡片选择器和冲突的旧模块边界规则。
- `docs/architecture.md`：记录 `EvaluationView`、核心回测、融合概览和子模型诊断的 owner 边界。

## 执行前置

实施前先运行：

```powershell
git status --short
git branch --show-current
```

若当前仍在 `main`，执行：

```powershell
git switch -c codex/evaluation-task-card-layout
```

现有工作树包含其他已确认 UI 修改。不得 reset、checkout 或覆盖这些修改；每个提交只暂存本方案明确列出的文件。

### Task 1: 建立评估页组合与模块层级的失败测试

**Files:**
- Create: `WuwaFrontend/src/features/evaluation/EvaluationView.test.js`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`
- Test: `WuwaFrontend/src/features/evaluation/EvaluationView.test.js`

- [ ] **Step 1: 创建评估页阅读顺序测试**

在 `EvaluationView.test.js` 写入：

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('evaluation view owns the result-first task order and app wiring', async () => {
  const source = await readFile(new URL('./EvaluationView.vue', import.meta.url), 'utf8')
  const appSource = await readFile(new URL('../../App.vue', import.meta.url), 'utf8')

  assert.match(source, /import EvaluationCoreBacktest from '\.\/EvaluationCoreBacktest\.vue'/)
  assert.match(source, /import EvaluationOverview from '\.\/EvaluationOverview\.vue'/)
  assert.match(source, /import EvaluationBacktest from '\.\/EvaluationBacktest\.vue'/)
  assert.match(source, /class="product-panel full-panel evaluation-panel"/)
  assert.match(source, /class="evaluation-module-stack"/)

  const coreIndex = source.indexOf('<EvaluationCoreBacktest')
  const fusionIndex = source.indexOf('<EvaluationOverview')
  const modelsIndex = source.indexOf('<EvaluationBacktest')
  assert.ok(coreIndex >= 0 && coreIndex < fusionIndex)
  assert.ok(fusionIndex < modelsIndex)

  assert.match(appSource, /import EvaluationView from '\.\/features\/evaluation\/EvaluationView\.vue'/)
  assert.match(appSource, /<EvaluationView[\s\S]+:model-details="modelDetailCards"/)
  assert.doesNotMatch(appSource, /import EvaluationOverview from/)
  assert.doesNotMatch(appSource, /import EvaluationBacktest from/)
})

test('evaluation task modules use one sibling card boundary each', async () => {
  const core = await readFile(new URL('./EvaluationCoreBacktest.vue', import.meta.url), 'utf8')
  const fusion = await readFile(new URL('./EvaluationOverview.vue', import.meta.url), 'utf8')
  const models = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')

  assert.match(core, /class="evaluation-card evaluation-module evaluation-core-module"/)
  assert.match(fusion, /class="evaluation-card evaluation-module evaluation-fusion-module"/)
  assert.match(models, /class="evaluation-card evaluation-module model-backtest-card"/)
  assert.doesNotMatch(core, /class="evaluation-card chart-card"/)
  assert.doesNotMatch(models, /class="evaluation-grid compact-evaluation-grid evaluation-chart-strip"/)
})
```

- [ ] **Step 2: 更新 Overview 与 Backtest 的职责测试**

将 `EvaluationOverview.test.js` 第一个测试重命名为 `evaluation overview owns fusion status and summary presentation`，删除 `appSource` 读取、`stats` prop 断言以及 App 直接 import/render Overview 的两个断言，然后增加：

```js
assert.match(source, /class="evaluation-card evaluation-module evaluation-fusion-module"/)
assert.match(source, /class="evaluation-module-header"/)
assert.doesNotMatch(source, /class="evaluation-status-bar"/)
assert.doesNotMatch(source, /stats: \{ type: Object/)
```

在第二个 Top1 语义测试中新增：

```js
const coreSource = await readFile(new URL('./EvaluationCoreBacktest.vue', import.meta.url), 'utf8')
```

并把 `aria-label="首选到前五预测范围命中率"` 的断言从 `backtestSource` 改为 `coreSource`；`model.adjustment?.hit_rate` 仍由 Backtest 断言。

将 `EvaluationBacktest.test.js` 第一个测试删除 `appSource` 读取、旧 `evaluation-chart-strip` 正向断言以及 App 直接 import/render Backtest 的两个断言，然后增加：

```js
assert.match(source, /class="evaluation-card evaluation-module model-backtest-card"/)
assert.doesNotMatch(source, /<h3>核心回测<\/h3>/)
assert.doesNotMatch(source, /class="evaluation-grid compact-evaluation-grid evaluation-chart-strip"/)
```

新增默认收起契约：

```js
test('submodel diagnostics start collapsed and keep one selected row', async () => {
  const source = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')

  assert.match(source, /const selectedModelDetailKey = ref\(null\)/)
  assert.match(source, /const expandedModelDetailKey = computed\(\(\) => \{/)
  assert.match(source, /return selectedRow \? selectedKey : null/)
  assert.match(source, /selectedModelDetailKey\.value = expandedModelDetailKey\.value === key \? null : key/)
  assert.doesNotMatch(source, /defaultExpandedModelDetailKey/)
  assert.doesNotMatch(source, /collapsedModelDetailKeys/)
  assert.doesNotMatch(source, /hasManualModelDetailInteraction/)
})
```

- [ ] **Step 3: 运行定向测试并确认按预期失败**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src\features\evaluation\EvaluationView.test.js src\features\evaluation\EvaluationOverview.test.js src\features\evaluation\EvaluationBacktest.test.js
```

Expected: FAIL；`EvaluationView.vue` 与 `EvaluationCoreBacktest.vue` 尚不存在，Overview/Backtest 仍使用旧职责和旧结构。

- [ ] **Step 4: 保留失败测试供后续结构任务转绿**

此时不要提交。Task 2–5 会连续完成组件拆分、页面组合和披露行为，等全部结构测试通过后一次提交可运行的结构改造，避免在分支历史中保留必然失败的中间提交。

### Task 2: 抽取核心回测任务模块

**Files:**
- Create: `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.vue`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue:1-115,406-455`
- Modify: `WuwaFrontend/src/App.test.js`
- Test: `WuwaFrontend/src/features/evaluation/EvaluationView.test.js`

- [ ] **Step 1: 创建只接收 evaluation 的核心回测组件**

`EvaluationCoreBacktest.vue` 使用下面的完整脚本职责；从旧 Backtest 移动同名计算，不复制第二套实现：

```vue
<script setup>
import { computed } from 'vue'

import { evaluationMetricDefinitions } from '../../data/modelPresentation.js'
import { formatPercent, formatSignedPercent } from '../../services/formatters.js'

const props = defineProps({
  evaluation: { type: Object, default: null },
})

const evaluationMetrics = computed(() =>
  evaluationMetricDefinitions.map((metric) => ({
    ...metric,
    value: props.evaluation?.[metric.key],
  })),
)
const hitRateMetrics = computed(() => evaluationMetrics.value.filter((metric) => metric.label.includes('命中率')))
const technicalEvaluationMetrics = computed(() => evaluationMetrics.value.filter((metric) => !metric.label.includes('命中率')))
const evaluationReady = computed(() => props.evaluation?.status === 'ready')

function evaluationMetricText(metric) {
  if (metric?.value == null) return '样本不足'
  return metric.label.includes('命中率') ? formatPercent(metric.value) : metric.value.toFixed(2)
}

function coverageNodePosition(index) {
  return [10, 50, 90][index] ?? 50
}

function coverageNodeClass(index) {
  return ['start', 'middle', 'end'][index] || ''
}

function coverageGainText(metrics) {
  const first = metrics[0]
  const last = metrics.at(-1)
  if (!first || !last || first.value == null || last.value == null) return '回测样本不足'
  return `前五相对首选命中率提升 ${formatSignedPercent(last.value - first.value)}`
}

function coverageMetricLabel(metric) {
  if (metric.key === 'top_1_hit_rate') return '首选 · 第一候选'
  if (metric.key === 'top_3_hit_rate') return '前三 · 推荐参考'
  return '前五 · 补充检查'
}

function calibrationSummaryText() {
  const logLoss = technicalEvaluationMetrics.value.find((metric) => metric.label === 'Log Loss')
  const brier = technicalEvaluationMetrics.value.find((metric) => metric.label === 'Brier Score')
  return `概率校准：Log Loss ${evaluationMetricText(logLoss)} · Brier ${evaluationMetricText(brier)}`
}
</script>
```

- [ ] **Step 2: 将核心回测模板放进单一模块边界**

新组件模板固定为以下完整层级；覆盖轨道、三个节点和结论文案都在新组件内定义：

```vue
<template>
  <section class="evaluation-card evaluation-module evaluation-core-module">
    <header class="evaluation-module-header">
      <h3>核心回测</h3>
      <span class="evaluation-technical-meta">{{ calibrationSummaryText() }}</span>
    </header>

    <div class="evaluation-core-content">
      <div class="chart-heading chart-heading-stacked">
        <h4>预测范围命中率</h4>
      </div>
      <div
        class="coverage-band-chart"
        role="img"
        aria-label="首选到前五预测范围命中率"
        title="首选表示第一候选；前三表示推荐参考；前五表示补充检查。"
      >
        <div class="coverage-band-track" aria-hidden="true">
          <span class="coverage-band-fill"></span>
          <i
            v-for="(metric, index) in hitRateMetrics"
            :key="metric.label"
            class="coverage-band-node"
            :class="coverageNodeClass(index)"
            :style="{ left: `${coverageNodePosition(index)}%` }"
          ></i>
        </div>
        <div class="coverage-labels">
          <article
            v-for="(metric, index) in hitRateMetrics"
            :key="metric.label"
            :title="`${metric.label} ${evaluationMetricText(metric)}`"
            :style="{ left: `${coverageNodePosition(index)}%` }"
          >
            <strong>{{ evaluationMetricText(metric) }}</strong>
            <span>{{ coverageMetricLabel(metric) }}</span>
          </article>
        </div>
        <div class="coverage-gain-note">
          <strong>{{ coverageGainText(hitRateMetrics) }}</strong>
          <span>{{ evaluationReady ? '前三适合作为推荐参考，前五适合做补充检查。' : '积累更多副词条记录后自动计算。' }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 3: 从 Backtest 删除已经迁移的核心回测职责**

删除以下仅服务核心回测的成员：

```js
const evaluationMetrics
const hitRateMetrics
const technicalEvaluationMetrics
function evaluationMetricText(metric)
function coverageNodePosition(index)
function coverageNodeClass(index)
function coverageGainText(metrics)
function coverageMetricLabel(metric)
function calibrationSummaryText()
```

同时从 `modelPresentation.js` import 中删除 `evaluationMetricDefinitions`；`formatSignedPercent` 仍被模型详情使用，必须保留。

保留 `evaluationReady`，因为子模型的“最高命中”判断仍使用它。删除模板中的 `backtest-section-title`、`evaluation-chart-strip` 和 `chart-card` 整段，只保留子模型 section。

- [ ] **Step 4: 更新直接读取核心回测源码的测试**

在 `App.test.js` 的 `evaluation metrics use backend values instead of preview fallbacks` 测试中同时读取核心组件和子模型组件：

```js
const coreBacktestSource = await readFile(
  new URL('./features/evaluation/EvaluationCoreBacktest.vue', import.meta.url),
  'utf8',
)
const backtestSource = await readFile(new URL('./features/evaluation/EvaluationBacktest.vue', import.meta.url), 'utf8')
```

把 preview fallback 与 `metric?.value == null` 两项断言改读 `coreBacktestSource`；`evaluationReady` 和 model score 断言继续读取 `backtestSource`/`modelDetails.js`。

在 `coverage band nodes keep colored fills in dark mode` 中把 `backtestSource` 替换为 `coreBacktestSource`；样式断言继续读取 `evaluation.css`。

其余模型详情、Markov、Bayes、Cycle、Rule、Context 测试继续读取 `EvaluationBacktest.vue`。

- [ ] **Step 5: 运行核心模块和现有诊断测试**

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test --test-name-pattern="fusion weight overview excludes" src\features\evaluation\EvaluationOverview.test.js
..\.tools\node\node.exe --test --test-name-pattern="evaluation metrics use backend|coverage band nodes" src\App.test.js
```

Expected: 两组定向测试 PASS；核心回测语义已经由新组件承接。其余结构契约留到 Task 3–5 完成全部模块边界后一起转绿。

- [ ] **Step 6: 继续页面组合，不提交缺少入口的中间状态**

此时 `EvaluationCoreBacktest.vue` 已可独立测试，但 App 尚未使用它。继续执行 Task 3，不暂存、不提交。

### Task 3: 新增评估页组合 owner 并让 App 保持轻量

**Files:**
- Create: `WuwaFrontend/src/features/evaluation/EvaluationView.vue`
- Modify: `WuwaFrontend/src/App.vue:1-12,308-312`
- Modify: `WuwaFrontend/src/App.test.js`
- Modify: `WuwaFrontend/src/architecture.test.js:9-30`
- Modify: `docs/architecture.md:261-279`
- Test: `WuwaFrontend/src/features/evaluation/EvaluationView.test.js`

- [ ] **Step 1: 创建 EvaluationView 页面组合组件**

```vue
<script setup>
import { computed } from 'vue'

import { evaluationMetricDefinitions } from '../../data/modelPresentation.js'
import { formatPercent, sampleStageText } from '../../services/formatters.js'
import EvaluationBacktest from './EvaluationBacktest.vue'
import EvaluationCoreBacktest from './EvaluationCoreBacktest.vue'
import EvaluationOverview from './EvaluationOverview.vue'

const props = defineProps({
  evaluation: { type: Object, default: null },
  modelDetails: { type: Array, default: () => [] },
  prediction: { type: Object, default: null },
  stats: { type: Object, default: null },
})

const topThreeMetric = computed(() => {
  const definition = evaluationMetricDefinitions.find((metric) => metric.key === 'top_3_hit_rate')
  return { ...definition, value: props.evaluation?.top_3_hit_rate }
})

function evaluationMetricText(metric) {
  return metric?.value == null ? '样本不足' : formatPercent(metric.value)
}

function evaluationStatusText() {
  if (props.evaluation && props.evaluation.status !== 'ready') return '样本不足'
  const total = props.stats?.total_rolls || 0
  if (total >= 3000) return '稳定'
  if (total >= 500) return '可参考'
  return '观察中'
}
</script>

<template>
  <section class="product-panel full-panel evaluation-panel">
    <header class="evaluation-status-bar">
      <h2>模型评估</h2>
      <div class="evaluation-status-chips" aria-label="评估摘要">
        <span class="evaluation-status-chip state"><i aria-hidden="true"></i>{{ evaluationStatusText() }}</span>
        <span class="evaluation-status-chip"><small>阶段</small>{{ stats ? sampleStageText(stats.sample_stage).split('：')[0] : '等待样本' }}</span>
        <span class="evaluation-status-chip"><small>前三命中</small>{{ evaluationMetricText(topThreeMetric) }}</span>
      </div>
    </header>

    <div class="evaluation-module-stack">
      <EvaluationCoreBacktest :evaluation="evaluation" />
      <EvaluationOverview :evaluation="evaluation" :model-details="modelDetails" :prediction="prediction" />
      <EvaluationBacktest :evaluation="evaluation" :model-details="modelDetails" :prediction="prediction" />
    </div>
  </section>
</template>
```

- [ ] **Step 2: 将 App 的评估入口收敛到单一组件**

替换 imports：

```js
import EvaluationView from './features/evaluation/EvaluationView.vue'
```

替换模板：

```vue
<EvaluationView
  v-if="!gameAccount.workspaceLocked.value && page === 'evaluation'"
  :evaluation="evaluation"
  :model-details="modelDetailCards"
  :prediction="prediction"
  :stats="stats"
/>
```

同时在 `App.test.js` 的 `evaluation page exposes evaluated sample counts and gates confidence labels` 测试中用：

```js
const viewSource = await readFile(new URL('./features/evaluation/EvaluationView.vue', import.meta.url), 'utf8')
```

替换 `overviewSource`，并把 `evaluationStatusText()` 的断言改读 `viewSource`。

- [ ] **Step 3: 设置新的架构体积边界**

在 `architecture.test.js` 的高吸引力文件测试中加入：

```js
assert.ok(await lineCount('./features/evaluation/EvaluationView.vue') <= 110, 'EvaluationView.vue must not grow beyond 110 lines')
assert.ok(await lineCount('./features/evaluation/EvaluationCoreBacktest.vue') <= 130, 'EvaluationCoreBacktest.vue must not grow beyond 130 lines')
assert.ok(await lineCount('./features/evaluation/EvaluationOverview.vue') <= 250, 'EvaluationOverview.vue must not grow beyond 250 lines')
assert.ok(await lineCount('./features/evaluation/EvaluationBacktest.vue') <= 620, 'EvaluationBacktest.vue must not grow beyond 620 lines')
```

删除旧的 `EvaluationBacktest.vue <= 705` 断言，避免重复边界。

- [ ] **Step 4: 更新长期架构说明**

将 `docs/architecture.md` 的 evaluation 说明更新为：

```markdown
- `features/evaluation/EvaluationView.vue`：模型评估页组合 owner，负责页面状态摘要和结果优先的模块顺序。
- `features/evaluation/EvaluationCoreBacktest.vue`：核心命中范围与概率校准摘要。
- `features/evaluation/EvaluationOverview.vue`：当前融合权重与融合结论。
- `features/evaluation/EvaluationBacktest.vue`：子模型列表、展开诊断和模型专属交互。
```

- [ ] **Step 5: 运行组合、App 和架构测试**

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src\features\evaluation\EvaluationView.test.js src\architecture.test.js src\App.test.js
```

Expected: 页面组合、App 接线和架构边界断言 PASS；`EvaluationView.test.js` 中关于融合/子模型最终模块 class 的断言会在 Task 4–5 完成后全部转绿。

- [ ] **Step 6: 继续融合与子模型结构，不提交半完成页面**

此时 App 已由新 owner 编排，但融合模块和子模型模块还没有完成最终边界与默认披露行为。继续执行 Task 4–5。

### Task 4: 将融合权重改成统一任务卡片与扁平指标条

**Files:**
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationOverview.vue:1-240`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:769-1169,3901-3934`
- Test: `WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js`

- [ ] **Step 1: 删除 Overview 的页头状态职责**

从 props 删除：

```js
stats: { type: Object, default: null },
```

将 imports 收窄为：

```js
import { canonicalModelLabels } from '../../data/modelPresentation.js'
import { formatPercent, modelWeightLabel } from '../../services/formatters.js'
```

删除 `evaluationMetrics`、`evaluationMetricText()`、`evaluationStatusText()` 和页头模板。摘要动画 key 改为：

```js
motionKey: [
  dominantKey || 'none',
  ...auxiliaries.map((model) => model.key || model.label),
  props.evaluation?.status || 'waiting',
].join(':'),
```

- [ ] **Step 2: 将融合标题、权重和结论放进一个模块**

只修改下面列出的边界标签；`fusion-shared-legend`、`fusion-live-pill`、`fusion-weight-grid` 内的 `v-for` article，以及摘要内部的悬停/聚焦事件不改动：

```diff
- <div class="evaluation-section-title">
+ <section class="evaluation-card evaluation-module evaluation-fusion-module">
+   <header class="evaluation-module-header">
      <div>
        <h3>当前融合权重</h3>
      </div>
      <div class="fusion-title-tools">
@@
      </div>
- </div>
+   </header>
@@
- <section
+ <div
    class="evaluation-summary-line"
    :class="evaluationSummaryParts.dominant.key ? `summary-dominant-${evaluationSummaryParts.dominant.key}` : ''"
  >
@@
- </section>
+ </div>
+ </section>
```

实施时不得新增第二个摘要组件或复制 `weightRows`；这里只改变语义容器。

- [ ] **Step 3: 运行 Overview 结构测试**

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src\features\evaluation\EvaluationOverview.test.js
```

Expected: PASS；Overview 不再渲染页头，且融合标题、权重与摘要属于同一个任务模块。

- [ ] **Step 4: 继续子模型结构，不单独提交**

融合模块结构已经完成，继续 Task 5，使三个任务模块同时达到可提交状态。

### Task 5: 将子模型回测改成默认收起的扁平诊断列表

**Files:**
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue:17-90,234-248,456-705`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`
- Test: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`

- [ ] **Step 1: 删除自动展开与已折叠集合状态**

将展开状态收敛为：

```js
const selectedModelDetailKey = ref(null)

const expandedModelDetailKey = computed(() => {
  const selectedKey = selectedModelDetailKey.value
  const selectedRow = modelEvaluationRows.value.find((row) => row.key === selectedKey)
  return selectedRow ? selectedKey : null
})

function toggleModelDetail(key) {
  selectedModelDetailKey.value = expandedModelDetailKey.value === key ? null : key
}
```

删除 `collapsedModelDetailKeys`、`hasManualModelDetailInteraction` 和 `defaultExpandedModelDetailKey` 三个声明，以及旧 `expandedModelDetailKey`/`toggleModelDetail` 内对这三个状态的所有读写。

- [ ] **Step 2: 将子模型 section 标记为同级任务模块**

修改根 section 和标题栏：

```vue
<section class="evaluation-card evaluation-module model-backtest-card">
  <header class="evaluation-module-header">
    <h3>子模型回测</h3>
    <span :title="modelBacktestSummaryText">{{ modelBacktestSummaryText }}</span>
  </header>
```

保留 `model-bars-head`、原生 disclosure button、`Transition` 和所有模型专属详情内容。

- [ ] **Step 3: 运行子模型定向测试**

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src\features\evaluation\EvaluationView.test.js src\features\evaluation\EvaluationOverview.test.js src\features\evaluation\EvaluationBacktest.test.js src\architecture.test.js src\App.test.js
```

Expected: 全部 PASS；结果优先的 DOM 顺序、三个同级任务模块、默认收起、原生 disclosure button、App 接线和架构边界同时成立。

- [ ] **Step 4: 提交完整的结构与交互改造**

```powershell
git add WuwaFrontend/src/App.vue WuwaFrontend/src/App.test.js WuwaFrontend/src/architecture.test.js WuwaFrontend/src/features/evaluation/EvaluationView.vue WuwaFrontend/src/features/evaluation/EvaluationView.test.js WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.vue WuwaFrontend/src/features/evaluation/EvaluationOverview.vue WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js docs/architecture.md
git commit -m "refactor: compose evaluation task modules"
```

### Task 6: 实现三张同级卡片与单边界内部样式

**Files:**
- Create: `WuwaFrontend/src/styles/features/evaluation-layout.css`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:1-230,769-1169,3113-3306,3644-4180,4319-4550`
- Modify: `WuwaFrontend/src/architecture.test.js`
- Test: `WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js`
- Test: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`

- [ ] **Step 1: 建立独立布局样式 owner**

在 `evaluation.css` 第一行加入：

```css
@import './evaluation-layout.css';
```

创建 `evaluation-layout.css` 并先写入文件职责说明：

```css
/* Evaluation page-level task surfaces, flat module contents, theme mapping, and responsive layout. */
```

在 `architecture.test.js` 的样式体积测试中加入：

```js
assert.ok(await lineCount('./styles/features/evaluation-layout.css') <= 260, 'evaluation-layout.css must not grow beyond 260 lines')
```

并在 evaluation ownership 测试中加入：

```js
const evaluationLayout = await readFile(new URL('./styles/features/evaluation-layout.css', import.meta.url), 'utf8')

assert.match(evaluation, /@import '\.\/evaluation-layout\.css';/)
assert.match(evaluationLayout, /\.product-panel\.evaluation-panel \{/)
assert.match(evaluationLayout, /\.evaluation-module-stack \{/)
assert.match(evaluationLayout, /\.evaluation-module \{/)
```

- [ ] **Step 2: 增加单边界视觉结构的失败测试**

在 `EvaluationOverview.test.js` 增加：

```js
test('fusion weight module uses one shell with flat metric cells', async () => {
  const style = await readFile(new URL('../../styles/features/evaluation-layout.css', import.meta.url), 'utf8')

  assert.match(style, /\.evaluation-fusion-module \.fusion-weight-grid \{[^}]*gap: 0;[^}]*overflow: hidden;/)
  assert.match(style, /\.evaluation-fusion-module \.fusion-weight-card \{[^}]*border: 0;[^}]*border-radius: 0;[^}]*background: transparent;/)
  assert.match(style, /\.evaluation-fusion-module \.evaluation-summary-line \{[^}]*border-right: 0;[^}]*border-bottom: 0;[^}]*border-left: 0;/)
})
```

在 `EvaluationBacktest.test.js` 增加：

```js
test('submodel module uses flat disclosure rows inside one shell', async () => {
  const layoutStyle = await readFile(new URL('../../styles/features/evaluation-layout.css', import.meta.url), 'utf8')

  assert.match(layoutStyle, /\.model-backtest-card \.model-bars \{[^}]*gap: 0;[^}]*overflow: hidden;/)
  assert.match(layoutStyle, /\.model-backtest-card \.model-bars article[^}]*\{[^}]*border: 0;[^}]*border-radius: 0;[^}]*background: transparent;/)
})
```

运行：

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src\features\evaluation\EvaluationOverview.test.js src\features\evaluation\EvaluationBacktest.test.js src\architecture.test.js
```

Expected: FAIL；新的 layout 文件还只有职责注释，没有任务卡片和内部扁平化规则。

- [ ] **Step 3: 将页面外层改成透明布局容器**

在 `evaluation-layout.css` 使用以下规则；联合选择器必须覆盖稍后由 `controls.css` 加载的 `.product-panel`：

```css
.product-panel.evaluation-panel {
  position: relative;
  overflow: visible;
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
}

.product-panel.evaluation-panel > .evaluation-status-bar {
  margin: 0 0 20px;
  padding: 0 2px 14px;
}

.evaluation-module-stack {
  display: grid;
  gap: 18px;
}

.evaluation-panel .evaluation-module {
  min-width: 0;
  border: 1px solid #dce5ec;
  border-radius: 12px;
  padding: 18px 20px;
  background: #ffffff;
  box-shadow: none;
}

.evaluation-module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.evaluation-module-header h3,
.evaluation-module-header h4 {
  margin: 0;
}
```

- [ ] **Step 4: 扁平化核心回测内部图表**

```css
.evaluation-core-content {
  min-width: 0;
}

.evaluation-core-module .chart-heading-stacked {
  margin-bottom: 24px;
}

.evaluation-core-module .chart-heading h4 {
  margin: 0;
  color: #0b151a;
  font-size: var(--text-card-title);
  font-weight: var(--weight-control);
  line-height: var(--leading-control);
}

.evaluation-core-module .coverage-band-chart {
  padding: 14px 22px 0;
}
```

删除不再有 DOM 使用者的规则：

```css
.backtest-section-title
.compact-evaluation-grid
.chart-card
.chart-card .chart-heading-stacked
.evaluation-chart-strip
.evaluation-chart-strip .evaluation-card
.evaluation-chart-strip .chart-card
.evaluation-chart-strip .model-backtest-card
```

同时从深色组合选择器中删除 `.chart-card` 和 `.evaluation-chart-strip .evaluation-card`。

- [ ] **Step 5: 将融合权重改成同一指标条内的五列**

```css
.evaluation-panel .evaluation-fusion-module .fusion-weight-grid {
  gap: 0;
  overflow: hidden;
  border: 1px solid #e1e9ef;
  border-radius: 10px;
}

.evaluation-panel .evaluation-fusion-module .fusion-weight-card {
  gap: 14px;
  border: 0;
  border-right: 1px solid #e1e9ef;
  border-radius: 0;
  padding: 14px 16px 18px;
  background: transparent;
  box-shadow: none;
}

.evaluation-panel .evaluation-fusion-module .fusion-weight-card:last-child {
  border-right: 0;
}

.evaluation-panel .evaluation-fusion-module .evaluation-summary-line {
  margin: 14px 0 0;
  border-right: 0;
  border-bottom: 0;
  border-left: 0;
  border-radius: 0;
  padding: 14px 2px 0;
  background: transparent;
}
```

保留 `summary-linked` 的模型联动，但把外发光改成仅改变底色和内边框，避免指标格看起来重新变成浮层卡片。

- [ ] **Step 6: 将子模型卡片列表改成表格式行**

```css
.evaluation-panel .model-backtest-card .model-bars {
  gap: 0;
  overflow: hidden;
  border: 1px solid #e1e9ef;
  border-radius: 10px;
}

.evaluation-panel .model-backtest-card .model-bars article,
.evaluation-panel .model-backtest-card .model-bars article.best,
.evaluation-panel .model-backtest-card .model-bars article.expanded,
.evaluation-panel .model-backtest-card .model-bars article.best.expanded {
  border: 0;
  border-bottom: 1px solid #e1e9ef;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.evaluation-panel .model-backtest-card .model-bars article:last-child {
  border-bottom: 0;
}

.evaluation-panel .model-backtest-card .model-bars article:hover,
.evaluation-panel .model-backtest-card .model-bars article.expanded {
  background: rgba(23, 105, 210, 0.035);
}

.evaluation-panel .model-backtest-card .model-bars article.best {
  background: rgba(44, 159, 112, 0.035);
}
```

最高命中继续由文字标签和进度颜色表达，不给整行增加绿色外框。

- [ ] **Step 7: 建立完全同构的深色层级**

```css
.app-shell.theme-dark .product-panel.evaluation-panel {
  background: transparent;
}

.app-shell.theme-dark .evaluation-panel .evaluation-module {
  border-color: rgba(63, 86, 102, 0.72);
  background: linear-gradient(180deg, rgba(30, 45, 57, 0.94), rgba(25, 39, 50, 0.92)), #1d2a35;
}

.app-shell.theme-dark .evaluation-core-module .chart-heading h4 {
  color: var(--ink-deep);
}

.app-shell.theme-dark .evaluation-panel .evaluation-fusion-module .fusion-weight-grid,
.app-shell.theme-dark .evaluation-panel .model-backtest-card .model-bars {
  border-color: rgba(63, 86, 102, 0.72);
}

.app-shell.theme-dark .evaluation-panel .evaluation-fusion-module .fusion-weight-card,
.app-shell.theme-dark .evaluation-panel .model-backtest-card .model-bars article {
  border-color: rgba(63, 86, 102, 0.72);
  background: transparent;
}

.app-shell.theme-dark .evaluation-panel .model-backtest-card .model-bars article:hover,
.app-shell.theme-dark .evaluation-panel .model-backtest-card .model-bars article.expanded {
  background: rgba(52, 113, 164, 0.1);
}
```

深色规则不得增加浅色模式不存在的父容器、边框或独立黑色背景。

- [ ] **Step 8: 实现 1180/860/520 三档响应式**

```css
@media (max-width: 1180px) {
  .evaluation-panel .evaluation-fusion-module .fusion-weight-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .evaluation-panel .evaluation-fusion-module .fusion-weight-card {
    border-bottom: 1px solid #e1e9ef;
  }

  .evaluation-panel .evaluation-fusion-module .fusion-weight-card:nth-child(3n) {
    border-right: 0;
  }

  .evaluation-panel .evaluation-fusion-module .fusion-weight-card:nth-last-child(-n + 2) {
    border-bottom: 0;
  }
}

@media (max-width: 860px) {
  .evaluation-module-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .fusion-title-tools {
    align-self: stretch;
    justify-content: space-between;
    min-width: 0;
    transform: none;
  }
}

@media (max-width: 520px) {
  .evaluation-panel .evaluation-module {
    padding: 16px;
  }

  .evaluation-panel .evaluation-fusion-module .fusion-weight-grid {
    grid-template-columns: 1fr;
  }

  .evaluation-panel .evaluation-fusion-module .fusion-weight-card,
  .evaluation-panel .evaluation-fusion-module .fusion-weight-card:nth-child(3n),
  .evaluation-panel .evaluation-fusion-module .fusion-weight-card:nth-last-child(-n + 2) {
    border-right: 0;
    border-bottom: 1px solid #e1e9ef;
  }

  .evaluation-panel .evaluation-fusion-module .fusion-weight-card:last-child {
    border-bottom: 0;
  }
}
```

在深色 1180/520 断点加入明确覆盖，不能回落到浅色 `#e1e9ef`：

```css
@media (max-width: 1180px) {
  .app-shell.theme-dark .evaluation-panel .evaluation-fusion-module .fusion-weight-card {
    border-bottom-color: rgba(63, 86, 102, 0.72);
  }
}

@media (max-width: 520px) {
  .app-shell.theme-dark .evaluation-panel .evaluation-fusion-module .fusion-weight-card {
    border-bottom-color: rgba(63, 86, 102, 0.72);
  }
}
```

- [ ] **Step 9: 清理 CSS 并保持体积边界**

运行：

```powershell
rg -n "chart-card|compact-evaluation-grid|evaluation-chart-strip|backtest-section-title" WuwaFrontend/src/styles/features/evaluation.css WuwaFrontend/src/features/evaluation
```

Expected: 无匹配。删除旧规则后 `evaluation.css` 继续低于 `architecture.test.js` 的 4700 行上限；新 `evaluation-layout.css` 低于 260 行，不提高任一上限。

- [ ] **Step 10: 运行组件、架构和设计状态测试**

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src\features\evaluation\EvaluationView.test.js src\features\evaluation\EvaluationOverview.test.js src\features\evaluation\EvaluationBacktest.test.js src\design-state-accent.test.js src\architecture.test.js src\App.test.js
```

Expected: 全部 PASS；没有新增装饰性侧边色条或圆角强调边框。

- [ ] **Step 11: 提交模块视觉层级**

```powershell
git add WuwaFrontend/src/styles/features/evaluation.css WuwaFrontend/src/styles/features/evaluation-layout.css WuwaFrontend/src/architecture.test.js WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js
git commit -m "style: separate evaluation task cards"
```

### Task 7: 浏览器验证、视觉基线与可访问性验收

**Files:**
- Create: `docs/design-baselines/web/2026-07-15/README.md`
- Create: `docs/design-baselines/web/2026-07-15/evaluation-light.png`
- Create: `docs/design-baselines/web/2026-07-15/evaluation-dark.png`
- Verify: `WuwaFrontend/src/features/evaluation/*.vue`
- Verify: `WuwaFrontend/src/styles/features/evaluation.css`

- [ ] **Step 1: 启动或复用本地 Vite 页面**

若当前 5174 端口没有运行页面，执行：

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd run dev -- --host 127.0.0.1 --port 5174
```

Expected: 页面可从 `http://127.0.0.1:5174/` 打开，且不修改数据库来伪造评估数据。

- [ ] **Step 2: 验证桌面浅色模式**

在至少 1440 × 900 视口检查：

1. 页头不再被一个巨型圆角边框包围。
2. 核心回测、当前融合权重、子模型回测是三张清晰的同级卡片。
3. 顺序为核心结果 → 融合机制 → 子模型诊断。
4. 核心图表没有第二层完整卡片边界。
5. 五个权重项属于同一指标条，数值和基础权重 marker 仍清楚。
6. 子模型默认全部收起；点击任一行只展开这一行；再次点击收起。
7. 展开 Markov 详情后拖拽轴仍正常，切换其他模型后前一行自动收起。

将确认后的截图保存为 `docs/design-baselines/web/2026-07-15/evaluation-light.png`。

- [ ] **Step 3: 验证桌面深色模式**

切换深色模式并检查：

1. DOM、模块顺序、间距和尺寸与浅色一致。
2. 三张模块卡片只比页面背景亮一个层级。
3. 权重项和子模型行没有额外黑色父背景或多余外框。
4. 绿色、蓝色和紫色仅落在状态、数据和模型语义上。
5. 展开 Bayes、Markov、Cycle、Rule、Context 后没有深色模式专属的额外容器层。

保存为 `docs/design-baselines/web/2026-07-15/evaluation-dark.png`。

- [ ] **Step 4: 验证 1180、860 和 520 响应式**

- 1180px：权重项显示 3 + 2，两行外框完整、无双重分隔线。
- 860px：模块标题和右侧元数据换行，不发生覆盖；状态 chips 左对齐。
- 520px：权重项单列；Loss 列隐藏；模型名称、命中率和展开按钮保持可读。
- 所有尺寸：Tab 可聚焦每个模型 disclosure button；焦点环不被 `overflow` 裁切。

- [ ] **Step 5: 写入视觉基线说明**

`docs/design-baselines/web/2026-07-15/README.md` 写入：

```markdown
# 2026-07-15 模型评估任务卡片视觉基线

本目录记录模型评估页从单一巨型容器改为三个同级任务卡片后的桌面视觉基线。

- `evaluation-light.png`：浅色模式，验证结果优先顺序、融合权重分栏和默认收起的子模型列表。
- `evaluation-dark.png`：深色模式，验证与浅色完全一致的空间结构以及单层表面映射。

验收重点：页面外层无巨型卡片感；核心回测、当前融合权重、子模型回测各只有一个主边界；模块内部不重复完整卡片外壳。
```

- [ ] **Step 6: 提交视觉证据**

```powershell
git add docs/design-baselines/web/2026-07-15/README.md docs/design-baselines/web/2026-07-15/evaluation-light.png docs/design-baselines/web/2026-07-15/evaluation-dark.png
git commit -m "docs: capture evaluation task card baselines"
```

### Task 8: 全量验证与实施记录

**Files:**
- Create: `docs/archive/2026-07-15-evaluation-task-card-layout-implementation.md`
- Verify: all files listed above

- [ ] **Step 1: 运行前端全量测试**

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test
```

Expected: 退出码 0，全部 Node 测试 PASS。

- [ ] **Step 2: 运行生产构建**

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd run build
```

Expected: 退出码 0，Vite 构建完成；不要提交 `dist/`。

- [ ] **Step 3: 检查格式和工作树范围**

```powershell
git diff --check
git status --short
git diff -- WuwaFrontend/src/App.vue WuwaFrontend/src/App.test.js WuwaFrontend/src/architecture.test.js WuwaFrontend/src/features/evaluation WuwaFrontend/src/styles/features/evaluation.css WuwaFrontend/src/styles/features/evaluation-layout.css docs/architecture.md docs/design-baselines/web/2026-07-15 docs/archive/2026-07-15-evaluation-task-card-layout-implementation.md
```

Expected: `git diff --check` 无输出；diff 只包含本方案范围，既有未关联修改保持原样且不进入本功能提交。

- [ ] **Step 4: 写入实施记录**

创建 `docs/archive/2026-07-15-evaluation-task-card-layout-implementation.md`：

```markdown
# 模型评估任务卡片布局实施记录

## 结果

- 模型评估页改为页面摘要和三个同级任务卡片，不再使用包住全部策略内容的巨型视觉卡片。
- 阅读顺序调整为核心回测、当前融合权重、子模型回测。
- 核心图表、融合权重项和子模型列表分别改为单边界内部结构。
- 子模型详情默认收起，并保持一次只展开一项。
- 深浅主题使用相同结构，响应式覆盖 1180px、860px 和 520px。

## 代码边界

- `EvaluationView.vue` 负责页面摘要和模块编排。
- `EvaluationCoreBacktest.vue` 负责核心命中范围与校准摘要。
- `EvaluationOverview.vue` 负责融合权重和结论。
- `EvaluationBacktest.vue` 负责子模型诊断交互。

## 验证

- `..\.tools\node\npm.cmd test`：通过。
- `..\.tools\node\npm.cmd run build`：通过。
- 浅色、深色、1180px、860px、520px 浏览器验收：通过。
- 视觉基线：`docs/design-baselines/web/2026-07-15/evaluation-light.png`、`evaluation-dark.png`。

## 未改变范围

- 未修改模型评估 API、数据库、样本边界、命中率算法、融合权重算法或预测流程。
```

- [ ] **Step 5: 提交实施记录并做最终 scoped commit**

```powershell
git add docs/archive/2026-07-15-evaluation-task-card-layout-implementation.md
git commit -m "docs: record evaluation task card implementation"
```

## 最终验收清单

- [ ] 页面第一屏能够先看到核心回测结果，不需要先解析融合机制。
- [ ] 三个任务模块标题都位于各自卡片内部，右侧元数据对齐一致。
- [ ] 页面外层没有巨型卡片边框；模块之间使用 18px 间距而不是粗分割线。
- [ ] 核心回测只有一个主卡片边界。
- [ ] 融合权重五项仍可比较，但不再表现为五张悬浮卡片。
- [ ] 子模型默认收起、一次只展开一个、键盘操作和焦点状态正常。
- [ ] 深浅主题的结构完全一致，深色没有独有黑底或额外边框。
- [ ] 1180px、860px、520px 不发生内容重叠、边框断裂或焦点裁切。
- [ ] 定向测试、全量测试、构建和 `git diff --check` 全部通过。

## Self-review

- Spec coverage：阅读顺序、三张同级卡片、内部扁平化、默认收起、深浅主题一致和三档响应式均有对应任务与验收。
- Placeholder scan：未发现占位描述、“类似处理”或未定义的组件/函数。
- Type consistency：所有新组件沿用现有 `evaluation`、`modelDetails`、`prediction`、`stats` prop 类型；`EvaluationCoreBacktest` 只接收 `evaluation`；App 与 EvaluationView 的 kebab-case 绑定保持一致。
