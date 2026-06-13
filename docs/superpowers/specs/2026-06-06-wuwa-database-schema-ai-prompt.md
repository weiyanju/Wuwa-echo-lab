# Wuwa Database Schema AI Prompt

## Purpose

This document is a reusable prompt for asking an AI agent to design the next database schema for the Wuwa echo tracking system.

It intentionally combines:

- Existing frontend behavior and data state.
- Existing backend models and API behavior.
- The planned GameAccount account model.
- The planned WPF local assistant MVP.
- The auto echo recognition design and architecture requirements.

The goal is to prevent schema design from only following the backend models while missing frontend state that already exists in the product.

## Prompt

```text
你是一名资深 Django 后端架构师兼产品型数据建模专家。请基于当前项目的前端功能、后端接口、以及自动识别设计文档，为项目设计一版端到端可落地的数据库表结构。重点输出 Django models 设计、字段、约束、索引、状态枚举、数据归属关系、哪些前端状态需要入库、哪些只应保留在前端本地，以及 migrations/数据库重置策略。暂时不要写完整 CRUD 业务代码。

项目背景：
这是一个“鸣潮声骸记录与预测系统”。当前前端已经有可用的工作台、声骸录入、历史声骸、预测、统计、模型评估、UID 快捷切换等功能。后端已有基础 API，但数据库表结构需要重新梳理，以支持系统账号、游戏账号、多 UID 数据隔离、未来 WPF 本地助手自动识别回写数据库。

当前假数据允许全部丢弃，可以重置开发数据库，不需要兼容旧 EchoRecord/SubstatRoll 业务样本。

一、当前前端已有功能和数据状态

前端主要功能：

1. 登录/注册
- 当前前端曾用游戏 UID 派生系统账号，例如 username=`wuwa_${uid}`，password=`wuwa_uid_${uid}`。
- 新 MVP 要改为真正的系统账号注册/登录。
- 登录后进入工作台。
- 如果用户没有绑定有效鸣潮 UID，则锁住工作台，只允许绑定 UID。

2. 游戏 UID / GameAccount
- 前端当前使用 localStorage 保存：
  - `wuwa-player-uid`
  - `wuwa-recent-player-uids`
  - `wuwa-echo-sequence-${uid}`
- 新设计中，UID 不应作为登录凭证，而应成为 GameAccount。
- 用户注册成功后，后端自动创建一个默认 GameAccount，但 uid 初始为空。
- 用户登录后，如果默认 GameAccount 没有有效 uid，则工作台锁定。
- UID 第一版只校验非空。
- server 字段预留，可为空。
- 后端要支持一个系统 User 绑定多个 GameAccount，但 MVP 前端可以先只做默认账号绑定。

3. 声骸工作台
前端当前有 echoForm：
- sonata / set_name
- cost
- main_stat
- is_continuous_tuning

前端可执行：
- 初始化/创建声骸。
- 如果当前声骸是空草稿，可以直接改配置。
- 如果已有词条，再改配置会创建新声骸。
- 点击副词条合法档位后，向后端追加 SubstatRoll。
- 撤回当前声骸最后一条副词条。
- 弃置当前声骸，前端会把 status 更新为 archived，然后创建下一个。
- 下一个声骸会沿用当前声骸的 sonata、cost、main_stat，并设置连续调谐。

4. 历史声骸
前端历史列表根据 EchoRecord + SubstatRoll 派生：
- 当前录入：activeEchoId
- 待强化：非 archived，副词条数 1-4
- 已强化：非 archived，副词条数 >= 5
- 弃置：status = archived

注意：
- activeEchoId 是前端当前选择状态，可作为 UserPreference 或客户端状态，不一定必须进入 MVP 数据表。
- pending/completed 可由 substat 数量 + status 派生，不一定单独存，但 EchoRecord.status 仍可保留用于 archived/in_progress/completed。

5. 预测、统计、模型评估
前端调用：
- GET /api/echoes/
- POST /api/echoes/
- PATCH /api/echoes/{id}/
- POST /api/echoes/{id}/substats/
- DELETE /api/echoes/{id}/substats/latest/
- GET /api/echoes/{id}/prediction/
- GET /api/stats/
- GET /api/model-evaluation/

当前后端预测/统计/评估都可由正式样本 EchoRecord/SubstatRoll 实时计算：
- total_rolls
- substat_frequency
- sample_stage
- context_factors
- prediction candidates
- model weights
- model diagnostics
- model evaluation scores

请判断这些是否需要入库。MVP 倾向：
- 不为每张统计图单独建表。
- 不为 prediction/evaluation 结果建缓存表，除非你认为必要；如建议缓存，请标为非 MVP。
- 所有统计、预测、评估必须按 game_account 过滤，而不是按 user 全局统计。

6. UI 偏好
前端当前 localStorage 保存：
- save login 开关
- 浮动历史面板位置/大小/最小化/固定
- 主题模式
- 最近 UID 列表

请判断哪些应进入数据库。MVP 倾向：
- 主题、浮动面板位置等纯 UI 状态保留在前端 localStorage，不进核心业务表。
- 最近 UID 列表被后端 GameAccount 列表替代。
- 当前默认 GameAccount 应入库。
- activeEchoId 可以先保留前端状态，若建 UserPreference 请说明是否 MVP 必要。

二、当前后端已有模型和行为

当前后端已有：

1. EchoRecord
字段大致包括：
- user
- echo_uid
- display_name
- cost
- set_name
- main_stat
- source
- tuning_batch_id
- is_continuous_tuning
- status
- last_tuned_at
- created_at
- updated_at

当前唯一约束是 user + echo_uid，未来要改为 game_account + echo_uid。

2. SubstatRoll
字段大致包括：
- echo
- position
- substat_type
- tier_value
- tuned_at
- enhance_phase
- tuning_order
- created_at

当前约束：
- echo + position 唯一
- echo + substat_type 唯一

3. 后端已有常量
- MAIN_STATS_BY_COST
- SUBSTAT_TYPES
- TIER_TABLES
- sonata/set_name 字典目前主要在前端，后端可先用字符串字段，但需要考虑后续标准化。

三、自动识别和 WPF 本地助手 MVP 背景

已有设计文档要求未来新增 Windows WPF 本地助手。MVP 本地助手先不做 OCR、窗口检测、模板匹配，而是必须做到：
- 使用 Django Session + Cookie 登录后端。
- 读取当前用户 GameAccount。
- 如果未绑定 UID，提示先绑定。
- 创建 RecognitionSession。
- 提交一条模拟识别快照到 POST /api/recognition/snapshots/。
- 后端真实写入 RecognitionSnapshot。
- 如果快照合法，后端真实创建/更新 EchoRecord 和 SubstatRoll。
- WPF 显示后端返回的 snapshot_id/status/match_status/created_roll_count。
- 可以调用撤销接口，回滚最近一次自动入库。

OCR 标准化复杂逻辑后置，MVP 先接受接近标准结构的 detail_snapshot_raw / normalized_snapshot，但字段要预留，以后接 OCR 不重改表。

四、请设计以下核心数据模型

1. 系统账号
- MVP 倾向使用 Django 默认 User。
- 请说明是否需要自定义 User；默认建议不需要。
- 注册成功后需要自动创建默认空 GameAccount。
- 请说明推荐在 service/view 中显式创建，还是用 signal，并给理由。

2. GameAccount
用于表示一个系统账号绑定的鸣潮 UID。

要求：
- 归属 User。
- 支持一个 User 多个 GameAccount。
- 注册后自动创建一个默认 GameAccount，但 uid 初始为空。
- 工作台锁定依据：默认 GameAccount 的 uid 是否为空。
- uid 第一版只校验非空。
- server 预留，可为空。
- nickname 可为空。
- is_default 标记默认账号。
- 后续所有 EchoRecord、RecognitionSession、RecognitionSnapshot、统计、预测、评估都必须按 GameAccount 归属。
- 同一 user 下有效 uid + server 唯一，但要考虑 uid 为空时如何处理唯一约束。
- 每个 user 最多一个默认 GameAccount。
- 需要索引支持 user 下账号列表和默认账号查询。

建议字段：
- user
- uid
- server
- nickname
- is_default
- created_at
- updated_at

3. EchoRecord
表示正式声骸记录，支撑前端工作台、历史声骸、预测、统计。

要求：
- 必须归属 user 和 game_account。
- game_account 必填。
- user 可保留，便于权限校验和查询，但 game_account 是业务归属核心。
- 当前假数据允许丢弃，所以不需要旧 user-only 数据迁移兼容。
- 同一 game_account 下 echo_uid 唯一。
- 不同 game_account 可以有相同 echo_uid。
- 支持前端字段：
  - echo_uid
  - display_name
  - cost
  - set_name / sonata
  - main_stat
  - source
  - tuning_batch_id
  - is_continuous_tuning
  - status
  - last_tuned_at
  - created_at
  - updated_at
- status 至少支持：
  - draft 或 in_progress：录入中/待强化
  - completed：已录满 5 条
  - archived：弃置
- 请判断是否需要单独 draft 状态。当前前端通过“无 substats 且非 archived”判断可复用草稿。
- 需要支持前端“下一个声骸沿用当前配置”的数据。
- 需要支持手动录入和自动识别来源，建议字段：
  - entry_source 或 source_type：manual / assistant / import
  - auto_imported
- 需要索引：
  - game_account + status
  - game_account + last_tuned_at
  - game_account + created_at
  - game_account + echo_uid unique

4. SubstatRoll
表示正式副词条事件，是统计、预测、模型评估的核心样本。

要求：
- 归属 EchoRecord。
- 不直接存 game_account，除非你认为性能需要；默认通过 echo.game_account 间接归属。
- 字段支持：
  - echo
  - position
  - substat_type
  - tier_value
  - enhance_phase
  - tuning_order
  - source_type：manual / assistant / import
  - recognition_snapshot 可选外键，记录是否来自自动识别
  - tuned_at
  - created_at
- 约束：
  - echo + position 唯一
  - echo + substat_type 唯一
  - position 1-5
  - substat_type 必须在 SUBSTAT_TYPES
  - tier_value 必须在 TIER_TABLES 对应合法档位
- 删除/撤销最后词条后，需要 EchoRecord 重新计算状态和 last_tuned_at。
- 需要索引支持：
  - echo
  - tuned_at
  - substat_type
  - echo + position

5. Echo UID / sequence 设计
前端当前用 localStorage 的 `wuwa-echo-sequence-${uid}` 生成 echo_uid。

新设计中请判断：
- 是否应由后端生成 echo_uid。
- 是否需要 GameAccount 上保存 next_echo_sequence。
- 或者允许前端传 echo_uid，但后端校验唯一。

MVP 推荐：
- 后端负责生成或至少分配稳定 echo_uid，避免多客户端冲突。
- 如果保留前端传入，也必须在后端按 game_account 做唯一校验。

请给出推荐方案和字段设计。

6. RecognitionSession
表示本地助手一次采集/联调会话。

要求：
- 必须归属 user 和 game_account。
- 支持 WPF MVP 和未来 OCR 助手。
- 字段建议：
  - user
  - game_account
  - client_name
  - client_version
  - game_window_title
  - screen_resolution
  - started_at
  - ended_at
  - status：active / ended / expired
  - snapshot_count
  - saved_roll_count
  - created_echo_count
  - updated_echo_count
  - conflict_count
  - reverted_count
  - last_snapshot_at
  - created_at
  - updated_at
- 需要索引：
  - game_account + status
  - game_account + started_at
  - user + started_at

7. RecognitionSnapshot
表示一次本地助手识别快照。

要求：
- 必须归属 session、user、game_account。
- 支持 WPF 提交模拟样例。
- 支持未来 OCR 原文、标准化结果、置信度、截图哈希、匹配状态、入库结果、异常隔离、撤销。
- 字段建议：
  - session
  - user
  - game_account
  - trigger_type：enhance_success / manual_rescan / sample_payload
  - client_event_id
  - captured_at
  - popup_delta_raw JSON
  - detail_snapshot_raw JSON
  - normalized_snapshot JSON
  - field_confidence JSON
  - popup_screenshot_hash
  - detail_screenshot_hash
  - match_status：exact / probable / time_order / created / conflict
  - status：saved / ignored_duplicate / conflict / rejected / reverted
  - matched_echo nullable FK
  - created_echo nullable FK
  - created_roll_ids JSON
  - created_roll_count
  - warnings JSON
  - error_code
  - applied_at
  - reverted_at
  - created_at
- 幂等要求：
  - 同一 session + client_event_id 唯一，client_event_id 为空时如何处理要说明。
  - 同一 game_account + detail_screenshot_hash 可用于去重，但 hash 为空时不能误伤。
- created_roll_ids 用 JSONField 是否合理？如果你建议中间表 RecognitionSnapshotRollChange，请说明是否 MVP 必要。
- 异常 snapshot 不应创建正式 EchoRecord/SubstatRoll，不参与统计预测。

8. UserPreference / ClientState
请评估是否需要一张用户偏好表。

前端现有偏好：
- themeMode
- saveLogin
- floating history position/size/minimized/pinned
- activeEchoId
- recent UID list

MVP 倾向：
- 纯 UI 布局偏好保留 localStorage，不入库。
- recent UID list 用 GameAccount 列表替代。
- activeEchoId 可以前端保留，也可作为 UserPreference.current_echo。

请给出建议：MVP 是否建 UserPreference 表。如果建，请限制字段，避免过度设计。

9. 派生数据是否入库
请明确哪些前端页面数据不应入库，而应由正式样本实时计算：
- stats.total_rolls
- stats.substat_frequency
- stats.sample_stage
- prediction candidates
- prediction model weights
- prediction diagnostics
- model_evaluation scores

MVP 倾向：
- 不建 StatsSnapshot、PredictionCache、ModelEvaluationCache。
- 后续样本量大后再考虑缓存。

请说明理由。

五、API 与表结构关系

请基于表结构说明以下接口需要哪些字段和查询：
- POST /api/auth/register/
- POST /api/auth/login/
- POST /api/auth/logout/
- GET /api/me/
- GET /api/game-accounts/
- POST /api/game-accounts/
- PATCH /api/game-accounts/{id}/
- POST /api/game-accounts/{id}/select/ 或说明是否不需要
- GET /api/echoes/?game_account_id=...
- POST /api/echoes/
- PATCH /api/echoes/{id}/
- POST /api/echoes/{id}/substats/
- DELETE /api/echoes/{id}/substats/latest/
- GET /api/echoes/{id}/prediction/
- GET /api/stats/?game_account_id=...
- GET /api/model-evaluation/?game_account_id=...
- POST /api/recognition/sessions/
- GET /api/recognition/sessions/?game_account_id=...
- GET /api/recognition/sessions/{id}/
- POST /api/recognition/snapshots/
- GET /api/recognition/conflicts/?game_account_id=...
- POST /api/recognition/snapshots/{id}/revert/

六、输出要求

请输出：
1. 端到端数据归属关系图，推荐用 Mermaid ER 图或清晰文字。
2. “前端状态入库判断表”：列出当前前端数据项，标记为：
   - 入核心业务表
   - 入 GameAccount/UserPreference
   - 后端实时派生
   - 继续留在 localStorage
   - MVP 不做
3. 每张表的字段清单，包括字段类型、是否可空、默认值、说明。
4. 每张表的唯一约束、条件唯一约束、CheckConstraint、索引建议。
5. Django models 示例代码，尽量贴近真实可用代码。
6. 注册后自动创建默认空 GameAccount 的推荐实现方式。
7. 工作台锁定逻辑依赖的 API 返回结构，例如 /api/me/ 或 /api/game-accounts/ 应如何告诉前端 workspace_locked。
8. Echo UID 生成策略，说明前端生成迁移到后端生成的方案。
9. 数据库重置和 migrations 策略：当前假数据允许丢弃，优先干净重建。
10. MVP 不做的内容清单，避免过度设计。
11. 最小测试清单，覆盖：
    - 注册创建默认空 GameAccount
    - 未绑定 UID 锁定工作台
    - 绑定 UID 后允许创建 EchoRecord
    - 不同 GameAccount 数据隔离
    - EchoRecord/SubstatRoll 约束
    - 统计/预测/评估按 game_account 过滤
    - RecognitionSnapshot 样例入库
    - RecognitionSnapshot 幂等
    - revert 撤销自动入库
```

## Notes For The Reviewer

When reviewing an AI-generated schema from this prompt, check these areas first:

- It must not keep using `user` as the only business data boundary.
- It must explain how empty default `GameAccount.uid` avoids uniqueness problems.
- It must move echo sequence generation away from frontend-only `localStorage`.
- It must not create tables for every stats/prediction chart in MVP.
- It must preserve enough recognition fields for future OCR without forcing OCR implementation into MVP.
- It must clearly separate frontend-only UI preferences from durable business data.
