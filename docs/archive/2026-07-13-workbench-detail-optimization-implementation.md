# Web 工作台细节优化实施记录

## 目标

在保留现有高频录入逻辑的前提下，优化工作台的信息层级、桌面布局、配置切换、预测反馈、副词条矩阵与浮动历史面板，让用户更容易理解当前声骸和下一步动作。

## 实际完成内容

- 桌面端左侧初始化面板改为视口内吸顶，内部内容独立滚动，高度由可用视口决定，不再被右侧词条矩阵总高度拉伸。
- 宽度在 1180–1440px 时使用紧凑桌面布局，1179px 及以下切为单列，避免左右区域在窄桌面上互相挤压。
- 套装列表增加搜索入口。
- 当前声骸为 0/5 时，修改套装、COST 或主词条直接更新当前草稿；已经录入至少一条副词条后，修改配置会立即创建并切换到新的声骸，保留原有高频操作效率。
- 配置切换前显示清楚的当前进度和动作结果，避免用户误认为旧声骸被覆盖。
- 预测摘要使用“预测 / 其他可能”两层文案，最高概率并列项保持同级展示，预测绿与矩阵高亮保持统一语义。
- 保存期间锁定副词条矩阵，避免重复提交和状态竞态。
- 浮动历史面板桌面端默认最小化并停靠右下角，需要时再展开，不持续压迫主任务。
- 补充配置创建、工作台状态、布局测量和历史面板定位测试。

## 修改模块与文件

- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`
- `WuwaFrontend/src/features/workspace/ActiveEchoCapturePanel.vue`
- `WuwaFrontend/src/features/workspace/useEchoWorkspace.js`
- `WuwaFrontend/src/features/workspace/useEchoWorkbenchLayout.js`
- `WuwaFrontend/src/features/workspace/echoConfigCreation.js`
- `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`
- `WuwaFrontend/src/features/history/floatingHistoryPosition.js`
- 对应的 `*.test.js` 文件
- `WuwaFrontend/src/styles/features/workspace.css`
- `WuwaFrontend/src/styles/features/workspace-active.css`
- `WuwaFrontend/src/styles/features/history.css`
- `docs/superpowers/specs/2026-07-13-workbench-detail-optimization-design.md`
- `docs/superpowers/plans/2026-07-13-workbench-detail-optimization.md`
- `docs/web-workbench-ui-guidelines.md`
- `docs/web-ui-design-system-v2.md`
- `DESIGN.md`

## API、数据库与数据边界变化

无。继续使用现有声骸创建、更新、删除和预测接口；未修改数据库 schema、响应格式或跨端数据边界。

## 性能与资源影响

无明显后端或网络影响。新增逻辑集中在前端状态判断、局部布局测量和浮层定位；未增加轮询、额外 API 请求或大型资源。

## 测试与验收结果

- 2026-07-13 执行 `cd WuwaFrontend; ..\.tools\node\npm.cmd test`，211 项前端测试通过。
- 2026-07-13 执行 `cd WuwaFrontend; ..\.tools\node\npm.cmd run build`，Vite 生产构建通过。
- 已在本地浏览器检查桌面工作台的吸顶面板、不同宽度布局、0/5 与已录入配置切换、矩阵保存锁定、预测摘要和历史面板默认停靠状态。

## 与原计划的偏差

早期方案曾考虑“配置修改只作用于下一条声骸并等待显式确认”。结合现有高频流程后，最终改为：0/5 直接修改当前草稿；已有录入时，点击新配置立即新建并切换。该行为延续用户原有操作习惯，同时通过进度与结果反馈降低误操作风险。

## 遗留问题

- 部分工作台状态仍使用超过 1px 的彩色左侧强调边，和当前长期设计规范不一致；应在后续视觉债务修复中改为完整边框、背景、图标或文字语义。
- 更低高度的桌面视口仍建议继续做真实内容压力测试，确认左侧内部滚动和右侧矩阵不会遮挡关键操作。

## 长期规范同步

已同步 `DESIGN.md`、`docs/web-workbench-ui-guidelines.md` 与 `docs/web-ui-design-system-v2.md`，沉淀配置切换、吸顶布局、预测摘要、保存锁定和历史面板规则。

## 下一阶段入口

先处理本次全局审查列出的实现与规范差异，再继续做工作台视觉细节优化。
