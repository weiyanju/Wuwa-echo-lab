# Evaluation Model Detail Scroll Anchor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the clicked submodel summary row at the same viewport position when its detail closes or when the user switches to another submodel.

**Architecture:** Add a small framework-independent controller that measures one anchor element before and after a Vue DOM update, then compensates the document scrolling element by the measured viewport delta. `EvaluationBacktest.vue` owns only disclosure state and passes the clicked native button plus `nextTick` to the controller; CSS remains unchanged and keeps the existing enter-only transition.

**Tech Stack:** Vue 3, JavaScript ES modules, Node.js built-in test runner, Vite

---

## File structure

- Create `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.js`: owns measurement, stale-operation cancellation, tolerance handling, and scroll compensation.
- Create `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.test.js`: verifies geometry calculations and edge cases without a browser or Vue dependency.
- Modify `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`: connects the clicked disclosure button and Vue `nextTick` to the controller.
- Modify `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`: locks the component integration contract while preserving the existing disclosure and motion rules.

### Task 1: Build the viewport-anchor controller with TDD

**Files:**
- Create: `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.test.js`
- Create: `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.js`

- [ ] **Step 1: Write the failing controller tests**

Create `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { createModelDetailViewportAnchor } from './modelDetailViewportAnchor.js'

function createAnchorFixture({ top = 120, scrollTop = 400 } = {}) {
  let currentTop = top
  const scrollingElement = { scrollTop }
  const ownerDocument = { scrollingElement }
  const anchorElement = {
    isConnected: true,
    ownerDocument,
    getBoundingClientRect() {
      return { top: currentTop }
    },
  }

  return {
    anchorElement,
    scrollingElement,
    setTop(value) {
      currentTop = value
    },
  }
}

test('viewport anchor keeps a row fixed when the browser moves it down', async () => {
  const fixture = createAnchorFixture()
  let stateChanged = false
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => fixture.setTop(170),
  })

  await preserve(fixture.anchorElement, () => {
    stateChanged = true
  })

  assert.equal(stateChanged, true)
  assert.equal(fixture.scrollingElement.scrollTop, 450)
})

test('viewport anchor handles an upward row displacement', async () => {
  const fixture = createAnchorFixture()
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => fixture.setTop(90),
  })

  await preserve(fixture.anchorElement, () => {})

  assert.equal(fixture.scrollingElement.scrollTop, 370)
})

test('viewport anchor ignores subpixel movement below the tolerance', async () => {
  const fixture = createAnchorFixture()
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => fixture.setTop(120.5),
  })

  await preserve(fixture.anchorElement, () => {})

  assert.equal(fixture.scrollingElement.scrollTop, 400)
})

test('viewport anchor safely exits when the element disconnects', async () => {
  const fixture = createAnchorFixture()
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => {
      fixture.setTop(170)
      fixture.anchorElement.isConnected = false
    },
  })

  await preserve(fixture.anchorElement, () => {})

  assert.equal(fixture.scrollingElement.scrollTop, 400)
})

test('viewport anchor safely exits without a scrolling element', async () => {
  const fixture = createAnchorFixture()
  fixture.anchorElement.ownerDocument.scrollingElement = null
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => fixture.setTop(170),
  })

  await preserve(fixture.anchorElement, () => {})

  assert.equal(fixture.scrollingElement.scrollTop, 400)
})

test('only the latest rapid disclosure operation compensates scroll', async () => {
  const first = createAnchorFixture()
  const second = createAnchorFixture()
  const updateResolvers = []
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: () => new Promise((resolve) => updateResolvers.push(resolve)),
  })

  const firstOperation = preserve(first.anchorElement, () => {})
  const secondOperation = preserve(second.anchorElement, () => {})
  first.setTop(180)
  second.setTop(150)

  updateResolvers[0]()
  await firstOperation
  assert.equal(first.scrollingElement.scrollTop, 400)

  updateResolvers[1]()
  await secondOperation
  assert.equal(second.scrollingElement.scrollTop, 430)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `WuwaFrontend`:

```powershell
npm test -- src/features/evaluation/modelDetailViewportAnchor.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `modelDetailViewportAnchor.js`.

- [ ] **Step 3: Implement the minimal controller**

Create `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.js`:

```js
const DEFAULT_POSITION_TOLERANCE_PX = 1

function anchorTop(anchorElement) {
  const top = anchorElement?.getBoundingClientRect?.().top
  return Number.isFinite(top) ? top : null
}

export function createModelDetailViewportAnchor({
  waitForUpdate,
  positionTolerance = DEFAULT_POSITION_TOLERANCE_PX,
} = {}) {
  if (typeof waitForUpdate !== 'function') {
    throw new TypeError('waitForUpdate must be a function')
  }

  let latestOperationId = 0

  return async function preserveModelDetailViewportAnchor(anchorElement, applyStateChange) {
    const operationId = ++latestOperationId
    const beforeTop = anchorTop(anchorElement)

    applyStateChange()

    if (beforeTop === null) {
      return
    }

    await waitForUpdate()

    if (operationId !== latestOperationId || !anchorElement?.isConnected) {
      return
    }

    const scrollingElement = anchorElement.ownerDocument?.scrollingElement
    const afterTop = anchorTop(anchorElement)
    if (!scrollingElement || afterTop === null) {
      return
    }

    const positionDelta = afterTop - beforeTop
    if (Math.abs(positionDelta) < positionTolerance) {
      return
    }

    scrollingElement.scrollTop += positionDelta
  }
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
npm test -- src/features/evaluation/modelDetailViewportAnchor.test.js
```

Expected: PASS, 6 tests passed.

- [ ] **Step 5: Commit the controller**

```powershell
git add WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.js WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.test.js
git commit -m "fix: preserve submodel detail viewport anchor"
```

### Task 2: Connect the controller to the disclosure button

**Files:**
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`

- [ ] **Step 1: Write the failing component integration assertions**

In `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`, add:

```js
test('submodel disclosure preserves the clicked summary viewport position', async () => {
  const source = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')

  assert.match(source, /import \{ createModelDetailViewportAnchor \} from '\.\/modelDetailViewportAnchor\.js'/)
  assert.match(source, /createModelDetailViewportAnchor\(\{\s+waitForUpdate: nextTick,\s+\}\)/)
  assert.match(source, /function toggleModelDetail\(key, event\)/)
  assert.match(source, /preserveModelDetailViewportAnchor\(event\?\.currentTarget, \(\) => \{/)
  assert.match(source, /@click="toggleModelDetail\(row\.key, \$event\)"/)
})
```

Update the native disclosure button assertion in the existing `model detail summary uses one native disclosure button without nested controls` test:

```js
assert.match(source, /<button\s+class="model-bar-summary"\s+type="button"\s+:aria-expanded="expandedModelDetailKey === row\.key"\s+@click="toggleModelDetail\(row\.key, \$event\)"/)
```

Keep the existing assertions that reject nested buttons, fixed `max-height`, and leave-phase layout transitions.

- [ ] **Step 2: Run the component test and verify RED**

Run from `WuwaFrontend`:

```powershell
npm test -- src/features/evaluation/EvaluationBacktest.test.js
```

Expected: FAIL because the controller import, `nextTick`, event parameter, and template event forwarding are absent.

- [ ] **Step 3: Integrate the controller**

Update the Vue import and add the controller import at the top of `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`:

```js
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

import chevronDownIcon from '../../assets/icons/chevron-down.svg'
import helpCircleIcon from '../../assets/icons/help-circle.svg'
import { modelBacktestNotes, modelOrder } from '../../data/modelPresentation.js'
import { formatPercent, formatSignedPercent } from '../../services/formatters.js'
import { ACTIVE_MODEL_WEIGHT_EPSILON } from '../../services/modelDetails.js'
import { createModelDetailViewportAnchor } from './modelDetailViewportAnchor.js'
```

After the existing refs, create one controller for the component instance:

```js
const modelInsightViews = ref({})
const selectedModelDetailKey = ref(null)
const markovAxisDrag = ref(null)
const preserveModelDetailViewportAnchor = createModelDetailViewportAnchor({
  waitForUpdate: nextTick,
})
```

Replace `toggleModelDetail` with:

```js
function toggleModelDetail(key, event) {
  void preserveModelDetailViewportAnchor(event?.currentTarget, () => {
    selectedModelDetailKey.value = expandedModelDetailKey.value === key ? null : key
  })
}
```

Update the disclosure button event binding:

```vue
@click="toggleModelDetail(row.key, $event)"
```

Do not change `evaluation.css`; the existing enter-only transition and immediate document-flow update remain the motion contract.

- [ ] **Step 4: Run the component and controller tests**

Run:

```powershell
npm test -- src/features/evaluation/modelDetailViewportAnchor.test.js src/features/evaluation/EvaluationBacktest.test.js
```

Expected: PASS, including the 6 controller cases and all existing submodel disclosure assertions.

- [ ] **Step 5: Commit the component integration**

```powershell
git add WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js
git commit -m "fix: stabilize evaluation detail collapse position"
```

### Task 3: Verify behavior and regression safety

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Run the complete frontend test suite**

Run from `WuwaFrontend`:

```powershell
npm test
```

Expected: exit code 0 with all tests passing.

- [ ] **Step 2: Run the production build**

Run:

```powershell
npm run build
```

Expected: exit code 0 and a successful Vite production build.

- [ ] **Step 3: Check formatting and repository scope**

Run from the repository root:

```powershell
git diff --check
git status --short
```

Expected: `git diff --check` prints no errors. `git status --short` contains only the task files plus pre-existing unrelated working-tree changes; no `dist`, logs, local databases, or runtime files are added.

- [ ] **Step 4: Validate browser geometry with real evaluation data**

At the current local preview, verify these actions in both light and dark modes:

1. Expand a submodel and immediately close it.
2. Expand it, scroll downward while keeping its summary button visible, then close it.
3. Expand one submodel, scroll downward, then click a different submodel.
4. Repeat once near the bottom of the page and once below the `1000px` responsive breakpoint.
5. Trigger close with Enter or Space while the summary button is focused.

For each action, compare the clicked button's `getBoundingClientRect().top` immediately before and after the DOM update. Expected absolute difference: less than `1px`. Confirm that the page does not animate or smooth-scroll during compensation and that focus remains on the native disclosure button.

If no authenticated evaluation-data session is available, report this browser-validation limitation explicitly and do not claim geometry was manually verified.

- [ ] **Step 5: Review the final diff**

Run:

```powershell
git diff --stat HEAD~2..HEAD
git diff HEAD~2..HEAD -- WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.js WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.test.js WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js
```

Expected: the diff contains only the focused controller, its tests, and component integration. It must not introduce CSS leave animations, global `overflow-anchor` rules, `scrollIntoView`, or smooth scrolling.
