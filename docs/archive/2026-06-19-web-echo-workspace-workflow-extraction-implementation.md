# Web 声骸工作区工作流拆分实施记录

## 目标

将核心声骸状态、派生数据、持久化命令与乐观更新从 `App.vue` 迁入 workspace feature composable，让 App 只保留认证、账号、页面、主题和跨 feature 刷新编排。

## 实际完成内容

- 新增 `useEchoWorkspace.js`，集中拥有声骸列表、当前声骸、表单、预测、统计、评估和保存状态。
- 迁移声骸创建、配置更新、丢弃、下一件、词条录入与撤销工作流。
- 迁移矩阵行、可见历史数量和模型详情卡等工作区派生数据。
- 保留现有乐观更新与后台刷新时序，并在用户写操作前清除旧错误。
- composable 负责清理后台刷新计时器，不跨入 recognition feature。
- `App.vue` 仅组合 workspace 与 recognition 刷新，并在退出账号或切换账号时重置两者。
- 将 `App.vue` 增长守卫从 670 行收紧到 320 行，为 `useEchoWorkspace.js` 增加 360 行上限。

## 修改模块与文件

- `WuwaFrontend/src/App.vue`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/features/workspace/useEchoWorkspace.js`
- `WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js`

## API、数据库与数据边界变化

无。声骸创建、更新、副词条录入、撤销、预测、统计和评估仍使用原有 API 路径、参数与响应结构；数据库契约未改变。

## 性能与资源影响

- 没有新增网络请求、轮询或持久化状态。
- 后台刷新计时器仍在组件卸载时清理，所有权从 App 移至 workspace composable。
- 生产构建转换 51 个模块，主 JS gzip 为 57.32 kB。

## 测试与验收结果

- 新增 workspace ownership、持久化、乐观更新、生命周期和错误清理测试。
- 错误清理回归测试先因命令未清除旧错误而失败，补回原有时序后通过。
- `npm test`：81 个测试通过。
- `npm run build`：生产构建通过。
- `App.vue` 从 663 个物理行下降到 316 行。
- `useEchoWorkspace.js` 为 354 个物理行。
- `git diff --check`：通过。

## 与原计划的偏差

无行为偏差。工作区 composable 不拥有认证、GameAccount、识别复核或页面导航状态。

## 遗留问题

- 浏览器运行时验证仍受当前 Windows 沙箱权限限制，未将视觉检查记录为通过。
- workspace composable 已接近 360 行守卫；后续新增独立业务流程时应拆出更小的 service/composable，而不是继续集中增长。

## 长期规范同步

本阶段落实既有 feature workflow owner、错误上报和生命周期清理规则，不需要修改长期架构规范。

## 下一阶段入口

阶段 2 的主要 Vue 高吸力入口已经完成拆分。下一步进入阶段 3，统一 Web UI token、控件状态与 feature 样式边界。
