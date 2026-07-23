# Homepage System Message Archive Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage title’s perpetual editor-style caret with the approved deterministic “状态归档” lifecycle while preserving complete-grapheme typing, font readiness, static fallbacks, and the existing authentication flow.

**Architecture:** Keep the deterministic timeline in `titleAnimation.js`, browser/media/lifecycle orchestration in `useTitleAnimation.js`, and rendering in `LoginView.vue`. Move the focused indicator and authentication handoff styles into a new `auth-motion.css` imported by `auth.css`, so the existing 420-line ownership limit remains intact.

**Tech Stack:** Vue 3 Composition API, native JavaScript timers, Node test runner, Vite, CSS transitions, IBM Plex Sans SC, existing Tethys design tokens.

**Design reference:** `docs/superpowers/specs/2026-07-23-homepage-system-message-archive-motion-design.md`

---

## File responsibility map

- `WuwaFrontend/src/features/auth/titleAnimation.js`: pure grapheme timeline, phase changes, indicator changes, auth handoff, cancellation, and static completion.
- `WuwaFrontend/src/features/auth/titleAnimation.test.js`: deterministic timing and lifecycle contract.
- `WuwaFrontend/src/features/auth/useTitleAnimation.js`: font preparation, media queries, document visibility, Vue lifecycle, and refs consumed by the view.
- `WuwaFrontend/src/features/auth/useTitleAnimation.test.js`: composable integration, handoff timing, static fallbacks, and cleanup.
- `WuwaFrontend/src/features/auth/LoginView.vue`: accessible title markup, indicator state binding, and auth-card mount gate.
- `WuwaFrontend/src/features/auth/LoginView.test.js`: view ownership and source-level accessibility/motion contract.
- `WuwaFrontend/src/styles/features/auth-motion.css`: focused Hallmark component styles for the 2px indicator, compressed/dot/hidden states, and 260ms auth handoff.
- `WuwaFrontend/src/styles/features/auth.css`: imports the motion owner and retains layout, card, form, theme, and UID flow styles.
- `WuwaFrontend/src/design-state-accent.test.js`: functional-line exception and anti-decoration governance.
- `WuwaFrontend/src/architecture.test.js`: stylesheet ownership, import, responsive rules, and line-count guard.
- `WuwaFrontend/src/typography.test.js`: includes the new stylesheet in the typography policy scan.
- `DESIGN.md` and `docs/web-homepage-terminal-design.md`: long-term rules updated to the approved lifecycle.
- `docs/archive/2026-07-23-homepage-system-message-archive-motion-implementation.md`: completed behavior and verification evidence.

Do not stage `.hallmark/`; it is local Hallmark preflight metadata, not a production artifact.

### Task 1: Build the deterministic archive lifecycle

**Files:**
- Modify: `WuwaFrontend/src/features/auth/titleAnimation.test.js`
- Modify: `WuwaFrontend/src/features/auth/titleAnimation.js`

- [ ] **Step 1: Replace the old uniform-timing test with a failing lifecycle test**

Keep the existing grapheme-splitting and manual-scheduler helpers. Replace the old `createTitleAnimation emits complete prefixes...` test and extend the imports with this contract:

```js
import {
  TITLE_AUTH_HANDOFF_DELAY_MS,
  TITLE_COMPLETE_DELAY_MS,
  TITLE_FINAL_HOLD_MS,
  TITLE_GRAPHEME_DELAYS_MS,
  TITLE_INDICATOR_HIDE_DELAY_MS,
  TITLE_INDICATOR_STATE,
  TITLE_PHASE,
  TITLE_PUNCTUATION_COMPRESS_MS,
  TITLE_START_DELAY_MS,
  createTitleAnimation,
  shouldAnimateTitle,
  splitTitleGraphemes,
} from './titleAnimation.js'

test('createTitleAnimation emits the approved archive lifecycle', () => {
  const scheduler = createManualScheduler()
  const frames = []
  const phases = []
  const indicators = []
  let authReadyCount = 0
  let completionCount = 0
  const animation = createTitleAnimation({
    text: '欢迎回家，漂泊者',
    onFrame: (frame) => frames.push(frame),
    onPhaseChange: (phase) => phases.push(phase),
    onIndicatorChange: (state) => indicators.push(state),
    onAuthReady: () => { authReadyCount += 1 },
    onComplete: () => { completionCount += 1 },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  })

  animation.start()
  animation.start()
  const delays = scheduler.runAll()

  assert.deepEqual(frames, [
    '',
    '欢',
    '欢迎',
    '欢迎回',
    '欢迎回家',
    '欢迎回家，',
    '欢迎回家，漂',
    '欢迎回家，漂泊',
    '欢迎回家，漂泊者',
  ])
  assert.deepEqual(phases, [
    TITLE_PHASE.TYPING,
    TITLE_PHASE.PUNCTUATION,
    TITLE_PHASE.TYPING,
    TITLE_PHASE.RESOLVING,
    TITLE_PHASE.COMPLETED,
  ])
  assert.deepEqual(indicators, [
    TITLE_INDICATOR_STATE.BAR,
    TITLE_INDICATOR_STATE.COMPRESSED,
    TITLE_INDICATOR_STATE.BAR,
    TITLE_INDICATOR_STATE.DOT,
    TITLE_INDICATOR_STATE.HIDDEN,
  ])
  assert.deepEqual(delays, [
    TITLE_START_DELAY_MS,
    ...TITLE_GRAPHEME_DELAYS_MS.slice(0, 4),
    TITLE_PUNCTUATION_COMPRESS_MS,
    TITLE_GRAPHEME_DELAYS_MS[4],
    ...TITLE_GRAPHEME_DELAYS_MS.slice(5),
    TITLE_FINAL_HOLD_MS,
    TITLE_AUTH_HANDOFF_DELAY_MS,
    TITLE_INDICATOR_HIDE_DELAY_MS,
    TITLE_COMPLETE_DELAY_MS,
  ])
  assert.equal(authReadyCount, 1)
  assert.equal(completionCount, 1)
})
```

Update the static-completion test so `complete()` and timer failures assert the ordered terminal states:

```js
const phases = []
const indicators = []
let authReadyCount = 0
let completionCount = 0
const animation = createTitleAnimation({
  text: '欢迎回家，漂泊者',
  onFrame: (frame) => frames.push(frame),
  onPhaseChange: (phase) => phases.push(phase),
  onIndicatorChange: (state) => indicators.push(state),
  onAuthReady: () => { authReadyCount += 1 },
  onComplete: () => { completionCount += 1 },
  schedule: scheduler.schedule,
  cancel: scheduler.cancel,
})

animation.start()
animation.complete()
animation.complete()

assert.deepEqual(frames, ['', '欢迎回家，漂泊者'])
assert.deepEqual(phases, [TITLE_PHASE.TYPING, TITLE_PHASE.STATIC])
assert.deepEqual(indicators, [TITLE_INDICATOR_STATE.BAR, TITLE_INDICATOR_STATE.HIDDEN])
assert.equal(authReadyCount, 1)
assert.equal(completionCount, 1)
```

Add a separate timer-failure assertion with explicit observers:

```js
const failureFrames = []
const failurePhases = []
const failureIndicators = []
let failureAuthReadyCount = 0
let failureCompletionCount = 0
const failingAnimation = createTitleAnimation({
  text: '欢迎回家，漂泊者',
  onFrame: (frame) => failureFrames.push(frame),
  onPhaseChange: (phase) => failurePhases.push(phase),
  onIndicatorChange: (state) => failureIndicators.push(state),
  onAuthReady: () => { failureAuthReadyCount += 1 },
  onComplete: () => { failureCompletionCount += 1 },
  schedule: () => { throw new Error('timer unavailable') },
  cancel: () => {},
})

failingAnimation.start()

assert.deepEqual(failureFrames, ['', '欢迎回家，漂泊者'])
assert.deepEqual(failurePhases, [TITLE_PHASE.TYPING, TITLE_PHASE.STATIC])
assert.deepEqual(failureIndicators, [TITLE_INDICATOR_STATE.BAR, TITLE_INDICATOR_STATE.HIDDEN])
assert.equal(failureAuthReadyCount, 1)
assert.equal(failureCompletionCount, 1)
```

Keep all four `shouldAnimateTitle()` truth-table assertions from the existing test.

- [ ] **Step 2: Run the focused test and verify the new contract fails**

Run from `WuwaFrontend`:

```powershell
node --test src/features/auth/titleAnimation.test.js
```

Expected: FAIL because the new phase constants, indicator constants, callbacks, and deterministic delays are not exported or implemented.

- [ ] **Step 3: Implement the minimal deterministic state machine**

Replace the uniform timing constants and single-timer controller in `titleAnimation.js` with the following public contract and control flow. Preserve `splitTitleGraphemes()` and `shouldAnimateTitle()` unchanged.

```js
export const TITLE_START_DELAY_MS = 180
export const TITLE_GRAPHEME_DELAYS_MS = Object.freeze([90, 64, 98, 70, 250, 94, 72])
export const TITLE_DEFAULT_INTERVAL_MS = 70
export const TITLE_PUNCTUATION_COMPRESS_MS = 170
export const TITLE_FINAL_HOLD_MS = 166
export const TITLE_AUTH_HANDOFF_DELAY_MS = 40
export const TITLE_INDICATOR_HIDE_DELAY_MS = 420
export const TITLE_INDICATOR_TRANSITION_MS = 220
export const TITLE_COMPLETE_DELAY_MS = TITLE_INDICATOR_HIDE_DELAY_MS + TITLE_INDICATOR_TRANSITION_MS

export const TITLE_PHASE = Object.freeze({
  PREPARING: 'preparing',
  TYPING: 'typing',
  PUNCTUATION: 'punctuation',
  RESOLVING: 'resolving',
  COMPLETED: 'completed',
  STATIC: 'static',
})

export const TITLE_INDICATOR_STATE = Object.freeze({
  BAR: 'bar',
  COMPRESSED: 'compressed',
  DOT: 'dot',
  HIDDEN: 'hidden',
})

function delayAfter(index) {
  return TITLE_GRAPHEME_DELAYS_MS[index] ?? TITLE_DEFAULT_INTERVAL_MS
}

export function createTitleAnimation({
  text,
  onFrame,
  onPhaseChange = () => {},
  onIndicatorChange = () => {},
  onAuthReady = () => {},
  onComplete,
  schedule = globalThis.setTimeout,
  cancel = globalThis.clearTimeout,
}) {
  const graphemes = splitTitleGraphemes(text)
  const timerIds = new Set()
  let currentIndex = 0
  let started = false
  let finished = false
  let authReady = false

  function clearScheduledFrames() {
    for (const timerId of timerIds) cancel(timerId)
    timerIds.clear()
  }

  function notifyAuthReady() {
    if (finished || authReady) return
    authReady = true
    onAuthReady()
  }

  function finishStatic() {
    if (finished) return
    finished = true
    clearScheduledFrames()
    onFrame(text)
    onPhaseChange(TITLE_PHASE.STATIC)
    onIndicatorChange(TITLE_INDICATOR_STATE.HIDDEN)
    if (!authReady) {
      authReady = true
      onAuthReady()
    }
    onComplete()
  }

  function finishArchive() {
    if (finished) return
    finished = true
    clearScheduledFrames()
    onPhaseChange(TITLE_PHASE.COMPLETED)
    onComplete()
  }

  function scheduleFrame(callback, delay) {
    if (finished) return
    try {
      let timerId = null
      timerId = schedule(() => {
        timerIds.delete(timerId)
        callback()
      }, delay)
      timerIds.add(timerId)
    } catch {
      finishStatic()
    }
  }

  function beginArchive() {
    if (finished) return
    onPhaseChange(TITLE_PHASE.RESOLVING)
    onIndicatorChange(TITLE_INDICATOR_STATE.DOT)
    scheduleFrame(notifyAuthReady, TITLE_AUTH_HANDOFF_DELAY_MS)
    scheduleFrame(
      () => onIndicatorChange(TITLE_INDICATOR_STATE.HIDDEN),
      TITLE_INDICATOR_HIDE_DELAY_MS,
    )
    scheduleFrame(finishArchive, TITLE_COMPLETE_DELAY_MS)
  }

  function advance() {
    if (finished) return
    const grapheme = graphemes[currentIndex]
    currentIndex += 1
    onFrame(graphemes.slice(0, currentIndex).join(''))

    if (grapheme === '，') {
      onPhaseChange(TITLE_PHASE.PUNCTUATION)
      onIndicatorChange(TITLE_INDICATOR_STATE.COMPRESSED)
      scheduleFrame(() => {
        onIndicatorChange(TITLE_INDICATOR_STATE.BAR)
        onPhaseChange(TITLE_PHASE.TYPING)
      }, TITLE_PUNCTUATION_COMPRESS_MS)
    }

    if (currentIndex >= graphemes.length) {
      scheduleFrame(beginArchive, TITLE_FINAL_HOLD_MS)
      return
    }
    scheduleFrame(advance, delayAfter(currentIndex - 1))
  }

  return {
    start() {
      if (started || finished) return
      started = true
      onFrame('')
      onPhaseChange(TITLE_PHASE.TYPING)
      onIndicatorChange(TITLE_INDICATOR_STATE.BAR)
      if (!graphemes.length) {
        finishStatic()
        return
      }
      scheduleFrame(advance, TITLE_START_DELAY_MS)
    },
    complete() {
      finishStatic()
    },
    cancel() {
      if (finished) return
      finished = true
      clearScheduledFrames()
    },
  }
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

```powershell
node --test src/features/auth/titleAnimation.test.js
```

Expected: PASS; the output contains zero failed tests.

- [ ] **Step 5: Commit the pure lifecycle**

```powershell
git add WuwaFrontend/src/features/auth/titleAnimation.js WuwaFrontend/src/features/auth/titleAnimation.test.js
git commit -m "feat(web): add archived title output lifecycle"
```

### Task 2: Expose independent phase, indicator, and authentication readiness

**Files:**
- Modify: `WuwaFrontend/src/features/auth/useTitleAnimation.test.js`
- Modify: `WuwaFrontend/src/features/auth/useTitleAnimation.js`

- [ ] **Step 1: Write failing composable expectations**

Update imports to use the new constants and replace assertions about a single `isComplete` flag with refs for phase, indicator state, and auth readiness:

```js
import {
  TITLE_AUTH_HANDOFF_DELAY_MS,
  TITLE_FINAL_HOLD_MS,
  TITLE_INDICATOR_HIDE_DELAY_MS,
  TITLE_INDICATOR_STATE,
  TITLE_INDICATOR_TRANSITION_MS,
  TITLE_PHASE,
  TITLE_START_DELAY_MS,
} from './titleAnimation.js'
```

Replace `title animation waits for ready fonts and gates completion until typing finishes` with:

```js
test('title animation hands auth over before the archived indicator exits', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const fontLoad = createDeferred()
  const targets = createBrowserTargets({ load: () => fontLoad.promise })
  const { state, unmount } = mountTitleAnimation('题', targets)

  assert.equal(state.displayedTitle.value, '')
  assert.equal(state.phase.value, TITLE_PHASE.PREPARING)
  assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN)
  assert.equal(state.isAuthReady.value, false)

  fontLoad.resolve([{}])
  await flushMicrotasks()
  assert.equal(state.phase.value, TITLE_PHASE.TYPING)
  assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.BAR)

  context.mock.timers.tick(TITLE_START_DELAY_MS)
  assert.equal(state.displayedTitle.value, '题')

  context.mock.timers.tick(TITLE_FINAL_HOLD_MS)
  assert.equal(state.phase.value, TITLE_PHASE.RESOLVING)
  assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.DOT)
  assert.equal(state.isAuthReady.value, false)

  context.mock.timers.tick(TITLE_AUTH_HANDOFF_DELAY_MS)
  assert.equal(state.isAuthReady.value, true)
  assert.equal(state.phase.value, TITLE_PHASE.RESOLVING)

  context.mock.timers.tick(TITLE_INDICATOR_HIDE_DELAY_MS - TITLE_AUTH_HANDOFF_DELAY_MS)
  assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN)
  assert.equal(state.phase.value, TITLE_PHASE.RESOLVING)

  context.mock.timers.tick(TITLE_INDICATOR_TRANSITION_MS)
  assert.equal(state.phase.value, TITLE_PHASE.COMPLETED)
  unmount()
})
```

For font failure, reduced motion, compact viewport, and hidden-document cases, assert this exact terminal state:

```js
assert.equal(state.displayedTitle.value, '完整标题')
assert.equal(state.phase.value, TITLE_PHASE.STATIC)
assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN)
assert.equal(state.isAuthReady.value, true)
```

Update the unmount/late-font-result test to prove cancellation leaves the original preparing state untouched:

```js
assert.equal(state.displayedTitle.value, '')
assert.equal(state.phase.value, TITLE_PHASE.PREPARING)
assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN)
assert.equal(state.isAuthReady.value, false)
unmount()

fontLoad.resolve([{}])
await flushMicrotasks()
context.mock.timers.tick(2_000)

assert.equal(state.displayedTitle.value, '')
assert.equal(state.phase.value, TITLE_PHASE.PREPARING)
assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN)
assert.equal(state.isAuthReady.value, false)
```

Update the source-ownership test to expect `phase`, `indicatorState`, and `isAuthReady`, and remove its `isComplete` assertions.

- [ ] **Step 2: Run the composable test and verify it fails**

```powershell
node --test src/features/auth/useTitleAnimation.test.js
```

Expected: FAIL because the composable still returns `{ displayedTitle, isComplete }`.

- [ ] **Step 3: Wire the state machine into the composable**

Import the lifecycle constants and replace the single completion ref with independent state:

```js
import {
  TITLE_INDICATOR_STATE,
  TITLE_PHASE,
  createTitleAnimation,
  shouldAnimateTitle,
} from './titleAnimation.js'

const displayedTitle = ref(shouldPlay ? '' : text)
const phase = ref(shouldPlay ? TITLE_PHASE.PREPARING : TITLE_PHASE.STATIC)
const indicatorState = ref(TITLE_INDICATOR_STATE.HIDDEN)
const isAuthReady = ref(!shouldPlay)
```

Use this static completion path:

```js
function complete() {
  if (animation) {
    animation.complete()
    return
  }
  displayedTitle.value = text
  phase.value = TITLE_PHASE.STATIC
  indicatorState.value = TITLE_INDICATOR_STATE.HIDDEN
  isAuthReady.value = true
}
```

Create the controller with all callbacks owned by the composable:

```js
animation = createTitleAnimation({
  text,
  onFrame: (frame) => {
    displayedTitle.value = frame
  },
  onPhaseChange: (nextPhase) => {
    phase.value = nextPhase
  },
  onIndicatorChange: (nextState) => {
    indicatorState.value = nextState
  },
  onAuthReady: () => {
    isAuthReady.value = true
  },
  onComplete: () => {},
})
```

Return the independent refs:

```js
return { displayedTitle, phase, indicatorState, isAuthReady }
```

Keep existing font preparation, media-query listeners, visibility handling, cancellation, and late-result protection unchanged.

- [ ] **Step 4: Run animation and composable tests**

```powershell
node --test src/features/auth/titleAnimation.test.js src/features/auth/useTitleAnimation.test.js src/features/auth/titleFont.test.js
```

Expected: PASS; zero failed tests.

- [ ] **Step 5: Commit the composable contract**

```powershell
git add WuwaFrontend/src/features/auth/useTitleAnimation.js WuwaFrontend/src/features/auth/useTitleAnimation.test.js
git commit -m "refactor(web): expose title motion lifecycle state"
```

### Task 3: Render and style the Hallmark archive handoff

**Files:**
- Modify: `WuwaFrontend/src/features/auth/LoginView.test.js`
- Modify: `WuwaFrontend/src/design-state-accent.test.js`
- Modify: `WuwaFrontend/src/architecture.test.js`
- Modify: `WuwaFrontend/src/typography.test.js`
- Modify: `WuwaFrontend/src/features/auth/LoginView.vue`
- Create: `WuwaFrontend/src/styles/features/auth-motion.css`
- Modify: `WuwaFrontend/src/styles/features/auth.css`

- [ ] **Step 1: Write failing view and style contracts**

In `LoginView.test.js`, replace the old caret/auth-completion assertions with:

```js
test('login view renders the archived system output lifecycle', async () => {
  const source = await readFile(new URL('./LoginView.vue', import.meta.url), 'utf8')
  const motion = await readFile(new URL('../../styles/features/auth-motion.css', import.meta.url), 'utf8')

  assert.match(source, /phase: terminalTitlePhase/)
  assert.match(source, /indicatorState: terminalTitleIndicator/)
  assert.match(source, /isAuthReady: isTerminalAuthReady/)
  assert.match(source, /const showsTerminalTitleIndicator = computed/)
  assert.match(source, /v-if="showsTerminalTitleIndicator" class="terminal-title-indicator"/)
  assert.match(source, /:class="`terminal-title-indicator--\$\{terminalTitleIndicator\}`"/)
  assert.match(source, /<div v-if="isTerminalAuthReady" class="terminal-auth-wrapper">/)
  assert.doesNotMatch(source, /terminal-title-caret|isTerminalTitleComplete/)
  assert.match(motion, /\.terminal-title-indicator \{[\s\S]+width: 2px;[\s\S]+margin-inline-start: 0\.14em;/)
  assert.match(motion, /\.terminal-title-indicator--compressed \{[\s\S]+opacity: 0\.45;[\s\S]+scaleY\(0\.68\)/)
  assert.match(motion, /\.terminal-title-indicator--dot \{[\s\S]+scaleX\(2\.2\) scaleY\(0\.12\)/)
  assert.match(motion, /\.terminal-title-indicator--hidden \{[\s\S]+opacity: 0;/)
  assert.match(motion, /\.terminal-auth-enter-active \{[^}]+260ms/)
  assert.doesNotMatch(motion, /animation:|terminal-blink|infinite/)
})
```

Update the reduced-motion test to read `auth-motion.css` and assert both the indicator and auth transition are disabled there.

In `design-state-accent.test.js`:

```js
// Add to styleFiles:
'./styles/features/auth-motion.css',

// Replace the exception selector:
'.terminal-title-indicator',

test('the functional login indicator archives without editor-style blinking', async () => {
  const authStyle = await read('./styles/features/auth.css')
  const motionStyle = await read('./styles/features/auth-motion.css')

  assert.match(authStyle, /\.terminal-title \{[\s\S]+display: inline-flex;[\s\S]+align-items: baseline;/)
  assert.match(motionStyle, /\.terminal-title-indicator \{[\s\S]+width: 2px;[\s\S]+margin-inline-start: 0\.14em;/)
  assert.match(motionStyle, /\.terminal-title-indicator--dot \{[\s\S]+scaleX\(2\.2\) scaleY\(0\.12\)/)
  assert.match(motionStyle, /\.terminal-auth-enter-active \{[\s\S]+260ms/)
  assert.doesNotMatch(motionStyle, /terminal-blink|infinite|@keyframes/)
  assert.doesNotMatch(authStyle, /\.terminal-title \{[^}]+(?:width: 0|overflow: hidden|border-right:)/)
})
```

In `architecture.test.js`:

- Add the new file to `activeStylePaths` and apply these ownership checks:

```js
assert.ok(
  await lineCount('./styles/features/auth-motion.css') <= 80,
  'auth-motion.css must remain a focused title and auth-handoff motion owner',
)

const authMotion = await readFile(new URL('./styles/features/auth-motion.css', import.meta.url), 'utf8')
const narrowMotion = cssBlockBody(authMotion, /@media \(max-width: 520px\)\s*(?=\{)/)

assert.match(auth, /^@import '\.\/auth-motion\.css';/)
assertCssDeclarations(
  cssBlockBody(narrowMotion, /\.terminal-title-indicator\s*(?=\{)/),
  { display: 'none' },
)
```

- Remove the old 520px `.terminal-title-caret` assertion against `auth.css`; keep the existing natural-wrap assertion for `.terminal-title`.

In `typography.test.js`, add `./styles/features/auth-motion.css` to the supporting-view style group.

- [ ] **Step 2: Run the structural tests and verify they fail**

```powershell
node --test src/features/auth/LoginView.test.js src/design-state-accent.test.js src/architecture.test.js src/typography.test.js
```

Expected: FAIL because the view still renders `.terminal-title-caret` and `auth-motion.css` does not exist.

- [ ] **Step 3: Update the view without growing its ownership boundary**

Replace the title-animation destructuring with one line and add one focused computed value:

```js
const { displayedTitle: displayedTerminalTitle, phase: terminalTitlePhase, indicatorState: terminalTitleIndicator, isAuthReady: isTerminalAuthReady } = useTitleAnimation(terminalTitle)
const showsTerminalTitleIndicator = computed(() => ['typing', 'punctuation', 'resolving'].includes(terminalTitlePhase.value))
```

Replace the title indicator and auth gate in the template:

```vue
<h1 class="terminal-title" :aria-label="terminalTitle">
  <span aria-hidden="true">{{ displayedTerminalTitle }}</span>
  <span v-if="showsTerminalTitleIndicator" class="terminal-title-indicator" :class="`terminal-title-indicator--${terminalTitleIndicator}`" aria-hidden="true"></span>
</h1>
```

```vue
<Transition name="terminal-auth">
  <div v-if="isTerminalAuthReady" class="terminal-auth-wrapper">
```

Do not add lifecycle ownership, timers, media queries, or animation constants to `LoginView.vue`. Confirm it remains at or below 145 lines.

- [ ] **Step 4: Create the focused motion stylesheet**

Create `WuwaFrontend/src/styles/features/auth-motion.css` with exactly the component states and two responsive fallbacks:

```css
/*
 * Hallmark · system-message archive component
 * P5 H5 E5 S5 R5 V4 · Tethys theme locked
 */
.terminal-title-indicator {
  width: 2px;
  height: 0.9em;
  flex: 0 0 2px;
  align-self: center;
  margin-inline-start: 0.14em;
  background: var(--terminal-primary);
  opacity: 1;
  transform: scaleY(1);
  transform-origin: center;
  transition:
    opacity 170ms cubic-bezier(0.65, 0, 0.35, 1),
    transform 170ms cubic-bezier(0.65, 0, 0.35, 1);
}

.terminal-title-indicator--compressed {
  opacity: 0.45;
  transform: scaleY(0.68);
}

.terminal-title-indicator--dot {
  opacity: 0.9;
  transform: scaleX(2.2) scaleY(0.12);
  transition-duration: 220ms;
}

.terminal-title-indicator--hidden {
  opacity: 0;
  transform: scaleX(2.2) scaleY(0.08);
  transition-duration: 220ms;
}

.terminal-auth-enter-active {
  transition:
    opacity 260ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

.terminal-auth-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

@media (prefers-reduced-motion: reduce) {
  .terminal-title-indicator { display: none; transition: none; }
  .terminal-auth-enter-active { transition: none; }
}

@media (max-width: 520px) {
  .terminal-title-indicator { display: none; }
}
```

- [ ] **Step 5: Transfer motion ownership out of `auth.css`**

Add this as the first line of `auth.css`:

```css
@import './auth-motion.css';
```

Delete these obsolete rules from `auth.css`:

- The complete `.terminal-title-caret` block.
- `.terminal-auth-enter-active` and `.terminal-auth-enter-from`.
- `@keyframes terminal-blink`.
- `.terminal-title-caret { display: none; }` from both media queries.
- `.terminal-auth-enter-active { transition: none; }` from the reduced-motion query.

Do not change layout, title typography, card surface, dark theme, form states, or UID flow styles.

- [ ] **Step 6: Run the structural suite and verify it passes**

```powershell
node --test src/features/auth/LoginView.test.js src/design-state-accent.test.js src/architecture.test.js src/typography.test.js
```

Expected: PASS; zero failed tests. `architecture.test.js` confirms `LoginView.vue <= 145`, `auth.css <= 420`, and `auth-motion.css <= 80` lines.

- [ ] **Step 7: Commit the view and motion layer**

```powershell
git add WuwaFrontend/src/features/auth/LoginView.vue WuwaFrontend/src/features/auth/LoginView.test.js WuwaFrontend/src/styles/features/auth.css WuwaFrontend/src/styles/features/auth-motion.css WuwaFrontend/src/design-state-accent.test.js WuwaFrontend/src/architecture.test.js WuwaFrontend/src/typography.test.js
git commit -m "feat(web): archive the homepage output indicator"
```

### Task 4: Synchronize the long-term design rules

**Files:**
- Modify: `DESIGN.md`
- Modify: `docs/web-homepage-terminal-design.md`

- [ ] **Step 1: Update the functional graphic exception in `DESIGN.md`**

Replace the 4px caret exception with:

```markdown
- 登录标题的 2px 系统输出指示器及其 `0.14em` 末字间距属于品牌交互图形；它只在逐字输出和状态归档阶段存在，完成后退出。
```

Replace the authentication-surface caret rule with:

```markdown
- 系统输出指示器是标题的功能性动画，不属于彩色侧边条；输出期间稳定跟随文字，逗号处短暂收缩，末字后归档为短点并退出。标题不可编辑，因此完成态不得保留无限闪烁。`prefers-reduced-motion`、520px 及以下窄屏和后台页面不显示指示器。
```

Replace the matching “Don't” exception with:

```markdown
- **Don't** 把已登记的 Bayes 路径、登录系统输出指示器或其他功能图形当作装饰性侧边条删除，也不要给不可编辑标题恢复无限闪烁光标。
```

Replace the general motion-duration bullet so the approved one-time handoff does not contradict the long-term timing rules:

```markdown
- 常规状态反馈为 80–120ms，普通面板显隐为 120–160ms；首页认证卡片在系统消息归档后的首次接棒使用 260ms，是只播放一次的品牌入口例外。所有空间动效只动画 opacity 和 transform，不动画布局属性。
```

- [ ] **Step 2: Update the homepage motion contract**

In `docs/web-homepage-terminal-design.md`, retain the full-grapheme and font-readiness bullets, then replace the indicator/auth bullets with:

```markdown
- 蓝色系统输出指示器使用独立 2px 行内元素跟随当前文字末端，不以标题容器边框模拟，也不在输出期间闪烁。
- 逗号处指示器短暂收缩；完整标题后进入 `resolving`，竖条归档为短点。认证卡片在归档开始 40ms 后进入，不等待短点完全退出。
- 归档完成后移除指示器，页面保持静止；标题文字、登录 / 注册切换或表单状态不得触发重播。
- 桌面端认证卡片在 `isAuthReady` 前不能进入焦点顺序、指针命中区域或无障碍树，接棒后立即恢复现有交互。
- 减少动态效果、520px 及以下窄屏和后台页面直接显示完整标题与认证卡片，不显示系统输出指示器。
```

Replace the acceptance bullet at the end with:

```markdown
- 标题动画任意帧只显示完整字素；认证卡片在 `isAuthReady` 前不可交互，状态归档开始后及时接棒；短点退出后页面完全静止。
```

- [ ] **Step 3: Verify the old perpetual-caret rules are gone**

Run from the repository root:

```powershell
rg -n "4px 打字光标|保留光标闪烁|停在完整标题末端|terminal-blink" DESIGN.md docs/web-homepage-terminal-design.md
```

Expected: no matches.

```powershell
rg -n "2px 系统输出指示器|状态归档|resolving|isAuthReady" DESIGN.md docs/web-homepage-terminal-design.md
```

Expected: both long-term documents contain the new lifecycle language.

- [ ] **Step 4: Commit the long-term rules**

```powershell
git add DESIGN.md docs/web-homepage-terminal-design.md
git commit -m "docs: govern homepage output archive motion"
```

### Task 5: Verify the complete feature and record the implementation

**Files:**
- Create: `docs/archive/2026-07-23-homepage-system-message-archive-motion-implementation.md`

- [ ] **Step 1: Run all focused authentication and governance tests**

Run from `WuwaFrontend`:

```powershell
node --test src/features/auth/titleAnimation.test.js src/features/auth/useTitleAnimation.test.js src/features/auth/titleFont.test.js src/features/auth/LoginView.test.js src/design-state-accent.test.js src/architecture.test.js src/typography.test.js
```

Expected: PASS; zero failed tests.

- [ ] **Step 2: Run the complete frontend test suite**

```powershell
npm test
```

Expected: PASS; the summary reports zero failed tests.

- [ ] **Step 3: Run the production build**

```powershell
npm run build
```

Expected: Vite exits with code 0 and writes the ignored `dist/` output.

- [ ] **Step 4: Perform browser motion and responsive QA**

Start the local frontend from `WuwaFrontend`:

```powershell
npm run dev -- --host 127.0.0.1 --port 43192
```

Use the in-app browser and verify these exact checkpoints:

- At `1440 × 900`, the title emits only complete grapheme prefixes with a stable 2px blue bar.
- At the comma, the bar compresses once and restores before “漂”.
- After “者”, the bar becomes a short point; the auth card starts entering before the point fades.
- After completion, there is no blinking, loop, residual indicator, or layout shift.
- At `768 × 1024`, the same lifecycle works without overflow or overlap.
- At `320 × 800`, `375 × 812`, and `414 × 896`, the complete title and auth card are immediately present and the indicator is absent.
- With `prefers-reduced-motion: reduce`, the complete title and auth card are immediately present and the indicator is absent.
- During the desktop sequence, `document.fonts.check('700 56px "IBM Plex Sans SC"', '欢迎回家，漂泊者')` remains `true` for every non-empty title frame.
- Keyboard focus cannot reach auth controls before `isAuthReady`; after handoff, login/register tabs and fields follow their existing order.

Stop the local dev process after QA.

- [ ] **Step 5: Run repository hygiene checks**

Run from the repository root:

```powershell
git diff --check
git status --short
```

Expected: `git diff --check` has no output. Status lists only intended source/doc changes plus the pre-existing untracked `.hallmark/` process directory; no `dist/`, `node_modules/`, log, PID, or local database files are staged.

- [ ] **Step 6: Write the implementation record after all checks pass**

Create `docs/archive/2026-07-23-homepage-system-message-archive-motion-implementation.md` with this content:

```markdown
# 首页系统消息“状态归档”动效实施记录

**日期：** 2026-07-23

## 已实施

- 首页继续按完整 Unicode 字素逐字输出“欢迎回家，漂泊者”。
- 输出期间使用稳定的 2px Tethys 蓝指示器，不再无限闪烁。
- 逗号触发一次收缩停顿，末字后竖条归档为短点并完全退出。
- 认证卡片在归档开始 40ms 后接棒，不等待短点淡出完成。
- reduced-motion、520px 及以下、后台页面和字体准备失败路径直接静态显示完整标题与认证卡片。
- 动画时序、浏览器条件、视图渲染和 CSS 动效保持在各自 owner 内，没有加厚 `App.vue`。

## 自动验证

- 标题时序、组合函数、字体准备、登录视图和设计治理定向测试通过。
- `npm test` 全量前端测试通过，失败数为 0。
- `npm run build` 生产构建通过。
- `git diff --check` 通过。

## 浏览器验证

- 1440px 与 768px 视口完成逐字、标点停顿、短点归档和认证接棒，完成后页面静止。
- 320px、375px、414px 与 reduced-motion 条件直接显示完整标题和认证卡片，无指示器、横向溢出或控件重叠。
- 标题非空帧持续命中 IBM Plex Sans SC Bold，未观察到半字或字体替换闪烁。
- 认证卡片在接棒前不可聚焦，接棒后恢复既有键盘顺序。
```

- [ ] **Step 7: Commit the verified implementation record**

```powershell
git add docs/archive/2026-07-23-homepage-system-message-archive-motion-implementation.md
git commit -m "docs: record homepage output archive implementation"
```

- [ ] **Step 8: Confirm the final branch state**

```powershell
git log -6 --oneline
git status --short
```

Expected: the five implementation commits are present after the design and plan commits. The only remaining untracked path is `.hallmark/`, and no production or documentation changes remain unstaged.
