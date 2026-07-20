# WPF 独立仓库迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `WuwaAssistant/` 连同目录历史迁移到私有的 `weiyanju/Wuwa-Assistant`，验证独立仓库后再从 Wuwa 删除 WPF 活跃工程并收口源仓库文档边界。

**Architecture:** 使用 `git subtree split --prefix=WuwaAssistant` 生成只包含 WPF 目录历史的提交链，并将它作为空目标仓库的 `main`。目标仓库补齐独立治理文档、统一 `8001` 默认后端地址并通过 .NET 验证后，源仓库才删除 WPF 工程；Django recognition、Web 复核和客户端中立 API 契约继续留在 Wuwa。

**Tech Stack:** Git、GitHub connector、PowerShell、.NET 10 / WPF、Django、Vue 3 / Vite、Markdown

---

## 0. 工作边界与文件地图

本计划涉及两个 Git 仓库。

### Wuwa 源仓库

**创建：**

- `docs/archive/2026-07-20-wpf-repository-extraction-implementation.md`：记录实际迁移、验证和边界变化。

**修改：**

- `.gitignore`：删除源仓库不再需要的 .NET 专项忽略段。
- `AGENTS.md`：删除仓库内 WPF 开发入口，增加外部客户端兼容约束。
- `README.md`：删除 WPF 目录、工具、启动和验证说明。
- `PRODUCT.md`：把 WPF 产品关系改成外部 Windows 本地识别客户端。
- `docs/developer-onboarding.md`：改为 Django + Vue 仓库入口。
- `docs/product-principles-and-scope.md`：保留本地离线识别产品方向，但不声明 WPF 在本仓库。
- `docs/architecture.md`：删除 WPF 源码 owner，定义外部客户端 API 边界。
- `docs/engineering-quality.md`：删除源仓库 WPF 构建门槛，保留服务端兼容验证。
- `docs/code-organization-and-style.md`：删除 WPF 目录与 code-behind 规则。
- `docs/api-and-data-contracts.md`：将 WPF 调用方改为外部本地识别客户端，并明确预留字段。
- `docs/security-privacy-and-data-boundaries.md`：保持本地 OCR/截图边界，改为跨仓库客户端责任。
- `docs/performance-and-background-runtime.md`：改为源仓库拥有的后端/Web 运行规则与外部客户端契约，不再拥有 WPF 状态机实现。
- `docs/product-interface-principles.md`：把跨端措辞改成 Web 与外部本地客户端。
- `docs/issue-fix-boundary-guardrails.md`：删除仓库内 WPF 文件落点规则。
- `docs/roadmap-and-prioritization.md`：把桌面客户端实施路线移交独立仓库。
- `docs/versioning-and-release-policy.md`：明确两个仓库独立版本与发布。
- `Wuwa/api/tests/test_backend_structure.py`：锁住源仓库不再拥有桌面客户端。
- `Wuwa/api/tests/test_models.py`：将通用 recognition 测试客户端名改成技术中立值。
- `Wuwa/api/tests/test_views.py`：将通用 recognition 测试客户端名改成技术中立值。

**删除：**

- `WuwaAssistant/` 下 43 个受跟踪文件。
- `docs/wpf-assistant-ui-guidelines.md`。

### `Wuwa-Assistant` 目标仓库

历史导入后，下面所有路径都相对于目标仓库根目录。

**创建：**

- `.gitignore`
- `README.md`
- `AGENTS.md`
- `docs/developer-onboarding.md`
- `docs/product-principles-and-scope.md`
- `docs/architecture.md`
- `docs/engineering-quality.md`
- `docs/api-and-data-contracts.md`
- `docs/security-privacy-and-data-boundaries.md`
- `docs/performance-and-background-runtime.md`
- `docs/wpf-assistant-ui-guidelines.md`

**修改：**

- `WuwaAssistant.Core/AssistantSettings.cs`
- `WuwaAssistant.Tests/Program.cs`
- `WuwaAssistant/LoginWindow.xaml.cs`
- `WuwaAssistant/MainWindow.xaml.cs`
- `WuwaAssistant/ViewModels/ConnectionViewModel.cs`

---

### Task 1: 固化并推送源仓库基线

**Files:**

- Verify: `docs/superpowers/specs/2026-07-20-wpf-repository-extraction-design.md`
- Verify: `WuwaAssistant/`

- [ ] **Step 1: 重新读取源仓库任务规范**

Run:

```powershell
Get-Content -Raw -Encoding UTF8 AGENTS.md
Get-Content -Raw -Encoding UTF8 docs/developer-onboarding.md
Get-Content -Raw -Encoding UTF8 docs/product-principles-and-scope.md
Get-Content -Raw -Encoding UTF8 docs/architecture.md
Get-Content -Raw -Encoding UTF8 docs/engineering-quality.md
Get-Content -Raw -Encoding UTF8 docs/api-and-data-contracts.md
Get-Content -Raw -Encoding UTF8 docs/security-privacy-and-data-boundaries.md
Get-Content -Raw -Encoding UTF8 docs/performance-and-background-runtime.md
Get-Content -Raw -Encoding UTF8 docs/wpf-assistant-ui-guidelines.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/specs/2026-07-20-wpf-repository-extraction-design.md
```

Expected: 所有文件可读取；设计状态为 `Final`，目标为 private 的 `weiyanju/Wuwa-Assistant`。

- [ ] **Step 2: 确认源分支只有已提交设计且没有工作区改动**

Run:

```powershell
git status --short --branch
git log -2 --oneline
git diff --check
```

Expected: 分支为 `codex/docs-design-governance-sync`，领先远端 2 个文档提交；最近两条提交主题依次为 `docs: plan WPF repository extraction` 与 `docs: design WPF repository extraction`。

`git diff --check` 无输出。若分支、提交或工作区与预期不同，停止并先解释实际差异。

- [ ] **Step 3: 推送设计提交并验证远端一致**

Run:

```powershell
git push
git status --short --branch
git rev-parse HEAD
git rev-parse '@{upstream}'
```

Expected: push 成功；状态不再显示 `ahead`；两个 SHA 完全相同。

- [ ] **Step 4: 记录迁移基线，不写入受版本控制文件**

Run:

```powershell
$sourceCommit = git rev-parse HEAD
$sourceBranch = git branch --show-current
$sourceWpfFiles = git ls-tree -r --name-only HEAD -- WuwaAssistant
$sourceWpfCount = @($sourceWpfFiles).Count
"SOURCE_COMMIT=$sourceCommit"
"SOURCE_BRANCH=$sourceBranch"
"WPF_TRACKED_FILES=$sourceWpfCount"
```

Expected: `SOURCE_BRANCH=codex/docs-design-governance-sync`，`WPF_TRACKED_FILES=43`。

---

### Task 2: 提取 WPF 目录历史并创建私有目标仓库

**Files:**

- Read: `WuwaAssistant/**`
- Git ref: `codex/wpf-history-split`
- Remote repository: `weiyanju/Wuwa-Assistant` is the only approved target.

- [ ] **Step 1: 确认批准目标尚不存在**

Use the connected GitHub app to read repository `weiyanju/Wuwa-Assistant`.

Expected: repository not found. If it exists, inspect owner, visibility, default branch and recent commits; do not push or overwrite, and stop for user confirmation.

- [ ] **Step 2: 生成目录历史拆分分支**

Run:

```powershell
git branch --list codex/wpf-history-split
git subtree split --prefix=WuwaAssistant -b codex/wpf-history-split
$splitCommit = git rev-parse codex/wpf-history-split
"SPLIT_COMMIT=$splitCommit"
```

Expected: 第一个命令无输出；split 成功并返回可解析提交。

- [ ] **Step 3: 比对源目录与拆分根目录文件树**

Run:

```powershell
$sourceCommit = git rev-parse HEAD
$splitCommit = git rev-parse codex/wpf-history-split
$sourceTree = git ls-tree -r --name-only $sourceCommit -- WuwaAssistant |
    ForEach-Object { $_.Substring('WuwaAssistant/'.Length) } |
    Sort-Object
$splitTree = git ls-tree -r --name-only $splitCommit | Sort-Object
Compare-Object $sourceTree $splitTree
```

Expected: 无输出。

- [ ] **Step 4: 确认拆分历史没有 Django、Vue 或源仓库文档**

Run:

```powershell
$splitCommit = git rev-parse codex/wpf-history-split
git ls-tree -r --name-only $splitCommit |
    Select-String -Pattern '^(Wuwa/|WuwaFrontend/|docs/|AGENTS\.md$|README\.md$|PRODUCT\.md$)'
git log --oneline codex/wpf-history-split
```

Expected: 第一条命令无输出；历史至少包含现有 WPF 基线提交。

- [ ] **Step 5: 创建空的 private GitHub 仓库**

Use the connected GitHub app repository-creation action with this exact request:

```json
{
  "owner": "weiyanju",
  "name": "Wuwa-Assistant",
  "visibility": "private",
  "initialize": false
}
```

Do not add README, license, topics or template files during creation.

Expected: repository created with private visibility and no initialized branch. Capture the exact clone URL returned by the connector in runtime variable `$assistantRemote`; do not write that URL into tracked files.

- [ ] **Step 6: 推送拆分历史作为目标 `main`**

Run:

```powershell
git remote | Select-String -Pattern '^assistant-migration$'
```

Expected: no output. In the next command, assign the connector-returned clone URL to `$assistantRemote` without writing it to any file, then run:

```powershell
$splitCommit = git rev-parse codex/wpf-history-split
git remote add assistant-migration $assistantRemote
git push -u assistant-migration codex/wpf-history-split:main
git ls-remote assistant-migration refs/heads/main
```

Expected: push 成功；远端 `main` SHA 等于 `$splitCommit`。

- [ ] **Step 7: 用 GitHub app 复核远端状态**

Read `weiyanju/Wuwa-Assistant` with the connected GitHub app.

Expected:

- visibility is private;
- default branch is `main`;
- `main` head equals `$splitCommit`;
- repository contains `WuwaAssistant.slnx`, `WuwaAssistant/`, `WuwaAssistant.Core/` and `WuwaAssistant.Tests/`.

If `main` exists but is not the default branch, use the GitHub app repository-update action to set the default branch to `main`, then read the metadata again.

If any item differs, stop before source deletion.

---

### Task 3: 建立目标仓库根级开发入口

**Files:**

- Create: `.gitignore`
- Create: `README.md`
- Create: `AGENTS.md`
- Create: `docs/developer-onboarding.md`
- Create: `docs/archive/.gitkeep`

- [ ] **Step 1: 克隆目标仓库到经过验证的临时目录**

Run:

```powershell
$assistantRemote = git remote get-url assistant-migration
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
if (Test-Path -LiteralPath $assistantRepo) {
    throw "Temporary target already exists: $assistantRepo"
}
git clone $assistantRemote $assistantRepo
git -C $assistantRepo switch main
git -C $assistantRepo status --short --branch
```

Expected: clone 成功，位于 `main`，工作区干净。

- [ ] **Step 2: 创建目标 `.gitignore` 与归档目录**

Create `.gitignore` with exactly:

```gitignore
# .NET build output
bin/
obj/

# Local IDE state
.vs/
.idea/
*.user
*.suo

# Local settings, logs and runtime data
.env
*.log
tmp/
cache/
screenshots/

# Agent and local tooling state
.superpowers/
.worktrees/
.gstack/
```

Create the empty marker `docs/archive/.gitkeep`.

- [ ] **Step 3: 创建目标 `README.md`**

Create `README.md` with this structure and wording:

````markdown
# Wuwa Assistant

Wuwa Assistant 是 Wuwa 产品的 Windows 本地识别客户端。它使用 WPF 与 .NET，负责低打扰桌面交互、本地窗口检测、截图、本地离线 OCR、后台识别和向 Wuwa 后端提交结构化结果。

本仓库不包含 Wuwa 的 Django 后端或 Vue Web 工作台，也不直接访问数据库。

## 当前边界

- 本地完成截图与 OCR。
- 常规流程不上传完整截图。
- 通过 Wuwa API 读取 `GameAccount`、创建识别会话并提交识别快照。
- 深度数据管理、统计、预测、评估与识别复核由 Wuwa Web 工作台负责。

## 环境要求

- Windows
- .NET SDK 10
- 可访问的 Wuwa 后端；本地开发默认地址为 `http://127.0.0.1:8001`

## 构建

```powershell
dotnet build WuwaAssistant.slnx
```

## 测试

```powershell
dotnet run --project WuwaAssistant.Tests\WuwaAssistant.Tests.csproj
```

## 运行

```powershell
dotnet run --project WuwaAssistant\WuwaAssistant.csproj
```

## 文档

- `AGENTS.md`
- `docs/developer-onboarding.md`
- `docs/product-principles-and-scope.md`
- `docs/architecture.md`
- `docs/engineering-quality.md`
- `docs/api-and-data-contracts.md`
- `docs/security-privacy-and-data-boundaries.md`
- `docs/performance-and-background-runtime.md`
- `docs/wpf-assistant-ui-guidelines.md`
````

- [ ] **Step 4: 创建目标 `AGENTS.md`**

Create `AGENTS.md` with exactly:

````markdown
# Wuwa Assistant Repository Instructions

## 开发前必读

所有任务先阅读：

1. `docs/developer-onboarding.md`
2. `docs/product-principles-and-scope.md`
3. `docs/architecture.md`
4. `docs/engineering-quality.md`
5. 当前任务对应的长期规范

API、认证、`GameAccount` 或识别提交任务还必须阅读：

- `docs/api-and-data-contracts.md`
- `docs/security-privacy-and-data-boundaries.md`

截图、OCR、后台运行或性能任务还必须阅读：

- `docs/security-privacy-and-data-boundaries.md`
- `docs/performance-and-background-runtime.md`

UI 任务还必须阅读：

- `docs/wpf-assistant-ui-guidelines.md`

## 开发规则

- 新功能和独立重构使用 `codex/` 功能分支，不直接在 `main` 上开发。
- UI 放在 `WuwaAssistant/`，可脱离 UI 测试的能力放在 `WuwaAssistant.Core/`。
- 不继续加厚 `MainWindow.xaml.cs`、`LoginWindow.xaml.cs` 或其他 code-behind。
- Wuwa 后端拥有认证、`GameAccount`、声骸和 recognition 持久化；客户端只通过 API 使用这些能力。
- 完整截图不进入常规上传路径，OCR 默认本地离线。
- 改 API 消费形状时同时更新 fake HTTP handler 测试与长期契约文档。
- 改截图、OCR、后台运行或缓存时必须运行与风险匹配的 Core 测试。
- 独立功能完成后在 `docs/archive/` 记录实际结果；阶段计划不能代替实施记录。

## 验证

提交前至少运行：

```powershell
dotnet run --project WuwaAssistant.Tests\WuwaAssistant.Tests.csproj
dotnet build WuwaAssistant.slnx
git diff --check
git status --short
```

## 仓库卫生

- 不提交密码、token、cookie、session、真实远端地址、用户绝对路径或私有配置。
- 不提交 `.vs/`、`bin/`、`obj/`、日志、截图、OCR 缓存或运行态数据。
- 只暂存当前任务涉及的文件。
````

- [ ] **Step 5: 创建目标开发者入门文档**

Create `docs/developer-onboarding.md` with exactly:

````markdown
# 开发者入门

## 项目结构

```text
WuwaAssistant/        WPF UI、窗口、页面、ViewModel 与共享样式
WuwaAssistant.Core/   API Client、DTO 与可脱离 UI 测试的核心能力
WuwaAssistant.Tests/  轻量测试运行器与静态结构约束
WuwaAssistant.slnx    解决方案入口
docs/                 当前长期规范
```

历史迁移保留了原 `WuwaAssistant/` 目录自身的 Git 提交。Django 后端和 Vue Web 工作台在独立的 Wuwa 仓库维护。

## 本地依赖

- Windows
- .NET SDK 10
- Wuwa 后端；本地开发默认运行在 `http://127.0.0.1:8001`

## 开发顺序

1. 阅读 `AGENTS.md` 和当前任务对应规范。
2. 从 `main` 创建名称能够准确描述任务的 `codex/` 功能分支。
3. 先在 `WuwaAssistant.Tests/Program.cs` 增加可失败的行为或结构测试。
4. 将 UI 编排留在 WPF 项目，将可测试业务能力放入 Core。
5. 运行测试与构建。
6. 在 `docs/archive/` 记录已完成结果。

## 常用命令

```powershell
dotnet run --project WuwaAssistant.Tests\WuwaAssistant.Tests.csproj
dotnet build WuwaAssistant.slnx
dotnet run --project WuwaAssistant\WuwaAssistant.csproj
```

## API 协作

本仓库消费 Wuwa 后端 API，不拥有服务端 schema。服务端契约发生破坏性变化时，两边必须同步修改或提供兼容期。客户端不得直接访问数据库，也不得把本地缓存当作业务真实来源。
````

- [ ] **Step 6: 检查根级文档与忽略规则**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
git -C $assistantRepo diff --check
git -C $assistantRepo status --short
git -C $assistantRepo check-ignore -v .vs bin obj tmp cache screenshots
```

Expected: 五个新文件出现；`diff --check` 无输出；列出的本地产物均命中 `.gitignore`。

- [ ] **Step 7: 提交目标仓库开发入口**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
git -C $assistantRepo add -- .gitignore README.md AGENTS.md docs/developer-onboarding.md docs/archive/.gitkeep
git -C $assistantRepo diff --cached --check
git -C $assistantRepo commit -m "docs: establish assistant repository guidance"
```

Expected: commit 成功，仅包含五个文件。

---

### Task 4: 建立目标仓库长期规范

**Files:**

- Create: `docs/product-principles-and-scope.md`
- Create: `docs/architecture.md`
- Create: `docs/engineering-quality.md`
- Create: `docs/api-and-data-contracts.md`
- Create: `docs/security-privacy-and-data-boundaries.md`
- Create: `docs/performance-and-background-runtime.md`
- Create: `docs/wpf-assistant-ui-guidelines.md`

- [ ] **Step 1: 写产品原则与范围**

Create `docs/product-principles-and-scope.md` with these exact binding sections:

```markdown
# 产品原则与范围

## 产品定义

Wuwa Assistant 是面向鸣潮玩家的 Windows 本地离线识别助手，是 Wuwa 产品的一部分，但由独立仓库维护。

## 核心价值

- 低打扰地长期后台运行。
- 在本地检测游戏窗口、截图并完成离线 OCR。
- 将可信的结构化结果提交给 Wuwa 后端。
- 让用户在 Wuwa Web 工作台完成深度管理、统计、预测、评估与复核。

## 长期原则

1. 数据可信优先于功能数量。
2. 本地离线 OCR 优先于完整截图上传。
3. 低打扰后台运行优先于重型桌面工作台。
4. 后端拥有业务事实，客户端缓存只服务性能和体验。
5. 不以持续截图或持续 OCR 制造表面自动化。

## 当前范围

- 登录与注册客户端流程。
- `GameAccount` 与 UID 选择、初始化和 locked 状态展示。
- 本地窗口检测、局部截图、本地 OCR、缓存和去重。
- recognition session、snapshot、冲突、失败和回滚客户端流程。
- 本地设置、状态和诊断。

## 非目标

- 深度声骸管理、统计、预测和模型评估。
- 读取游戏内存、注入进程、修改游戏文件或自动操作游戏。
- 常规上传完整截图做云端 OCR。
- 直接访问 Wuwa 数据库。
- 在本仓库实现 Wuwa 后端或 Web 工作台。
```

- [ ] **Step 2: 写架构规范**

Create `docs/architecture.md` with these exact binding sections:

````markdown
# 架构规范

## 系统边界

```text
WPF UI
  -> ViewModel / 薄编排
  -> WuwaAssistant.Core
  -> Wuwa HTTP API

本地窗口与截图
  -> hash / cache
  -> 本地离线 OCR
  -> parser / normalized payload
  -> Wuwa recognition API
```

Wuwa 后端拥有认证、`GameAccount`、声骸、识别会话、识别快照和回滚状态。本仓库不直接访问数据库。

## 目录 owner

- `WuwaAssistant/Styles/`：共享 XAML token 与控件样式。
- `WuwaAssistant/Views/`：页面视图。
- `WuwaAssistant/ViewModels/`：页面状态与命令编排。
- `WuwaAssistant.Core/`：API、认证、账号、识别、截图、OCR、诊断、设置与存储能力。
- `WuwaAssistant.Tests/`：Core 行为测试、fake HTTP 测试和 WPF 静态结构测试。

迁移基线中的部分 Core 文件仍位于 `WuwaAssistant.Core/` 根目录。本次迁移不做无行为收益的目录搬迁；后续修改这些能力时再按 owner 渐进收口。

## 入口约束

- `LoginWindow.xaml.cs` 只编排登录、注册和进入主窗口。
- `MainWindow.xaml.cs` 只编排 shell 与页面级动作。
- 长耗时工作不运行在 UI 线程。
- API DTO 与 ViewModel 分离。
- OCR、截图和缓存不写入页面 code-behind。

## 依赖规则

- UI 可以依赖 Core。
- Core 不依赖 WPF UI。
- 测试可以依赖 Core，并通过源码/XAML 静态检查锁住 shell 结构。
- 服务端契约由 Wuwa 后端拥有；本仓库只维护消费侧兼容。
````

- [ ] **Step 3: 写工程质量规范**

Create `docs/engineering-quality.md` with these exact binding sections:

````markdown
# 工程质量

## 优先级

1. 数据归属与识别可信。
2. 模块 owner 与可测试性。
3. 后台 CPU、内存、I/O 与响应速度。
4. UI 打磨。

## 默认验证

所有变更至少运行：

```powershell
dotnet run --project WuwaAssistant.Tests\WuwaAssistant.Tests.csproj
dotnet build WuwaAssistant.slnx
```

API Client 变化必须有 fake HTTP handler 测试。XAML resource、登录窗口、主窗口或 shell 变化必须有静态结构测试，并在可运行环境执行启动探针。截图、OCR、缓存和队列变化必须放入可脱离 WPF 的 Core 测试。

## 完成闭环

1. 阅读长期规范。
2. 先写能证明预期的失败测试。
3. 实现最小改动。
4. 运行命中测试和完整构建。
5. 更新受影响的长期文档。
6. 在 `docs/archive/` 写实施记录。

不把目录整理、性能猜测或视觉偏好描述成已经验证的改进。
````

- [ ] **Step 4: 写客户端 API 契约**

Create `docs/api-and-data-contracts.md` with these exact binding sections:

```markdown
# API 与数据契约

## 服务端 owner

Wuwa 后端数据库是系统账号、`GameAccount`、UID、声骸、识别会话、识别快照和回滚状态的真实来源。本客户端只能通过 `/api/...` 访问这些能力。

## 默认开发地址

本地开发默认使用 `http://127.0.0.1:8001`。地址允许通过本地设置覆盖，但不得写入仓库私有远端地址。

## 消费接口

- `GET /api/health/`
- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/me/`
- `GET|POST /api/game-accounts/`
- `GET|PATCH /api/game-accounts/{id}/`
- `GET|POST /api/recognition/sessions/`
- `GET|PATCH /api/recognition/sessions/{id}/`
- `GET|POST /api/recognition/snapshots/`
- `POST /api/recognition/snapshots/{id}/revert/`

## GameAccount

稳定响应字段包括 `id`、`uid`、`server`、`nickname`、`is_default`、`workspace_locked`、`created_at` 和 `updated_at`。

`server` 与 `nickname` 是未废弃的预留可选字段。客户端保留 DTO 和兼容调用形状，但当前不能依赖它们具有非空语义，也不恢复业务写入。

## 识别数据

客户端提交结构化 raw、normalized fields、confidence、screenshot hash、耗时、client event id 和必要诊断码。常规接口不上传完整截图。

## 兼容规则

- 新字段必须允许旧客户端继续工作。
- 删除、改名或改变状态值属于破坏性变更。
- 所有写入绑定 authenticated user 与 `game_account_id`。
- locked `GameAccount` 不提交正式识别结果。
- 客户端校验不能替代服务端 ownership、幂等与回滚保护。
```

- [ ] **Step 5: 写安全与隐私规范**

Create `docs/security-privacy-and-data-boundaries.md` with these exact binding sections:

```markdown
# 安全、隐私与数据边界

## 硬边界

- OCR 默认本地离线。
- 常规流程不上传完整截图。
- 不读取游戏内存、不注入进程、不修改游戏文件、不自动操作游戏。
- 不在日志中记录密码、token、cookie、session 或完整截图。
- 不把本地缓存当作业务真实来源。

## 本地数据

允许保存受清理策略约束的局部临时截图、screenshot hash、OCR 缓存、本地设置和诊断指标。不得保存无关屏幕内容、其他窗口内容、用户绝对路径或无限增长的截图与日志。

## API 与账号

认证结果和 `GameAccount` ownership 由 Wuwa 后端判断。客户端不能依赖本地账号选择绕过 locked 状态或跨账号提交。

## 配置

默认本地后端地址可以进入受版本控制配置。密码、真实远端地址和私有配置只能来自不入库的本地设置或运行环境。

## 云端边界

Wuwa 后端部署到云端不自动允许云端 OCR、截图上传、日志上传或设备信息采集。新增数据流必须单独确认上传内容、用途、保留时间和删除方式。
```

- [ ] **Step 6: 写后台运行与性能规范**

Create `docs/performance-and-background-runtime.md` with these exact binding sections:

````markdown
# 后台运行与性能

## 核心目标

- 用户操作低延迟且 UI 不被长任务阻塞。
- 空闲态低 CPU、低内存、低 I/O。
- 没有变化不重复截图和 OCR。
- 同一时间最多一个 OCR worker。
- 不能用牺牲准确性换取表面速度。

## 状态机

```text
Disabled -> Idle -> WindowSearching -> WindowFound
-> CandidateDetecting -> Capturing -> HashChecking
-> OcrQueued -> OcrRunning -> Parsed -> Submitting
-> Cooldown -> Idle

ErrorRecoverable -> Idle
Stopping -> Disabled
```

每个状态必须可退出；状态循环不能运行在 UI 线程；错误必须可恢复。

## 触发顺序

自动识别开关、目标窗口、候选场景、局部截图、hash、缓存检查全部通过后才能运行 OCR。未找到窗口、截图未变化或缓存命中时不得调用 OCR。

## 缓存与队列

缓存 key 至少包含 `game_account_id`、截图区域、截图 hash 与 OCR provider 版本。provider 或 parser 版本变化时不无条件复用旧结果。队列不得无限增长，停止识别时取消未开始任务。

## 指标

至少记录状态转换、窗口检测、截图、hash、排队、OCR、parser、提交耗时，缓存命中、重复抑制、失败次数和最近错误。

## 验收

- 自动识别关闭时窗口检测与 OCR 调用次数为 0。
- 未找到目标窗口时 OCR 调用次数为 0。
- 相同截图第二次命中缓存。
- OCR 期间窗口仍可操作和停止。
- 低置信度或字段缺失不自动写入正式数据。
- 长时间运行时内存、队列、日志和缓存不持续无界增长。
````

- [ ] **Step 7: 写 WPF UI 规范**

Create `docs/wpf-assistant-ui-guidelines.md` with these exact binding sections:

```markdown
# WPF 本地助手 UI 规范

## 定义

WPF UI 是紧凑、清爽、低打扰、适合后台长期运行的小窗口工具界面，不是完整数据工作台。

## 窗口职责

- 登录窗口只处理品牌、用户名、密码、登录、注册和状态提示。
- 主窗口首页展示系统账号、UID、识别状态和 UID 初始化。
- 左侧导航只放首页、识别、截图/OCR、日志和设置。
- 深度声骸管理、统计、预测和评估留给 Wuwa Web。

## 视觉原则

- 信息、对齐、间距和状态层级优先于装饰。
- 默认适配约 `430x420` 登录窗口、`960x680` 主窗口和 `820x560` 最小主窗口。
- 检查 125% 与 150% DPI。
- 不使用玻璃拟态、重模糊、霓虹、大面积渐变、过度圆角或重阴影。

## 组件规则

- 同类按钮、输入框、状态标签和分组容器复用共享 XAML Style。
- 颜色使用语义资源，不在页面随手硬编码。
- hover、pressed、disabled、focus、loading、empty、error 状态必须完整。
- 状态标签只表达真实账号、UID、识别、连接、成功、警告或错误状态。

## 代码边界

- 共享视觉资源放入 `WuwaAssistant/Styles/`。
- 页面放入 `WuwaAssistant/Views/`。
- 页面状态放入 `WuwaAssistant/ViewModels/`。
- 不把新业务逻辑继续堆入窗口 code-behind。
```

- [ ] **Step 8: 验证目标长期文档**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
$requiredDocs = @(
    'docs/product-principles-and-scope.md',
    'docs/architecture.md',
    'docs/engineering-quality.md',
    'docs/api-and-data-contracts.md',
    'docs/security-privacy-and-data-boundaries.md',
    'docs/performance-and-background-runtime.md',
    'docs/wpf-assistant-ui-guidelines.md'
)
$requiredDocs | ForEach-Object {
    if (-not (Test-Path -LiteralPath (Join-Path $assistantRepo $_))) {
        throw "Missing target document: $_"
    }
}
rg -n "云端 OCR|完整截图|GameAccount|8001|OCR worker|code-behind" `
    ($requiredDocs | ForEach-Object { Join-Path $assistantRepo $_ })
git -C $assistantRepo diff --check
```

Expected: 七个文件全部存在；检索结果覆盖明确边界；`diff --check` 无输出。

- [ ] **Step 9: 提交目标长期规范**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
git -C $assistantRepo add -- docs
git -C $assistantRepo diff --cached --check
git -C $assistantRepo commit -m "docs: define assistant product and engineering boundaries"
```

Expected: commit 成功，仅包含七个长期规范文件。

---

### Task 5: 用测试驱动统一目标仓库默认后端端口

**Files:**

- Modify: `WuwaAssistant.Tests/Program.cs`
- Modify: `WuwaAssistant.Core/AssistantSettings.cs`
- Modify: `WuwaAssistant/LoginWindow.xaml.cs`
- Modify: `WuwaAssistant/MainWindow.xaml.cs`
- Modify: `WuwaAssistant/ViewModels/ConnectionViewModel.cs`

- [ ] **Step 1: 为默认端口添加失败测试**

In `WuwaAssistant.Tests/Program.cs`, add this entry as the first item in `tests`:

```csharp
("default backend targets local 8001", DefaultBackendTargetsLocal8001Async),
```

Add this method before `LoginStoresCookiesAsync`:

```csharp
Task DefaultBackendTargetsLocal8001Async()
{
    var settings = new AssistantSettings("");

    AssertEqual(
        "http://127.0.0.1:8001/api/",
        settings.ApiBaseUri.AbsoluteUri,
        "default backend api base uri");

    return Task.CompletedTask;
}
```

- [ ] **Step 2: 运行测试确认端口测试失败**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
dotnet run --project "$assistantRepo\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj"
```

Expected: `FAIL default backend targets local 8001`，实际值包含 `8000`。

- [ ] **Step 3: 建立单一默认地址常量**

Replace `WuwaAssistant.Core/AssistantSettings.cs` with:

```csharp
namespace WuwaAssistant.Core;

public sealed record AssistantSettings(string BackendBaseUrl)
{
    public const string DefaultBackendBaseUrl = "http://127.0.0.1:8001";

    public Uri ApiBaseUri
    {
        get
        {
            var baseUrl = string.IsNullOrWhiteSpace(BackendBaseUrl)
                ? DefaultBackendBaseUrl
                : BackendBaseUrl.Trim();
            return new Uri(baseUrl.TrimEnd('/') + "/api/");
        }
    }
}
```

- [ ] **Step 4: 让两个窗口使用默认地址常量**

In both `WuwaAssistant/LoginWindow.xaml.cs` and `WuwaAssistant/MainWindow.xaml.cs`, replace:

```csharp
new AssistantSettings("http://127.0.0.1:8000")
```

with:

```csharp
new AssistantSettings(AssistantSettings.DefaultBackendBaseUrl)
```

- [ ] **Step 5: 让连接 ViewModel 使用同一常量**

Replace `WuwaAssistant/ViewModels/ConnectionViewModel.cs` with:

```csharp
using WuwaAssistant.Core;

namespace WuwaAssistant.ViewModels;

public sealed class ConnectionViewModel
{
    public string BackendBaseUrl { get; set; } = AssistantSettings.DefaultBackendBaseUrl;
    public string StatusText { get; set; } = "未登录";
}
```

- [ ] **Step 6: 清理测试中的旧默认地址**

In `WuwaAssistant.Tests/Program.cs`, replace every occurrence of:

```csharp
new AssistantSettings("http://127.0.0.1:8000")
```

with:

```csharp
new AssistantSettings(AssistantSettings.DefaultBackendBaseUrl)
```

Do not change `GameAccount` DTO fields or the `server` / `nickname` request compatibility parameters.

- [ ] **Step 7: 运行目标测试并确认通过**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
dotnet run --project "$assistantRepo\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj"
```

Expected: all tests print `PASS` and process exits 0.

- [ ] **Step 8: 构建目标解决方案**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
dotnet build "$assistantRepo\WuwaAssistant.slnx"
```

Expected: `Build succeeded.` with zero errors.

- [ ] **Step 9: 检索端口与预留字段**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
rg -n "127\.0\.0\.1:8000|localhost:8000" $assistantRepo `
    --glob '!**/bin/**' --glob '!**/obj/**' --glob '!**/.git/**'
rg -n "server|nickname" `
    "$assistantRepo\WuwaAssistant.Core\ApiModels.cs" `
    "$assistantRepo\WuwaAssistant.Core\WuwaApiClient.cs" `
    "$assistantRepo\WuwaAssistant.Tests\Program.cs"
```

Expected: 第一条命令无输出；第二条仍显示 DTO、client 参数和兼容测试数据。

- [ ] **Step 10: 提交默认端口同步**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
git -C $assistantRepo add -- `
    WuwaAssistant.Core/AssistantSettings.cs `
    WuwaAssistant.Tests/Program.cs `
    WuwaAssistant/LoginWindow.xaml.cs `
    WuwaAssistant/MainWindow.xaml.cs `
    WuwaAssistant/ViewModels/ConnectionViewModel.cs
git -C $assistantRepo diff --cached --check
git -C $assistantRepo commit -m "fix: align default backend port"
```

Expected: commit 成功，只包含五个文件。

---

### Task 6: 推送并验收目标仓库

**Files:**

- Verify: all target repository files

- [ ] **Step 1: 运行目标仓库完整验证**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
dotnet run --project "$assistantRepo\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj"
dotnet build "$assistantRepo\WuwaAssistant.slnx"
git -C $assistantRepo diff --check
git -C $assistantRepo status --short --branch
git -C $assistantRepo log -4 --oneline
```

Expected: tests pass; build succeeds; diff check has no output; worktree clean; imported history is followed by two docs commits and one port commit.

- [ ] **Step 2: 验证导入基线仍是目标历史祖先**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
$splitCommit = git rev-parse codex/wpf-history-split
git -C $assistantRepo merge-base --is-ancestor $splitCommit HEAD
if ($LASTEXITCODE -ne 0) {
    throw "Imported WPF history is not an ancestor of target HEAD."
}
```

Expected: exit code 0.

- [ ] **Step 3: 推送目标 `main`**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
git -C $assistantRepo push origin main
$assistantHead = git -C $assistantRepo rev-parse HEAD
$assistantUpstream = git -C $assistantRepo rev-parse '@{upstream}'
"TARGET_HEAD=$assistantHead"
"TARGET_UPSTREAM=$assistantUpstream"
```

Expected: push succeeds and both SHA values match.

- [ ] **Step 4: 用 GitHub app 完成远端验收门**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
$assistantHead = git -C $assistantRepo rev-parse HEAD
"TARGET_HEAD=$assistantHead"
```

Read repository metadata, `main` head and root tree for `weiyanju/Wuwa-Assistant`.

Expected:

- private visibility;
- default branch `main`;
- remote head equals `$assistantHead`;
- root contains README, AGENTS, docs, solution, UI, Core and Tests;
- no Django or Vue source tree.

Only after all five checks pass may execution continue to source deletion.

---

### Task 7: 先用失败测试锁住源仓库边界

**Files:**

- Modify: `Wuwa/api/tests/test_backend_structure.py`
- Modify: `Wuwa/api/tests/test_models.py`
- Modify: `Wuwa/api/tests/test_views.py`

- [ ] **Step 1: 添加“桌面客户端已外置”结构测试**

Add this import to `Wuwa/api/tests/test_backend_structure.py`:

```python
import subprocess
```

Add this method to `BackendStructureTests` in `Wuwa/api/tests/test_backend_structure.py`:

```python
    def test_desktop_client_is_owned_by_an_external_repository(self):
        repository_root = Path(__file__).resolve().parents[3]

        tracked_desktop_files = subprocess.run(
            ["git", "ls-files", "--", "WuwaAssistant"],
            cwd=repository_root,
            check=True,
            capture_output=True,
            text=True,
        ).stdout
        self.assertEqual(tracked_desktop_files.strip(), "")

        for relative_path in (
            "AGENTS.md",
            "README.md",
            "docs/developer-onboarding.md",
            "docs/architecture.md",
            "docs/engineering-quality.md",
        ):
            with self.subTest(relative_path=relative_path):
                source = (repository_root / relative_path).read_text(encoding="utf-8")
                self.assertNotIn("WuwaAssistant/", source)
                self.assertNotIn("wpf-assistant-ui-guidelines.md", source)
```

- [ ] **Step 2: 运行结构测试并确认失败**

Run:

```powershell
Set-Location Wuwa
.\.venv\Scripts\python.exe manage.py test `
    api.tests.test_backend_structure.BackendStructureTests.test_desktop_client_is_owned_by_an_external_repository
Set-Location ..
```

Expected: FAIL because source `WuwaAssistant/` still exists.

- [ ] **Step 3: 将 recognition 测试客户端名改为技术中立值**

In `Wuwa/api/tests/test_models.py` and `Wuwa/api/tests/test_views.py`, replace test fixture string:

```python
"WuwaAssistant"
```

with:

```python
"local-recognition-client"
```

Do not rename `client_name` fields or alter recognition production code.

---

### Task 8: 删除源仓库 WPF 活跃工程并清理根入口

**Files:**

- Delete: `WuwaAssistant/**`
- Delete: `docs/wpf-assistant-ui-guidelines.md`
- Modify: `.gitignore`
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `PRODUCT.md`
- Modify: `docs/developer-onboarding.md`

- [ ] **Step 1: 最后一次确认目标仓库验收门**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
if ((git -C $assistantRepo rev-parse HEAD) -ne (git -C $assistantRepo rev-parse '@{upstream}')) {
    throw "Target repository is not fully pushed."
}
dotnet run --project "$assistantRepo\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj"
dotnet build "$assistantRepo\WuwaAssistant.slnx"
```

Expected: SHA 一致、测试通过、构建成功。任一失败都停止，不执行下一步。

- [ ] **Step 2: 用明确补丁删除 43 个 WPF 文件**

Apply one deletion patch containing exactly:

```text
*** Begin Patch
*** Delete File: WuwaAssistant/WuwaAssistant.Core/Api/.gitkeep
*** Delete File: WuwaAssistant/WuwaAssistant.Core/ApiModels.cs
*** Delete File: WuwaAssistant/WuwaAssistant.Core/ApiSession.cs
*** Delete File: WuwaAssistant/WuwaAssistant.Core/AssistantSettings.cs
*** Delete File: WuwaAssistant/WuwaAssistant.Core/Auth/.gitkeep
*** Delete File: WuwaAssistant/WuwaAssistant.Core/Capture/.gitkeep
*** Delete File: WuwaAssistant/WuwaAssistant.Core/Connection/.gitkeep
*** Delete File: WuwaAssistant/WuwaAssistant.Core/Diagnostics/.gitkeep
*** Delete File: WuwaAssistant/WuwaAssistant.Core/GameAccounts/.gitkeep
*** Delete File: WuwaAssistant/WuwaAssistant.Core/Ocr/.gitkeep
*** Delete File: WuwaAssistant/WuwaAssistant.Core/Recognition/.gitkeep
*** Delete File: WuwaAssistant/WuwaAssistant.Core/SampleSnapshotPayloadFactory.cs
*** Delete File: WuwaAssistant/WuwaAssistant.Core/Settings/.gitkeep
*** Delete File: WuwaAssistant/WuwaAssistant.Core/Storage/.gitkeep
*** Delete File: WuwaAssistant/WuwaAssistant.Core/WuwaApiClient.cs
*** Delete File: WuwaAssistant/WuwaAssistant.Core/WuwaAssistant.Core.csproj
*** Delete File: WuwaAssistant/WuwaAssistant.Tests/Program.cs
*** Delete File: WuwaAssistant/WuwaAssistant.Tests/WuwaAssistant.Tests.csproj
*** Delete File: WuwaAssistant/WuwaAssistant.slnx
*** Delete File: WuwaAssistant/WuwaAssistant/App.xaml
*** Delete File: WuwaAssistant/WuwaAssistant/App.xaml.cs
*** Delete File: WuwaAssistant/WuwaAssistant/AssemblyInfo.cs
*** Delete File: WuwaAssistant/WuwaAssistant/LoginWindow.xaml
*** Delete File: WuwaAssistant/WuwaAssistant/LoginWindow.xaml.cs
*** Delete File: WuwaAssistant/WuwaAssistant/MainWindow.xaml
*** Delete File: WuwaAssistant/WuwaAssistant/MainWindow.xaml.cs
*** Delete File: WuwaAssistant/WuwaAssistant/Styles/Colors.xaml
*** Delete File: WuwaAssistant/WuwaAssistant/Styles/Controls.xaml
*** Delete File: WuwaAssistant/WuwaAssistant/Styles/Layout.xaml
*** Delete File: WuwaAssistant/WuwaAssistant/ViewModels/CaptureOcrViewModel.cs
*** Delete File: WuwaAssistant/WuwaAssistant/ViewModels/ConnectionViewModel.cs
*** Delete File: WuwaAssistant/WuwaAssistant/ViewModels/DiagnosticsViewModel.cs
*** Delete File: WuwaAssistant/WuwaAssistant/ViewModels/GameAccountViewModel.cs
*** Delete File: WuwaAssistant/WuwaAssistant/ViewModels/RecognitionViewModel.cs
*** Delete File: WuwaAssistant/WuwaAssistant/ViewModels/SettingsViewModel.cs
*** Delete File: WuwaAssistant/WuwaAssistant/ViewModels/ShellViewModel.cs
*** Delete File: WuwaAssistant/WuwaAssistant/Views/CaptureOcrPage.xaml
*** Delete File: WuwaAssistant/WuwaAssistant/Views/ConnectionPage.xaml
*** Delete File: WuwaAssistant/WuwaAssistant/Views/DiagnosticsPage.xaml
*** Delete File: WuwaAssistant/WuwaAssistant/Views/GameAccountPage.xaml
*** Delete File: WuwaAssistant/WuwaAssistant/Views/RecognitionPage.xaml
*** Delete File: WuwaAssistant/WuwaAssistant/Views/SettingsPage.xaml
*** Delete File: WuwaAssistant/WuwaAssistant/WuwaAssistant.csproj
*** End Patch
```

Expected: all 43 tracked WPF files become deletions. The ignored `.vs/` directory may remain locally until final safe cleanup; it must never be staged.

- [ ] **Step 3: 删除活跃 WPF UI 专项规范**

Use `apply_patch`:

```text
*** Begin Patch
*** Delete File: docs/wpf-assistant-ui-guidelines.md
*** End Patch
```

- [ ] **Step 4: 清理源 `.gitignore` 的 .NET 段**

Remove exactly:

```gitignore
# .NET
bin/
obj/

```

Keep `.vs/` under local IDE files because it remains a valid generic IDE ignore.

- [ ] **Step 5: 更新根 `AGENTS.md`**

Make these exact semantic changes:

```markdown
- 删除“WPF 任务还必须阅读”整节。
- 将“代码必须落在正确 owner 下，不继续加厚 `App.vue`、Django view 或 WPF code-behind”改为：
  “代码必须落在正确 owner 下，不继续加厚 `App.vue` 或 Django view。”
- 在后端/API 规则中加入：
  “recognition、认证、`GameAccount` 或稳定响应字段变化时，必须把外部本地识别客户端视为兼容调用方。”
```

- [ ] **Step 6: 更新根 `README.md`**

Apply all of these changes:

```markdown
- 项目结构只列 `Wuwa/` Django 后端和 `WuwaFrontend/` Vue 工作台。
- 在结构说明后加入：“Windows 本地识别客户端由独立的 `Wuwa-Assistant` 项目维护，通过公开 API 与本仓库协作。”
- 从文档清单删除 WPF UI 规范链接。
- 从必备工具删除 .NET SDK。
- 删除 `### WuwaAssistant` 启动章节。
- 从验证章节删除 WPF build/test 命令。
- 保留 Django `8001` 与 Vue `5173` 启动说明。
```

- [ ] **Step 7: 更新 `PRODUCT.md`**

Replace:

```markdown
4. Web is the deep workbench; WPF remains the low-distraction local assistant.
```

with:

```markdown
4. Web is the deep workbench; the separately maintained Windows client remains the low-distraction local recognition assistant.
```

- [ ] **Step 8: 更新开发者入门文档**

In `docs/developer-onboarding.md`:

```markdown
- 项目结构删除 `WuwaAssistant/`，增加外部 `Wuwa-Assistant` 客户端说明。
- 开发前必读删除 WPF UI 规范链接。
- 代码落点删除 WPF UI/Core 规则。
- 设计与 UI 规则删除“WPF 本地助手开发必须遵守”段。
- 提交与推送删除 WPF test/build 命令。
- 完成检查增加：API 契约变化已评估外部本地识别客户端兼容性。
```

- [ ] **Step 9: 检查根入口改动**

Run:

```powershell
rg -n "WuwaAssistant/|wpf-assistant-ui-guidelines|dotnet .*WuwaAssistant|WPF code-behind" `
    AGENTS.md README.md PRODUCT.md docs/developer-onboarding.md
git diff --check
```

Expected: no matches and no whitespace errors.

---

### Task 9: 收口源仓库长期产品、架构与契约文档

**Files:**

- Modify: `docs/product-principles-and-scope.md`
- Modify: `docs/architecture.md`
- Modify: `docs/engineering-quality.md`
- Modify: `docs/code-organization-and-style.md`
- Modify: `docs/api-and-data-contracts.md`
- Modify: `docs/security-privacy-and-data-boundaries.md`
- Modify: `docs/performance-and-background-runtime.md`
- Modify: `docs/product-interface-principles.md`
- Modify: `docs/issue-fix-boundary-guardrails.md`
- Modify: `docs/roadmap-and-prioritization.md`
- Modify: `docs/versioning-and-release-policy.md`

- [ ] **Step 1: 更新产品原则与范围**

In `docs/product-principles-and-scope.md`, enforce this wording:

```markdown
- 产品定义使用“声骸数据管理与本地离线识别系统”，不把 WPF 工程声明为本仓库组成。
- “本地离线识别”说明由独立 Windows 客户端完成。
- “WPF 快速采集入口”改为“外部本地识别客户端采集入口”。
- “WPF 本地助手在后台”改为“外部本地识别客户端在后台”。
- Web 与本地助手分工保留，但用技术中立的外部客户端措辞。
- 长期范围中的 WPF 项改为“独立 Windows 本地识别客户端协作”。
- 后台性能实现细节指向客户端仓库，不再由本文声明源文件 owner。
```

- [ ] **Step 2: 重写架构中的客户端 owner**

In `docs/architecture.md`:

```markdown
- 系统现实改为 Django 后端、Vue Web、外部 Windows 本地识别客户端三个部署单元。
- OCR 主路径改为“外部客户端本地截图 -> 本地离线 OCR -> 结构化结果 -> 后端 API -> 数据库”。
- 将“WPF 是日常助手入口”改为“外部本地识别客户端是日常助手入口”。
- Django owner 保留服务端认证、`GameAccount`、recognition 和回滚。
- Vue owner 保持不承担窗口检测、截图与本地 OCR。
- 删除仓库内 WPF 目录结构、WPF owner 判断和 WPF 热点路径。
- 新增“外部客户端协作边界”：客户端仓库拥有桌面 UI、截图、OCR、缓存和本地运行时；本仓库只拥有 API 与服务端兼容。
- 禁止事项保留不上传完整截图、不直接写数据库、不触碰游戏进程。
- 与其他文档关系删除已移除的 WPF UI 规范链接。
```

- [ ] **Step 3: 更新工程质量与代码组织**

In `docs/engineering-quality.md`:

```markdown
- 将“Web 与 WPF 看到同一状态”改为“Web 与外部本地识别客户端消费同一服务端状态”。
- 删除源仓库 WPF test/build 命令与 WPF 文件热点。
- API、recognition、`GameAccount` 变更必须运行兼容响应测试。
- 外部客户端自身截图/OCR/性能验证由客户端仓库负责。
```

In `docs/code-organization-and-style.md`:

```markdown
- 删除 `WuwaAssistant/` 目录结构与 WPF code-behind owner。
- 保留 Django、Vue 和文档 owner。
- 加入：本仓库不新增桌面客户端源码；跨仓库协作只通过公开 API 契约。
```

- [ ] **Step 4: 更新 API 与预留字段契约**

In `docs/api-and-data-contracts.md`:

```markdown
- 文档定位改为 Django、Web 与外部本地识别客户端之间的契约。
- 所有“WPF”调用方措辞改为“外部本地识别客户端”。
- `GameAccount` 稳定字段继续包含 `server` 和 `nickname`。
- 在 `GameAccount` 规则下加入：
  - `server` 与 `nickname` 是未废弃的预留可选字段。
  - 当前响应保持空字符串兼容，当前写入继续忽略。
  - 客户端不能依赖它们具有非空语义。
  - 启用真实语义前必须另行确认校验、权限、迁移与 UI。
- 客户端 API owner 改为外部仓库；源仓库只约束服务端响应与兼容。
```

- [ ] **Step 5: 更新安全和隐私边界**

In `docs/security-privacy-and-data-boundaries.md`:

```markdown
- 将 WPF 特定措辞改为“外部本地识别客户端”。
- 明确客户端仓库负责窗口检测、截图、OCR、本地缓存和诊断实现。
- Wuwa 继续负责认证、ownership、识别写入与回滚安全。
- 保留完整截图不进入常规上传路径、OCR 默认本地离线、不触碰游戏进程。
- 不在本仓库记录或提交客户端私有地址、用户路径、cookie、session、截图或日志。
```

- [ ] **Step 6: 重写源仓库后台运行与性能规范**

Rewrite `docs/performance-and-background-runtime.md` around source-owned runtime:

```markdown
# 后台运行与性能规范

## 文档定位

本文定义 Wuwa Django 后端与 Vue Web 工作台拥有的运行和性能边界，并记录外部本地识别客户端必须满足的跨仓库契约。客户端内部状态机、窗口检测、截图、OCR worker、缓存实现和桌面指标由独立客户端仓库维护。

## 服务端原则

- recognition 写入保持认证、`GameAccount` ownership、幂等和回滚。
- API 查询避免无界列表与重复数据库访问。
- 后端不可达或请求失败时返回稳定错误，不以静默部分写入换取吞吐。
- 性能优化不能削弱数据归属、冲突、低置信度和回滚保护。

## Web 原则

- 统计、预测和评估避免无意义重复请求与重复计算。
- 加载、空、错误、过期和刷新状态必须可见。
- 性能改动运行命中测试与生产构建，不以隐藏信息替代优化。

## 外部本地识别客户端契约

- 自动识别关闭或未找到目标窗口时不得运行 OCR。
- 常规流程只提交结构化结果，不上传完整截图。
- 相同截图 hash 应重复抑制。
- OCR 不阻塞 UI，且同一时间最多一个 worker。
- 后端不可达时不得无限快速重试或造成任务无界堆积。
- 低置信度或字段缺失不能绕过复核与回滚保护。

上述客户端实现细节、测量指标和桌面验收在客户端仓库维护；本仓库只在 API 和数据边界变化时验证兼容性。

## 验证

- Django recognition、ownership、幂等和回滚测试。
- Vue 命中测试与生产构建。
- API 响应形状和错误契约测试。
- 改变外部客户端契约时同步两个仓库或提供兼容期。
```

- [ ] **Step 7: 更新界面、修复、路线与发布文档**

In `docs/product-interface-principles.md`:

```markdown
- 将三端/两端 WPF 措辞改为 Web 与外部本地识别客户端。
- 保留账号、UID、状态语义和产品气质一致性。
- 删除仓库内 WPF XAML、页面或 Style owner 说明。
```

In `docs/issue-fix-boundary-guardrails.md`:

```markdown
- 删除 WPF 文件路径与 code-behind 修复落点。
- API/recognition 修复若改变客户端契约，必须同步外部客户端或保留兼容。
```

In `docs/roadmap-and-prioritization.md`:

```markdown
- WPF UI、截图、OCR、缓存和后台运行实施项改为由独立客户端仓库规划。
- 本仓库路线保留 Django、Vue、recognition API、复核和跨仓库兼容。
```

In `docs/versioning-and-release-policy.md`:

```markdown
- Wuwa 与 Wuwa-Assistant 独立版本、独立发布。
- API 破坏性变化必须先提供兼容期或协调客户端同步发布。
- 本仓库发布不包含 WPF 构建产物。
```

- [ ] **Step 8: 检查活跃长期文档边界**

Run:

```powershell
$activeDocs = @('AGENTS.md', 'README.md', 'PRODUCT.md') +
    (Get-ChildItem docs -File | ForEach-Object { $_.FullName })
rg -n "WuwaAssistant/|wpf-assistant-ui-guidelines|WPF code-behind|dotnet .*WuwaAssistant" $activeDocs
rg -n "外部本地识别客户端|独立 Windows|预留可选字段|兼容期" $activeDocs
git diff --check
```

Expected: 第一条无输出；第二条在产品、架构、API、安全、性能和发布规范中命中；diff check 无输出。

---

### Task 10: 补实施记录并让源仓库测试转绿

**Files:**

- Create: `docs/archive/2026-07-20-wpf-repository-extraction-implementation.md`
- Test: `Wuwa/api/tests/test_backend_structure.py`
- Test: `Wuwa/api/tests/test_views.py`
- Test: all Django and Vue suites

- [ ] **Step 1: 创建实施归档**

Create `docs/archive/2026-07-20-wpf-repository-extraction-implementation.md` with:

```markdown
# WPF 独立仓库迁移实施记录

**日期：** 2026-07-20

## 实际结果

- 使用 `git subtree split --prefix=WuwaAssistant` 提取了 WPF 目录历史。
- 创建并验证了 private 的 `Wuwa-Assistant` 独立仓库。
- 目标仓库根目录包含 WPF UI、Core、Tests、解决方案和独立长期规范。
- 目标默认后端地址统一为 `http://127.0.0.1:8001`，并保留本地覆盖能力。
- Wuwa 源仓库删除了 WPF 活跃工程和活跃 WPF UI 专项规范。
- Django recognition、识别会话/快照、回滚和 Vue 复核能力继续保留。
- `GameAccount.server` 与 `nickname` 保留为未废弃的预留可选字段；当前仍不恢复业务写入。

## 边界变化

Wuwa 现在拥有 Django 后端、Vue Web 工作台和服务端 API 契约。独立客户端仓库拥有 Windows UI、本地截图、离线 OCR、缓存、后台运行和客户端 API 消费。

## 历史资料

既有 `docs/archive/`、`docs/superpowers/` 与 `memory/` 中的 WPF 路径和实现说明作为历史证据保留，不再覆盖当前长期规范。

## 验证证据

- 目标仓库测试：通过。
- 目标仓库构建：通过。
- 目标远端 private、`main` 与本地提交一致：通过。
- 源仓库 Django 测试：通过。
- 源仓库 Vue 测试：通过。
- 源仓库 Vue 生产构建：通过。
- `git diff --check`：通过。
```

If any listed verification did not pass, do not write “通过”; replace that single line with the exact command, exit code and failure summary before committing.

- [ ] **Step 2: 运行新结构测试确认通过**

Run:

```powershell
Set-Location Wuwa
.\.venv\Scripts\python.exe manage.py test `
    api.tests.test_backend_structure.BackendStructureTests.test_desktop_client_is_owned_by_an_external_repository
Set-Location ..
```

Expected: PASS.

- [ ] **Step 3: 运行预留字段契约测试**

Run:

```powershell
Set-Location Wuwa
.\.venv\Scripts\python.exe manage.py test `
    api.tests.test_views.ApiViewTests.test_game_account_list_create_and_bind_default
Set-Location ..
```

Expected: PASS，断言响应继续包含空字符串 `server` 和 `nickname`。

- [ ] **Step 4: 确认没有意外 schema 变化**

Run:

```powershell
Set-Location Wuwa
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
Set-Location ..
```

Expected: `No changes detected`。

- [ ] **Step 5: 运行完整 Django 测试**

Run:

```powershell
Set-Location Wuwa
.\.venv\Scripts\python.exe manage.py test
Set-Location ..
```

Expected: full suite passes with exit code 0.

- [ ] **Step 6: 运行完整 Vue 测试**

Run:

```powershell
Set-Location WuwaFrontend
..\.tools\node\npm.cmd test
Set-Location ..
```

Expected: all Node tests pass with exit code 0.

- [ ] **Step 7: 运行 Vue 生产构建**

Run:

```powershell
Set-Location WuwaFrontend
..\.tools\node\npm.cmd run build
Set-Location ..
```

Expected: Vite build succeeds with exit code 0.

- [ ] **Step 8: 执行源仓库最终静态审计**

Run:

```powershell
git status --short
git diff --check
git ls-files WuwaAssistant
git ls-files docs/wpf-assistant-ui-guidelines.md
$activeTopLevelDocs = Get-ChildItem docs -File | ForEach-Object { $_.FullName }
rg -n "WuwaAssistant/|wpf-assistant-ui-guidelines|dotnet .*WuwaAssistant" `
    AGENTS.md README.md PRODUCT.md $activeTopLevelDocs
rg -n '"server": ""|"nickname": ""' Wuwa/accounts/serializers.py Wuwa/api/tests/test_views.py
```

Expected:

- status 只显示本计划文件；
- diff check 无输出；
- 两个 `git ls-files` 命令无输出；
- 活跃入口和顶层长期文档没有旧仓库路径或 WPF 构建命令；
- serializer 和测试仍命中预留字段空响应。

- [ ] **Step 9: 暂存源仓库迁移变更**

Run:

```powershell
git add -- `
    .gitignore `
    AGENTS.md `
    README.md `
    PRODUCT.md `
    docs/developer-onboarding.md `
    docs/product-principles-and-scope.md `
    docs/architecture.md `
    docs/engineering-quality.md `
    docs/code-organization-and-style.md `
    docs/api-and-data-contracts.md `
    docs/security-privacy-and-data-boundaries.md `
    docs/performance-and-background-runtime.md `
    docs/product-interface-principles.md `
    docs/issue-fix-boundary-guardrails.md `
    docs/roadmap-and-prioritization.md `
    docs/versioning-and-release-policy.md `
    docs/archive/2026-07-20-wpf-repository-extraction-implementation.md `
    docs/wpf-assistant-ui-guidelines.md `
    Wuwa/api/tests/test_backend_structure.py `
    Wuwa/api/tests/test_models.py `
    Wuwa/api/tests/test_views.py `
    WuwaAssistant
git diff --cached --check
git diff --cached --stat
```

Expected: staged diff only contains approved deletions, source docs, three backend test files, `.gitignore` and archive record.

- [ ] **Step 10: 提交源仓库迁移**

Run:

```powershell
git commit -m "refactor: move WPF client to independent repository"
```

Expected: commit succeeds.

- [ ] **Step 11: 推送源分支并验证**

Run:

```powershell
git push
$sourceHead = git rev-parse HEAD
$sourceUpstream = git rev-parse '@{upstream}'
git status --short --branch
"SOURCE_HEAD=$sourceHead"
"SOURCE_UPSTREAM=$sourceUpstream"
```

Expected: SHA values match and source worktree is clean.

---

### Task 11: 远端终验与安全清理临时状态

**Files:**

- Verify: Wuwa source repository
- Verify: `weiyanju/Wuwa-Assistant`
- Delete local-only: ignored source `WuwaAssistant/.vs/` if present
- Delete local-only: temporary target clone
- Delete Git refs: `assistant-migration`, `codex/wpf-history-split`

- [ ] **Step 1: 最终验证两个远端**

Run:

```powershell
$sourceHead = git rev-parse HEAD
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
$assistantHead = git -C $assistantRepo rev-parse HEAD
"SOURCE_HEAD=$sourceHead"
"TARGET_HEAD=$assistantHead"
```

Use the connected GitHub app to verify:

```text
Wuwa source feature branch head == $sourceHead
Wuwa-Assistant main head == $assistantHead
Wuwa-Assistant visibility == private
```

Expected: all three conditions true.

- [ ] **Step 2: 清理源仓库忽略的 WPF IDE 目录**

Resolve and validate before deletion:

```powershell
$sourceRoot = (Resolve-Path .).Path
$ignoredWpfRoot = Join-Path $sourceRoot 'WuwaAssistant'
if (Test-Path -LiteralPath $ignoredWpfRoot) {
    $resolvedIgnoredWpfRoot = (Resolve-Path -LiteralPath $ignoredWpfRoot).Path
    $expectedIgnoredWpfRoot = [System.IO.Path]::GetFullPath($ignoredWpfRoot)
    if ($resolvedIgnoredWpfRoot -ne $expectedIgnoredWpfRoot) {
        throw "Unexpected WPF cleanup target: $resolvedIgnoredWpfRoot"
    }
    $remainingFiles = Get-ChildItem -LiteralPath $resolvedIgnoredWpfRoot -Recurse -Force -File
    $unexpected = $remainingFiles | Where-Object {
        $_.FullName -notlike (Join-Path $resolvedIgnoredWpfRoot '.vs*')
    }
    if ($unexpected) {
        throw "Unexpected files remain under source WuwaAssistant."
    }
    Remove-Item -LiteralPath $resolvedIgnoredWpfRoot -Recurse -Force
}
```

Expected: only ignored `.vs` content is removed; if anything else exists, cleanup stops.

- [ ] **Step 3: 删除源仓库临时 remote 与 split branch**

Run:

```powershell
git remote remove assistant-migration
git branch -D codex/wpf-history-split
git remote -v
git branch --list codex/wpf-history-split
```

Expected: temporary remote and split branch are absent. This is safe only because target remote `main` has already been verified at `$assistantHead`.

- [ ] **Step 4: 安全删除临时 clone**

Run:

```powershell
$assistantRepo = Join-Path ([System.IO.Path]::GetTempPath()) 'Wuwa-Assistant-migration'
$assistantHead = git -C $assistantRepo rev-parse HEAD
$resolvedAssistantRepo = (Resolve-Path -LiteralPath $assistantRepo).Path
$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
if (-not $resolvedAssistantRepo.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Temporary clone is outside the system temp directory."
}
if ((git -C $resolvedAssistantRepo status --porcelain).Length -ne 0) {
    throw "Temporary clone has uncommitted changes."
}
if ((git -C $resolvedAssistantRepo rev-parse HEAD) -ne $assistantHead) {
    throw "Temporary clone HEAD does not match verified target HEAD."
}
Remove-Item -LiteralPath $resolvedAssistantRepo -Recurse -Force
```

Expected: only the verified clean temporary clone is deleted.

- [ ] **Step 5: 最终状态报告**

Run:

```powershell
git status --short --branch
git log -3 --oneline
git ls-files WuwaAssistant
git ls-files docs/wpf-assistant-ui-guidelines.md
```

Expected: source branch clean and synchronized; deleted paths are not tracked.

Report:

- target repository created as private;
- target and source commit SHAs;
- WPF tests/build results;
- Django tests, Vue tests and Vue build results;
- source removal summary;
- `server` / `nickname` reserved compatibility confirmation;
- any validation not run, with exact reason.
