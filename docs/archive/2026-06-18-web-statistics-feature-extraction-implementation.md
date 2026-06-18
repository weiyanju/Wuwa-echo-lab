# Web 统计视图拆分实施记录

## 目标

将统计诊断的展示数据整理、图表模板和阶段展示从 `App.vue` 迁入独立 statistics feature，保持现有统计 API 和视觉结构不变。

## 实际完成内容

- 新增 `StatisticsView.vue`，负责统计摘要、偏差图和样本阶段展示。
- 新增 statistics presentation helper，负责偏差计算、排序、状态 class、样本可信度和阶段映射。
- `App.vue` 只向统计视图传入后端返回的 `stats` 数据。
- 删除无消费者的 `sampleStageRows` 和 `statDiagnosticText`。
- 将 `App.vue` 增长守卫从 2760 行下调到 2590 行。

## 修改模块与文件

- `WuwaFrontend/src/App.vue`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/features/statistics/StatisticsView.vue`
- `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- `WuwaFrontend/src/features/statistics/presentation.js`
- `WuwaFrontend/src/features/statistics/presentation.test.js`

## API、数据库与数据边界变化

无。统计数据仍通过原有 `getStats(gameAccountId)` 获取，组件不直接调用 API。

## 性能与资源影响

- 没有新增网络请求、定时器或持久状态。
- 统计 derived state 只在 `stats` prop 变化时重新计算。
- Vite 构建模块数从 41 增加到 43，属于职责拆分后的正常变化。

## 测试与验收结果

- 新增 3 个 statistics feature 测试，先验证缺少目标文件时失败，再实现通过。
- `npm test`：59 个测试通过。
- `npm run build`：生产构建通过。
- `App.vue` 从 2759 个物理行下降到 2589 行。

## 与原计划的偏差

无。

## 遗留问题

- 浏览器视觉回归仍受本地浏览器运行时权限阻塞。
- 模型评估视图仍是 `App.vue` 中最大的独立展示区域。

## 长期规范同步

本次只落实既有 Vue feature、纯展示 helper 和入口层变薄规则，不需要修改长期规范。

## 下一阶段入口

拆分模型评估视图。该区域较大，应先提取纯 presentation helper，再迁移模板，避免一次移动状态与 API 工作流。
