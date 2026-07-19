# Zero-Sample Action-First UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared dashboard-like zero-sample card with the approved action-first layouts for Statistics and Evaluation.

**Architecture:** Keep sample maturity and backend readiness semantics in `shared/sampleExperience.js`, but let each feature own its zero-sample information architecture. Statistics will present the immediate one-record value and a two-milestone path; Evaluation will present context-building and effective-backtest as separate stages. Shared CSS will own only the common activation layout and request state, while feature CSS owns milestone and step visuals.

**Tech Stack:** Vue 3 SFCs, existing Tethys CSS tokens, Node test runner, Vite.

---

### Task 1: Lock the action-first contracts with failing source tests

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationView.test.js`
- Modify: `WuwaFrontend/src/architecture.test.js`
- Delete after replacement coverage exists: `WuwaFrontend/src/components/states/SampleReadinessPanel.test.js`

- [ ] **Step 1: Replace the statistics zero-state assertions**

Require a page-native `statistics-empty-state`, the first-record copy, a blue action CTA, exactly two milestone labels, and only one `SampleStageAxis` occurrence in the ready branch:

```js
assert.match(source, /class="sample-activation-state statistics-empty-state"/)
assert.match(source, /录入第 1 条，开始查看个人分布/)
assert.match(source, /第一条副词条录入后即可看到实际分布/)
assert.match(source, /class="button-primary sample-activation-action"/)
assert.match(source, /<strong>1 条<\/strong>/)
assert.match(source, /<strong>500 条<\/strong>/)
assert.equal((source.match(/<SampleStageAxis/g) || []).length, 1)
assert.doesNotMatch(source, /<SampleReadinessPanel/)
```

- [ ] **Step 2: Replace the evaluation readiness assertions**

Require a page-native two-stage ordered list, context progress from `evaluation.sample_size`, effective-backtest progress from `evaluated_count`, and no shared readiness card:

```js
assert.match(source, /const contextSampleCount = computed/)
assert.match(source, /props\.evaluation\?\.sample_size/)
assert.match(source, /class="sample-activation-state evaluation-readiness-state"/)
assert.match(source, /建立预测上下文/)
assert.match(source, /积累有效回测/)
assert.match(source, /contextSampleCount \}\} \/ 20 条历史/)
assert.match(source, /readiness\.evaluated \}\} \/ \{\{ readiness\.target \}\} 条有效回测/)
assert.doesNotMatch(source, /<SampleReadinessPanel/)
```

- [ ] **Step 3: Update the architecture ownership assertion**

Require shared state logic plus shared activation primitives, but explicitly reject a cross-page layout component:

```js
assert.match(style, /^\.sample-activation-state/m)
assert.match(style, /^\.insight-request-state/m)
assert.match(style, /^\.metric-placeholder/m)
assert.doesNotMatch(statisticsView, /SampleReadinessPanel/)
assert.doesNotMatch(evaluationView, /SampleReadinessPanel/)
```

- [ ] **Step 4: Run the targeted tests and verify RED**

Run:

```powershell
..\.tools\node\node.exe --test src\features\statistics\StatisticsView.test.js src\features\evaluation\EvaluationView.test.js src\architecture.test.js
```

Expected: failures report missing `statistics-empty-state`, `evaluation-readiness-state`, and `.sample-activation-state`.

### Task 2: Implement page-native zero-sample structures

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.vue`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationView.vue`
- Create: `WuwaFrontend/src/features/evaluation/EvaluationReadinessState.vue`
- Delete: `WuwaFrontend/src/components/states/SampleReadinessPanel.vue`

- [ ] **Step 1: Replace the Statistics shared panel**

Use an unframed activation section with one direct action and only the next useful milestones:

```vue
<section v-else-if="!hasSamples" class="sample-activation-state statistics-empty-state" aria-label="统计诊断数据准备">
  <div class="sample-activation-main">
    <div class="sample-activation-copy">
      <span class="sample-activation-kicker">下一步</span>
      <h3>录入第 1 条，开始查看个人分布</h3>
      <p>无需等待 500 条。第一条副词条录入后即可看到实际分布，样本达到 500 条后再进入总体偏差判断。</p>
    </div>
    <button class="button-primary sample-activation-action" type="button" @click="emit('start-recording')">去工作台录入</button>
  </div>
  <div class="statistics-empty-milestones" aria-label="统计诊断成长路径">
    <div class="statistics-empty-milestone is-current"><i aria-hidden="true"></i><span><strong>1 条</strong><small>查看个人分布</small></span></div>
    <b aria-hidden="true"></b>
    <div class="statistics-empty-milestone"><i aria-hidden="true"></i><span><strong>500 条</strong><small>总体偏差判断</small></span></div>
  </div>
  <small class="sample-activation-support">当前预测仍由规则基线提供。</small>
</section>
```

- [ ] **Step 2: Make zero-sample summary chips concise**

Keep the neutral maturity chip at zero, but render stage and top-three metric chips only when `maturity.hasSamples` is true.

- [ ] **Step 3: Replace Evaluation shared panel with a feature-owned two-stage component**

Add:

```js
const contextSampleCount = computed(() => Math.min(sampleTotal(props.evaluation?.sample_size), 20))
const contextReady = computed(() => contextSampleCount.value >= 20)
```

Render the ordered two-stage readiness list in `EvaluationReadinessState.vue` and keep `EvaluationView.vue` as the thin page orchestrator. Stage 1 is current until 20 historical samples exist; stage 2 becomes current afterward and shows `readiness.evaluated / readiness.target`.

- [ ] **Step 4: Remove the unused shared component**

Delete `SampleReadinessPanel.vue` after both imports and usages are gone. Keep `sampleExperience.js` unchanged because it remains the sole owner of cross-page maturity and backend readiness semantics.

- [ ] **Step 5: Run the targeted view tests and verify GREEN for structure**

Run the same targeted Node command. Expected: view contract tests pass; style contract may remain red until Task 3.

### Task 3: Apply the approved restrained visual language

**Files:**
- Modify: `WuwaFrontend/src/styles/sample-readiness.css`
- Modify: `WuwaFrontend/src/styles/features/statistics.css`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css`

- [ ] **Step 1: Replace the shared three-column card CSS**

Define `.sample-activation-state`, `.sample-activation-main`, `.sample-activation-copy`, `.sample-activation-kicker`, `.sample-activation-action`, and `.sample-activation-support`. The state is transparent and left-aligned, constrained to `860px`, and has no card border, shadow, or nested surface.

- [ ] **Step 2: Give the CTA the existing Tethys blue semantic**

Use `var(--primary)` and `var(--primary-deep)` only on `.sample-activation-action`; do not change global button appearance.

- [ ] **Step 3: Add the Statistics two-milestone path**

Use a blue current node, neutral future node, one thin neutral connector, and no green or gradient at zero samples.

- [ ] **Step 4: Add the Evaluation two-stage list**

Use an ordered list with a blue current index, neutral future index, concise status labels, and thin separators. Do not add nested cards.

- [ ] **Step 5: Add responsive and dark-theme equivalence**

At `860px`, stack copy and CTA. At `520px`, make the CTA full width and stack milestone/step secondary content without horizontal overflow. Dark mode must reuse semantic tokens and retain the same hierarchy.

- [ ] **Step 6: Run targeted tests and verify GREEN**

Run:

```powershell
..\.tools\node\node.exe --test src\features\statistics\StatisticsView.test.js src\features\evaluation\EvaluationView.test.js src\architecture.test.js
```

Expected: all targeted tests pass with zero failures.

### Task 4: Verify the first implementation pass

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Run the complete frontend test suite**

Run:

```powershell
..\.tools\node\npm.cmd test
```

Expected: all Node tests pass with zero failures.

- [ ] **Step 2: Run the production build**

Run:

```powershell
..\.tools\node\npm.cmd run build
```

Expected: Vite exits with code 0 and writes the production bundle.

- [ ] **Step 3: Check repository hygiene**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; status lists only the approved plan, Vue, CSS, and test changes.

- [ ] **Step 4: Hand off the visual pass for user review**

Report the implemented structure, test/build evidence, and the exact files changed. Do not commit until the user approves the visual direction.
