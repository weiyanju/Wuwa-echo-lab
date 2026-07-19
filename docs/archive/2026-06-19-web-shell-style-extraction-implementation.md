# Web 应用壳层样式拆分实施记录

## 目标

把导航、账号状态、主题切换、工作台 Hero 和页签等应用壳层样式从超大的 `style.css` 中迁移到独立所有者，同时保持现有 API、页面行为和视觉表现不变。

## 实际完成内容

- 新增 `WuwaFrontend/src/styles/shell.css`，集中拥有 dashboard、topbar、wordmark、账号操作、UID 状态、主题按钮、Hero 和顶栏页签样式。
- 同步迁移上述元素的暗色模式、交互状态与 `860px` 响应式规则。
- `style.css` 通过显式 `@import` 加载壳层样式，物理行数从 8073 降至 7366。
- 增加样式所有权测试，禁止 dashboard 和 Hero 规则回流到总入口。
- 将 `style.css` 增长守卫收紧至 7370 行，并为 `shell.css` 设置 830 行上限。
- 更新主题与 UID 测试，使断言读取对应的样式所有者。

## 修改文件

- `WuwaFrontend/src/style.css`
- `WuwaFrontend/src/styles/shell.css`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/App.test.js`

## API、数据库与行为边界

无变化。没有修改请求路径、字段、状态值、账号/UID 行为或数据库契约。

## 性能与资源影响

- 没有新增运行时依赖、网络请求或 JavaScript 状态。
- 生产构建转换 51 个模块。
- CSS 产物 150.74 kB，gzip 27.49 kB；JavaScript 产物 165.84 kB，gzip 57.56 kB。

## 测试与视觉验收

- `npm test`：87 个测试全部通过。
- `npm run build`：生产构建通过。
- 应用内浏览器验证浅色与暗色主题，顶栏、UID、主题按钮与 Hero 样式均正确加载。
- `860x900` 视口下页面宽度 860，文档滚动宽度 845，无横向溢出。
- 浏览器控制台无 warning 或 error。

## 遗留问题

- 既有浮动历史面板在 860px 首屏会覆盖较大内容区域。该问题不由本次壳层拆分引入，留到 history feature 样式切片中处理。

## 下一阶段入口

继续阶段 3，按 feature 所有权拆分历史面板、认证页和工作区控件样式，再统一剩余共享控件状态。
