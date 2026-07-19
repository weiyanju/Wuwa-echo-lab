# Web 登录视图拆分实施记录

## 目标

将登录/注册页面和表单本地状态从 `App.vue` 迁入独立 auth feature，同时让 App 继续拥有认证 API 与登录成功后的工作区加载流程。

## 实际完成内容

- 新增 `LoginView.vue`，负责登录页结构、用户名、密码、登录/注册模式和记住用户名状态。
- 将用户名/密码必填校验迁入登录组件。
- 组件通过 `submit` 事件发出规范化认证命令。
- App 继续负责 `signIn`、`signUp`、GameAccount 加载、工作区刷新和 API 错误状态。
- 用户名记忆仍只在认证成功后写入 localStorage。
- 修正组件接线时发现的布尔值读取问题，并用 Milestone 3 集成断言锁住 `saveLogin` 命令语义。
- 将 `App.vue` 增长守卫从 1020 行下调到 965 行，并为登录组件增加 85 行上限。

## 修改模块与文件

- `WuwaFrontend/src/App.vue`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/features/auth/LoginView.vue`
- `WuwaFrontend/src/features/auth/LoginView.test.js`

## API、数据库与数据边界变化

无。认证请求、用户状态和 GameAccount 加载仍由 App 及既有 composable 管理。

## 性能与资源影响

- 没有新增网络请求或持久化键。
- 生产 JS gzip 为 55.94 kB，较上一阶段 55.72 kB 增加 0.22 kB。
- Vite 模块数从 46 增加到 47，属于 feature 拆分后的正常变化。

## 测试与验收结果

- 新增 LoginView ownership 测试，先因目标文件不存在而失败，迁移后通过。
- 全量测试：68 个测试通过。
- Vite 生产构建通过。
- `App.vue` 从 1015 个物理行下降到 959 行。
- `LoginView.vue` 为 79 个物理行。
- `git diff --check` 通过。

## 与原计划的偏差

无行为偏差。表单校验移到组件，本地记忆和认证成功后的业务编排仍保持原时机。

## 遗留问题

- UID setup 仍是 App 中的纯视图与局部输入状态，可作为下一块拆分目标。
- 浏览器运行时验证仍受当前 Windows 沙箱权限限制，未把视觉检查记录为通过。

## 长期规范同步

本阶段落实既有 feature owner 与“视图状态下沉、API 编排留在入口”规则，不需要修改长期规范。

## 下一阶段入口

拆分 UID setup 视图与输入校验，组件发出绑定命令，App 保留 `bindDefaultUid` 和刷新流程。
