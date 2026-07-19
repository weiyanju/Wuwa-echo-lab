# UID Menu Typography and Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一 UID 菜单中账号值与新增输入值的数据排版，把相关控件收敛到 44px 基线，并用克制的纯色选中态和稳定间距修复当前区域的视觉失衡。

> **Later sign-out decision (2026-07-14):** The user subsequently changed sign out back to the neutral lightweight menu row. Instructions below that preserve the divided transparent sign-out style are historical and no longer define the current UI.

**Architecture:** 保持 `UidSwitcher.vue` 的模板、状态和事件不变；视觉实现继续由 shell owner `WuwaFrontend/src/styles/shell.css` 承担。先扩展现有源代码样式契约测试，再原位替换 CSS 声明，最后同步长期设计规则并做真实渲染验收。当前工作树已有同文件未提交修改，执行时必须保留这些修改，未经用户明确授权不得暂存或提交。

**Tech Stack:** Vue 3、CSS custom properties、Node.js built-in test runner、Vite、Codex in-app browser。

---

## 设计依据

- 已确认设计：`docs/superpowers/specs/2026-07-14-uid-menu-typography-and-layout-design.md`
- 长期视觉入口：`DESIGN.md`
- 字体规范：`docs/superpowers/specs/2026-07-13-wuwa-typography-system-design.md`
- Web UI 规范：`docs/web-ui-design-system-v2.md`

## 文件地图

- Modify: `WuwaFrontend/src/components/controls/UidSwitcher.test.js` — 锁定 UID 数据排版、44px 控件、间距、纯色选中态和局部 focus-visible 契约。
- Modify: `WuwaFrontend/src/styles/shell.css` — 实现浅色/暗色账号行、字段、按钮和状态样式；保持 shell owner 与 920 行上限。
- Modify: `DESIGN.md` — 在 Global navigation and UID 中补充可长期复用的 UID 菜单排版与几何规则。
- Verify unchanged: `WuwaFrontend/src/components/controls/UidSwitcher.vue` — 不修改结构、事件、校验或焦点恢复逻辑。
- Create after implementation: `docs/archive/2026-07-14-uid-menu-typography-and-layout-implementation.md` — 记录实际变更、验证结果与视觉验收。

### Task 1: 用失败测试锁定已确认的视觉契约

**Files:**
- Modify: `WuwaFrontend/src/components/controls/UidSwitcher.test.js`
- Test: `WuwaFrontend/src/components/controls/UidSwitcher.test.js`

- [ ] **Step 1: 保留退出登录回归测试原样**

不要修改现有测试 `uid menu keeps the solid primary submit and restores the divided text sign out` 中对以下属性的断言：

```text
min-height: 44px
border-top: 1px solid var(--hairline-soft)
border-radius: 0
padding: 14px 12px 0
background: transparent
hover / focus-visible: critical text + transparent background
```

- [ ] **Step 2: 添加 UID 排版与布局契约测试**

在现有 submit/sign-out 样式测试之后添加：

```js
test('uid menu aligns data typography, 44px controls, and flat selected states', async () => {
  const styles = await readShellStyles()
  const fieldRule = styles.match(/^\.uid-switcher-field \{([^}]+)\}/m)?.[1] || ''
  const labelRule = styles.match(/^\.uid-switcher-field label \{([^}]+)\}/m)?.[1] || ''
  const inputRule = styles.match(/^\.uid-switcher-field input \{([^}]+)\}/m)?.[1] || ''
  const focusRule = styles.match(/^\.uid-switcher-field input:focus-visible \{([^}]+)\}/m)?.[1] || ''
  const listRule = styles.match(/^\.uid-recent-list \{([^}]+)\}/m)?.[1] || ''
  const accountRule = styles.match(/^\.uid-recent-list button \{([^}]+)\}/m)?.[1] || ''
  const currentRule = styles.match(/^\.uid-recent-list button\.current \{([^}]+)\}/m)?.[1] || ''
  const darkCurrentRule = styles.match(/^\.app-shell\.theme-dark \.uid-recent-list button\.current \{([^}]+)\}/m)?.[1] || ''
  const submitRule = styles.match(/^\.uid-switcher-submit \{([^}]+)\}/m)?.[1] || ''
  const addRule = styles.match(/^\.uid-switcher-add \{([^}]+)\}/m)?.[1] || ''

  assert.match(fieldRule, /gap: 8px/)
  assert.match(fieldRule, /margin-top: 2px/)
  assert.match(labelRule, /font-size: var\(--text-label\)/)
  assert.match(labelRule, /font-weight: var\(--weight-label\)/)
  assert.match(inputRule, /min-height: 44px/)
  assert.match(inputRule, /padding: 10px 12px/)
  assert.match(inputRule, /font-family: var\(--font-data\)/)
  assert.match(inputRule, /font-size: var\(--text-data-sm\)/)
  assert.match(inputRule, /font-weight: var\(--weight-data\)/)
  assert.match(inputRule, /line-height: var\(--leading-control\)/)
  assert.match(inputRule, /font-variant-numeric: tabular-nums/)
  assert.match(focusRule, /outline: 3px solid rgba\(0, 100, 224, 0\.26\)/)
  assert.match(focusRule, /outline-offset: 3px/)
  assert.match(focusRule, /box-shadow: none/)
  assert.match(listRule, /gap: 8px/)
  assert.match(accountRule, /min-height: 44px/)
  assert.match(accountRule, /padding: 10px 12px/)
  assert.match(accountRule, /font-family: var\(--font-data\)/)
  assert.match(accountRule, /font-size: var\(--text-data-sm\)/)
  assert.match(accountRule, /font-weight: var\(--weight-data\)/)
  assert.match(accountRule, /line-height: var\(--leading-control\)/)
  assert.match(accountRule, /font-variant-numeric: tabular-nums/)
  assert.match(currentRule, /background: rgba\(23, 105, 210, 0\.08\)/)
  assert.doesNotMatch(currentRule, /gradient/)
  assert.match(darkCurrentRule, /background: rgba\(93, 168, 255, 0\.13\)/)
  assert.doesNotMatch(darkCurrentRule, /gradient/)
  assert.match(submitRule, /min-height: 44px/)
  assert.match(submitRule, /padding: 10px 12px/)
  assert.match(submitRule, /margin-top: 2px/)
  assert.match(addRule, /min-height: 44px/)
})
```

- [ ] **Step 3: 运行聚焦测试并确认 RED**

From `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src\components\controls\UidSwitcher.test.js
```

Expected: FAIL。失败原因应包含当前账号行仍为 38px / 13px、输入和提交仍为 42px、标签仍为 caption、选中态仍含 gradient；现有退出登录测试必须继续 PASS。

### Task 2: 实现统一的数据排版、控件几何与区域节奏

**Files:**
- Modify: `WuwaFrontend/src/styles/shell.css:94-99`
- Modify: `WuwaFrontend/src/styles/shell.css:448-581`
- Test: `WuwaFrontend/src/components/controls/UidSwitcher.test.js`
- Verify: `WuwaFrontend/src/architecture.test.js`

- [ ] **Step 1: 把暗色当前账号改为纯色选中面**

用单行状态规则替换现有暗色渐变，既保持语义也为 `shell.css` 行数上限留出空间：

```css
.app-shell.theme-dark .uid-recent-list button.current { border-color: rgba(93, 168, 255, 0.36); color: var(--ink-deep); background: rgba(93, 168, 255, 0.13); }
```

- [ ] **Step 2: 调整字段标签、输入与局部焦点**

将对应规则替换为：

```css
.uid-switcher-field {
  display: grid;
  gap: 8px;
  margin-top: 2px;
}

.uid-switcher-field label {
  color: #6f8293;
  font-size: var(--text-label);
  font-weight: var(--weight-label);
  line-height: var(--leading-label);
}

.uid-switcher-field input {
  width: 100%;
  min-height: 44px;
  border: 1px solid rgba(206, 219, 231, 0.9);
  border-radius: 12px;
  padding: 10px 12px;
  color: #263746;
  background: #ffffff;
  font-family: var(--font-data);
  font-size: var(--text-data-sm);
  font-weight: var(--weight-data);
  line-height: var(--leading-control);
  letter-spacing: var(--tracking-data);
  font-variant-numeric: tabular-nums;
}
.uid-switcher-field input:focus-visible { border-color: var(--primary); outline: 3px solid rgba(0, 100, 224, 0.26); outline-offset: 3px; box-shadow: none; }
```

说明：不要修改 `controls.css` 的全局 `input:focus`；较高特异性的局部规则只修复 UID 输入框的 focus-visible 契约，避免本任务改变其他页面。

- [ ] **Step 3: 对齐账号行的数据字体与 44px 高度**

```css
.uid-recent-list {
  display: grid;
  gap: 8px;
}

.uid-recent-list button {
  display: flex;
  gap: 10px;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(216, 226, 234, 0.86);
  border-radius: 12px;
  padding: 10px 12px;
  color: #526575;
  background: rgba(248, 251, 253, 0.92);
  font-family: var(--font-data);
  font-size: var(--text-data-sm);
  font-weight: var(--weight-data);
  line-height: var(--leading-control);
  letter-spacing: var(--tracking-data);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
```

不要修改 `.uid-account-check`；勾选图标继续作为非颜色 selected 线索。

- [ ] **Step 4: 把浅色当前账号改为纯色选中面**

```css
.uid-recent-list button.current { border-color: rgba(23, 105, 210, 0.22); color: #2f4659; background: rgba(23, 105, 210, 0.08); }
```

保留 `.uid-recent-list button.current:hover` 与 `.uid-recent-list button.current:disabled` 的既有行为，不增加位移或动画。

- [ ] **Step 5: 对齐确认按钮与默认添加入口**

在 `.uid-switcher-submit` 中把 `min-height` 改为 44px，并增加：

```css
padding: 10px 12px;
margin-top: 2px;
```

在 `.uid-switcher-add` 中仅把 `min-height: 42px` 改为 `min-height: 44px`。其虚线边框、颜色、文案和状态保持不变。

不要触碰 `.uid-switcher-sign-out` 及其浅色、暗色 hover/focus-visible 规则。

- [ ] **Step 6: 运行聚焦与架构测试并确认 GREEN**

From `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src\components\controls\UidSwitcher.test.js src\architecture.test.js
```

Expected: PASS。特别确认 `shell.css` 仍不超过 920 行；不要提高架构测试的上限。

### Task 3: 同步长期设计规则

**Files:**
- Modify: `DESIGN.md:379-385`
- Verify: `docs/superpowers/specs/2026-07-14-uid-menu-typography-and-layout-design.md`

- [ ] **Step 1: 在 Global navigation and UID 中补充排版规则**

在现有退出登录/确认按钮规则之前加入：

```markdown
- UID 菜单中的账号值与新增输入内容统一使用 Data SM（15px / 600、等宽数字）；字段标签使用 Label（13px / 600），操作按钮使用 Control（14px / 600）。账号行、输入框、确认按钮和新增入口统一为至少 44px 高、12px 圆角；当前账号使用纯色浅蓝选中面、蓝色边框与勾选图标，不使用渐变。
```

不要改写下一条已经确认的退出登录纯文字规则。

- [ ] **Step 2: 检查文档与实现一致**

确认以下值只来自现有 token：`--font-data`、`--text-data-sm`、`--text-label`、`--text-control`、`--weight-data`、`--weight-label`、`--weight-control`、`--leading-control`、`--tracking-data`。不要为本菜单新增全局 token。

### Task 4: 完成真实渲染与交互验收

**Files:**
- Verify: `WuwaFrontend/src/components/controls/UidSwitcher.vue`
- Verify: `WuwaFrontend/src/styles/shell.css`
- Temporary only: `WuwaFrontend/visual-uid-menu-fixture.html`（如真实账号状态不可稳定复现）

- [ ] **Step 1: 准备可重复的视觉状态**

优先在真实应用中打开 UID 菜单。若账号状态无法稳定复现，临时创建 `WuwaFrontend/visual-uid-menu-fixture.html`，导入 `/src/style.css` 并复用生产 class，展示以下状态；验收结束后删除该文件，不得提交：

1. 默认菜单与单个当前账号。
2. 新增 UID 表单。
3. 9 位校验错误。
4. 暗色主题新增表单。
5. 多账号列表。

- [ ] **Step 2: 检查计算样式与对齐**

在浏览器中确认：

- 当前账号和输入值均为 15px / 600、数据字体、`tabular-nums`。
- 账号行、输入、确认按钮与“添加 UID”均为至少 44px 高。
- 标签到输入为 8px；账号区到标签为 14px；输入到确认按钮为 10px。
- 浅色/暗色选中面均无渐变，右侧勾选图标位置稳定。
- 输入、账号行、确认按钮左右边缘完全对齐。

- [ ] **Step 3: 检查交互与响应式**

- 键盘 Tab 到输入框时可见 3px 蓝色轮廓和 3px offset。
- hover/focus 不发生上浮、缩放或布局跳动。
- 在 1366px 桌面视口、390px 视口和 200% 文本缩放下无横向溢出或文字裁切。
- 默认、新增、错误、busy/disabled 和暗色状态保持可辨认。
- “退出登录”仍是分隔线后的透明纯文字命令，视觉与本轮修改前一致。

- [ ] **Step 4: 删除临时 fixture 并检查工作树**

```powershell
git status --short
git diff --check
```

Expected: `visual-uid-menu-fixture.html` 不存在；没有空白错误；仅出现本计划涉及文件及执行前已存在的用户修改。

### Task 5: 完整验证与实施记录

**Files:**
- Create: `docs/archive/2026-07-14-uid-menu-typography-and-layout-implementation.md`
- Verify: `WuwaFrontend/src/components/controls/UidSwitcher.test.js`
- Verify: `WuwaFrontend/src/architecture.test.js`
- Verify: `WuwaFrontend/src/App.test.js`

- [ ] **Step 1: 运行完整前端测试**

From `WuwaFrontend`:

```powershell
..\.tools\node\npm.cmd test
```

Expected: 全部测试通过，0 failures。

- [ ] **Step 2: 运行生产构建**

From `WuwaFrontend`:

```powershell
..\.tools\node\npm.cmd run build
```

Expected: Vite production build 成功，且不提交 `dist/`。

- [ ] **Step 3: 写实际实施记录**

创建 `docs/archive/2026-07-14-uid-menu-typography-and-layout-implementation.md`，至少记录：

```markdown
# UID 菜单数据排版与布局实施记录

## 实际变更
- 最终修改的组件、样式和文档。
- 最终采用的字号、字重、控件高度、间距与选中态。
- 明确记录退出登录未变化。

## 验证
- 聚焦测试结果。
- 完整测试数量与结果。
- Vite 构建结果。
- 浅色、暗色、窄屏、键盘焦点和文本缩放的视觉验收结果。

## 偏差
- 与本计划不同的实现及原因；若无则写“无”。
```

- [ ] **Step 4: 最终卫生检查**

```powershell
git status --short
git diff --check
```

Expected: 不新增 `dist/`、临时 fixture、日志或本地绝对路径；不覆盖执行前已有修改。

## 提交边界

当前 `DESIGN.md`、`UidSwitcher.test.js` 和 `shell.css` 已包含执行前的未提交修改。默认不运行 `git add`、`git commit` 或 `git push`。只有用户在实施时明确授权提交，且逐项核对 diff 能区分本任务与既有修改后，才可选择性暂存本任务 hunk；不得整文件暂存后把用户修改混入提交。
