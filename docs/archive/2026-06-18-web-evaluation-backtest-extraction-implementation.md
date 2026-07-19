# Web 模型回测详情拆分实施记录

## 目标

将核心回测、模型展开详情和 Markov 拖拽交互从 `App.vue` 迁入独立 evaluation feature，保持现有数据和视觉行为不变。

## 实际完成内容

- 新增 `EvaluationBacktest.vue`，负责覆盖率图、子模型排序、展开详情、证据 tab 和模型内部图表。
- 将展开/折叠状态迁入组件局部状态。
- 将 Markov 指针拖拽监听迁入组件，并在组件卸载时清理 document 监听器。
- App 只传入 evaluation、prediction 和已计算的 modelDetails。
- 删除 App 中全部回测展示、交互和格式化死代码。
- 更新旧静态测试，使回测相关断言指向实际 feature owner。
- 将 `App.vue` 增长守卫从 2390 行下调到 1630 行，并为回测组件增加 705 行上限。

## 修改模块与文件

- `WuwaFrontend/src/App.vue`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`
- `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`

## API、数据库与数据边界变化

无。模型详情仍由 App 基于原有 prediction、stats、evaluation 和 echoes 数据构建。

## 性能与资源影响

- 没有新增网络请求或持久状态。
- Markov document 监听器现在与回测组件生命周期绑定。
- 生产 JS gzip 从 56.27 kB 降到 55.65 kB。
- Vite 模块数从 44 增加到 45，属于 feature 拆分后的正常变化。

## 测试与验收结果

- 新增 EvaluationBacktest ownership 测试，先因目标文件不存在而失败，迁移后通过。
- `npm test`：64 个测试通过。
- `npm run build`：生产构建通过。
- `App.vue` 从 2384 个物理行下降到 1625 行。
- `EvaluationBacktest.vue` 为 699 个物理行。
- `git diff --check`：通过。

## 与原计划的偏差

无行为偏差。为了完整迁移交互生命周期，回测组件仍较大，后续需要按模型详情子区域继续拆分。

## 遗留问题

- 将 model insight card 拆成独立组件，降低 `EvaluationBacktest.vue` 体量。
- 浏览器运行时可用后补做展开、tab 切换和 Markov 拖拽回归。

## 长期规范同步

本次落实既有 feature owner、局部交互状态和生命周期清理规则，不需要修改长期规范。

## 下一阶段入口

继续拆分声骸工作台或先拆 EvaluationBacktest 内部的模型详情卡；优先选择能显著降低入口复杂度且不改变 API 的边界。
