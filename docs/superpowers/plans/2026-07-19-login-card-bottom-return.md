# Login Card Bottom Return Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the UID binding header back icon with a centered gray “返回登录” text action below the primary bind button while preserving the existing sign-out behavior and login-card-only scope.

**Architecture:** Keep the existing `cancel` event and `App.vue` sign-out orchestration unchanged. Restructure only `UidBindingPanel.vue`, move the secondary action into a bottom action stack, and replace the icon-specific CSS with token-based text-button states owned by `auth.css`. Update static contracts and long-term design documentation so the implementation and current rules agree.

**Tech Stack:** Vue 3 Single File Components, CSS custom properties, Node.js built-in test runner, Vite 8.

---

## File Structure

- Modify `WuwaFrontend/src/features/auth/UidBindingPanel.vue`: remove the title-row icon and render the existing cancel command as a bottom text button.
- Modify `WuwaFrontend/src/features/auth/UidBindingPanel.test.js`: lock the new visible copy, semantics, command wiring, busy state, and absence of icon markup.
- Modify `WuwaFrontend/src/App.test.js`: keep the login-card-only integration contract while expecting the bottom return action.
- Modify `WuwaFrontend/src/styles/features/auth.css`: restore a single-column UID header and own the bottom action stack plus text-button states.
- Modify `WuwaFrontend/src/architecture.test.js`: replace the obsolete back-icon CSS contract with the new action-stack contract.
- Modify `DESIGN.md`: record the current first-UID-binding secondary-action rule.
- Modify `docs/web-homepage-terminal-design.md`: replace both back-icon rules with the approved bottom text action.
- Create `docs/archive/2026-07-19-login-card-bottom-return-implementation.md`: record the delivered revision and verification evidence.

No production file is created or deleted. No icon asset is added.

### Task 1: Change the UID binding component contract

**Files:**
- Modify: `WuwaFrontend/src/features/auth/UidBindingPanel.test.js`
- Modify: `WuwaFrontend/src/App.test.js`
- Modify: `WuwaFrontend/src/features/auth/UidBindingPanel.vue`

- [ ] **Step 1: Write the failing component test**

Replace the existing return-action assertions in `UidBindingPanel.test.js` with:

```js
test('uid binding panel exposes a bottom sign-out return action', async () => {
  const source = await readPanel()

  assert.match(source, /class="terminal-uid-actions"/)
  assert.match(source, /class="terminal-uid-return"/)
  assert.match(source, /aria-label="退出当前账号并返回登录"/)
  assert.match(source, /title="退出当前账号并返回登录"/)
  assert.match(source, /@click="emit\('cancel'\)"/)
  assert.match(source, />\s*返回登录\s*<\/button>/)
  assert.match(source, /<h2>绑定游戏 UID<\/h2>/)
  assert.doesNotMatch(source, /terminal-uid-back|<svg/)
  assert.doesNotMatch(source, /uid-setup-shell|uid-setup-topbar|disabled-tabs/)
})
```

Keep the existing busy assertion at exactly three `:disabled="busy"` bindings so the UID input, bind button, and return button remain locked together.

- [ ] **Step 2: Update the app-level failing contract**

In `App.test.js`, replace the old `terminal-uid-back` assertion inside `locked uid binding state stays inside the unchanged login page` with:

```js
assert.match(uidBindingSource, /class="terminal-uid-actions"/)
assert.match(uidBindingSource, /class="terminal-uid-return"/)
assert.match(uidBindingSource, />\s*返回登录\s*<\/button>/)
assert.match(uidBindingSource, /aria-label="退出当前账号并返回登录"/)
assert.doesNotMatch(uidBindingSource, /terminal-uid-back|<svg/)
```

Do not change the `LoginView`, outer page, `App.vue`, workspace-lock, or dashboard assertions in that test.

- [ ] **Step 3: Run the focused tests and verify RED**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src/features/auth/UidBindingPanel.test.js src/App.test.js
```

Expected: FAIL because `UidBindingPanel.vue` still renders `terminal-uid-back`, contains an inline `<svg>`, and has no `terminal-uid-actions`, `terminal-uid-return`, or visible `返回登录`.

- [ ] **Step 4: Implement the minimal Vue template**

In `UidBindingPanel.vue`, replace the current two-column header with:

```vue
<header class="terminal-uid-header">
  <div class="terminal-uid-title">
    <h2>绑定游戏 UID</h2>
    <p>首次进入需要绑定一个游戏账号。</p>
  </div>
</header>
```

Keep the UID label, input, error, and hint unchanged. Replace the standalone submit button with:

```vue
<div class="terminal-uid-actions">
  <button class="terminal-primary-btn" type="submit" :disabled="busy">
    {{ busy ? 'BINDING()' : 'BIND_AND_ENTER()' }}
  </button>
  <button
    class="terminal-uid-return"
    type="button"
    aria-label="退出当前账号并返回登录"
    title="退出当前账号并返回登录"
    :disabled="busy"
    @click="emit('cancel')"
  >
    返回登录
  </button>
</div>
```

Do not change `defineEmits`, validation, focus management, normalization, or submit behavior.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```powershell
..\.tools\node\node.exe --test src/features/auth/UidBindingPanel.test.js src/App.test.js
```

Expected: all component and app integration tests pass.

- [ ] **Step 6: Commit the component contract**

```powershell
git add -- WuwaFrontend/src/features/auth/UidBindingPanel.vue WuwaFrontend/src/features/auth/UidBindingPanel.test.js WuwaFrontend/src/App.test.js
git commit -m "refactor: move uid return action below bind"
```

### Task 2: Replace the icon CSS with the bottom action stack

**Files:**
- Modify: `WuwaFrontend/src/architecture.test.js`
- Modify: `WuwaFrontend/src/styles/features/auth.css`

- [ ] **Step 1: Write the failing style ownership contract**

In `architecture.test.js`, replace the obsolete `.terminal-uid-back` geometry assertion with:

```js
assert.match(auth, /\.terminal-uid-actions \{[\s\S]+margin-top: auto;/)
assert.match(auth, /\.terminal-uid-return \{[\s\S]+justify-self: center;[\s\S]+min-height: 44px;[\s\S]+border: 0;[\s\S]+color: var\(--terminal-secondary\);[\s\S]+background: transparent;/)
assert.match(auth, /\.terminal-uid-return:hover:not\(:disabled\),[\s\S]+\.terminal-uid-return:focus-visible,[\s\S]+\.terminal-uid-return:active \{[\s\S]+color: var\(--terminal-text\);/)
assert.match(auth, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]+\.terminal-uid-return \{ transition: none; \}/)
assert.doesNotMatch(auth, /\.terminal-uid-back/)
```

Keep the existing `auth.css` 420-line limit, UID numeric typography assertion, directional card transition assertions, responsive assertions, and legacy UID-setup exclusions.

- [ ] **Step 2: Run the style test and verify RED**

Run:

```powershell
..\.tools\node\node.exe --test src/architecture.test.js
```

Expected: FAIL because `auth.css` still owns `.terminal-uid-back` and has no bottom action-stack styles.

- [ ] **Step 3: Implement the single-column header**

Replace the current grid header and all `.terminal-uid-back` / `.terminal-uid-back svg` / hover rules with:

```css
.terminal-uid-header {
  margin-bottom: 30px;
}
```

This restores the title block to the same left baseline as the field label, input, and hint.

- [ ] **Step 4: Implement the bottom action stack**

Add before `.terminal-primary-btn`:

```css
.terminal-uid-actions {
  display: grid;
  gap: 4px;
  margin-top: auto;
}

.terminal-uid-actions .terminal-primary-btn {
  margin-top: 0;
}

.terminal-uid-return {
  justify-self: center;
  min-width: 104px;
  min-height: 44px;
  border: 0;
  border-radius: var(--terminal-radius-sm);
  padding: 0 12px;
  color: var(--terminal-secondary);
  background: transparent;
  font-family: var(--font-ui);
  font-size: var(--text-control);
  font-weight: var(--weight-control);
  line-height: var(--leading-control);
  letter-spacing: var(--tracking-cjk);
  transition: color 120ms ease-out;
}

.terminal-uid-return:hover:not(:disabled),
.terminal-uid-return:focus-visible,
.terminal-uid-return:active {
  color: var(--terminal-text);
}
```

Use the existing global `button:focus-visible` rule for the 3px Tethys-blue focus outline. Do not suppress the outline in `auth.css`.

- [ ] **Step 5: Preserve disabled, responsive, and reduced-motion behavior**

Replace the disabled selector with:

```css
.terminal-uid-return:disabled,
.terminal-primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}
```

Inside `@media (prefers-reduced-motion: reduce)`, add:

```css
.terminal-uid-return { transition: none; }
```

Inside `@media (max-width: 860px)`, add:

```css
.terminal-uid-actions { margin-top: 24px; }
```

In the `max-width: 520px` rule, replace the old UID-header gap declaration with:

```css
.terminal-uid-header { margin-bottom: 24px; }
```

Keep credential-page primary-button spacing unchanged.

- [ ] **Step 6: Run the focused component and architecture tests**

Run:

```powershell
..\.tools\node\node.exe --test src/features/auth/UidBindingPanel.test.js src/App.test.js src/architecture.test.js
```

Expected: all focused tests pass and `auth.css` remains at or below 420 lines.

- [ ] **Step 7: Commit the style revision**

```powershell
git add -- WuwaFrontend/src/styles/features/auth.css WuwaFrontend/src/architecture.test.js
git commit -m "style: demote uid return to bottom text action"
```

### Task 3: Synchronize the current long-term design rules

**Files:**
- Modify: `DESIGN.md`
- Modify: `docs/web-homepage-terminal-design.md`

- [ ] **Step 1: Update the root design entry**

In the authentication/UID guidance in `DESIGN.md`, add the current rule:

```markdown
- 首次 UID 绑定页不在标题区放置返回图标。标题、说明、字段和提示保持同一左基线；“返回登录”作为蓝色绑定主按钮下方的居中灰色文字动作，保留至少 44px 点击高度、可见焦点和 busy 禁用状态。该动作退出当前系统账号后返回认证页，不表示普通“上一步”。
```

Do not change the approved terminal-entry corner exception, fonts, palette, account menu, or workbench rules.

- [ ] **Step 2: Replace both homepage back-icon rules**

In `docs/web-homepage-terminal-design.md`, replace the rule near the login-card internal-page description with:

```markdown
- UID 页标题、说明、字段和提示保持同一左基线。蓝色 `BIND_AND_ENTER()` 是唯一主操作；其下方使用居中的灰色文字按钮“返回登录”，完整语义为“退出当前账号并返回登录”，执行退出后反向切回认证页。
```

Replace the later acceptance bullet with:

```markdown
- 首次 UID 绑定页不显示标题区返回图标；“返回登录”位于绑定主按钮下方，并在退出当前账号后返回认证页。
```

- [ ] **Step 3: Verify current docs no longer prescribe the old icon**

Run:

```powershell
rg -n "UID 页左上角|返回图标位于绑定页|标题区返回图标" DESIGN.md docs/web-homepage-terminal-design.md
```

Expected: no matches. Historical specs and archives may still mention the former approved design, but the new design spec explicitly supersedes those return-icon clauses.

- [ ] **Step 4: Commit the long-term documentation**

```powershell
git add -- DESIGN.md docs/web-homepage-terminal-design.md
git commit -m "docs: align uid return action guidance"
```

### Task 4: Run final verification and record delivery

**Files:**
- Create: `docs/archive/2026-07-19-login-card-bottom-return-implementation.md`

- [ ] **Step 1: Run the full frontend test suite**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\npm.cmd test
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run the production build**

Run:

```powershell
..\.tools\node\npm.cmd run build
```

Expected: Vite completes the production build with exit code 0.

- [ ] **Step 3: Run static and repository hygiene checks**

Run from the repository root:

```powershell
git diff --check
rg -n "terminal-uid-back|<svg" WuwaFrontend/src/features/auth/UidBindingPanel.vue WuwaFrontend/src/styles/features/auth.css
rg -n "UID 页左上角|返回图标位于绑定页|标题区返回图标" DESIGN.md docs/web-homepage-terminal-design.md
git status --short
```

Expected:

- `git diff --check` reports no whitespace errors in task files.
- Both `rg` commands return no matches.
- `git status --short` lists only unrelated pre-existing evaluation changes and the separate evaluation archive, with no unstaged task files.

- [ ] **Step 4: Perform the Hallmark component handoff check**

Confirm:

- Philosophy: the low-frequency sign-out action is visually subordinate to binding.
- Hierarchy: one blue primary action; gray return copy below it.
- Execution: native button, 44px target, hover, focus, active, disabled, and reduced-motion states.
- Specificity: existing Tethys tokens and font roles only.
- Restraint: no icon, border, fill, divider, shadow, or extra animation.
- Variety: the form uses a bottom secondary command instead of toolbar-style back chrome.

If live browser automation remains unavailable, record that limitation rather than substituting another browser surface.

- [ ] **Step 5: Write the implementation archive**

Create `docs/archive/2026-07-19-login-card-bottom-return-implementation.md` with:

```markdown
# 登录框 UID 绑定页底部“返回登录”实施记录

## 结果

- 删除标题区返回图标，恢复标题、说明、字段和提示的统一左基线。
- 在 `BIND_AND_ENTER()` 下方增加居中灰色“返回登录”文字按钮。
- 保留原有退出当前账号、返回认证页、busy 禁用和反向页面过渡。
- 未修改登录框外部页面、API、工作台或顶部 UID 菜单。

## 验证

- 聚焦测试：通过。
- 完整前端测试：342/342 通过。
- Vite 生产构建：通过，89 个模块完成转换。
- 生产组件和样式中不存在 `terminal-uid-back` 或返回 SVG。
- 浏览器验收：应用内浏览器自动化连接不可用，因此未完成真实无 UID 账号端到端浏览器验收；组件测试、完整测试和生产构建均已完成。

## 文档

- `DESIGN.md` 与 `docs/web-homepage-terminal-design.md` 已同步为底部次级动作。
- `docs/superpowers/specs/2026-07-19-login-card-bottom-return-design.md` 是当前返回动作设计依据。
```

- [ ] **Step 6: Commit the implementation record**

```powershell
git add -- docs/archive/2026-07-19-login-card-bottom-return-implementation.md
git commit -m "docs: record uid bottom return delivery"
```

- [ ] **Step 7: Stop only the preview server started for this decision**

Resolve the listener on port 58378, verify its command line points to the brainstorming `server.cjs` and session `uid-back-icon-preview-20260719`, then stop that exact PID. Do not stop other local development servers.

- [ ] **Step 8: Report the branch state without merging or pushing**

Report the implementation commits, test/build evidence, browser limitation if any, and preserved unrelated evaluation changes. Do not merge, push, or clean the current branch without a new explicit user choice.
