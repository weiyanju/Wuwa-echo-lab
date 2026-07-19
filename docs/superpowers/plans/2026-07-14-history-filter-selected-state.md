# History Filter Selected State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the history panel's checkbox-like selected marker with a compact, accessible, solid-filled pill state while preserving all filtering and panel interactions.

**Architecture:** Keep filtering state and behavior inside the existing `FloatingHistoryPanel.vue`. Remove the always-mounted check icon, express light and dark selected palettes through feature-owned CSS custom properties, and protect structure, contrast, motion, and state semantics with source-contract tests before browser verification.

**Tech Stack:** Vue 3 SFC, feature-owned CSS, Node.js built-in test runner, Vite, CSS Font/DOM browser APIs for visual verification.

---

## File ownership map

- Modify `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`: remove the check icon import and node; keep the existing mutually exclusive `historyFilter`, counts, and `aria-pressed` behavior.
- Modify `WuwaFrontend/src/styles/features/history.css`: remove icon reservation, define solid active palettes for all five states in light and dark themes, keep geometry stable, and disable color transitions for reduced motion.
- Modify `WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js`: add component, layout, palette, and contrast contracts owned by the history feature.
- Modify `WuwaFrontend/src/design-state-accent.test.js`: retain the Sonata check marker while replacing the obsolete history-check requirement with the solid-pill requirement.
- Modify `docs/web-workbench-ui-guidelines.md`: record the corrected long-term history-filter rule.
- Create `docs/archive/2026-07-14-history-filter-selected-state-implementation.md`: record the delivered structure and actual verification evidence.

### Task 1: Replace the history check marker with solid active pills

**Files:**
- Modify: `WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js`
- Modify: `WuwaFrontend/src/design-state-accent.test.js`
- Modify: `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`
- Modify: `WuwaFrontend/src/styles/features/history.css`

- [ ] **Step 1: Add failing history structure and contrast tests**

Add these helpers after the imports in `WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js`:

```js
function bodyFor(source, target) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => match[1].split(',').map((selector) => selector.trim()).includes(target))
    .map((match) => match[2])
    .join('\n')
}

function cssHexValue(body, property) {
  const match = body.match(new RegExp(`${property}:\\s*(#[0-9a-fA-F]{6})`))
  assert.ok(match, `${property} must be a six-digit hex color`)
  return match[1]
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4))
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2])
}

function contrastRatio(first, second) {
  const luminances = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a)
  return (luminances[0] + 0.05) / (luminances[1] + 0.05)
}
```

Add these two tests after `floating history owns its filters and panel interaction state`:

```js
test('floating history filters stay mutually exclusive without a selected icon slot', async () => {
  const source = await readFile(new URL('./FloatingHistoryPanel.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/history.css', import.meta.url), 'utf8')

  assert.match(source, /:aria-pressed="historyFilter === option\.key"/)
  assert.match(source, /@click="historyFilter = option\.key"/)
  assert.match(source, /<span>\{\{ option\.label \}\}<\/span>\s+<strong>\{\{ option\.count \}\}<\/strong>/)
  assert.doesNotMatch(source, /historySelectedIcon/)
  assert.doesNotMatch(source, /history-filter-selected-icon/)
  assert.doesNotMatch(style, /history-filter-selected-icon/)
  assert.match(bodyFor(style, '.history-filter-chip'), /padding:\s*5px 9px 5px 12px;/)
  assert.match(bodyFor(style, '.history-filter-chip.active'), /box-shadow:\s*none;/)
})

test('history filter active palettes meet text contrast in light and dark themes', async () => {
  const style = await readFile(new URL('../../styles/features/history.css', import.meta.url), 'utf8')
  const selectors = [
    '.history-filter-chip',
    '.history-filter-chip.current',
    '.history-filter-chip.pending',
    '.history-filter-chip.completed',
    '.history-filter-chip.discarded',
    '.app-shell.theme-dark .history-filter-chip',
    '.app-shell.theme-dark .history-filter-chip.current',
    '.app-shell.theme-dark .history-filter-chip.pending',
    '.app-shell.theme-dark .history-filter-chip.completed',
    '.app-shell.theme-dark .history-filter-chip.discarded',
  ]

  for (const selector of selectors) {
    const body = bodyFor(style, selector)
    const activeBackground = cssHexValue(body, '--history-filter-active-bg')
    const activeInk = cssHexValue(body, '--history-filter-active-ink')
    const countBackground = cssHexValue(body, '--history-filter-active-count-bg')
    const countInk = cssHexValue(body, '--history-filter-active-count-ink')

    assert.ok(contrastRatio(activeBackground, activeInk) >= 4.5, `${selector} label contrast`)
    assert.ok(contrastRatio(countBackground, countInk) >= 4.5, `${selector} count contrast`)
  }
})
```

In `WuwaFrontend/src/design-state-accent.test.js`, replace the existing test named `selected Sonata and history filters expose a non-color check marker` with:

```js
test('selected Sonata keeps its check while history filters use solid active pills', async () => {
  const [workbench, history, workspaceStyle, historyStyle] = await Promise.all([
    read('./features/workspace/EchoWorkbenchView.vue'),
    read('./features/history/FloatingHistoryPanel.vue'),
    read('./styles/features/workspace.css'),
    read('./styles/features/history.css'),
  ])

  assert.match(workbench, /import selectedCheckIcon from '\.\.\/\.\.\/assets\/icons\/check\.svg'/)
  assert.match(workbench, /v-if="config\.sonata === effect\.name" class="ui-line-icon sonata-selected-indicator"/)
  assert.match(workspaceStyle, /\.sonata-selected-indicator \{[\s\S]+width: 18px;[\s\S]+height: 18px;/)

  assert.doesNotMatch(history, /historySelectedIcon/)
  assert.doesNotMatch(history, /history-filter-selected-icon/)
  assert.match(history, /:aria-pressed="historyFilter === option\.key"/)
  assert.doesNotMatch(historyStyle, /\.history-filter-selected-icon/)
  assert.match(
    bodiesFor(historyStyle, '.history-filter-chip.active'),
    /border-color:\s*var\(--history-filter-active-bg\);[\s\S]+color:\s*var\(--history-filter-active-ink\);[\s\S]+background:\s*var\(--history-filter-active-bg\);[\s\S]+box-shadow:\s*none;/,
  )
  assert.match(
    bodiesFor(historyStyle, '.history-filter-chip.active strong'),
    /color:\s*var\(--history-filter-active-count-ink\);[\s\S]+background:\s*var\(--history-filter-active-count-bg\);/,
  )
})
```

- [ ] **Step 2: Run the two test files and verify RED**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src/features/history/FloatingHistoryPanel.test.js src/design-state-accent.test.js
```

Expected: FAIL because the component still imports/renders `historySelectedIcon`, the CSS still reserves `.history-filter-selected-icon`, and the solid active palette variables do not exist.

- [ ] **Step 3: Remove the selected icon from the Vue component**

In `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`, delete:

```js
import historySelectedIcon from '../../assets/icons/check.svg'
```

Replace the filter button contents:

```vue
<span class="ui-line-icon history-filter-selected-icon" :style="iconMask(historySelectedIcon)" aria-hidden="true"></span>
<span>{{ option.label }}</span>
<strong>{{ option.count }}</strong>
```

with:

```vue
<span>{{ option.label }}</span>
<strong>{{ option.count }}</strong>
```

Do not change `historyFilter`, `historyFilterOptions`, `filteredHistoryEchoes`, `aria-pressed`, or the click assignment.

- [ ] **Step 4: Replace light-theme icon and active-state CSS with palette variables**

In `WuwaFrontend/src/styles/features/history.css`, replace the current `.history-filter-chip` through `.history-filter-chip.discarded.active` block with:

```css
.history-filter-chip {
  --history-filter-active-bg: #324455;
  --history-filter-active-ink: #f4f8fb;
  --history-filter-active-count-bg: #e8f0f5;
  --history-filter-active-count-ink: #263746;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  border: 1px solid rgba(206, 219, 231, 0.9);
  border-radius: 999px;
  padding: 5px 9px 5px 12px;
  color: var(--steel);
  background: rgba(248, 250, 252, 0.86);
  font-size: var(--text-caption);
  font-weight: var(--weight-control);
  line-height: var(--leading-control);
  letter-spacing: var(--tracking-cjk);
  transition: border-color 160ms ease-out, background-color 160ms ease-out, color 160ms ease-out;
}

.history-filter-chip strong {
  min-width: 20px;
  border-radius: 999px;
  padding: 2px 6px;
  color: inherit;
  background: color-mix(in srgb, var(--canvas) 72%, transparent);
  font-family: var(--font-data);
  font-size: var(--text-caption);
  font-weight: var(--weight-data);
  line-height: var(--leading-data);
  letter-spacing: var(--tracking-data);
  font-variant-numeric: tabular-nums;
  text-align: center;
  transition: background-color 160ms ease-out, color 160ms ease-out;
}

.history-filter-chip:hover {
  border-color: rgba(93, 108, 123, 0.42);
  background: var(--canvas);
}

.history-filter-chip.current {
  --history-filter-active-bg: #0064e0;
  --history-filter-active-ink: #f7faff;
  --history-filter-active-count-bg: #e8f2ff;
  --history-filter-active-count-ink: #0457cb;
  border-color: rgba(0, 100, 224, 0.18);
  color: var(--primary);
  background: rgba(242, 247, 255, 0.82);
}

.history-filter-chip.pending {
  --history-filter-active-bg: #f2bd48;
  --history-filter-active-ink: #4a3100;
  --history-filter-active-count-bg: #fff1c6;
  --history-filter-active-count-ink: #513500;
  border-color: rgba(247, 185, 40, 0.28);
  color: #6a4a00;
  background: rgba(255, 249, 231, 0.84);
}

.history-filter-chip.completed {
  --history-filter-active-bg: #267640;
  --history-filter-active-ink: #f5fff7;
  --history-filter-active-count-bg: #def4e4;
  --history-filter-active-count-ink: #1f6035;
  border-color: rgba(49, 162, 76, 0.24);
  color: #236735;
  background: rgba(241, 251, 244, 0.86);
}

.history-filter-chip.discarded {
  --history-filter-active-bg: #b32642;
  --history-filter-active-ink: #fff7f8;
  --history-filter-active-count-bg: #ffe5e9;
  --history-filter-active-count-ink: #8f1930;
  border-color: rgba(228, 30, 63, 0.22);
  color: #9d1730;
  background: rgba(255, 243, 245, 0.86);
}

.history-filter-chip.active {
  border-color: var(--history-filter-active-bg);
  color: var(--history-filter-active-ink);
  background: var(--history-filter-active-bg);
  box-shadow: none;
}

.history-filter-chip.active strong {
  color: var(--history-filter-active-count-ink);
  background: var(--history-filter-active-count-bg);
}

.history-filter-chip.active:hover {
  border-color: color-mix(in srgb, var(--history-filter-active-bg) 92%, #0a1317);
  background: color-mix(in srgb, var(--history-filter-active-bg) 92%, #0a1317);
}
```

This removes `.history-filter-selected-icon`, the opacity toggle, the obsolete per-state `.active` blocks, and all selected-state shadows.

- [ ] **Step 5: Replace dark-theme active blocks with explicit accessible palette variables**

In the dark-theme section of `WuwaFrontend/src/styles/features/history.css`, keep the existing inactive borders/backgrounds but replace the filter declarations from `.app-shell.theme-dark .history-filter-chip` through `.discarded.active` with:

```css
.app-shell.theme-dark .history-filter-chip {
  --history-filter-active-bg: #51697b;
  --history-filter-active-ink: #f4f8fb;
  --history-filter-active-count-bg: #e8f0f5;
  --history-filter-active-count-ink: #263746;
  border-color: rgba(74, 96, 111, 0.72);
  color: #aebfcb;
  background: rgba(29, 42, 53, 0.72);
}

.app-shell.theme-dark .history-filter-chip strong {
  color: inherit;
  background: rgba(143, 162, 177, 0.16);
}

.app-shell.theme-dark .history-filter-chip.current {
  --history-filter-active-bg: #1767bb;
  --history-filter-active-ink: #f7faff;
  --history-filter-active-count-bg: #e8f2ff;
  --history-filter-active-count-ink: #0457cb;
  border-color: rgba(93, 168, 255, 0.28);
  color: var(--primary-deep);
  background: rgba(40, 83, 124, 0.22);
}

.app-shell.theme-dark .history-filter-chip.pending {
  --history-filter-active-bg: #d3a337;
  --history-filter-active-ink: #362300;
  --history-filter-active-count-bg: #fff1c6;
  --history-filter-active-count-ink: #513500;
  border-color: rgba(217, 163, 58, 0.32);
  color: #e4c277;
  background: rgba(78, 59, 20, 0.32);
}

.app-shell.theme-dark .history-filter-chip.completed {
  --history-filter-active-bg: #2b7e4b;
  --history-filter-active-ink: #f5fff7;
  --history-filter-active-count-bg: #def4e4;
  --history-filter-active-count-ink: #1f6035;
  border-color: rgba(55, 179, 127, 0.3);
  color: #82d3aa;
  background: rgba(30, 78, 52, 0.28);
}

.app-shell.theme-dark .history-filter-chip.discarded {
  --history-filter-active-bg: #b83d55;
  --history-filter-active-ink: #fff7f8;
  --history-filter-active-count-bg: #ffe5e9;
  --history-filter-active-count-ink: #8f1930;
  border-color: rgba(239, 107, 122, 0.3);
  color: #f0a4af;
  background: rgba(84, 36, 45, 0.28);
}

.app-shell.theme-dark .history-filter-chip.active {
  border-color: var(--history-filter-active-bg);
  color: var(--history-filter-active-ink);
  background: var(--history-filter-active-bg);
  box-shadow: none;
}

.app-shell.theme-dark .history-filter-chip.active strong {
  color: var(--history-filter-active-count-ink);
  background: var(--history-filter-active-count-bg);
}

.app-shell.theme-dark .history-filter-chip.active:hover {
  border-color: color-mix(in srgb, var(--history-filter-active-bg) 92%, #0a1317);
  background: color-mix(in srgb, var(--history-filter-active-bg) 92%, #0a1317);
}
```

- [ ] **Step 6: Disable filter color transitions for reduced motion**

Replace the existing reduced-motion selector group with:

```css
@media (prefers-reduced-motion: reduce) {
  .floating-history-panel,
  .floating-history-handle,
  .history-filter-chip,
  .history-filter-chip strong,
  .echo-list {
    transition: none;
  }
}
```

- [ ] **Step 7: Run focused tests and verify GREEN**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src/features/history/FloatingHistoryPanel.test.js src/design-state-accent.test.js src/architecture.test.js src/App.test.js
```

Expected: PASS, including two new history-filter tests, with the existing Sonata check, filtering ownership, panel interaction, state-accent, and architecture contracts unchanged.

- [ ] **Step 8: Inspect and commit the implementation**

Run from the repository root:

```powershell
git diff --check
git diff -- WuwaFrontend/src/features/history/FloatingHistoryPanel.vue WuwaFrontend/src/styles/features/history.css WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js WuwaFrontend/src/design-state-accent.test.js
```

Expected: only the four planned application/test files are changed and `git diff --check` exits `0`.

Commit:

```powershell
git add WuwaFrontend/src/features/history/FloatingHistoryPanel.vue WuwaFrontend/src/styles/features/history.css WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js WuwaFrontend/src/design-state-accent.test.js
git commit -m "fix: replace history filter check with solid state"
```

### Task 2: Align long-term guidance and verify the delivered UI

**Files:**
- Modify: `docs/web-workbench-ui-guidelines.md`
- Create: `docs/archive/2026-07-14-history-filter-selected-state-implementation.md`

- [ ] **Step 1: Update the long-term history-panel rule**

Under `### 历史记录区` in `docs/web-workbench-ui-guidelines.md`, add this bullet after the current-record/filter requirement:

```markdown
- 历史筛选使用互斥胶囊；选中项通过完整语义色填充和数量徽标反色表达，不使用勾选图标或预留图标空位，切换时不得改变控件尺寸与换行位置。
```

- [ ] **Step 2: Run the complete frontend suite**

From `WuwaFrontend` run:

```powershell
..\.tools\node\npm.cmd test
```

Expected: PASS with `245` tests and `0` failures. If the count differs because the branch gained unrelated tests, record the actual fresh count instead of copying `245`.

- [ ] **Step 3: Run the production build**

Run:

```powershell
..\.tools\node\npm.cmd run build
```

Expected: Vite exits `0` and reports `71 modules transformed`; record the actual module count if it differs.

- [ ] **Step 4: Verify all filter states in the live browser**

Use the `browser:control-in-app-browser` skill. Start Vite on an unused strict localhost port and use the existing local backend/authenticated development session when available. Do not create credentials, alter PostgreSQL records, or claim visual checks if the authenticated workbench cannot be reached.

In light mode:

- Confirm `.history-filter-selected-icon` is absent from the DOM.
- Record each chip's width and row position, then select `全部`, `当前`, `待强化`, `已强化`, and `弃置` one at a time.
- Each selected chip must use a solid semantic background and contrasting count badge; every label/count computed contrast must be at least `4.5:1`.
- Width and row position for every chip must remain unchanged across selection changes.
- The record count/list must follow the selected filter, and `aria-pressed="true"` must move to exactly one button.
- Keyboard Tab focus must remain visibly distinct from selection; Enter or Space must switch the focused filter.

Repeat the five-state computed-style and contrast checks in dark mode. At a narrow history-panel width, confirm wrapping is stable with no clipped label, wrapped count, overlap, or horizontal overflow. Confirm the browser console contains no warning/error.

If authentication prevents live workbench access, stop the temporary Vite process, record that limitation in the archive, and do not substitute fabricated application data or a standalone mockup as production evidence.

- [ ] **Step 5: Create the implementation archive with actual evidence**

Create `docs/archive/2026-07-14-history-filter-selected-state-implementation.md` with this structure, replacing only the numeric test/build values if the fresh commands differed:

```markdown
# 历史声骸筛选器选中态实施记录

日期：2026-07-14

## 实施结果

- 删除历史筛选按钮中常驻的勾选图标节点与透明占位，按钮结构收敛为“标签 + 数量”。
- “全部 / 当前 / 待强化 / 已强化 / 弃置”使用各自语义色的完整实色选中表面，数量徽标反色；选中与未选中状态保持相同几何尺寸。
- 亮色和深色主题使用 feature-owned 状态变量，标签与数量文字对比度由自动化测试守卫。
- `aria-pressed`、互斥筛选、计数、记录排序、最小化、固定、展示和拖拽逻辑保持不变。

## 验证

- 聚焦历史、状态强调、架构与应用契约测试通过。
- 完整前端测试：`245` 项通过，`0` 失败。
- Vite 生产构建通过：`71 modules transformed`。
- 浏览器逐项验证五种亮色/深色选中态、尺寸稳定性、键盘焦点、窄面板换行、筛选结果和控制台状态，全部通过。
```

If the authenticated workbench was unavailable, use this exact final bullet instead of the success bullet:

```markdown
- 浏览器视觉验收未执行：本地前端无法取得已认证工作台会话；本次没有创建账号、修改 PostgreSQL 数据或使用独立 mockup 冒充生产页面证据。
```

- [ ] **Step 6: Run hygiene checks and commit documentation**

Run from the repository root:

```powershell
git status --short
git diff --check
git diff -- docs/web-workbench-ui-guidelines.md docs/archive/2026-07-14-history-filter-selected-state-implementation.md
```

Expected: only the two planned documentation files remain and `git diff --check` exits `0`.

Commit:

```powershell
git add docs/web-workbench-ui-guidelines.md docs/archive/2026-07-14-history-filter-selected-state-implementation.md
git commit -m "docs: record history filter selected state"
```

- [ ] **Step 7: Confirm final branch state**

Run:

```powershell
git status --short --branch
```

Expected: clean `codex/workbench-terminal-ui` worktree with only intentional commits ahead of its remote tracking branch.
