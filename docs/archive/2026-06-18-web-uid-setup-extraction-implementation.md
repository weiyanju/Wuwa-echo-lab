# Web UID 绑定视图拆分实施记录

## 目标

将 locked workspace 的 UID 绑定视图和本地输入状态从 `App.vue` 迁入独立 workspace feature，同时保持绑定 API、错误处理和刷新流程不变。

## 实际完成内容

- 新增 `UidSetupView.vue`，负责 locked setup 页面结构、UID 输入、数字规范化和必填校验。
- 组件通过 `bind`、`toggle-theme` 和 `sign-out` 事件发出业务与 shell 命令。
- App 继续负责 `bindDefaultUid`、保存状态、API 错误、工作区清空和完整刷新。
- 将旧静态测试的 UID 视图断言迁移到实际 feature owner，API 编排断言继续指向 App。
- 盘点时发现历史面板拆分后工作台顶部仍引用已删除的 `sortedEchoes`；新增回归测试并改为 App 自有的 `visibleEchoCount`，继续复用可见历史规则。
- 将 `App.vue` 增长守卫从 965 行下调到 910 行，并为 UID setup 组件增加 125 行上限。

## 修改模块与文件

- `WuwaFrontend/src/App.vue`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/features/workspace/UidSetupView.vue`
- `WuwaFrontend/src/features/workspace/UidSetupView.test.js`

## API、数据库与数据边界变化

无。UID 绑定仍调用既有 GameAccount composable 和后端 API；字段、错误与刷新顺序均未改变。

## 性能与资源影响

- 没有新增网络请求或持久化键。
- 生产 JS gzip 为 56.18 kB，较上一阶段 55.94 kB 增加 0.24 kB。
- Vite 模块数从 47 增加到 48，属于 feature 与图标依赖拆分后的正常变化。

## 测试与验收结果

- 新增 UidSetupView ownership 测试，先因目标文件不存在而失败，迁移后通过。
- 新增工作台可见历史计数回归测试，先因 `sortedEchoes` owner 已迁移而失败，修复后通过。
- `npm test`：71 个测试通过。
- `npm run build`：生产构建通过。
- `App.vue` 从 959 个物理行下降到 902 行。
- `UidSetupView.vue` 为 117 个物理行。
- `git diff --check`：通过。

## 与原计划的偏差

除修复盘点中发现的历史计数回归外，无行为偏差。

## 遗留问题

- UID setup 与 dashboard 顶部仍各自渲染一套相似账号/主题操作栏，后续可在样式统一阶段评估共享 shell 组件。
- 浏览器运行时验证仍受当前 Windows 沙箱权限限制，未把视觉检查记录为通过。

## 长期规范同步

本阶段落实既有 feature owner 与“视图状态下沉、API 编排留在入口”规则，不需要修改长期规范。

## 下一阶段入口

继续拆分声骸工作台的初始化配置和当前声骸区域，先提取纯展示与表单事件接口，再保留 App 中的保存、预测和乐观更新流程。
