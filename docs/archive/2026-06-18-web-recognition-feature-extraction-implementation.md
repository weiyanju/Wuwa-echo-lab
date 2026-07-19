# Web 识别复核模块拆分实施记录

## 目标

将识别会话摘要和快照复核 UI 从 `App.vue` 拆入独立 feature，同时保留 API 工作流、状态值和页面视觉行为。

## 实际完成内容

- 新增 `RecognitionReviewPanel.vue`，负责识别摘要、刷新状态、快照列表和回滚按钮展示。
- 新增识别状态展示 helper，统一状态文案、状态 class 和快照标题。
- `App.vue` 继续负责获取识别数据、刷新流程和回滚 API 调用。
- 组件通过 `refresh` 和 `revert` 事件向入口层发送命令。
- 删除没有模板消费者的 `recognitionSecondarySummary` 历史计算。
- 将 `App.vue` 增长守卫从 2850 行下调到 2760 行。

## 修改模块与文件

- `WuwaFrontend/src/App.vue`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/features/recognition/RecognitionReviewPanel.vue`
- `WuwaFrontend/src/features/recognition/RecognitionReviewPanel.test.js`
- `WuwaFrontend/src/features/recognition/presentation.js`
- `WuwaFrontend/src/features/recognition/presentation.test.js`

## API、数据库与数据边界变化

无。识别 session、snapshot 和 revert 仍使用原有 API helper 与 `GameAccount` 范围。

## 性能与资源影响

- 没有新增网络请求、计时器或后台任务。
- 组件只接收已经计算好的 props，不复制识别状态。
- Vite 构建模块数从 39 增加到 41，属于职责拆分后的正常变化。

## 测试与验收结果

- 新增 3 个识别 feature 测试，先验证目标文件不存在时失败，再实现通过。
- `npm test`：56 个测试通过。
- `npm run build`：生产构建通过。
- `App.vue` 从 2848 个物理行下降到 2759 行。

## 与原计划的偏差

无。按照计划先拆分最独立的识别复核区域。

## 遗留问题

- 识别 feature 的 API 状态后续可以进一步迁入 composable，但本次不扩大范围。
- 浏览器视觉回归仍受本地浏览器运行时权限阻塞，UI 样式阶段必须补做。

## 长期规范同步

本次只落实 `architecture.md` 和 `code-organization-and-style.md` 中既有的 Vue feature 拆分规则，不需要修改长期规范。

## 下一阶段入口

继续拆分统计视图，优先把统计展示数据整理逻辑和模板迁入 `features/statistics/`，API 获取仍保留在入口编排层。
