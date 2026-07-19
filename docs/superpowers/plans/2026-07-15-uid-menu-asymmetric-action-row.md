# UID Menu Asymmetric Action Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate sign-out footer with a non-equal same-row action layout that keeps account creation prominent and sign-out low-frequency, while switching the secondary action to cancel during UID entry.

**Architecture:** Preserve the existing account events and validation flow. Move the submit control outside the UID form through the HTML `form` attribute, render one persistent two-column action container, and conditionally swap `添加 UID / 退出登录` for `确认添加 / 取消`. Keep all account-shell styling in `shell.css`, replacing the superseded footer rules so the file remains within its 920-line architecture boundary.

**Tech Stack:** Vue 3 Composition API, CSS Grid, CSS custom properties, Node.js built-in test runner, Vite.

---

## File map

- Modify `WuwaFrontend/src/components/controls/UidSwitcher.test.js`: lock the default and adding-state structure, cancel focus restoration, asymmetric grid, typography, colors, and removal of the footer.
- Modify `WuwaFrontend/src/components/controls/UidSwitcher.vue`: add cancel focus behavior, move submit into a shared action row, and conditionally swap the right-side action.
- Modify `WuwaFrontend/src/styles/shell.css`: replace footer styles with the asymmetric action grid; refine menu surface, typography, and light/dark interaction states without exceeding 920 lines.
- Modify `DESIGN.md`: replace the independent sign-out-footer rule with the durable non-equal same-row rule.
- Modify `docs/superpowers/specs/2026-07-15-uid-menu-asymmetric-action-row-design.md` only if implementation reveals a contradiction; do not silently change the approved design to match code.
- Create `docs/archive/2026-07-15-uid-menu-asymmetric-action-row-implementation.md`: record actual implementation and verification results.

### Task 1: Lock the new component structure and cancellation behavior

**Files:**
- Modify: `WuwaFrontend/src/components/controls/UidSwitcher.test.js`
- Test: `WuwaFrontend/src/components/controls/UidSwitcher.test.js`

- [x] **Step 1: Replace the footer structure assertion with failing action-row assertions**

Update the existing sign-out structure test so it requires one persistent action container, conditional left and right controls, and no footer:

```js
test('uid switcher uses one asymmetric action row for default and adding states', async () => {
  const source = await readComponent()

  assert.match(source, /<div class="uid-switcher-actions" role="none">/)
  assert.match(source, /v-if="adding"[\s\S]*class="uid-switcher-submit"[\s\S]*form="uid-switcher-add-form"[\s\S]*>确认添加<\/button>/)
  assert.match(source, /v-else[\s\S]*ref="addButton"[\s\S]*class="uid-switcher-add"[\s\S]*添加 UID/)
  assert.match(source, /v-if="adding"[\s\S]*class="uid-switcher-cancel"[\s\S]*@click="cancelAddAccount"[\s\S]*>取消<\/button>/)
  assert.match(source, /v-else[\s\S]*class="uid-switcher-sign-out"[\s\S]*role="menuitem"[\s\S]*@click="emit\('sign-out'\)"[\s\S]*>退出登录<\/button>/)
  assert.doesNotMatch(source, /uid-switcher-footer/)
})
```

- [x] **Step 2: Add a failing cancellation focus test**

Add this source-contract test:

```js
test('cancelling uid entry restores the add action and its focus', async () => {
  const source = await readComponent()

  assert.match(source, /const addButton = ref\(null\)/)
  assert.match(source, /function cancelAddAccount\(\) \{[\s\S]*resetAddForm\(\)[\s\S]*nextTick\(\(\) => \{[\s\S]*addButton\.value\?\.focus\(\)/)
  assert.match(source, /<form v-if="adding" id="uid-switcher-add-form"/)
})
```

- [x] **Step 3: Replace footer CSS assertions with failing asymmetric layout assertions**

In the existing shell-style test, read these rules:

```js
const menuRule = styles.match(/^\.uid-switcher-menu \{([^}]+)\}/m)?.[1] || ''
const menuTopRule = styles.match(/^\.uid-switcher-menu-top \{([^}]+)\}/m)?.[1] || ''
const menuCountRule = styles.match(/^\.uid-switcher-menu-top strong \{([^}]+)\}/m)?.[1] || ''
const actionsRule = styles.match(/^\.uid-switcher-actions \{([^}]+)\}/m)?.[1] || ''
const submitRule = styles.match(/^\.uid-switcher-submit \{([^}]+)\}/m)?.[1] || ''
const addRule = styles.match(/^\.uid-switcher-add \{([^}]+)\}/m)?.[1] || ''
const signOutRule = styles.match(/^\.uid-switcher-sign-out,\r?\n\.uid-switcher-cancel \{([^}]+)\}/m)?.[1] || ''
```

Require the approved geometry and hierarchy:

```js
assert.match(menuRule, /width: min\(320px, calc\(100vw - 32px\)\)/)
assert.match(menuRule, /border-radius: 16px/)
assert.match(menuRule, /padding: 16px/)
assert.match(menuRule, /background: #ffffff/)
assert.match(menuRule, /box-shadow: 0 8px 12px rgba\(39, 55, 71, 0\.1\)/)
assert.doesNotMatch(menuRule, /gradient/)
assert.match(menuTopRule, /font-size: var\(--text-label\)/)
assert.match(menuCountRule, /font-family: var\(--font-data\)/)
assert.match(menuCountRule, /font-variant-numeric: tabular-nums/)
assert.match(actionsRule, /display: grid/)
assert.match(actionsRule, /grid-template-columns: minmax\(0, 1fr\) 88px/)
assert.match(actionsRule, /gap: 8px/)
assert.match(actionsRule, /align-items: stretch/)
assert.match(submitRule, /width: 100%/)
assert.doesNotMatch(submitRule, /margin-top/)
assert.match(addRule, /width: 100%/)
assert.match(signOutRule, /width: 100%/)
assert.match(signOutRule, /min-height: 44px/)
assert.match(signOutRule, /font-size: var\(--text-label\)/)
assert.match(signOutRule, /font-weight: var\(--weight-supporting\)/)
assert.doesNotMatch(styles, /\.uid-switcher-footer \{/)
```

Require separate neutral cancel and danger sign-out interaction states in light and dark themes:

```js
assert.match(styles, /^\.uid-switcher-sign-out:hover,\s*\.uid-switcher-sign-out:focus-visible[^{]*\{[^}]*color: var\(--critical\)[^}]*background: rgba\(228, 30, 63, 0\.07\)/m)
assert.match(styles, /^\.uid-switcher-cancel:hover,\s*\.uid-switcher-cancel:focus-visible[^{]*\{[^}]*color: #2f4659[^}]*background: rgba\(82, 102, 117, 0\.08\)/m)
assert.match(styles, /^\.app-shell\.theme-dark \.uid-switcher-sign-out,\s*\.app-shell\.theme-dark \.uid-switcher-cancel[^{]*\{[^}]*color: #aebdca/m)
assert.match(styles, /^\.app-shell\.theme-dark \.uid-switcher-sign-out:hover,\s*\.app-shell\.theme-dark \.uid-switcher-sign-out:focus-visible[^{]*\{[^}]*color: #ffd4db[^}]*background: rgba\(255, 105, 128, 0\.12\)/m)
assert.match(styles, /^\.app-shell\.theme-dark \.uid-switcher-cancel:hover,\s*\.app-shell\.theme-dark \.uid-switcher-cancel:focus-visible[^{]*\{[^}]*color: #eef5f9[^}]*background: rgba\(255, 255, 255, 0\.08\)/m)
```

- [x] **Step 4: Run the focused test and verify RED**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src\components\controls\UidSwitcher.test.js
```

Expected: failure because the current component still renders `uid-switcher-footer`, has no cancel action, and the current CSS has no `uid-switcher-actions` grid.

### Task 2: Implement the shared action row and cancel focus behavior

**Files:**
- Modify: `WuwaFrontend/src/components/controls/UidSwitcher.vue`
- Test: `WuwaFrontend/src/components/controls/UidSwitcher.test.js`

- [x] **Step 1: Add the add-action ref and cancel handler**

Add the ref beside the existing button/input refs:

```js
const addButton = ref(null)
```

Add the cancellation function after `startAddAccount()`:

```js
function cancelAddAccount() {
  resetAddForm()
  nextTick(() => {
    addButton.value?.focus()
  })
}
```

- [x] **Step 2: Convert the form and actions to the approved structure**

Replace the current form, standalone add button, and footer with:

```vue
<form
  v-if="adding"
  id="uid-switcher-add-form"
  class="uid-switcher-field"
  @submit.prevent="submitAddAccount"
>
  <label for="uid-switcher-add-input">新增 UID</label>
  <input
    id="uid-switcher-add-input"
    ref="addInput"
    v-model="draftUid"
    inputmode="numeric"
    autocomplete="off"
    placeholder="输入 9 位 UID"
    :disabled="busy"
    :aria-invalid="Boolean(displayedError)"
    aria-describedby="uid-switcher-add-error"
  />
  <p v-if="displayedError" id="uid-switcher-add-error" class="uid-switcher-error" role="alert">{{ displayedError }}</p>
</form>

<div class="uid-switcher-actions" role="none">
  <button
    v-if="adding"
    class="uid-switcher-submit"
    type="submit"
    form="uid-switcher-add-form"
    :disabled="busy"
  >确认添加</button>
  <button
    v-else
    ref="addButton"
    class="uid-switcher-add"
    type="button"
    :disabled="addDisabled"
    @click="startAddAccount"
  >
    {{ addLimitReached ? '已达上限' : '添加 UID' }}
  </button>

  <button
    v-if="adding"
    class="uid-switcher-cancel"
    type="button"
    @click="cancelAddAccount"
  >取消</button>
  <button
    v-else
    class="uid-switcher-sign-out"
    type="button"
    role="menuitem"
    @click="emit('sign-out')"
  >退出登录</button>
</div>
```

- [x] **Step 3: Run the focused component test**

Run:

```powershell
..\.tools\node\node.exe --test src\components\controls\UidSwitcher.test.js
```

Expected: structure and cancel-focus tests pass; CSS hierarchy assertions remain red until Task 3.

### Task 3: Implement menu surface, typography, and non-equal action styling

**Files:**
- Modify: `WuwaFrontend/src/styles/shell.css`
- Test: `WuwaFrontend/src/components/controls/UidSwitcher.test.js`
- Verify: `WuwaFrontend/src/architecture.test.js`

- [x] **Step 1: Refine the menu surface and header typography**

Update `.uid-switcher-menu` to use:

```css
.uid-switcher-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 40;
  display: grid;
  width: min(320px, calc(100vw - 32px));
  gap: 12px;
  border: 1px solid rgba(206, 219, 231, 0.92);
  border-radius: 16px;
  padding: 16px;
  color: var(--ink-deep);
  background: #ffffff;
  box-shadow: 0 8px 12px rgba(39, 55, 71, 0.1);
}
```

Set `.uid-switcher-menu-top` to `var(--text-label)` and keep weight at `var(--weight-label)`. Replace the count rule with this compact data-style declaration:

```css
.uid-switcher-menu-top strong { color: #2f4659; font-family: var(--font-data); font-size: var(--text-label); font-weight: var(--weight-data); line-height: var(--leading-data); letter-spacing: var(--tracking-data); font-variant-numeric: tabular-nums; }
```

- [x] **Step 2: Replace footer rules with the asymmetric action grid**

Remove `.uid-switcher-footer` and add:

```css
.uid-switcher-actions { display: grid; grid-template-columns: minmax(0, 1fr) 88px; gap: 8px; align-items: stretch; }
```

Update `.uid-switcher-submit` and `.uid-switcher-add` to include `width: 100%` and `min-width: 0`; remove `margin-top` from submit.

Replace the sign-out rule with shared low-frequency control geometry:

```css
.uid-switcher-sign-out, .uid-switcher-cancel { width: 100%; min-width: 0; min-height: 44px; border: 0; border-radius: 8px; padding: 0 8px; color: #6f8293; background: transparent; font-family: var(--font-ui); font-size: var(--text-label); font-weight: var(--weight-supporting); line-height: var(--leading-label); cursor: pointer; }
.uid-switcher-sign-out:hover, .uid-switcher-sign-out:focus-visible { color: var(--critical); background: rgba(228, 30, 63, 0.07); }
.uid-switcher-cancel:hover, .uid-switcher-cancel:focus-visible { color: #2f4659; background: rgba(82, 102, 117, 0.08); }
```

Do not add a new disabled state to cancel: the existing busy watcher closes the menu before that state can remain visible.

- [x] **Step 3: Update dark-theme rules**

Replace the dark menu surface with this solid surface and shorter shadow:

```css
.app-shell.theme-dark .uid-switcher-menu { border-color: rgba(83, 107, 124, 0.72); color: var(--ink-deep); background: var(--surface-soft); box-shadow: 0 8px 12px rgba(0, 0, 0, 0.24); }
```

Remove dark footer rules and add:

```css
.app-shell.theme-dark .uid-switcher-sign-out, .app-shell.theme-dark .uid-switcher-cancel { color: #aebdca; }
.app-shell.theme-dark .uid-switcher-sign-out:hover, .app-shell.theme-dark .uid-switcher-sign-out:focus-visible { color: #ffd4db; background: rgba(255, 105, 128, 0.12); }
.app-shell.theme-dark .uid-switcher-cancel:hover, .app-shell.theme-dark .uid-switcher-cancel:focus-visible { color: #eef5f9; background: rgba(255, 255, 255, 0.08); }
```

- [x] **Step 4: Keep the shell architecture boundary**

Delete the existing light and dark `.uid-switcher-footer` declarations. Keep the action row, shared control geometry, light interaction states, dark shared color, and dark interaction states in the one-line rule forms shown above; keep the menu count rule on one line and replace the multi-line menu gradient with one solid-background declaration. Do not change the architecture limit or compress unrelated selectors. Verify the same command catches both visual contract and line growth:

```powershell
..\.tools\node\node.exe --test src\components\controls\UidSwitcher.test.js src\architecture.test.js
```

Expected: all focused and architecture tests pass, and `shell.css` remains at or below 920 logical lines.

### Task 4: Update the durable design rule

**Files:**
- Modify: `DESIGN.md`
- Reference: `docs/superpowers/specs/2026-07-15-uid-menu-asymmetric-action-row-design.md`

- [x] **Step 1: Replace the superseded footer rule in `DESIGN.md`**

Use this durable rule:

```markdown
- UID 菜单锚定 UID 胶囊本身。默认操作区使用非等权同行布局：左列 `minmax(0, 1fr)` 承载“添加 UID”，右列固定 88px 承载低频“退出登录”，列间距 8px；两项均保持至少 44px 高，但通过宽度、颜色、填充和字号区分权重，不使用 50/50 等分、独立退出行、分隔线或图标。进入新增状态后，左侧切换为单色主蓝“确认添加”，右侧切换为中性“取消”；退出登录默认透明且只在 hover / focus-visible 进入弱危险态。
```

- [x] **Step 2: Check specification consistency**

Confirm the long-term rule matches the approved design spec for default, adding, capacity, light, dark, focus, and narrow-screen states. Do not edit the spec to excuse an implementation gap.

### Task 5: Full verification and implementation archive

**Files:**
- Create: `docs/archive/2026-07-15-uid-menu-asymmetric-action-row-implementation.md`

- [x] **Step 1: Run focused tests**

```powershell
..\.tools\node\node.exe --test src\components\controls\UidSwitcher.test.js src\architecture.test.js
```

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

Inspect only the scoped UID menu diff and preserve unrelated existing modifications.

- [x] **Step 5: Perform visual QA when the local page is reachable**

Verify default, adding, validation-error, capacity, light, dark, and narrow-screen states. If the local page remains unavailable, record the exact limitation in the implementation archive and do not claim screenshot verification.

- [x] **Step 6: Write the implementation archive**

Record the actual files changed, red-green evidence, test totals, build result, architecture line count, visual-QA status, and the fact that no commit was created unless the user separately requested one.

No commit, stage, push, or pull request is part of this plan unless the user requests it separately.
