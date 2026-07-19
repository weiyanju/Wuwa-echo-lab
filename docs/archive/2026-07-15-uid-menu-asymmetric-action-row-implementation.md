# UID 菜单非等权同行操作实施记录

## 实施结果

UID 菜单已移除独立“退出登录”页脚，改为单一非等权操作行：默认状态左侧为可伸缩的“添加 UID”，右侧为固定 88px 的低频“退出登录”；新增状态原位切换为“确认添加 / 取消”。两侧均保持 44px 点击高度，但通过宽度、填充、字号和交互色区分操作权重，不使用图标、50/50 等分或分隔线。

菜单表面同步收敛为 16px 圆角、16px 内边距和短阴影实色面；标题与容量采用 Label / Data 排版。浅色与暗色主题分别提供中性取消态和弱危险退出态。

## 交互与可访问性

- 新增输入继续使用原有 9 位 UID 校验和 `add` 事件。
- 提交按钮通过 `form="uid-switcher-add-form"` 保持原生表单提交语义。
- 点击“取消”会清空草稿与错误、恢复默认操作行，并将焦点返回“添加 UID”。
- “退出登录”保留 `role="menuitem"` 和原有 `sign-out` 事件。
- Escape、点击外部、账号切换、busy 关闭和菜单关闭后的焦点恢复逻辑未改变。

## 变更文件

- `WuwaFrontend/src/components/controls/UidSwitcher.vue`
- `WuwaFrontend/src/components/controls/UidSwitcher.test.js`
- `WuwaFrontend/src/styles/shell.css`
- `DESIGN.md`
- `docs/superpowers/specs/2026-07-15-uid-menu-asymmetric-action-row-design.md`
- `docs/superpowers/plans/2026-07-15-uid-menu-asymmetric-action-row.md`

## 验证记录

- RED：首次聚焦测试共 11 项，7 通过、4 失败；失败点对应旧页脚结构、缺少取消聚焦逻辑、旧菜单表面和旧提交间距。
- 组件结构完成后：11 项中 9 通过、2 个样式契约仍失败，证明结构与样式阶段彼此独立。
- 聚焦与架构测试：23 / 23 通过。
- 完整前端测试：257 / 257 通过，0 失败。
- Vite 生产构建：通过。
- `git diff --check`：通过。
- 架构边界：`UidSwitcher.vue` 240 行（上限 250），`shell.css` 911 行（上限 920），未调整限制。

## 视觉验证限制

应用内浏览器中的 `http://localhost:55098/` 与两个 `http://127.0.0.1:5174/visual-uid-menu-fixture.html` 标签均显示“无法访问此站点”。因此本次没有声称完成默认、新增、校验错误、容量上限、暗色和窄屏状态的截图验收；后续本地服务可访问时仍应补做视觉 QA。

## 仓库状态

实施位于现有功能分支 `codex/workbench-terminal-ui`。工作区在本次修改前已包含连续 UI 设计迭代，本次保留这些既有未提交修改；未执行暂存、提交、推送或创建 PR。
