# Wuwa API Contract For MVP

本文档定义 Wuwa MVP 阶段的后端接口契约，用于对齐 Vue 前端、Django 后端、PostgreSQL 数据库和 WPF 本地助手。

状态说明：

- **Implemented**：当前代码中已有接口或主要行为已经存在。
- **Planned**：MVP 文档已确认需要，但接口尚未完整实现。
- **Adjusted**：当前已有接口需要按本文档补齐或调整。

## Common Rules

Base URL:

```text
/api
```

Authentication:

- MVP 使用 Django Session + Cookie。
- Web 前端和 WPF 本地助手共用同一套登录接口。
- 登录成功后，客户端必须保存并携带 session cookie。
- 修改类请求需要携带 CSRF token；前端可先调用 `GET /api/health/` 获取 `csrftoken`。

Response format:

- 成功响应返回 JSON object。
- 列表响应使用 `{ "results": [...] }`。
- 失败响应使用 `{ "error": "message" }`。

Common status codes:

- `200 OK`：读取、更新、退出登录成功。
- `201 Created`：创建成功。
- `400 Bad Request`：字段缺失、格式错误、业务校验失败。
- `401 Unauthorized`：未登录。
- `404 Not Found`：资源不存在或不属于当前用户。
- `405 Method Not Allowed`：HTTP 方法不允许。

Business boundary:

- `User` 是系统登录身份。
- `GameAccount` 是鸣潮游戏账号身份。
- 所有业务数据必须挂在 `GameAccount` 下。
- 默认 `GameAccount.uid` 为空时，工作台锁定。
- 工作台锁定时，后端必须拒绝创建正式 `EchoRecord`。

## Health

### GET `/api/health/`

Status: **Implemented**

Purpose:

- 检查后端服务状态。
- 为浏览器端设置 CSRF cookie。

Response:

```json
{
  "status": "ok",
  "service": "wuwa-backend"
}
```

## Auth

### POST `/api/auth/register/`

Status: **Adjusted**

Purpose:

- 注册系统账号。
- 创建默认空 `GameAccount`。

Request:

```json
{
  "username": "tester",
  "password": "pw12345"
}
```

MVP response target:

```json
{
  "id": 1,
  "username": "tester",
  "default_game_account": {
    "id": 1,
    "uid": "",
    "server": "",
    "nickname": "",
    "is_default": true,
    "workspace_locked": true
  }
}
```

Current implementation note:

- 当前接口已能创建用户，并通过模型信号创建默认 `GameAccount`。
- 当前响应只返回 `id` 和 `username`，MVP 需要补充默认 `GameAccount` 信息。

### POST `/api/auth/login/`

Status: **Implemented**

Purpose:

- 使用系统账号登录。
- 不再使用 UID 派生账号作为登录方式。

Request:

```json
{
  "username": "tester",
  "password": "pw12345"
}
```

Response:

```json
{
  "id": 1,
  "username": "tester"
}
```

### POST `/api/auth/logout/`

Status: **Implemented**

Purpose:

- 清除当前 session。

Response:

```json
{
  "status": "ok"
}
```

### GET `/api/me/`

Status: **Adjusted**

Purpose:

- 获取当前登录用户和默认游戏账号状态。
- 前端用它判断是否锁住工作台。

Current response:

```json
{
  "id": 1,
  "username": "tester",
  "default_game_account_id": 1,
  "workspace_locked": true
}
```

MVP response target:

```json
{
  "id": 1,
  "username": "tester",
  "default_game_account": {
    "id": 1,
    "uid": "",
    "server": "",
    "nickname": "",
    "is_default": true,
    "workspace_locked": true
  },
  "workspace_locked": true
}
```

## Game Accounts

### GET `/api/game-accounts/`

Status: **Planned**

Purpose:

- 查询当前用户拥有的游戏账号。
- Web 前端和 WPF 都依赖该接口选择或确认 `GameAccount`。

Response:

```json
{
  "results": [
    {
      "id": 1,
      "uid": "123456789",
      "server": "",
      "nickname": "",
      "is_default": true,
      "workspace_locked": false,
      "next_echo_sequence": 3,
      "created_at": "2026-06-07T12:00:00+08:00",
      "updated_at": "2026-06-07T12:05:00+08:00"
    }
  ]
}
```

### POST `/api/game-accounts/`

Status: **Planned**

Purpose:

- 新建一个游戏账号。

Request:

```json
{
  "uid": "123456789",
  "server": "",
  "nickname": "main",
  "is_default": false
}
```

Rules:

- `uid` MVP 阶段只要求非空即可视为已绑定。
- 同一系统用户下，非空 `uid + server` 不允许重复。
- 如果 `is_default=true`，后端必须取消该用户其他默认账号。

Response:

```json
{
  "id": 2,
  "uid": "123456789",
  "server": "",
  "nickname": "main",
  "is_default": false,
  "workspace_locked": false
}
```

### PATCH `/api/game-accounts/{id}/`

Status: **Planned**

Purpose:

- 绑定 UID。
- 更新服务器、昵称、默认账号状态。

Request:

```json
{
  "uid": "123456789",
  "server": "",
  "nickname": "main",
  "is_default": true
}
```

Response:

```json
{
  "id": 1,
  "uid": "123456789",
  "server": "",
  "nickname": "main",
  "is_default": true,
  "workspace_locked": false
}
```

## Echo Records

### GET `/api/echoes/?game_account_id={id}`

Status: **Implemented**

Purpose:

- 查询当前 `GameAccount` 下的声骸记录。
- 如果不传 `game_account_id`，后端使用当前用户默认 `GameAccount`。

Response:

```json
{
  "results": [
    {
      "id": 1,
      "game_account_id": 1,
      "echo_uid": "000001000001",
      "display_name": "Sample Echo",
      "cost": 4,
      "set_name": "Sierra Gale",
      "main_stat": "crit_rate",
      "source": "",
      "tuning_batch_id": "",
      "is_continuous_tuning": false,
      "status": "in_progress",
      "last_tuned_at": null,
      "created_at": "2026-06-07T12:00:00+08:00",
      "substats": []
    }
  ]
}
```

### POST `/api/echoes/`

Status: **Implemented**

Purpose:

- 创建正式声骸记录。

Request:

```json
{
  "game_account_id": 1,
  "echo_uid": "",
  "display_name": "Sample Echo",
  "cost": 4,
  "set_name": "Sierra Gale",
  "main_stat": "crit_rate",
  "source": "manual",
  "source_type": "manual",
  "tuning_batch_id": "",
  "is_continuous_tuning": false
}
```

Rules:

- `game_account_id` 可省略；省略时使用默认 `GameAccount`。
- `echo_uid` 可省略；省略时由后端从 `GameAccount.next_echo_sequence` 分配。
- `cost` 只能是 `1`、`3`、`4`。
- `main_stat` 必须符合当前 `cost` 的合法主词条集合。
- 默认 `GameAccount.uid` 为空时必须返回 `400`。
- 同一 `GameAccount` 下 `echo_uid` 必须唯一。

Response:

```json
{
  "id": 1,
  "game_account_id": 1,
  "echo_uid": "000001000001",
  "display_name": "Sample Echo",
  "cost": 4,
  "set_name": "Sierra Gale",
  "main_stat": "crit_rate",
  "source": "manual",
  "tuning_batch_id": "",
  "is_continuous_tuning": false,
  "status": "in_progress",
  "last_tuned_at": null,
  "created_at": "2026-06-07T12:00:00+08:00",
  "substats": []
}
```

### GET `/api/echoes/{id}/`

Status: **Implemented**

Purpose:

- 查询单个声骸。

Response:

- 与 `POST /api/echoes/` 响应一致。

### PATCH `/api/echoes/{id}/`

Status: **Implemented**

Purpose:

- 更新声骸基础信息。

Request:

```json
{
  "display_name": "New name",
  "set_name": "New set",
  "source": "manual",
  "is_continuous_tuning": true
}
```

Rules:

- 只能更新属于当前用户的声骸。
- MVP 不允许通过该接口把声骸移动到另一个 `GameAccount`。

Response:

- 与 `POST /api/echoes/` 响应一致。

## Substat Rolls

### POST `/api/echoes/{id}/substats/`

Status: **Implemented**

Purpose:

- 为声骸新增一次副词条记录。

Request:

```json
{
  "position": 1,
  "substat_type": "crit_rate",
  "tier_value": 6.3,
  "enhance_phase": "+5",
  "tuning_order": 1
}
```

Rules:

- `position` 可省略；省略时按当前声骸已有词条数量自动追加。
- `position` 必须在 `1..5`。
- 同一声骸下 `position` 不可重复。
- 同一声骸下 `substat_type` 不可重复。
- `tier_value` 必须存在于对应 `substat_type` 的合法档位表。
- 第 5 条副词条写入后，声骸状态应变成 `completed`。

Response:

```json
{
  "id": 1,
  "position": 1,
  "substat_type": "crit_rate",
  "tier_value": 6.3,
  "enhance_phase": "+5",
  "tuning_order": 1,
  "tuned_at": "2026-06-07T12:00:00+08:00"
}
```

### DELETE `/api/echoes/{id}/substats/latest/`

Status: **Implemented**

Purpose:

- 撤销当前声骸最后一条副词条。

Response:

```json
{
  "removed": {
    "id": 5,
    "position": 5,
    "substat_type": "skill_damage",
    "tier_value": 6.4,
    "enhance_phase": "+25",
    "tuning_order": 5,
    "tuned_at": "2026-06-07T12:00:00+08:00"
  },
  "echo": {
    "id": 1,
    "status": "in_progress",
    "substats": []
  }
}
```

## Prediction And Analytics

### GET `/api/echoes/{id}/prediction/`

Status: **Implemented**

Purpose:

- 为当前声骸预测下一条副词条。

Rules:

- 只能访问当前用户声骸。
- 样本池必须限定在该声骸所属 `GameAccount`。

Response:

- 返回预测服务结果；字段以 `api.services.prediction.predict_next_substat` 为准。

### GET `/api/stats/?game_account_id={id}`

Status: **Implemented**

Purpose:

- 查询当前 `GameAccount` 的统计结果。

Rules:

- 如果不传 `game_account_id`，使用默认 `GameAccount`。
- 不得混入其他 `GameAccount` 的正式样本。

Response:

- 返回统计服务结果；字段以 `api.services.statistics.build_user_statistics` 为准。

### GET `/api/model-evaluation/?game_account_id={id}`

Status: **Implemented**

Purpose:

- 查询当前 `GameAccount` 的模型评估结果。

Rules:

- 如果不传 `game_account_id`，使用默认 `GameAccount`。
- 不得混入其他 `GameAccount` 的正式样本。

Response:

- 返回评估服务结果；字段以 `api.services.evaluation.build_model_evaluation` 为准。

## Recognition Sessions

### POST `/api/recognition/sessions/`

Status: **Planned**

Purpose:

- WPF 本地助手开始一次识别会话。

Request:

```json
{
  "game_account_id": 1,
  "client_name": "WuwaAssistant",
  "client_version": "0.1.0",
  "game_window_title": "Wuthering Waves",
  "screen_resolution": "2560x1440"
}
```

Response:

```json
{
  "id": 1,
  "game_account_id": 1,
  "status": "active",
  "snapshot_count": 0,
  "saved_roll_count": 0,
  "created_echo_count": 0,
  "updated_echo_count": 0,
  "conflict_count": 0,
  "reverted_count": 0,
  "started_at": "2026-06-07T12:00:00+08:00",
  "last_snapshot_at": null
}
```

### GET `/api/recognition/sessions/?game_account_id={id}`

Status: **Planned**

Purpose:

- 查询当前 `GameAccount` 的识别会话列表。

Response:

```json
{
  "results": [
    {
      "id": 1,
      "game_account_id": 1,
      "status": "active",
      "snapshot_count": 3,
      "saved_roll_count": 2,
      "created_echo_count": 1,
      "updated_echo_count": 0,
      "conflict_count": 1,
      "reverted_count": 0,
      "started_at": "2026-06-07T12:00:00+08:00",
      "last_snapshot_at": "2026-06-07T12:05:00+08:00"
    }
  ]
}
```

### GET `/api/recognition/sessions/{id}/`

Status: **Planned**

Purpose:

- 查询单个识别会话摘要。

Response:

- 与列表 item 一致，可额外包含最近 snapshots。

## Recognition Snapshots

### POST `/api/recognition/snapshots/`

Status: **Planned**

Purpose:

- WPF 提交一次样例识别结果。
- MVP 阶段不做 OCR，只提交固定样例 payload。

Request:

```json
{
  "game_account_id": 1,
  "session_id": 1,
  "trigger_type": "sample_payload",
  "client_event_id": "sample-echo-001",
  "captured_at": "2026-06-07T12:00:00+08:00",
  "hashes": {
    "detail": "sample-detail-hash-001"
  },
  "detail_snapshot_raw": {
    "name_text": "Sample Echo",
    "sonata_text": "Sierra Gale",
    "cost_text": "4",
    "main_stat_text": "crit_rate",
    "substats": [
      {
        "position": 1,
        "label_text": "crit_rate",
        "value_text": "6.3",
        "confidence": 1.0
      }
    ]
  },
  "normalized_snapshot": {
    "display_name": "Sample Echo",
    "set_name": "Sierra Gale",
    "cost": 4,
    "main_stat": "crit_rate",
    "substats": [
      {
        "position": 1,
        "substat_type": "crit_rate",
        "tier_value": 6.3
      }
    ]
  },
  "field_confidence": {
    "detail_page": 1.0
  }
}
```

Rules:

- `session_id` 必须属于当前用户和当前 `GameAccount`。
- `session_id + client_event_id` 非空时必须幂等。
- `game_account_id + detail_screenshot_hash` 非空时可识别重复详情页。
- 合法 snapshot 可以创建或更新正式 `EchoRecord`。
- 合法 substat 会创建正式 `SubstatRoll`。
- 冲突或非法档位不得进入正式样本。
- 需要记录 `created_roll_ids`，用于回滚。

Response:

```json
{
  "snapshot_id": 1,
  "session_id": 1,
  "game_account_id": 1,
  "status": "saved",
  "match_status": "created",
  "matched_echo_id": null,
  "created_echo_id": 1,
  "created_roll_count": 1,
  "warnings": []
}
```

Duplicate response:

```json
{
  "snapshot_id": 1,
  "session_id": 1,
  "game_account_id": 1,
  "status": "ignored_duplicate",
  "match_status": "created",
  "created_roll_count": 0,
  "warnings": ["duplicate_client_event_id"]
}
```

Conflict response:

```json
{
  "snapshot_id": 2,
  "session_id": 1,
  "game_account_id": 1,
  "status": "conflict",
  "match_status": "conflict",
  "created_roll_count": 0,
  "warnings": ["illegal_tier_value"],
  "error_code": "invalid_substat_tier"
}
```

### GET `/api/recognition/snapshots/?game_account_id={id}&status=conflict`

Status: **Planned**

Purpose:

- 给前端自动采集摘要和冲突列表使用。

Response:

```json
{
  "results": [
    {
      "id": 2,
      "session_id": 1,
      "game_account_id": 1,
      "status": "conflict",
      "match_status": "conflict",
      "trigger_type": "sample_payload",
      "client_event_id": "sample-echo-002",
      "created_roll_count": 0,
      "warnings": ["illegal_tier_value"],
      "error_code": "invalid_substat_tier",
      "captured_at": "2026-06-07T12:00:00+08:00",
      "created_at": "2026-06-07T12:00:01+08:00"
    }
  ]
}
```

### POST `/api/recognition/snapshots/{id}/revert/`

Status: **Planned**

Purpose:

- 回滚某次 snapshot 创建的正式样本。

Rules:

- 只能回滚当前用户的 snapshot。
- 只能删除该 snapshot 的 `created_roll_ids` 对应 rows。
- 如果该 snapshot 创建的 `EchoRecord` 没有其他 roll，可以删除或归档该 echo；MVP 推荐删除自动创建且无剩余 roll 的 echo。
- 回滚后 snapshot 状态变为 `reverted`。
- 回滚后统计、预测、模型评估不再包含这些 roll。

Response:

```json
{
  "snapshot_id": 1,
  "status": "reverted",
  "removed_roll_count": 1,
  "removed_echo_id": 1,
  "reverted_at": "2026-06-07T12:10:00+08:00"
}
```

## WPF MVP Call Flow

1. `GET /api/health/` 获取 CSRF cookie。
2. `POST /api/auth/login/` 使用系统账号登录。
3. `GET /api/me/` 确认登录状态。
4. `GET /api/game-accounts/` 获取游戏账号。
5. 如果默认账号 `workspace_locked=true`，提示用户先在 Web 端绑定 UID。
6. `POST /api/recognition/sessions/` 创建识别会话。
7. `POST /api/recognition/snapshots/` 提交固定样例 payload。
8. `POST /api/recognition/snapshots/{id}/revert/` 回滚最近一次提交。

## Frontend MVP Call Flow

1. `GET /api/health/` 初始化 CSRF。
2. `POST /api/auth/register/` 或 `POST /api/auth/login/`。
3. `GET /api/me/`。
4. `GET /api/game-accounts/`。
5. 如果默认账号未绑定 UID，展示锁定工作台和 UID 绑定表单。
6. `PATCH /api/game-accounts/{id}/` 保存 UID。
7. `GET /api/echoes/?game_account_id={id}` 加载历史。
8. `POST /api/echoes/` 创建声骸。
9. `POST /api/echoes/{id}/substats/` 记录副词条。
10. `GET /api/stats/?game_account_id={id}`、`GET /api/model-evaluation/?game_account_id={id}`、`GET /api/echoes/{id}/prediction/` 更新看板。
11. `GET /api/recognition/sessions/?game_account_id={id}` 和 `GET /api/recognition/snapshots/?game_account_id={id}&status=conflict` 展示自动采集摘要。

