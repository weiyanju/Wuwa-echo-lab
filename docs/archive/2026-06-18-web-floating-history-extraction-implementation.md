# Web 浮动历史面板拆分实施记录

## 目标

将历史声骸筛选、浮动定位、最小化、固定、展示动画和拖拽生命周期从 `App.vue` 迁入独立 history feature，同时保持现有数据工作流和视觉行为不变。

## 实际完成内容

- 新增 `FloatingHistoryPanel.vue`，接收 `echoes`、`activeEchoId` 和 `isDarkTheme`。
- 组件自行拥有历史筛选、面板位置、展开尺寸、最小化、固定、展示和拖拽状态。
- 历史记录选择通过 `select` 事件交给 App 的既有 `selectEcho` 工作流。
- 将浮动面板图标、状态徽标、记录格式和模板完整迁入组件。
- 将 resize、pointermove、pointerup 和 pointercancel 监听器绑定到组件生命周期，并在卸载时清理。
- 删除 App 中对应的局部计算、动画、几何、持久化和监听器代码。
- 将原有图标静态断言迁移到实际 feature owner。
- 将 `App.vue` 增长守卫从 1630 行下调到 1020 行，并为历史组件增加 650 行上限。

## 修改模块与文件

- `WuwaFrontend/src/App.vue`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`
- `WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js`

## API、数据库与数据边界变化

无。App 仍负责读取、保存和选择声骸；历史组件只展示传入记录并发出选择命令。

## 性能与资源影响

- 没有新增网络请求或持久化类型。
- document 和 window 监听器现在与历史组件生命周期绑定。
- 生产 JS gzip 为 55.72 kB，较上一阶段 55.65 kB 增加 0.07 kB。
- Vite 模块数从 45 增加到 46，属于 feature 拆分后的正常变化。

## 测试与验收结果

- 新增 FloatingHistoryPanel ownership 测试，先因目标文件不存在而失败，迁移后通过。
- `npm test`：66 个测试通过。
- `npm run build`：生产构建通过。
- `App.vue` 从 1625 个物理行下降到 1015 行。
- `FloatingHistoryPanel.vue` 为 642 个物理行。
- `git diff --check`：通过。

## 与原计划的偏差

无行为偏差。历史面板仍保留原动画和持久化键值，只改变职责归属。

## 遗留问题

- `FloatingHistoryPanel.vue` 仍偏大，后续可将几何计算和动画控制拆入 composable，并补纯函数测试。
- 浏览器运行时验证仍受当前 Windows 沙箱权限限制，未把视觉检查记录为通过。

## 长期规范同步

本阶段落实既有 feature owner、局部交互状态和监听器生命周期规则，不需要修改长期规范。

## 下一阶段入口

继续拆分工作台创建/当前声骸区域，优先把纯表单与展示状态下沉，API 保存流程留在 App；或先拆分登录与 UID setup 的纯视图壳层。
