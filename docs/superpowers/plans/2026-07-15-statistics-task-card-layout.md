# Statistics Task Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将统计页重排为“页面说明 + 样本可信度 + 副词条分布偏差”的两张同级任务卡片，使阶段进度进入第一张卡片、高低偏差摘要进入第二张卡片，并将比例差统一显示为百分点 `pp`。

**Architecture:** `StatisticsView.vue` 继续作为统计页唯一 owner，不新增状态管理或 API。页面外层改为透明布局容器，两张同级任务卡分别承接样本阶段与分布偏差；现有 `presentation.js` 继续负责统计排序和阶段计算，`formatters.js` 新增百分点格式化函数，避免在模板中拼接单位。

**Tech Stack:** Vue 3 `<script setup>`、原生 feature CSS、Node.js `node:test`、Vite。

---

## 锁定范围

- 本轮只实施已有样本时的统计页布局。
- 不实施零样本初始化、加载状态协议、跨页面引导、工作台或评估页改动。
- 页面外层不再使用 `product-panel full-panel` 巨型卡片视觉。
- 第一张任务卡为“样本可信度”，包含可信度结论、阶段标签、样本进度和完整阶段轴。
- 第二张任务卡为“副词条分布偏差”，包含当前偏高、当前偏低和全部副词条发散条形图。
- 偏差是百分点差，统一显示 `+18.18pp`，观察率与理论率仍显示 `%`。
- 当前偏低必须取绝对偏差最大的负值，不能取最接近零的负值。
- 深浅主题使用相同 DOM 和布局；860px 以下标题与摘要纵向堆叠，图表允许水平滚动但不得压缩到不可读。

## 文件职责

**Modify**

- `WuwaFrontend/src/services/formatters.test.js`：锁定百分点格式。
- `WuwaFrontend/src/services/formatters.js`：提供 `formatSignedPercentagePoints`。
- `WuwaFrontend/src/features/statistics/presentation.test.js`：锁定绝对偏差排序的极值语义。
- `WuwaFrontend/src/features/statistics/StatisticsView.test.js`：锁定两张同级任务卡、无巨型外壳、模块归属、`pp` 和 CSS 层级。
- `WuwaFrontend/src/features/statistics/StatisticsView.vue`：重排页面结构并修复当前偏低选择。
- `WuwaFrontend/src/styles/features/statistics.css`：实现任务卡、模块内摘要、深色主题和响应式。
- `DESIGN.md`：记录统计页任务卡片和百分点单位的长期规则。

**Create**

- `docs/archive/2026-07-15-statistics-task-card-layout-implementation.md`：记录实际实施结果和验证证据。

### Task 1: 新增百分点格式并锁定偏低极值

**Files:**
- Modify: `WuwaFrontend/src/services/formatters.test.js`
- Modify: `WuwaFrontend/src/services/formatters.js`
- Modify: `WuwaFrontend/src/features/statistics/presentation.test.js`

- [x] **Step 1: 写入失败测试**

在 `formatters.test.js` 的 import 中加入 `formatSignedPercentagePoints`，并新增：

```js
test('formats signed percentage-point differences', () => {
  assert.equal(formatSignedPercentagePoints(0.1818), '+18.18pp')
  assert.equal(formatSignedPercentagePoints(-0.0664), '-6.64pp')
  assert.equal(formatSignedPercentagePoints(0), '+0.00pp')
})
```

在 `presentation.test.js` 的排序测试中加入第二个负偏差，并断言排序结果中的第一个负值是绝对偏差最大的负值：

```js
const rows = buildSortedStatFrequency({
  substat_frequency: {
    low: { substat_type: 'low', observed_rate: 0.08, baseline_rate: 0.1 },
    colder: { substat_type: 'colder', observed_rate: 0.03, baseline_rate: 0.1 },
    high: { substat_type: 'high', observed_rate: 0.2, baseline_rate: 0.1 },
  },
})

assert.equal(rows.find((row) => row.deviation < 0)?.substat_type, 'colder')
```

- [x] **Step 2: 运行测试确认 RED**

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src\services\formatters.test.js src\features\statistics\presentation.test.js
```

Expected: FAIL，`formatSignedPercentagePoints` 尚未导出。

- [x] **Step 3: 实现最小百分点格式化函数**

在 `formatters.js` 中加入：

```js
export function formatSignedPercentagePoints(value, digits = 2) {
  const numericValue = Number.isFinite(value) ? value : 0
  const sign = numericValue >= 0 ? '+' : ''
  return `${sign}${(numericValue * 100).toFixed(digits)}pp`
}
```

- [x] **Step 4: 运行测试确认 GREEN**

运行 Step 2 的命令，Expected: PASS。

### Task 2: 用失败测试锁定两张任务卡片结构

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`

- [x] **Step 1: 替换旧巨型面板契约并新增结构断言**

将旧 `product-panel full-panel` 正向断言替换为：

```js
assert.match(source, /class="stats-analytics-panel"/)
assert.doesNotMatch(source, /class="product-panel full-panel stats-analytics-panel"/)
assert.match(source, /class="stats-task-stack"/)
assert.match(source, /class="stats-task-card sample-reliability-card"/)
assert.match(source, /class="stats-task-card substat-deviation-card"/)
```

新增任务归属测试：

```js
test('statistics task cards keep stage and deviation content with their owners', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')
  const reliabilityStart = source.indexOf('class="stats-task-card sample-reliability-card"')
  const deviationStart = source.indexOf('class="stats-task-card substat-deviation-card"')

  assert.ok(reliabilityStart >= 0 && reliabilityStart < deviationStart)
  const reliabilitySection = source.slice(reliabilityStart, deviationStart)
  const deviationSection = source.slice(deviationStart)
  assert.match(reliabilitySection, /<h3>样本可信度<\/h3>/)
  assert.match(reliabilitySection, /class="sample-stage-axis"/)
  assert.match(deviationSection, /<h3>副词条分布偏差<\/h3>/)
  assert.match(deviationSection, /class="stats-diagnostic-deviations"/)
  assert.match(deviationSection, /class="substat-deviation-chart"/)
  assert.match(source, /formatSignedPercentagePoints\(row\.deviation\)/)
  assert.match(source, /sortedStatFrequency\.value\.find\(\(row\) => row\.deviation < 0\)/)
})
```

- [x] **Step 2: 新增 CSS 层级契约**

新增：

```js
test('statistics task cards use a transparent page owner and responsive sibling cards', async () => {
  const styles = await readStatisticsStyles()
  const ownerRule = styles.match(/^\.stats-analytics-panel \{([^}]+)\}/m)?.[1] || ''
  const stackRule = styles.match(/^\.stats-task-stack \{([^}]+)\}/m)?.[1] || ''
  const cardRule = styles.match(/^\.stats-task-card \{([^}]+)\}/m)?.[1] || ''

  assert.match(ownerRule, /display: grid/)
  assert.doesNotMatch(ownerRule, /border|box-shadow|background/)
  assert.match(stackRule, /display: grid/)
  assert.match(cardRule, /border: 1px solid/)
  assert.match(cardRule, /border-radius: 12px/)
  assert.match(styles, /@media \(max-width: 860px\)[\s\S]+\.stats-task-header[\s\S]+flex-direction: column/)
  assert.match(styles, /\.app-shell\.theme-dark \.stats-task-card/)
})
```

- [x] **Step 3: 运行视图测试确认 RED**

```powershell
..\.tools\node\node.exe --test src\features\statistics\StatisticsView.test.js
```

Expected: FAIL，旧页面仍是巨型外壳、阶段卡位于偏差图之后、偏差单位仍为 `%`。

### Task 3: 重排 StatisticsView 并实现任务卡样式

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.vue`
- Modify: `WuwaFrontend/src/styles/features/statistics.css`
- Test: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`

- [x] **Step 1: 更新格式化 import 和偏低计算**

使用：

```js
import { formatPercent, formatSignedPercentagePoints, sampleStageText } from '../../services/formatters.js'

const coldestStatRow = computed(() => sortedStatFrequency.value.find((row) => row.deviation < 0) || null)
```

`deviationTitle`、高低摘要和每行偏差值全部改用 `formatSignedPercentagePoints`。

- [x] **Step 2: 重排模板为页面头和两张同级任务卡**

页面根节点使用 `class="stats-analytics-panel"`。保留标题和区域级样本说明；`v-if="stats"` 下建立 `stats-task-stack`，依次放置：

```vue
<section class="stats-task-card sample-reliability-card">
  <header class="stats-task-header">...</header>
  <div class="sample-reliability-overview">...</div>
  <div class="sample-stage-axis">...</div>
</section>

<section class="stats-task-card substat-deviation-card">
  <header class="stats-task-header">...</header>
  <div class="stats-diagnostic-deviations">...</div>
  <div class="substat-deviation-chart">...</div>
</section>
```

不得保留旧的独立 `.stats-diagnostic-panel` 或把 `.sample-stage-card` 放在偏差卡之后。保留现有 aria-label、title、阶段轴节点和所有副词条行。

- [x] **Step 3: 重写 feature CSS 的层级 owner**

实现以下稳定边界：

```css
.stats-analytics-panel {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.stats-task-stack {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.stats-task-card {
  min-width: 0;
  border: 1px solid rgba(216, 226, 234, 0.9);
  border-radius: 12px;
  padding: 20px;
  background: #fbfcfe;
}
```

任务卡内部只使用分隔线、轨道和扁平摘要，不新增嵌套完整卡片。将旧 `.stats-chart-card`、`.stats-diagnostic-panel` 和 `.stats-chart-grid` 的边界职责迁移后删除；同步调整深色主题和 860px 响应式选择器。

- [x] **Step 4: 运行定向测试确认 GREEN**

```powershell
..\.tools\node\node.exe --test src\services\formatters.test.js src\features\statistics\presentation.test.js src\features\statistics\StatisticsView.test.js src\architecture.test.js
```

Expected: PASS，不提高任何架构行数限制。

### Task 4: 同步长期规范并完成验证记录

**Files:**
- Modify: `DESIGN.md`
- Create: `docs/archive/2026-07-15-statistics-task-card-layout-implementation.md`

- [x] **Step 1: 更新统计页长期规则**

将 `DESIGN.md` 的 `Statistics diagnosis` 补充为：

```markdown
- 统计页使用“样本可信度”和“副词条分布偏差”两张同级任务卡片；页面容器不再提供第三层巨型卡片边界。样本阶段轴属于可信度卡片，高低偏差摘要属于分布偏差卡片。
- 观察率和理论率使用 `%`；两个比例的差值使用百分点 `pp`，例如 `+18.18pp`。
```

- [x] **Step 2: 运行完整前端测试**

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test
```

Expected: 全部测试通过，0 failed。

- [x] **Step 3: 运行生产构建**

```powershell
..\.tools\node\npm.cmd run build -- --logLevel error
```

Expected: Vite exit code 0。

- [x] **Step 4: 运行仓库卫生检查**

```powershell
cd ..
git diff --check
git status --short
```

- [x] **Step 5: 写入实施记录**

记录实际结构、TDD 红绿证据、测试总数、构建结果、视觉验收结果和明确未实施的零样本初始化范围。

## Self-review

- Spec coverage：两张任务卡、第一屏顺序、外层去卡片、阶段与偏差归属、`pp` 单位、偏低极值、深浅主题和响应式均有对应任务。
- Placeholder scan：无 `TODO`、`TBD` 或“类似处理”。
- Type consistency：不新增 props；继续使用现有 `stats`、阶段 presentation 和统计 API 结构。
