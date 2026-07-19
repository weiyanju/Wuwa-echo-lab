# 可恢复注册设计

## 背景

当前系统账户注册和游戏 UID 初始化是连续的两阶段流程：

1. 创建 Django 系统账户，并由后端创建一个空 UID 的默认 `GameAccount`。
2. 前端建立登录会话、加载游戏账号，并在没有任何已绑定 UID 时显示 UID 初始化页。

用户在第二阶段点击“返回登录”后会退出当前系统账户。再次从“创建档案”入口提交相同凭据时，前端 `signUp()` 固定先调用 `/api/auth/register/`。后端发现用户名已存在后立即返回错误，前端因而不会继续建立会话、加载 `GameAccount` 或进入 UID 初始化页。

根因是“创建档案”被实现为一次性的用户创建请求，而产品流程实际需要一个可恢复的开户状态机。

## 目标

- 新系统账户继续通过“创建档案”进入 UID 初始化页。
- 已创建系统账户、凭据正确且尚未绑定任何 UID 时，再次从“创建档案”入口恢复 UID 初始化。
- 已完成 UID 初始化的账户仍使用“终端登录”，注册入口不成为第二个普通登录入口。
- 恢复判断和会话建立由后端负责，前端不依赖错误文案推断认证状态。
- 不修改 UID 初始化页的布局、文案、动效或绑定行为。

## 非目标

- 不允许免密恢复、重置密码或覆盖已有密码。
- 不把已完成开户的账户从注册入口直接带入工作台。
- 不新增独立注册向导、持久化草稿或新的账户状态字段。
- 不改变 `GameAccount` 的 UID 归属、数量限制或 locked 写入边界。

## 方案比较

### 方案 A：前端捕获重复用户名后调用登录

前端在 `/auth/register/` 返回“用户名已存在”时继续调用 `/auth/login/`。

优点是改动最少。缺点是当前 HTTP 层只抛出错误文案，容易形成字符串匹配；更重要的是，开户是否完成属于后端业务事实，不应由客户端猜测。此方案不采用。

### 方案 B：现有注册接口支持创建或恢复未完成开户

`POST /api/auth/register/` 继续作为“创建档案”入口，由后端 service 将请求分类为 `created`、`resumed` 或拒绝。`created` 和 `resumed` 都建立会话并返回成功，前端随后读取 `/me/` 和游戏账号列表。

优点是维持单一入口、复用现有 CSRF/session 边界，并让开户状态判断留在后端。旧客户端在注册成功后再次调用登录仍可工作，因此兼容风险有限。此方案为推荐方案。

### 方案 C：新增独立的恢复开户接口

保留 `/auth/register/` 的纯创建语义，新增 `/auth/registration/resume/`。

边界最显式，但前端必须先注册失败再调用恢复接口，或预先判断应调用哪个接口；这增加 API、错误编排和测试面，而当前只有一个“创建档案”入口。当前阶段不采用。

## 后端设计

### Service 所有权

在 `Wuwa/accounts/services.py` 增加聚焦的开户 service。view 只负责解析请求、调用 service、建立 Django session 和序列化响应。

service 输入为规范化后的 `username`、原始 `password`，输出包含：

- `user`
- `outcome`: `created` 或 `resumed`

service 状态机：

1. 用户名不存在：
   - 创建 Django 用户；
   - 由现有 `post_save` signal 创建空 UID 默认 `GameAccount`；
   - 返回 `created`。
2. 用户名已存在且密码不正确：
   - 返回稳定错误 `registration_credentials_invalid`；
   - 不建立会话，不修改用户、密码或 `GameAccount`。
3. 用户名已存在、密码正确且不存在任何非空 UID 的 `GameAccount`：
   - 返回 `resumed`；
   - 不创建第二个用户或第二个默认 `GameAccount`。
4. 用户名已存在、密码正确且至少一个 `GameAccount` 已绑定 UID：
   - 返回冲突 `registration_complete`；
   - 不建立会话，提示改用终端登录。

“开户完成”使用后端查询 `user.game_accounts.exclude(uid="").exists()` 判定，而不是信任前端缓存或仅检查用户名。

创建用户时保留数据库唯一约束作为并发兜底。若并发创建命中唯一冲突，service 重新读取同名用户并按同一凭据与开户状态规则处理，不能返回 500 或创建重复默认账号。

### API 响应

`POST /api/auth/register/`：

- 新建成功：HTTP `201`
- 恢复成功：HTTP `200`
- 两种成功响应均建立 Django session，并返回：

```json
{
  "id": 1,
  "username": "operator",
  "registration_outcome": "created",
  "default_game_account": {
    "id": 1,
    "uid": "",
    "workspace_locked": true
  }
}
```

`registration_outcome` 只允许 `created` 或 `resumed`。

失败响应保留现有 `error` 字段，并增加稳定 `code`：

- `registration_credentials_invalid`：HTTP `400`
- `registration_complete`：HTTP `409`

错误信息不记录或回显密码、cookie、session 或其他认证细节。

## 前端设计

`WuwaFrontend/src/composables/useAuth.js` 的 `signUp()` 改为：

1. 调用 `register(payload)`；
2. 不再额外调用 `login(payload)`；
3. 调用 `getMe()` 写入 `user`；
4. 维持现有 loading/error 生命周期。

`App.vue` 不新增注册恢复分支。`submitAuth()` 在 `signUp()` 成功后继续执行：

1. 保存现有“保持连接状态”偏好；
2. `gameAccount.loadGameAccounts()`；
3. 若 `workspaceLocked` 为 `true`，复用现有登录卡片内 UID 初始化页；
4. 否则刷新工作台。

已完成开户或凭据不匹配时，后端错误继续显示在现有认证表单中。当前范围不自动切换登录标签、不保留密码，也不新增提示卡片。

HTTP helper 应保留现有 `Error.message` 行为，同时把后端 `code` 和 HTTP `status` 挂到错误对象，避免未来依赖中文错误文案。

## 安全与数据边界

- 恢复前必须使用 Django 密码校验验证提交凭据。
- 后端是开户是否完成和 `GameAccount` 所有权的唯一事实来源。
- `created` 和 `resumed` 才能建立 session；失败路径必须保持未认证。
- 不记录密码、session、cookie 或完整请求体。
- UID 仍只能通过已认证的 `GameAccount` API 写入。
- locked `GameAccount` 仍不能写入正式声骸或识别数据。
- 注册恢复不得创建重复用户、重复默认 `GameAccount` 或跨用户读取。

## 测试设计

### 后端

- 新用户注册返回 `201 created`、建立 session，并且只有一个空 UID 默认账号。
- 未绑定 UID 的既有用户使用正确密码返回 `200 resumed`、建立 session，用户和默认账号数量不变。
- 未绑定 UID 的既有用户使用错误密码返回 `400 registration_credentials_invalid`，保持未登录。
- 已绑定任意 UID 的既有用户返回 `409 registration_complete`，保持未登录。
- 并发唯一冲突回落到相同状态机，不产生重复账号。
- `/me/` 和游戏账号 ownership 边界保持不变。

### 前端

- `signUp()` 只调用注册接口与 `getMe()`，不再调用登录接口。
- 注册接口的 `code` 和 `status` 被 HTTP helper 保留，现有错误文案行为不变。
- `App.vue` 继续通过游戏账号加载和 `workspaceLocked` 进入 UID 页，不新增页面状态。
- 回归场景“注册成功但未绑定 UID → 返回登录 → 再次创建档案”进入 UID 初始化页。
- 已完成开户与错误密码保持在认证表单并显示后端错误。

## 文档与交付

实施时同步：

- `docs/api-and-data-contracts.md`
- `docs/security-privacy-and-data-boundaries.md`
- 与登录/UID 流程直接相关的产品或界面长期规范

完成后运行 Django 测试、前端聚焦测试、前端全量测试、Vite 构建和 `git diff --check`，并在 `docs/archive/` 记录实际结果与未执行的验证。
