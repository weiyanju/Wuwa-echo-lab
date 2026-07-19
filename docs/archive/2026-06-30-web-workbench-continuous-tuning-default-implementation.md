# Web 工作台默认连续调谐实施记录

## 目标

优化声骸工作台初始化配置区，去掉“同一批连续调谐”显式勾选项，让工作台默认按连续调谐流程处理新声骸，减少主录入路径上的解释型控件。

## 实际完成内容

- 移除 `EchoWorkbenchView.vue` 中的“同一批连续调谐”checkbox。
- 将 `useEchoWorkspace.js` 的默认表单状态改为 `is_continuous_tuning: true`。
- 创建新声骸和更新可复用空草稿时，前端固定传入 `is_continuous_tuning: true`。
- 保持“下一个”和“弃置后创建下一只”继续继承当前套装、COST 和主词条配置。
- 补充前端测试，约束工作台不再展示连续调谐开关，并验证新声骸默认按连续调谐创建。

## 修改模块与文件

- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`
- `WuwaFrontend/src/features/workspace/useEchoWorkspace.js`
- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`
- `WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js`
- `docs/web-workbench-ui-guidelines.md`
- `docs/archive/2026-06-30-web-workbench-continuous-tuning-default-implementation.md`

## API、数据库与数据边界变化

无。本次不修改后端模型、数据库 migration、API 响应格式或请求字段契约。`is_continuous_tuning` 字段继续保留，Web 工作台只是默认传入 `true`，并不在主录入界面暴露开关。

## 性能与资源影响

无明显影响。本次移除一个前端控件并固定一个布尔字段默认值，不增加网络请求、后台计算或资源加载。

## 测试与验收结果

- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' test -- src/features/workspace/EchoWorkbenchView.test.js`，通过。
- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' test -- src/features/workspace/useEchoWorkspace.test.js`，通过。
- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' test`，133 条前端测试通过。
- 已执行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' run build`，生产构建通过。

## 与原计划的偏差

无。按确认后的设计执行：默认连续调谐、隐藏开关、保留底层字段。

## 遗留问题

尚未做浏览器视觉验收。后续如果用户希望进一步解释“下一只继承当前配置”的行为，可考虑在“下一个”按钮附近用轻量提示表达，而不是恢复开关。

## 长期规范同步

已更新 `docs/web-workbench-ui-guidelines.md`，明确声骸工作台默认按连续调谐流程处理新声骸，并且连续调谐不作为主流程中的显式开关展示。

## 下一阶段入口

继续在本地页面检查移除开关后初始化配置区的垂直节奏是否更自然，以及“下一个”继承当前配置是否符合实际录入预期。
