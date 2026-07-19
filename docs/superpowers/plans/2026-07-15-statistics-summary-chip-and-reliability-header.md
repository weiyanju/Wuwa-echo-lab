# Statistics Summary Chip And Reliability Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以模型评估当前的视觉密度为基准，统一统计诊断与模型评估的页头摘要胶囊，并将“样本可信度”卡压缩为标题、阶段驱动标签、两行阶段数字和阶段轴组成的紧凑结构。

**Architecture:** 新增共享的 `page-summary` CSS owner，让统计页和评估页只保留各自页面布局，不再分别维护同语义胶囊。`StatisticsView.vue` 继续拥有样本阶段数据与文案，但移除独立的双列概览区，将判断依据和当前/目标样本信息合并进卡片标题栏；API、状态管理和阶段算法保持不变。

**Tech Stack:** Vue 3 `<script setup>`、CSS、Node.js `node:test`、Vite。

**Status:** Complete — implementation and verification finished on 2026-07-15.

---

## Scope And Constraints

- 只处理已有样本时的页头摘要与“样本可信度”卡布局，不实现零样本初始化方案。
- 页头摘要胶囊以模型评估当前的 13px 标签密度、轻渐变表面和移动端 30px 高度为基准。
- 统计诊断仍只显示“可信度状态”和“样本阶段”两个页头摘要，不增加最大偏差。
- “样本可信度”卡移除可见的“阶段进度”和“当前阶段的主要解释来源”，保留完整无障碍描述。
- 不新增嵌套卡片、阴影、第三种强调色或新的 API。
- 当前工作树包含同一统计页前序未提交改动；执行时原地保留这些改动，不自动创建 worktree 或提交。

## File Map

- Create: `WuwaFrontend/src/styles/page-summary.css`，跨统计页与评估页共享的摘要胶囊视觉和响应式契约。
- Create: `WuwaFrontend/src/page-summary.test.js`，验证共享样式 owner、两页结构、数值包装和旧选择器清理。
- Modify: `WuwaFrontend/src/style.css`，导入共享摘要样式。
- Modify: `WuwaFrontend/src/architecture.test.js`，登记共享样式 owner。
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.vue`，使用共享摘要标记并实施紧凑可信度标题栏。
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`，锁定方案 A 的信息层级和删除项。
- Modify: `WuwaFrontend/src/styles/features/statistics.css`，删除重复摘要样式并实现紧凑可信度标题栏。
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationView.vue`，使用共享摘要结构、数值 wrapper 和 `group` 语义。
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationView.test.js`，锁定评估摘要语义。
- Modify: `WuwaFrontend/src/styles/features/evaluation.css`，删除重复摘要视觉，仅保留评估页面布局。
- Modify: `WuwaFrontend/src/App.test.js`，将旧 feature selector 断言迁移到共享摘要契约。
- Modify: `DESIGN.md`，记录跨页面摘要和可信度卡的长期规则。
- Create: `docs/archive/2026-07-15-statistics-summary-chip-and-reliability-header-implementation.md`，记录实际执行与验证结果。

### Task 1: Lock The Shared Page Summary Contract With Failing Tests

**Files:**
- Create: `WuwaFrontend/src/page-summary.test.js`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationView.test.js`
- Modify: `WuwaFrontend/src/architecture.test.js`

- [x] **Step 1: Write the shared contract test**

Create a test that reads `style.css`, `page-summary.css`, both views and both feature styles. It must require:

```js
assert.match(entry, /@import '\.\/styles\/page-summary\.css';/)
assert.match(shared, /^\.page-summary-chips \{/m)
assert.match(shared, /^\.page-summary-chip \{/m)
assert.match(shared, /^\.page-summary-chip__value \{/m)
assert.match(shared, /^\.page-summary-chip--state \{/m)
assert.match(shared, /@media \(max-width: 520px\)[\s\S]*\.page-summary-chip/)
assert.match(shared, /\.app-shell\.theme-dark \.page-summary-chip/)
assert.doesNotMatch(statisticsStyles, /\.stats-diagnostic-summary-chip/)
assert.doesNotMatch(evaluationStyles, /\.evaluation-status-chip/)
```

For both views, require `page-summary-chips`, `role="group"`, the correct accessible name, `page-summary-chip`, and value wrappers. For the statistics view require exactly two chips; for the evaluation view require exactly three.

- [x] **Step 2: Add the evaluation semantic assertions**

Append a focused test to `EvaluationView.test.js`:

```js
test('evaluation header exposes the shared accessible summary group', async () => {
  const source = await readFile(new URL('./EvaluationView.vue', import.meta.url), 'utf8')

  assert.match(source, /class="page-summary-chips" role="group" aria-label="评估摘要"/)
  assert.equal((source.match(/class="page-summary-chip(?: page-summary-chip--state)?"/g) || []).length, 3)
  assert.equal((source.match(/class="page-summary-chip__value"/g) || []).length, 2)
})
```

- [x] **Step 3: Register the new shared stylesheet in the architecture test**

Read `page-summary.css` in the shared-style architecture test, assert the import exists in `style.css`, and assert the shared file owns `.page-summary-chip`.

- [x] **Step 4: Run the tests and verify RED**

Run:

```powershell
node --test --test-isolation=none src/page-summary.test.js src/features/evaluation/EvaluationView.test.js src/architecture.test.js
```

Expected: FAIL because `page-summary.css` and the shared markup do not exist yet.

### Task 2: Implement The Shared Summary Owner And Migrate Both Pages

**Files:**
- Create: `WuwaFrontend/src/styles/page-summary.css`
- Modify: `WuwaFrontend/src/style.css`
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.vue`
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationView.vue`
- Modify: `WuwaFrontend/src/styles/features/statistics.css`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css`
- Modify: `WuwaFrontend/src/App.test.js`

- [x] **Step 1: Add the shared stylesheet import**

Import `page-summary.css` after `shell.css` and before feature styles:

```css
@import './styles/shell.css';
@import './styles/page-summary.css';
@import './styles/features/recognition.css';
```

- [x] **Step 2: Create the shared visual contract**

`page-summary.css` must define:

```css
.page-summary-chips {
  display: flex;
  flex: 0 1 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.page-summary-chip {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(216, 226, 234, 0.82);
  border-radius: 999px;
  padding: 6px 10px;
  color: #243747;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(248, 251, 253, 0.92)),
    #ffffff;
  font-size: var(--text-label);
  font-weight: var(--weight-label);
  line-height: var(--leading-label);
  white-space: nowrap;
}
```

Use `#5f7183` for `small`, keep the value at 13px/600 with `var(--font-data)` and `tabular-nums`, reuse the evaluation green gradient for the state modifier, and include the existing dot treatment. Add shared 860px left alignment, 520px 30px/`5px 9px` compact sizing, and the evaluation dark-theme surfaces.

- [x] **Step 3: Migrate the statistics summary markup**

Use:

```vue
<div v-if="stats" class="page-summary-chips" role="group" aria-label="统计摘要">
  <span class="page-summary-chip page-summary-chip--state">...</span>
  <span class="page-summary-chip">
    <small>阶段</small>
    <span class="page-summary-chip__value">{{ sampleStageRangeText }} 条</span>
  </span>
</div>
```

- [x] **Step 4: Migrate the evaluation summary markup**

Use the same group and chip classes, add `role="group"`, and wrap both the stage and top-three values in `.page-summary-chip__value`.

- [x] **Step 5: Remove duplicated feature CSS and update legacy assertions**

Delete the old `.stats-diagnostic-summary*` and `.evaluation-status-chip*` visual rules, their mobile overrides and their dark-theme branches. Update `StatisticsView.test.js` and `App.test.js` to assert the shared owner instead of the removed selectors; keep the old reliability-overview assertions until Task 3 starts its separate RED/GREEN cycle.

- [x] **Step 6: Run the shared contract tests and verify GREEN**

Run:

```powershell
node --test --test-isolation=none src/page-summary.test.js src/features/evaluation/EvaluationView.test.js src/features/statistics/StatisticsView.test.js src/architecture.test.js src/App.test.js
```

Expected: PASS with zero failures.

### Task 3: Implement The Compact Reliability Header With TDD

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.vue`
- Modify: `WuwaFrontend/src/styles/features/statistics.css`

- [x] **Step 1: Rewrite the reliability layout test for方案 A**

Require:

```js
assert.match(reliabilitySection, /class="stats-task-header sample-reliability-header"/)
assert.match(reliabilitySection, /class="sample-reliability-title"/)
assert.match(reliabilitySection, /class="sample-reliability-basis-tag"/)
assert.doesNotMatch(reliabilitySection, />判断依据<\/small>/)
assert.match(reliabilitySection, /class="sample-stage-summary"/)
assert.match(reliabilitySection, /sampleStageStatus\.total/)
assert.match(reliabilitySection, /sampleStageTargetLabel/)
assert.match(reliabilitySection, /sampleStageSummaryText/)
assert.doesNotMatch(reliabilitySection, /sample-reliability-overview|阶段进度|当前阶段的主要解释来源/)
```

Add CSS assertions for a 28px basis tag, a top-aligned header, a divider on the header, right-aligned desktop summary and left-aligned 860px stacked summary.

- [x] **Step 2: Run the focused statistics test and verify RED**

Run:

```powershell
node --test --test-isolation=none src/features/statistics/StatisticsView.test.js
```

Expected: FAIL because the old overview block and redundant labels still exist.

- [x] **Step 3: Add the compact display text**

Create `sampleStageSummaryText` without changing the underlying stage calculation:

```js
const sampleStageSummaryText = computed(() => (
  sampleStageStatus.value.nextStage
    ? `${sampleStagePercentText.value} · 距「${sampleStageStatus.value.nextStage.caption}」${sampleStageStatus.value.remainingToNext} 条`
    : `已达 ${sampleStageStatus.value.currentStage.threshold} 条`
))
```

Keep `sampleStageAriaLabel` verbose, including “阶段进度” and “还差”, so removing the visual label does not reduce screen-reader context.

- [x] **Step 4: Replace the overview with the方案 A header**

Use this structure:

```vue
<header class="stats-task-header sample-reliability-header">
  <div class="sample-reliability-title">
    <h3>样本可信度</h3>
    <span class="sample-reliability-basis-tag" :title="`当前判断依据：${sampleStageDriverText}`">
      <strong>{{ sampleStageDriverText }}</strong>
    </span>
  </div>
  <div class="sample-stage-summary" :title="sampleStageAriaLabel">
    <p class="sample-stage-count-value">...</p>
    <small>{{ sampleStageSummaryText }}</small>
  </div>
</header>
```

The phase axis follows immediately after this header.

- [x] **Step 5: Replace the old overview CSS**

Delete `.sample-reliability-overview`, `.sample-reliability-basis`, `.sample-reliability-label` and `.sample-stage-count`. Add:

```css
.sample-reliability-header {
  align-items: flex-start;
  margin-bottom: 18px;
  border-bottom: 1px solid rgba(216, 226, 234, 0.72);
  padding-bottom: 18px;
}

.sample-reliability-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.sample-reliability-basis-tag {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(44, 159, 112, 0.2);
  border-radius: 999px;
  padding: 5px 9px;
  background: rgba(44, 159, 112, 0.07);
}

.sample-stage-summary {
  display: grid;
  justify-items: end;
  gap: 4px;
  margin-left: auto;
}
```

Keep the existing number hierarchy, make the compact tag quieter than the page-level 32px chips, add the dark-theme tag treatment, and stack/left-align the summary at 860px.

- [x] **Step 6: Run the focused statistics test and verify GREEN**

Run:

```powershell
node --test --test-isolation=none src/features/statistics/StatisticsView.test.js
```

Expected: PASS with zero failures.

### Task 4: Documentation, Regression Verification And Visual QA

**Files:**
- Modify: `DESIGN.md`
- Create: `docs/archive/2026-07-15-statistics-summary-chip-and-reliability-header-implementation.md`
- Modify: `docs/superpowers/plans/2026-07-15-statistics-summary-chip-and-reliability-header.md`

- [x] **Step 1: Update the long-term design rules**

Record that page-header summary groups share one visual owner based on the model-evaluation density; labels use 11px accessible color, values use 13px/600 with tabular numbers, and the groups share responsive and dark-theme behavior. Record that the reliability card places the judgment-source tag and two-line stage summary in its header and does not show the redundant labels.

- [x] **Step 2: Run the complete frontend test suite**

Run:

```powershell
npm test
```

Result: 276 tests passed with zero failures. The full suite keeps Node's default file isolation because forcing `--test-isolation=none` shares module caches across unrelated test files.

- [x] **Step 3: Run the production build**

Run:

```powershell
npm run build
```

Expected: Vite exits 0 and writes the production bundle without errors.

- [x] **Step 4: Run repository hygiene checks**

Run:

```powershell
git diff --check
git status --short
```

Expected: `git diff --check` exits 0; status contains only intentional task and prior in-scope changes.

- [x] **Step 5: Visually verify the local page**

At 1280×720 light and dark, verify:

- Statistics and evaluation header chips have the same 32px geometry, gradient surfaces, label color and 13px value density.
- The statistics header contains two chips and the evaluation header contains three.
- “样本可信度” shows the basis tag beside the title, two stage lines at upper right, no visible “阶段进度”, and no visible “当前阶段的主要解释来源”.
- The phase axis remains readable and begins directly below the compact header.

At 860×900 and 520×900 light, verify:

- Summary groups left-align and wrap without horizontal page overflow.
- Reliability title, basis tag and stage summary stack without clipping; the stage axis keeps its existing internal scrolling behavior.

- [x] **Step 6: Write the archive record and mark this plan complete**

Record only the commands and visual observations actually obtained. Check every completed step in this plan; do not add unverified claims.

## Plan Self-Review

- Spec coverage: both approved changes have dedicated RED/GREEN tasks, shared ownership, responsive behavior, dark mode, accessibility, docs and visual verification.
- Placeholder scan: every step contains concrete files, code shape, commands and expected results.
- Type and naming consistency: shared classes use `page-summary-*`; the compact reliability classes use `sample-reliability-*` and `sample-stage-summary`; all names match across test, markup and CSS steps.
- Scope check: API, data model, zero-sample initialization, workbench and evaluation body modules remain out of scope.
