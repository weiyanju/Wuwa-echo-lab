# Web 识别复核工作流拆分实施记录

## 目标

将识别会话、快照列表、刷新反馈和回滚请求从 `App.vue` 迁入 recognition feature composable，同时保留 App 对回滚后全局数据刷新的编排职责。

## 实际完成内容

- 新增 `useRecognitionReview.js`，拥有识别会话、快照、刷新状态、回滚状态和反馈计时器。
- 将 latest session、review rows、metrics 和 refresh disabled 派生状态迁入 composable。
- 将识别列表请求、非静默刷新反馈和错误上报迁入 composable。
- 将快照回滚请求迁入 composable，但不允许其调用全局 `refreshAll`。
- App 保留 `revertSnapshot` 编排壳，在回滚成功后刷新声骸、统计、评估和识别数据。
- 组件卸载时由 App 调用 composable 的 `dispose` 清理反馈计时器。
- 将 Milestone 6 静态断言按 owner 拆分到 App、RecognitionReviewPanel 和 useRecognitionReview。
- 将 `App.vue` 增长守卫从 725 行下调到 670 行，并为识别工作流 composable 增加 120 行上限。

## 修改模块与文件

- `WuwaFrontend/src/App.vue`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/features/recognition/useRecognitionReview.js`
- `WuwaFrontend/src/features/recognition/useRecognitionReview.test.js`

## API、数据库与数据边界变化

无。识别列表、快照列表和回滚 API 的路径、参数、状态筛选与调用顺序均未改变。

## 性能与资源影响

- 没有新增网络请求、轮询或持久化状态。
- 刷新反馈计时器仍在卸载时清理，现在由 composable 明确拥有。
- 生产 JS gzip 为 56.59 kB，较上一阶段 56.41 kB 增加 0.18 kB。
- Vite 模块数从 49 增加到 50，属于 composable 拆分后的正常变化。

## 测试与验收结果

- 新增 useRecognitionReview ownership 测试，先因目标文件不存在而失败，迁移后通过。
- `npm test`：77 个测试通过。
- `npm run build`：生产构建通过。
- `App.vue` 从 718 个物理行下降到 663 行。
- `useRecognitionReview.js` 为 113 个物理行。
- `git diff --check`：通过。

## 与原计划的偏差

无行为偏差。为避免形成新的大 composable，识别复核工作流先独立于核心声骸 workspace 提取。

## 遗留问题

- 核心声骸状态、预测、统计、评估与乐观更新仍集中在 App，下一阶段应迁入独立 workspace composable。
- 浏览器运行时验证仍受当前 Windows 沙箱权限限制，未把视觉检查记录为通过。

## 长期规范同步

本阶段落实既有 feature workflow owner、错误上报和生命周期清理规则，不需要修改长期规范。

## 下一阶段入口

提取核心 `useEchoWorkspace` composable，App 仅保留认证、GameAccount、页面、主题和跨 feature 刷新编排。
