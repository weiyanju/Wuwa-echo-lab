# 未完成注册恢复实施记录

## 目标

修复系统账号已经创建、但尚未填写游戏 UID 的用户无法再次从“创建档案”继续开户的问题。最终流程保持在现有登录框内：

- 新用户名创建系统账号和默认空 `GameAccount`，随后进入 UID 初始化页。
- 已有用户名在密码正确、账户启用且所有游戏账号均无非空 UID 时，从“创建档案”恢复到同一 UID 初始化页。
- 密码错误或账户停用时停留在认证表单。
- 任一游戏账号已有非空 UID 时拒绝从注册入口恢复，用户仍需使用“终端登录”。

本次没有新增页面、卡片、步骤条或 `App.vue` 状态分支，也没有改变 UID 初始化页的视觉和返回登录交互。

## 后端实施

- 在账号服务中集中实现开户创建与恢复判断，并以事务保护新用户和默认空游戏账号的创建。
- 新用户返回 HTTP `201` 与 `registration_outcome: "created"`。
- 可恢复用户返回 HTTP `200` 与 `registration_outcome: "resumed"`。
- 错误凭据和停用账户统一返回 HTTP `400` 与 `code: "registration_credentials_invalid"`。
- 已存在任意非空 UID 时返回 HTTP `409` 与 `code: "registration_complete"`。
- 只有创建或恢复成功才建立 session；响应所需的默认账号在登录前完成解析和序列化，避免失败路径修改 `last_login` 或 session。
- 同名用户并发创建冲突会回到既有用户校验；与同名用户无关的完整性错误继续向上抛出。

相关提交：

- `4a2817b feat: resume incomplete registrations`
- `2694c50 fix: harden registration failure ordering`

## 前端实施

- HTTP 层新增携带 `status` 和稳定 `code` 的 `ApiError`，不再要求调用方解析错误文案。
- `signUp` 成功后直接复用注册接口建立的 session，再请求 `/api/me/`；不再额外调用登录接口。
- 后续继续复用现有 `loadGameAccounts -> workspaceLocked` 路径。默认空游戏账号会把登录框切换到现有 UID 初始化页面；已有账号的常规登录流程保持不变。
- 自动化测试锁定注册请求顺序、结构化错误以及恢复用户进入 UID 锁定流程。

相关提交：

- `0625c823 feat: resume uid onboarding from registration`

## 长期规范

以下长期规范已同步注册恢复契约、安全边界和登录框交互：

- `docs/api-and-data-contracts.md`
- `docs/security-privacy-and-data-boundaries.md`
- `DESIGN.md`
- `docs/web-homepage-terminal-design.md`

相关提交：

- `465122d docs: define resumable registration contract`

## 测试驱动过程

- 后端初始 RED 覆盖既有未完成账号恢复、停用账号拒绝、响应失败不建立 session，以及无同名用户时不得吞掉完整性错误。
- 后端聚焦测试最终 12/12 通过。
- 前端初始 RED 为 33/37，通过实现后聚焦测试达到 37/37。
- 完整验证中，Django 140/140 测试通过，前端 344/344 测试通过，Vite 生产构建通过。

## 验证边界

- 本次未执行带真实浏览器会话的“注册 → UID 页 → 返回登录 → 再次创建档案 → UID 页”端到端操作；相同状态转换已由后端 API 测试、前端 composable 测试和 `App` 路由契约测试覆盖。
- 工作区内既有的评估页修改和对应未跟踪归档文件不属于本次任务，实施和提交过程中均未暂存或改写。
- 本次没有合并或推送当前功能分支。
