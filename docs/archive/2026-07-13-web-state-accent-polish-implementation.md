# Web 状态强调视觉优化实施记录

## 目标

移除登录、历史记录、工作台与评估界面中超过 1px 的彩色左右侧边强调，并以更清晰、更克制的完整状态语言替代，确保修改是审美与可用性的提升，而非单纯满足静态规则。

## 实际完成内容

- 登录标题取消装饰性蓝色左条，重新平衡标题下方留白。
- 修正打字光标结束位置，使其贴合标题文字；520px 以下继续取消光标并允许标题自然换行。
- 套装选中态改为完整主色边界、均匀低饱和背景和 Iconoir 风格勾选标记，原有 `aria-current` 保留。
- 最高预测行取消透明预留侧条、彩色 inset 条和单侧渐变，改为完整绿色边界、均匀语义底色与既有上升图标。
- 历史筛选取消抬升、宽阴影与彩色 inset 条，改用完整边界、均匀底色和固定宽度的勾选槽位；切换筛选时不发生宽度变化或整行重排。
- 历史记录取消彩色 inset 条、单侧渐变和悬停抬升，使用完整状态边界、均匀底色、既有状态徽标和当前项完整焦点环；当前项补充 `aria-current`。
- 模型判断摘要从引用式左条改为带“判断”阅读标签的紧凑信息行，浅色与深色主题均使用完整低对比边界和轻量底色。
- 新增覆盖 Web 全部样式入口的设计守卫，防止再次引入多像素彩色侧边框、横向 inset 侧条或未登记的伪元素侧条。

## 二次复核纠正

- 首轮守卫只覆盖四个 feature CSS，且没有识别伪元素侧条；原“全站已解决”的结论因此重新打开并纠正。
- 删除 `.model-detail-thumb::before` 遗留的 3px 装饰性左侧条；缩略卡继续用完整边框、均匀表面和焦点环表达悬停、键盘焦点与选中状态。
- 按用户确认保留 Bayes 路径卡片内部的实线/虚线路径编码：它位于卡片内容内部，用实线绿色与虚线紫色区分 Exact/Wildcard，是数据语义而非通用卡片装饰。守卫只对 `.bayes-path-list article::before` 设置具名例外。
- Impeccable 的绝对禁止项仍严格用于超过 1px 的彩色左右侧边强调；顶部强调按个案审查，不扩写成不存在的绝对禁令。
- 删除周期窗口、分组权重、大型模型条和 Markov 惩罚卡的粗顶部边框，以及展开/最佳模型行的顶部 inset 轨道；保留完整 1px 外框、语义表面、文字标签、徽标、进度条、坐标轴和箭头。
- 深色主题同步删除上述卡片家族的顶部强调色覆盖，继续使用统一边界和低饱和语义底色。
- 守卫范围扩展到 `src/styles/` 下当前全部 12 个 CSS 入口，并以具名白名单保留光标、箭头、坐标轴、时间线和 Bayes 路径等功能图形。

## 修改模块与文件

- 登录：`WuwaFrontend/src/styles/features/auth.css`
- 工作台：`WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`、`WuwaFrontend/src/styles/features/workspace.css`
- 历史记录：`WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`、`WuwaFrontend/src/styles/features/history.css`
- 评估：`WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`、`WuwaFrontend/src/styles/features/evaluation.css`
- 测试：`WuwaFrontend/src/design-state-accent.test.js`、`WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`
- 设计与计划：`docs/superpowers/specs/2026-07-13-web-state-accent-polish-design.md`、`docs/superpowers/plans/2026-07-13-web-state-accent-polish.md`

## API、数据库与数据边界变化

无。没有修改 API、数据库模型、凭据、认证流程或本地 PostgreSQL 数据。

## 性能与资源影响

- 复用已有 `check.svg` 与 `fast-arrow-up.svg`，没有新增图片或第三方依赖。
- 删除历史记录与筛选项的宽阴影和位移动画，减少不必要的绘制与布局变化。
- 新增状态过渡仅涉及颜色、边框、透明度和不改变布局的完整焦点环。

## 测试与验收结果

- 二次 TDD 红灯阶段：全站守卫准确报告 `.model-detail-thumb::before` 的 3px 伪元素侧条；Bayes 实线/虚线路径保留断言未失败。
- `cd WuwaFrontend; ..\.tools\node\node.exe --test src/design-state-accent.test.js`：修正后 5 项通过。
- `cd WuwaFrontend; ..\.tools\node\node.exe --test src/design-state-accent.test.js src/features/evaluation/EvaluationBacktest.test.js src/App.test.js src/architecture.test.js`：48 项通过。
- `cd WuwaFrontend; ..\.tools\node\npm.cmd test`：216 项通过，0 项失败。
- `cd WuwaFrontend; ..\.tools\node\npm.cmd run build`：Vite 生产构建通过。
- Impeccable 检测器对 `evaluation.css` 的 `side-tab` 与 `border-accent-on-rounded` 结果均为 0。
- 全站静态守卫确认：除具名功能图形外，12 个 CSS 入口中不存在超过 1px 的彩色左右边框、模拟侧条的横向 inset shadow 或未登记的绝对定位伪元素侧条。
- 本地预览 `http://localhost:5173/` 可正常打开，但应用内浏览器只有未登录页面，没有可复用的已认证评估会话。本轮没有输入用户凭据，也没有创建账号或伪造 PostgreSQL 业务数据，因此未宣称登录后评估页已完成人工视觉验收。
- `git diff --check` 通过；构建产物、日志、数据库和临时预览文件未进入版本状态。

## 与原计划的偏差

原计划要求在已登录的真实业务数据路径中逐项检查。当前应用内浏览器没有可复用登录会话，而创建临时账号或伪造业务记录会改变用户的本地 PostgreSQL 数据，因此没有执行该写操作。登录后状态以全站静态守卫、选择器专项断言、组件回归、Impeccable 检测和生产构建完成技术验证；人工实景证据仍受登录状态限制。

## 遗留问题

登录后评估页的人工视觉证据尚未补齐。后续可在用户已经登录现有本地账号的会话中复核浅色、深色、桌面与窄屏状态；这不影响本轮静态守卫、测试、Impeccable 检测和构建结论。

## 长期规范同步

不修改 `DESIGN.md` 或 `.impeccable/design.json`。本次实现遵循并落实既有的“禁止超过 1px 的彩色左右侧边条”规则，专项设计记录保存在 `docs/superpowers/specs/2026-07-13-web-state-accent-polish-design.md`。

## 下一阶段入口

继续按 `docs/archive/2026-07-13-project-documentation-audit.md` 中已经确认的优先级处理本地开发配置、未来生产配置边界与根目录临时资产，不把本次视觉调整扩大到后端或数据库。
