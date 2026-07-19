# Login Card UID Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone Web UID setup page with a first-bind page inside the existing login card while freezing the surrounding login page.

**Architecture:** `LoginView.vue` remains the owner of the terminal homepage and gains a controlled `auth` / `uid` card stage. A focused `UidBindingPanel.vue` owns only UID input normalization, local validation, focus, and presentation; `App.vue` retains authentication, `GameAccount`, bind, refresh, and sign-out orchestration. The obsolete standalone view and stylesheet are removed after the new path is covered.

**Tech Stack:** Vue 3 Composition API, CSS transitions, Node test runner, Vite.

---

## File map

- Create `WuwaFrontend/src/features/auth/UidBindingPanel.vue`: login-card UID form and local interaction state.
- Create `WuwaFrontend/src/features/auth/UidBindingPanel.test.js`: source-contract tests for validation, accessibility, focus, busy state, and emitted commands.
- Create `WuwaFrontend/src/features/auth/uidBinding.js`: normalized first-bind validation owned by the new auth-entry flow.
- Create `WuwaFrontend/src/features/auth/uidBinding.test.js`: UID validation unit tests.
- Modify `WuwaFrontend/src/features/auth/LoginView.vue`: controlled internal card stage and event forwarding.
- Modify `WuwaFrontend/src/features/auth/LoginView.test.js`: frozen-shell and internal-navigation contracts.
- Modify `WuwaFrontend/src/App.vue`: render `LoginView` for both unauthenticated and locked-account states.
- Modify `WuwaFrontend/src/App.test.js`: orchestration contracts for auth, first bind, and sign-out.
- Modify `WuwaFrontend/src/styles/features/auth.css`: internal page layout, directional transition, UID form, dark and reduced-motion states.
- Modify `WuwaFrontend/src/style.css`: remove the obsolete UID stylesheet import and add the Hallmark fingerprint.
- Modify `WuwaFrontend/src/architecture.test.js`: ownership, line-budget, Hallmark, and removed-file assertions.
- Modify `DESIGN.md`: declare the login entry as a documented page-specific visual exception.
- Modify `docs/web-homepage-terminal-design.md`: align the login-card radius guidance with the approved current page.
- Create `docs/archive/2026-07-19-login-card-uid-onboarding-implementation.md`: record delivered behavior and verification.
- Delete `WuwaFrontend/src/features/workspace/UidSetupView.vue`: obsolete standalone page.
- Delete `WuwaFrontend/src/features/workspace/UidSetupView.test.js`: superseded view tests.
- Delete `WuwaFrontend/src/features/workspace/uidSetup.js`: validation moves with its owner.
- Delete `WuwaFrontend/src/features/workspace/uidSetup.test.js`: validation tests move with their owner.
- Delete `WuwaFrontend/src/styles/features/uid-setup.css`: obsolete standalone page styles.

### Task 1: Add first-bind validation to the login entry feature

**Files:**
- Create: `WuwaFrontend/src/features/auth/uidBinding.test.js`
- Create: `WuwaFrontend/src/features/auth/uidBinding.js`

- [ ] **Step 1: Write the failing validation test**

Create `WuwaFrontend/src/features/auth/uidBinding.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { validateUidBinding } from './uidBinding.js'

const UID_ERROR = '请输入 9 位数字 UID。'

test('uid binding normalizes mixed input and accepts exactly nine digits', () => {
  assert.deepEqual(validateUidBinding('UID 123-456-789'), { uid: '123456789', error: '' })
})

test('uid binding rejects invalid lengths without truncating', () => {
  assert.deepEqual(validateUidBinding('12345678'), { uid: '12345678', error: UID_ERROR })
  assert.deepEqual(validateUidBinding('1234567890'), { uid: '1234567890', error: UID_ERROR })
})

test('uid binding rejects full-width digits', () => {
  assert.deepEqual(validateUidBinding('１２３４５６７８９'), { uid: '', error: UID_ERROR })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run from `WuwaFrontend`:

```powershell
& '..\.tools\node\node.exe' --test src\features\auth\uidBinding.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `uidBinding.js`.

- [ ] **Step 3: Add the minimal validator**

Create `WuwaFrontend/src/features/auth/uidBinding.js`:

```js
import { isValidPlayerUid, normalizePlayerUid } from '../../services/playerUid.js'

export const UID_BINDING_ERROR = '请输入 9 位数字 UID。'

export function validateUidBinding(value) {
  const uid = normalizePlayerUid(value)
  return {
    uid,
    error: isValidPlayerUid(uid) ? '' : UID_BINDING_ERROR,
  }
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```powershell
& '..\.tools\node\node.exe' --test src\features\auth\uidBinding.test.js
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add WuwaFrontend/src/features/auth/uidBinding.js WuwaFrontend/src/features/auth/uidBinding.test.js
git commit -m "feat: add auth entry uid binding validation"
```

### Task 2: Build the focused UID binding card page

**Files:**
- Create: `WuwaFrontend/src/features/auth/UidBindingPanel.test.js`
- Create: `WuwaFrontend/src/features/auth/UidBindingPanel.vue`

- [ ] **Step 1: Write failing component source contracts**

Create `WuwaFrontend/src/features/auth/UidBindingPanel.test.js` with assertions for:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readPanel() {
  return readFile(new URL('./UidBindingPanel.vue', import.meta.url), 'utf8')
}

test('uid binding panel validates normalized input before emitting bind', async () => {
  const source = await readPanel()
  assert.match(source, /import \{ validateUidBinding \} from '\.\/uidBinding\.js'/)
  assert.match(source, /uidBinding\.value = normalizePlayerUid\(uidBinding\.value\)/)
  assert.match(source, /const \{ uid, error \} = validateUidBinding\(uidBinding\.value\)/)
  assert.match(source, /if \(error\) \{\s+validationError\.value = error\s+return\s+\}\s+emit\('bind', uid\)/)
})

test('uid binding panel exposes an in-card sign-out return action', async () => {
  const source = await readPanel()
  assert.match(source, /aria-label="退出当前账号并返回登录"/)
  assert.match(source, /title="退出当前账号并返回登录"/)
  assert.match(source, /@click="emit\('cancel'\)"/)
  assert.match(source, /<h2>绑定游戏 UID<\/h2>/)
  assert.doesNotMatch(source, /uid-setup-shell|uid-setup-topbar|disabled-tabs/)
})

test('uid binding panel associates errors and hints and focuses the uid input', async () => {
  const source = await readPanel()
  assert.match(source, /const uidInput = ref\(null\)/)
  assert.match(source, /onMounted\(\(\) => uidInput\.value\?\.focus\(\)\)/)
  assert.match(source, /ref="uidInput"/)
  assert.match(source, /aria-errormessage="uid-binding-error"/)
  assert.match(source, /:aria-describedby="inputDescription"/)
  assert.match(source, /id="uid-binding-error"[^>]*role="alert"/)
  assert.match(source, /id="uid-binding-hint"/)
})

test('uid binding panel disables every command while busy', async () => {
  const source = await readPanel()
  assert.equal((source.match(/:disabled="busy"/g) || []).length, 3)
  assert.match(source, /\{\{ busy \? 'BINDING\(\)' : 'BIND_AND_ENTER\(\)' \}\}/)
})
```

- [ ] **Step 2: Run the component test and verify RED**

Run:

```powershell
& '..\.tools\node\node.exe' --test src\features\auth\UidBindingPanel.test.js
```

Expected: FAIL because `UidBindingPanel.vue` does not exist.

- [ ] **Step 3: Implement the minimal panel**

Create `UidBindingPanel.vue` with:

- props `busy` and `error`;
- emits `bind`, `clear-error`, and `cancel`;
- `normalizePlayerUid` on input and `validateUidBinding` on submit;
- a `44 × 44px` icon button before the title, with an inline 24px line-arrow SVG;
- copy `首次进入需要绑定一个游戏账号。`, label `游戏 UID`, placeholder `输入你的 UID`, hint `可在游戏个人信息页查看 UID`;
- root class `terminal-card-page terminal-uid-page`;
- `onMounted(() => uidInput.value?.focus())`;
- all three interactive controls disabled while `busy`.

- [ ] **Step 4: Run validator and panel tests and verify GREEN**

Run:

```powershell
& '..\.tools\node\node.exe' --test src\features\auth\uidBinding.test.js src\features\auth\UidBindingPanel.test.js
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add WuwaFrontend/src/features/auth/UidBindingPanel.vue WuwaFrontend/src/features/auth/UidBindingPanel.test.js
git commit -m "feat: add login card uid binding panel"
```

### Task 3: Add controlled internal navigation to the login card

**Files:**
- Modify: `WuwaFrontend/src/features/auth/LoginView.test.js`
- Modify: `WuwaFrontend/src/features/auth/LoginView.vue`

- [ ] **Step 1: Add failing navigation and frozen-shell tests**

Append tests that assert:

```js
test('login card switches between controlled auth and uid pages', async () => {
  const source = await readFile(new URL('./LoginView.vue', import.meta.url), 'utf8')
  assert.match(source, /import UidBindingPanel from '\.\/UidBindingPanel\.vue'/)
  assert.match(source, /view: \{\s+type: String,\s+default: 'auth'/)
  assert.match(source, /const cardTransitionName = computed\(\(\) => \(props\.view === 'uid' \? 'terminal-card-forward' : 'terminal-card-back'\)\)/)
  assert.match(source, /<Transition :name="cardTransitionName" mode="out-in">/)
  assert.match(source, /v-if="view === 'auth'"/)
  assert.match(source, /<UidBindingPanel[\s\S]+:busy="uidBusy"[\s\S]+@bind="emit\('bind', \$event\)"[\s\S]+@cancel="emit\('sign-out'\)"/)
})

test('uid onboarding does not change the terminal homepage shell', async () => {
  const source = await readFile(new URL('./LoginView.vue', import.meta.url), 'utf8')
  assert.equal((source.match(/class="terminal-home"/g) || []).length, 1)
  assert.equal((source.match(/class="terminal-navbar"/g) || []).length, 1)
  assert.equal((source.match(/class="terminal-hero-content"/g) || []).length, 1)
  assert.equal((source.match(/class="terminal-auth-card"/g) || []).length, 1)
  assert.doesNotMatch(source, /uid-setup-shell|uid-setup-card|uid-setup-media/)
})
```

Update the existing emit assertion from `['submit']` to:

```js
const emit = defineEmits(['submit', 'bind', 'clear-error', 'sign-out'])
```

- [ ] **Step 2: Run the login view test and verify RED**

Run:

```powershell
& '..\.tools\node\node.exe' --test src\features\auth\LoginView.test.js
```

Expected: the new controlled-stage assertions fail.

- [ ] **Step 3: Implement the controlled card stage**

In `LoginView.vue`:

- import `UidBindingPanel`;
- extend props with `view` and `uidBusy`;
- extend emits with `bind`, `clear-error`, and `sign-out`;
- compute `cardTransitionName`;
- keep `.terminal-home`, navbar, hero copy, features, title animation, and `.terminal-auth-card` unchanged;
- wrap the existing tabs and auth form in `<div v-if="view === 'auth'" key="auth" class="terminal-card-page terminal-credentials-page">`;
- render `UidBindingPanel` in the `v-else` branch and forward events;
- use `<Transition :name="cardTransitionName" mode="out-in">` inside the one existing card.

- [ ] **Step 4: Run auth tests and verify GREEN**

Run:

```powershell
& '..\.tools\node\node.exe' --test src\features\auth\LoginView.test.js src\features\auth\UidBindingPanel.test.js src\features\auth\uidBinding.test.js
```

Expected: all auth feature tests pass.

- [ ] **Step 5: Commit**

```powershell
git add WuwaFrontend/src/features/auth/LoginView.vue WuwaFrontend/src/features/auth/LoginView.test.js
git commit -m "feat: navigate uid onboarding inside login card"
```

### Task 4: Route locked accounts through the login card

**Files:**
- Modify: `WuwaFrontend/src/App.test.js`
- Modify: `WuwaFrontend/src/App.vue`
- Delete: `WuwaFrontend/src/features/workspace/UidSetupView.vue`
- Delete: `WuwaFrontend/src/features/workspace/UidSetupView.test.js`
- Delete: `WuwaFrontend/src/features/workspace/uidSetup.js`
- Delete: `WuwaFrontend/src/features/workspace/uidSetup.test.js`

- [ ] **Step 1: Replace standalone-page expectations with failing orchestration assertions**

Update the milestone and locked-state tests to require:

```js
assert.doesNotMatch(appSource, /import UidSetupView/)
assert.match(appSource, /const uidFlowBusy = computed\(\(\) => accountChanging\.value \|\| gameAccount\.loading\.value \|\| auth\.loading\.value\)/)
assert.match(appSource, /<LoginView[\s\S]+v-else-if="!user \|\| gameAccount\.workspaceLocked\.value"[\s\S]+:view="user \? 'uid' : 'auth'"[\s\S]+:uid-busy="uidFlowBusy"[\s\S]+@submit="submitAuth"[\s\S]+@bind="submitUidBinding"[\s\S]+@clear-error="error = ''"[\s\S]+@sign-out="signOut"/)
assert.match(loginSource, /<UidBindingPanel/)
assert.doesNotMatch(appSource, /<UidSetupView/)
```

Remove tests that require the old topbar, disabled workbench tabs, media illustration, theme button, and standalone shell.

- [ ] **Step 2: Run App tests and verify RED**

Run:

```powershell
& '..\.tools\node\node.exe' --test src\App.test.js
```

Expected: FAIL because `App.vue` still imports and renders `UidSetupView`.

- [ ] **Step 3: Implement the minimal App orchestration**

In `App.vue`:

```js
const uidFlowBusy = computed(() => accountChanging.value || gameAccount.loading.value || auth.loading.value)
```

Remove the `UidSetupView` import. Replace the two branches with one controlled view:

```vue
<LoginView
  v-else-if="!user || gameAccount.workspaceLocked.value"
  :view="user ? 'uid' : 'auth'"
  :uid-busy="uidFlowBusy"
  :error="error"
  @submit="submitAuth"
  @bind="submitUidBinding"
  @clear-error="error = ''"
  @sign-out="signOut"
/>
```

Keep `submitAuth`, `submitUidBinding`, `changeGameAccount`, and `signOut` as orchestration owners.

- [ ] **Step 4: Delete the unused standalone view and run tests**

Delete `UidSetupView.vue`, `UidSetupView.test.js`, `uidSetup.js`, and `uidSetup.test.js`, then run:

```powershell
& '..\.tools\node\node.exe' --test src\App.test.js src\features\auth\LoginView.test.js src\features\auth\UidBindingPanel.test.js
```

Expected: all selected tests pass and no test reads the removed view.

- [ ] **Step 5: Commit**

```powershell
git add WuwaFrontend/src/App.vue WuwaFrontend/src/App.test.js WuwaFrontend/src/features/workspace/UidSetupView.vue WuwaFrontend/src/features/workspace/UidSetupView.test.js
git commit -m "refactor: route initial uid binding through login card"
```

### Task 5: Move visual ownership into auth styles and stamp Hallmark

**Files:**
- Modify: `WuwaFrontend/src/architecture.test.js`
- Modify: `WuwaFrontend/src/styles/features/auth.css`
- Modify: `WuwaFrontend/src/style.css`
- Delete: `WuwaFrontend/src/styles/features/uid-setup.css`

- [ ] **Step 1: Write failing style ownership tests**

Replace the UID setup ownership test with assertions that:

```js
assert.doesNotMatch(entry, /uid-setup\.css/)
assert.match(auth, /\.terminal-card-page \{/)
assert.match(auth, /\.terminal-uid-back \{[\s\S]+width: 44px;[\s\S]+height: 44px;/)
assert.match(auth, /\.terminal-uid-input \{[\s\S]+font-family: var\(--font-data\);[\s\S]+font-variant-numeric: tabular-nums;/)
assert.match(auth, /\.terminal-card-forward-enter-from \{[^}]+translateX\(16px\)/)
assert.match(auth, /\.terminal-card-back-enter-from \{[^}]+translateX\(-16px\)/)
assert.match(auth, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]+\.terminal-card-forward-enter-active/)
```

Update line budgets to remove `UidSetupView.vue` and `uid-setup.css`, allow `LoginView.vue` at most 145 lines, `UidBindingPanel.vue` at most 115 lines, `auth.css` at most 410 lines, and `style.css` at most 22 lines.

Add Hallmark assertions:

```js
assert.match(entry, /^\/\*\s*\n \* Hallmark/)
assert.match(entry, /Genre: modern minimal data workbench/)
assert.match(entry, /Tone: restrained terminal entry, calm analytical workspace/)
assert.match(entry, /Palette anchor: Tethys blue/)
assert.match(entry, /Structural fingerprint: split terminal entry → task-focused workbench/)
```

- [ ] **Step 2: Run architecture tests and verify RED**

Run:

```powershell
& '..\.tools\node\node.exe' --test src\architecture.test.js
```

Expected: FAIL on the new auth ownership and Hallmark assertions.

- [ ] **Step 3: Add internal-page styles**

Append to `auth.css`:

- `.terminal-card-page` and `.terminal-credentials-page` flex layout;
- `.terminal-uid-page`, `.terminal-uid-header`, `.terminal-uid-title`, `.terminal-uid-copy`;
- `.terminal-uid-back` with a 44px target, transparent base, and visible hover/focus;
- `.terminal-uid-input` using Data typography and tabular numerals;
- directional transition classes using only `opacity` and `translateX(±16px)` over `180ms`;
- disabled states and dark-theme input/focus states;
- reduced-motion overrides that remove transforms and transitions;
- narrow-screen spacing adjustments without changing the outer layout.

- [ ] **Step 4: Stamp the stylesheet entry and remove legacy import**

At the top of `style.css`, before imports, add:

```css
/*
 * Hallmark
 * Genre: modern minimal data workbench
 * Tone: restrained terminal entry, calm analytical workspace
 * Palette anchor: Tethys blue
 * Structural fingerprint: split terminal entry → task-focused workbench
 */
```

Remove only:

```css
@import './styles/features/uid-setup.css';
```

Delete `WuwaFrontend/src/styles/features/uid-setup.css`.

- [ ] **Step 5: Run focused style and component tests**

Run:

```powershell
& '..\.tools\node\node.exe' --test src\architecture.test.js src\features\auth\LoginView.test.js src\features\auth\UidBindingPanel.test.js
```

Expected: all selected tests pass.

- [ ] **Step 6: Commit**

```powershell
git add WuwaFrontend/src/architecture.test.js WuwaFrontend/src/style.css WuwaFrontend/src/styles/features/auth.css WuwaFrontend/src/styles/features/uid-setup.css
git commit -m "style: integrate uid binding into login card"
```

### Task 6: Align long-term design documentation

**Files:**
- Modify: `DESIGN.md`
- Modify: `docs/web-homepage-terminal-design.md`

- [ ] **Step 1: Add the login-entry exception to `DESIGN.md`**

Near the global navigation and UID rules, record that the entry page follows `docs/web-homepage-terminal-design.md`, may use the approved 2–4px terminal corner language, and stays unified through typography, Tethys blue, 1px borders, hierarchy, and restrained motion rather than identical radii.

- [ ] **Step 2: Correct the page-specific radius guidance**

In `docs/web-homepage-terminal-design.md`:

- remove the statement that the page should move to 18–24px cards and 10–14px fields;
- state that the current 2–4px card, field, and button language is approved for this entry surface;
- add a subsection that first UID binding is an internal login-card page;
- define the in-card sign-out return action and the frozen outer page.

- [ ] **Step 3: Verify documentation consistency**

Run:

```powershell
rg -n "18px - 24px|10px - 14px|登录框内部|退出当前账号并返回登录|2px|4px" DESIGN.md docs\web-homepage-terminal-design.md docs\superpowers\specs\2026-07-19-login-card-uid-onboarding-design.md
git diff --check
```

Expected: no stale large-radius requirement for the login card, approved internal-flow language is present, and `git diff --check` exits 0.

- [ ] **Step 4: Commit**

```powershell
git add DESIGN.md docs/web-homepage-terminal-design.md
git commit -m "docs: align login entry and uid onboarding rules"
```

### Task 7: Full verification and delivery record

**Files:**
- Create: `docs/archive/2026-07-19-login-card-uid-onboarding-implementation.md`

- [ ] **Step 1: Run the complete frontend test suite**

Run from `WuwaFrontend`:

```powershell
& '..\.tools\node\npm.cmd' test
```

Expected: exit 0 with zero failed tests.

- [ ] **Step 2: Run the production build**

Run:

```powershell
& '..\.tools\node\npm.cmd' run build
```

Expected: Vite exits 0 and emits the production bundle.

- [ ] **Step 3: Run static hygiene checks**

Run from the repository root:

```powershell
git diff --check
rg -n "UidSetupView|uid-setup\.css|uid-setup-shell|uid-setup-card" WuwaFrontend/src
git status --short
```

Expected: `git diff --check` exits 0; legacy search has no matches; status contains only intended implementation and archive changes.

- [ ] **Step 4: Perform browser regression**

At desktop width, verify:

1. Unauthenticated page matches the frozen outer shell.
2. Login with an account that has no bound UID keeps the same outer page and switches only the card.
3. UID page shows the 44px in-card back icon and focuses the UID input.
4. Invalid UID stays on the page with an accessible error.
5. Back signs out and reverse-transitions to auth.
6. Valid UID binds and enters the workbench.
7. Existing-UID login enters the workbench directly.
8. Reduced-motion emulation removes directional motion.
9. At 860px and 520px, no horizontal overflow or clipped controls appears.

- [ ] **Step 5: Record the implementation**

Create `docs/archive/2026-07-19-login-card-uid-onboarding-implementation.md` with:

- the delivered controlled-card flow;
- removed legacy files;
- unchanged backend and account-menu contracts;
- automated commands and results;
- browser viewport and reduced-motion evidence;
- any verification not performed and why.

- [ ] **Step 6: Commit the delivery record**

```powershell
git add docs/archive/2026-07-19-login-card-uid-onboarding-implementation.md
git commit -m "docs: record login card uid onboarding delivery"
```
