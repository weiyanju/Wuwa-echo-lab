# Homepage Complete-Glyph Typewriter Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage title's width-clipping animation with complete-grapheme typing while keeping the authentication card unavailable until the title finishes.

**Architecture:** Add a small framework-independent title animation controller that owns grapheme segmentation, timing, completion, and cancellation. `LoginView.vue` connects that controller to Vue lifecycle state and conditionally mounts the authentication card; feature CSS owns only the caret and entry transitions, with no animated layout properties.

**Tech Stack:** Vue 3 Composition API, native `Intl.Segmenter`, CSS transitions/keyframes, Node.js built-in test runner, Vite.

---

## File ownership map

- Create `WuwaFrontend/src/features/auth/titleAnimation.js`: pure grapheme segmentation, timing policy, animation controller, completion and cancellation.
- Create `WuwaFrontend/src/features/auth/titleAnimation.test.js`: deterministic unit tests with an injected manual scheduler.
- Modify `WuwaFrontend/src/features/auth/LoginView.vue`: Vue lifecycle wiring, stable accessible title, independent caret, and authentication-card mount timing.
- Modify `WuwaFrontend/src/features/auth/LoginView.test.js`: component source-contract and static-content regression tests.
- Modify `WuwaFrontend/src/styles/features/auth.css`: remove width clipping, style the caret, define the 160ms card entry, and preserve static responsive/reduced-motion states.
- Modify `WuwaFrontend/src/design-state-accent.test.js`: replace the old width-animation contract with the complete-glyph caret contract.
- Modify `WuwaFrontend/src/architecture.test.js`: update the narrow-screen ownership assertion.
- Modify `docs/web-homepage-terminal-design.md`: make complete-grapheme typing and delayed authentication entry long-term homepage rules.
- Create `docs/archive/2026-07-14-homepage-typewriter-animation-implementation.md`: record shipped behavior and verification.

### Task 1: Build the deterministic complete-grapheme animation controller

**Files:**
- Create: `WuwaFrontend/src/features/auth/titleAnimation.test.js`
- Create: `WuwaFrontend/src/features/auth/titleAnimation.js`

- [ ] **Step 1: Write the failing controller tests**

Create `WuwaFrontend/src/features/auth/titleAnimation.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TITLE_CHARACTER_INTERVAL_MS,
  TITLE_PUNCTUATION_PAUSE_MS,
  TITLE_START_DELAY_MS,
  createTitleAnimation,
  shouldAnimateTitle,
  splitTitleGraphemes,
} from './titleAnimation.js'

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
  }
}

test('splitTitleGraphemes keeps a joined emoji in one visible frame', () => {
  assert.deepEqual(splitTitleGraphemes('欢迎👨‍👩‍👧‍👦'), ['欢', '迎', '👨‍👩‍👧‍👦'])
  assert.deepEqual(splitTitleGraphemes('欢迎回家，漂泊者', null), ['欢', '迎', '回', '家', '，', '漂', '泊', '者'])
})

test('createTitleAnimation emits complete prefixes and completes after the punctuation pause', () => {
  const scheduler = createManualScheduler()
  const frames = []
  let completionCount = 0
  const animation = createTitleAnimation({
    text: '欢迎回家，漂泊者',
    onFrame: (frame) => frames.push(frame),
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
  assert.deepEqual(delays, [
    TITLE_START_DELAY_MS,
    TITLE_CHARACTER_INTERVAL_MS,
    TITLE_CHARACTER_INTERVAL_MS,
    TITLE_CHARACTER_INTERVAL_MS,
    TITLE_CHARACTER_INTERVAL_MS,
    TITLE_CHARACTER_INTERVAL_MS + TITLE_PUNCTUATION_PAUSE_MS,
    TITLE_CHARACTER_INTERVAL_MS,
    TITLE_CHARACTER_INTERVAL_MS,
    TITLE_CHARACTER_INTERVAL_MS,
  ])
  assert.equal(completionCount, 1)
})

test('completion and scheduler failures reveal the full title while static conditions skip animation', () => {
  const scheduler = createManualScheduler()
  const frames = []
  let completionCount = 0
  const animation = createTitleAnimation({
    text: '欢迎回家，漂泊者',
    onFrame: (frame) => frames.push(frame),
    onComplete: () => { completionCount += 1 },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  })

  animation.start()
  animation.complete()
  animation.complete()

  assert.deepEqual(frames, ['', '欢迎回家，漂泊者'])
  assert.equal(completionCount, 1)
  assert.equal(shouldAnimateTitle({ reduceMotion: false, compactViewport: false, documentHidden: false }), true)
  assert.equal(shouldAnimateTitle({ reduceMotion: true, compactViewport: false, documentHidden: false }), false)
  assert.equal(shouldAnimateTitle({ reduceMotion: false, compactViewport: true, documentHidden: false }), false)
  assert.equal(shouldAnimateTitle({ reduceMotion: false, compactViewport: false, documentHidden: true }), false)

  const failureFrames = []
  let failureCompletionCount = 0
  const failingAnimation = createTitleAnimation({
    text: '欢迎回家，漂泊者',
    onFrame: (frame) => failureFrames.push(frame),
    onComplete: () => { failureCompletionCount += 1 },
    schedule: () => { throw new Error('timer unavailable') },
    cancel: () => {},
  })
  failingAnimation.start()

  assert.deepEqual(failureFrames, ['', '欢迎回家，漂泊者'])
  assert.equal(failureCompletionCount, 1)
})
```

- [ ] **Step 2: Run the controller test and verify RED**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src/features/auth/titleAnimation.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `titleAnimation.js`, proving the new behavior is not implemented.

- [ ] **Step 3: Implement the minimal animation controller**

Create `WuwaFrontend/src/features/auth/titleAnimation.js`:

```js
export const TITLE_START_DELAY_MS = 150
export const TITLE_CHARACTER_INTERVAL_MS = 70
export const TITLE_PUNCTUATION_PAUSE_MS = 120

export function splitTitleGraphemes(text, Segmenter = globalThis.Intl?.Segmenter) {
  if (!Segmenter) return Array.from(text)
  const segmenter = new Segmenter('zh-CN', { granularity: 'grapheme' })
  return Array.from(segmenter.segment(text), ({ segment }) => segment)
}

export function shouldAnimateTitle({ reduceMotion, compactViewport, documentHidden }) {
  return !reduceMotion && !compactViewport && !documentHidden
}

function delayAfter(grapheme) {
  return TITLE_CHARACTER_INTERVAL_MS
    + (grapheme === '，' ? TITLE_PUNCTUATION_PAUSE_MS : 0)
}

export function createTitleAnimation({
  text,
  onFrame,
  onComplete,
  schedule = globalThis.setTimeout,
  cancel = globalThis.clearTimeout,
}) {
  const graphemes = splitTitleGraphemes(text)
  let currentIndex = 0
  let timerId = null
  let started = false
  let finished = false

  function clearScheduledFrame() {
    if (timerId == null) return
    cancel(timerId)
    timerId = null
  }

  function finish({ revealFullTitle = true } = {}) {
    if (finished) return
    finished = true
    clearScheduledFrame()
    if (revealFullTitle) onFrame(text)
    onComplete()
  }

  function scheduleNext(callback, delay) {
    try {
      timerId = schedule(callback, delay)
    } catch {
      finish()
    }
  }

  function advance() {
    if (finished) return
    currentIndex += 1
    onFrame(graphemes.slice(0, currentIndex).join(''))
    if (currentIndex >= graphemes.length) {
      scheduleNext(
        () => finish({ revealFullTitle: false }),
        TITLE_CHARACTER_INTERVAL_MS,
      )
      return
    }
    scheduleNext(advance, delayAfter(graphemes[currentIndex - 1]))
  }

  return {
    start() {
      if (started || finished) return
      started = true
      onFrame('')
      if (!graphemes.length) {
        finish()
        return
      }
      scheduleNext(advance, TITLE_START_DELAY_MS)
    },
    complete() {
      finish()
    },
    cancel() {
      if (finished) return
      finished = true
      clearScheduledFrame()
    },
  }
}
```

- [ ] **Step 4: Run the controller test and verify GREEN**

Run:

```powershell
..\.tools\node\node.exe --test src/features/auth/titleAnimation.test.js
```

Expected: PASS, 3 tests, 0 failures.

- [ ] **Step 5: Commit the controller**

```powershell
git add WuwaFrontend/src/features/auth/titleAnimation.js WuwaFrontend/src/features/auth/titleAnimation.test.js
git commit -m "feat: add complete-glyph title animation controller"
```

### Task 2: Wire the controller into the login view and gate the authentication card

**Files:**
- Modify: `WuwaFrontend/src/features/auth/LoginView.test.js`
- Modify: `WuwaFrontend/src/features/auth/LoginView.vue`

- [ ] **Step 1: Add the failing component contract test**

Append this test to `WuwaFrontend/src/features/auth/LoginView.test.js`:

```js
test('login view reveals complete title graphemes before mounting the authentication card', async () => {
  const source = await readFile(new URL('./LoginView.vue', import.meta.url), 'utf8')

  assert.match(source, /import \{ createTitleAnimation, shouldAnimateTitle \} from '\.\/titleAnimation\.js'/)
  assert.match(source, /const terminalTitle = '欢迎回家，漂泊者'/)
  assert.match(source, /const displayedTerminalTitle = ref\(shouldPlayTitleAnimation \? '' : terminalTitle\)/)
  assert.match(source, /const isTerminalTitleComplete = ref\(!shouldPlayTitleAnimation\)/)
  assert.match(source, /onComplete: \(\) => \{\s+isTerminalTitleComplete\.value = true/)
  assert.match(source, /<h1 class="terminal-title" :aria-label="terminalTitle">\s*<span aria-hidden="true">\{\{ displayedTerminalTitle \}\}<\/span>\s*<span class="terminal-title-caret" aria-hidden="true"><\/span>\s*<\/h1>/)
  assert.match(source, /<Transition name="terminal-auth">\s*<div v-if="isTerminalTitleComplete" class="terminal-auth-wrapper">/)
  assert.match(source, /function handleDocumentVisibility\(\) \{\s+if \(document\.hidden\) completeTitleAnimation\(\)/)
  assert.match(source, /onBeforeUnmount\(\(\) => \{[\s\S]+titleAnimation\?\.cancel\(\)/)
})
```

- [ ] **Step 2: Run the login-view test and verify RED**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src/features/auth/LoginView.test.js
```

Expected: FAIL because `LoginView.vue` has no controller import, reactive title, stable animated-title markup, or conditional authentication mount.

- [ ] **Step 3: Add Vue lifecycle state and cleanup**

Replace the Vue import at the top of `WuwaFrontend/src/features/auth/LoginView.vue` and insert the title setup before `terminalFeatures`:

```js
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { createTitleAnimation, shouldAnimateTitle } from './titleAnimation.js'

const terminalTitle = '欢迎回家，漂泊者'
const reducedMotionQuery = typeof window === 'undefined'
  ? null
  : window.matchMedia('(prefers-reduced-motion: reduce)')
const compactViewportQuery = typeof window === 'undefined'
  ? null
  : window.matchMedia('(max-width: 520px)')
const shouldPlayTitleAnimation = Boolean(reducedMotionQuery && compactViewportQuery)
  && shouldAnimateTitle({
    reduceMotion: reducedMotionQuery.matches,
    compactViewport: compactViewportQuery.matches,
    documentHidden: document.hidden,
  })
const displayedTerminalTitle = ref(shouldPlayTitleAnimation ? '' : terminalTitle)
const isTerminalTitleComplete = ref(!shouldPlayTitleAnimation)
let titleAnimation = null

function completeTitleAnimation() {
  if (titleAnimation) {
    titleAnimation.complete()
    return
  }
  displayedTerminalTitle.value = terminalTitle
  isTerminalTitleComplete.value = true
}

function handleDocumentVisibility() {
  if (document.hidden) completeTitleAnimation()
}

function handleStaticTitlePreference(event) {
  if (event.matches) completeTitleAnimation()
}

onMounted(() => {
  if (!shouldPlayTitleAnimation) return
  titleAnimation = createTitleAnimation({
    text: terminalTitle,
    onFrame: (frame) => {
      displayedTerminalTitle.value = frame
    },
    onComplete: () => {
      isTerminalTitleComplete.value = true
    },
  })
  document.addEventListener('visibilitychange', handleDocumentVisibility)
  reducedMotionQuery.addEventListener('change', handleStaticTitlePreference)
  compactViewportQuery.addEventListener('change', handleStaticTitlePreference)
  titleAnimation.start()
})

onBeforeUnmount(() => {
  titleAnimation?.cancel()
  document.removeEventListener('visibilitychange', handleDocumentVisibility)
  reducedMotionQuery?.removeEventListener('change', handleStaticTitlePreference)
  compactViewportQuery?.removeEventListener('change', handleStaticTitlePreference)
})
```

- [ ] **Step 4: Replace the title and authentication wrapper markup**

Replace the one-line title with:

```vue
<div class="terminal-title-wrapper">
  <h1 class="terminal-title" :aria-label="terminalTitle">
    <span aria-hidden="true">{{ displayedTerminalTitle }}</span>
    <span class="terminal-title-caret" aria-hidden="true"></span>
  </h1>
</div>
```

Wrap the existing `.terminal-auth-wrapper` block without changing its card, tabs, fields, validation, or submit handlers:

```vue
<Transition name="terminal-auth">
  <div v-if="isTerminalTitleComplete" class="terminal-auth-wrapper">
    <div class="terminal-auth-card">
      <div class="terminal-auth-tabs">
        <button v-for="tab in authTabs" :key="tab.mode" class="terminal-tab-btn" :class="{ active: authForm.mode === tab.mode }" type="button" @click="selectAuthMode(tab.mode)">{{ tab.label }}</button>
        <div class="terminal-tab-indicator" :style="{ transform: `translateX(${authModeIndex * 100}%)` }"></div>
      </div>

      <form class="terminal-form-view" @submit.prevent="submitAuth">
        <label class="terminal-input-group">
          {{ isRegister ? '新建操作员账号' : '操作员账号' }}
          <input v-model="authForm.username" class="terminal-standard-input" autocomplete="username" placeholder="请输入账号" :aria-invalid="Boolean(displayedError)" :aria-errormessage="displayedError ? 'auth-form-error' : undefined" />
        </label>
        <label class="terminal-input-group">
          {{ isRegister ? '设置访问密钥' : '访问密钥' }}
          <input v-model="authForm.password" class="terminal-standard-input" type="password" :autocomplete="isRegister ? 'new-password' : 'current-password'" placeholder="••••••••" :aria-invalid="Boolean(displayedError)" :aria-errormessage="displayedError ? 'auth-form-error' : undefined" />
        </label>
        <label v-if="isRegister" class="terminal-input-group">
          确认访问密钥
          <input v-model="confirmPassword" class="terminal-standard-input" type="password" autocomplete="new-password" placeholder="再次输入密钥" :aria-invalid="Boolean(displayedError)" :aria-errormessage="displayedError ? 'auth-form-error' : undefined" />
        </label>
        <label v-else class="terminal-form-options"><input v-model="saveLogin" type="checkbox" /> 保持连接状态</label>
        <p v-if="displayedError" id="auth-form-error" class="error-text" role="alert">{{ displayedError }}</p>
        <button class="terminal-primary-btn" type="submit">{{ isRegister ? 'INIT_REGISTER()' : 'EXECUTE_LOGIN()' }}</button>
      </form>
    </div>
  </div>
</Transition>
```

- [ ] **Step 5: Run the controller and login-view tests and verify GREEN**

Run:

```powershell
..\.tools\node\node.exe --test src/features/auth/titleAnimation.test.js src/features/auth/LoginView.test.js
```

Expected: PASS, including the existing authentication-state, validation, submit, error-association, and register-tab contracts.

- [ ] **Step 6: Commit the Vue integration**

```powershell
git add WuwaFrontend/src/features/auth/LoginView.vue WuwaFrontend/src/features/auth/LoginView.test.js
git commit -m "feat: reveal homepage title by complete glyph"
```

### Task 3: Replace width clipping with a following caret and a gated card transition

**Files:**
- Modify: `WuwaFrontend/src/design-state-accent.test.js`
- Modify: `WuwaFrontend/src/architecture.test.js`
- Modify: `WuwaFrontend/src/features/auth/LoginView.test.js`
- Modify: `WuwaFrontend/src/styles/features/auth.css`

- [ ] **Step 1: Replace the old style assertions with failing complete-glyph assertions**

In `WuwaFrontend/src/design-state-accent.test.js`, replace `.terminal-title` with `.terminal-title-caret` in `functionalSideLineSelectors`, then replace the test named `the functional login caret finishes beside the title instead of at the column edge` with:

```js
test('the functional login caret follows complete glyphs without width clipping', async () => {
  const authStyle = await read('./styles/features/auth.css')

  assert.match(authStyle, /\.terminal-title \{[\s\S]+display: inline-flex;[\s\S]+align-items: baseline;/)
  assert.match(authStyle, /\.terminal-title-caret \{[\s\S]+width: 4px;[\s\S]+margin-inline-start: 0\.14em;[\s\S]+animation: terminal-blink/)
  assert.match(authStyle, /\.terminal-auth-enter-active \{[\s\S]+160ms/)
  assert.match(authStyle, /\.terminal-auth-enter-from \{[\s\S]+opacity: 0;[\s\S]+translateY\(12px\)/)
  assert.doesNotMatch(authStyle, /@keyframes terminal-typing/)
  assert.doesNotMatch(authStyle, /\.terminal-title \{[^}]+(?:width: 0|overflow: hidden|border-right:)/)
})
```

In `WuwaFrontend/src/architecture.test.js`, replace the current narrow-title assertion with:

```js
assert.match(auth, /@media \(max-width: 520px\)[\s\S]+\.terminal-title \{[\s\S]+white-space: normal;[\s\S]+\.terminal-title-caret \{ display: none; \}/)
```

In the `login view keeps content visible without motion and defines a complete dark palette` test in `WuwaFrontend/src/features/auth/LoginView.test.js`, replace the authentication animation assertions with:

```js
assert.match(style, /\.terminal-auth-wrapper \{ opacity: 1; \}/)
assert.match(style, /\.terminal-auth-enter-active \{[^}]+160ms/)
assert.match(style, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]+\.terminal-title-caret \{ display: none; \}[\s\S]+\.terminal-auth-enter-active \{ transition: none; \}/)
```

Keep the existing subtitle, feature-grid, dark-palette, and dark-navbar assertions.

- [ ] **Step 2: Run the focused style tests and verify RED**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src/design-state-accent.test.js src/architecture.test.js src/features/auth/LoginView.test.js
```

Expected: FAIL because CSS still contains `width: 0`, `overflow: hidden`, the title border caret, `terminal-typing`, and the 1.1-second authentication animation.

- [ ] **Step 3: Replace the title and card animation CSS**

Replace the `.terminal-title` block in `WuwaFrontend/src/styles/features/auth.css` with:

```css
.terminal-title {
  display: inline-flex;
  max-width: 100%;
  align-items: baseline;
  margin: 0;
  color: var(--terminal-text);
  font-family: var(--font-title);
  font-size: 56px;
  font-weight: var(--weight-title);
  letter-spacing: var(--tracking-cjk);
  line-height: 1.1;
  white-space: nowrap;
}

.terminal-title-caret {
  width: 4px;
  height: 0.95em;
  flex: 0 0 4px;
  align-self: center;
  margin-inline-start: 0.14em;
  background: var(--terminal-primary);
  animation: terminal-blink 0.8s step-end infinite;
}
```

Replace the current one-line `.terminal-auth-wrapper` rule with:

```css
.terminal-auth-wrapper { opacity: 1; }
.terminal-auth-enter-active { transition: opacity 160ms cubic-bezier(0.16, 1, 0.3, 1), transform 160ms cubic-bezier(0.16, 1, 0.3, 1); }
.terminal-auth-enter-from { opacity: 0; transform: translateY(12px); }
```

Delete `@keyframes terminal-typing` and replace `terminal-blink` with:

```css
@keyframes terminal-blink { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
```

Replace the reduced-motion rule with:

```css
@media (prefers-reduced-motion: reduce) {
  .terminal-home::before, .terminal-system-status span { animation: none; }
  .terminal-subtitle, .terminal-features-grid { opacity: 1; transform: none; animation: none; }
  .terminal-title-caret { display: none; }
  .terminal-auth-enter-active { transition: none; }
  .terminal-feature-item { transition: none; }
  .terminal-feature-item:hover { transform: none; }
}
```

Replace the mobile `.terminal-title` declaration and add the static caret rule inside `@media (max-width: 520px)`:

```css
.terminal-title { max-width: 100%; font-size: 36px; white-space: normal; }
.terminal-title-caret { display: none; }
```

- [ ] **Step 4: Run the focused style tests and verify GREEN**

Run:

```powershell
..\.tools\node\node.exe --test src/design-state-accent.test.js src/architecture.test.js src/features/auth/LoginView.test.js
```

Expected: PASS with no width-animation or responsive-ownership regression.

- [ ] **Step 5: Commit the motion styles**

```powershell
git add WuwaFrontend/src/styles/features/auth.css WuwaFrontend/src/design-state-accent.test.js WuwaFrontend/src/architecture.test.js WuwaFrontend/src/features/auth/LoginView.test.js
git commit -m "fix: prevent partial glyphs in homepage title"
```

### Task 4: Align the long-term homepage motion documentation

**Files:**
- Modify: `docs/web-homepage-terminal-design.md`

- [ ] **Step 1: Update the homepage motion rules**

Add these bullets under `## 4. 动效`, after the existing allowed-motion list:

```markdown
- 主标题打字效果必须按完整 Unicode 字素推进，不得通过连续 `width`、`max-width`、`clip-path` 或 `overflow` 裁切整段文字。
- 蓝色光标使用独立行内元素跟随当前文字末端，不以标题容器边框模拟。
- 桌面端认证卡片等待标题完成后再进入；等待期间不能进入焦点顺序、指针命中区域或无障碍树。
- 减少动态效果、520px 及以下窄屏和后台页面直接显示完整标题与认证卡片。
```

Add this item to `## 9. 验收清单`:

```markdown
- 标题动画任意帧只显示完整字素，认证卡片在标题完成前不可交互，完成后立即可用。
```

- [ ] **Step 2: Check documentation formatting and commit**

Run from the repository root:

```powershell
git diff --check
```

Expected: exit code 0 with no whitespace errors.

Then commit:

```powershell
git add docs/web-homepage-terminal-design.md
git commit -m "docs: specify complete-glyph homepage motion"
```

### Task 5: Run full verification and record delivery

**Files:**
- Create: `docs/archive/2026-07-14-homepage-typewriter-animation-implementation.md`

- [ ] **Step 1: Run the complete frontend test suite**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\npm.cmd test
```

Expected: PASS, including all new controller, component, architecture, authentication, and style tests; 0 failures.

- [ ] **Step 2: Run the production build**

Run:

```powershell
..\.tools\node\npm.cmd run build
```

Expected: Vite exits with code 0 and produces the ignored `dist/` output.

- [ ] **Step 3: Verify the live animation in the browser**

From the repository root, start the frontend at `http://127.0.0.1:5174/` with an unreachable backend target so the login view is deterministic:

```powershell
$env:VITE_BACKEND_TARGET='http://127.0.0.1:65535'
$preview = Start-Process -FilePath '..\.tools\node\node.exe' -ArgumentList 'node_modules\vite\bin\vite.js','--host','127.0.0.1','--port','5174','--strictPort' -WorkingDirectory 'WuwaFrontend' -WindowStyle Hidden -PassThru
$preview.Id
```

Use the in-app Browser workflow at `http://127.0.0.1:5174/` to verify:

- Desktop: every sampled title frame is a valid prefix of “欢迎回家，漂泊者”; no half glyph is visible.
- Desktop: the independent blue caret follows the visible text and ends beside “者”.
- Desktop: `.terminal-auth-wrapper` is absent before title completion and appears immediately after completion.
- After entry: login/register switching, text input, validation, checkbox state, and submit wiring remain available.
- Mid-animation backgrounding: returning shows the complete title and authentication card without replay.
- Reduced motion: full title and card are present immediately, and the caret does not blink.
- 520px and below: full title and card are present immediately, wrapping is natural, and `scrollWidth === clientWidth`.

Stop the exact local Vite process after verification:

```powershell
Stop-Process -Id $preview.Id
```

- [ ] **Step 4: Create the implementation archive**

Create `docs/archive/2026-07-14-homepage-typewriter-animation-implementation.md` with this content after Steps 1 through 3 pass:

```markdown
# 首页完整字素打字机动画实施记录

## 实施结果

- 首页标题改为按完整 Unicode 字素逐帧显示，不再使用宽度裁切，因此动画过程中不会出现半个汉字。
- 蓝色光标成为独立行内元素，并跟随当前文字末端。
- 桌面端认证卡片等待标题完成后进入；等待期间不进入焦点顺序、指针命中区域或无障碍树。
- 减少动态效果、520px 及以下窄屏和页面后台状态直接完成标题并显示认证卡片。
- 登录、注册、校验、账号保存、提交和后续 UID 绑定数据流未改变。

## 验证

- 前端完整测试通过，0 失败。
- Vite 生产构建通过。
- 桌面端浏览器逐帧检查通过，每一帧均为完整标题的合法字素前缀，光标停在完整标题末端。
- 认证卡片显隐时序通过：标题完成前不存在可交互表单，完成后登录与注册操作正常。
- 减少动态效果和窄屏浏览器检查通过，完整标题与认证卡片立即显示，页面无横向溢出。
```

- [ ] **Step 5: Perform repository hygiene checks and commit the archive**

Run from the repository root:

```powershell
git status --short
git diff --check
```

Expected: only the new archive file is uncommitted, and `git diff --check` exits with code 0.

Commit:

```powershell
git add docs/archive/2026-07-14-homepage-typewriter-animation-implementation.md
git commit -m "docs: record homepage title animation delivery"
```

- [ ] **Step 6: Confirm the final branch state**

Run:

```powershell
git status --short --branch
```

Expected: clean `codex/workbench-terminal-ui` working tree with only the branch's intentional commits ahead of its remote tracking branch.
