# Web 统计模块基础样式拆分实施记录

## 目标

将统计视图的基础与响应式样式迁入独立 feature 文件，保持现有结构、数值和响应式行为不变。

## 实际完成内容

- 新增 `styles/features/statistics.css`，集中管理统计摘要、偏差图和样本阶段的基础样式。
- 将统计模块 860px 响应式规则迁入同一 feature 文件。
- `style.css` 显式导入 statistics feature 样式。
- 更新既有统计页面测试，使视觉结构断言指向实际样式 owner。
- 将 `style.css` 增长守卫从 8470 行下调到 8080 行。

## 修改模块与文件

- `WuwaFrontend/src/style.css`
- `WuwaFrontend/src/styles/features/statistics.css`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`

## API、数据库与数据边界变化

无。

## 性能与资源影响

- 没有新增网络请求、运行时状态或 JavaScript 模块。
- Vite 仍将样式合并为单个生产 CSS 资源。

## 测试与验收结果

- 新增样式 ownership 测试，先因目标文件不存在而失败，迁移后通过。
- `npm test`：62 个测试通过。
- `npm run build`：生产构建通过。
- `style.css` 从 8463 个物理行下降到 8073 行。
- `git diff --check`：通过。

## 与原计划的偏差

深色统计覆盖暂时保留在全局主题规则中。它们与 evaluation 选择器大量共享声明组，应在独立主题文件阶段整体迁移，避免拆组时产生级联偏差。

## 遗留问题

- 将连续的深色主题规则迁入独立 `styles/themes/dark.css`。
- 浏览器运行时可用后，补做统计页浅色、深色和 860px 断点视觉回归。

## 长期规范同步

本次落实既有 feature 样式 owner 规则，不需要修改长期规范。

## 下一阶段入口

回到 Vue 结构拆分，优先处理模型评估视图；深色主题作为样式阶段的后续独立任务处理。
