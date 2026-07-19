# Statistics Diagnosis Summary Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将统计诊断页头改为仅含“起步观察”和样本阶段的双胶囊摘要，并把样本可信度卡收敛为判断依据、阶段进度和阶段轴。

**Architecture:** `StatisticsView.vue` 继续作为统计页唯一 owner，复用现有可信度、阶段范围、阶段驱动和进度 computed，不新增 API、store 或 presentation 映射。页头摘要与卡片解释行分别拥有独立 class，视觉仍由 `styles/features/statistics.css` 管理；跨页面 `App.test.js` 只更新静态结构契约，不提取评估页共享组件。

**Tech Stack:** Vue 3 `<script setup>`、原生 feature CSS、Node.js `node:test`、Vite。

---

## Execution context and locked scope

- 执行前阅读 `docs/superpowers/specs/2026-07-15-statistics-diagnosis-summary-design.md`。
- 当前工作区已经包含 `docs/superpowers/plans/2026-07-15-statistics-task-card-layout.md` 对应的两张统计任务卡实现；本计划以该实现为基线，不得恢复巨型外层卡片或旧 `.stats-diagnostic-panel`。
- 本轮不改副词条偏差卡、`pp` 格式、偏高/偏低极值、阶段计算、API 和零样本初始化。
- 页头摘要严格只有两个胶囊：可信度状态和阶段范围。不得加入“最大偏差”、样本总数、阶段进度或其他填充项。

## File responsibilities

**Modify**

- `WuwaFrontend/src/features/statistics/StatisticsView.test.js`：锁定双胶囊页头、卡片解释行、无重复结论和无“最大偏差”。
- `WuwaFrontend/src/App.test.js`：迁移统计页跨页面静态契约，删除旧阶段胶囊和大号结论 selector。
- `WuwaFrontend/src/features/statistics/StatisticsView.vue`：移动可信度结论和阶段范围到页头，重排样本可信度解释行。
- `WuwaFrontend/src/styles/features/statistics.css`：实现页头双胶囊、双列解释行、深色映射和响应式。
- `DESIGN.md`：记录统计页头只承载状态与阶段、卡片只解释依据与进度的长期规则。

**Create**

- `docs/archive/2026-07-15-statistics-diagnosis-summary-implementation.md`：记录实际结果、TDD 证据和视觉验收。

### Task 1: Lock the approved information hierarchy with failing tests

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- Modify: `WuwaFrontend/src/App.test.js`

- [ ] **Step 1: Add the focused header summary test**

在 `StatisticsView.test.js` 追加：

```js
test('statistics diagnosis header owns exactly two non-duplicated summary chips', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')
  const headerStart = source.indexOf('<header class="stats-diagnostic-head">')
  const taskStackStart = source.indexOf('<div v-if="stats" class="stats-task-stack">')

  assert.ok(headerStart >= 0 && headerStart < taskStackStart)
  const headerSection = source.slice(headerStart, taskStackStart)
  assert.match(headerSection, /v-if="stats" class="stats-diagnostic-summary" aria-label="统计摘要"/)
  assert.match(headerSection, /class="stats-diagnostic-summary-chip state"[\s\S]+<i aria-hidden="true"><\/i>[\s\S]+statsReliabilityText\(totalSamples\)/)
  assert.match(headerSection, /class="stats-diagnostic-summary-chip"[\s\S]+<small>阶段<\/small>[\s\S]+sampleStageRangeText/)
  assert.equal((headerSection.match(/class="stats-diagnostic-summary-chip(?: state)?"/g) || []).length, 2)
  assert.doesNotMatch(headerSection, /最大偏差|formatSignedPercentagePoints/)
})
```

- [ ] **Step 2: Add the reliability-card ownership test**

在同一文件追加：

```js
test('sample reliability card explains basis and progress without repeating the page conclusion', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')
  const reliabilityStart = source.indexOf('class="stats-task-card sample-reliability-card"')
  const deviationStart = source.indexOf('class="stats-task-card substat-deviation-card"')

  assert.ok(reliabilityStart >= 0 && reliabilityStart < deviationStart)
  const reliabilitySection = source.slice(reliabilityStart, deviationStart)
  assert.match(reliabilitySection, /<header class="stats-task-header">\s*<h3>样本可信度<\/h3>\s*<\/header>/)
  assert.match(reliabilitySection, /class="sample-reliability-basis"/)
  assert.match(reliabilitySection, />判断依据<\/span>/)
  assert.match(reliabilitySection, /\{\{ sampleStageDriverText \}\}/)
  assert.match(reliabilitySection, />当前阶段的主要解释来源<\/small>/)
  assert.match(reliabilitySection, />阶段进度<\/span>/)
  assert.match(reliabilitySection, /class="sample-stage-count-value"/)
  assert.match(reliabilitySection, /sampleStageStatus\.total/)
  assert.match(reliabilitySection, /sampleStageTargetLabel/)
  assert.match(reliabilitySection, /sampleStageGoalText/)
  assert.doesNotMatch(reliabilitySection, /当前结论|statsReliabilityText\(totalSamples\)|stats-diagnostic-stage-meta|stats-diagnostic-stage-chip/)
})
```

- [ ] **Step 3: Replace obsolete cross-page assertions**

在 `App.test.js` 的 `stats page focuses on analytics charts instead of prediction diagnostics` 测试中，用以下契约替换旧 `.stats-diagnostic-stage-meta`、`.stats-diagnostic-stage-chip`、`.sample-reliability-value` 和 `.sample-stage-current*` 正向断言：

```js
  assert.match(viewSource, /class="stats-diagnostic-summary"/)
  assert.match(viewSource, /class="stats-diagnostic-summary-chip state"/)
  assert.equal((viewSource.match(/class="stats-diagnostic-summary-chip(?: state)?"/g) || []).length, 2)
  assert.doesNotMatch(viewSource, /最大偏差/)
  assert.doesNotMatch(viewSource, /class="stats-diagnostic-stage-meta"/)
  assert.doesNotMatch(viewSource, /class="stats-diagnostic-stage-chip"/)
  assert.match(viewSource, /class="sample-reliability-basis"/)
  assert.match(viewSource, /class="sample-reliability-label"/)
  assert.match(viewSource, /class="sample-stage-count-value"/)
  assert.doesNotMatch(viewSource, /class="sample-reliability-value"/)
  assert.doesNotMatch(viewSource, /class="sample-stage-current(?:-name|-note)?"/)

  assert.match(statisticsStyleSource, /\.stats-diagnostic-summary \{/)
  assert.match(statisticsStyleSource, /\.stats-diagnostic-summary-chip \{/)
  assert.match(statisticsStyleSource, /\.stats-diagnostic-summary-chip\.state i \{/)
  assert.match(statisticsStyleSource, /\.sample-reliability-basis \{/)
  assert.match(statisticsStyleSource, /\.sample-stage-count-value \{/)
  assert.doesNotMatch(statisticsStyleSource, /\.stats-diagnostic-stage-meta \{/)
  assert.doesNotMatch(statisticsStyleSource, /\.stats-diagnostic-stage-chip \{/)
  assert.doesNotMatch(statisticsStyleSource, /\.sample-reliability-value \{/)
  assert.doesNotMatch(statisticsStyleSource, /\.sample-stage-current(?:-name|-note)? \{/)
```

保留该测试中阶段轴、副词条图、透明页面 owner 和两张任务卡的其他断言。

- [ ] **Step 4: Run the RED tests**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src\features\statistics\StatisticsView.test.js src\App.test.js
```

Expected: FAIL。`StatisticsView.vue` 尚无 `.stats-diagnostic-summary` 和 `.sample-reliability-basis`，旧阶段胶囊与大号结论仍存在。

### Task 2: Implement the two-chip header and compact reliability explanation

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.vue`
- Modify: `WuwaFrontend/src/styles/features/statistics.css`
- Test: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- Test: `WuwaFrontend/src/App.test.js`

- [ ] **Step 1: Move status and stage into the page header**

将 `StatisticsView.vue` 的统计页头替换为：

```vue
<header class="stats-diagnostic-head">
  <div class="stats-diagnostic-title-row">
    <div class="stats-diagnostic-title-stack">
      <h2>统计诊断</h2>
      <p v-if="stats" class="stats-diagnostic-context">{{ statsReliabilityNote(totalSamples) }}</p>
      <p v-else>等待样本录入后生成统计图表。</p>
    </div>
    <div v-if="stats" class="stats-diagnostic-summary" aria-label="统计摘要">
      <span
        class="stats-diagnostic-summary-chip state"
        :title="`统计可信度：${statsReliabilityText(totalSamples)}`"
      >
        <i aria-hidden="true"></i>
        {{ statsReliabilityText(totalSamples) }}
      </span>
      <span class="stats-diagnostic-summary-chip" :title="`当前阶段 ${sampleStageRangeText} 条`">
        <small>阶段</small>
        <strong class="stats-number">{{ sampleStageRangeText }} 条</strong>
      </span>
    </div>
  </div>
</header>
```

不要添加第三个胶囊，不要在页头引用 `hottestStatRow`、`coldestStatRow` 或 `formatSignedPercentagePoints`。

- [ ] **Step 2: Replace the large conclusion block with the approved explanation row**

先将样本可信度卡片的可访问名称改为：

```vue
<section
  class="stats-task-card sample-reliability-card"
  :aria-label="`样本可信度：${sampleStageDriverText}，${totalSamples} 条样本`"
>
```

再用以下完整块替换卡片标题栏和 `.sample-reliability-overview`，阶段轴保持为其后面的原有兄弟节点：

```vue
  <header class="stats-task-header">
    <h3>样本可信度</h3>
  </header>

  <div class="sample-reliability-overview">
    <article class="sample-reliability-basis" :title="`当前判断依据：${sampleStageDriverText}`">
      <span class="sample-reliability-label">判断依据</span>
      <strong>{{ sampleStageDriverText }}</strong>
      <small>当前阶段的主要解释来源</small>
    </article>
    <article class="sample-stage-count" :title="sampleStageAriaLabel">
      <span class="sample-reliability-label">阶段进度</span>
      <p class="sample-stage-count-value">
        <strong class="stats-number">{{ sampleStageStatus.total }}</strong>
        <span class="sample-stage-divider">/</span>
        <span class="stats-number sample-stage-target">{{ sampleStageTargetLabel }}</span>
      </p>
      <small>{{ sampleStageGoalText }}</small>
    </article>
  </div>
```

保留现有 `.sample-stage-axis` 的完整子节点，不改循环、位置计算或 `aria-hidden`。

- [ ] **Step 3: Replace the legacy chip CSS with page-summary CSS**

删除 `.stats-diagnostic-tags`、`.stats-diagnostic-stage-meta`、`.stats-diagnostic-stage-chip` 及其子选择器，加入：

```css
.stats-diagnostic-summary {
  display: flex;
  flex: 0 1 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.stats-diagnostic-summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  border: 1px solid rgba(216, 226, 234, 0.82);
  border-radius: 999px;
  padding: 6px 10px;
  color: #243747;
  background: #f8fafc;
  font-size: var(--text-label);
  font-weight: var(--weight-label);
  line-height: var(--leading-label);
  white-space: nowrap;
}

.stats-diagnostic-summary-chip small {
  color: #6d7d8c;
  font-size: var(--text-micro);
  font-weight: var(--weight-supporting);
  line-height: var(--leading-caption);
}

.stats-diagnostic-summary-chip strong {
  color: #122029;
  font-family: var(--font-data);
  font-size: var(--text-data-sm);
  font-weight: var(--weight-data);
  line-height: var(--leading-data);
  letter-spacing: var(--tracking-data);
  font-variant-numeric: tabular-nums;
}

.stats-diagnostic-summary-chip.state {
  border-color: rgba(44, 159, 112, 0.24);
  color: #1f704d;
  background: rgba(44, 159, 112, 0.08);
}

.stats-diagnostic-summary-chip.state i {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #2c9f70;
  box-shadow: 0 0 0 3px rgba(44, 159, 112, 0.12);
}
```

- [ ] **Step 4: Replace the legacy conclusion CSS with explanation-row CSS**

用以下完整规则替换当前 `.sample-reliability-overview`、`.sample-reliability-value`、`.sample-stage-summary`、`.sample-stage-current*` 和旧 `.sample-stage-count` 规则：

```css
.sample-reliability-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 32px;
  align-items: end;
  margin-bottom: 22px;
  padding: 2px 0 20px;
  border-bottom: 1px solid rgba(216, 226, 234, 0.72);
}

.sample-reliability-basis,
.sample-stage-count {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.sample-reliability-label {
  color: #6d7d8c;
  font-size: var(--text-label);
  font-weight: var(--weight-label);
  line-height: var(--leading-label);
}

.sample-reliability-basis strong {
  color: #1f704d;
  font-size: var(--text-data-sm);
  font-weight: var(--weight-emphasis);
  line-height: var(--leading-data);
}

.sample-reliability-basis small,
.sample-stage-count small {
  color: #5f7183;
  font-size: var(--text-caption);
  font-weight: var(--weight-supporting);
  line-height: var(--leading-caption);
}

.sample-stage-count {
  justify-items: end;
  min-width: 260px;
}

.sample-stage-count-value {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  margin: 0;
  color: #526579;
  white-space: nowrap;
}

.sample-stage-count-value strong {
  color: #0b151a;
  font-family: var(--font-data);
  font-size: var(--text-data-lg);
  font-weight: var(--weight-emphasis);
  line-height: var(--leading-data);
  letter-spacing: var(--tracking-data);
  font-variant-numeric: tabular-nums;
}

.sample-stage-target {
  color: #526579;
  font-size: var(--text-data-sm);
  font-weight: var(--weight-data);
}

.sample-stage-divider {
  color: #8a9aaa;
  font-weight: var(--weight-supporting);
}

.sample-stage-count small {
  text-align: right;
}
```

- [ ] **Step 5: Update responsive and dark-theme ownership**

在 `@media (max-width: 860px)` 中保留 `.stats-diagnostic-title-row` 和 `.stats-task-header` 的纵向布局，并使用：

```css
.stats-diagnostic-summary {
  justify-content: flex-start;
}

.sample-reliability-overview {
  grid-template-columns: 1fr;
  gap: 14px;
}

.sample-stage-count {
  justify-items: start;
  min-width: 0;
}

.sample-stage-count small {
  text-align: left;
}
```

删除响应式中的 `.stats-diagnostic-stage-meta`、`.sample-stage-summary`，并删除 520px 中已经失效的 `.sample-stage-summary` 规则。保留 680px 阶段轴/偏差图内部滚动规则不变。

用以下映射替换旧阶段胶囊、大号结论和 `.sample-stage-current*` 的深色规则：

```css
.app-shell.theme-dark .stats-diagnostic-summary-chip {
  border-color: rgba(75, 98, 113, 0.7);
  color: var(--ink-deep);
  background: rgba(29, 42, 53, 0.86);
}

.app-shell.theme-dark .stats-diagnostic-summary-chip small,
.app-shell.theme-dark .sample-reliability-label,
.app-shell.theme-dark .sample-reliability-basis small,
.app-shell.theme-dark .sample-stage-count small {
  color: var(--charcoal);
}

.app-shell.theme-dark .stats-diagnostic-summary-chip strong,
.app-shell.theme-dark .sample-stage-count-value strong {
  color: var(--ink-deep);
}

.app-shell.theme-dark .stats-diagnostic-summary-chip.state {
  border-color: rgba(56, 179, 127, 0.26);
  color: #38b37f;
  background: rgba(56, 179, 127, 0.12);
}

.app-shell.theme-dark .sample-reliability-basis strong,
.app-shell.theme-dark .sample-stage-boundaries span.active strong,
.app-shell.theme-dark .sample-stage-segments span.current {
  color: #38b37f;
}

.app-shell.theme-dark .sample-stage-count-value,
.app-shell.theme-dark .sample-stage-target {
  color: var(--charcoal);
}
```

保留副词条偏差图、阶段轴轨道和任务卡深色规则不变。

- [ ] **Step 6: Run targeted tests and turn GREEN**

Run:

```powershell
..\.tools\node\node.exe --test src\features\statistics\StatisticsView.test.js src\App.test.js src\architecture.test.js
```

Expected: PASS，0 failed。若 `App.test.js` 仍引用删除的 selector，只迁移与本次统计摘要相关的契约，不恢复旧 DOM。

- [ ] **Step 7: Commit the implementation checkpoint**

执行前先检查本工作区已有改动，确保只暂存本计划涉及的代码和测试。当前这些文件还承载上一份统计任务卡计划的未提交基线；只有在该基线已经被有意纳入当前分支历史时才执行本步骤。若重叠文件仍包含无法独立暂存的既有改动，先完成代码与测试但暂停提交，并向用户确认提交边界：

```powershell
git status --short
git diff --check
git add -- WuwaFrontend/src/features/statistics/StatisticsView.vue WuwaFrontend/src/styles/features/statistics.css WuwaFrontend/src/features/statistics/StatisticsView.test.js WuwaFrontend/src/App.test.js
git commit -m "feat: refine statistics diagnosis summary"
```

### Task 3: Sync long-term rules and complete release verification

**Files:**
- Modify: `DESIGN.md`
- Create: `docs/archive/2026-07-15-statistics-diagnosis-summary-implementation.md`

- [ ] **Step 1: Update the long-term statistics rule**

在 `DESIGN.md` 的 `### Statistics diagnosis` 下补充：

```markdown
- 统计诊断页头在已有样本时只显示两个摘要胶囊：当前可信度状态与样本阶段。不得为了填满空间增加“最大偏差”或其他与任务卡重复的第三项。
- “起步观察”等可信度结论只在页头状态胶囊出现；样本可信度卡只解释阶段判断依据、当前/目标样本进度和阶段轴，不再渲染大号结论或重复阶段胶囊。
```

- [ ] **Step 2: Perform visual QA against real data**

使用本地真实统计数据检查以下状态：

```text
1280×720 light: 标题说明在左，两个胶囊在右；卡片内无大号“起步观察”。
1280×720 dark: 两个胶囊、判断依据、进度数字和阶段轴均可读，不出现发光或额外卡片边界。
860×900: 页头摘要移动到说明下方并左对齐，解释行改为单列。
600×900: 页面无横向溢出，阶段轴在自身容器内滚动。
520×900: 两个胶囊自然换行，卡片标签、数值和剩余样本文案不裁切。
```

同时确认 DOM 中只有两个 `.stats-diagnostic-summary-chip`，且页面可见文本不包含“最大偏差”。

- [ ] **Step 3: Run the full frontend suite**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test
```

Expected: PASS，0 failed。

- [ ] **Step 4: Run the production build**

Run:

```powershell
..\.tools\node\npm.cmd run build -- --logLevel error
```

Expected: Vite exit code 0。

- [ ] **Step 5: Write the implementation archive**

创建 `docs/archive/2026-07-15-statistics-diagnosis-summary-implementation.md`，标题使用 `Statistics Diagnosis Summary Implementation`，并完整记录以下事实：

- `Result`：页头仅保留可信度状态与阶段两个摘要胶囊；样本可信度卡改为判断依据、阶段进度与阶段轴；明确本轮未实施最大偏差页头摘要、零样本初始化或跨页面组件抽取。
- `Verification`：逐条抄录定向测试与完整前端测试的真实通过/失败数量、生产构建的真实退出结果，以及浅色、深色、860px、600px、520px 五种视觉验收结果。
- 归档只能写执行时观察到的具体结果；不得写待补充结果、示例数字或未经运行的通过声明。

- [ ] **Step 6: Run repository hygiene checks**

Run:

```powershell
cd ..
git diff --check
git status --short
```

Expected: `git diff --check` exit code 0；`git status --short` 只包含已知的本轮文件或执行前已经存在的改动。

- [ ] **Step 7: Commit documentation**

```powershell
git add -- DESIGN.md docs/archive/2026-07-15-statistics-diagnosis-summary-implementation.md docs/superpowers/plans/2026-07-15-statistics-diagnosis-summary-layout.md
git commit -m "docs: record statistics diagnosis summary"
```

## Self-review

- Spec coverage：双胶囊页头、无第三项、结论去重、卡片解释行、深浅主题、860/600/520px、可访问名称和零样本范围均有对应任务。
- Placeholder scan：计划代码步骤和归档要求均不含可被误写入产物的结果占位文本。
- Type consistency：所有模板引用均复用当前 `computed` 名称，没有新增 props、事件或数据类型。
