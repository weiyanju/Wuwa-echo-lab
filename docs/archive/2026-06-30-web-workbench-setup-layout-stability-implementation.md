# Web 工作台初始化配置区稳定性实施记录

## 目标

修复声骸工作台在 1C、3C、4C 之间切换时，因为主词条候选数量不同导致左侧初始化配置区明显上下跳动的问题。

## 实际完成内容

- 为主词条候选按钮行增加独立的 `main-stat-row` 样式入口。
- 按 4C 主词条候选的三行按钮高度，为主词条候选区预留稳定高度。
- 保持 COST、主词条标题和“同一批连续调谐”在切换不同 COST 时的相对位置稳定。
- 补充前端测试，约束主词条候选区必须具备稳定高度。

## 修改模块与文件

- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`
- `WuwaFrontend/src/styles/features/workspace.css`
- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`
- `docs/web-workbench-ui-guidelines.md`
- `docs/archive/2026-06-30-web-workbench-setup-layout-stability-implementation.md`

## API、数据库与数据边界变化

无。本次只调整 Web 工作台 UI 结构标记、样式和前端测试，不改 API、数据库、后端契约或响应格式。

## 性能与资源影响

无明显影响。新增的是静态 CSS 布局约束，不增加运行时计算、网络请求或资源加载。

## 测试与验收结果

- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' test -- src/features/workspace/EchoWorkbenchView.test.js`，通过。
- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' test`，131 条前端测试通过。
- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' run build`，生产构建通过。
- 已执行 `git diff --check`，通过。

## 与原计划的偏差

无。

## 遗留问题

本轮未启动本地浏览器服务做截图验收。当前机器未检测到 5173 前端开发服务，后续可在已启动前后端后用实际页面继续微调留白。

## 长期规范同步

已更新 `docs/web-workbench-ui-guidelines.md`，新增声骸初始化配置区在 COST、套装或主词条候选数量变化时应保持录入路径稳定的长期规则。

## 下一阶段入口

如果实际页面截图显示 1C 预留区留白过多，可继续比较“1C 第三个主词条居中半宽”和“保持整行宽度”两种视觉方案。
