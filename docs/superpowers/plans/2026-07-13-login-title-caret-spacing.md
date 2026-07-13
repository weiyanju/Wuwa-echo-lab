# Login Title Caret Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the login title’s 4px typing caret an approximately 8px responsive gap from the final Chinese character without changing the title copy, animation timing, or mobile behavior.

**Architecture:** Keep the current `border-right` caret and width-based typing animation. Add one feature-owned CSS custom property and logical end padding on `.terminal-title`, use a local `content-box` override so the gap sits outside the animated text width, then remove that padding in the existing 520px mobile rule where the caret is disabled. Lock the contract with the existing static visual regression test.

**Tech Stack:** Vue 3, feature-owned CSS, Node.js built-in test runner, Vite

---

### Task 1: Lock and implement the caret gap

**Files:**
- Modify: `WuwaFrontend/src/design-state-accent.test.js:159-164`
- Modify: `WuwaFrontend/src/styles/features/auth.css:151-166`
- Modify: `WuwaFrontend/src/styles/features/auth.css:300-305`

- [x] **Step 1: Write the failing regression assertions**

Extend the existing test named `the functional login caret finishes beside the title instead of at the column edge` with these assertions:

```js
assert.match(authStyle, /\.terminal-title \{[\s\S]+--terminal-caret-gap: 0\.14em;/)
assert.match(authStyle, /\.terminal-title \{[\s\S]+box-sizing: content-box;/)
assert.match(authStyle, /\.terminal-title \{[\s\S]+padding-inline-end: var\(--terminal-caret-gap\);/)
assert.match(authStyle, /@media \(max-width: 520px\) \{[\s\S]+\.terminal-title \{[^}]+padding-inline-end: 0;/)
```

- [x] **Step 2: Run the targeted test and verify RED**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src/design-state-accent.test.js
```

Expected: the caret-spacing test fails because `--terminal-caret-gap` and `padding-inline-end` do not exist yet.

- [x] **Step 3: Add the minimal feature-owned CSS**

Update `.terminal-title` without changing the existing typing width, border, typography, or animation:

```css
.terminal-title {
  --terminal-title-width: 8em;
  --terminal-caret-gap: 0.14em;
  box-sizing: content-box;
  width: 0;
  max-width: 100%;
  overflow: hidden;
  border-right: 4px solid var(--terminal-primary);
  margin: 0;
  padding-inline-end: var(--terminal-caret-gap);
  color: var(--terminal-text);
  font-family: var(--font-title);
  font-size: 56px;
  font-weight: var(--weight-title);
  letter-spacing: var(--tracking-cjk);
  line-height: 1.1;
  white-space: nowrap;
  animation: terminal-typing 0.8s steps(8, end) 0.3s forwards, terminal-blink 0.8s step-end infinite;
}
```

Reset the gap in the existing narrow-screen rule, where the caret is already disabled:

```css
@media (max-width: 520px) {
  .terminal-title {
    width: 100%;
    overflow: visible;
    border-right: 0;
    padding-inline-end: 0;
    font-size: 36px;
    white-space: normal;
    animation: none;
  }
}
```

- [x] **Step 4: Run the targeted test and verify GREEN**

Run:

```powershell
..\.tools\node\node.exe --test src/design-state-accent.test.js
```

Expected: all tests in `design-state-accent.test.js` pass.

- [x] **Step 5: Run full automated verification**

Run:

```powershell
..\.tools\node\npm.cmd test
..\.tools\node\npm.cmd run build
```

Expected: all frontend tests pass and Vite exits with code 0.

- [x] **Step 6: Verify the rendered title in the local browser**

Start the local frontend, open the login page at desktop width, wait for the typing animation to finish, and inspect `.terminal-title`.

Expected:

- computed `padding-inline-end` is approximately 8px at the 56px desktop title size;
- the 4px blue caret visibly clears the last character but still reads as attached to the title;
- the title remains on one line and is not clipped;
- at 520px and below, the caret and its extra gap are both absent;
- the browser console has no warnings or errors caused by the change.

- [x] **Step 7: Commit the tested implementation**

```powershell
git add WuwaFrontend/src/design-state-accent.test.js WuwaFrontend/src/styles/features/auth.css
git commit -m "fix: space login title caret"
```

### Task 2: Record the completed visual correction

**Files:**
- Create: `docs/archive/2026-07-13-login-title-caret-spacing-implementation.md`

- [x] **Step 1: Write the implementation record after verification**

Create the archive entry with the verified result:

```markdown
# 登录标题打字光标间距实施记录

## 结果

- 保留登录标题原有 4px 蓝色打字光标、逐字显示和闪烁节奏。
- 使用 `0.14em` 行末内边距，让桌面 56px 标题下的光标与末字保持约 8px 间距。
- 520px 以下在关闭光标的同时移除间距，没有改变标题文案或可访问名称。

## 验证

- 定向视觉回归测试通过。
- 前端全量测试通过。
- Vite 生产构建通过。
- 本地浏览器确认桌面端光标间距、窄屏回退和控制台状态正常。
```

- [x] **Step 2: Check the final diff and commit the record**

Run:

```powershell
git diff --check
git status --short
git add docs/archive/2026-07-13-login-title-caret-spacing-implementation.md
git commit -m "docs: record login caret spacing"
```

Expected: `git diff --check` exits with code 0, and only the intended implementation record is included in this documentation commit.
