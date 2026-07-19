# 登录框 UID 绑定页底部“返回登录”实施记录

## 交付范围

本次改动只调整 Web 首页登录卡片内部的首次 UID 绑定页：

- 删除标题区返回图标及其内联 SVG，使标题、说明、字段和提示恢复同一左基线。
- 保留蓝色 `BIND_AND_ENTER()` 作为唯一主操作。
- 在主按钮下方增加居中的原生按钮“返回登录”。按钮使用灰色文字、透明背景、无边框、无图标和无阴影，命中高度至少 `44px`；hover、focus-visible 与 active 只加深文字，busy 时禁用。
- `aria-label` 与 `title` 均为“退出当前账号并返回登录”。按钮继续发出 `cancel`，`LoginView.vue` 转发为 `sign-out`，`App.vue` 执行退出并通过既有反向卡片过渡返回认证页。
- 未改变登录页外壳、认证/UID 数据模型、API 契约、工作台或其他 feature。

## 文件与提交

生产、测试与长期文档交付文件：

- `WuwaFrontend/src/features/auth/UidBindingPanel.vue`
- `WuwaFrontend/src/styles/features/auth.css`
- `WuwaFrontend/src/features/auth/UidBindingPanel.test.js`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`
- `DESIGN.md`
- `docs/web-homepage-terminal-design.md`

交付提交：

- `f96ff185` `refactor: move uid return action below bind`
- `32699718` `style: demote uid return to bottom text action`
- `afb3e124` `test: harden uid return style contracts`
- `b916199e` `docs: align uid return action guidance`

## RED / GREEN 证据

- Task 1 聚焦验证：RED 为 `35/37`，实现后 GREEN 为 `37/37`。
- Task 2 样式契约：RED 为 `15/16`，实现后 GREEN 为 `53/53`。
- 后续强化样式契约后再次通过 `53/53`。

## 最终验证

2026-07-19 在 `codex/sample-stage-weight-guide`、`b916199e737a59863030f2661b2c9ec465a5439e` 上执行：

- `WuwaFrontend` 全量测试 `..\.tools\node\npm.cmd test`：`342` tests，`342` pass，`0` fail，`0` cancelled，`0` skipped，`0` todo；耗时 `5841.5538ms`。
- 生产构建 `..\.tools\node\npm.cmd run build`：Vite `8.0.10` 成功，`89` modules transformed，`built in 2.91s`。主要产物为 `index.html` `0.48kB`（gzip `0.33kB`）、CSS `842.16kB`（gzip `238.57kB`）和 JS `262.08kB`（gzip `82.68kB`）。
- 仓库根目录 `git diff --check` 退出码为 `0`。仅三个受保护的 evaluation 工作树文件报告未来 LF→CRLF 转换警告，没有 whitespace error。
- `UidBindingPanel.vue` 与 UID 生产 CSS 中不存在 `terminal-uid-back` 或 `<svg`；当前 active 文档中不存在旧正向规则“UID 页左上角”或“返回图标位于绑定页”。
- 新的 `terminal-uid-actions`、`terminal-uid-return`、可见文案、精确 aria/title、busy 禁用、状态颜色、全局焦点轮廓、响应式间距和 reduced-motion 契约均存在并由测试覆盖。
- `auth.css` 为 `412` 行，低于 `420` 行上限。
- `e9fe82b..b916199e` 的交付提交文件列表不包含 evaluation 文件。

## Hallmark 自审

按 Hallmark 完整 audit / anti-slop 清单对本次登录卡片改动进行源代码审查：

- **层级与动作优先级：通过。** 蓝色实底只属于绑定主操作；返回动作降为居中灰色文字按钮，没有第二个实底或同权重 CTA。
- **对齐：通过。** 移除 44px 图标列后，标题、说明、UID 字段和提示共享卡片左基线；次级动作只在操作区居中。
- **字体与 token：通过。** 返回动作复用 `--font-ui`、既有字号/字重/字距、圆角与颜色 token，没有新增字体、颜色体系、内联 SVG 或一次性装饰。
- **交互与语义：通过。** 使用原生 `button type="button"`，可见文案和精确 aria/title 均说明结果；`cancel → sign-out → auth` 保留真实退出语义，不伪装成普通“上一步”。
- **状态：通过，但有一项记录性关注。** hover、focus-visible、active、disabled/busy 均有源代码契约，标签默认色对白底约 `7.814:1`、聚焦/激活色约 `18.883:1`。既有全局 `3px rgba(0, 100, 224, 0.26)` 焦点轮廓继续生效，但其浅色表面混合对比约 `1.47:1`，低于 Hallmark gate 40 的严格 `3:1` 焦点环阈值；该值是已批准并由现有测试锁定的全局设计 token，本次 archive-only 任务未扩大范围修改。聚焦时按钮文字同时加深。
- **响应式：源代码通过。** 860px 以下操作组改为正常流 `24px` 间距，520px 以下收紧标题间距；44px 命中高度和短单行文案保持不变。由于没有真实浏览器会话，本次未宣称渲染态或 320/375/414/768px 实机验证。
- **动效：通过。** 返回动作只过渡颜色 `120ms`，不改变布局；reduced-motion 下取消该过渡，卡片继续使用既有 16px 以内方向过渡并提供降级。
- **反模板与指纹一致性：通过。** 未引入渐变、嵌套卡片、边条、玻璃、悬浮缩放、表情、假 chrome 或装饰图标；入口终端语气、IBM Plex 字体和 Tethys token 保持一致。
- **范围：通过。** 生产改动只落在 auth owner 与既有 `App.vue` 退出编排边界，未触及其他页面逻辑或视觉体系。

## 限制与仓库状态

- 先前浏览器自动化不可用，本次未切换到无关浏览器或会话，因此真实“登录成功但无 UID → 返回登录”的端到端交互与实时视觉 QA 仍未执行。结论依赖聚焦/全量测试、生产构建、源代码契约检查和此前批准的预览，不能视为新的 live browser 证据。
- 以下无关 evaluation 工作树改动保持原样，未编辑、暂存或纳入本功能提交：
  - `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`
  - `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`
  - `WuwaFrontend/src/styles/features/evaluation.css`
  - `docs/archive/2026-07-19-evaluation-highest-hit-badge-removal-implementation.md`
- 本任务未执行 merge 或 push。
