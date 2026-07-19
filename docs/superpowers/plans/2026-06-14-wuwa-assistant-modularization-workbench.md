# Milestone 8: 本地助手模块化与离线识别工作台执行方案

## 目标

Milestone 7 已经完成本地助手最小闭环：WPF 可以配置后端地址、登录系统账号、读取 GameAccount、创建识别会话、提交固定样例快照，并回滚最近快照。

Milestone 8 的目标是把本地助手从“单页联调面板”升级为“精简、后台友好、可持续扩展的本地识别工具”。本阶段必须先把工程边界、UI 结构、后台性能策略、本地离线 OCR 策略和持久化规则定清楚，再继续实现窗口检测、截图、OCR 和后台识别。

最终形态应是一个紧凑型窗口模式工具：

- 不做全屏大型软件。
- 默认以小窗口运行，平时可放后台。
- 登录/注册放在独立小窗口中完成，游戏 UID 选择和初始化进入主窗口首页处理。
- 主功能窗口左侧只放真正的助手功能 tab。
- 右侧展示当前功能的核心操作。
- 后台监听低占用，真正需要时才截图和 OCR。
- 本地 OCR 离线完成，不上传完整截图。
- 重要业务数据写入后端和数据库。

## 既有文档参考关系

正式执行 Milestone 8 时，应按以下优先级使用旧设计文档。

### 必须遵守的契约文档

- `docs/superpowers/plans/2026-06-07-wuwa-api-contract.md`
  - 作为 WPF 与后端通信的主要 API 契约。
  - 登录、GameAccount、RecognitionSession、RecognitionSnapshot、revert 流程都以该文档和当前后端实现为准。
  - Milestone 8 默认不改变 API 契约；如必须改动，先确认。

- `docs/superpowers/plans/2026-06-07-wuwa-database-schema.md`
  - 作为数据归属和持久化边界的主要参考。
  - `GameAccount`、`RecognitionSession`、`RecognitionSnapshot`、`EchoRecord`、`SubstatRoll` 的关系以该文档和当前 models 为准。
  - Milestone 8 默认不改数据库结构；如必须改动，先确认。

- `docs/superpowers/plans/2026-06-07-wuwa-auto-echo-recognition-mvp.md`
  - 作为 Milestone 1-7 完成范围和 Milestone 7 WPF MVP 行为的验收基线。
  - Phase 8.1 必须保持 Milestone 7 的登录、读取 GameAccount、创建 session、提交样例、回滚能力不回退。

### 仍有高参考价值的设计文档

- `docs/superpowers/plans/2026-06-05-wuwa-auto-echo-recognition-architecture.md`
  - 本地助手模块架构、API 边界、OCR 与截图策略、幂等去重、撤销策略、安全隐私仍然有效。
  - 其中“本地助手工程不放在当前仓库”的描述已经被当前现实替代：现在仓库内已有 `WuwaAssistant/` 工程，因此只参考模块边界，不照搬仓库边界。
  - 其中 OCR Provider 可评估 PaddleOCR / Windows OCR 的开放问题仍有效，但本阶段已明确必须走本地离线 OCR，具体引擎选择需要另行确认。

- `docs/superpowers/plans/2026-06-05-wuwa-auto-echo-recognition-design.md`
  - 产品原则仍有效：完整状态优先、不打断游戏流程、数据质量优先、不侵入游戏进程。
  - 强化成功检测、OCR 字段校正、声骸身份匹配、错误处理、漏检/重复触发/顺序交错处理仍是后续识别 pipeline 的重要参考。
  - 悬浮窗路线属于后续阶段，不进入 Milestone 8 默认范围。

### 局部参考文档

- `docs/superpowers/specs/2026-06-06-wuwa-database-schema-ai-prompt.md`
  - 这是数据库设计提示文档，适合追溯 GameAccount、RecognitionSnapshot、OCR 字段预留的设计动机。
  - 不作为最终契约；最终仍以 `2026-06-07-wuwa-database-schema.md` 和当前代码为准。

- `docs/superpowers/specs/2026-05-18-wuwa-echo-substat-predictor-design.md`
  - 副词条池、档位概率表、预测/统计理念仍有业务参考价值。
  - 登录方式、SQLite、无 OCR 范围等早期假设已过时。

- `docs/superpowers/plans/2026-05-18-wuwa-echo-substat-predictor.md`
  - 作为早期实现计划，仅用于理解现有前端和预测系统来源。
  - 不作为 Milestone 8 执行计划。

### 当前执行准则

如旧文档之间出现冲突，按以下优先级决策：

1. 当前用户明确要求。
2. 当前代码和已验证的 Milestone 7 行为。
3. `2026-06-14-wuwa-assistant-modularization-workbench.md`。
4. `2026-06-07-wuwa-api-contract.md` 和 `2026-06-07-wuwa-database-schema.md`。
5. 6 月 5 日自动识别产品/架构设计。
6. 5 月早期预测系统设计。

## 必须遵守的开发规则

### 1. 项目文件必须规范整理

不同功能必须放到不同文件夹管理，不能继续把逻辑堆到 `MainWindow.xaml.cs` 或少数大文件里。

建议目录：

```text
WuwaAssistant/
  WuwaAssistant/
    App.xaml
    MainWindow.xaml
    MainWindow.xaml.cs
    Views/
      ConnectionPage.xaml
      GameAccountPage.xaml
      RecognitionPage.xaml
      CaptureOcrPage.xaml
      DiagnosticsPage.xaml
      SettingsPage.xaml
    ViewModels/
      ShellViewModel.cs
      ConnectionViewModel.cs
      GameAccountViewModel.cs
      RecognitionViewModel.cs
      CaptureOcrViewModel.cs
      DiagnosticsViewModel.cs
      SettingsViewModel.cs
    Styles/
      Colors.xaml
      Controls.xaml
      Layout.xaml

  WuwaAssistant.Core/
    Auth/
    Connection/
    GameAccounts/
    Recognition/
    Capture/
    Ocr/
    Diagnostics/
    Settings/
    Storage/
    Api/

  WuwaAssistant.Tests/
    Auth/
    GameAccounts/
    Recognition/
    Capture/
    Ocr/
    Diagnostics/
    Settings/
```

规则：

- UI 文件只负责布局和绑定。
- ViewModel 只负责页面状态和命令编排。
- Core 模块负责业务逻辑，必须能脱离 WPF 单独测试。
- Windows API、截图、OCR 引擎、文件存储等外部能力放在明确模块里。
- 每个文件职责单一，避免出现新的超大文件。

### 2. 不确定的问题必须确认

遇到以下问题不能自行猜测，必须先向用户确认：

- OCR 引擎选择影响安装体积、性能或授权。
- 是否保存某类本地文件或截图。
- 是否上传任何非结构化截图数据。
- 是否改变后端 API 契约。
- 是否改变数据库结构。
- 是否引入新的第三方依赖。
- 是否调整 UI 主流程或导航结构。
- 是否删除、迁移、覆盖已有用户数据。

默认原则：

- 不上传完整截图。
- 不保存明文密码。
- 不读游戏内存，不注入游戏进程，不修改游戏文件。
- 不破坏 Milestone 7 已跑通链路。

### 3. 后台运行必须低占用

本地助手大部分时间在后台，必须采用低功耗策略。

推荐运行模型：

```text
空闲
  -> 低频窗口检测
  -> 找到游戏窗口且用户开启自动识别
  -> 低频局部触发检测
  -> 疑似强化成功
  -> 提升短时间检测频率
  -> 等待详情页
  -> 局部截图
  -> 本地 OCR
  -> 构建结构化快照
  -> 提交后端
  -> 冷却
  -> 回到低频监听
```

性能规则：

- 不做全屏持续 OCR。
- 不持续高频截图。
- 空闲状态只做低频窗口检测，例如 1-2 秒一次。
- 只有进入疑似触发窗口后才短时间提高检测频率。
- OCR 只在疑似触发或用户手动识别时执行。
- 后台循环必须可启动、停止、恢复。
- 后台错误不能导致 UI 卡死或进程崩溃。

建议状态：

- `Stopped`
- `Idle`
- `WatchingWindow`
- `TriggerCandidate`
- `WaitingDetailPage`
- `Capturing`
- `OcrRunning`
- `Submitting`
- `Cooldown`
- `Error`

验收标准：

- 未开启自动识别时没有持续 OCR。
- 未找到游戏窗口时不会反复高频占用 CPU。
- 后端不可达、截图失败、OCR 失败都进入可恢复错误状态。
- 用户能在 UI 上看到当前后台状态。

### 4. OCR 必须本地离线且尽可能快

OCR 路线已确定为本地离线 OCR。

规则：

- 截图不上传后端或云端。
- OCR Provider 必须能本地离线运行。
- 后端只接收结构化识别结果、置信度、截图 hash 和识别日志。
- OCR 引擎选择前如果涉及安装体积、性能、授权或模型文件，必须确认。

加速方案：

- 局部裁剪：只识别强化弹窗区域、详情页字段区域，不扫整屏。
- 截图 hash 缓存：同一张截图不重复 OCR。
- 结果缓存：相同 `detail_screenshot_hash` 可复用最近识别结果。
- 分阶段识别：先识别触发区域，再识别详情页完整字段。
- 按需加载 OCR：空闲时不启动重型 OCR 引擎；必要时加载，长时间空闲后可释放。
- Fake Provider 先行：先用 fake OCR 跑通完整 pipeline，再接真实 OCR。

验收标准：

- fake OCR 能生成合法 snapshot payload。
- 相同截图不会重复执行 OCR。
- OCR 低置信度或字段缺失时不自动写入正式样本。
- UI 能显示 OCR 耗时、字段置信度、截图 hash。
- OCR 模块可以脱离 WPF 单独测试。

### 5. 本地助手必须绑定后端和数据库

重要业务数据必须持久化到后端数据库，不允许只保存在本机。

后端/数据库保存：

- 系统账号。
- GameAccount。
- RecognitionSession。
- RecognitionSnapshot。
- 自动识别状态、冲突、回滚记录。
- 自动写入的 EchoRecord。
- 自动写入的 SubstatRoll。

本地保存：

- 后端地址。
- 当前选择的 GameAccount id。
- session/cookie。
- OCR Provider 设置。
- 自动识别开关。
- 检测频率。
- 最近一次 snapshot id。
- 最近诊断日志。

规则：

- 会影响统计、预测、历史追踪的数据必须进后端数据库。
- 只影响本机体验的设置可以保存在本地。
- 每次自动写入必须关联 `RecognitionSnapshot`。
- 每次自动写入必须可回滚。
- 所有后端请求必须显式携带或绑定当前 GameAccount。

## UI 设计方向

### 形态

本地助手不设计成大块全屏软件，采用“登录小窗口 + 紧凑型主窗口”模式。

推荐窗口尺寸：

- 登录窗口：约 `430x420`，只负责系统账号登录/注册，成功后直接进入主窗口。
- 默认窗口：`960x680` 或 `1000x700`。
- 最小窗口：不小于 `820x560`。
- 支持拉伸，但不以大屏为主要设计目标。
- 不主动进入全屏。
- 关闭窗口时后续可扩展为最小化到后台或托盘。

### 布局

登录/注册、后端连接不进入主窗口左侧 tab。GameAccount/UID 属于助手业务状态，登录成功后在主窗口首页展示和初始化。

启动流程：

```text
启动助手
  -> 登录/注册小窗口
  -> 登录成功后读取系统账号下的 GameAccount/UID
  -> 优先使用 is_default=true 且已绑定 UID 的 GameAccount
  -> 如果默认账号未绑定 UID，则使用第一个已绑定 UID
  -> 如果没有任何已绑定 UID，则进入主窗口首页并提示初始化 UID
  -> 进入主功能窗口首页
```

主窗口采用左侧 tab 导航 + 右侧内容区。

```text
┌────────────────────────────────────────┐
│ Wuwa Assistant    用户 / UID / 状态     │
├──────────────┬─────────────────────────┤
│ 首页          │ 当前页面内容             │
│ 识别          │ 当前页面内容             │
│ 截图/OCR      │                         │
│ 日志          │                         │
│ 设置          │                         │
└──────────────┴─────────────────────────┘
```

主窗口左侧 tab：

- 首页
- 识别
- 截图/OCR
- 日志
- 设置

顶部状态区：

- 后端连接状态。
- 当前登录用户。
- 当前 GameAccount/UID。
- 自动识别状态。

后端地址不面向普通用户显示。第一阶段使用默认本地后端地址；后续如果需要配置，也应放在隐藏的高级设置或开发配置中，不进入主流程。

### 响应式要求

WPF UI 必须动态响应式，不能靠固定坐标硬堆。

规则：

- 使用 `Grid`、`DockPanel`、`ScrollViewer`、自适应列宽和最小宽度约束。
- 窄窗口下内容可以滚动、折叠或换行，不能互相遮挡。
- 高 DPI、字体缩放、多显示器下不能出现明显截断。
- 核心按钮位置稳定：登录、启动/停止识别、手动识别、回滚、导出日志。
- `1280x720` 下不应出现横向滚动。
- `900x620` 附近核心操作仍可用。
- `125%/150%` DPI 缩放下按钮文字和状态标签不截断。

### 视觉风格

WPF 助手应和现有 Vue 前端保持同一产品气质。

参考方向：

- 清爽工具型界面。
- 浅色背景为主。
- 统一主色：接近现有前端蓝色主色。
- 辅助状态色：绿色表示成功，红色表示错误，黄色表示警告。
- 明确分区，但不要堆太多大卡片。
- 克制阴影和边框。
- 信息密度适中，适合快速扫描。
- 不做营销式 hero，不做装饰性大背景。

## 核心模块设计

### Connection/Auth

职责：

- 管理后端地址。
- 登录系统账号。
- 保存和加载 session/cookie。
- 检查连接健康状态。
- 处理 401/403、CSRF、网络超时、后端不可达。

建议文件：

- `ConnectionSettings`
- `SessionStore`
- `AuthService`
- `ConnectionHealthService`

验收：

- 登录成功后可复用 session。
- session 失效后提示重新登录。
- 后端不可达和账号密码错误有不同提示。
- 日志不记录明文密码和完整 cookie。

### GameAccounts

职责：

- 拉取 GameAccount 列表。
- 选择当前 GameAccount。
- 持久化最近选择。
- 检查 UID 绑定状态。
- 无 UID 时阻止识别。

建议文件：

- `GameAccountService`
- `SelectedGameAccountStore`
- `GameAccountState`

验收：

- 登录后自动加载账号。
- 最近选择重启后可恢复。
- locked GameAccount 下识别按钮不可用。
- 所有识别请求使用当前 GameAccount。

### Recognition

职责：

- 管理 recognition session。
- 管理后台识别状态。
- 串联窗口检测、截图、OCR、payload 构建、后端提交。
- 支持手动识别和回滚最近 snapshot。
- 处理冷却、重复触发、错误恢复。

建议文件：

- `RecognitionController`
- `RecognitionSessionService`
- `RecognitionPipeline`
- `RecognitionRunState`
- `RecognitionRetryPolicy`

验收：

- fake pipeline 可完整提交和回滚。
- pipeline 不依赖 WPF UI。
- 后台状态清楚可见。
- 重复截图不会重复提交。

### Capture

职责：

- 查找游戏窗口。
- 获取窗口标题、客户区、DPI、分辨率。
- 捕获局部截图。
- 计算截图 hash。
- 给 OCR 提供裁剪区域。

建议文件：

- `GameWindowFinder`
- `WindowCaptureService`
- `CaptureRegionProvider`
- `ScreenshotHasher`
- `CaptureFrame`

验收：

- 未找到窗口时状态明确。
- 找到窗口后显示窗口信息。
- 捕获失败不崩溃。
- 相同截图 hash 稳定。

### Ocr

职责：

- 提供本地离线 OCR Provider 接口。
- 执行局部 OCR。
- 输出文本、位置、置信度、耗时。
- 将 OCR 结果解析成后端 raw/normalized payload。

建议文件：

- `IOcrProvider`
- `FakeOcrProvider`
- `OcrResult`
- `EchoDetailParser`
- `SnapshotPayloadBuilder`
- `OcrResultCache`

验收：

- fake OCR 可测试。
- 缓存命中时不重复 OCR。
- 低置信度不自动提交。
- payload 包含 raw、normalized、confidence、hash。

### Diagnostics

职责：

- 记录 UI 操作。
- 记录后台状态转换。
- 记录 API 请求摘要。
- 记录截图/OCR耗时。
- 提供导出日志。
- 脱敏敏感信息。

建议文件：

- `DiagnosticsLog`
- `DiagnosticsEvent`
- `SensitiveValueRedactor`
- `DiagnosticsExporter`

验收：

- 不记录密码。
- 不记录完整 cookie。
- 用户能从日志看出为什么没有识别或提交。
- 日志可导出。

### Settings/Storage

职责：

- 保存本地设置。
- 管理默认值。
- 管理设置迁移。
- 保存当前 GameAccount、OCR Provider、检测频率、自动识别开关。

建议文件：

- `AssistantSettingsStore`
- `LocalStateStore`
- `SettingsDefaults`
- `SettingsMigration`

验收：

- 重启后设置恢复。
- 配置损坏时回退默认值。
- 重要设置变更写入日志。

## 页面规划

### 登录窗口

内容：

- 用户名/密码登录。
- 注册。
- 登录/注册状态提示。

验收：

- 登录失败原因明确。
- 后端不可达原因明确。
- 后端地址不显示给普通用户。
- 登录成功后自动加载 GameAccount 并进入主窗口。

### 首页

内容：

- 当前系统账号。
- 当前 GameAccount/UID 状态。
- 当前识别状态。
- 无 UID 时在首页初始化 UID。

验收：

- 优先使用 `is_default=true` 且已绑定 UID 的 GameAccount。
- 默认账号未绑定时可回退到第一个已绑定 UID。
- 没有已绑定 UID 时仍进入首页。
- 首页初始化 UID 后刷新状态并启用识别。
- locked 状态阻止识别。

### 识别页

内容：

- 自动识别开关。
- 当前后台状态。
- 当前 recognition session。
- 手动识别当前详情页。
- 最近 snapshot 结果。
- 回滚最近 snapshot。

验收：

- 用户可启动/停止后台识别。
- 用户可手动触发一次识别。
- 最近写入可回滚。
- 状态变化清楚可见。

### 截图/OCR 页

内容：

- 游戏窗口检测状态。
- 窗口标题、尺寸、DPI。
- 最近截图 hash。
- OCR 原文。
- OCR 字段解析结果。
- OCR 耗时。

验收：

- 未找到窗口、截图失败、OCR 失败都可见。
- fake OCR 和真实 OCR 都走同一页面。

### 日志页

内容：

- 诊断日志。
- 后台状态事件。
- API 请求摘要。
- OCR 耗时和错误。
- 导出日志。

验收：

- 无需调试器即可排查主要问题。
- 日志脱敏。

### 设置页

内容：

- 后端地址默认值。
- 自动识别开关。
- 检测频率。
- OCR Provider。
- 快捷键。
- 通知设置。
- session 保存策略。

验收：

- 设置持久化。
- 实验性选项有明确标记。

## 实施阶段

### Phase 8.1: 工程结构和 Shell

交付：

- 建立 `Views`、`ViewModels`、`Styles`。
- 建立 Core 子模块文件夹。
- 搭建只负责登录/注册的小窗口。
- 搭建包含账号/UID 状态与 UID 初始化入口的首页。
- 搭建只包含助手功能的紧凑型左侧 tab shell。
- 保留 Milestone 7 功能。

验收：

- 登录、注册、加载 GameAccount、初始化 UID、创建 session、提交样例、回滚仍可用。
- `MainWindow.xaml.cs` 不再承载主要业务逻辑。
- UI 默认小窗口模式可用。

### Phase 8.2: 设置和诊断

交付：

- 本地设置持久化。
- 当前 GameAccount 持久化。
- 诊断日志模型。
- 日志脱敏和导出。

验收：

- 重启后恢复后端地址和当前 GameAccount。
- 日志能解释失败原因。
- 不记录敏感信息。

### Phase 8.3: Fake Recognition Pipeline

交付：

- `RecognitionPipeline`。
- `FakeOcrProvider`。
- `SnapshotPayloadBuilder`。
- 手动识别按钮走 pipeline，而不是直接提交固定 sample。

验收：

- fake pipeline 能提交合法快照。
- pipeline 可单元测试。
- UI 显示 pipeline 状态。

### Phase 8.4: 窗口检测和截图 Hash

交付：

- 游戏窗口查找接口。
- Windows 窗口检测实现。
- 截图 hash。
- 截图/OCR 页基础预览。

验收：

- 未启动游戏时状态明确。
- 找到窗口后显示窗口信息。
- 相同截图 hash 稳定。

### Phase 8.5: 本地离线 OCR 原型

交付：

- 本地离线 OCR Provider 接口。
- 本地图片输入调试模式。
- OCR result cache。
- OCR 原文到 payload 的初步 parser。

验收：

- 可从 fake OCR 或本地测试图片生成 payload。
- 缓存命中时不重复识别。
- 字段缺失或低置信度不自动提交。

### Phase 8.6: 后台识别循环

交付：

- 自动识别开关。
- 低频检测循环。
- 短时高频触发窗口。
- 冷却和去重。
- 手动重新识别。
- 最近 snapshot 回滚。

验收：

- 后台识别可启动、停止、恢复。
- 不重复提交相同截图。
- API 失败进入可恢复状态。
- UI 清楚显示当前状态和最近结果。

## 测试计划

单元测试：

- Auth/session/cookie/CSRF。
- GameAccount selection and locked state。
- Settings persistence。
- Diagnostics redaction。
- Snapshot payload builder。
- Recognition fake pipeline。
- Screenshot hash。
- OCR result cache。
- OCR parser。

UI 结构测试：

- 左侧 tab 页面存在。
- 登录窗口存在并只负责登录/注册。
- 首页存在并负责账号/UID 状态与 UID 初始化。
- 核心按钮存在。
- locked GameAccount 禁用识别。
- 状态栏展示账号、UID、连接、识别状态。
- 最小窗口下核心控件仍可访问。

集成测试：

- fake backend 验证 API 请求顺序。
- fake pipeline 提交 snapshot 后可 revert。
- 401 后提示重新登录。
- 后端不可达时设置不丢失。

手动验收：

1. 启动后端。
2. 启动 WPF。
3. 登录系统账号。
4. 自动进入主窗口首页。
5. 如果账号没有已绑定 UID，在首页初始化 UID。
6. 进入识别页。
7. 创建 recognition session。
8. 运行 fake pipeline 提交一次快照。
9. Web 端看到识别数据变化。
10. WPF 回滚最近快照。
11. 停止后端，确认 WPF 显示可理解错误。
12. 调整窗口到最小尺寸，确认核心操作可用。

## 成功标准

Milestone 8 完成时，必须满足：

- 本地助手是紧凑型窗口工具，不是全屏大软件。
- 登录/注册独立于主功能窗口，UID 初始化归属主窗口首页。
- 主窗口左侧 tab 只保留助手功能，清晰分区。
- UI 动态响应式，适配常见窗口尺寸和 DPI。
- 工程文件按功能规范整理。
- 登录、GameAccount、识别、截图、OCR、诊断、设置都有独立模块边界。
- 后台运行默认低占用。
- OCR 是本地离线路线。
- 截图不上传后端。
- 重要业务数据持久化到后端数据库。
- 自动写入可追踪、可去重、可回滚。
- fake pipeline 已跑通，为真实窗口检测和 OCR 接入留好接口。
