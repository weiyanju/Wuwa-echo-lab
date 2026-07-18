# Sample Stage Weight Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the “规则基线主导” pill with a neutral disclosure-chevron control that opens an anchored, compact matrix containing all five sample stages, their sample ranges, focus areas, and exact default model weights.

**Architecture:** Keep stage thresholds and weight schedules in `modelPresentation.js`, derive current-stage state through the existing statistics presentation layer, and render the explanation in a focused `SampleStageWeightGuide.vue` component. A pure positioning helper chooses right, left, or below placement from measured rectangles; the popover teleports to `.app-shell` and uses fixed positioning so parent overflow cannot clip it. `StatisticsView.vue` remains the page orchestrator; `statistics.css` owns the matrix, semantic colors, dark theme, and reduced-motion behavior.

**Tech Stack:** Vue 3 Composition API, existing Iconoir SVG assets and `ui-line-icon` mask system, Tethys CSS tokens, semantic HTML tables, Node test runner, Vite.

**Scope:** Frontend only. No Django API, database, predictor schedule, or backend model-weight logic changes.

---

## File Structure

- `WuwaFrontend/src/data/modelPresentation.js` — single frontend owner for stage thresholds, display ranges, focus labels, and exact default weight percentages.
- `WuwaFrontend/src/data/modelPresentation.test.js` — locks the five-stage schedule and verifies every weight row sums to 100%.
- `WuwaFrontend/src/features/statistics/sampleStageGuidePosition.js` — pure viewport-aware right/left/below placement and clamping.
- `WuwaFrontend/src/features/statistics/sampleStageGuidePosition.test.js` — locks collision behavior without browser-dependent geometry.
- `WuwaFrontend/src/features/statistics/SampleStageWeightGuide.vue` — owns disclosure state, outside-click/Escape dismissal, focus return, accessible matrix markup, and shared Iconoir assets.
- `WuwaFrontend/src/features/statistics/SampleStageWeightGuide.test.js` — locks component inputs, semantics, icon source, matrix rendering, teleportation, positioning, and dismissal hooks.
- `WuwaFrontend/src/features/statistics/StatisticsView.vue` — replaces the rejected basis pill with the guide component.
- `WuwaFrontend/src/features/statistics/StatisticsView.test.js` — locks page integration and removal of duplicate current-stage copy.
- `WuwaFrontend/src/App.test.js` — updates repository-wide statistics UI expectations.
- `WuwaFrontend/src/architecture.test.js` — prevents the new component from becoming an oversized page owner.
- `WuwaFrontend/src/styles/features/statistics.css` — owns guide button, popover, matrix, current-stage indicator, responsive behavior, dark theme, and motion.
- `DESIGN.md` — records the reusable disclosure/matrix and color semantics.
- `docs/archive/2026-07-18-sample-stage-weight-guide-implementation.md` — records the actual implementation and verification evidence after completion.

---

### Task 1: Lock the stage and weight data contract

**Files:**
- Create: `WuwaFrontend/src/data/modelPresentation.test.js`
- Modify: `WuwaFrontend/src/data/modelPresentation.js`

- [ ] **Step 1: Write the failing schedule test**

Create `modelPresentation.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { modelOrder, sampleStageAxisDefinitions } from './modelPresentation.js'

test('sample stages expose the approved ranges, focus labels, and model weights', () => {
  assert.deepEqual(
    sampleStageAxisDefinitions.map(({ caption, rangeLabel, focus, weights }) => ({
      caption,
      rangeLabel,
      focus,
      weights,
    })),
    [
      {
        caption: '规则基线',
        rangeLabel: '0–499 条',
        focus: '规则对照',
        weights: { rule: 70, bayes: 10, markov: 10, cycle: 10, context: 0 },
      },
      {
        caption: '总体偏差',
        rangeLabel: '500–2,999 条',
        focus: '整体分布',
        weights: { rule: 48, bayes: 26, markov: 12, cycle: 14, context: 0 },
      },
      {
        caption: '上下文检验',
        rangeLabel: '3,000–9,999 条',
        focus: 'COST、套装、位置',
        weights: { rule: 36, bayes: 30, markov: 12, cycle: 16, context: 6 },
      },
      {
        caption: '顺序依赖',
        rangeLabel: '10,000–49,999 条',
        focus: '前后词条关联',
        weights: { rule: 28, bayes: 34, markov: 10, cycle: 18, context: 10 },
      },
      {
        caption: '权重优化',
        rangeLabel: '50,000+ 条',
        focus: '模型融合配比',
        weights: { rule: 25, bayes: 35, markov: 10, cycle: 20, context: 10 },
      },
    ],
  )

  for (const stage of sampleStageAxisDefinitions) {
    assert.deepEqual(Object.keys(stage.weights), modelOrder)
    assert.equal(Object.values(stage.weights).reduce((sum, value) => sum + value, 0), 100)
  }
})
```

- [ ] **Step 2: Run the test and verify RED**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src\data\modelPresentation.test.js
```

Expected: FAIL because `rangeLabel`, `focus`, and `weights` do not exist.

- [ ] **Step 3: Add the approved presentation data**

Extend the existing `sampleStageAxisDefinitions` entries without changing `label`, `caption`, `threshold`, or `max`:

```js
export const sampleStageAxisDefinitions = [
  {
    label: '0',
    caption: '规则基线',
    threshold: 0,
    max: 500,
    rangeLabel: '0–499 条',
    focus: '规则对照',
    weights: { rule: 70, bayes: 10, markov: 10, cycle: 10, context: 0 },
  },
  {
    label: '500',
    caption: '总体偏差',
    threshold: 500,
    max: 3000,
    rangeLabel: '500–2,999 条',
    focus: '整体分布',
    weights: { rule: 48, bayes: 26, markov: 12, cycle: 14, context: 0 },
  },
  {
    label: '3000',
    caption: '上下文检验',
    threshold: 3000,
    max: 10000,
    rangeLabel: '3,000–9,999 条',
    focus: 'COST、套装、位置',
    weights: { rule: 36, bayes: 30, markov: 12, cycle: 16, context: 6 },
  },
  {
    label: '10000',
    caption: '顺序依赖',
    threshold: 10000,
    max: 50000,
    rangeLabel: '10,000–49,999 条',
    focus: '前后词条关联',
    weights: { rule: 28, bayes: 34, markov: 10, cycle: 18, context: 10 },
  },
  {
    label: '50000+',
    caption: '权重优化',
    threshold: 50000,
    max: Number.POSITIVE_INFINITY,
    rangeLabel: '50,000+ 条',
    focus: '模型融合配比',
    weights: { rule: 25, bayes: 35, markov: 10, cycle: 20, context: 10 },
  },
]
```

Do not create a second stage schedule inside the Vue component.

- [ ] **Step 4: Run data and presentation tests**

```powershell
..\.tools\node\node.exe --test src\data\modelPresentation.test.js src\features\statistics\presentation.test.js
```

Expected: PASS with zero failures; the existing progress mapping remains unchanged.

- [ ] **Step 5: Commit the data contract**

```powershell
git add WuwaFrontend/src/data/modelPresentation.js WuwaFrontend/src/data/modelPresentation.test.js
git commit -m "test: lock sample stage weight schedule"
```

---

### Task 2: Build the accessible stage-weight guide component

**Files:**
- Create: `WuwaFrontend/src/features/statistics/sampleStageGuidePosition.test.js`
- Create: `WuwaFrontend/src/features/statistics/sampleStageGuidePosition.js`
- Create: `WuwaFrontend/src/features/statistics/SampleStageWeightGuide.test.js`
- Create: `WuwaFrontend/src/features/statistics/SampleStageWeightGuide.vue`
- Modify: `WuwaFrontend/src/architecture.test.js`

- [ ] **Step 1: Write the failing collision-position test**

Create `sampleStageGuidePosition.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSampleStageGuidePosition } from './sampleStageGuidePosition.js'

const panelRect = { width: 720, height: 354 }

test('places the guide to the trigger right when the viewport has room', () => {
  assert.deepEqual(
    resolveSampleStageGuidePosition({
      triggerRect: { left: 300, right: 328, top: 100, bottom: 128 },
      panelRect,
      viewportWidth: 1440,
      viewportHeight: 900,
    }),
    { placement: 'right', left: 336, top: 92, maxWidth: 720 },
  )
})

test('flips left before using the narrow-layout fallback', () => {
  assert.deepEqual(
    resolveSampleStageGuidePosition({
      triggerRect: { left: 1150, right: 1178, top: 100, bottom: 128 },
      panelRect,
      viewportWidth: 1200,
      viewportHeight: 900,
    }),
    { placement: 'left', left: 422, top: 92, maxWidth: 720 },
  )
})

test('falls below and clamps to viewport margins when neither side fits', () => {
  assert.deepEqual(
    resolveSampleStageGuidePosition({
      triggerRect: { left: 250, right: 278, top: 60, bottom: 88 },
      panelRect,
      viewportWidth: 760,
      viewportHeight: 640,
    }),
    { placement: 'below', left: 28, top: 96, maxWidth: 736 },
  )
})
```

- [ ] **Step 2: Run the positioning test and verify RED**

```powershell
..\.tools\node\node.exe --test src\features\statistics\sampleStageGuidePosition.test.js
```

Expected: FAIL because the positioning helper does not exist.

- [ ] **Step 3: Implement deterministic viewport-aware placement**

Create `sampleStageGuidePosition.js`:

```js
const VIEWPORT_MARGIN = 12
const ANCHOR_GAP = 8
const TITLE_ALIGNMENT_OFFSET = 8

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum)
}

export function resolveSampleStageGuidePosition({
  triggerRect,
  panelRect,
  viewportWidth,
  viewportHeight,
}) {
  const maxWidth = Math.max(0, viewportWidth - (VIEWPORT_MARGIN * 2))
  const width = Math.min(panelRect.width, maxWidth)
  const height = Math.min(panelRect.height, viewportHeight - (VIEWPORT_MARGIN * 2))
  const rightLeft = triggerRect.right + ANCHOR_GAP
  const leftLeft = triggerRect.left - ANCHOR_GAP - width
  const rightFits = rightLeft + width <= viewportWidth - VIEWPORT_MARGIN
  const leftFits = leftLeft >= VIEWPORT_MARGIN

  let placement = 'below'
  let left = clamp(triggerRect.left, VIEWPORT_MARGIN, viewportWidth - VIEWPORT_MARGIN - width)
  let top = triggerRect.bottom + ANCHOR_GAP

  if (rightFits) {
    placement = 'right'
    left = rightLeft
    top = triggerRect.top - TITLE_ALIGNMENT_OFFSET
  } else if (leftFits) {
    placement = 'left'
    left = leftLeft
    top = triggerRect.top - TITLE_ALIGNMENT_OFFSET
  }

  top = clamp(top, VIEWPORT_MARGIN, viewportHeight - VIEWPORT_MARGIN - height)
  return { placement, left, top, maxWidth }
}
```

- [ ] **Step 4: Run the positioning test and verify GREEN**

```powershell
..\.tools\node\node.exe --test src\features\statistics\sampleStageGuidePosition.test.js
```

Expected: PASS with all three placement branches covered.

- [ ] **Step 5: Write the failing component contract test**

Create `SampleStageWeightGuide.test.js`:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('sample stage weight guide is a non-modal anchored disclosure with a semantic matrix', async () => {
  const source = await readFile(new URL('./SampleStageWeightGuide.vue', import.meta.url), 'utf8')

  assert.match(source, /stages: \{ type: Array, required: true \}/)
  assert.match(source, /total: \{ type: Number, required: true \}/)
  assert.match(source, /import chevronDownIcon from '\.\.\/\.\.\/assets\/icons\/chevron-down\.svg'/)
  assert.match(source, /import xIcon from '\.\.\/\.\.\/assets\/icons\/x\.svg'/)
  assert.match(source, /import \{ resolveSampleStageGuidePosition \} from '\.\/sampleStageGuidePosition\.js'/)
  assert.match(source, /aria-label="查看阶段与模型权重"/)
  assert.match(source, /:aria-expanded="String\(isOpen\)"/)
  assert.match(source, /<Teleport to="\.app-shell">/)
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="false"/)
  assert.match(source, /<table class="sample-stage-weight-table">/)
  assert.match(source, /<th v-for="model in modelColumns"/)
  assert.match(source, /<tr v-for="stage in stages"/)
  assert.match(source, /stage\.weights\[model\.key\]/)
  assert.match(source, /class="sample-stage-current-rail"/)
  assert.match(source, /role="img" aria-label="当前阶段"/)
  assert.match(source, /document\.addEventListener\('pointerdown'/)
  assert.match(source, /document\.addEventListener\('keydown'/)
  assert.match(source, /window\.addEventListener\('resize'/)
  assert.match(source, /document\.addEventListener\('scroll', syncPosition, true\)/)
  assert.match(source, /event\.key !== 'Escape'/)
  assert.match(source, /triggerRef\.value\?\.focus\(\)/)
  assert.match(source, /closeRef\.value\?\.focus\(\)/)
  assert.doesNotMatch(source, /help-circle|circle-help|progress-bar|weight-track/)
})
```

Add this architecture assertion:

```js
assert.ok(
  await lineCount('./features/statistics/SampleStageWeightGuide.vue') <= 220,
  'SampleStageWeightGuide.vue must remain a focused disclosure and matrix component',
)
```

- [ ] **Step 6: Run the component test and verify RED**

```powershell
..\.tools\node\node.exe --test src\features\statistics\SampleStageWeightGuide.test.js src\architecture.test.js
```

Expected: FAIL because the component does not exist.

- [ ] **Step 7: Create the component state, positioning, and lifecycle**

Start `SampleStageWeightGuide.vue` with:

```vue
<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import chevronDownIcon from '../../assets/icons/chevron-down.svg'
import xIcon from '../../assets/icons/x.svg'
import { canonicalModelLabels, modelOrder } from '../../data/modelPresentation.js'
import { resolveSampleStageGuidePosition } from './sampleStageGuidePosition.js'

defineProps({
  stages: { type: Array, required: true },
  total: { type: Number, required: true },
})

const isOpen = ref(false)
const rootRef = ref(null)
const triggerRef = ref(null)
const popoverRef = ref(null)
const closeRef = ref(null)
const popoverStyle = ref({})
const placement = ref('right')
const modelColumns = modelOrder.map((key) => ({ key, label: canonicalModelLabels[key] }))

function iconMask(source) {
  return { '--icon-url': `url("${source}")` }
}

function syncPosition() {
  if (!isOpen.value || !triggerRef.value || !popoverRef.value) return
  const position = resolveSampleStageGuidePosition({
    triggerRect: triggerRef.value.getBoundingClientRect(),
    panelRect: popoverRef.value.getBoundingClientRect(),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  })
  placement.value = position.placement
  popoverStyle.value = {
    left: `${position.left}px`,
    top: `${position.top}px`,
    maxWidth: `${position.maxWidth}px`,
  }
}

async function setOpen(nextOpen, { restoreFocus = false } = {}) {
  isOpen.value = nextOpen
  if (nextOpen) {
    await nextTick()
    syncPosition()
    closeRef.value?.focus()
    return
  }
  if (!nextOpen && restoreFocus) {
    triggerRef.value?.focus()
  }
}

function handleDocumentPointerDown(event) {
  const isOutside = !rootRef.value?.contains(event.target)
    && !popoverRef.value?.contains(event.target)
  if (isOpen.value && isOutside) {
    setOpen(false)
  }
}

function handleDocumentKeydown(event) {
  if (event.key !== 'Escape' || !isOpen.value) return
  setOpen(false, { restoreFocus: true })
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
  window.addEventListener('resize', syncPosition)
  document.addEventListener('scroll', syncPosition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
  window.removeEventListener('resize', syncPosition)
  document.removeEventListener('scroll', syncPosition, true)
})
</script>
```

- [ ] **Step 8: Add the disclosure, teleported popover, and matrix template**

Use the existing shared icon-mask convention and a real table:

```vue
<template>
  <div ref="rootRef" class="sample-stage-guide">
    <button
      ref="triggerRef"
      class="sample-stage-guide-trigger"
      type="button"
      aria-label="查看阶段与模型权重"
      aria-controls="sample-stage-weight-popover"
      :aria-expanded="String(isOpen)"
      @click="setOpen(!isOpen)"
    >
      <span
        class="ui-line-icon sample-stage-guide-chevron"
        :style="iconMask(chevronDownIcon)"
        aria-hidden="true"
      ></span>
    </button>

    <Teleport to=".app-shell">
      <Transition name="sample-stage-guide">
        <section
          v-if="isOpen"
          ref="popoverRef"
          id="sample-stage-weight-popover"
          class="sample-stage-weight-popover"
          :data-placement="placement"
          :style="popoverStyle"
          role="dialog"
          aria-modal="false"
          aria-labelledby="sample-stage-weight-title"
        >
        <header class="sample-stage-weight-header">
          <div>
            <strong id="sample-stage-weight-title">阶段与模型权重</strong>
            <span>当前 <span class="stats-number">{{ total }}</span> 条</span>
          </div>
          <button
            ref="closeRef"
            class="sample-stage-guide-close"
            type="button"
            aria-label="关闭"
            @click="setOpen(false, { restoreFocus: true })"
          >
            <span class="ui-line-icon" :style="iconMask(xIcon)" aria-hidden="true"></span>
          </button>
        </header>

        <div class="sample-stage-weight-scroll">
          <table class="sample-stage-weight-table">
            <colgroup>
              <col class="sample-stage-weight-stage-column">
              <col class="sample-stage-weight-range-column">
              <col v-for="model in modelColumns" :key="`col-${model.key}`" class="sample-stage-weight-model-column">
            </colgroup>
            <thead>
              <tr>
                <th scope="col">阶段</th>
                <th scope="col">样本范围</th>
                <th v-for="model in modelColumns" :key="model.key" scope="col">{{ model.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stage in stages" :key="stage.label" :class="{ current: stage.current }">
                <th scope="row">
                  <span
                    v-if="stage.current"
                    class="sample-stage-current-rail"
                    role="img"
                    aria-label="当前阶段"
                  ></span>
                  <strong>{{ stage.caption }}</strong>
                  <small>{{ stage.focus }}</small>
                </th>
                <td class="sample-stage-weight-range stats-number">{{ stage.rangeLabel }}</td>
                <td
                  v-for="model in modelColumns"
                  :key="`${stage.label}-${model.key}`"
                  class="sample-stage-weight-value stats-number"
                >{{ stage.weights[model.key] }}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="sample-stage-weight-note">样本门槛决定默认配比，规律是否成立仍需结合回测证据。</p>
        </section>
      </Transition>
    </Teleport>
  </div>
</template>
```

- [ ] **Step 9: Run component and architecture tests**

```powershell
..\.tools\node\node.exe --test src\features\statistics\sampleStageGuidePosition.test.js src\features\statistics\SampleStageWeightGuide.test.js src\architecture.test.js
```

Expected: PASS with zero failures.

- [ ] **Step 10: Commit the positioning and component contract**

```powershell
git add WuwaFrontend/src/features/statistics/sampleStageGuidePosition.js WuwaFrontend/src/features/statistics/sampleStageGuidePosition.test.js WuwaFrontend/src/features/statistics/SampleStageWeightGuide.vue WuwaFrontend/src/features/statistics/SampleStageWeightGuide.test.js WuwaFrontend/src/architecture.test.js
git commit -m "feat: add sample stage weight guide"
```

---

### Task 3: Integrate the guide and remove duplicate stage copy

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- Modify: `WuwaFrontend/src/App.test.js`
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.vue`

- [ ] **Step 1: Replace the old basis-pill assertions**

In `StatisticsView.test.js`, replace the basis-tag expectations with:

```js
assert.match(reliabilitySection, /<SampleStageWeightGuide/)
assert.match(reliabilitySection, /:stages="sampleStageAxisRows"/)
assert.match(reliabilitySection, /:total="sampleStageStatus\.total"/)
assert.doesNotMatch(reliabilitySection, /sample-reliability-basis-tag/)
assert.doesNotMatch(reliabilitySection, /\{\{ sampleStageDriverText \}\}/)
assert.doesNotMatch(source, /sampleStageText|sampleStageDriverText/)
```

In `App.test.js`, replace repository-wide assertions that require `.sample-reliability-basis-tag` with:

```js
assert.match(viewSource, /import SampleStageWeightGuide from '\.\/SampleStageWeightGuide\.vue'/)
assert.match(viewSource, /<SampleStageWeightGuide/)
assert.match(statisticsStyleSource, /\.sample-stage-guide-trigger \{/)
assert.match(statisticsStyleSource, /\.sample-stage-weight-popover \{/)
assert.doesNotMatch(viewSource, /sample-reliability-basis-tag|sampleStageDriverText/)
```

- [ ] **Step 2: Run integration tests and verify RED**

```powershell
..\.tools\node\node.exe --test src\features\statistics\StatisticsView.test.js src\App.test.js
```

Expected: FAIL because `StatisticsView.vue` still renders the basis pill.

- [ ] **Step 3: Replace the basis pill with the guide**

Update imports:

```js
import { formatPercent, formatSignedPercentagePoints } from '../../services/formatters.js'
import SampleStageAxis from './SampleStageAxis.vue'
import SampleStageWeightGuide from './SampleStageWeightGuide.vue'
```

Delete the `sampleStageDriverText` computed value. Keep `sampleStageAxisRows` as the single current-stage owner.

Replace the title cluster:

```vue
<div class="sample-reliability-title">
  <h3>样本可信度</h3>
  <SampleStageWeightGuide
    :stages="sampleStageAxisRows"
    :total="sampleStageStatus.total"
  />
</div>
```

Change the card label so it does not repeat a hidden driver phrase:

```vue
:aria-label="`样本可信度：${sampleStageStatus.currentStage.caption}，${totalSamples} 条样本`"
```

- [ ] **Step 4: Run integration tests**

```powershell
..\.tools\node\node.exe --test src\features\statistics\StatisticsView.test.js src\App.test.js
```

Expected: structure assertions pass; style assertions remain red until Task 4.

- [ ] **Step 5: Commit the page integration**

```powershell
git add WuwaFrontend/src/features/statistics/StatisticsView.vue WuwaFrontend/src/features/statistics/StatisticsView.test.js WuwaFrontend/src/App.test.js
git commit -m "refactor: replace sample stage basis pill"
```

---

### Task 4: Implement the approved visual and responsive behavior

**Files:**
- Modify: `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- Modify: `WuwaFrontend/src/styles/features/statistics.css`

- [ ] **Step 1: Add failing color, matrix, and responsive assertions**

Add to `StatisticsView.test.js`:

```js
test('sample stage guide uses restrained interaction color and prediction-stage color', async () => {
  const styles = await readStatisticsStyles()

  assert.match(styles, /\.sample-stage-guide-trigger \{[^}]*color: #5d6c7b;[^}]*background: transparent;/s)
  assert.match(styles, /\.sample-stage-guide-trigger:hover \{[^}]*color: var\(--primary\);[^}]*background: #f4f8ff;/s)
  assert.match(styles, /\.sample-stage-guide-chevron \{[^}]*transform: rotate\(-90deg\);/s)
  assert.match(styles, /\.sample-stage-track b \{[^}]*background: #2c9f70;/s)
  assert.match(styles, /\.sample-stage-current-rail \{[^}]*width: 2px;[^}]*background: #2c9f70;/s)
  assert.match(styles, /\.sample-stage-weight-table tbody tr\.current \{[^}]*background: #f7f9fb;/s)
  assert.match(styles, /\.sample-stage-weight-value \{[^}]*font-variant-numeric: tabular-nums;[^}]*text-align: center;/s)
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.sample-stage-weight-scroll \{[^}]*overflow-x: auto;/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.sample-stage-guide-enter-active/)
  assert.doesNotMatch(styles, /\.sample-reliability-basis-tag/)
})
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
..\.tools\node\node.exe --test src\features\statistics\StatisticsView.test.js
```

Expected: FAIL because the guide CSS is missing.

- [ ] **Step 3: Replace the basis-pill CSS with trigger and overlay styles**

Remove `.sample-reliability-basis-tag` and its descendant rule. Add:

```css
.sample-stage-guide {
  position: relative;
  display: inline-flex;
}

.sample-stage-guide-trigger,
.sample-stage-guide-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  padding: 0;
  color: #5d6c7b;
  background: transparent;
}

.sample-stage-guide-trigger {
  width: 28px;
  height: 28px;
  border-radius: 7px;
}

.sample-stage-guide-trigger:hover {
  color: var(--primary);
  background: #f4f8ff;
}

.sample-stage-guide-trigger:active {
  color: var(--primary-deep);
}

.sample-stage-guide-trigger[aria-expanded="true"] {
  color: #5d6c7b;
  background: transparent;
}

.sample-stage-guide-chevron {
  width: 16px;
  height: 16px;
  transform: rotate(-90deg);
}

.sample-stage-guide-close {
  width: 28px;
  height: 28px;
  border-radius: 7px;
}

.sample-stage-guide-close:hover {
  color: var(--ink-deep);
  background: var(--surface-soft);
}

.sample-stage-weight-popover {
  position: fixed;
  z-index: 30;
  width: 720px;
  max-height: calc(100vh - 24px);
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid var(--hairline-soft);
  border-radius: 12px;
  background: var(--canvas);
}
```

The arrow remains neutral while open. Blue appears only on hover, active, and the existing global `focus-visible` ring.

- [ ] **Step 4: Add header, semantic matrix, and current-stage styles**

```css
.sample-stage-weight-header {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--hairline-soft);
  padding: 0 10px 0 16px;
}

.sample-stage-weight-header > div {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.sample-stage-weight-header strong {
  color: var(--ink-deep);
  font-size: var(--text-control);
  font-weight: var(--weight-label);
}

.sample-stage-weight-header span {
  color: var(--steel);
  font-size: var(--text-caption);
  font-weight: var(--weight-supporting);
}

.sample-stage-weight-scroll {
  overflow: visible;
}

.sample-stage-weight-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  color: var(--ink-deep);
  font-size: var(--text-label);
}

.sample-stage-weight-stage-column { width: 128px; }
.sample-stage-weight-range-column { width: 112px; }
.sample-stage-weight-model-column { width: 96px; }

.sample-stage-weight-table th,
.sample-stage-weight-table td {
  height: 54px;
  border-bottom: 1px solid var(--hairline-soft);
  padding: 0 12px;
}

.sample-stage-weight-table thead th {
  height: 40px;
  color: var(--steel);
  font-size: var(--text-caption);
  font-weight: var(--weight-supporting);
  text-align: center;
  white-space: nowrap;
}

.sample-stage-weight-table thead th:first-child,
.sample-stage-weight-table thead th:nth-child(2) {
  text-align: left;
}

.sample-stage-weight-table tbody th {
  position: relative;
  padding-left: 16px;
  text-align: left;
}

.sample-stage-weight-table tbody tr.current {
  background: #f7f9fb;
}

.sample-stage-weight-table tbody tr.current th {
  padding-left: 26px;
}

.sample-stage-weight-table tbody tr.current th strong {
  font-weight: var(--weight-title);
}

.sample-stage-current-rail {
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 15px;
  width: 2px;
  border-radius: 2px;
  background: #2c9f70;
}

.sample-stage-weight-table tbody th strong,
.sample-stage-weight-table tbody th small {
  display: block;
}

.sample-stage-weight-table tbody th strong {
  color: var(--ink-deep);
  font-weight: var(--weight-label);
}

.sample-stage-weight-table tbody th small {
  margin-top: 2px;
  overflow: hidden;
  color: var(--steel);
  font-size: var(--text-micro);
  font-weight: var(--weight-supporting);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sample-stage-weight-range {
  color: var(--steel);
  white-space: nowrap;
}

.sample-stage-weight-value {
  color: var(--ink-deep);
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
  font-weight: var(--weight-data);
  text-align: center;
  white-space: nowrap;
}

.sample-stage-weight-note {
  min-height: 42px;
  margin: 0;
  padding: 12px 16px;
  color: var(--steel);
  font-size: var(--text-micro);
  font-weight: var(--weight-supporting);
  line-height: var(--leading-caption);
}
```

Also replace the current stage-axis gradient with the single approved prediction color:

```css
.sample-stage-track b {
  background: #2c9f70;
}
```

Do not recolor the trigger green and do not recolor model-state graphics blue.

- [ ] **Step 5: Add motion and narrow matrix scrolling**

```css
.sample-stage-guide-enter-active,
.sample-stage-guide-leave-active {
  transition:
    opacity 140ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 140ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sample-stage-guide-enter-from,
.sample-stage-guide-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}

@media (max-width: 680px) {
  .sample-stage-weight-scroll {
    overflow-x: auto;
    overscroll-behavior-inline: contain;
  }

  .sample-stage-weight-table {
    min-width: 688px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sample-stage-guide-enter-active,
  .sample-stage-guide-leave-active {
    transition: none;
  }
}
```

- [ ] **Step 6: Add dark-theme equivalence**

Use existing dark tokens and preserve the same semantic split:

```css
.app-shell.theme-dark .sample-stage-weight-popover {
  border-color: var(--hairline);
  background: var(--surface-soft);
}

.app-shell.theme-dark .sample-stage-weight-table tbody tr.current {
  background: #1b2a35;
}

.app-shell.theme-dark .sample-stage-weight-header strong,
.app-shell.theme-dark .sample-stage-weight-table,
.app-shell.theme-dark .sample-stage-weight-value,
.app-shell.theme-dark .sample-stage-weight-table tbody th strong {
  color: var(--ink-deep);
}

.app-shell.theme-dark .sample-stage-current-rail,
.app-shell.theme-dark .sample-stage-track b {
  background: #38b37f;
}

.app-shell.theme-dark .sample-stage-guide-trigger[aria-expanded="true"] {
  color: var(--charcoal);
  background: transparent;
}
```

- [ ] **Step 7: Run targeted tests and verify GREEN**

```powershell
..\.tools\node\node.exe --test src\data\modelPresentation.test.js src\features\statistics\sampleStageGuidePosition.test.js src\features\statistics\SampleStageWeightGuide.test.js src\features\statistics\SampleStageAxis.test.js src\features\statistics\presentation.test.js src\features\statistics\StatisticsView.test.js src\App.test.js src\architecture.test.js
```

Expected: PASS with zero failures.

- [ ] **Step 8: Commit the approved visual behavior**

```powershell
git add WuwaFrontend/src/styles/features/statistics.css WuwaFrontend/src/features/statistics/StatisticsView.test.js
git commit -m "style: align sample stage guide semantics"
```

---

### Task 5: Document, build, and visually verify

**Files:**
- Modify: `DESIGN.md`
- Create: `docs/archive/2026-07-18-sample-stage-weight-guide-implementation.md`

- [ ] **Step 1: Record the component rule in `DESIGN.md`**

Add a concise Statistics rule:

```markdown
- “样本可信度”的阶段说明使用标题旁的 Iconoir disclosure chevron。触发器默认与展开态均为中性文字色，蓝色只用于 hover、active 和 focus；预测绿只用于阶段进度、当前阶段轨道和模型结果。
- 阶段说明在桌面端锚定图标右侧，以非模态 Popover 同时展示五个阶段、样本范围、关注点和五项默认模型权重。使用语义化表格、等宽数字列、2px 当前阶段标记和单行证据边界说明，不使用进度条、嵌套卡片或大段教学文案。
```

- [ ] **Step 2: Run the full frontend test suite**

```powershell
..\.tools\node\npm.cmd test
```

Expected: Node test runner exits 0 with zero failures.

- [ ] **Step 3: Run the production build**

```powershell
..\.tools\node\npm.cmd run build
```

Expected: Vite exits 0 and writes the production bundle without warnings that indicate missing assets or invalid Vue templates.

- [ ] **Step 4: Perform browser verification**

At desktop width (1440px):

- Trigger is a neutral Iconoir chevron, not a question mark or navigation arrow.
- Hover/focus uses Tethys blue; idle and open states return to `#5D6C7B`.
- Popover opens 8px to the trigger’s right with no backdrop.
- All five stages and five model columns are visible.
- Current stage rail and stage-axis fill are `#2C9F70`.
- Current row background is `#F7F9FB`.
- Numeric columns form an equal-width matrix.

At 1024px and 768px:

- Popover uses right placement when it fits, flips left when that side fits, and falls below only when neither side can contain 720px.
- The fixed, teleported panel is not clipped by the reliability card or another overflow container.
- The table scrolls internally only when its 688px minimum width cannot fit.
- No page-level horizontal overflow or clipped close control occurs.

Interaction and accessibility:

- Trigger click opens and toggles the panel.
- Close button, outside click, and Escape close it.
- Close button and Escape return focus to the trigger.
- `aria-expanded` matches visibility.
- Reduced-motion mode removes transform/opacity transitions.
- Light and dark themes preserve readable text and distinguish the current row without using blue as a model-state color.
- Browser console remains free of errors.

- [ ] **Step 5: Write the implementation record**

Create `docs/archive/2026-07-18-sample-stage-weight-guide-implementation.md` with:

```markdown
# Sample Stage Weight Guide Implementation

## Result

Summarize the shipped disclosure, anchored matrix, semantic colors, responsive behavior, and accessibility behavior.

## Files

List every file actually changed.

## Verification

Record targeted tests, full tests, production build, desktop/narrow browser checks, dark theme, keyboard behavior, reduced motion, and console results.

## Unchanged boundaries

Confirm that backend predictor weights, API contracts, database schema, and sample-stage thresholds were not changed.
```

- [ ] **Step 6: Check repository hygiene**

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; no `dist/`, screenshots, local absolute paths, or `.superpowers/` files are staged.

- [ ] **Step 7: Commit documentation and implementation record**

```powershell
git add DESIGN.md docs/archive/2026-07-18-sample-stage-weight-guide-implementation.md
git commit -m "docs: record sample stage weight guide"
```
