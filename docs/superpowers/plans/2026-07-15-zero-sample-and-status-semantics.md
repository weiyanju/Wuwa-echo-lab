# Zero Sample And Status Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为全局摘要、工作台、统计诊断和模型评估建立统一的样本成熟度、字段级零样本显示和可操作的准备状态，使零样本不再伪装成真实结论。

**Architecture:** 新增无副作用的 `shared/sampleExperience.js` 作为样本成熟度、阶段范围、评估准备度和可选指标占位的唯一 owner；统计与评估共用准备/请求状态组件，但继续由各自 feature 负责页面文案和已有结果模块。工作台继续保留当前自动空草稿和高频保存路径，按页刷新统计/评估通过独立控制器完成，避免把请求重新塞回档位点击路径，也避免继续加厚接近行数上限的 `App.vue` 与 `useEchoWorkspace.js`。

**Tech Stack:** Vue 3 `<script setup>`、原生 CSS、Node.js `node:test`、Vite、现有 Django 统计与评估 API。

---

## Scope And Constraints

- 设计依据：`docs/superpowers/specs/2026-07-15-zero-sample-and-status-semantics-design.md`。
- 本方案原地实施；当前工作树已有统计/评估同主题改动，必须保留并使用精确路径暂存，不执行 reset、checkout 或 `git add .`。
- 不修改 Django API、数据库、模型算法、`MIN_EVALUATED_SAMPLES = 20` 或样本阶段阈值。
- 不禁用“工作台 / 统计 / 评估”导航，不新增阻塞弹窗或强制 onboarding。
- 不渲染假数据；零样本统计图与评估任务模块整体隐藏。
- 真实计数 `0`、未计算指标 `--`、语义状态文字三者不得用通用 truthy/falsy formatter 混合处理。
- 进入统计或评估页时可以刷新对应数据；档位点击仍不等待统计或评估请求。
- 不提高 `App.vue <= 320`、`useEchoWorkspace.js <= 400`、`EchoWorkbenchView.vue <= 210` 等既有架构上限。
- 新增样式复用现有 token；不增加新颜色体系、UI 框架或全局状态管理。

## File Map

### Create

- `WuwaFrontend/src/shared/sampleExperience.js`：统一样本成熟度、阶段范围、评估准备度、计数规范化和 `--` 格式规则。
- `WuwaFrontend/src/shared/sampleExperience.test.js`：锁定全部阈值边界、真实零值与未计算值的差异。
- `WuwaFrontend/src/components/states/SampleReadinessPanel.vue`：统计与评估共用的单边界准备面板。
- `WuwaFrontend/src/components/states/SampleReadinessPanel.test.js`：锁定 props、原生进度、动作和 detail slot。
- `WuwaFrontend/src/components/states/InsightRequestState.vue`：把 loading/error 与零样本分开的共享请求状态。
- `WuwaFrontend/src/components/states/InsightRequestState.test.js`：锁定骨架、alert 和 retry 语义。
- `WuwaFrontend/src/styles/sample-readiness.css`：准备面板、请求状态、`--` 和响应式/深色规则的共享 owner。
- `WuwaFrontend/src/features/workspace/workspaceInsightRefresh.js`：统计与评估的独立、可失效按页刷新控制器。
- `WuwaFrontend/src/features/workspace/workspaceInsightRefresh.test.js`：锁定刷新、错误、账号切换和旧请求失效。
- `WuwaFrontend/src/composables/useDashboardNavigation.js`：顶部导航与按页刷新薄编排。
- `WuwaFrontend/src/composables/useDashboardNavigation.test.js`：锁定只刷新目标页面。
- `WuwaFrontend/src/components/shell/WorkspaceSummary.vue`：全局 `历史声骸 / 总样本 / 置信度` 的 loading、error、zero、ready 呈现。
- `WuwaFrontend/src/components/shell/WorkspaceSummary.test.js`：锁定 `0 / 0 / --`、无 `+0` 与非零置信度。
- `WuwaFrontend/src/features/statistics/SampleStageAxis.vue`：从统计页提取可在正常卡与零样本准备面板复用的阶段轴。
- `WuwaFrontend/src/features/statistics/SampleStageAxis.test.js`：锁定轴的原生输入和可访问语义。
- `docs/archive/2026-07-15-zero-sample-and-status-semantics-implementation.md`：实施结果、验证和视觉验收记录。

### Modify

- `WuwaFrontend/src/style.css`：导入共享准备状态样式，继续保持 import-only。
- `WuwaFrontend/src/styles/page-summary.css`：增加中性状态胶囊和空指标值修饰类。
- `WuwaFrontend/src/styles/shell.css`：全局摘要骨架、失败文字和 `--` 的稳定宽度。
- `WuwaFrontend/src/styles/features/workspace.css`：首次录入内联提示。
- `WuwaFrontend/src/styles/features/workspace-active.css`：规则基线来源说明。
- `WuwaFrontend/src/styles/features/statistics.css`：统计零样本准备布局，复用原阶段轴。
- `WuwaFrontend/src/styles/features/evaluation.css`：评估准备面板周边布局，不改已有 ready 模块内部视觉。
- `WuwaFrontend/src/architecture.test.js`：登记新增 owner 和文件体积上限。
- `WuwaFrontend/src/App.vue`：使用摘要组件、导航 composable、请求状态和页面 action/retry 接线。
- `WuwaFrontend/src/App.test.js`：锁定薄编排、零样本摘要接线和按页刷新。
- `WuwaFrontend/src/features/workspace/useEchoWorkspace.js`：接入独立 insight refresh controller 并暴露刷新/请求状态。
- `WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js`：锁定初次刷新与高频档位路径边界。
- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`：加入首次录入说明并向活动声骸面板传递零样本状态。
- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`：锁定首次提示不增加操作步骤。
- `WuwaFrontend/src/features/workspace/ActiveEchoCapturePanel.vue`：标注零样本预测来自规则基线。
- `WuwaFrontend/src/features/history/floatingHistoryMode.js`：只在无保存偏好且无可见历史时默认最小化。
- `WuwaFrontend/src/features/history/floatingHistoryMode.test.js`：锁定偏好优先级。
- `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`：把初始化时的可见历史状态传给纯函数。
- `WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js`：锁定组件接线。
- `WuwaFrontend/src/features/statistics/presentation.js`：删除本地成熟度映射，只保留统计专属说明与图表 presentation。
- `WuwaFrontend/src/features/statistics/presentation.test.js`：改为验证共享成熟度 owner 与统计专属说明。
- `WuwaFrontend/src/features/statistics/StatisticsView.vue`：区分 loading/error/zero/normal，零样本隐藏偏差卡。
- `WuwaFrontend/src/features/statistics/StatisticsView.test.js`：锁定零样本页头、准备面板和隐藏项。
- `WuwaFrontend/src/features/evaluation/EvaluationView.vue`：统一成熟度，未 ready 时隐藏三模块并显示评估准备度。
- `WuwaFrontend/src/features/evaluation/EvaluationView.test.js`：锁定 `待录入`、`--`、`0/20`、collecting 与 ready 分支。
- `WuwaFrontend/src/page-summary.test.js`：锁定两页共用中性/有样本状态视觉。
- `DESIGN.md`：写入统一状态语义、零样本字段显示和准备面板长期规则。
- `.impeccable/design.json`：同步空状态与未计算指标的结构化设计规则。
- `docs/product-interface-principles.md`：增加真实零、未计算、加载和错误的跨端语义边界。
- `docs/web-workbench-ui-guidelines.md`：增加 Web 工作台首次录入和空历史规则。

### Verify Only

- `Wuwa/analytics/services/evaluation.py`：确认前端 `20` 与现有 `MIN_EVALUATED_SAMPLES` 一致；本方案不修改该文件。
- `Wuwa/echoes/constants.py`：确认前端阶段阈值与现有 `SAMPLE_STAGES` 一致；本方案不修改该文件。

### Task 1: 建立统一样本体验纯函数

**Files:**
- Create: `WuwaFrontend/src/shared/sampleExperience.test.js`
- Create: `WuwaFrontend/src/shared/sampleExperience.js`
- Modify: `WuwaFrontend/src/architecture.test.js`

- [ ] **Step 1: 写入共享状态失败测试**

创建 `sampleExperience.test.js`：

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EMPTY_METRIC_TEXT,
  EVALUATION_READY_TARGET,
  evaluationReadinessState,
  formatOptionalMetric,
  hasRecordedSamples,
  sampleMaturityState,
  sampleStageState,
  sampleTotal,
} from './sampleExperience.js'

test('sample maturity has one boundary mapping for statistics and evaluation', () => {
  assert.deepEqual(
    [0, 1, 499, 500, 2999, 3000, 9999, 10000, 49999, 50000]
      .map((total) => sampleMaturityState(total).label),
    ['待录入', '起步观察', '起步观察', '初步观察', '初步观察', '可作参考', '可作参考', '稳定观察', '稳定观察', '可优化权重'],
  )
  assert.equal(sampleMaturityState(0).tone, 'neutral')
  assert.equal(sampleMaturityState(1).tone, 'active')
})

test('sample counts keep real zero and reject invalid negative input', () => {
  assert.equal(sampleTotal({ total_rolls: 0 }), 0)
  assert.equal(sampleTotal({ total_rolls: '12' }), 12)
  assert.equal(sampleTotal(-8), 0)
  assert.equal(sampleTotal(undefined), 0)
  assert.equal(hasRecordedSamples({ total_rolls: 0 }), false)
  assert.equal(hasRecordedSamples({ total_rolls: 1 }), true)
})

test('sample stages expose known ranges at zero and every threshold', () => {
  assert.equal(sampleStageState(0).rangeLabel, '0–500 条')
  assert.equal(sampleStageState(499).rangeLabel, '0–500 条')
  assert.equal(sampleStageState(500).rangeLabel, '500–3000 条')
  assert.equal(sampleStageState(3000).rangeLabel, '3000–10000 条')
  assert.equal(sampleStageState(10000).rangeLabel, '10000–50000 条')
  assert.equal(sampleStageState(50000).rangeLabel, '50000+ 条')
})

test('evaluation readiness stays separate from sample maturity', () => {
  assert.equal(EVALUATION_READY_TARGET, 20)
  assert.deepEqual(evaluationReadinessState({ status: 'insufficient_data', evaluated_count: 0 }), {
    key: 'empty', ready: false, evaluated: 0, target: 20, progress: 0,
  })
  assert.deepEqual(evaluationReadinessState({ status: 'insufficient_data', evaluated_count: 7 }), {
    key: 'collecting', ready: false, evaluated: 7, target: 20, progress: 0.35,
  })
  assert.equal(evaluationReadinessState({ status: 'ready', evaluated_count: 20 }).key, 'ready')
})

test('optional metric formatter preserves a real zero and only placeholders missing values', () => {
  const percent = (value) => `${(value * 100).toFixed(1)}%`
  assert.equal(EMPTY_METRIC_TEXT, '--')
  assert.equal(formatOptionalMetric(0, percent), '0.0%')
  assert.equal(formatOptionalMetric(0.125, percent), '12.5%')
  assert.equal(formatOptionalMetric(null, percent), '--')
  assert.equal(formatOptionalMetric(undefined, percent), '--')
  assert.equal(formatOptionalMetric(Number.NaN, percent), '--')
})
```

- [ ] **Step 2: 运行测试确认 RED**

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src\shared\sampleExperience.test.js
```

Expected: FAIL，`sampleExperience.js` 尚不存在。

- [ ] **Step 3: 实现共享纯函数**

创建 `sampleExperience.js`：

```js
import { sampleStageDefinitions } from '../data/modelPresentation.js'

export const EMPTY_METRIC_TEXT = '--'
export const EVALUATION_READY_TARGET = 20

const maturityDefinitions = Object.freeze([
  { key: 'optimized', min: 50000, label: '可优化权重' },
  { key: 'stable', min: 10000, label: '稳定观察' },
  { key: 'reference', min: 3000, label: '可作参考' },
  { key: 'initial', min: 500, label: '初步观察' },
  { key: 'recording', min: 1, label: '起步观察' },
])

export function sampleTotal(value) {
  const raw = typeof value === 'object' && value !== null ? value.total_rolls : value
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : 0
}

export function hasRecordedSamples(value) {
  return sampleTotal(value) > 0
}

export function sampleMaturityState(value) {
  const total = sampleTotal(value)
  if (total === 0) return { key: 'empty', label: '待录入', tone: 'neutral', total, hasSamples: false }
  const definition = maturityDefinitions.find((row) => total >= row.min)
  return { ...definition, tone: 'active', total, hasSamples: true }
}

export function sampleStageState(value) {
  const total = sampleTotal(value)
  const definition = sampleStageDefinitions.find((row) => total >= row.min && total < row.max)
    || sampleStageDefinitions.at(-1)
  const rangeLabel = Number.isFinite(definition.max)
    ? `${definition.min}–${definition.max} 条`
    : `${definition.min}+ 条`
  return { ...definition, total, rangeLabel }
}

export function evaluationReadinessState(evaluation) {
  const evaluated = sampleTotal(evaluation?.evaluated_count)
  const ready = evaluation?.status === 'ready'
  return {
    key: ready ? 'ready' : evaluated > 0 ? 'collecting' : 'empty',
    ready,
    evaluated,
    target: EVALUATION_READY_TARGET,
    progress: ready ? 1 : Math.min(evaluated / EVALUATION_READY_TARGET, 1),
  }
}

export function formatOptionalMetric(value, formatter) {
  if (value === null || value === undefined || value === '') return EMPTY_METRIC_TEXT
  const numeric = Number(value)
  return Number.isFinite(numeric) ? formatter(numeric) : EMPTY_METRIC_TEXT
}
```

- [ ] **Step 4: 登记共享 owner 与体积边界**

在 `architecture.test.js` 的高吸力文件测试加入：

```js
assert.ok(await lineCount('./shared/sampleExperience.js') <= 90, 'sampleExperience.js must remain a focused pure state mapper')
```

并增加：

```js
test('shared sample experience owns cross-page maturity and empty metric semantics', async () => {
  const source = await readFile(new URL('./shared/sampleExperience.js', import.meta.url), 'utf8')
  assert.match(source, /export function sampleMaturityState/)
  assert.match(source, /export function sampleStageState/)
  assert.match(source, /export function evaluationReadinessState/)
  assert.match(source, /export function formatOptionalMetric/)
})
```

- [ ] **Step 5: 运行测试确认 GREEN**

```powershell
..\.tools\node\node.exe --test src\shared\sampleExperience.test.js src\architecture.test.js
```

Expected: PASS。

- [ ] **Step 6: 提交共享状态模型**

```powershell
git add WuwaFrontend/src/shared/sampleExperience.js WuwaFrontend/src/shared/sampleExperience.test.js WuwaFrontend/src/architecture.test.js
git commit -m "feat: unify sample experience states"
```

### Task 2: 建立共享准备面板与请求状态

**Files:**
- Create: `WuwaFrontend/src/components/states/SampleReadinessPanel.test.js`
- Create: `WuwaFrontend/src/components/states/SampleReadinessPanel.vue`
- Create: `WuwaFrontend/src/components/states/InsightRequestState.test.js`
- Create: `WuwaFrontend/src/components/states/InsightRequestState.vue`
- Create: `WuwaFrontend/src/styles/sample-readiness.css`
- Modify: `WuwaFrontend/src/style.css`
- Modify: `WuwaFrontend/src/architecture.test.js`

- [ ] **Step 1: 写入两个共享组件的失败测试**

创建 `SampleReadinessPanel.test.js`：

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('sample readiness panel exposes one task boundary, native progress, detail slot, and action', async () => {
  const source = await readFile(new URL('./SampleReadinessPanel.vue', import.meta.url), 'utf8')
  assert.match(source, /class="sample-readiness-panel"/)
  assert.match(source, /<progress[^>]+:value="safeCurrent"[^>]+:max="safeTarget"/)
  assert.match(source, /<slot name="detail"><\/slot>/)
  assert.match(source, /class="button-primary"/)
  assert.match(source, /emit\('action'\)/)
  assert.doesNotMatch(source, /box-shadow|product-panel/)
})
```

创建 `InsightRequestState.test.js`：

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('request state separates loading skeletons from actionable errors', async () => {
  const source = await readFile(new URL('./InsightRequestState.vue', import.meta.url), 'utf8')
  assert.match(source, /status === 'loading'/)
  assert.match(source, /aria-busy="true"/)
  assert.match(source, /role="alert"/)
  assert.match(source, />重新加载<\/button>/)
  assert.match(source, /emit\('retry'\)/)
  assert.doesNotMatch(source, /--/)
})
```

- [ ] **Step 2: 运行测试确认 RED**

```powershell
..\.tools\node\node.exe --test src\components\states\SampleReadinessPanel.test.js src\components\states\InsightRequestState.test.js
```

Expected: FAIL，两个 Vue 文件尚不存在。

- [ ] **Step 3: 实现 `SampleReadinessPanel`**

```vue
<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  current: { type: Number, default: 0 },
  target: { type: Number, required: true },
  progressLabel: { type: String, required: true },
  strategyText: { type: String, default: '' },
  actionLabel: { type: String, default: '去工作台录入' },
})

const emit = defineEmits(['action'])
const safeTarget = computed(() => Math.max(1, Math.trunc(props.target)))
const safeCurrent = computed(() => Math.min(Math.max(0, Math.trunc(props.current)), safeTarget.value))
const percentText = computed(() => `${(safeCurrent.value / safeTarget.value * 100).toFixed(0)}%`)
</script>

<template>
  <section class="sample-readiness-panel" :aria-label="title">
    <div class="sample-readiness-copy">
      <span class="sample-readiness-eyebrow">数据准备</span>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
      <small v-if="strategyText">{{ strategyText }}</small>
    </div>
    <div class="sample-readiness-progress">
      <p><strong>{{ safeCurrent }}</strong><span>/ {{ safeTarget }}</span></p>
      <progress :value="safeCurrent" :max="safeTarget">{{ percentText }}</progress>
      <small>{{ progressLabel }}</small>
    </div>
    <div v-if="$slots.detail" class="sample-readiness-detail">
      <slot name="detail"></slot>
    </div>
    <button class="button-primary" type="button" @click="emit('action')">{{ actionLabel }}</button>
  </section>
</template>
```

- [ ] **Step 4: 实现 `InsightRequestState`**

```vue
<script setup>
defineProps({
  status: { type: String, required: true, validator: (value) => ['loading', 'error'].includes(value) },
  title: { type: String, required: true },
  description: { type: String, default: '' },
})

const emit = defineEmits(['retry'])
</script>

<template>
  <section v-if="status === 'loading'" class="insight-request-state is-loading" aria-busy="true" :aria-label="title">
    <span class="insight-skeleton insight-skeleton--title"></span>
    <span class="insight-skeleton"></span>
    <span class="insight-skeleton insight-skeleton--short"></span>
  </section>
  <section v-else class="insight-request-state is-error" role="alert">
    <strong>{{ title }}</strong>
    <p>{{ description }}</p>
    <button class="button-secondary" type="button" @click="emit('retry')">重新加载</button>
  </section>
</template>
```

- [ ] **Step 5: 创建共享样式**

创建 `styles/sample-readiness.css`：

```css
.sample-readiness-panel,
.insight-request-state {
  min-width: 0;
  border: 1px solid rgba(216, 226, 234, 0.9);
  border-radius: 12px;
  padding: 20px;
  background: #fbfcfe;
}

.sample-readiness-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 260px) auto;
  align-items: center;
  gap: 20px;
}

.sample-readiness-copy { display: grid; gap: 6px; }
.sample-readiness-copy h3,
.sample-readiness-copy p { margin: 0; }
.sample-readiness-copy h3 { color: var(--ink-deep); font-size: var(--text-card-title); }
.sample-readiness-copy p { max-width: 60ch; color: var(--steel); font-size: var(--text-body); line-height: var(--leading-body); }
.sample-readiness-copy small,
.sample-readiness-progress small { color: var(--steel); font-size: var(--text-caption); font-weight: var(--weight-supporting); }
.sample-readiness-eyebrow { color: var(--steel); font-size: var(--text-label); font-weight: var(--weight-label); }

.sample-readiness-progress { display: grid; gap: 8px; }
.sample-readiness-progress p { display: flex; align-items: baseline; gap: 4px; margin: 0; font-family: var(--font-data); font-variant-numeric: tabular-nums; }
.sample-readiness-progress strong { color: var(--ink-deep); font-size: var(--text-data-lg); }
.sample-readiness-progress span { color: var(--steel); font-size: var(--text-data-sm); font-weight: var(--weight-data); }
.sample-readiness-progress progress { width: 100%; height: 8px; accent-color: var(--primary); }
.sample-readiness-detail { grid-column: 1 / -1; min-width: 0; border-top: 1px solid rgba(216, 226, 234, 0.76); padding-top: 18px; }
.sample-readiness-panel > .button-primary { justify-self: end; min-width: 156px; }

.insight-request-state { display: grid; gap: 10px; }
.insight-request-state strong,
.insight-request-state p { margin: 0; }
.insight-request-state p { color: var(--steel); }
.insight-request-state .button-secondary { justify-self: start; }
.insight-skeleton { display: block; width: min(560px, 100%); height: 14px; border-radius: 8px; background: var(--surface-soft); }
.insight-skeleton--title { width: min(260px, 70%); height: 21px; }
.insight-skeleton--short { width: min(360px, 82%); }

.metric-placeholder {
  color: var(--steel);
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}

.app-shell.theme-dark .sample-readiness-panel,
.app-shell.theme-dark .insight-request-state { border-color: rgba(63, 86, 102, 0.72); background: #1d2a35; }
.app-shell.theme-dark .sample-readiness-detail { border-color: rgba(63, 86, 102, 0.72); }
.app-shell.theme-dark .insight-skeleton { background: rgba(92, 113, 128, 0.24); }

@media (max-width: 860px) {
  .sample-readiness-panel { grid-template-columns: 1fr; align-items: start; }
  .sample-readiness-panel > .button-primary { justify-self: start; }
}

@media (max-width: 520px) {
  .sample-readiness-panel,
  .insight-request-state { padding: 16px; }
  .sample-readiness-panel > .button-primary { width: 100%; }
}
```

- [ ] **Step 6: 接入全局样式并登记 owner**

在 `style.css` 的 `page-summary.css` 后加入：

```css
@import './styles/sample-readiness.css';
```

在 `architecture.test.js` 增加体积与 owner 断言：

```js
assert.ok(await lineCount('./components/states/SampleReadinessPanel.vue') <= 70, 'SampleReadinessPanel.vue must stay presentational')
assert.ok(await lineCount('./components/states/InsightRequestState.vue') <= 45, 'InsightRequestState.vue must stay presentational')
assert.ok(await lineCount('./styles/sample-readiness.css') <= 120, 'sample-readiness.css must remain a focused shared state owner')

test('sample readiness has one shared component and style owner', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const style = await readFile(new URL('./styles/sample-readiness.css', import.meta.url), 'utf8')
  assert.match(entry, /@import '\.\/styles\/sample-readiness\.css';/)
  assert.match(style, /^\.sample-readiness-panel/m)
  assert.match(style, /^\.insight-request-state/m)
  assert.match(style, /^\.metric-placeholder/m)
})
```

`style.css` 加入该 import 后必须仍不超过 14 行。

- [ ] **Step 7: 运行组件和架构测试**

```powershell
..\.tools\node\node.exe --test src\components\states\SampleReadinessPanel.test.js src\components\states\InsightRequestState.test.js src\architecture.test.js
```

Expected: PASS。

- [ ] **Step 8: 提交共享状态组件**

```powershell
git add WuwaFrontend/src/components/states/SampleReadinessPanel.vue WuwaFrontend/src/components/states/SampleReadinessPanel.test.js WuwaFrontend/src/components/states/InsightRequestState.vue WuwaFrontend/src/components/states/InsightRequestState.test.js WuwaFrontend/src/styles/sample-readiness.css WuwaFrontend/src/style.css WuwaFrontend/src/architecture.test.js
git commit -m "feat: add shared sample readiness states"
```

### Task 3: 增加可失效的按页刷新与薄导航编排

**Files:**
- Create: `WuwaFrontend/src/features/workspace/workspaceInsightRefresh.test.js`
- Create: `WuwaFrontend/src/features/workspace/workspaceInsightRefresh.js`
- Create: `WuwaFrontend/src/composables/useDashboardNavigation.test.js`
- Create: `WuwaFrontend/src/composables/useDashboardNavigation.js`
- Modify: `WuwaFrontend/src/features/workspace/useEchoWorkspace.js`
- Modify: `WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js`
- Modify: `WuwaFrontend/src/architecture.test.js`

- [ ] **Step 1: 写入 insight refresh controller 失败测试**

创建 `workspaceInsightRefresh.test.js`：

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { ref } from 'vue'

import { createWorkspaceInsightRefresh } from './workspaceInsightRefresh.js'

function deferred() {
  let resolve
  const promise = new Promise((nextResolve) => { resolve = nextResolve })
  return { promise, resolve }
}

function createHarness(overrides = {}) {
  const selectedGameAccountId = ref(7)
  const workspaceLocked = ref(false)
  const stats = ref(null)
  const evaluation = ref(null)
  const errors = []
  let generation = 0
  const controller = createWorkspaceInsightRefresh({
    selectedGameAccountId,
    workspaceLocked,
    stats,
    evaluation,
    getStats: async () => ({ total_rolls: 0 }),
    getModelEvaluation: async () => ({ status: 'insufficient_data', evaluated_count: 0 }),
    lifecycleGeneration: () => generation,
    reportError: (error) => errors.push(error.message),
    ...overrides,
  })
  return { controller, selectedGameAccountId, workspaceLocked, stats, evaluation, errors, nextGeneration: () => { generation += 1 } }
}

test('statistics and evaluation refresh independently and expose request status', async () => {
  const harness = createHarness()
  await harness.controller.refreshStats()
  assert.deepEqual(harness.stats.value, { total_rolls: 0 })
  assert.equal(harness.controller.statsRequestStatus.value, 'ready')
  assert.equal(harness.evaluation.value, null)

  await harness.controller.refreshEvaluation()
  assert.equal(harness.evaluation.value.status, 'insufficient_data')
  assert.equal(harness.controller.evaluationRequestStatus.value, 'ready')
})

test('an old account response cannot restore stale insight data', async () => {
  const pending = deferred()
  const harness = createHarness({ getStats: () => pending.promise })
  const refresh = harness.controller.refreshStats()
  harness.selectedGameAccountId.value = 9
  harness.nextGeneration()
  harness.controller.reset()
  pending.resolve({ total_rolls: 286 })
  await refresh
  assert.equal(harness.stats.value, null)
  assert.equal(harness.controller.statsRequestStatus.value, 'idle')
})

test('request errors are explicit and do not replace the last successful value', async () => {
  const harness = createHarness({ getStats: async () => { throw new Error('stats unavailable') } })
  harness.stats.value = { total_rolls: 12 }
  await harness.controller.refreshStats()
  assert.deepEqual(harness.stats.value, { total_rolls: 12 })
  assert.equal(harness.controller.statsRequestStatus.value, 'error')
  assert.deepEqual(harness.errors, ['stats unavailable'])
})
```

- [ ] **Step 2: 运行 controller 测试确认 RED**

```powershell
..\.tools\node\node.exe --test src\features\workspace\workspaceInsightRefresh.test.js
```

Expected: FAIL，controller 文件尚不存在。

- [ ] **Step 3: 实现独立刷新控制器**

创建 `workspaceInsightRefresh.js`：

```js
import { ref } from 'vue'

export function createWorkspaceInsightRefresh({
  selectedGameAccountId,
  workspaceLocked,
  stats,
  evaluation,
  getStats,
  getModelEvaluation,
  lifecycleGeneration,
  reportError,
}) {
  const statsRequestStatus = ref('idle')
  const evaluationRequestStatus = ref('idle')
  let statsRequestId = 0
  let evaluationRequestId = 0

  function canRequest() {
    return !workspaceLocked.value && Boolean(selectedGameAccountId.value)
  }

  async function refreshStats() {
    if (!canRequest()) return null
    const accountId = selectedGameAccountId.value
    const generation = lifecycleGeneration()
    const requestId = ++statsRequestId
    const isCurrent = () => generation === lifecycleGeneration()
      && requestId === statsRequestId
      && accountId === selectedGameAccountId.value
    statsRequestStatus.value = 'loading'
    try {
      const result = await getStats(accountId)
      if (!isCurrent()) return null
      stats.value = result
      statsRequestStatus.value = 'ready'
      return result
    } catch (error) {
      if (isCurrent()) {
        statsRequestStatus.value = 'error'
        reportError(error)
      }
      return null
    }
  }

  async function refreshEvaluation() {
    if (!canRequest()) return null
    const accountId = selectedGameAccountId.value
    const generation = lifecycleGeneration()
    const requestId = ++evaluationRequestId
    const isCurrent = () => generation === lifecycleGeneration()
      && requestId === evaluationRequestId
      && accountId === selectedGameAccountId.value
    evaluationRequestStatus.value = 'loading'
    try {
      const result = await getModelEvaluation(accountId)
      if (!isCurrent()) return null
      evaluation.value = result
      evaluationRequestStatus.value = 'ready'
      return result
    } catch (error) {
      if (isCurrent()) {
        evaluationRequestStatus.value = 'error'
        reportError(error)
      }
      return null
    }
  }

  function reset() {
    statsRequestId += 1
    evaluationRequestId += 1
    statsRequestStatus.value = 'idle'
    evaluationRequestStatus.value = 'idle'
  }

  return { evaluationRequestStatus, refreshEvaluation, refreshStats, reset, statsRequestStatus }
}
```

- [ ] **Step 4: 写入导航 composable 失败测试**

创建 `useDashboardNavigation.test.js`：

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { useDashboardNavigation } from './useDashboardNavigation.js'

test('dashboard navigation refreshes only the selected insight page', async () => {
  const calls = []
  const navigation = useDashboardNavigation({
    refreshStats: async () => calls.push('stats'),
    refreshEvaluation: async () => calls.push('evaluation'),
  })

  await navigation.openPage('stats')
  assert.equal(navigation.page.value, 'stats')
  assert.deepEqual(calls, ['stats'])

  await navigation.openPage('evaluation')
  assert.equal(navigation.page.value, 'evaluation')
  assert.deepEqual(calls, ['stats', 'evaluation'])

  await navigation.openPage('workspace')
  assert.equal(navigation.page.value, 'workspace')
  assert.deepEqual(calls, ['stats', 'evaluation'])
})
```

- [ ] **Step 5: 实现导航 composable**

创建 `useDashboardNavigation.js`：

```js
import { ref } from 'vue'

const validPages = new Set(['workspace', 'stats', 'evaluation'])

export function useDashboardNavigation({ refreshStats, refreshEvaluation }) {
  const page = ref('workspace')

  async function openPage(nextPage) {
    if (!validPages.has(nextPage)) return
    page.value = nextPage
    if (nextPage === 'stats') await refreshStats()
    if (nextPage === 'evaluation') await refreshEvaluation()
  }

  return { openPage, page }
}
```

- [ ] **Step 6: 接入 `useEchoWorkspace`，替换直接 insight 请求**

在 import 中加入：

```js
import { createWorkspaceInsightRefresh } from './workspaceInsightRefresh.js'
```

在 `reportError` 后创建 controller：

```js
const insightRefresh = createWorkspaceInsightRefresh({
  selectedGameAccountId, workspaceLocked, stats, evaluation, getStats, getModelEvaluation,
  lifecycleGeneration: () => lifecycleGeneration, reportError,
})
const { evaluationRequestStatus, refreshEvaluation, refreshStats, statsRequestStatus } = insightRefresh
```

在 `reset()` 中、将 `stats` 和 `evaluation` 清空前加入：

```js
insightRefresh.reset()
```

将 `refresh()` 末尾的直接 `getStats/getModelEvaluation` 替换为：

```js
await refreshStats()
if (!isCurrent()) return
await refreshEvaluation()
```

在返回对象中加入：

```js
evaluationRequestStatus,
refreshEvaluation,
refreshStats,
statsRequestStatus,
```

为保持 `useEchoWorkspace.js <= 400`：删除原来的 `nextStats`、`nextEvaluation` 临时变量与对应赋值行；不要在 composable 内复制 controller 的状态机。如果仍超过 400 行，将 controller 初始化的同一参数组按现有 Prettier-free 风格压缩为两行，不提高测试上限。

- [ ] **Step 7: 锁定高频保存路径不触发分析请求**

在 `useEchoWorkspace.test.js` 现有“tier entry refreshes next prediction without starting stats or model evaluation”测试之后增加静态契约：

```js
test('page insight refresh is exposed without re-entering the tier save path', async () => {
  const source = await readFile(new URL('./useEchoWorkspace.js', import.meta.url), 'utf8')
  const clickTierSection = source.slice(source.indexOf('async function clickTier'), source.indexOf('async function undoActiveSubstat'))
  assert.match(source, /createWorkspaceInsightRefresh/)
  assert.match(source, /refreshStats/)
  assert.match(source, /refreshEvaluation/)
  assert.doesNotMatch(clickTierSection, /refreshStats|refreshEvaluation|getStats|getModelEvaluation/)
})
```

- [ ] **Step 8: 登记新文件体积边界**

在 `architecture.test.js` 增加：

```js
assert.ok(await lineCount('./features/workspace/workspaceInsightRefresh.js') <= 100, 'workspaceInsightRefresh.js must remain a focused request controller')
assert.ok(await lineCount('./composables/useDashboardNavigation.js') <= 35, 'useDashboardNavigation.js must remain thin page orchestration')
```

- [ ] **Step 9: 运行定向测试**

```powershell
..\.tools\node\node.exe --test src\features\workspace\workspaceInsightRefresh.test.js src\composables\useDashboardNavigation.test.js src\features\workspace\useEchoWorkspace.test.js src\architecture.test.js
```

Expected: PASS；既有档位点击测试继续证明不等待统计或评估。

- [ ] **Step 10: 提交刷新与导航基础**

```powershell
git add WuwaFrontend/src/features/workspace/workspaceInsightRefresh.js WuwaFrontend/src/features/workspace/workspaceInsightRefresh.test.js WuwaFrontend/src/composables/useDashboardNavigation.js WuwaFrontend/src/composables/useDashboardNavigation.test.js WuwaFrontend/src/features/workspace/useEchoWorkspace.js WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js WuwaFrontend/src/architecture.test.js
git commit -m "feat: refresh insights on page entry"
```

### Task 4: 实施全局摘要、工作台首次录入和空历史行为

**Files:**
- Create: `WuwaFrontend/src/components/shell/WorkspaceSummary.test.js`
- Create: `WuwaFrontend/src/components/shell/WorkspaceSummary.vue`
- Modify: `WuwaFrontend/src/App.vue`
- Modify: `WuwaFrontend/src/App.test.js`
- Modify: `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`
- Modify: `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`
- Modify: `WuwaFrontend/src/features/workspace/ActiveEchoCapturePanel.vue`
- Modify: `WuwaFrontend/src/features/history/floatingHistoryMode.js`
- Modify: `WuwaFrontend/src/features/history/floatingHistoryMode.test.js`
- Modify: `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`
- Modify: `WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js`
- Modify: `WuwaFrontend/src/styles/shell.css`
- Modify: `WuwaFrontend/src/styles/features/workspace.css`
- Modify: `WuwaFrontend/src/styles/features/workspace-active.css`
- Modify: `WuwaFrontend/src/architecture.test.js`

- [ ] **Step 1: 写入全局摘要失败测试**

创建 `WorkspaceSummary.test.js`：

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('workspace summary distinguishes real zero, missing confidence, loading, and error', async () => {
  const source = await readFile(new URL('./WorkspaceSummary.vue', import.meta.url), 'utf8')
  assert.match(source, /EMPTY_METRIC_TEXT/)
  assert.match(source, /sampleTotal\(props\.totalSamples\)/)
  assert.match(source, /props\.totalSamples === null/)
  assert.match(source, /class="hero-metric-skeleton"/)
  assert.match(source, />加载失败</)
  assert.match(source, /confidenceDisplay/)
  assert.match(source, /置信度尚未形成/)
  assert.match(source, /v-if="historyDelta"/)
  assert.match(source, /v-if="sampleDelta"/)
  assert.doesNotMatch(source, /'低'/)
})
```

- [ ] **Step 2: 运行摘要测试确认 RED**

```powershell
..\.tools\node\node.exe --test src\components\shell\WorkspaceSummary.test.js
```

Expected: FAIL，摘要组件尚不存在。

- [ ] **Step 3: 实现全局摘要组件**

创建 `WorkspaceSummary.vue`：

```vue
<script setup>
import { computed } from 'vue'

import { confidenceText } from '../../services/formatters.js'
import { EMPTY_METRIC_TEXT, sampleTotal } from '../../shared/sampleExperience.js'

const props = defineProps({
  historyCount: { type: Number, default: 0 },
  totalSamples: { type: Number, default: null },
  confidence: { type: Number, default: null },
  historyDelta: { type: Number, default: 0 },
  sampleDelta: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
  requestStatus: { type: String, default: 'idle' },
})

const dataLoading = computed(() => props.busy || (props.totalSamples === null && props.requestStatus === 'loading'))
const dataFailed = computed(() => !dataLoading.value && props.totalSamples === null && props.requestStatus === 'error')
const totalDisplay = computed(() => sampleTotal(props.totalSamples))
const confidenceDisplay = computed(() => (
  totalDisplay.value === 0 || props.confidence === null
    ? EMPTY_METRIC_TEXT
    : confidenceText(props.confidence)
))
</script>

<template>
  <section class="hero-band compact">
    <div><h1>你好，漂泊者</h1></div>
    <div class="hero-stats">
      <div class="hero-stat hero-stat-with-delta">
        <strong>{{ historyCount }}</strong>
        <Transition name="metric-delta"><em v-if="historyDelta" class="metric-delta-badge">+{{ historyDelta }}</em></Transition>
        <span>历史声骸</span>
      </div>
      <div class="hero-stat hero-stat-with-delta">
        <span v-if="dataLoading" class="hero-metric-skeleton" aria-label="总样本加载中"></span>
        <strong v-else-if="dataFailed" class="hero-metric-error">加载失败</strong>
        <strong v-else>{{ totalDisplay }}</strong>
        <Transition name="metric-delta"><em v-if="sampleDelta" class="metric-delta-badge">+{{ sampleDelta }}</em></Transition>
        <span>总样本</span>
      </div>
      <div class="hero-stat">
        <span v-if="dataLoading" class="hero-metric-skeleton" aria-label="置信度加载中"></span>
        <strong v-else-if="dataFailed" class="hero-metric-error">加载失败</strong>
        <strong
          v-else
          class="hero-confidence-value"
          :class="{ 'metric-placeholder': confidenceDisplay === EMPTY_METRIC_TEXT }"
          :aria-label="confidenceDisplay === EMPTY_METRIC_TEXT ? '置信度尚未形成' : `置信度${confidenceDisplay}`"
        >{{ confidenceDisplay }}</strong>
        <span>置信度</span>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 4: 增加摘要 loading/error 样式**

在 `styles/shell.css` 的 hero 指标规则附近加入：

```css
.hero-metric-skeleton {
  display: inline-block;
  width: 64px;
  height: var(--text-data-xl);
  border-radius: 8px;
  background: var(--surface-soft);
}

.hero-metric-error {
  color: var(--critical-deep);
  font-family: var(--font-ui);
  font-size: var(--text-label);
  font-weight: var(--weight-label);
}

.hero-confidence-value.metric-placeholder { min-width: 2ch; color: var(--steel); }
.app-shell.theme-dark .hero-metric-skeleton { background: rgba(92, 113, 128, 0.24); }
```

- [ ] **Step 5: 用失败测试锁定工作台首次提示与规则基线来源**

在 `EchoWorkbenchView.test.js` 增加：

```js
test('zero-sample workbench remains actionable and adds one inline first-entry hint', async () => {
  const source = await readFile(new URL('./EchoWorkbenchView.vue', import.meta.url), 'utf8')
  const active = await readFile(new URL('./ActiveEchoCapturePanel.vue', import.meta.url), 'utf8')
  assert.match(source, /firstEntry:/)
  assert.match(source, /class="first-entry-guide"/)
  assert.match(source, /首次录入/)
  assert.match(source, /检查套装、COST 和主词条，然后点击实际出现的第一条副词条数值。/)
  assert.match(source, /:first-entry="firstEntry"/)
  assert.match(active, /规则基线 · 尚未使用个人样本/)
  assert.doesNotMatch(source, /开始使用|打开向导|dialog/)
})
```

- [ ] **Step 6: 实施首次录入提示和预测来源**

在 `EchoWorkbenchView.vue` props 加入：

```js
firstEntry: { type: Boolean, default: false },
```

把“初始化声骸”下的原说明替换为：

```vue
<p v-if="firstEntry" class="first-entry-guide"><strong>首次录入</strong><span>检查套装、COST 和主词条，然后点击实际出现的第一条副词条数值。</span></p>
<p v-else>选择套装、COST、主词条后开始录入。</p>
```

向 `ActiveEchoCapturePanel` 传递：

```vue
:first-entry="firstEntry"
```

在 `ActiveEchoCapturePanel.vue` props 加入同一 Boolean；在预测表标题前加入：

```vue
<small v-if="firstEntry && activePredictionRankings.length" class="active-prediction-source">规则基线 · 尚未使用个人样本</small>
```

在 `workspace.css` 加入：

```css
.first-entry-guide { display: flex; flex-wrap: wrap; gap: 4px 8px; margin: 0; color: var(--steel); }
.first-entry-guide strong { color: var(--primary-deep); font-size: var(--text-label); }
.first-entry-guide span { font-size: var(--text-label); line-height: var(--leading-body); }
```

在 `workspace-active.css` 加入：

```css
.active-prediction-source { color: var(--steel); font-size: var(--text-caption); font-weight: var(--weight-supporting); }
```

完成后确认 `EchoWorkbenchView.vue <= 210`；如果增加换行导致超过上限，将单行 prop 声明和相邻静态说明收紧，不提高架构上限。

- [ ] **Step 7: 写入空历史偏好失败测试**

在 `floatingHistoryMode.test.js` 增加：

```js
test('empty history defaults to minimized only when the user has no saved preference', () => {
  assert.equal(initialHistoryPanelState(null, null, { emptyHistory: true }).mode, HISTORY_PANEL_MODE.MINIMIZED)
  assert.equal(initialHistoryPanelState('false', null, { emptyHistory: true }).mode, HISTORY_PANEL_MODE.COMPACT)
  assert.equal(initialHistoryPanelState('true', null, { emptyHistory: false }).mode, HISTORY_PANEL_MODE.MINIMIZED)
  assert.equal(initialHistoryPanelState(null, null, { emptyHistory: false }).mode, HISTORY_PANEL_MODE.COMPACT)
})
```

- [ ] **Step 8: 实现空历史默认值且尊重显式偏好**

将 `initialHistoryPanelState` 改为：

```js
export function initialHistoryPanelState(storedMinimized, storedLastExpandedMode, { emptyHistory = false } = {}) {
  const hasSavedPreference = storedMinimized === 'true' || storedMinimized === 'false'
  const minimized = storedMinimized === 'true' || (!hasSavedPreference && emptyHistory)
  return {
    mode: minimized ? HISTORY_PANEL_MODE.MINIMIZED : HISTORY_PANEL_MODE.COMPACT,
    lastExpandedMode: validExpandedMode(storedLastExpandedMode),
  }
}
```

在 `FloatingHistoryPanel.vue` 初始化调用中加入第三个参数：

```js
{ emptyHistory: sortVisibleEchoHistory(props.echoes).length === 0 },
```

在 `FloatingHistoryPanel.test.js` 增加：

```js
assert.match(source, /emptyHistory: sortVisibleEchoHistory\(props\.echoes\)\.length === 0/)
```

- [ ] **Step 9: 将 App 改为薄接线**

在 `App.vue`：

1. 删除 `confidenceText` import 和 `const page = ref('workspace')`。
2. import `WorkspaceSummary` 与 `useDashboardNavigation`。
3. 从 `useEchoWorkspace` 返回值解构 `refreshStats`、`refreshEvaluation`、`statsRequestStatus`、`evaluationRequestStatus`。
4. 在 workspace composable 初始化之后加入：

```js
const { openPage, page } = useDashboardNavigation({ refreshStats, refreshEvaluation })
```

5. wordmark 使用 `@click.prevent="openPage('workspace')"`；三个导航按钮分别使用 `@click="openPage('workspace')"`、`@click="openPage('stats')"`、`@click="openPage('evaluation')"`，并分别绑定对应的 `:aria-current="page === '<page-key>' ? 'page' : null"`。
6. 用以下组件替换原 hero：

```vue
<WorkspaceSummary
  :history-count="visibleEchoCount"
  :total-samples="stats?.total_rolls ?? null"
  :confidence="prediction?.confidence ?? null"
  :history-delta="visibleSessionEchoDelta"
  :sample-delta="visibleSessionSampleDelta"
  :busy="accountChanging"
  :request-status="statsRequestStatus"
/>
```

7. 向工作台传递：

```vue
:first-entry="stats !== null && !stats.total_rolls"
```

8. 向统计与评估传递请求状态，并接线 action/retry：

```vue
<StatisticsView
  v-if="!gameAccount.workspaceLocked.value && page === 'stats'"
  :stats="stats"
  :request-status="statsRequestStatus"
  @start-recording="openPage('workspace')"
  @retry="refreshStats"
/>

<EvaluationView
  v-if="!gameAccount.workspaceLocked.value && page === 'evaluation'"
  :evaluation="evaluation"
  :model-details="modelDetailCards"
  :prediction="prediction"
  :stats="stats"
  :request-status="evaluationRequestStatus"
  @start-recording="openPage('workspace')"
  @retry="refreshEvaluation"
/>
```

提取 hero 后 `App.vue` 必须继续不超过 320 行。

- [ ] **Step 10: 更新 App 与架构测试**

在 `App.test.js` 增加：

```js
test('app delegates sample summary and page refresh without owning zero-state copy', async () => {
  const source = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  assert.match(source, /import WorkspaceSummary from '\.\/components\/shell\/WorkspaceSummary\.vue'/)
  assert.match(source, /useDashboardNavigation\(\{ refreshStats, refreshEvaluation \}\)/)
  assert.match(source, /<WorkspaceSummary/)
  assert.match(source, /:first-entry="stats !== null && !stats\.total_rolls"/)
  assert.match(source, /@start-recording="openPage\('workspace'\)"/)
  assert.doesNotMatch(source, /prediction \? confidenceText/)
})
```

在 `architecture.test.js` 增加：

```js
assert.ok(await lineCount('./components/shell/WorkspaceSummary.vue') <= 90, 'WorkspaceSummary.vue must own only shell metrics')
```

- [ ] **Step 11: 运行工作台定向测试**

```powershell
..\.tools\node\node.exe --test src\components\shell\WorkspaceSummary.test.js src\features\workspace\EchoWorkbenchView.test.js src\features\history\floatingHistoryMode.test.js src\features\history\FloatingHistoryPanel.test.js src\App.test.js src\architecture.test.js
```

Expected: PASS；App、useEchoWorkspace 和 EchoWorkbenchView 原行数上限继续通过。

- [ ] **Step 12: 提交全局与工作台零样本体验**

```powershell
git add WuwaFrontend/src/components/shell/WorkspaceSummary.vue WuwaFrontend/src/components/shell/WorkspaceSummary.test.js WuwaFrontend/src/App.vue WuwaFrontend/src/App.test.js WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js WuwaFrontend/src/features/workspace/ActiveEchoCapturePanel.vue WuwaFrontend/src/features/history/floatingHistoryMode.js WuwaFrontend/src/features/history/floatingHistoryMode.test.js WuwaFrontend/src/features/history/FloatingHistoryPanel.vue WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js WuwaFrontend/src/styles/shell.css WuwaFrontend/src/styles/features/workspace.css WuwaFrontend/src/styles/features/workspace-active.css WuwaFrontend/src/architecture.test.js
git commit -m "feat: guide the first sample entry"
```

### Task 5: 实施统计诊断零样本状态

**Files:**
- Create: `WuwaFrontend/src/features/statistics/SampleStageAxis.test.js`
- Create: `WuwaFrontend/src/features/statistics/SampleStageAxis.vue`
- Modify: `WuwaFrontend/src/features/statistics/presentation.js`
- Modify: `WuwaFrontend/src/features/statistics/presentation.test.js`
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.vue`
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- Modify: `WuwaFrontend/src/styles/features/statistics.css`
- Modify: `WuwaFrontend/src/styles/page-summary.css`
- Modify: `WuwaFrontend/src/page-summary.test.js`
- Modify: `WuwaFrontend/src/architecture.test.js`

- [ ] **Step 1: 写入可复用阶段轴失败测试**

创建 `SampleStageAxis.test.js`：

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('sample stage axis stays a presentational accessible graphic', async () => {
  const source = await readFile(new URL('./SampleStageAxis.vue', import.meta.url), 'utf8')
  assert.match(source, /progress: \{ type: Number, required: true \}/)
  assert.match(source, /rows: \{ type: Array, required: true \}/)
  assert.match(source, /segments: \{ type: Array, required: true \}/)
  assert.match(source, /role="img" :aria-label="ariaLabel"/)
  assert.match(source, /v-for="stage in rows"/)
  assert.match(source, /v-for="stage in segments"/)
  assert.doesNotMatch(source, /stats|evaluation|total_rolls/)
})
```

- [ ] **Step 2: 运行阶段轴测试确认 RED**

```powershell
..\.tools\node\node.exe --test src\features\statistics\SampleStageAxis.test.js
```

Expected: FAIL，组件尚不存在。

- [ ] **Step 3: 提取阶段轴组件**

创建 `SampleStageAxis.vue`：

```vue
<script setup>
import { formatPercent } from '../../services/formatters.js'

defineProps({
  progress: { type: Number, required: true },
  rows: { type: Array, required: true },
  segments: { type: Array, required: true },
  ariaLabel: { type: String, required: true },
})
</script>

<template>
  <div class="sample-stage-axis" role="img" :aria-label="ariaLabel">
    <div class="sample-stage-track" aria-hidden="true">
      <b :style="{ width: formatPercent(progress) }"></b>
      <span
        v-for="stage in rows"
        :key="`tick-${stage.label}`"
        class="sample-stage-boundary-tick"
        :class="{ active: stage.active, current: stage.current }"
        :style="{ left: formatPercent(stage.axisProgress) }"
      ></span>
      <i class="sample-stage-marker" :style="{ left: formatPercent(progress) }"></i>
    </div>
    <div class="sample-stage-boundaries" aria-hidden="true">
      <span
        v-for="stage in rows"
        :key="`boundary-${stage.label}`"
        :class="{ active: stage.active, current: stage.current }"
        :style="{ left: formatPercent(stage.axisProgress) }"
      ><strong class="stats-number">{{ stage.displayLabel }}</strong></span>
    </div>
    <div class="sample-stage-segments" aria-hidden="true">
      <span
        v-for="stage in segments"
        :key="`segment-${stage.label}`"
        :class="{ active: stage.active, current: stage.current }"
        :style="{ left: formatPercent(stage.captionProgress) }"
      >{{ stage.caption }}</span>
    </div>
  </div>
</template>
```

将 `StatisticsView.vue` 中现有 `.sample-stage-axis` 整段替换为：

```vue
<SampleStageAxis
  :progress="sampleStageProgress"
  :rows="sampleStageAxisRows"
  :segments="sampleStageSegmentRows"
  :aria-label="sampleStageAriaLabel"
/>
```

- [ ] **Step 4: 删除统计页本地成熟度映射**

从 `presentation.js` 删除 `statsReliabilityText`。保留 `statsReliabilityNote`、阶段轴与偏差 presentation。

在 `presentation.test.js` 删除 `statsReliabilityText` import 和三个断言；在同一测试加入：

```js
assert.equal(statsReliabilityNote(130), '基于 130 条样本，当前偏差仅作趋势提示。')
assert.equal(statsReliabilityNote(3000), '基于 3000 条样本，偏差可辅助判断，极端值仍需保守看待。')
```

成熟度边界只由 `shared/sampleExperience.test.js` 验证。

- [ ] **Step 5: 写入统计零样本结构失败测试**

在 `StatisticsView.test.js` 增加：

```js
test('zero-sample statistics shows readiness and never renders fake deviation results', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')
  assert.match(source, /sampleMaturityState\(totalSamples\.value\)/)
  assert.match(source, /sampleStageState\(totalSamples\.value\)/)
  assert.match(source, /v-if="!stats"/)
  assert.match(source, /v-else-if="!hasSamples"/)
  assert.match(source, /<SampleReadinessPanel/)
  assert.match(source, /从第一条样本开始建立统计诊断/)
  assert.match(source, /:current="0"/)
  assert.match(source, /:target="500"/)
  assert.match(source, /规则基线主导/)
  assert.match(source, /<SampleStageAxis/)
  assert.match(source, /v-else class="stats-task-stack"/)
  assert.ok(source.indexOf('v-else class="stats-task-stack"') < source.indexOf('class="stats-task-card substat-deviation-card"'))
})

test('statistics zero state uses a neutral maturity chip without a green dot', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')
  assert.match(source, /page-summary-chip--neutral/)
  assert.match(source, /<i v-if="maturity\.hasSamples" aria-hidden="true"><\/i>/)
  assert.match(source, /\{\{ maturity\.label \}\}/)
  assert.match(source, /\{\{ stage\.rangeLabel \}\}/)
})
```

- [ ] **Step 6: 接入共享状态和请求状态**

在 `StatisticsView.vue` import 加入：

```js
import InsightRequestState from '../../components/states/InsightRequestState.vue'
import SampleReadinessPanel from '../../components/states/SampleReadinessPanel.vue'
import { hasRecordedSamples, sampleMaturityState, sampleStageState } from '../../shared/sampleExperience.js'
import SampleStageAxis from './SampleStageAxis.vue'
```

props 与 emits 改为：

```js
const props = defineProps({
  stats: { type: Object, default: null },
  requestStatus: { type: String, default: 'idle' },
})
const emit = defineEmits(['retry', 'start-recording'])
```

在 `totalSamples` 后加入：

```js
const hasSamples = computed(() => hasRecordedSamples(props.stats))
const maturity = computed(() => sampleMaturityState(totalSamples.value))
const stage = computed(() => sampleStageState(totalSamples.value))
const statisticsContextText = computed(() => (
  hasSamples.value
    ? statsReliabilityNote(totalSamples.value)
    : '尚无样本。录入第一条副词条后开始生成个人分布。'
))
```

删除 `sampleStageRangeText` computed 和 `statsReliabilityText` import；`sampleStageDriverText` 继续使用后端真实 driver，并在无值时回退到阶段轴 caption。

- [ ] **Step 7: 改写统计页头和四态正文**

页头说明改为：

```vue
<p v-if="stats" class="stats-diagnostic-context">{{ statisticsContextText }}</p>
<p v-else class="stats-diagnostic-context">正在读取统计数据。</p>
```

状态胶囊改为：

```vue
<span
  class="page-summary-chip"
  :class="maturity.hasSamples ? 'page-summary-chip--state' : 'page-summary-chip--neutral'"
  :title="`统计可信度：${maturity.label}`"
>
  <i v-if="maturity.hasSamples" aria-hidden="true"></i>
  {{ maturity.label }}
</span>
<span class="page-summary-chip" :title="`当前阶段 ${stage.rangeLabel}`">
  <small>阶段</small>
  <span class="page-summary-chip__value">{{ stage.rangeLabel }}</span>
</span>
```

将正文顶层条件改为：

```vue
<InsightRequestState
  v-if="!stats"
  :status="requestStatus === 'error' ? 'error' : 'loading'"
  title="正在读取统计数据"
  description="统计数据加载失败，请重新加载。"
  @retry="emit('retry')"
/>

<SampleReadinessPanel
  v-else-if="!hasSamples"
  title="从第一条样本开始建立统计诊断"
  description="录入一条副词条后即可查看实际分布；达到 500 条后进入总体偏差阶段。"
  :current="0"
  :target="500"
  progress-label="距离总体偏差阶段还差 500 条"
  strategy-text="当前由规则基线主导"
  action-label="去工作台录入第一条"
  @action="emit('start-recording')"
>
  <template #detail>
    <SampleStageAxis
      :progress="sampleStageProgress"
      :rows="sampleStageAxisRows"
      :segments="sampleStageSegmentRows"
      :aria-label="sampleStageAriaLabel"
    />
  </template>
</SampleReadinessPanel>

<div v-else class="stats-task-stack">
```

把当前源码中从 `<section class="stats-task-card sample-reliability-card"` 开始、到 `substat-deviation-card` 对应 `</section>` 结束的两张完整任务卡移动到该 `div` 内；只将可信度卡中的阶段轴替换成 Step 3 的 `SampleStageAxis` 调用。随后用下面的闭合标签结束分支，并删除旧 `.stats-empty-state`：

```vue
</div>
```

- [ ] **Step 8: 增加中性页头状态样式**

在 `page-summary.css` 加入：

```css
.page-summary-chip--neutral {
  border-color: rgba(216, 226, 234, 0.9);
  color: #536779;
  background: var(--surface-soft);
}

.page-summary-chip__value--empty { color: var(--steel); min-width: 2ch; }

.app-shell.theme-dark .page-summary-chip--neutral {
  border-color: rgba(63, 86, 102, 0.72);
  color: var(--charcoal);
  background: rgba(45, 61, 73, 0.76);
}
```

在 `page-summary.test.js` 增加：

```js
assert.match(shared, /^\.page-summary-chip--neutral \{/m)
assert.match(shared, /^\.page-summary-chip__value--empty \{/m)
assert.match(shared, /\.app-shell\.theme-dark \.page-summary-chip--neutral/)
```

- [ ] **Step 9: 调整统计准备面板内阶段轴间距**

在 `statistics.css` 加入：

```css
.sample-readiness-detail .sample-stage-axis { margin-top: 0; }
.sample-readiness-detail .sample-stage-track { margin-top: 4px; }
```

不复制 `.sample-readiness-panel` 边框、背景、按钮或响应式规则。

- [ ] **Step 10: 登记阶段轴体积并运行测试**

在 `architecture.test.js` 加入：

```js
assert.ok(await lineCount('./features/statistics/SampleStageAxis.vue') <= 65, 'SampleStageAxis.vue must remain presentational')
```

运行：

```powershell
..\.tools\node\node.exe --test src\shared\sampleExperience.test.js src\features\statistics\SampleStageAxis.test.js src\features\statistics\presentation.test.js src\features\statistics\StatisticsView.test.js src\page-summary.test.js src\App.test.js src\architecture.test.js
```

Expected: PASS；已有样本统计任务卡与 `pp` 测试继续通过。

- [ ] **Step 11: 提交统计零样本体验**

```powershell
git add WuwaFrontend/src/features/statistics/SampleStageAxis.vue WuwaFrontend/src/features/statistics/SampleStageAxis.test.js WuwaFrontend/src/features/statistics/presentation.js WuwaFrontend/src/features/statistics/presentation.test.js WuwaFrontend/src/features/statistics/StatisticsView.vue WuwaFrontend/src/features/statistics/StatisticsView.test.js WuwaFrontend/src/styles/features/statistics.css WuwaFrontend/src/styles/page-summary.css WuwaFrontend/src/page-summary.test.js WuwaFrontend/src/architecture.test.js
git commit -m "feat: add zero-sample statistics readiness"
```

### Task 6: 实施模型评估零样本与回测准备状态

**Files:**
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationView.vue`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationView.test.js`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css`
- Modify: `WuwaFrontend/src/page-summary.test.js`
- Modify: `WuwaFrontend/src/App.test.js`

- [ ] **Step 1: 写入评估状态失败测试**

在 `EvaluationView.test.js` 增加：

```js
test('evaluation uses shared maturity and keeps readiness inside the page', async () => {
  const source = await readFile(new URL('./EvaluationView.vue', import.meta.url), 'utf8')
  assert.match(source, /sampleMaturityState\(totalSamples\.value\)/)
  assert.match(source, /sampleStageState\(totalSamples\.value\)/)
  assert.match(source, /evaluationReadinessState\(props\.evaluation\)/)
  assert.match(source, /\{\{ maturity\.label \}\}/)
  assert.match(source, /<i v-if="maturity\.hasSamples" aria-hidden="true"><\/i>/)
  assert.doesNotMatch(source, /function evaluationStatusText/)
  assert.doesNotMatch(source, /'观察中'|'可参考'|'稳定'/)
})

test('evaluation hides result modules until the backend marks evaluation ready', async () => {
  const source = await readFile(new URL('./EvaluationView.vue', import.meta.url), 'utf8')
  const stackIndex = source.indexOf('v-if="readiness.ready" class="evaluation-module-stack"')
  const readinessIndex = source.indexOf('v-else-if="evaluation"')
  assert.ok(stackIndex >= 0 && readinessIndex > stackIndex)
  assert.match(source, /<SampleReadinessPanel/)
  assert.match(source, /模型评估将在积累有效历史后开启/)
  assert.match(source, /回测准备中/)
  assert.match(source, /:current="readiness\.evaluated"/)
  assert.match(source, /:target="readiness\.target"/)
  assert.match(source, /前 20 条用于建立上下文/)
})

test('unavailable evaluation metrics use a numeric placeholder instead of a semantic error', async () => {
  const source = await readFile(new URL('./EvaluationView.vue', import.meta.url), 'utf8')
  assert.match(source, /EMPTY_METRIC_TEXT/)
  assert.match(source, /formatOptionalMetric/)
  assert.match(source, /page-summary-chip__value--empty/)
  assert.match(source, /前三命中率尚未形成/)
  assert.doesNotMatch(source, /return metric\?\.value == null \? '样本不足'/)
})
```

- [ ] **Step 2: 运行评估测试确认 RED**

```powershell
..\.tools\node\node.exe --test src\features\evaluation\EvaluationView.test.js
```

Expected: FAIL，评估页仍维护独立状态映射并始终挂载三个任务模块。

- [ ] **Step 3: 重写评估页 script 状态层**

将 `EvaluationView.vue` 的 script 改为以下完整内容：

```vue
<script setup>
import { computed } from 'vue'

import InsightRequestState from '../../components/states/InsightRequestState.vue'
import SampleReadinessPanel from '../../components/states/SampleReadinessPanel.vue'
import { formatPercent } from '../../services/formatters.js'
import {
  EMPTY_METRIC_TEXT,
  evaluationReadinessState,
  formatOptionalMetric,
  sampleMaturityState,
  sampleStageState,
  sampleTotal,
} from '../../shared/sampleExperience.js'
import EvaluationBacktest from './EvaluationBacktest.vue'
import EvaluationCoreBacktest from './EvaluationCoreBacktest.vue'
import EvaluationOverview from './EvaluationOverview.vue'

const props = defineProps({
  evaluation: { type: Object, default: null },
  modelDetails: { type: Array, default: () => [] },
  prediction: { type: Object, default: null },
  stats: { type: Object, default: null },
  requestStatus: { type: String, default: 'idle' },
})
const emit = defineEmits(['retry', 'start-recording'])

const totalSamples = computed(() => sampleTotal(props.stats))
const maturity = computed(() => sampleMaturityState(totalSamples.value))
const stage = computed(() => sampleStageState(totalSamples.value))
const readiness = computed(() => evaluationReadinessState(props.evaluation))
const topThreeText = computed(() => (
  readiness.value.ready
    ? formatOptionalMetric(props.evaluation?.top_3_hit_rate, (value) => formatPercent(value))
    : EMPTY_METRIC_TEXT
))
const readinessTitle = computed(() => (
  readiness.value.key === 'collecting' ? '回测准备中' : '模型评估将在积累有效历史后开启'
))
const readinessDescription = computed(() => (
  readiness.value.key === 'collecting'
    ? `当前共有 ${totalSamples.value} 条历史样本，其中 ${readiness.value.evaluated} 条已进入有效回测；达到 20 条后显示完整评估。`
    : '评估按历史顺序回测，前 20 条用于建立上下文，不直接计入有效回测样本。'
))
const readinessProgressLabel = computed(() => (
  `有效回测 ${readiness.value.evaluated} / ${readiness.value.target}`
))
</script>
```

- [ ] **Step 4: 重写评估页 template 四态结构**

用以下完整 template 替换现有 template：

```vue
<template>
  <section class="product-panel full-panel evaluation-panel">
    <header class="evaluation-status-bar">
      <h2>模型评估</h2>
      <div v-if="stats" class="page-summary-chips" role="group" aria-label="评估摘要">
        <span class="page-summary-chip" :class="maturity.hasSamples ? 'page-summary-chip--state' : 'page-summary-chip--neutral'">
          <i v-if="maturity.hasSamples" aria-hidden="true"></i>{{ maturity.label }}
        </span>
        <span class="page-summary-chip">
          <small>阶段</small><span class="page-summary-chip__value">{{ stage.rangeLabel }}</span>
        </span>
        <span class="page-summary-chip">
          <small>前三命中</small>
          <span
            class="page-summary-chip__value"
            :class="{ 'page-summary-chip__value--empty': topThreeText === EMPTY_METRIC_TEXT }"
            :aria-label="topThreeText === EMPTY_METRIC_TEXT ? '前三命中率尚未形成' : `前三命中率${topThreeText}`"
          >{{ topThreeText }}</span>
        </span>
      </div>
    </header>

    <InsightRequestState
      v-if="!evaluation"
      :status="requestStatus === 'error' ? 'error' : 'loading'"
      title="正在读取模型评估"
      description="模型评估加载失败，请重新加载。"
      @retry="emit('retry')"
    />

    <div v-else-if="readiness.ready" class="evaluation-module-stack">
      <EvaluationCoreBacktest :evaluation="evaluation" />
      <EvaluationOverview :evaluation="evaluation" :model-details="modelDetails" :prediction="prediction" />
      <EvaluationBacktest :evaluation="evaluation" :model-details="modelDetails" :prediction="prediction" />
    </div>

    <SampleReadinessPanel
      v-else-if="evaluation"
      :title="readinessTitle"
      :description="readinessDescription"
      :current="readiness.evaluated"
      :target="readiness.target"
      :progress-label="readinessProgressLabel"
      strategy-text="当前预测来源：规则基线"
      action-label="去工作台继续录入"
      @action="emit('start-recording')"
    />
  </section>
</template>
```

- [ ] **Step 5: 只增加评估页周边间距规则**

在 `evaluation.css` 的 `.evaluation-status-bar` 规则附近加入：

```css
.evaluation-panel > .sample-readiness-panel,
.evaluation-panel > .insight-request-state { margin-top: 18px; }
```

不修改 `EvaluationCoreBacktest.vue`、`EvaluationOverview.vue`、`EvaluationBacktest.vue` 或 ready 模块内部 CSS；这些组件只在 ready 分支挂载。

- [ ] **Step 6: 更新共享页头契约测试**

在 `page-summary.test.js` 增加：

```js
const statistics = await readFile(new URL('./features/statistics/StatisticsView.vue', import.meta.url), 'utf8')
const evaluation = await readFile(new URL('./features/evaluation/EvaluationView.vue', import.meta.url), 'utf8')
assert.match(statistics, /sampleMaturityState/)
assert.match(evaluation, /sampleMaturityState/)
assert.match(statistics, /page-summary-chip--neutral/)
assert.match(evaluation, /page-summary-chip--neutral/)
```

在 `App.test.js` 对评估接线增加：

```js
assert.match(source, /:request-status="evaluationRequestStatus"/)
assert.match(source, /@retry="refreshEvaluation"/)
```

- [ ] **Step 7: 运行评估与共享状态测试**

```powershell
..\.tools\node\node.exe --test src\shared\sampleExperience.test.js src\components\states\SampleReadinessPanel.test.js src\components\states\InsightRequestState.test.js src\features\evaluation\EvaluationView.test.js src\features\evaluation\EvaluationOverview.test.js src\features\evaluation\EvaluationBacktest.test.js src\page-summary.test.js src\App.test.js src\architecture.test.js
```

Expected: PASS；既有 ready 任务模块顺序、单边界视觉和子模型交互测试继续通过。

- [ ] **Step 8: 提交评估准备状态**

```powershell
git add WuwaFrontend/src/features/evaluation/EvaluationView.vue WuwaFrontend/src/features/evaluation/EvaluationView.test.js WuwaFrontend/src/styles/features/evaluation.css WuwaFrontend/src/page-summary.test.js WuwaFrontend/src/App.test.js
git commit -m "feat: gate evaluation by backtest readiness"
```

### Task 7: 同步长期规范并完成自动化与视觉验收

**Files:**
- Modify: `DESIGN.md`
- Modify: `.impeccable/design.json`
- Modify: `docs/product-interface-principles.md`
- Modify: `docs/web-workbench-ui-guidelines.md`
- Create: `docs/design-baselines/web/2026-07-15/zero-sample-light.png`
- Create: `docs/design-baselines/web/2026-07-15/zero-sample-dark.png`
- Create: `docs/design-baselines/web/2026-07-15/zero-sample-mobile.png`
- Create: `docs/archive/2026-07-15-zero-sample-and-status-semantics-implementation.md`
- Verify: all files listed in this plan

- [ ] **Step 1: 在 `DESIGN.md` 写入长期状态规则**

在 Components 的 Statistics diagnosis 之后加入：

```markdown
### Zero sample and insight readiness

- 统计诊断与模型评估共享同一套样本成熟度：`0` 为“待录入”，`1–499` 为“起步观察”，`500–2999` 为“初步观察”，`3000–9999` 为“可作参考”，`10000–49999` 为“稳定观察”，`50000+` 为“可优化权重”。零样本状态使用中性胶囊且不显示绿色状态点。
- 真实计数显示 `0`；请求成功但尚未形成的指标显示半角 `--`；语义状态显示短文案。`--` 不附带 `%`、`pp` 或单位，不表达 loading 或 error。全局置信度在零样本时固定显示 `--`。
- 零样本列表和图表整体隐藏，由一张行动导向的准备面板替代，不渲染成排的 `0.00%`、`+0.00pp` 或“样本不足”。
- 模型评估的样本成熟度与回测准备度分开表达：页头显示统一成熟度，正文显示 `evaluated_count / 20`；只有后端状态为 `ready` 时渲染完整回测模块。
- loading 使用骨架，error 使用可理解说明和重新加载动作；二者不得复用零样本或 `--`。
```

在 Named Rules 加入：

```markdown
**The Empty Metric Rule.** 真实计数显示 `0`，尚未形成的指标显示半角 `--`，语义状态显示文字；`--` 不承担 loading、error 或单位。

**The Readiness Gate Rule.** 无真实数据的分析模块整体隐藏并由可操作的准备状态替代；统计和评估共享样本成熟度，评估准备度独立呈现。
```

- [ ] **Step 2: 同步 `.impeccable/design.json`**

在 `narrative.rules` 数组加入：

```json
{
  "name": "The Empty Metric Rule",
  "body": "真实计数显示 0，尚未形成的指标显示半角 --，语义状态显示文字；-- 不承担 loading、error 或单位。",
  "section": "components"
},
{
  "name": "The Readiness Gate Rule",
  "body": "无真实数据的分析模块整体隐藏并由可操作的准备状态替代；统计和评估共享样本成熟度，评估准备度独立呈现。",
  "section": "components"
}
```

在 `components` 数组加入结构化准备面板：

```json
{
  "name": "Sample Readiness Panel",
  "kind": "custom",
  "refersTo": "sample-readiness-panel",
  "description": "统计与评估在结果形成前使用的单边界准备面板，展示真实进度、来源说明和返回工作台动作。",
  "html": "<section class=\"ds-readiness\"><div><span>数据准备</span><h3>从第一条样本开始建立统计诊断</h3><p>录入一条副词条后即可查看实际分布。</p></div><div><strong>0</strong><span>/ 500</span><progress value=\"0\" max=\"500\"></progress></div><button type=\"button\">去工作台录入第一条</button></section>",
  "css": ".ds-readiness { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, 260px) auto; align-items: center; gap: 20px; border: 1px solid var(--border-soft, #dee3e9); border-radius: 12px; padding: 20px; color: var(--ink-strong, #0a1317); background: var(--canvas, #fff); } .ds-readiness h3, .ds-readiness p { margin: 0; } .ds-readiness progress { width: 100%; accent-color: var(--primary, #0064e0); } .ds-readiness button { min-height: 44px; border: 1px solid var(--primary, #0064e0); border-radius: 12px; padding: 10px 18px; color: #fff; background: var(--primary, #0064e0); }"
}
```

运行 JSON 解析验证：

```powershell
cd WuwaFrontend
..\.tools\node\node.exe -e "JSON.parse(require('node:fs').readFileSync('../.impeccable/design.json','utf8')); console.log('design json ok')"
```

Expected: 输出 `design json ok`。

- [ ] **Step 3: 更新跨端与工作台长期规则**

在 `docs/product-interface-principles.md` 的“状态”小节加入：

```markdown
- 真实零值、尚未形成的指标、语义状态、loading 和 error 必须分别表达：计数使用 `0`，未计算指标使用 `--`，状态使用可理解文字，loading 使用骨架，error 提供恢复动作。
- 同一业务成熟度在不同页面必须使用同一文案；页面专属准备度放在页面正文，不另造一套全局状态词。
```

在 `docs/web-workbench-ui-guidelines.md` 的“工作台摘要区”加入：

```markdown
- 零样本时摘要保持“历史声骸 0 / 总样本 0 / 置信度 --”；置信度不得显示“未建立”、`低` 或 `0%`。
```

在“初始化与配置区”加入：

```markdown
- 总样本为 0 时，在初始化说明位置显示一条紧凑首次录入指引；工作台保持直接可操作，不增加阻塞弹窗、额外开始按钮或模拟数据。
```

在“历史记录区”加入：

```markdown
- 无可见历史且没有保存过最小化偏好时默认最小化；已经保存的展开或最小化偏好优先。
```

- [ ] **Step 4: 运行全部前端测试**

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test
```

Expected: exit code 0，全部 Node 测试 PASS。

- [ ] **Step 5: 运行生产构建**

```powershell
..\.tools\node\npm.cmd run build -- --logLevel error
```

Expected: exit code 0；Vite 构建完成，不提交 `dist/`。

- [ ] **Step 6: 核对前后端阈值仍一致**

```powershell
cd ..
rg -n "MIN_EVALUATED_SAMPLES = 20|\{\"min\": 0, \"max\": 500|\{\"min\": 500, \"max\": 3000|\{\"min\": 3000, \"max\": 10000|\{\"min\": 10000, \"max\": 50000|\{\"min\": 50000" Wuwa/analytics/services/evaluation.py Wuwa/echoes/constants.py
```

Expected: 评估目标仍为 20，阶段仍为 0/500/3000/10000/50000；没有 API 或后端修改。

- [ ] **Step 7: 启动本地页面并验证零样本浅色桌面**

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd run dev -- --host 127.0.0.1 --port 5174
```

使用一个新绑定、无副词条样本的本地开发 UID，在 1440 × 900 浅色模式检查：

1. 全局摘要为 `0 / 0 / --`，不出现 `+0`。
2. 工作台直接可录入，首次提示不增加独立大卡或阻塞操作。
3. 规则候选概率可见时标注“规则基线 · 尚未使用个人样本”。
4. 统计页显示中性“待录入”、`阶段 0–500 条`、`0 / 500` 和阶段轴；没有偏差结果卡。
5. 评估页显示中性“待录入”、`前三命中 --`、`0 / 20`；没有三个 ready 任务模块。
6. 点击两个页面的主动作都能返回工作台。
7. 空历史面板在无偏好时最小化；手动展开并刷新后尊重保存偏好。

保存截图为 `docs/design-baselines/web/2026-07-15/zero-sample-light.png`。

- [ ] **Step 8: 验证深色与窄屏**

在同一零样本账号下：

- 1440 × 900 深色：中性胶囊不显示绿点，准备面板只比页面背景高一个表面层级，`--` 清楚但不高亮。
- 860px：页头摘要自然换行，准备面板纵向排列，阶段轴内部可滚动。
- 520px：按钮占可用宽度，无文字裁切、控件重叠或页面级横向滚动。
- 键盘 Tab：导航、准备面板按钮、历史面板控制都有可见焦点。

保存深色桌面和 520px 截图为：

- `docs/design-baselines/web/2026-07-15/zero-sample-dark.png`
- `docs/design-baselines/web/2026-07-15/zero-sample-mobile.png`

- [ ] **Step 9: 验证从零到第一条以及评估 collecting 状态**

在工作台录入一条真实本地开发样本并检查：

1. 全局总样本变为 `1`，置信度只有在预测实际返回时显示语义值，否则保持 `--`。
2. 统计和评估页头都切换为“起步观察”。
3. 统计恢复已有样本任务卡，不再显示零样本准备面板。
4. 评估继续显示准备面板，不提前显示完整回测模块。
5. 当后端返回 `evaluated_count` 为 `1–19` 时，评估正文标题为“回测准备中”，显示真实 `evaluated_count / 20`。
6. 当后端状态为 `ready` 时，恢复现有三任务模块和真实前三命中率。

- [ ] **Step 10: 运行仓库卫生检查**

```powershell
git diff --check
git status --short
git diff -- WuwaFrontend/src/shared WuwaFrontend/src/components/states WuwaFrontend/src/components/shell/WorkspaceSummary.vue WuwaFrontend/src/composables/useDashboardNavigation.js WuwaFrontend/src/features/workspace WuwaFrontend/src/features/history WuwaFrontend/src/features/statistics WuwaFrontend/src/features/evaluation/EvaluationView.vue WuwaFrontend/src/styles WuwaFrontend/src/App.vue DESIGN.md .impeccable/design.json docs/product-interface-principles.md docs/web-workbench-ui-guidelines.md docs/design-baselines/web/2026-07-15 docs/archive/2026-07-15-zero-sample-and-status-semantics-implementation.md
```

Expected: `git diff --check` 无输出；diff 不包含 `dist/`、日志、数据库、本地路径或本方案外的清理。

- [ ] **Step 11: 写入实施记录**

创建 `docs/archive/2026-07-15-zero-sample-and-status-semantics-implementation.md`：

```markdown
# 零样本体验与统一状态语义实施记录

## 结果

- 统计诊断与模型评估改用同一套样本成熟度，零样本统一为中性“待录入”。
- 真实计数、未计算指标与语义状态分开显示；全局零样本置信度和评估未形成指标使用 `--`。
- 工作台保留直接录入路径，并增加首次录入说明与规则基线来源。
- 统计零样本隐藏偏差结果，显示 `0 / 500` 和样本阶段轴。
- 评估未 ready 时隐藏完整任务模块，显示有效回测 `evaluated_count / 20`。
- 空历史面板只在没有已保存偏好且没有可见历史时默认最小化。

## 代码边界

- `shared/sampleExperience.js` 是跨页面成熟度、阶段、准备度与未计算指标的唯一 owner。
- `SampleReadinessPanel.vue` 和 `InsightRequestState.vue` 分别负责业务准备状态与请求 loading/error。
- `workspaceInsightRefresh.js` 负责按页刷新和旧账号请求失效；档位保存路径不触发统计或评估刷新。
- 统计与评估 feature 继续拥有各自文案与 ready 结果模块。

## 验证

- 前端完整 Node 测试：通过，退出码 0。
- Vite 生产构建：通过，退出码 0。
- `git diff --check`：通过。
- 浅色桌面、深色桌面、860px、520px、键盘焦点：通过。
- 零样本、第一条样本、评估 collecting、评估 ready 状态转换：通过。

## 未改变范围

- 未修改 Django API、数据库、统计/预测/评估算法、评估 20 条有效样本阈值或样本阶段阈值。
- 未新增模拟数据、阻塞 onboarding、UI 框架或全局状态管理。
```

- [ ] **Step 12: 提交文档、视觉证据和实施记录**

```powershell
git add DESIGN.md .impeccable/design.json docs/product-interface-principles.md docs/web-workbench-ui-guidelines.md docs/design-baselines/web/2026-07-15/zero-sample-light.png docs/design-baselines/web/2026-07-15/zero-sample-dark.png docs/design-baselines/web/2026-07-15/zero-sample-mobile.png docs/archive/2026-07-15-zero-sample-and-status-semantics-implementation.md
git commit -m "docs: record zero-sample experience"
```

## Final Acceptance Checklist

- [ ] 统计与评估在 `0 / 1 / 500 / 3000 / 10000 / 50000` 边界显示完全相同的成熟度。
- [ ] 零样本成熟度为“待录入”，状态胶囊无绿色点。
- [ ] 全局摘要为历史 `0`、总样本 `0`、置信度 `--`；不出现“未建立”、`低`、`0%` 或 `+0`。
- [ ] 真实计数 `0` 不会被 `formatOptionalMetric` 转为 `--`。
- [ ] `--` 不附带 `%`、`pp`、`条`，并具有指标专属可访问名称。
- [ ] 工作台零样本直接可录入，首次提示和规则基线说明清楚且紧凑。
- [ ] 无保存偏好的空历史默认最小化，显式用户偏好不被覆盖。
- [ ] 统计零样本只有页头、准备面板和阶段轴，不出现偏差卡、13 条空行或 `+0.00pp`。
- [ ] 评估未 ready 时页头前三命中为 `--`，正文显示有效回测进度，三个结果模块不挂载。
- [ ] loading 使用骨架，error 使用重新加载，二者不显示为“待录入”或 `--`。
- [ ] 档位点击不等待 stats/evaluation；进入对应页面才刷新对应 insight。
- [ ] 旧 UID 的迟到响应不能覆盖新 UID 数据。
- [ ] 浅色、深色、1440px、860px、520px 和键盘焦点验收通过。
- [ ] 全量测试、构建、JSON 解析和 `git diff --check` 通过。

## Self-review

- Spec coverage：统一成熟度、评估准备度、字段级零样本规则、全局摘要、工作台、历史、统计、评估、请求状态、响应式、无障碍、数据新鲜度和文档闭环均有对应任务与验收。
- 占位扫描：实施步骤没有未定事项、未定义函数或跨任务省略写法；所有新函数、props、emits、CSS class 和测试命令均在首次使用前定义。
- Type consistency：`sampleTotal` 接受数字或带 `total_rolls` 的对象；`sampleMaturityState` 与 `sampleStageState` 接受相同输入；`evaluationReadinessState` 只接受 evaluation；两个页面的 `requestStatus` 使用 `idle/loading/ready/error`；事件统一为 `retry` 与 `start-recording`。
- Owner consistency：跨页面纯语义位于 `shared/`，跨页面状态 UI 位于 `components/states/`，导航编排位于 `composables/`，API 刷新仍由 workspace workflow 管理，页面文案与结果模块留在各自 feature。
- Scope consistency：不修改后端契约或高频保存路径，不提高入口文件上限，不引入新框架或模拟数据。
