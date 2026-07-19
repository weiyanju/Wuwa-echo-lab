# UID Menu Action Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the UID menu’s gradient submit button and disconnected sign-out text with the approved system-blue primary button and neutral lightweight menu row.

> **Current sign-out decision (2026-07-15):** After comparing both versions, the user explicitly reactivated the neutral lightweight menu row and then refined its label to horizontal center alignment. The current design spec, regression test, and implementation use that row; any divided transparent sign-out detail or left-aligned example elsewhere in the historical plan is superseded.

**Architecture:** Keep all account behavior and Vue structure unchanged. Lock the visual contract with the existing source-based component test suite, then update only shell-owned styles and the long-term design rule. Preserve the current dirty worktree and do not create commits unless the user explicitly requests them.

**Tech Stack:** Vue 3, CSS custom properties, Node.js built-in test runner, Vite.

---

## File map

- Modify `WuwaFrontend/src/components/controls/UidSwitcher.test.js`: assert the approved submit and sign-out visual contracts.
- Modify `WuwaFrontend/src/styles/shell.css`: implement solid primary submit, neutral sign-out row, hover/focus danger state, and dark theme equivalents.
- Modify `DESIGN.md`: make the UID menu action hierarchy durable.
- Verify `WuwaFrontend/src/architecture.test.js`: retain the existing `shell.css` line-count boundary.

### Task 1: Lock the UID menu visual contract

**Files:**
- Modify: `WuwaFrontend/src/components/controls/UidSwitcher.test.js`
- Test: `WuwaFrontend/src/components/controls/UidSwitcher.test.js`

- [ ] **Step 1: Add a shell-style reader and failing visual-contract test**

Add this helper beside `readComponent()`:

```js
async function readShellStyles() {
  return readFile(new URL('../../styles/shell.css', import.meta.url), 'utf8')
}
```

Add this test:

```js
test('uid menu uses the solid primary submit and lightweight sign out hierarchy', async () => {
  const styles = await readShellStyles()
  const submitRule = styles.match(/^\.uid-switcher-submit \{([^}]+)\}/m)?.[1] || ''
  const signOutRule = styles.match(/\.uid-switcher-sign-out \{([^}]+)\}/)?.[1] || ''

  assert.match(submitRule, /border: 1px solid var\(--primary\)/)
  assert.match(submitRule, /background: var\(--primary\)/)
  assert.match(submitRule, /box-shadow: none/)
  assert.doesNotMatch(submitRule, /gradient/)
  assert.match(styles, /\.uid-switcher-submit:hover:not\(:disabled\)[^{]*\{[^}]*background: var\(--primary-deep\)/)
  assert.match(signOutRule, /min-height: 40px/)
  assert.match(signOutRule, /border: 1px solid transparent/)
  assert.match(signOutRule, /border-radius: 12px/)
  assert.match(signOutRule, /background: rgba\(82, 102, 117, 0\.05\)/)
  assert.doesNotMatch(signOutRule, /border-top/)
  assert.match(styles, /\.uid-switcher-sign-out:hover,[\s\S]*\.uid-switcher-sign-out:focus-visible[^{]*\{[^}]*color: var\(--critical\)/)
})
```

- [ ] **Step 2: Run the focused test and verify the intended failure**

Run `..\.tools\node\node.exe --test src\components\controls\UidSwitcher.test.js` from `WuwaFrontend`.

Expected: FAIL because the submit still contains a gradient and shadow, and sign out still contains `border-top` with a transparent background.

### Task 2: Implement the approved light and dark states

**Files:**
- Modify: `WuwaFrontend/src/styles/shell.css:71-72`
- Modify: `WuwaFrontend/src/styles/shell.css:547-579`
- Test: `WuwaFrontend/src/components/controls/UidSwitcher.test.js`

- [ ] **Step 1: Replace the submit button styling**

```css
.uid-switcher-submit {
  min-height: 42px;
  border: 1px solid var(--primary);
  border-radius: 12px;
  color: #ffffff;
  background: var(--primary);
  font-family: var(--font-ui);
  font-size: var(--text-control);
  font-weight: var(--weight-control);
  line-height: var(--leading-control);
  cursor: pointer;
  box-shadow: none;
}
.uid-switcher-submit:hover:not(:disabled) { border-color: var(--primary-deep); background: var(--primary-deep); }
```

- [ ] **Step 2: Replace the sign-out row styling**

```css
.uid-switcher-sign-out { min-height: 40px; border: 1px solid transparent; border-radius: 12px; padding: 0 12px; color: #526575; background: rgba(82, 102, 117, 0.05); font-family: var(--font-ui); font-size: var(--text-control); font-weight: var(--weight-control); line-height: var(--leading-control); text-align: left; cursor: pointer; }
.uid-switcher-sign-out:hover,
.uid-switcher-sign-out:focus-visible { border-color: rgba(228, 30, 63, 0.14); color: var(--critical); background: rgba(228, 30, 63, 0.07); }
```

Update dark mode without changing geometry:

```css
.app-shell.theme-dark .uid-switcher-submit { border-color: var(--primary); color: #07131d; background: var(--primary); }
.app-shell.theme-dark .uid-switcher-submit:hover:not(:disabled) { border-color: #7cbcff; background: #7cbcff; }
.app-shell.theme-dark .uid-switcher-sign-out { border-color: transparent; color: #c8d5df; background: rgba(255, 255, 255, 0.05); }
.app-shell.theme-dark .uid-switcher-sign-out:hover,
.app-shell.theme-dark .uid-switcher-sign-out:focus-visible { border-color: rgba(255, 105, 128, 0.22); color: #ffd4db; background: rgba(255, 105, 128, 0.12); }
```

- [ ] **Step 3: Run focused and architecture tests**

Run `..\.tools\node\node.exe --test src\components\controls\UidSwitcher.test.js src\architecture.test.js` from `WuwaFrontend`.

Expected: PASS, including the `shell.css` maximum line-count assertion.

### Task 3: Synchronize the long-term design rule

**Files:**
- Modify: `DESIGN.md:384`

- [ ] **Step 1: Clarify the durable UID menu rule**

```markdown
- 退出登录属于低频账号命令，进入 UID 菜单底部并使用同宽轻量菜单行：默认保持中性弱底色，hover / focus-visible 才进入危险态；不作为顶部导航中的常驻独立按钮。新增 UID 的确认提交使用单色泰缇斯蓝实底主按钮，禁止渐变和装饰性投影。
```

- [ ] **Step 2: Run `git diff --check`**

Expected: exit code 0; repository line-ending notices are acceptable, but whitespace errors are not.

### Task 4: Full verification and visual QA

**Files:**
- Verify: `WuwaFrontend/src/components/controls/UidSwitcher.vue`
- Verify: `WuwaFrontend/src/styles/shell.css`
- Verify: `DESIGN.md`

- [ ] **Step 1: Run `..\.tools\node\npm.cmd test` from `WuwaFrontend`**

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run `..\.tools\node\npm.cmd run build` from `WuwaFrontend`**

Expected: Vite exits successfully.

- [ ] **Step 3: Inspect the real component in four states**

- Default menu: sign out is a neutral rounded row without a divider.
- Add mode: confirm is solid system blue with no gradient or shadow.
- Dark theme: sign out remains neutral until hover/focus.
- 320px-class narrow menu: account, input, confirm, and sign out retain shared left/right edges without horizontal overflow.

- [ ] **Step 4: Run `git status --short` and `git diff --check`**

Expected: only intended UID menu files plus previously existing user changes appear; no temporary visual fixture remains.
