# Zero-Sample Minimal Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected action-first zero-sample flows with the approved minimal entry on Statistics and Evaluation.

**Architecture:** Preserve `sampleExperience.js`, request states, page summary semantics, and ready-data modules. Each feature owns its approved copy, while `sample-readiness.css` owns the shared centered empty-entry layout; feature CSS only adds the zero-state page surface without changing populated layouts.

**Tech Stack:** Vue 3 SFCs, existing Tethys CSS tokens, Node test runner, Vite.

**Working-tree note:** The branch already contains uncommitted same-scope A-version work. Do not reset, checkout, stage, or commit automatically; modify only the files listed below and preserve unrelated changes.

---

### Task 1: Lock the approved minimal contracts

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationView.test.js`
- Modify: `WuwaFrontend/src/architecture.test.js`

- [ ] **Step 1: Replace the Statistics A-version assertions**

Require the approved value sentence, immediate-start description and CTA, then reject the discarded scaffolding:

```js
assert.match(source, /这里将显示你的个人副词条分布/)
assert.match(source, /录入第一条副词条即可开始。/)
assert.match(source, /class="button-primary sample-activation-action"/)
assert.doesNotMatch(source, /下一步|statistics-empty-milestones|规则基线|500 条后/)
```

- [ ] **Step 2: Replace the Evaluation A-version assertions**

Require the approved copy and reject the discarded two-step component content:

```js
assert.match(readinessSource, /积累历史后自动开启模型评估/)
assert.match(readinessSource, /先建立 20 条上下文，再积累 20 条有效回测。/)
assert.match(readinessSource, /class="button-primary sample-activation-action"/)
assert.doesNotMatch(readinessSource, /评估准备|evaluation-readiness-steps|规则基线|进行中|等待中/)
```

- [ ] **Step 3: Lock the shared visual contract**

Require a centered near-white empty surface, Tethys blue CTA, neutral zero-state chip, and no feature-owned milestone/step styles.

- [ ] **Step 4: Run the targeted tests and verify RED**

Run:

```powershell
..\.tools\node\node.exe --test src\features\statistics\StatisticsView.test.js src\features\evaluation\EvaluationView.test.js src\architecture.test.js
```

Expected: failures reference the old A-version copy and discarded milestone/step structure.

### Task 2: Simplify the Vue zero states

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.vue`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationView.vue`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationReadinessState.vue`

- [ ] **Step 1: Replace Statistics zero-state content**

```vue
<section v-else-if="!hasSamples" class="sample-activation-state statistics-empty-state" aria-label="统计诊断数据准备">
  <div class="sample-activation-copy">
    <h3>这里将显示你的个人副词条分布</h3>
    <p>录入第一条副词条即可开始。</p>
  </div>
  <button class="button-primary sample-activation-action" type="button" @click="emit('start-recording')">去工作台录入</button>
</section>
```

- [ ] **Step 2: Replace Evaluation readiness content**

```vue
<section class="sample-activation-state evaluation-readiness-state" aria-label="模型评估数据准备">
  <div class="sample-activation-copy">
    <h3>积累历史后自动开启模型评估</h3>
    <p>先建立 20 条上下文，再积累 20 条有效回测。</p>
  </div>
  <button class="button-primary sample-activation-action" type="button" @click="emit('start-recording')">去工作台录入</button>
</section>
```

- [ ] **Step 3: Add conditional zero-state page classes**

Add `stats-analytics-panel--empty` only when statistics has loaded with zero samples, and `evaluation-panel--empty` only when evaluation exists but is not ready. Populated, loading and error layouts keep their current owners.

- [ ] **Step 4: Run the targeted tests**

Expected: copy and structure assertions pass; visual assertions may remain red until Task 3.

### Task 3: Match the approved color and layout

**Files:**
- Modify: `WuwaFrontend/src/styles/sample-readiness.css`
- Modify: `WuwaFrontend/src/styles/features/statistics.css`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css`
- Modify: `WuwaFrontend/src/styles/features/evaluation-layout.css`

- [ ] **Step 1: Center the shared minimal entry**

Use one-column centered layout with `min-height: 360px`, balanced copy, `var(--text-section-title)` heading, `var(--text-body)` explanation, and no kicker/support styles.

- [ ] **Step 2: Keep one blue action**

Use `var(--primary)` and `var(--primary-deep)` for the CTA, preserving the existing focus-visible outline and 44px minimum target.

- [ ] **Step 3: Add zero-only page surfaces**

Use `#fbfcfe`, `1px solid rgba(216, 226, 234, 0.9)`, 16px radius and zero shadow only on the two conditional empty-page classes. Remove Statistics milestone and Evaluation step CSS.

- [ ] **Step 4: Add responsive and dark equivalence**

At 520px reduce empty-state padding and make the CTA full width. Map the empty surface to existing dark tokens without adding gradients or semantic colors.

- [ ] **Step 5: Run targeted tests and verify GREEN**

Run the targeted Node command from Task 1. Expected: all pass with zero failures.

### Task 4: Verify and document the implementation

**Files:**
- Create: `docs/archive/2026-07-16-zero-sample-minimal-entry-implementation.md`

- [ ] **Step 1: Run the complete frontend tests**

```powershell
..\.tools\node\npm.cmd test
```

Expected: zero failures.

- [ ] **Step 2: Run the production build**

```powershell
..\.tools\node\npm.cmd run build
```

Expected: Vite exits 0.

- [ ] **Step 3: Verify in the browser**

Check Statistics and Evaluation at desktop and narrow widths. Confirm one CTA, no discarded copy, no horizontal overflow, visible focus, and zero console errors.

- [ ] **Step 4: Write the implementation record and check hygiene**

Record actual files, test/build/browser evidence and unchanged boundaries. Run `git diff --check` and `git status --short`; do not stage unrelated files.
