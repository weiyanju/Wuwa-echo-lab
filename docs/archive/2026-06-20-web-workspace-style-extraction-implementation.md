# Web Workspace 与 UID 样式拆分实施记录

## 目标

将 UID 设置页、工作台布局、套装选择、当前声骸和词条矩阵样式从全局 `style.css` 迁移到 workspace feature 所有者，并保持业务流程与视觉行为不变。

## 实际完成内容

- 新增 `WuwaFrontend/src/styles/features/workspace.css`。
- 迁移 UID 设置页、锁定卡片、工作区双栏布局和侧栏规则。
- 迁移套装/选项控件、当前声骸摘要、进度、录入记录、词条矩阵与档位按钮样式。
- 同步迁移 workspace 暗色主题、交互状态以及 `860px`/`520px` 响应式规则。
- 统计页 `substat-deviation-*` 等同名前缀规则明确保留在原所有者，不纳入本切片。
- `style.css` 物理行数从 6323 降至 5604。
- 新增 workspace 样式所有权与行数守卫测试，并更新旧测试读取实际样式所有者。

## 修改文件

- `WuwaFrontend/src/style.css`
- `WuwaFrontend/src/styles/features/workspace.css`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/App.test.js`

## API、数据库与行为边界

无变化。未修改 UID 绑定、声骸创建、词条录入、撤销、预测刷新或账号隔离行为。

## 测试与视觉验收

- `npm test`：90 个测试全部通过。
- `npm run build`：生产构建通过。
- 浏览器验证未绑定 UID 页面与绑定后的桌面工作台。
- 验证暗色主题和 `860x900` 单列布局，页面滚动宽度 845px，无横向溢出。
- 词条行继续应用 `contain: layout paint`，浏览器控制台无 warning 或 error。

## 性能与资源影响

- 未新增依赖、网络请求或运行时状态。
- 生产 CSS 152.30 kB，gzip 27.11 kB；JavaScript 165.84 kB，gzip 57.56 kB。

## 下一阶段入口

继续阶段 3，收敛剩余共享控件语义和评估页样式边界，进一步缩小全局样式入口。
