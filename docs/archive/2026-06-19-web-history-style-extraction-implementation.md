# Web 历史浮层样式拆分实施记录

## 目标

将历史声骸浮层、筛选器、记录项和响应式规则从全局 `style.css` 迁移到 history feature 所有者，保持现有交互和视觉表现不变。

## 实际完成内容

- 新增 `WuwaFrontend/src/styles/features/history.css`。
- 迁移历史浮层定位、拖拽/固定/展示/缩小状态、筛选标签、记录项、滚动区域与图标状态样式。
- 同步迁移暗色主题、减少动画、`860px` 和 `520px` 响应式规则。
- `style.css` 通过显式 import 加载 history 样式，物理行数从 7366 降至 6553。
- 新增 history 样式所有权测试，并收紧入口与 feature 文件行数守卫。
- 更新主题测试，使 history 暗色断言读取实际样式所有者。

## 修改文件

- `WuwaFrontend/src/style.css`
- `WuwaFrontend/src/styles/features/history.css`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/App.test.js`

## API、数据库与行为边界

无变化。未修改 API、数据库 schema、账号/UID 模型、历史筛选行为或浮层状态持久化。

## 测试与视觉验收

- `npm test`：88 个测试全部通过。
- `npm run build`：生产构建通过。
- 浏览器验证浅色展开态、76px 缩小态和暗色展开态。
- `860x900` 下浮层左右各 12px，页面滚动宽度 845px，无横向溢出。
- 页面控制台无 warning 或 error。

## 性能与资源影响

- 未新增依赖、网络请求或运行时状态。
- 生产 CSS 151.16 kB，gzip 27.49 kB；JavaScript 165.84 kB，gzip 57.56 kB。

## 下一阶段入口

继续阶段 3，拆分认证页及工作区控件样式，逐步缩小剩余全局样式入口。
