# Web 工作台初始化配置区稳定性实施记录

## 目标

优化声骸工作台在 1C、3C、4C 之间切换时的主词条候选区体验：避免原始布局的生硬跳动，同时撤回固定大高度方案带来的 1C 空白问题。

## 实际完成内容

- 撤回主词条候选区固定 `148px` 高度的方案，恢复 1C 场景的紧凑布局。
- 为主词条候选区保留独立 `main-stat-row` 样式入口。
- 使用 Vue `TransitionGroup` 为主词条按钮切换增加短促的淡入和轻微位移过渡。
- 调整前端测试，约束主词条候选区不能再用固定大高度制造异常留白，并要求具备轻量过渡样式。

## 修改模块与文件

- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`
- `WuwaFrontend/src/features/workspace/useEchoWorkbenchLayout.js`
- `WuwaFrontend/src/styles/features/workspace.css`
- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`
- `docs/web-workbench-ui-guidelines.md`
- `docs/archive/2026-06-30-web-workbench-setup-layout-stability-implementation.md`

## API、数据库与数据边界变化

无。本次只调整 Web 工作台 UI 结构、样式、前端测试和文档，不改 API、数据库、后端契约或响应格式。

## 性能与资源影响

无明显影响。新增的是 Vue 内置过渡组和 CSS 过渡，不增加网络请求、后端计算或额外资源加载。

## 测试与验收结果

- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' test -- src/features/workspace/EchoWorkbenchView.test.js`，通过。
- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' test`，131 条前端测试通过。
- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' run build`，生产构建通过。
- 已执行 `git diff --check`，通过。

## 与原计划的偏差

相较上一版固定主词条候选区高度的方案，本次改为紧凑布局加轻量过渡。原因是固定高度虽然减少跳动，但在 1C 场景下产生了明显空白，不符合工作台低噪音和高密度录入体验。

## 遗留问题

本轮尚未做浏览器截图验收。若实际页面仍感到切换生硬，可继续微调过渡时长或按钮位移幅度。

## 长期规范同步

已更新 `docs/web-workbench-ui-guidelines.md`，明确声骸初始化配置区应保持自然稳定，避免通过固定大高度制造异常留白；候选数量变化时可使用短促、克制的过渡缓和变化。

## 下一阶段入口

在前后端服务启动后，用实际页面检查 1C、3C、4C 切换时的主词条候选区过渡是否足够轻、不拖慢录入节奏。

## 2026-06-30 补充修复：主词条切换过渡

用户反馈上一版过渡仍存在问题：1C 切换到 3C 不够丝滑，3C 切换到 4C 会跳一下。复查后确认原因是上一版只对 `TransitionGroup` 内部按钮做淡入和轻微位移，没有让父级候选区高度参与过渡；当候选数量从两行变为三行时，容器高度会立即变化。同高度重排时也缺少按钮移动过渡，因此 3C 到 4C 仍会出现视觉跳动。

本轮补充实现：

- 在 `EchoWorkbenchView.vue` 为主词条候选区增加 `main-stat-row-shell` 高度过渡壳层，切换前锁定当前真实高度，DOM 更新后过渡到新真实高度，过渡结束后恢复自适应高度。
- 将工作台布局测量与过渡逻辑收敛到 `useEchoWorkbenchLayout.js`，避免高吸引力入口文件继续膨胀。
- 为主词条按钮补充 `main-stat-option-move` 过渡，让 3C 到 4C 这类按钮重排也能平滑移动。
- 保留 1C 紧凑布局，不使用固定大高度或额外空白占位。
- 更新 `EchoWorkbenchView.test.js`，约束主词条区必须具备真实高度过渡、按钮移动过渡，并继续禁止固定 `148px` 大高度方案。
- 更新 `docs/web-workbench-ui-guidelines.md`，将长期规则明确为“真实内容高度过渡 + 按钮移动过渡”。

补充验证：

- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' test -- src/features/workspace/EchoWorkbenchView.test.js`，通过。
- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' test`，131 条前端测试通过。
- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' run build`，生产构建通过。
- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' test`，131 条前端测试通过。
- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' run build`，生产构建通过。

## 2026-06-30 补充修复：收起方向过渡

用户继续反馈 1C 切换到 3C/4C 已经丝滑，但 3C/4C 切回 1C 时收起方向像没有动画。复查后确认根因是上一版在锁定外层壳高度后，用外层 `scrollHeight` 读取目标高度；当旧高度大于新内容高度时，外层 `scrollHeight` 仍会被旧显式高度撑住，导致逻辑误判“目标高度未变化”，于是直接清空高度，收起动画被跳过。

本轮补充实现：

- 主词条候选区的目标高度改为测量内部 `TransitionGroup` 的真实内容高度，不再用外层壳的 `scrollHeight` 判断收起目标。
- 更新 `EchoWorkbenchView.test.js`，约束收起方向必须测内部内容高度，并禁止回退到外层 `row.scrollHeight`。
- 不改 API、数据库、后端契约，也不新增长期 UI 规则。

补充验证：

- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' test -- src/features/workspace/EchoWorkbenchView.test.js`，通过。
