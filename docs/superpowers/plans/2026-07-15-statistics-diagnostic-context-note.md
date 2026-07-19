# Statistics Diagnostic Context Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the sample-size caveat from the reliability cell to a concise diagnostic-level subtitle, include the real sample count, and remove duplicated no-deviation placeholders.

**Architecture:** Keep reliability thresholds and deviation calculations in `presentation.js`. Make `statsReliabilityNote(total)` return the complete user-facing sentence, render that sentence once in the diagnostic title stack, and keep the three-cell strip focused on values. Preserve existing events, stage chips, colors, responsive structure, and accessibility metadata.

**Tech Stack:** Vue 3 Composition API, feature-scoped CSS, Node.js built-in test runner, Vite.

---

## File map

- Modify `WuwaFrontend/src/features/statistics/presentation.test.js`: lock the sample-count-aware copy for every reliability threshold.
- Modify `WuwaFrontend/src/features/statistics/presentation.js`: make `statsReliabilityNote(total)` return the complete diagnostic-level sentence.
- Modify `WuwaFrontend/src/features/statistics/StatisticsView.test.js`: lock the title-level placement, removal of the cell note, no-data wording, and CSS hierarchy.
- Modify `WuwaFrontend/src/features/statistics/StatisticsView.vue`: move the note into the title stack and remove duplicate “暂无” output.
- Modify `WuwaFrontend/src/styles/features/statistics.css`: style the new subtitle and replace the obsolete note selector in light and dark themes.
- Modify `DESIGN.md`: add the durable statistics-diagnostic copy and hierarchy rule.
- Reference `docs/superpowers/specs/2026-07-15-statistics-diagnostic-context-note-design.md`: approved design source; edit only if implementation exposes a real contradiction.
- Create `docs/archive/2026-07-15-statistics-diagnostic-context-note-implementation.md`: record the actual result and verification evidence.

### Task 1: Make the reliability explanation complete and sample-count-aware

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/presentation.test.js`
- Modify: `WuwaFrontend/src/features/statistics/presentation.js`
- Test: `WuwaFrontend/src/features/statistics/presentation.test.js`

- [x] **Step 1: Replace the existing note assertions with failing threshold coverage**

In `statistics presentation maps sample reliability and current stage`, replace the two current note assertions with:

```js
assert.equal(statsReliabilityNote(0), '基于 0 条样本，当前偏差仅作趋势提示。')
assert.equal(statsReliabilityNote(130), '基于 130 条样本，当前偏差仅作趋势提示。')
assert.equal(statsReliabilityNote(500), '基于 500 条样本，偏差可作初步参考。')
assert.equal(statsReliabilityNote(3000), '基于 3000 条样本，偏差可辅助判断，极端值仍需保守看待。')
assert.equal(statsReliabilityNote(10000), '基于 10000 条样本，偏差趋势可作为长期观察依据。')
assert.equal(statsReliabilityNote(50000), '基于 50000 条样本，可进入长期权重优化。')
```

- [x] **Step 2: Run the presentation test and verify RED**

From `WuwaFrontend` run:

```powershell
..\.tools\node\node.exe --test src\features\statistics\presentation.test.js
```

Expected: the reliability-note test fails because the current helper omits the sample count and uses the superseded copy.

- [x] **Step 3: Implement the complete sentence in `statsReliabilityNote`**

Replace the helper with:

```js
export function statsReliabilityNote(total) {
  const sampleTotal = Math.trunc(normalizeSampleTotal(total))
  const prefix = `基于 ${sampleTotal} 条样本，`

  if (sampleTotal >= 50000) {
    return `${prefix}可进入长期权重优化。`
  }
  if (sampleTotal >= 10000) {
    return `${prefix}偏差趋势可作为长期观察依据。`
  }
  if (sampleTotal >= 3000) {
    return `${prefix}偏差可辅助判断，极端值仍需保守看待。`
  }
  if (sampleTotal >= 500) {
    return `${prefix}偏差可作初步参考。`
  }
  return `${prefix}当前偏差仅作趋势提示。`
}
```

Keep `normalizeSampleTotal` as the single normalization path. Function declarations are hoisted, so its current location later in the module remains valid.

- [x] **Step 4: Run the presentation test and verify GREEN**

```powershell
..\.tools\node\node.exe --test src\features\statistics\presentation.test.js
```

Expected: all presentation tests pass.

### Task 2: Move the note to the diagnostic title and simplify no-data values

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.vue`
- Test: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`

- [x] **Step 1: Add failing source-contract tests for placement and empty values**

Add this test:

```js
test('statistics diagnosis keeps context at section level and avoids duplicate empty values', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')

  assert.match(source, /<h2>统计诊断<\/h2>\s*<p v-if="stats" class="stats-diagnostic-context">\{\{ statsReliabilityNote\(totalSamples\) \}\}<\/p>/)
  assert.doesNotMatch(source, /class="stats-diagnostic-note"/)
  assert.match(source, /hottestStatRow\?\.label \|\| '暂无明显偏高'/)
  assert.match(source, /coldestStatRow\?\.label \|\| '暂无明显偏低'/)
  assert.doesNotMatch(source, /v-else>暂无<\/em>/)
})
```

- [x] **Step 2: Run the view test and verify RED**

```powershell
..\.tools\node\node.exe --test src\features\statistics\StatisticsView.test.js
```

Expected: failure because the note is still inside `.stats-diagnostic-primary` and both empty deviation cells render duplicate “暂无” values.

- [x] **Step 3: Render the context directly below the title**

Update the title stack to:

```vue
<div class="stats-diagnostic-title-stack">
  <h2>统计诊断</h2>
  <p v-if="stats" class="stats-diagnostic-context">{{ statsReliabilityNote(totalSamples) }}</p>
  <p v-else>等待样本录入后生成统计图表。</p>
</div>
```

Remove this line from `.stats-diagnostic-primary`:

```vue
<p class="stats-diagnostic-note">{{ statsReliabilityNote(totalSamples) }}</p>
```

- [x] **Step 4: Render one meaningful label for empty deviations**

Use these two articles:

```vue
<article class="stats-diagnostic-deviation hot" :title="deviationTitle(hottestStatRow, '偏高')">
  <span>当前偏高</span>
  <strong>{{ hottestStatRow?.label || '暂无明显偏高' }}</strong>
  <em v-if="hottestStatRow" class="stats-number">{{ formatSignedPercent(hottestStatRow.deviation) }}</em>
</article>
<article class="stats-diagnostic-deviation warn" :title="deviationTitle(coldestStatRow, '偏低')">
  <span>当前偏低</span>
  <strong>{{ coldestStatRow?.label || '暂无明显偏低' }}</strong>
  <em v-if="coldestStatRow" class="stats-number">{{ formatSignedPercent(coldestStatRow.deviation) }}</em>
</article>
```

Do not add an em dash or a second placeholder: the descriptive fallback is sufficient.

- [x] **Step 5: Run the view test and verify GREEN**

```powershell
..\.tools\node\node.exe --test src\features\statistics\StatisticsView.test.js
```

Expected: both StatisticsView source-contract tests pass.

### Task 3: Apply the approved subtitle hierarchy in light and dark themes

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- Modify: `WuwaFrontend/src/styles/features/statistics.css`
- Test: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- Verify: `WuwaFrontend/src/architecture.test.js`

- [x] **Step 1: Add a failing CSS contract test**

Add this helper and test to `StatisticsView.test.js`:

```js
async function readStatisticsStyles() {
  return readFile(new URL('../../styles/features/statistics.css', import.meta.url), 'utf8')
}

test('statistics diagnostic context uses quiet section-level typography', async () => {
  const styles = await readStatisticsStyles()
  const titleRowRule = styles.match(/^\.stats-diagnostic-title-row \{([^}]+)\}/m)?.[1] || ''
  const stackRule = styles.match(/^\.stats-diagnostic-title-stack \{([^}]+)\}/m)?.[1] || ''
  const contextRule = styles.match(/^\.stats-diagnostic-context \{([^}]+)\}/m)?.[1] || ''

  assert.match(titleRowRule, /align-items: flex-start/)
  assert.match(stackRule, /gap: 6px/)
  assert.match(contextRule, /max-width: 440px/)
  assert.match(contextRule, /margin: 0/)
  assert.match(contextRule, /color: #6f8293/)
  assert.match(contextRule, /font-size: var\(--text-label\)/)
  assert.match(contextRule, /font-weight: var\(--weight-supporting\)/)
  assert.match(contextRule, /line-height: var\(--leading-body\)/)
  assert.doesNotMatch(contextRule, /border|background/)
  assert.match(styles, /\.app-shell\.theme-dark \.stats-diagnostic-head p,\s*\.app-shell\.theme-dark \.stats-diagnostic-context,\s*\.app-shell\.theme-dark \.stats-section-heading > span\s*\{[^}]*color: var\(--charcoal\)/m)
  assert.doesNotMatch(styles, /\.stats-diagnostic-note/)
})
```

- [x] **Step 2: Run the view test and verify RED**

```powershell
..\.tools\node\node.exe --test src\features\statistics\StatisticsView.test.js
```

Expected: the new CSS contract fails because `.stats-diagnostic-context` does not yet exist.

- [x] **Step 3: Replace the obsolete note styling**

Change `.stats-diagnostic-title-row` to `align-items: flex-start`, change the title-stack gap to 6px, and replace `.stats-diagnostic-note` with:

```css
.stats-diagnostic-context {
  max-width: 440px;
  margin: 0;
  color: #6f8293;
  font-size: var(--text-label);
  font-weight: var(--weight-supporting);
  line-height: var(--leading-body);
}
```

Remove the obsolete `.stats-diagnostic-note` rule entirely. Do not add a border, background, icon, pill, or extra container.

- [x] **Step 4: Update the dark-theme selector**

Replace `.stats-diagnostic-note` in the existing dark-theme grouped selector with `.stats-diagnostic-context`:

```css
.app-shell.theme-dark .stats-diagnostic-head p,
.app-shell.theme-dark .stats-diagnostic-context,
.app-shell.theme-dark .stats-section-heading > span {
  color: var(--charcoal);
}
```

Keep this as the existing grouped secondary-text rule; do not add a duplicate standalone dark-theme declaration or change the resolved color.

- [x] **Step 5: Run focused and architecture tests**

```powershell
..\.tools\node\node.exe --test src\features\statistics\presentation.test.js src\features\statistics\StatisticsView.test.js src\architecture.test.js
```

Expected: all focused and architecture tests pass. Do not raise any architecture limit.

### Task 4: Record the durable statistics-diagnostic rule

**Files:**
- Modify: `DESIGN.md`
- Reference: `docs/superpowers/specs/2026-07-15-statistics-diagnostic-context-note-design.md`

- [x] **Step 1: Add a statistics diagnosis subsection to `DESIGN.md`**

Add `### Statistics diagnosis` after `### Prediction and evaluation graphics` with this rule:

```markdown
### Statistics diagnosis

- 样本量说明约束整个统计诊断区域，必须放在“统计诊断”标题下作为区域级辅助说明，不放进单个可信度或偏差单元。说明使用实际样本数、Label（13px / 500）和中性次级文字色，不添加图标、边框、底色或胶囊；诊断单元只保留标签与数据。无偏高或偏低项时只显示一次“暂无明显偏高 / 暂无明显偏低”，不重复渲染百分比占位。
```

- [x] **Step 2: Check specification consistency**

Confirm the implementation plan preserves the approved placement, five threshold messages, 440px subtitle width, light/dark secondary colors, responsive stacking, single empty-state label, stage colors, algorithms, and accessibility metadata. Do not modify the spec to excuse an implementation gap.

### Task 5: Full verification and implementation archive

**Files:**
- Create: `docs/archive/2026-07-15-statistics-diagnostic-context-note-implementation.md`

- [x] **Step 1: Run focused tests**

```powershell
..\.tools\node\node.exe --test src\features\statistics\presentation.test.js src\features\statistics\StatisticsView.test.js src\architecture.test.js
```

Expected: exit code 0 with no failed tests.

- [x] **Step 2: Run the complete frontend test suite**

```powershell
$output = & '..\.tools\node\node.exe' --test --test-reporter=tap 2>&1
$exitCode = $LASTEXITCODE
$output | Select-String '^1\.\.|^# tests |^# suites |^# pass |^# fail |^# cancelled |^# skipped |^# todo |^# duration_ms '
exit $exitCode
```

Expected: exit code 0 and zero failed tests.

- [x] **Step 3: Run the production build**

```powershell
..\.tools\node\npm.cmd run build -- --logLevel error
```

Expected: Vite exits with code 0.

- [x] **Step 4: Run repository hygiene checks**

From the repository root:

```powershell
git diff --check
git status --short --branch
```

Inspect only the scoped statistics diff and preserve unrelated existing modifications.

- [x] **Step 5: Perform visual QA when the local page is reachable**

Verify these states in both light and dark themes:

- `< 500` samples: title subtitle shows the real count and “当前偏差仅作趋势提示”。
- `≥ 500` samples: subtitle updates without moving back into the first diagnostic cell.
- No positive deviation: one “暂无明显偏高” label and no percentage placeholder.
- No negative deviation: one “暂无明显偏低” label and no percentage placeholder.
- 860px and narrower: title, subtitle, and stage tags stack without clipping.

If the local page remains unavailable, record the exact limitation and do not claim screenshot verification.

- [x] **Step 6: Write the implementation archive**

Record the actual files changed, red-green evidence, final test totals, build result, architecture status, visual-QA status, and the fact that no commit was created unless the user separately requested one.

No commit, stage, push, pull request, or unrelated statistics redesign is part of this plan unless the user requests it separately.
