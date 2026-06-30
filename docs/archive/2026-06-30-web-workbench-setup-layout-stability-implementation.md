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
