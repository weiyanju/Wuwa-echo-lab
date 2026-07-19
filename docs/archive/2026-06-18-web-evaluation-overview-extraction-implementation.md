# Web 模型评估概览拆分实施记录

## 目标

将模型评估页的状态条、融合权重和结论摘要从 `App.vue` 迁入独立 evaluation feature，保留复杂回测详情的现有交互边界。

## 实际完成内容

- 新增 `EvaluationOverview.vue`，负责评估状态、融合权重卡和结论摘要展示。
- 概览组件拥有摘要与权重卡之间的 hover/focus 联动状态。
- App 继续负责 API 数据和 `modelDetailCards` 编排，组件不重复构建模型详情。
- 删除 App 中已迁移的权重、状态、摘要和 hover 死代码。
- 更新旧静态测试，使融合概览断言指向实际 feature owner。
- 将 `App.vue` 增长守卫从 2590 行下调到 2390 行。

## 修改模块与文件

- `WuwaFrontend/src/App.vue`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/features/evaluation/EvaluationOverview.vue`
- `WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js`

## API、数据库与数据边界变化

无。App 仍通过原有 API 获取 prediction、stats 和 evaluation 数据。

## 性能与资源影响

- 没有新增网络请求、定时器或持久状态。
- `buildModelDetailCards` 仍只在 App 执行一次，结果作为 prop 传入概览组件。
- Vite 模块数从 43 增加到 44，属于 feature 拆分后的正常变化。

## 测试与验收结果

- 新增 EvaluationOverview ownership 测试，先因目标文件不存在而失败，迁移后通过。
- `npm test`：63 个测试通过。
- `npm run build`：生产构建通过。
- `App.vue` 从 2589 个物理行下降到 2384 行。
- `git diff --check`：通过。

## 与原计划的偏差

没有一次性迁移整个评估页。复杂的子模型展开、Markov 拖拽和证据面板保留在下一小阶段，以降低交互回归风险。

## 遗留问题

- 将核心回测与子模型详情迁入独立 evaluation component。
- 浏览器运行时可用后补做评估页交互和视觉回归。

## 长期规范同步

本次落实既有 feature owner 和 App 编排层规则，不需要修改长期规范。

## 下一阶段入口

提取模型回测详情组件，让拖拽事件监听器和展开状态随组件生命周期管理，最终使 App 只传入评估数据。
