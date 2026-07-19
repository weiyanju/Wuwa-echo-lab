# Web 声骸工作台视图拆分实施记录

## 目标

将“初始化声骸”“当前声骸”和副词条档位矩阵从 `App.vue` 迁入独立 workspace feature，同时保留 App 中的保存、预测、刷新和乐观更新工作流。

## 实际完成内容

- 新增 `EchoWorkbenchView.vue`，负责配置表单、当前声骸摘要、录入进度、操作按钮和副词条矩阵。
- 组件直接复用现有套装、主词条、副词条标签和格式化服务，不复制展示规则。
- 组件通过 `config-change`、`undo`、`discard`、`next` 和 `select-tier` 事件发出命令。
- App 继续负责 `updateEcho`、`addSubstat`、`undoLastSubstat`、草稿复用、预测刷新和乐观更新回滚。
- 将左右面板等高的 DOM refs、resize 监听和卸载清理迁入实际视图 owner。
- 删除 App 中已经没有调用者的展示计算和 pending 行 helper。
- 将旧档位交互测试拆分归属：业务工作流检查 App，按钮禁用与 memo 检查工作台组件。
- 将 `App.vue` 增长守卫从 910 行下调到 725 行，并为工作台视图增加 210 行上限。

## 修改模块与文件

- `WuwaFrontend/src/App.vue`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`
- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`

## API、数据库与数据边界变化

无。所有声骸创建、更新、弃置、副词条录入与撤回请求仍沿用既有 API、参数和调用顺序。

## 性能与资源影响

- 没有新增网络请求或持久化状态。
- resize 监听器现在与工作台视图生命周期绑定。
- 生产 JS gzip 为 56.41 kB，较上一阶段 56.18 kB 增加 0.23 kB。
- Vite 模块数从 48 增加到 49，属于 feature 拆分后的正常变化。

## 测试与验收结果

- 新增 EchoWorkbenchView ownership 测试，先因目标文件不存在而失败，迁移后通过。
- `npm test`：74 个测试通过。
- `npm run build`：生产构建通过。
- `App.vue` 从 902 个物理行下降到 718 行。
- `EchoWorkbenchView.vue` 为 205 个物理行。
- `git diff --check`：通过。

## 与原计划的偏差

无行为偏差。组件为纯展示与事件边界，不持有业务数据或 API 依赖。

## 遗留问题

- `EchoWorkbenchView.vue` 同时承载配置与矩阵两个子区域，后续只有在区域独立增长时才需要继续拆分。
- 浏览器运行时验证仍受当前 Windows 沙箱权限限制，未把视觉检查记录为通过。

## 长期规范同步

本阶段落实既有 feature owner、事件接口和生命周期归属规则，不需要修改长期规范。

## 下一阶段入口

阶段 2 的主要 Vue 高吸力视图已完成拆分。下一步盘点 App 剩余业务编排，决定先提取 workspace composable，还是转入阶段 3 的全局样式拆分与 UI 一致性收口。
