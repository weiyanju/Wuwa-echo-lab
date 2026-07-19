# Homepage Brand Mark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage header identity with the approved blue ring-and-dot `TETHYS` mark and make the browser tab use the same mark while keeping the title `泰缇斯枢纽`.

**Architecture:** Keep the change inside the existing authentication feature owner. A single transparent SVG in `WuwaFrontend/public/` is referenced by both `LoginView.vue` and `index.html`; the wordmark remains real text styled by the existing IBM Plex brand tokens.

**Tech Stack:** Vue 3 SFC templates, CSS, SVG, Vite, Node.js built-in test runner.

---

## File map

- Create `WuwaFrontend/public/tethys-mark.svg`: canonical public blue ring-and-dot brand mark.
- Modify `WuwaFrontend/src/features/auth/LoginView.vue`: replace the old homepage square icon and bilingual label with the shared icon plus real `TETHYS` text.
- Modify `WuwaFrontend/src/styles/features/auth.css`: remove the old animated square construction and size the shared mark without changing navbar geometry.
- Modify `WuwaFrontend/index.html`: point the favicon link to the shared mark and preserve the existing document title.
- Modify `WuwaFrontend/src/App.test.js`: lock homepage branding, shared asset use, SVG geometry, and unchanged browser title.
- Modify `docs/web-homepage-terminal-design.md`: record the approved compact homepage header identity as a long-term page rule.
- Create `docs/archive/2026-07-14-homepage-brand-mark-implementation.md`: record delivered scope and verification evidence.

### Task 1: Implement the shared homepage and favicon mark with TDD

**Files:**
- Create: `WuwaFrontend/public/tethys-mark.svg`
- Modify: `WuwaFrontend/src/features/auth/LoginView.vue:64-67`
- Modify: `WuwaFrontend/src/styles/features/auth.css:55-86`
- Modify: `WuwaFrontend/index.html:5`
- Test: `WuwaFrontend/src/App.test.js`

- [ ] **Step 1: Write the failing brand test**

Add this test after the existing `topbar uses a compact accessible TETHYS wordmark without changing the hero` test in `WuwaFrontend/src/App.test.js`:

```js
test('homepage and browser tab share the compact TETHYS brand mark', async () => {
  const loginSource = await readFile(new URL('./features/auth/LoginView.vue', import.meta.url), 'utf8')
  const authStyleSource = await readFile(new URL('./styles/features/auth.css', import.meta.url), 'utf8')
  const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8')

  assert.match(loginSource, /<img class="terminal-brand-icon" src="\/tethys-mark\.svg" alt="" aria-hidden="true" \/>\s*<span class="terminal-brand-wordmark">TETHYS<\/span>/)
  assert.doesNotMatch(loginSource, /Tethys System <span>\| 泰缇斯枢纽<\/span>/)
  assert.match(authStyleSource, /\.terminal-brand-icon \{[^}]+display: block;[^}]+width: 24px;[^}]+height: 24px;/)
  assert.doesNotMatch(authStyleSource, /\.terminal-brand-icon::after/)
  assert.match(indexSource, /<link rel="icon" type="image\/svg\+xml" href="\/tethys-mark\.svg" \/>/)
  assert.match(indexSource, /<title>泰缇斯枢纽<\/title>/)

  const markSource = await readFile(new URL('../public/tethys-mark.svg', import.meta.url), 'utf8')
  assert.match(markSource, /viewBox="0 0 24 24"/)
  assert.match(markSource, /<circle cx="10\.5" cy="12\.5" r="9\.5" stroke="#0064e0" stroke-width="1\.75" \/>/)
  assert.match(markSource, /<circle cx="18\.5" cy="5\.5" r="4\.25" fill="#0064e0" \/>/)
})
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run from `WuwaFrontend/`:

```powershell
..\.tools\node\node.exe --test --test-name-pattern="homepage and browser tab share the compact TETHYS brand mark" src\App.test.js
```

Expected: FAIL because `LoginView.vue` still contains the square icon and bilingual `Tethys System | 泰缇斯枢纽` label.

- [ ] **Step 3: Add the canonical SVG mark**

Create `WuwaFrontend/public/tethys-mark.svg` with exactly:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="10.5" cy="12.5" r="9.5" stroke="#0064e0" stroke-width="1.75" />
  <circle cx="18.5" cy="5.5" r="4.25" fill="#0064e0" />
</svg>
```

- [ ] **Step 4: Replace the homepage header brand DOM**

Replace the current `.terminal-brand` contents in `WuwaFrontend/src/features/auth/LoginView.vue` with:

```vue
<div class="terminal-brand">
  <img class="terminal-brand-icon" src="/tethys-mark.svg" alt="" aria-hidden="true" />
  <span class="terminal-brand-wordmark">TETHYS</span>
</div>
```

The empty alternative text and `aria-hidden` keep the decorative mark from being announced twice; the real `TETHYS` text remains the accessible brand name.

- [ ] **Step 5: Replace the square-icon CSS with shared-asset sizing**

Delete `.terminal-brand span:last-child`, the old `.terminal-brand-icon` square styles, and `.terminal-brand-icon::after`. Keep the existing `.terminal-brand` typography, then add:

```css
.terminal-brand-icon {
  display: block;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
}

.terminal-brand-wordmark {
  white-space: nowrap;
}
```

Remove `.terminal-brand-icon::after` from the `prefers-reduced-motion` selector because the new SVG has no animation. The reduced-motion rule must begin with:

```css
@media (prefers-reduced-motion: reduce) { .terminal-home::before, .terminal-system-status span {
```

- [ ] **Step 6: Point the browser favicon at the shared mark**

Change only the favicon line in `WuwaFrontend/index.html`:

```html
<link rel="icon" type="image/svg+xml" href="/tethys-mark.svg" />
```

Keep this title unchanged:

```html
<title>泰缇斯枢纽</title>
```

- [ ] **Step 7: Run the targeted test and verify GREEN**

Run from `WuwaFrontend/`:

```powershell
..\.tools\node\node.exe --test --test-name-pattern="homepage and browser tab share the compact TETHYS brand mark" src\App.test.js
```

Expected: PASS with one matching test and no errors or warnings.

- [ ] **Step 8: Commit the tested implementation**

```powershell
git add WuwaFrontend/public/tethys-mark.svg WuwaFrontend/src/features/auth/LoginView.vue WuwaFrontend/src/styles/features/auth.css WuwaFrontend/index.html WuwaFrontend/src/App.test.js
git commit -m "feat: unify homepage and tab brand mark"
```

### Task 2: Synchronize the homepage long-term rule

**Files:**
- Modify: `docs/web-homepage-terminal-design.md`

- [ ] **Step 1: Update the homepage typography rule**

In section `2.3 字体`, replace the sentence that permits the full bilingual brand in the homepage header with:

```markdown
首页顶部使用蓝色圆环圆点图标与紧凑 `TETHYS` 字标；完整 `Tethys System / 泰缇斯枢纽` 名称仍可用于首页说明、加载和首次绑定等需要完整产品识别的入口场景。登录后的顶部导航继续使用短字标 `TETHYS`。
```

- [ ] **Step 2: Update the navbar and acceptance bullets**

In section `3.1 顶部状态导航`, replace the generic `品牌名` bullet with:

```markdown
- 蓝色圆环圆点图标与紧凑 `TETHYS` 字标。
```

In section `9. 验收清单`, replace the full bilingual-brand bullet with:

```markdown
- 首页顶部保留蓝色圆环圆点图标与紧凑 `TETHYS` 识别。
```

- [ ] **Step 3: Check the documentation diff**

Run:

```powershell
git diff --check
git diff -- docs/web-homepage-terminal-design.md
```

Expected: no whitespace errors; the diff changes only the three approved homepage-brand statements.

- [ ] **Step 4: Commit the long-term rule update**

```powershell
git add docs/web-homepage-terminal-design.md
git commit -m "docs: align homepage brand identity"
```

### Task 3: Verify rendering and archive the delivered result

**Files:**
- Create: `docs/archive/2026-07-14-homepage-brand-mark-implementation.md`

- [ ] **Step 1: Run the full frontend tests**

Run from `WuwaFrontend/`:

```powershell
..\.tools\node\npm.cmd test
```

Expected: all Node tests pass with zero failures.

- [ ] **Step 2: Run the production build**

Run from `WuwaFrontend/`:

```powershell
..\.tools\node\npm.cmd run build
```

Expected: Vite exits with code 0 and writes the production bundle without warnings that block delivery.

- [ ] **Step 3: Inspect desktop and narrow-screen rendering**

Start the frontend from `WuwaFrontend/`:

```powershell
..\.tools\node\npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/` and inspect at 1366×768 and 390×844. Confirm:

- the homepage header shows only the blue ring-and-dot mark plus `TETHYS`;
- icon and text are vertically centered with no wrap or overlap;
- `SYSTEM.ONLINE` remains aligned and accessible;
- the narrow viewport has no horizontal overflow;
- the document favicon resolves from `/tethys-mark.svg` and the title remains `泰缇斯枢纽`.

- [ ] **Step 4: Write the implementation record**

Create `docs/archive/2026-07-14-homepage-brand-mark-implementation.md` with:

```markdown
# 首页品牌标识与浏览器图标实施记录

## 实施结果

- 首页顶部品牌已替换为蓝色圆环圆点图标与 `TETHYS` 字标。
- 首页与浏览器 favicon 共用 `WuwaFrontend/public/tethys-mark.svg`。
- 浏览器标签标题继续保持 `泰缇斯枢纽`。
- 登录流程、工作台顶部品牌、加载状态与 UID 绑定页未改变。

## 验证

- `..\.tools\node\npm.cmd test`：通过。
- `..\.tools\node\npm.cmd run build`：通过。
- 1366×768 首页检查：品牌比例、间距和对齐正常。
- 390×844 首页检查：品牌不换行，状态区域无重叠，页面无横向溢出。
- favicon 与文档标题检查：共享蓝色品牌图标正常，标题保持 `泰缇斯枢纽`。
```

- [ ] **Step 5: Run final repository checks**

Run from the repository root:

```powershell
git status --short
git diff --check
```

Expected: only the new archive record remains uncommitted and there are no whitespace errors.

- [ ] **Step 6: Commit the implementation record**

```powershell
git add docs/archive/2026-07-14-homepage-brand-mark-implementation.md
git commit -m "docs: record homepage brand mark delivery"
```

- [ ] **Step 7: Confirm the branch is clean**

Run:

```powershell
git status --short --branch
```

Expected: branch `codex/workbench-terminal-ui` is clean, with no untracked or modified files.
