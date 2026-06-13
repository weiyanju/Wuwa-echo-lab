# 鸣潮自动声骸识别项目架构设计

## 目标

本架构文档把“强化成功触发自动识别”的产品方案落到工程边界上，明确网页端、Django 后端、Windows 本地助手之间的职责、数据归属、接口契约和后续扩展点。

架构目标：

- 统一网页端和本地助手的账号体系。
- 支持一个系统账号绑定多个鸣潮游戏 UID。
- 让手动录入、自动识别、统计和预测都归属到具体游戏账号。
- 将 OCR 原始识别日志和正式统计样本隔离。
- 保证自动入库幂等、可撤销、可复盘。
- 为后续单独仓库的 WPF 本地助手提供清晰 API 契约。

本文件只描述架构，不包含具体 UI 视觉设计，也不进入编码计划。

## 范围

### 包含

- 系统账号与多游戏账号数据归属。
- 后端模型边界。
- 后端服务层划分。
- 自动识别 API 契约。
- 本地助手模块架构。
- 网页端需要配合的状态与页面边界。
- OCR、模板检测、截图、标准化、匹配、撤销、异常隔离的责任划分。
- 迁移策略和测试策略。

### 不包含

- WPF 本地助手仓库的实际工程文件。
- OCR 模型训练细节。
- 完整悬浮窗 UI 设计。
- 具体页面视觉稿。
- 生产部署脚本。

## 现有项目上下文

当前仓库包含：

- `Wuwa`：Django 后端。
- `WuwaFrontend`：Vue + Vite 前端。
- `EchoRecord`：声骸记录，当前归属到 `user`。
- `SubstatRoll`：副词条记录，通过 `echo` 归属到声骸。
- `api.services.prediction`：预测服务。
- `api.services.statistics`：统计服务。
- `api.constants`：主词条、副词条、合法档位和概率表。

本地助手工程不放在当前仓库。后续会单独建立仓库，例如 `WuwaAssistant`。当前仓库只维护后端、前端、文档和对本地助手公开的 API 契约。

## 核心架构决策

### 系统账号与游戏账号分离

系统账号负责登录和权限，游戏 UID 负责区分玩家数据空间。

```text
User
  -> GameAccount(uid=A, server=?, nickname=?)
  -> GameAccount(uid=B, server=?, nickname=?)
```

规则：

- 网页端和本地助手使用同一套系统账号和密码登录。
- 鸣潮 UID 不作为登录凭证。
- 一个系统账号可以绑定多个游戏账号。
- 所有声骸、识别会话、统计、预测都必须基于具体 `GameAccount`。
- 用户进入网页或本地助手后，需要选择当前游戏账号。

### 本地助手登录状态

第一版本地助手使用系统账号和密码登录，登录后保存 Django session/cookie，不保存明文密码。

规则：

- 本地助手与网页共用后端认证体系。
- 本地助手调用需要登录的 API 时携带 session/cookie。
- 本地助手启动时优先复用已保存 session。
- session 失效后提示用户重新登录。
- 第一版不实现设备 token。

### 本地助手技术栈

本地助手使用 WPF，单独仓库维护。

选择 WPF 的原因：

- Windows 桌面能力成熟。
- 托盘、全局快捷键、窗口捕获、置顶窗、点击穿透更直接。
- 对后续悬浮窗扩展友好。

### OCR 与截图策略

第一版默认不上传完整截图到后端。

上传内容：

- OCR 原文。
- 标准化字段。
- 字段置信度。
- 截图哈希。
- 触发类型。
- 游戏窗口与分辨率信息。

后续如果异常复盘确实需要截图，再增加受控的截图上传、保留时长和清理策略。

### 性能优先

本地助手平时不做全屏持续 OCR。

流程：

```text
低频局部截图
-> 模板匹配“强化成功”
-> 必要时 OCR 二次确认
-> 等待详情页出现
-> 裁剪详情页目标区域
-> OCR 识别完整声骸状态
```

OCR 模块使用 Provider 抽象。第一版优先评估性能与中文识别稳定性，默认方向为 PaddleOCR 或其他高性能本地 OCR 引擎；Windows OCR 可作为备选 Provider。

## 目标系统拓扑

```text
WuwaFrontend
  -> 浏览器访问 Django API
  -> 用户管理游戏账号
  -> 手动录入声骸
  -> 查看统计、预测、自动采集摘要、异常复盘

Wuwa Django
  -> 认证与用户数据隔离
  -> GameAccount 管理
  -> EchoRecord / SubstatRoll 正式数据
  -> RecognitionSession / RecognitionSnapshot 原始识别日志
  -> 自动识别标准化、匹配、入库、撤销

WuwaAssistant WPF
  -> 系统账号登录，保存 session/cookie
  -> 用户选择当前 GameAccount
  -> 检测鸣潮窗口和强化成功
  -> OCR 识别详情页完整状态
  -> 上传识别快照
  -> 展示本地轻提示
```

## 后端模型架构

### GameAccount

新增游戏账号模型，表示一个系统用户绑定的鸣潮 UID。

建议字段：

- `user`
- `uid`
- `server`
- `nickname`
- `is_default`
- `created_at`
- `updated_at`

约束：

- `user + uid + server` 唯一。
- `server` 第一版可为空，但字段应预留。
- 每个用户最多一个默认游戏账号。

数据归属：

- `EchoRecord` 增加 `game_account` 外键。
- 统计、预测、历史列表默认按 `game_account` 过滤。
- `RecognitionSession` 和 `RecognitionSnapshot` 必须绑定 `game_account`。

### EchoRecord 调整

现有 `EchoRecord` 保留 `user` 字段，同时新增 `game_account`。

原因：

- `user` 便于继续做所有权校验。
- `game_account` 负责多 UID 数据隔离。
- 实施迁移时更稳，不需要一次性重写所有用户过滤逻辑。

新规则：

- 创建声骸时必须提供 `game_account_id`。
- 后端必须校验该 `game_account` 属于 `request.user`。
- 同一 `game_account` 下 `echo_uid` 唯一。
- 不同 `game_account` 可以有相同 `echo_uid`。

约束调整：

```text
原约束：user + echo_uid 唯一
新约束：game_account + echo_uid 唯一
```

### SubstatRoll

`SubstatRoll` 不需要直接增加 `game_account`，它通过 `echo.game_account` 间接归属。

所有查询统计时应从 `EchoRecord` 过滤到对应 `game_account`，再聚合 `SubstatRoll`。

### RecognitionSession

表示一次本地助手采集会话。

建议字段：

- `user`
- `game_account`
- `client_name`
- `client_version`
- `game_window_title`
- `screen_resolution`
- `started_at`
- `ended_at`
- `status`
- `snapshot_count`
- `saved_roll_count`
- `created_echo_count`
- `updated_echo_count`
- `conflict_count`
- `last_snapshot_at`

状态：

- `active`
- `ended`
- `expired`

### RecognitionSnapshot

表示一次识别快照。一次快照可能创建新声骸、补录多条副词条，也可能进入异常。

建议字段：

- `session`
- `user`
- `game_account`
- `trigger_type`
- `popup_delta_raw`
- `detail_snapshot_raw`
- `normalized_snapshot`
- `field_confidence`
- `popup_screenshot_hash`
- `detail_screenshot_hash`
- `match_status`
- `status`
- `matched_echo`
- `created_echo`
- `created_roll_ids`
- `created_roll_count`
- `warnings`
- `error_code`
- `created_at`
- `applied_at`
- `reverted_at`

`created_roll_ids` 可先用 JSON 字段保存，方便撤销最近一次 snapshot 带来的所有变更。

状态：

- `saved`
- `ignored_duplicate`
- `conflict`
- `rejected`
- `reverted`

匹配状态：

- `exact`
- `probable`
- `time_order`
- `created`
- `conflict`

## 数据迁移策略

迁移步骤：

1. 新增 `GameAccount`。
2. 为每个已有用户创建一个默认 `GameAccount`。
3. 现有前端本地存储的 UID 无法由后端自动读取，因此后端先使用临时默认 UID，例如 `default`。
4. 用户进入网页后可编辑默认游戏账号 UID、server、nickname。
5. 给 `EchoRecord` 增加可空 `game_account` 字段。
6. 数据迁移将旧声骸挂到该用户默认 `GameAccount`。
7. 确认迁移完成后，将 `EchoRecord.game_account` 改为必填。
8. 将唯一约束从 `user + echo_uid` 调整为 `game_account + echo_uid`。

前端原本保存在 localStorage 的 `wuwa-player-uid` 只作为迁移提示，不再作为数据归属来源。

## 后端服务层架构

建议新增服务模块：

```text
api/services/game_accounts.py
api/services/recognition.py
api/services/recognition_matching.py
api/services/recognition_normalization.py
```

### game_accounts.py

职责：

- 创建游戏账号。
- 更新游戏账号。
- 设置默认游戏账号。
- 校验 `game_account` 属于当前用户。
- 提供当前用户可用游戏账号列表。

### recognition_normalization.py

职责：

- 将 OCR 原文标准化为系统字段。
- 将中文词条名映射到 `SUBSTAT_TYPES`。
- 将主词条映射到系统内部 key。
- 将 OCR 数值吸附到 `TIER_TABLES` 合法档位。
- 输出字段置信度和警告。

该模块不访问数据库。

### recognition_matching.py

职责：

- 根据标准化 snapshot 匹配 `EchoRecord`。
- 检查已有副词条序列是否是当前快照前缀。
- 区分 `exact`、`probable`、`time_order`、`created`、`conflict`。
- 计算需要补录的 `SubstatRoll`。

该模块可以访问数据库，但不直接保存正式数据。

### recognition.py

职责：

- 接收 API 提交的识别快照。
- 创建 `RecognitionSnapshot` 日志。
- 调用标准化和匹配服务。
- 在事务中创建或更新正式声骸数据。
- 保存 created roll ids。
- 处理幂等和重复截图。
- 实现撤销 snapshot。

正式入库必须放在数据库事务中。

## API 架构

### 认证与当前用户

沿用现有认证体系：

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/me/`

本地助手调用同一登录接口，并保存 session/cookie。

### 游戏账号 API

新增：

- `GET /api/game-accounts/`
  - 返回当前用户绑定的游戏账号。

- `POST /api/game-accounts/`
  - 创建游戏账号。

- `PATCH /api/game-accounts/{id}/`
  - 更新 UID、server、nickname、默认状态。

- `POST /api/game-accounts/{id}/select/`
  - 可选接口，用于网页或助手记录当前选择。

是否持久保存“当前选择”可以在客户端完成；后端 API 不应依赖隐式当前选择，关键写入接口必须显式传 `game_account_id`。

### 声骸 API 调整

现有接口需要支持 `game_account_id`：

- `GET /api/echoes/?game_account_id=...`
- `POST /api/echoes/`
- `GET /api/echoes/{id}/`
- `PATCH /api/echoes/{id}/`
- `POST /api/echoes/{id}/substats/`
- `GET /api/echoes/{id}/prediction/`
- `GET /api/stats/?game_account_id=...`
- `GET /api/model-evaluation/?game_account_id=...`

规则：

- 列表和统计接口必须明确游戏账号。
- 如果用户只有一个游戏账号，可由前端自动选择。
- 如果用户有多个游戏账号，前端必须让用户选择后再查询。
- 后端必须校验声骸所属 `game_account` 与当前用户一致。

### 自动识别 API

新增：

- `POST /api/recognition/sessions/`
- `GET /api/recognition/sessions/?game_account_id=...`
- `GET /api/recognition/sessions/{id}/`
- `POST /api/recognition/snapshots/`
- `GET /api/recognition/conflicts/?game_account_id=...`
- `POST /api/recognition/snapshots/{id}/revert/`
- `POST /api/recognition/snapshots/{id}/reject/`
- `POST /api/recognition/snapshots/{id}/apply/`

第一版必须实现：

- 创建识别会话。
- 提交识别快照。
- 查看最近会话摘要。
- 查看异常列表。
- 撤销最近一次自动入库。

异常修正后应用可以放到第二阶段。

## 识别快照请求契约

本地助手提交结构建议：

```json
{
  "session_id": 1,
  "game_account_id": 10,
  "trigger_type": "enhance_success",
  "client_event_id": "local-guid-or-hash",
  "captured_at": "2026-06-05T15:40:00+08:00",
  "game_window": {
    "title": "Wuthering Waves",
    "client_rect": {
      "width": 1920,
      "height": 1080
    }
  },
  "hashes": {
    "popup": "sha256...",
    "detail": "sha256..."
  },
  "popup_delta_raw": {
    "text": "暴击率 6.3%\\n攻击 40",
    "substats": [
      {
        "label_text": "暴击率",
        "value_text": "6.3%",
        "confidence": 0.94
      }
    ]
  },
  "detail_snapshot_raw": {
    "name_text": "角",
    "sonata_text": "彻空冥雷",
    "cost_text": "4",
    "level_text": "25",
    "main_stat_text": "暴击率",
    "substats": [
      {
        "position": 1,
        "label_text": "暴击率",
        "value_text": "6.3%",
        "confidence": 0.94
      }
    ]
  },
  "client_confidence": {
    "trigger": 0.98,
    "detail_page": 0.93
  }
}
```

后端返回结构建议：

```json
{
  "snapshot_id": 100,
  "status": "saved",
  "match_status": "exact",
  "echo": {
    "id": 20,
    "echo_uid": "auto-..."
  },
  "created_roll_count": 2,
  "created_rolls": [
    {
      "position": 3,
      "substat_type": "crit_damage",
      "tier_value": 15.0
    }
  ],
  "warnings": []
}
```

## 幂等与去重

后端必须保证同一个识别快照重复提交不会重复入库。

去重依据：

- `session + client_event_id`。
- `game_account + detail_screenshot_hash`。
- 同一声骸同一完整副词条序列。
- 同一 `RecognitionSnapshot` 的 `created_roll_ids` 不重复应用。

策略：

- 收到重复 `client_event_id` 时返回原处理结果。
- 收到重复截图哈希且正式数据已存在时，标记 `ignored_duplicate`。
- 补录前再次检查 `echo + position` 和 `echo + substat_type` 唯一约束。

## 自动入库规则

允许自动入库必须同时满足：

- `game_account` 属于当前登录用户。
- 详情页基础字段完整。
- COST 与主词条合法。
- 副词条类型合法。
- 副词条数值在对应合法档位中。
- 同一 snapshot 中无重复副词条。
- 已有声骸副词条序列是当前 snapshot 的前缀，或允许创建新声骸。
- 没有唯一约束冲突。

匹配状态处理：

- `exact`：自动入库。
- `created`：自动创建声骸并入库。
- `probable`：允许自动入库，但保留警告。
- `time_order`：允许自动入库，但保留警告。
- `conflict`：不入库，进入异常。

## 撤销策略

撤销最近一次自动入库时，撤销该 `RecognitionSnapshot` 带来的所有变更。

规则：

- 删除 `created_roll_ids` 中仍然存在的 `SubstatRoll`。
- 如果该 snapshot 创建了新 `EchoRecord`，且该声骸没有其他非本 snapshot 的副词条，则可删除或归档该声骸。
- 将 snapshot 状态标记为 `reverted`。
- 重新计算声骸状态和 `last_tuned_at`。
- 撤销操作必须校验 snapshot 属于当前用户和当前 game account。

第一版快捷键 `Ctrl+Alt+U` 调用最近一条可撤销 snapshot 的 revert API。

## 本地助手模块架构

WPF 助手建议模块：

```text
WuwaAssistant
  Auth
  GameAccounts
  WindowCapture
  TriggerDetection
  Ocr
  RecognitionPipeline
  ApiClient
  LocalState
  Tray
  Hotkeys
  Notifications
  Diagnostics
```

### Auth

职责：

- 系统账号密码登录。
- 保存 session/cookie。
- 检查登录状态。
- session 失效后提示重新登录。

### GameAccounts

职责：

- 拉取当前用户绑定的游戏账号。
- 选择当前游戏账号。
- 没有游戏账号时提示用户先绑定。
- 上传识别快照时提供 `game_account_id`。

### WindowCapture

职责：

- 查找鸣潮窗口。
- 获取窗口区域。
- 捕获局部截图。
- 适配窗口化和无边框窗口化。
- 第一版不承诺独占全屏稳定支持。

### TriggerDetection

职责：

- 低频检测“强化成功”局部区域。
- 使用模板匹配优先。
- 必要时调用 OCR 确认。
- 使用冷却时间和截图哈希避免重复触发。

### Ocr

职责：

- 提供 OCR Provider 接口。
- 对裁剪区域执行 OCR。
- 输出文本、位置和置信度。
- 不直接判断是否入库。

### RecognitionPipeline

职责：

- 串联强化成功检测、弹窗 delta 捕获、详情页等待、完整 snapshot 识别。
- 生成后端请求 payload。
- 处理后端响应。

### ApiClient

职责：

- 调用 Django API。
- 管理 CSRF/session/cookie。
- 处理网络错误和后端错误。

### LocalState

职责：

- 保存本地配置。
- 保存 session/cookie。
- 保存当前 `game_account_id`。
- 保存最近一次 snapshot id。

### Tray / Hotkeys / Notifications

职责：

- 托盘菜单。
- 全局快捷键。
- 轻量本地提示。
- 后续悬浮窗可从 Notifications 扩展。

## 前端架构调整

前端需要从“本地 UID 状态”迁移到“后端 GameAccount 状态”。

建议新增前端服务：

```text
src/services/gameAccounts.js
src/services/recognition.js
```

建议拆分现有大组件：

```text
src/components/GameAccountSwitcher.vue
src/components/RecognitionSessionSummary.vue
src/components/RecognitionConflictList.vue
```

第一版前端职责：

- 注册、登录、退出。
- 管理游戏账号。
- 选择当前游戏账号。
- 所有声骸列表、统计、预测请求带 `game_account_id`。
- 显示最近自动采集摘要。
- 显示异常识别列表。

## 配置

### 后端配置

建议新增配置：

- `RECOGNITION_AUTO_SAVE_ENABLED`
- `RECOGNITION_MIN_FIELD_CONFIDENCE`
- `RECOGNITION_DUPLICATE_WINDOW_SECONDS`
- `RECOGNITION_ALLOW_TIME_ORDER_AUTOSAVE`

第一版可使用默认值，后续再做管理员配置。

### 本地助手配置

本地助手本地配置：

- 后端地址。
- 当前 game account id。
- 是否开机启动。
- 是否启用自动检测。
- 检测频率。
- OCR Provider。
- 快捷键配置。
- 是否显示轻提示。

## 安全与隐私

- 系统账号密码只用于登录，不保存明文密码。
- 本地助手保存 session/cookie。
- 游戏 UID 不作为认证凭证。
- 所有后端接口必须校验 `game_account.user == request.user`。
- 第一版不上传完整截图。
- 识别日志按用户和游戏账号隔离。
- 本地助手不读游戏内存，不注入游戏进程，不修改游戏文件。

## 测试策略

### 后端单元测试

- 用户可创建多个 GameAccount。
- 不同用户可以绑定相同 UID。
- 同一用户不能重复绑定相同 UID 和 server。
- EchoRecord 必须归属到 GameAccount。
- 用户不能访问其他用户的 GameAccount、EchoRecord、RecognitionSnapshot。
- 旧数据迁移到默认 GameAccount。
- 识别快照创建新声骸。
- 识别快照补录已有声骸缺失副词条。
- 非前缀匹配进入 conflict。
- 重复 client_event_id 不重复入库。
- revert 撤销 snapshot 创建的所有 rolls。

### 前端测试

- 登录后加载游戏账号列表。
- 没有游戏账号时提示绑定。
- 多游戏账号时所有列表和统计请求带当前 game account。
- 切换 game account 后刷新工作台、统计和预测。
- 异常列表只显示当前 game account 的记录。

### 本地助手集成测试

本地助手仓库后续需要覆盖：

- session/cookie 登录复用。
- 当前 game account 选择。
- 强化成功重复触发去重。
- 漏检后手动重新识别。
- 后端 401 后重新登录。
- 网络失败后的重试和本地提示。

## 实施顺序建议

架构上推荐分阶段落地：

1. 后端账号与 GameAccount 数据归属。
2. 前端 GameAccount 管理和请求过滤。
3. 后端 RecognitionSession / RecognitionSnapshot 模型。
4. 后端识别标准化、匹配、自动入库和撤销服务。
5. 自动识别 API。
6. 前端自动采集摘要和异常列表。
7. 单独仓库实现 WPF 本地助手 MVP。
8. 本地助手联调强化成功触发和完整详情页识别。

这样可以先把数据边界打牢，再接入 OCR。

## 开放问题

以下问题可以留到实施计划或本地助手仓库阶段：

- PaddleOCR 与 Windows OCR 的原型准确率和性能对比。
- 常见分辨率下“强化成功”模板区域的裁剪参数。
- 详情页各字段的相对坐标和 UI 缩放适配。
- 本地助手 session/cookie 的具体安全存储方式。
- `time_order` 自动入库是否需要在低样本阶段默认关闭。
- 异常复盘是否需要启用截图上传。

## 成功标准

架构完成后，后续实现应满足：

- 系统账号和游戏 UID 概念清晰分离。
- 一个用户可以稳定管理多个游戏账号。
- 手动录入和自动识别不会把不同 UID 的数据混在一起。
- 本地助手可用系统账号登录并选择当前游戏账号。
- 识别快照可幂等提交。
- 自动入库可撤销。
- 异常识别不参与统计和预测。
- 后续 WPF 助手仓库可以按本文件 API 契约独立开发。
