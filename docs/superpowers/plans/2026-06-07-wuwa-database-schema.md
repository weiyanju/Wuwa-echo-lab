# Wuwa PostgreSQL Database Schema For MVP

本文档定义 Wuwa MVP 阶段的 PostgreSQL 表结构。它以当前 Django models 为准，并结合自动声骸识别设计、架构文档和 MVP 实施计划，说明哪些数据需要持久化、哪些数据暂不入库。

## Database Choice

MVP 使用 PostgreSQL。

Reasons:

- 需要可靠的外键、唯一约束、条件唯一约束和事务。
- 识别原始结果适合用 `JSONField` 保存，PostgreSQL 对 JSON 支持更成熟。
- 后续如果要做统计缓存、模型评估快照、识别日志检索，PostgreSQL 可以继续承载。

## Data Ownership

核心归属链路：

```text
User
  -> GameAccount
      -> EchoRecord
          -> SubstatRoll
      -> RecognitionSession
          -> RecognitionSnapshot
```

规则：

- `User` 表示系统登录账号。
- `GameAccount` 表示一个鸣潮游戏 UID。
- 所有正式业务样本必须属于某个 `GameAccount`。
- 统计、预测、模型评估都必须以 `GameAccount` 为样本边界。
- `RecognitionSnapshot` 是识别原始日志，不等于正式样本。
- 只有通过校验并成功写入的 `SubstatRoll` 才进入统计样本。

## Existing Fake Data

当前已有业务数据可以视为假数据。

Decision:

- 不做旧业务样本迁移。
- 使用干净 schema 重新建表和跑 migrations。
- 用户表如果也是开发环境数据，可以一并重建；如果后续出现真实用户，再单独写迁移脚本。

## Table: `auth_user`

Source:

- Django built-in `User` model.

Purpose:

- 系统账号注册、登录、Session 归属。

Important fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | integer | Primary key |
| `username` | varchar | Login name |
| `password` | varchar | Django password hash |
| `is_active` | boolean | Django auth state |
| `date_joined` | timestamp | Created by Django |

MVP notes:

- 不使用游戏 UID 作为登录账号。
- 注册用户后，系统自动创建一个默认空 `GameAccount`。

## Table: `api_gameaccount`

Source:

- `api.models.GameAccount`

Purpose:

- 保存用户绑定的鸣潮游戏账号。
- 决定工作台是否解锁。
- 提供声骸编号分配序列。

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | bigint | yes | Primary key |
| `user_id` | FK -> `auth_user.id` | yes | Owner |
| `uid` | varchar(32) | no | 鸣潮 UID；空字符串表示未绑定 |
| `server` | varchar(32) | no | 预留服务器字段；MVP 可为空 |
| `nickname` | varchar(80) | no | 用户自定义备注 |
| `is_default` | boolean | yes | 当前系统账号默认游戏账号 |
| `next_echo_sequence` | integer | yes | 后端分配 `echo_uid` 的递增序列 |
| `created_at` | timestamp | yes | Auto created |
| `updated_at` | timestamp | yes | Auto updated |

Constraints:

- 条件唯一：同一用户下，非空 `uid + server` 唯一。
- 条件唯一：同一用户最多一个 `is_default=true` 的账号。

Indexes:

- `(user_id, is_default)`
- `(user_id, uid, server)`

Business rules:

- `workspace_locked = true` when `uid.strip()` is empty.
- 默认空 `GameAccount` 允许存在，但不能创建正式 `EchoRecord`。
- `allocate_echo_uid()` 必须在事务中锁定该账号行并递增 `next_echo_sequence`。

## Table: `api_echorecord`

Source:

- `api.models.EchoRecord`

Purpose:

- 保存一个正式声骸记录。
- 是统计、预测、模型评估的上层样本实体。

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | bigint | yes | Primary key |
| `user_id` | FK -> `auth_user.id` | yes | Redundant owner for fast filtering |
| `game_account_id` | FK -> `api_gameaccount.id` | yes | Business owner |
| `echo_uid` | varchar(80) | yes | GameAccount 内唯一 |
| `display_name` | varchar(120) | no | 展示名或识别名 |
| `cost` | smallint | yes | `1`、`3`、`4` |
| `set_name` | varchar(120) | yes | 套装/声骸集合名 |
| `main_stat` | varchar(80) | yes | 主词条 key |
| `source` | varchar(160) | no | 来源备注 |
| `source_type` | varchar(20) | yes | `manual`、`assistant`、`import` |
| `tuning_batch_id` | varchar(120) | no | 连续强化批次 |
| `is_continuous_tuning` | boolean | yes | 是否连续强化流程 |
| `auto_imported` | boolean | yes | 是否由自动识别导入 |
| `status` | varchar(20) | yes | `in_progress`、`completed`、`archived` |
| `last_tuned_at` | timestamp | no | 最近副词条写入时间 |
| `created_at` | timestamp | yes | Auto created |
| `updated_at` | timestamp | yes | Auto updated |

Constraints:

- 唯一：`(game_account_id, echo_uid)`。

Indexes:

- `(game_account_id, status)`
- `(game_account_id, last_tuned_at)`
- `(game_account_id, created_at)`

Business rules:

- `game_account.user_id` 必须等于 `user_id`。
- `game_account.uid` 为空时禁止保存正式声骸。
- `cost` 必须存在于 `MAIN_STATS_BY_COST`。
- `main_stat` 必须合法匹配当前 `cost`。
- 未传 `echo_uid` 时，由 `GameAccount.allocate_echo_uid()` 分配。
- 第 5 条副词条写入后状态自动变为 `completed`。

## Table: `api_substatroll`

Source:

- `api.models.SubstatRoll`

Purpose:

- 保存一次正式副词条结果。
- 是统计、预测、模型评估真正使用的核心样本。

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | bigint | yes | Primary key |
| `echo_id` | FK -> `api_echorecord.id` | yes | Parent echo |
| `recognition_snapshot_id` | FK -> `api_recognitionsnapshot.id` | no | 若由自动识别创建，则记录来源 |
| `position` | smallint | yes | 第几条副词条，范围 `1..5` |
| `substat_type` | varchar(80) | yes | 副词条 key |
| `tier_value` | double precision | yes | 副词条档位值 |
| `tuned_at` | timestamp | yes | 强化时间 |
| `enhance_phase` | varchar(8) | no | `+5`、`+10`、`+15`、`+20`、`+25` |
| `tuning_order` | integer | no | 强化顺序 |
| `source_type` | varchar(20) | yes | `manual`、`assistant`、`import` |
| `created_at` | timestamp | yes | Auto created |

Constraints:

- 唯一：`(echo_id, position)`。
- 唯一：`(echo_id, substat_type)`。
- Check：`position >= 1 AND position <= 5`。

Indexes:

- `(echo_id)`
- `(tuned_at)`
- `(substat_type)`
- `(echo_id, position)`

Business rules:

- `substat_type` 必须存在于 `SUBSTAT_TYPES`。
- `tier_value` 必须存在于对应 `TIER_TABLES[substat_type]`。
- 如果关联 `RecognitionSnapshot`，snapshot 必须和 echo 属于同一个 `GameAccount`。
- 保存后更新父级 `EchoRecord.last_tuned_at` 和 `status`。

## Table: `api_recognitionsession`

Source:

- `api.models.RecognitionSession`

Purpose:

- 保存一次 WPF 本地助手识别会话。
- 为前端自动采集摘要提供聚合计数。

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | bigint | yes | Primary key |
| `user_id` | FK -> `auth_user.id` | yes | Owner |
| `game_account_id` | FK -> `api_gameaccount.id` | yes | Business owner |
| `client_name` | varchar(80) | no | 例如 `WuwaAssistant` |
| `client_version` | varchar(40) | no | 本地助手版本 |
| `game_window_title` | varchar(160) | no | 游戏窗口标题 |
| `screen_resolution` | varchar(40) | no | 屏幕分辨率 |
| `started_at` | timestamp | yes | 会话开始时间 |
| `ended_at` | timestamp | no | 会话结束时间 |
| `status` | varchar(20) | yes | `active`、`ended`、`expired` |
| `snapshot_count` | integer | yes | 收到 snapshot 次数 |
| `saved_roll_count` | integer | yes | 写入正式 roll 数 |
| `created_echo_count` | integer | yes | 自动创建 echo 数 |
| `updated_echo_count` | integer | yes | 自动更新 echo 数 |
| `conflict_count` | integer | yes | 冲突 snapshot 数 |
| `reverted_count` | integer | yes | 已回滚 snapshot 数 |
| `last_snapshot_at` | timestamp | no | 最近 snapshot 时间 |
| `created_at` | timestamp | yes | Auto created |
| `updated_at` | timestamp | yes | Auto updated |

Indexes:

- `(game_account_id, status)`
- `(game_account_id, started_at)`
- `(user_id, started_at)`

Business rules:

- `game_account.user_id` 必须等于 `user_id`。
- 计数字段由 recognition service 更新，不由客户端直接写。

## Table: `api_recognitionsnapshot`

Source:

- `api.models.RecognitionSnapshot`

Purpose:

- 保存一次识别结果的原始数据、归一化数据、匹配结果和导入结果。
- 支撑幂等、冲突展示和回滚。

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | bigint | yes | Primary key |
| `session_id` | FK -> `api_recognitionsession.id` | yes | Parent session |
| `user_id` | FK -> `auth_user.id` | yes | Owner |
| `game_account_id` | FK -> `api_gameaccount.id` | yes | Business owner |
| `trigger_type` | varchar(24) | yes | `enhance_success`、`manual_rescan`、`sample_payload` |
| `client_event_id` | varchar(120) | no | WPF 侧事件 ID |
| `captured_at` | timestamp | yes | 客户端捕获时间 |
| `popup_delta_raw` | jsonb | yes | 强化弹窗原始识别结果 |
| `detail_snapshot_raw` | jsonb | yes | 详情页原始识别结果 |
| `normalized_snapshot` | jsonb | yes | 后端可校验的标准化结果 |
| `field_confidence` | jsonb | yes | 字段置信度 |
| `popup_screenshot_hash` | varchar(128) | no | 弹窗截图 hash |
| `detail_screenshot_hash` | varchar(128) | no | 详情页截图 hash |
| `match_status` | varchar(20) | yes | `exact`、`probable`、`time_order`、`created`、`conflict` |
| `status` | varchar(24) | yes | `saved`、`ignored_duplicate`、`conflict`、`rejected`、`reverted` |
| `matched_echo_id` | FK -> `api_echorecord.id` | no | 匹配到的正式 echo |
| `created_echo_id` | FK -> `api_echorecord.id` | no | 自动创建的 echo |
| `created_roll_ids` | jsonb | yes | 本次 snapshot 创建的 roll id 列表 |
| `created_roll_count` | integer | yes | 本次 snapshot 创建 roll 数 |
| `warnings` | jsonb | yes | 非致命警告 |
| `error_code` | varchar(80) | no | 冲突或拒绝原因 |
| `applied_at` | timestamp | no | 写入正式样本时间 |
| `reverted_at` | timestamp | no | 回滚时间 |
| `created_at` | timestamp | yes | Auto created |

Constraints:

- 条件唯一：同一 `session_id + client_event_id` 非空时唯一。
- 条件唯一：同一 `game_account_id + detail_screenshot_hash` 非空时唯一。

Indexes:

- `(game_account_id, status)`
- `(game_account_id, match_status)`
- `(session_id, created_at)`
- `(user_id, created_at)`

Business rules:

- `game_account.user_id` 必须等于 `user_id`。
- `session.user_id` 必须等于 `user_id`。
- `session.game_account_id` 必须等于 `game_account_id`。
- `normalized_snapshot` 合法时才允许创建正式 `EchoRecord` 和 `SubstatRoll`。
- `status=conflict` 或 `status=rejected` 的 snapshot 不进入正式样本。
- `created_roll_ids` 是回滚的唯一可信来源。

## JSON Shape: `normalized_snapshot`

MVP 推荐结构：

```json
{
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
}
```

Validation:

- `cost` 必须合法。
- `main_stat` 必须匹配 `cost`。
- `substats[].position` 必须在 `1..5`。
- `substats[].substat_type` 必须合法。
- `substats[].tier_value` 必须存在于对应档位表。

## Constants

The database stores keys, not labels.

Main stat rules:

- `cost=1`：`atk_percent`、`def_percent`、`hp_percent`
- `cost=3`：`attribute_damage`、`atk_percent`、`def_percent`、`hp_percent`、`energy_regen`
- `cost=4`：`crit_rate`、`crit_damage`、`atk_percent`、`hp_percent`、`def_percent`、`healing_bonus`

Substat keys:

- `crit_rate`
- `crit_damage`
- `basic_attack_damage`
- `skill_damage`
- `heavy_attack_damage`
- `liberation_damage`
- `atk_percent`
- `hp_percent`
- `def_percent`
- `flat_atk`
- `flat_hp`
- `energy_regen`
- `flat_def`

Tier values:

- 以 `api.constants.TIER_TABLES` 为唯一后端校验来源。
- 文档不复制完整档位表，避免和代码漂移。

## Data To Persist

MVP must persist:

- System user and session data.
- `GameAccount.uid`、`server`、`nickname`、`is_default`。
- `EchoRecord` formal echo records。
- `SubstatRoll` formal substat samples。
- `RecognitionSession` assistant session summary。
- `RecognitionSnapshot` raw and normalized recognition logs。
- `RecognitionSnapshot.created_roll_ids` for revert。

## Data Not To Persist In MVP

Keep in frontend localStorage or derive at runtime:

- Theme preference.
- Floating history panel position and size.
- Floating history minimized/pinned state.
- Save-login toggle.
- Recent UID shortcuts from the old prototype path.
- Prediction result cache.
- Statistics result cache.
- Model evaluation result cache.
- OCR screenshots and image files.

## Derived Data

Do not create tables yet for:

- History status chips.
- Pending/completed display grouping.
- Statistics chart data.
- Prediction candidates.
- Model detail cards.
- Model evaluation summary cards.

These values should be derived from `EchoRecord` and `SubstatRoll` for MVP.

## Migration Strategy

Current development strategy:

1. Discard old fake business data.
2. Keep the clean PostgreSQL schema as source of truth.
3. Recreate migrations when the schema is still pre-production.
4. After real data exists, stop rewriting initial migrations and use forward-only migrations.

Do not migrate:

- Old localStorage UID-derived accounts.
- Prototype echo IDs generated by frontend sequence storage.
- Fake echo/substat samples.

May migrate later:

- Real users, if any exist before public use.
- Real manually entered samples, if the user explicitly decides they are no longer fake.

## Query Boundaries

Every query that reads formal samples must choose one of these scopes explicitly:

- Current `GameAccount` only.
- Current `User` only for listing available `GameAccount` rows.
- System-wide only for admin/debug tools, not MVP user APIs.

MVP APIs must not use all samples from `User` when the user has multiple game accounts.

## Revert Semantics

Recognition revert must:

1. Load snapshot by current user.
2. Read `created_roll_ids`.
3. Delete only those `SubstatRoll` rows.
4. Recalculate affected echo status and `last_tuned_at`.
5. If snapshot-created echo has no remaining rolls, delete or archive it; MVP recommends deleting only auto-created empty echo.
6. Set snapshot `status` to `reverted`.
7. Set `reverted_at`.
8. Update session counters.

Recognition revert must not:

- Delete manually entered rolls.
- Delete rolls created by another snapshot.
- Touch another `GameAccount`.

## Future Tables Not Required For MVP

Possible later tables:

- `api_predictioncache`
- `api_statisticssnapshot`
- `api_modelevaluationrun`
- `api_assistantdevice`
- `api_screenshotasset`
- `api_recognitioncorrection`
- `api_gameaccountsyncstate`

These are intentionally excluded from MVP to keep the first end-to-end path small.

