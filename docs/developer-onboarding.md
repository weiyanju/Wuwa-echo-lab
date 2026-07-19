# 开发者入门手册

本文是新开发者、另一台电脑、或新的 AI 协作者进入 `Wuwa` 项目前的默认入口。目标是让仓库拉下来以后可以快速进入正确分支、读对文档、按同一套工程和设计规则继续开发。

## 项目结构

`Wuwa` 是一个前后端与本地助手分离的开发环境：

- `Wuwa/`: Django 后端，负责账号、声骸、识别记录、统计和 API。
- `WuwaFrontend/`: Vue + Vite Web 工作台。
- `WuwaAssistant/`: WPF 本地助手与可脱离 UI 测试的 Core 项目。
- `PRODUCT.md`: 面向设计工具和协作者的精简产品上下文。
- `DESIGN.md`: Web 视觉 token、字体、组件语言和交互状态的当前总入口。
- `.impeccable/design.json`: 与 `DESIGN.md` 同步的结构化设计系统。
- `docs/`: 当前有效的长期规范与设计文档。
- `docs/archive/`: 已完成阶段、实现记录和历史背景。
- `docs/superpowers/`: 阶段计划和规格记录，作为背景材料保留。
- `memory/`: 聚焦性能问题的专项调查与历史决策，不作为长期规范入口。

不要把 `tmp/`、`.venv/`、`node_modules/`、`dist/`、`build/`、`db.sqlite3`、日志、IDE 配置或本地私有说明提交到仓库。

## 开发前必读

先读长期规范，再读当前功能对应的阶段资料。默认顺序如下：

1. [产品上下文](../PRODUCT.md)
2. [产品原则与范围](./product-principles-and-scope.md)
3. [架构规范](./architecture.md)
4. [工程质量规范](./engineering-quality.md)
5. [代码组织与风格规范](./code-organization-and-style.md)
6. [API 与数据契约规范](./api-and-data-contracts.md)
7. [安全、隐私与数据边界规范](./security-privacy-and-data-boundaries.md)
8. [后台运行与性能规范](./performance-and-background-runtime.md)
9. [产品界面统一原则](./product-interface-principles.md)
10. 对应端的 UI 规范：
   - [Web 设计系统总入口](../DESIGN.md)
   - [Web UI 设计系统 V2.1](./web-ui-design-system-v2.md)
   - [Web 工作台 UI 规范](./web-workbench-ui-guidelines.md)
   - [WPF 本地助手 UI 规范](./wpf-assistant-ui-guidelines.md)
11. [版本与发布策略](./versioning-and-release-policy.md)

如果正在接手某个具体功能，再补读 `docs/archive/` 或 `docs/superpowers/` 里与该功能相关的历史记录。

## 分支策略

本项目默认使用功能分支工作流：

```text
main
  稳定主线。能够作为新环境拉取后的基线。

codex/<feature-name>
  功能开发分支。每个可独立验收的功能、重构或 UI 主题使用一个分支。

release/<major.minor>
  只在已经发布旧版本、且需要维护旧版本补丁时创建。

vX.Y.Z
  正式版本 tag。版本号默认用 tag 表达，不用长期版本分支表达。
```

新功能不要直接在 `main` 上开发。功能完成、测试通过、文档同步后，再合并回 `main`。功能分支合并后可以删除；未合并的功能分支不要强删。

## 拉取代码

首次拉取：

```powershell
git clone https://github.com/weiyanju/Wuwa-echo-lab.git
cd Wuwa-echo-lab
git switch main
```

如果要接手正在开发的功能分支：

```powershell
git fetch origin
git switch <branch-name>
```

如果本地还没有该分支：

```powershell
git fetch origin
git switch --track origin/<branch-name>
```

开始新功能：

```powershell
git switch main
git pull origin main
git switch -c codex/<feature-name>
```

提交前检查当前分支和改动：

```powershell
git status --short --branch
git diff --stat
```

## 本地启动

当前仓库处于 pre-release 本地开发阶段，Django 固定使用本机 PostgreSQL，不使用 SQLite 作为替代路径。批准的默认值为：数据库 `wuwa_dev`、角色 `PostgreSQL`、密码 `root`、主机 `127.0.0.1`、端口 `5432`。新的开发者和 AI 协作者应直接使用这些默认值，不需要重复确认数据库方案；如果本机配置不同，再通过环境变量覆盖。

推荐先从仓库根目录运行本地专用启动器：

```powershell
.\start-dev.bat --check
.\start-dev.bat
```

启动器只接受 `127.0.0.1` 或 `localhost`，不负责 SSH 隧道、远端数据库或生产部署。

后端：

```powershell
cd Wuwa
$env:DB_NAME = "wuwa_dev"
$env:DB_USER = "PostgreSQL"
$env:DB_PASSWORD = "root"
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "5432"
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8001
```

健康检查：

```text
http://127.0.0.1:8001/api/health/
```

前端：

```powershell
cd WuwaFrontend
$env:PATH = "$PWD\..\.tools\node;$env:PATH"
$env:npm_config_cache = "$PWD\..\.tools\npm-cache"
..\.tools\node\npm.cmd install
..\.tools\node\npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

开发地址：

```text
http://127.0.0.1:5173/
```

Vite 会把 `/api` 代理到 `http://127.0.0.1:8001`，前端开发时直接调用 `/api/...`。

### 生产配置边界

服务器部署必须设置 `WUWA_ENV=production`，并通过部署环境显式提供 `DJANGO_SECRET_KEY`、`DB_PASSWORD` 和逗号分隔的 `DJANGO_ALLOWED_HOSTS`。生产模式默认关闭 `DEBUG`，不继承本地数据库密码和 localhost 的 CORS/CSRF 来源；缺少必需值或显式开启调试时会拒绝启动。

Web 与 API 不同源时，再按实际地址设置逗号分隔的 `DJANGO_CORS_ALLOWED_ORIGINS` 与 `DJANGO_CSRF_TRUSTED_ORIGINS`。所有真实密码、域名、远端地址和私有路径只保留在服务器或不入库的本地配置中。

## 代码落点规则

先判断 owner，再写代码：

- Django 业务流程进入对应 app 的 `services.py` 或 `services/`。
- Django API 请求入口保持在 view 层，view 只做请求解析、权限检查、调用 service 和返回响应。
- Vue API 调用进入 `WuwaFrontend/src/services/`。
- Vue 页面级功能进入 `WuwaFrontend/src/features/<owner>/`。
- Vue 可复用状态进入 `src/composables/`，可复用 UI 进入 `src/components/`。
- Vue 已稳定且被多个 feature 共同使用的纯逻辑进入 `src/shared/`；页面状态、API 调用和单页展示映射仍留在原 owner。
- Vue 静态业务数据进入 `src/data/`。
- 前端公开静态资源进入 `WuwaFrontend/public/`，源码内引用资源进入 `WuwaFrontend/src/assets/`。
- WPF UI 只放在 `WuwaAssistant/WuwaAssistant/`，核心业务能力放在 `WuwaAssistant/WuwaAssistant.Core/`。

入口文件要薄。不要继续把复杂业务塞进 `App.vue`、Django `views.py` 或 WPF code-behind。

## 设计与 UI 规则

Web 工作台开发必须遵循：

- [产品上下文](../PRODUCT.md)
- [Web 设计系统总入口](../DESIGN.md)
- [产品界面统一原则](./product-interface-principles.md)
- [Web 工作台 UI 规范](./web-workbench-ui-guidelines.md)
- [Web UI 设计系统 V2.1](./web-ui-design-system-v2.md)

涉及字体、字重、字距或数字排版时，还必须阅读 [Web 字体设计系统](./superpowers/specs/2026-07-13-wuwa-typography-system-design.md)。

WPF 本地助手开发必须遵循：

- [WPF 本地助手 UI 规范](./wpf-assistant-ui-guidelines.md)

UI 改动不要只以“能显示”为完成标准。需要检查响应式布局、视觉层级、交互状态、暗色/浅色主题、空状态、错误状态，以及是否复用了已有 token、组件和样式入口。

## 提交与推送

提交前默认执行：

```powershell
git status --short --branch
git diff --stat
```

按风险运行验证：

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test
..\.tools\node\npm.cmd run build
```

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test
```

WPF 相关改动还需要：

```powershell
dotnet run --project WuwaAssistant\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj
dotnet build WuwaAssistant\WuwaAssistant.slnx
```

提交时只 stage 本次需要进入仓库的文件，不要无脑 `git add .`。特别确认 `tmp/`、本地数据库、日志、缓存和私有说明没有被加入。

推送当前功能分支：

```powershell
git push -u origin codex/<feature-name>
```

## 合并与清理

功能完成后：

1. 确认功能分支已推送。
2. 确认测试和构建通过，或在提交说明里写清未验证原因。
3. 合并回 `main`。
4. 在 `main` 上再次运行必要验证。
5. 删除已经合并的功能分支。

安全删除本地分支：

```powershell
git branch -d codex/<feature-name>
```

删除远端分支：

```powershell
git push origin --delete codex/<feature-name>
```

不要对未合并分支使用强制删除，除非已经确认分支内容不再需要。

## 版本管理

当前项目仍处于 MVP / pre-release 阶段。默认不要创建正式 `vX.Y.Z` tag，也不要创建版本分支。

正式版本线建立后：

- 用 `vX.Y.Z` tag 标记发布版本。
- 只在维护旧版本补丁时创建 `release/<major.minor>`。
- 版本策略、发布前验证和 changelog 规则以 [版本与发布策略](./versioning-and-release-policy.md) 为准。

## 开发完成检查

完成一个独立功能、修复或重构前，至少确认：

- 代码放在正确 owner 下。
- 开发前已经阅读当前任务对应的长期规范。
- 没有把复杂逻辑塞进入口层。
- 没有重复实现已有 API、service、component、style 或 formatter。
- API、数据库、权限、隐私、OCR、截图或后台运行边界变更已经同步相关文档。
- 测试和构建范围与风险匹配。
- 必要的实现记录已经写入 `docs/archive/`。
- 长期规则变化已经同步到 `docs/` 顶层规范。
