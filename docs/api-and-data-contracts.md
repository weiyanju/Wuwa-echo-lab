# API 与数据契约规范

## 1. 文档定位

本文定义 `Wuwa` Django 后端、数据库持久化、Vue Web 工作台与外部本地识别客户端之间的长期数据契约。

它不是接口清单的替代品，而是规定哪些数据由谁拥有、哪些字段属于稳定契约、哪些变化需要迁移或兼容。

如果本文与 [`architecture.md`](./architecture.md) 冲突，以 `architecture.md` 的 owner 边界为准。

---

## 2. 核心原则

### 2.1 后端数据库是重要业务数据的真实来源

以下数据必须以后端数据库为真实来源：

- 系统账号
- `GameAccount`
- UID
- 声骸记录
- 调谐记录
- 识别会话
- 识别快照
- 回滚状态
- 统计、预测、评估所依赖的基础数据

外部本地识别客户端和 Web 可以缓存或展示这些数据，但不能成为唯一真实来源。

### 2.2 所有业务数据必须绑定用户和 `GameAccount`

所有声骸、统计、预测、评估、识别会话、识别快照请求都必须绑定 authenticated user 和 `game_account_id`。

后端必须拒绝跨用户和跨 `GameAccount` 访问。

### 2.3 本地缓存不是业务事实

本地允许缓存登录状态辅助信息、当前选择的账号、本地设置、截图 hash、OCR 结果缓存和诊断日志。

本地缓存不能替代声骸正式记录、识别快照正式状态、回滚状态、用户和 `GameAccount` 所有权。

### 2.4 Analytics 派生状态与修复契约

`EchoRecord` 与 `SubstatRoll` 是 analytics 的事实源。后端可按 `GameAccount` 保存可重建的小型派生 state 与独立 pattern 聚合，供 statistics、prediction 与 evaluation 的 ready 读取使用；这些表是后端私有实现，Web 和外部本地识别客户端不消费其字段或状态值。

追加的新调谐正常增量写入 state；删除、乱序、`SubstatRoll` 的旧/新账户迁移，或 Echo 上下文变化会标脏相应账户。dirty state 的修复只流式重建该账户，仍以认证和 ownership 过滤原始数据。若有限次竞争安全 repair 后仍无法得到 ready state，公开 analytics API 返回 `503`，稳定 `code` 为 `analytics_state_unavailable`。

prediction 与 evaluation 的成功响应字段不变。statistics 的 `context_factors.set_name` 增加 `overflow_count`，用于报告未进入具名分组的样本数。未来 Redis 只能作为可选加速或分布式协调，不能成为原始记录、`GameAccount` ownership 或 analytics state 的事实源。

statistics 的 `context_factors.set_name.groups` 最多返回 128 个真实分组，正常游戏套装名保持原名；超出容量的计数进入同级 `overflow_count`，不再借用可能与真实套装名冲突的 `__other__` key。

---

## 3. 当前 API 边界

当前 API 统一以 `/api/...` 为前缀。

主要通道：

```text
GET  /api/health/
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/me/

GET  /api/game-accounts/
POST /api/game-accounts/
GET  /api/game-accounts/{id}/
PATCH /api/game-accounts/{id}/

GET  /api/echoes/
POST /api/echoes/
GET  /api/echoes/{id}/
PATCH /api/echoes/{id}/
DELETE /api/echoes/{id}/
POST /api/echoes/{id}/substats/
DELETE /api/echoes/{id}/substats/latest/

GET  /api/stats/
GET  /api/model-evaluation/
GET  /api/echoes/{id}/prediction/

GET  /api/recognition/sessions/
POST /api/recognition/sessions/
GET  /api/recognition/sessions/{id}/
PATCH /api/recognition/sessions/{id}/

GET  /api/recognition/snapshots/
POST /api/recognition/snapshots/
POST /api/recognition/snapshots/{id}/revert/
```

`POST /api/auth/register/` 同时承担创建与恢复未完成开户：

- 新用户返回 `201` 和 `registration_outcome: "created"`。
- 凭据正确、账户启用且不存在任何已绑定 UID 的既有用户返回 `200` 和 `registration_outcome: "resumed"`。
- 凭据不正确或账户停用返回 `400` 和 `code: "registration_credentials_invalid"`。
- 已有任意非空绑定 UID 的账户返回 `409` 和 `code: "registration_complete"`。

只有 `created` 与 `resumed` 建立 session。恢复判断由后端依据密码校验、账户状态和 `GameAccount` UID 状态完成，客户端不得根据错误文案或本地缓存推断。

规则：

- Web 和外部本地识别客户端都必须通过 API 访问后端。
- 不允许 Web 或外部本地识别客户端直接写数据库。
- API 返回的错误应有稳定 `error` 字段。
- 写请求必须考虑 CSRF/session 或后续认证方案。

---

## 4. `GameAccount` 契约

`GameAccount` 是 UID 的业务边界。

稳定字段：

- `id`
- `uid`
- `server`
- `nickname`
- `is_default`
- `workspace_locked`
- `created_at`
- `updated_at`

规则：

- 一个系统账号可以拥有多个 `GameAccount`。
- 一个系统账号最多一个默认 `GameAccount`。
- 空 UID 表示 workspace locked。
- locked `GameAccount` 不能写入正式声骸和识别结果。
- 修改 UID 必须走后端 API。
- Web 和外部本地识别客户端必须共享同一套 `GameAccount` 列表和默认选择结果。
- `server` 与 `nickname` 是未废弃的预留可选字段。
- 当前响应保持空字符串兼容，当前写入继续忽略。
- 客户端不能依赖 `server` 或 `nickname` 具有非空语义。
- 启用真实语义前必须另行确认校验、权限、迁移与 UI。

---

## 5. 识别会话契约

`RecognitionSession` 表示一次本地识别客户端运行周期。

稳定语义：

- 绑定 user
- 绑定 `GameAccount`
- 记录 client 信息
- 记录窗口和屏幕环境
- 统计 snapshot、保存、冲突、回滚数量
- 有 active/ended/expired 状态

规则：

- session 不能跨用户。
- session 不能跨 `GameAccount`。
- 外部本地识别客户端启动识别时创建或复用 session。
- Web 可以读取 session 作为复核和统计入口。
- PATCH session 只允许修改稳定状态，例如 `active`、`ended`、`expired`。
- session 进入 `ended` 或 `expired` 时必须有 `ended_at`。

---

## 6. 识别快照契约

`RecognitionSnapshot` 是 OCR 结果进入业务系统的可追踪记录。

稳定字段语义：

- `trigger_type`
- `client_event_id`
- `captured_at`
- `popup_delta_raw`
- `detail_snapshot_raw`
- `normalized_snapshot`
- `field_confidence`
- `popup_screenshot_hash`
- `detail_screenshot_hash`
- `match_status`
- `status`
- `created_roll_ids`
- `warnings`
- `error_code`

规则：

- `client_event_id` 用于同一 session 内幂等。
- `detail_screenshot_hash` 用于同一 `GameAccount` 内重复抑制。
- raw 字段保留 OCR 原始结构。
- normalized 字段保留后端可处理结构。
- 低置信度、字段缺失、冲突不能静默写入正式样本。
- 回滚必须更新 snapshot 状态并撤销对应写入。

---

## 7. 截图与 OCR 数据契约

常规 API 不接收完整截图作为 OCR 输入。

外部本地识别客户端向后端提交的是结构化识别结果，而不是完整截图。

允许提交：

- screenshot hash
- capture region metadata
- OCR raw text 或结构化 raw payload
- normalized fields
- confidence
- elapsed ms
- client event id
- diagnostic code

默认不提交：

- 完整截图文件
- 无裁剪截图
- 与识别无关的屏幕内容
- 本地路径
- 用户机器上的敏感环境信息

如果未来需要上传截图样本，必须作为单独能力确认，并明确用户授权、存储位置、保留时间和删除方式。

---

## 8. 兼容与变更规则

### 8.1 新增字段

新增字段应满足：

- 后端有默认值或可空策略。
- Web 和外部本地识别客户端的旧版本不会因此崩溃。
- 测试覆盖关键序列化结果。

### 8.2 删除或改名字段

删除或改名字段属于破坏性变更。

必须先确认 Web 和外部本地识别客户端调用方，提供兼容期或同步修改，并更新测试和文档。

### 8.3 状态值变更

状态值是稳定契约。

变更以下状态必须谨慎：

- `RecognitionSession.status`
- `RecognitionSnapshot.status`
- `RecognitionSnapshot.match_status`
- `GameAccount.workspace_locked`

新增状态必须定义 UI 展示方式、是否可写入正式数据、是否可回滚、是否进入统计。

---

## 9. Web 与外部客户端调用规则

Web 端：

- API 调用放在 `WuwaFrontend/src/services/`。
- `GameAccount` 状态通过 composable 统一处理。
- 不在页面里手写复杂 API URL。

外部本地识别客户端：

- 客户端 API 消费实现由独立客户端仓库维护。
- 本仓库只约束服务端响应、权限和向后兼容。
- 客户端不能直接拼接或绕过数据库语义。

共同规则：

- 所有业务请求带 `game_account_id` 或在路径中明确绑定资源。
- 客户端不能依赖列表第一项作为权限判断。
- 客户端不能绕过 locked 状态直接提交写入。

---

## 10. 测试要求

涉及 API 和数据契约的变更，默认需要：

- 后端 ownership 测试
- `GameAccount` 隔离测试
- serializer 或 response shape 测试
- Web API helper 测试
- 外部客户端兼容响应测试
- 识别幂等或 duplicate hash 测试
- 回滚测试

如果字段被 Web 和外部本地识别客户端同时消费，必须运行本仓库兼容响应测试，并同步客户端仓库或提供兼容期。

---

## 11. 与其他长期文档的关系

- 架构 owner 见 [`architecture.md`](./architecture.md)。
- 代码组织见 [`code-organization-and-style.md`](./code-organization-and-style.md)。
- 工程质量见 [`engineering-quality.md`](./engineering-quality.md)。
- 安全、隐私与数据边界见 [`security-privacy-and-data-boundaries.md`](./security-privacy-and-data-boundaries.md)。
- 后台性能和 OCR 运行时见 [`performance-and-background-runtime.md`](./performance-and-background-runtime.md)。

---

## 12. 给 Codex 与后续协作者的默认约束

- 不新增绕过 `GameAccount` 的业务 API。
- 不让客户端成为重要业务数据的唯一来源。
- 不把完整截图纳入常规 API 契约。
- 不随意改动状态值。
- API 字段变化必须同步考虑后端、Web、外部本地识别客户端和测试。
