# 登录框内 UID 首次绑定实施记录

## 目标

首次登录成功但当前账号尚未绑定游戏 UID 时，不再跳转到独立初始化页面。登录框在原位置切换到 UID 绑定内容，登录页的品牌栏、左侧说明、背景和整体布局保持不变。

## 实施结果

- `LoginView` 使用受控的 `auth` / `uid` 内部页面状态，在同一个 `.terminal-auth-card` 中切换登录表单和 UID 绑定面板。
- 登录成功且没有 UID 时，`App.vue` 继续停留在登录入口，只把右侧登录框切换为 UID 绑定内容。
- UID 绑定页的返回按钮位于登录框标题区；点击后退出当前系统账号，并反向切换回登录表单。
- 前进与返回均使用 180ms 的透明度和水平位移动画，不使用卡片推进、独立页面或步骤条。
- `prefers-reduced-motion: reduce` 下取消登录框页面切换动画。
- UID 输入、绑定状态和错误继续复用现有账号状态与 API，不新增后端接口或数据结构。
- 已删除旧的独立 UID 初始化视图、校验模块和专用样式入口。
- 后续 UID 的新增和切换仍由工作页面顶部账号菜单负责，本次未修改该流程。

## 主要文件

- `WuwaFrontend/src/App.vue`
- `WuwaFrontend/src/features/auth/LoginView.vue`
- `WuwaFrontend/src/features/auth/UidBindingPanel.vue`
- `WuwaFrontend/src/features/auth/uidBinding.js`
- `WuwaFrontend/src/styles/features/auth.css`
- `WuwaFrontend/src/style.css`
- `DESIGN.md`
- `docs/web-homepage-terminal-design.md`

删除的旧入口：

- `WuwaFrontend/src/features/workspace/UidSetupView.vue`
- `WuwaFrontend/src/features/workspace/uidSetup.js`
- `WuwaFrontend/src/styles/features/uid-setup.css`

## 设计系统同步

- `style.css` 顶部补充 Hallmark 要求的系统类型、语气、配色锚点和结构指纹声明。
- `DESIGN.md` 明确登录入口允许保留既有终端设计语言，并通过字体角色、Tethys 蓝、1px 边框、层级和克制动效与工作页面保持统一。
- 登录框内 UID 首次绑定、返回图标语义和“冻结外层登录页”规则已经写入长期设计文档。

## 测试驱动与自动化验证

- UID 校验、绑定面板、登录框受控页面切换、应用入口路由和样式治理测试均先观察到 RED，再完成实现。
- 完整前端测试：342/342 通过。
- Vite 生产构建：通过，89 个模块完成转换。
- `auth.css` 为 412 行，低于架构测试规定的 420 行上限。
- 生产源文件中已无 `UidSetupView`、`uid-setup.css`、`uid-setup-shell` 或 `uid-setup-card` 引用。

## 验收边界

应用内浏览器的自动化连接在最终视觉验收阶段不可用，因此没有通过自动化浏览器完成真实账号“登录成功 → 无 UID → 绑定 → 进入工作台”的端到端联调，也没有记录 860px / 520px 的实时几何数据。组件契约、响应式样式、减少动态效果、完整测试和生产构建均已验证；发布前仍建议使用一个没有 UID 的测试账号人工走一次完整流程。

## 未改动范围

- 登录页外层结构、左侧内容、品牌栏、背景与既有标题动效。
- 登录认证接口、UID 绑定接口和账号菜单的数据契约。
- 工作页面布局和其他业务页面。
