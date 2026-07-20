# 全仓文档与设计规范同步记录（2026-07-20）

## 结果

本次工作以 `main` 与 `origin/main` 共同指向的 `27610df0092dba345146a68cb7afc98d49ca40cb` 为审计基线，在 `codex/docs-design-governance-sync` 分支完成。长期规范只吸收了由当前目录、跨模块引用和测试共同证明的 Vue owner 与质量覆盖事实；产品、API、运行配置和视觉方向中的分歧没有被静默改写。

本文只是本次审计与实施证据，不是新的长期规范入口。

## 后续裁决与实施状态

以下裁决形成于初次审计之后，替代本文后续“待确认冲突”中的建议状态；原始冲突记录继续保留，用于说明当时证据和为什么需要裁决。

| 冲突 | 最终裁决 | 当前状态 |
| --- | --- | --- |
| WPF 默认后端端口 | 独立 WPF 客户端统一使用 `127.0.0.1:8001`。 | 已在独立 `Wuwa-Assistant` 仓库完成并通过构建、测试和启动探针；WPF 已从本仓库拆出。 |
| `GameAccount.server` / `nickname` | 两字段保留，不标记废弃；当前作为可选保留字段维持数据库与响应形状，现有写入行为不扩展。 | 长期 API 文档已明确该兼容语义，本次不修改 API、model、serializer 或 service。 |
| 暗色静态表面的渐变与宽阴影 | 暗色主题默认允许低对比度表面渐变和单层宽柔阴影，无需逐项登记为项目例外。 | `DESIGN.md` 与 Web 长期/页面规范已同步；现有暗色 CSS 视觉值不变，仍禁止霓虹发光、高对比装饰渐变和多层阴影。 |
| 结构化与活动 CSS token 命名 | 活动 CSS 迁移到 canonical token；可以证明等值的旧名称只作为兼容别名保留。 | `ink-deep`、`ink`、`steel`、`stone`、`hairline`、`hairline-soft` 的活动引用已分别迁移到 `ink-strong`、`ink-main`、`text-muted`、`decorative-muted`、`border-strong`、`border-soft`；`charcoal` 保留。 |
| `--font-latin` 中的 IBM Plex Sans | 不新增独立字体包；拉丁与数据入口继续由 IBM Plex Sans SC 的配套字形承担。 | 未安装的 `"IBM Plex Sans"` 已从活动 token、有效规范示例和锁定测试移除。 |
| WPF Core 文件落点 | WPF 结构由独立 `Wuwa-Assistant` 仓库继续管理。 | 本次不执行 Core 目录重构，也不修改独立仓库；该项不再属于 Wuwa 仓库的代码 owner。 |

本轮只处理 Web token 等值命名迁移及相关设计文档，不改变最终色值、暗色视觉、字体资源、业务行为、API、数据库或 WPF 代码。

后续实施验证：

- `WuwaFrontend`: `npm test`，退出码 0，346 项通过。
- `WuwaFrontend`: `npm run build`，退出码 0，Vite production build 成功。
- 活动 CSS 扫描未发现六个旧颜色 token 的引用；旧名称只保留在 `tokens.css` 兼容别名和解释性文档中。
- 未安装的 `"IBM Plex Sans"` 候选未出现在活动 token 或有效规范示例中。
- 7 个修改后的 Markdown 文件相对链接均可解析。

## 审计范围与证据

完整核对了仓库入口、产品与架构长期规范、工程与发布规则、API 和数据契约、安全隐私、后台性能、Web/WPF 职责、Web/WPF 设计规范、结构化设计配置、字体专项规格，以及相关的历史实施记录。

实现证据覆盖：

- Django apps、models、services、serializers、views、settings、migrations 和测试；
- Vue features、components、composables、shared、services、styles、`App.vue`、Vite 配置和测试；
- WPF Views、ViewModels、Core、API client、code-behind、项目文件和测试；
- 根启动脚本、依赖清单、当前分支历史和已合并实施记录；
- `DESIGN.md`、`.impeccable/design.json`、CSS 变量、实际字体包和结构化设计测试。

证据优先级遵循 `AGENTS.md` 和长期规范；`docs/archive/`、`docs/superpowers/` 与 `memory/` 只用于证明历史实施和决策背景。

## 发现分类

### 已被实现证明的长期事实

- Web、Django 与 WPF 的产品分工、后端数据库真实来源、`GameAccount` 隔离、本地离线 OCR 方向和截图隐私边界与当前代码入口一致。
- Vue 当前按 `auth`、`evaluation`、`history`、`recognition`、`statistics`、`workspace` 六个 feature owner 组织。
- `src/components/` 已稳定承接跨 feature 的 controls、shell 和 states 等复用 UI。
- `src/shared/sampleExperience.js` 已被统计、评估和工作台摘要共同使用，并由架构测试约束，统一样本数量、成熟度、评估就绪和空指标语义。
- 前端测试已覆盖 API 与账号作用域、认证与 UID、主要 feature 工作流、共享样本语义、复用 UI、无障碍状态、架构边界和视觉契约。
- 旧版完整 IDE Shell、Activity Bar、底部全局 Status Bar 和文件标签式导航没有重新成为产品壳。实现中的 `workspace-sidebar` 与 `evaluation-status-bar` 是页面局部业务布局，不是旧版全局 IDE chrome。
- Web 字体实际加载 IBM Plex Sans SC 的 400 / 500 / 600 / 700 与 IBM Plex Mono 的 500 / 600，保留 `font-synthesis: none`、数据语义入口和 `tabular-nums`。
- 当前 CSS 与结构化配置存在 520、860、980、1179/1180 和 1440 等按职责使用的响应式边界；页面专项断点没有被误提升为单一全局断点。

### 历史实施事实

可恢复注册、百分比差值、评估最高命中提示、样本阶段权重说明和 2026-07-14 视觉基线继续保留在原归档中。它们只在已经成为稳定产品或架构事实时由现有长期规范承接；本次没有重写历史记录。

### 重复、过期或失效内容

- `docs/architecture.md` 的 Vue 结构树遗漏了实际长期存在的 `components/` 和 `shared/`。
- `docs/code-organization-and-style.md` 仍把 `shared/` 写成未来条件目录，但该目录已存在并被跨 feature 稳定使用。
- `docs/engineering-quality.md` 的前端覆盖摘要停留在早期 API、认证、账号和 App 静态结构，未反映当前 feature、架构、无障碍和视觉契约测试。

上述内容已在不改变产品语义的前提下同步。

## 实际修改

- `docs/developer-onboarding.md`：补充稳定跨 feature 纯逻辑的代码落点，并保留页面状态、API 与单页映射的原 owner。
- `docs/architecture.md`：把 `components/`、`shared/` 补入 Vue 当前结构，记录可复用 UI 与 `sampleExperience.js` 的真实职责。
- `docs/code-organization-and-style.md`：把 `shared/` 从条件性未来目录更新为受边界约束的当前 owner，并补入目录树和落点表。
- `docs/engineering-quality.md`：用当前测试覆盖面替换过期摘要，不写入易失效的测试数量。
- `docs/superpowers/plans/2026-07-20-documentation-and-design-governance-sync.md`：记录本次执行计划；它不是长期规范。
- 本文件：记录审计范围、证据、修改、冲突、未修改内容和验证结果。

## 文档覆盖矩阵

| 稳定能力 | 长期参考 | 开发入口 / 操作说明 | 实施与解释证据 | 当前缺口 |
| --- | --- | --- | --- | --- |
| 认证、可恢复注册与 UID 初始化 | `docs/api-and-data-contracts.md`、`docs/security-privacy-and-data-boundaries.md`、`DESIGN.md` | `README.md`、`docs/developer-onboarding.md` | 对应注册与 UI 实施归档、三端测试 | `server` / `nickname` 契约待裁决 |
| Web feature 与共享样本语义 | `docs/architecture.md`、`docs/code-organization-and-style.md`、`DESIGN.md` | `docs/developer-onboarding.md` | `sampleExperience.js`、架构与 feature 测试、相关实施归档 | 无已知文档缺口 |
| Web 视觉系统与字体 | `DESIGN.md`、`.impeccable/design.json`、`docs/web-ui-design-system-v2.md` | 页面专项规范与字体专项规格 | CSS、视觉契约测试、视觉基线归档 | Token 命名、字体候选和暗色表面待裁决 |
| WPF 本地助手与识别链路 | `docs/architecture.md`、`docs/api-and-data-contracts.md`、安全与性能规范 | `README.md`、`docs/developer-onboarding.md`、WPF 页面规范 | WPF fake handler 测试、识别实施归档 | 默认端口和 Core 落点待裁决 |

## 待确认冲突

### 1. 根开发环境与 WPF 默认后端端口

- 长期入口与配置：`README.md`、`docs/developer-onboarding.md`、`start-dev.bat` 和 `WuwaFrontend/vite.config.js` 以 `127.0.0.1:8001` 为默认后端。
- 当前实现：`AssistantSettings.cs`、`LoginWindow.xaml.cs`、`MainWindow.xaml.cs` 和连接 ViewModel 仍以 `127.0.0.1:8000` 为默认或硬编码地址。
- 风险：按根入口启动后，WPF 默认连接不到同一后端；仅把文档改成 8000 会破坏已经统一的根启动器和 Vite 代理。
- 选项 A：在后续代码任务中把 WPF 默认值和测试统一到 8001，并保留可配置入口。
- 选项 B：把根启动器、Web 代理和全部文档改回 8000。
- 建议：选择 A。8001 已由根开发入口和代理共同使用，改动范围更小，也能让三端共享同一默认环境。

### 2. `GameAccount.server` 与 `nickname` 的稳定契约

- 长期规则：`docs/api-and-data-contracts.md` 将 `server`、`nickname` 列为稳定字段，并规定后端数据库是 `GameAccount` 的真实来源。
- 当前实现：Django model 和 migration 仍保留这两个字段，但 serializer 固定返回空字符串，create/update service 不读取或持久化请求中的对应值；Web 当前只以 UID 展示账号。
- 风险：字段形状仍存在，但“稳定字段”究竟代表可持久化业务数据还是兼容占位不清楚；客户端依赖其值时会得到静默丢弃的输入。
- 选项 A：明确将两字段定义为兼容占位并进入受控废弃流程，随后同步 API、model/migration 和跨端 DTO。
- 选项 B：恢复 serializer 与 service 的真实读写，使现有稳定字段契约成立。
- 建议：选择 A。当前产品规则和 UI 已明确以真实 UID 为账号上下文，但删除或废弃仍必须作为 API/数据迁移任务单独批准。

### 3. 暗色静态表面的渐变与宽阴影

- 长期规则：`DESIGN.md` 要求浅色优先、暗色等价、静态表面平坦、阴影只解释结构层级，并禁止装饰渐变和 1px 边框叠加宽柔阴影；`docs/web-ui-design-system-v2.md` 也限制默认面板阴影。
- 当前实现：`controls.css`、`shell.css` 和 `workspace.css` 的暗色静态面板仍包含多处 `linear-gradient(...)` 与 `0 18px 42px` 阴影。2026-07-14 的视觉验收记录又明确保留了当时暗色面板阴影。
- 风险：长期规则与批准渲染基线互相牵制；直接改 CSS 会产生视觉漂移，直接放宽规范会把可能的历史样式升级为长期规则。
- 选项 A：将已批准渲染定义为范围精确的项目例外，列出适用组件和退出条件。
- 选项 B：发起带浅/暗前后截图的视觉迁移，把静态表面收敛到平坦规则。
- 建议：优先 A，以最小范围保存已经批准的视觉基线；若目标是严格执行平坦规则，再单独批准 B。

### 4. 结构化设计 Token 与活动 CSS Token 命名

- 长期规则：`DESIGN.md` 与 `.impeccable/design.json` 使用 `ink-strong`、`ink-main`、`text-muted`、`decorative-muted`、`border-soft`、`surface-root` 等结构化语义。
- 当前实现：`tokens.css` 主要暴露 `ink-deep`、`ink`、`charcoal`、`steel`、`stone`、`hairline` 等现有别名；结构化配置中的组件片段使用另一套变量名和 fallback。
- 风险：颜色值大体可对应，但名称并非同一活动接口。直接批量替换可能造成视觉漂移或遗漏 feature token；直接改结构化规范则会让规范迎合历史命名。
- 选项 A：后续执行零视觉漂移的 canonical-token 映射，先增加标准语义别名，再逐步迁移引用并保留兼容期。
- 选项 B：把 `DESIGN.md` 和结构化配置改为声明现有 CSS 名称是长期 canonical token。
- 建议：选择 A。它符合现有“先保持最终计算值不变”的治理规则，同时避免把遗留命名固化。

### 5. `--font-latin` 中未单独接入的 IBM Plex Sans

- 长期规则：字体专项规格与 Web 设计规范说明首版只加载 IBM Plex Sans SC 和 IBM Plex Mono，并要求活动 token 只列真实接入的字体与必要系统兜底。
- 当前实现与示例：依赖只包含 `@ibm/plex-sans-sc` 和 `@ibm/plex-mono`，但 `--font-latin` 在 CSS、`DESIGN.md` 和页面规范中仍列出未单独安装的 `"IBM Plex Sans"` 候选。
- 风险：实现与示例彼此一致，却违反同一套规范中的“真实接入字体”规则；仅改文档会继续与 CSS 和测试冲突。
- 选项 A：在后续 UI 代码任务中从活动 token、规范示例和锁定测试同时移除 `"IBM Plex Sans"`，保留 IBM Plex Sans SC 与系统兜底。
- 选项 B：显式引入并加载独立 IBM Plex Sans 包，使候选字体成为真实依赖。
- 建议：选择 A。专项规格已经说明拉丁字形由 IBM Plex Sans SC 承担，避免新增字体资源成本。

### 6. WPF Core 的长期 owner 与当前文件落点

- 长期规则：架构和代码组织规范要求 WPF API、认证、识别等核心能力进入 `WuwaAssistant.Core/<Feature>/`；API 文档将 client owner 指向 `WuwaAssistant.Core/Api/`。
- 当前实现：`Api/`、`Auth/` 等目录仍只有占位文件，`WuwaApiClient.cs`、`ApiSession.cs`、`ApiModels.cs`、`AssistantSettings.cs` 和 snapshot payload helper 位于 Core 根目录；UI code-behind 仍承担部分 API 编排。
- 风险：继续增加根目录与 code-behind 逻辑会削弱 owner 边界；反向修改规范会把已明确记录的技术债固化为长期结构。
- 选项 A：保留长期规范，后续以无行为变化的重构把 Core 文件迁入对应 owner，并用现有 WPF 测试保护。
- 选项 B：接受扁平 Core 根目录为长期结构，并同步架构、API 和代码组织规范。
- 建议：选择 A。现有长期规则、目录占位和重点防守区已经共同表达目标方向，迁移比降低边界更符合仓库治理原则。

## 有意未修改

- `README.md`、`PRODUCT.md`、产品范围、路线图和发布策略：入口与当前产品阶段没有发现可无冲突修正的过期事实。
- `docs/api-and-data-contracts.md`：除已列出的字段冲突外，账号、识别、幂等、回滚和跨端契约与当前实现一致；冲突项等待裁决。
- 安全、隐私、性能和后台运行规范：当前 session/CSRF、ownership、本地 OCR、截图上传限制和后台低占用方向没有发现可安全改写项。
- `DESIGN.md`、`.impeccable/design.json`、Web 页面规范与 CSS：视觉、Token 和字体差异属于待确认冲突，未自动修改任一方。
- WPF 页面规范与生产代码：当前导航职责与测试一致；端口、Core 落点和 code-behind 技术债不通过文档任务解决。
- 历史归档、阶段规格、计划和 `memory/`：保留原始决策上下文，没有把历史表述批量改成当前事实。
- `docs/local-development.private.md`：未读取、未修改、未暂存。

## 验证

修改完成后的验证：

- `WuwaFrontend`: `..\.tools\node\npm.cmd test`，退出码 0，345 项通过。
- Django: `.\.venv\Scripts\python.exe manage.py test --keepdb`，退出码 0，140 项通过。
- WPF: `dotnet run --project WuwaAssistant\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj`，退出码 0，12 项通过。
- `..\.tools\node\npm.cmd run build`，退出码 0，Vite production build 成功。
- `.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run`，退出码 0，无待生成 migration。
- `dotnet build WuwaAssistant\WuwaAssistant.slnx`，退出码 0，0 warning / 0 error。
- `.\start-dev.bat --check`，退出码 0，Node、npm、Python、PostgreSQL 和本地 8001/5173 启动配置检查通过，未启动服务。
- 一次性只读文档检查，退出码 0：6 个修改文件的相对 Markdown 链接可解析，新增内容未发现本地绝对路径、凭据特征或真实远端 URL，文档引用的命令入口存在。
- PowerShell `ConvertFrom-Json` 与结构化值检查，退出码 0：`.impeccable/design.json` 可解析；22 个颜色 canonical 值、4 个阴影值和 5 个断点与 `DESIGN.md` 对应入口一致。Token 活动命名和字体候选差异仍按上文冲突保留，未被误报为解决。
- `git diff --check`，退出码 0，无空白错误。
