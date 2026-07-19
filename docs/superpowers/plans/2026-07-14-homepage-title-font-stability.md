# Homepage Title Font Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preload every IBM Plex Sans SC Bold subset needed by the full homepage title before complete-grapheme typing starts, eliminating title-text font replacement flashes without changing authentication-card timing.

**Architecture:** Add a framework-independent, cancellable title-font preparation controller with a 180ms budget. The existing Vue composable waits for that controller before creating the title animation; unsupported, empty, failed, timed-out, backgrounded, compact, reduced-motion, or unmounted states complete statically instead of starting unstable motion.

**Tech Stack:** Vue 3 Composition API, CSS Font Loading API, native promises and timers, Node.js built-in test runner, Vite, in-app browser verification.

---

## File ownership map

- Create `WuwaFrontend/src/features/auth/titleFont.js`: font shorthand, timeout policy, load-result validation, cancellation, and late-result suppression.
- Create `WuwaFrontend/src/features/auth/titleFont.test.js`: deterministic success, unsupported API, empty result, exception, timeout, and cancellation tests.
- Modify `WuwaFrontend/src/features/auth/useTitleAnimation.js`: wait for stable title fonts before creating the animation, preserve static fallbacks, and cancel pending preparation on unmount.
- Modify `WuwaFrontend/src/features/auth/useTitleAnimation.test.js`: source contract for font preparation ordering and cleanup.
- Modify `docs/web-homepage-terminal-design.md`: make stable final-font preparation a long-term homepage motion rule.
- Modify `docs/archive/2026-07-14-homepage-typewriter-animation-implementation.md`: record the follow-up root cause, implementation, and actual verification evidence.

### Task 1: Build a deterministic, cancellable title-font preparation controller

**Files:**
- Create: `WuwaFrontend/src/features/auth/titleFont.test.js`
- Create: `WuwaFrontend/src/features/auth/titleFont.js`

- [ ] **Step 1: Write the failing font preparation tests**

Create `WuwaFrontend/src/features/auth/titleFont.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TITLE_FONT_LOAD_TIMEOUT_MS,
  TITLE_FONT_SHORTHAND,
  createTitleFontPreparation,
} from './titleFont.js'

function createManualScheduler() {
  let nextId = 0
  const jobs = []

  return {
    schedule(callback, delay) {
      nextId += 1
      jobs.push({ callback, delay, id: nextId })
      return nextId
    },
    cancel(id) {
      const index = jobs.findIndex((job) => job.id === id)
      if (index >= 0) jobs.splice(index, 1)
    },
    runAll() {
      const delays = []
      while (jobs.length) {
        const job = jobs.shift()
        delays.push(job.delay)
        job.callback()
      }
      return delays
    },
    pendingCount() {
      return jobs.length
    },
  }
}

test('title font preparation loads every face matched by the complete title', async () => {
  const scheduler = createManualScheduler()
  const calls = []
  const preparation = createTitleFontPreparation({
    text: '欢迎回家，漂泊者',
    fontSet: {
      load(font, text) {
        calls.push({ font, text })
        return Promise.resolve([{}, {}, {}, {}, {}, {}])
      },
    },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  })

  preparation.start()

  assert.equal(await preparation.ready, true)
  assert.deepEqual(calls, [{
    font: TITLE_FONT_SHORTHAND,
    text: '欢迎回家，漂泊者',
  }])
  assert.equal(scheduler.pendingCount(), 0)
})

test('title font preparation rejects unsupported, empty, and failed loads', async () => {
  const unsupported = createTitleFontPreparation({ text: '标题', fontSet: null })
  unsupported.start()
  assert.equal(await unsupported.ready, false)

  const empty = createTitleFontPreparation({
    text: '标题',
    fontSet: { load: () => Promise.resolve([]) },
  })
  empty.start()
  assert.equal(await empty.ready, false)

  const failed = createTitleFontPreparation({
    text: '标题',
    fontSet: { load: () => { throw new Error('font unavailable') } },
  })
  failed.start()
  assert.equal(await failed.ready, false)
})

test('title font preparation times out without accepting a late result', async () => {
  const scheduler = createManualScheduler()
  let resolveLoad
  const preparation = createTitleFontPreparation({
    text: '欢迎回家，漂泊者',
    fontSet: { load: () => new Promise((resolve) => { resolveLoad = resolve }) },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  })

  preparation.start()

  assert.deepEqual(scheduler.runAll(), [TITLE_FONT_LOAD_TIMEOUT_MS])
  assert.equal(await preparation.ready, false)
  resolveLoad([{}])
  await Promise.resolve()
  assert.equal(await preparation.ready, false)
})

test('title font preparation cancellation clears its timeout and resolves statically', async () => {
  const scheduler = createManualScheduler()
  const preparation = createTitleFontPreparation({
    text: '欢迎回家，漂泊者',
    fontSet: { load: () => new Promise(() => {}) },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  })

  preparation.start()
  preparation.cancel()
  preparation.cancel()

  assert.equal(await preparation.ready, false)
  assert.equal(scheduler.pendingCount(), 0)
})
```

- [ ] **Step 2: Run the font preparation test and verify RED**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src/features/auth/titleFont.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `titleFont.js`, proving the preparation behavior does not exist.

- [ ] **Step 3: Implement the minimal font preparation controller**

Create `WuwaFrontend/src/features/auth/titleFont.js`:

```js
export const TITLE_FONT_LOAD_TIMEOUT_MS = 180
export const TITLE_FONT_SHORTHAND = '700 56px "IBM Plex Sans SC"'

export function createTitleFontPreparation({
  text,
  fontSet = globalThis.document?.fonts,
  schedule = globalThis.setTimeout,
  cancel = globalThis.clearTimeout,
}) {
  let started = false
  let finished = false
  let timerId = null
  let resolveReady
  const ready = new Promise((resolve) => {
    resolveReady = resolve
  })

  function clearTimeoutJob() {
    if (timerId == null) return
    cancel(timerId)
    timerId = null
  }

  function finish(fontReady) {
    if (finished) return
    finished = true
    clearTimeoutJob()
    resolveReady(fontReady)
  }

  return {
    ready,
    start() {
      if (started || finished) return
      started = true
      if (typeof fontSet?.load !== 'function') {
        finish(false)
        return
      }
      try {
        timerId = schedule(() => finish(false), TITLE_FONT_LOAD_TIMEOUT_MS)
        Promise.resolve(fontSet.load(TITLE_FONT_SHORTHAND, text)).then(
          (faces) => finish((faces?.length ?? 0) > 0),
          () => finish(false),
        )
      } catch {
        finish(false)
      }
    },
    cancel() {
      finish(false)
    },
  }
}
```

- [ ] **Step 4: Run the font preparation test and verify GREEN**

Run:

```powershell
..\.tools\node\node.exe --test src/features/auth/titleFont.test.js
```

Expected: PASS, 4 tests, 0 failures.

- [ ] **Step 5: Commit the font preparation controller**

```powershell
git add WuwaFrontend/src/features/auth/titleFont.js WuwaFrontend/src/features/auth/titleFont.test.js
git commit -m "fix: prepare homepage title fonts before animation"
```

### Task 2: Gate title animation startup on stable fonts

**Files:**
- Modify: `WuwaFrontend/src/features/auth/useTitleAnimation.test.js`
- Modify: `WuwaFrontend/src/features/auth/useTitleAnimation.js`

- [ ] **Step 1: Extend the composable contract test and verify RED**

Add these assertions to `title animation composable owns browser preferences, lifecycle, and cleanup` in `WuwaFrontend/src/features/auth/useTitleAnimation.test.js`:

```js
assert.match(source, /import \{ createTitleFontPreparation \} from '\.\/titleFont\.js'/)
assert.match(source, /let fontPreparation = null/)
assert.match(source, /let stopped = false/)
assert.match(source, /onMounted\(async \(\) => \{/)
assert.match(source, /fontPreparation = createTitleFontPreparation\(\{\s+text,\s+fontSet: documentTarget\?\.fonts,/)
assert.match(source, /fontPreparation\.start\(\)\s+const fontReady = await fontPreparation\.ready/)
assert.match(source, /if \(stopped \|\| isComplete\.value\) return/)
assert.match(source, /if \(!fontReady \|\| documentTarget\?\.hidden \|\| reducedMotionQuery\.matches \|\| compactViewportQuery\.matches\) \{\s+complete\(\)/)
assert.match(source, /stopped = true\s+fontPreparation\?\.cancel\(\)/)
```

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src/features/auth/useTitleAnimation.test.js
```

Expected: FAIL because the composable currently starts `createTitleAnimation()` without preparing the final title font.

- [ ] **Step 2: Wire font preparation into the composable**

In `WuwaFrontend/src/features/auth/useTitleAnimation.js`, add the import:

```js
import { createTitleFontPreparation } from './titleFont.js'
```

Add these fields beside the existing animation field:

```js
let animation = null
let fontPreparation = null
let stopped = false
```

Replace the existing `onMounted` callback with:

```js
onMounted(async () => {
  if (!shouldPlay) return
  if (documentTarget?.hidden || reducedMotionQuery.matches || compactViewportQuery.matches) {
    complete()
    return
  }
  documentTarget?.addEventListener('visibilitychange', handleDocumentVisibility)
  reducedMotionQuery.addEventListener('change', handleStaticPreference)
  compactViewportQuery.addEventListener('change', handleStaticPreference)
  fontPreparation = createTitleFontPreparation({
    text,
    fontSet: documentTarget?.fonts,
  })
  fontPreparation.start()
  const fontReady = await fontPreparation.ready
  if (stopped || isComplete.value) return
  if (!fontReady || documentTarget?.hidden || reducedMotionQuery.matches || compactViewportQuery.matches) {
    complete()
    return
  }
  animation = createTitleAnimation({
    text,
    onFrame: (frame) => {
      displayedTitle.value = frame
    },
    onComplete: () => {
      isComplete.value = true
    },
  })
  animation.start()
})
```

Start the existing `onBeforeUnmount` callback with cancellation state:

```js
onBeforeUnmount(() => {
  stopped = true
  fontPreparation?.cancel()
  animation?.cancel()
```

Keep the existing listener removal statements after those lines.

- [ ] **Step 3: Run focused auth animation tests and verify GREEN**

Run:

```powershell
..\.tools\node\node.exe --test src/features/auth/titleFont.test.js src/features/auth/titleAnimation.test.js src/features/auth/useTitleAnimation.test.js src/features/auth/LoginView.test.js src/architecture.test.js src/design-state-accent.test.js
```

Expected: PASS with the existing complete-grapheme, card-gating, responsive, reduced-motion, and architecture contracts unchanged.

- [ ] **Step 4: Commit the composable integration**

```powershell
git add WuwaFrontend/src/features/auth/useTitleAnimation.js WuwaFrontend/src/features/auth/useTitleAnimation.test.js
git commit -m "fix: wait for stable title fonts before typing"
```

### Task 3: Align long-term rules and verify the cold-cache behavior

**Files:**
- Modify: `docs/web-homepage-terminal-design.md`
- Modify: `docs/archive/2026-07-14-homepage-typewriter-animation-implementation.md`

- [ ] **Step 1: Add the stable-font rule to the homepage design documentation**

Under the existing title-motion bullets in `docs/web-homepage-terminal-design.md`, add:

```markdown
- 逐字动画开始前必须按完整标题准备最终字体字形；若字体准备失败或超过 180ms，直接显示完整标题和认证卡片，不带着 fallback 字体播放。
```

- [ ] **Step 2: Run the complete frontend test suite**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\npm.cmd test
```

Expected: PASS, including the four new title-font preparation tests, with 0 failures.

- [ ] **Step 3: Run the production build**

Run:

```powershell
..\.tools\node\npm.cmd run build
```

Expected: Vite exits with code 0; no font file path is hardcoded in application source.

- [ ] **Step 4: Verify cold-cache desktop and compact behavior in the browser**

Start Vite on an unused localhost port with an unreachable backend target, then use the in-app browser on that new origin.

Desktop checks:

- Sample every 20ms from initial blank title through card entry.
- `document.fonts.status` may be `loading` while the visible title is empty, but must remain `loaded` after the first non-empty title frame.
- Every non-empty frame is a complete grapheme prefix of “欢迎回家，漂泊者”.
- `.terminal-auth-wrapper` remains absent until the complete title finishes, then appears.
- Login/register switching and empty-form validation remain functional.
- Browser console contains no warning or error.

Compact check at 390px:

- Full title and authentication card are present immediately.
- Caret is hidden.
- `scrollWidth === clientWidth`.

Stop the exact Vite process after verification.

- [ ] **Step 5: Update the implementation archive with actual evidence**

Append a section named `## 字体闪烁修复` to `docs/archive/2026-07-14-homepage-typewriter-animation-implementation.md` containing the verified root cause, the font preparation controller, the exact final test count, the production build result, and the cold-cache browser observations from Step 4. Do not claim browser checks that were not performed.

- [ ] **Step 6: Run repository hygiene checks and commit documentation**

Run from the repository root:

```powershell
git status --short
git diff --check
```

Expected: only the two intentional documentation files are modified, and `git diff --check` exits with code 0.

Commit:

```powershell
git add docs/web-homepage-terminal-design.md docs/archive/2026-07-14-homepage-typewriter-animation-implementation.md
git commit -m "docs: record stable homepage title font loading"
```

- [ ] **Step 7: Confirm the final branch state**

Run:

```powershell
git status --short --branch
```

Expected: clean `codex/workbench-terminal-ui` working tree with only intentional commits ahead of its remote tracking branch.
