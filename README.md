# Wuwa

Wuwa 是一个前后端与本地助手分离的开发环境：

- `Wuwa/`: Django 后端。
- `WuwaFrontend/`: Vue + Vite Web 工作台。
- `WuwaAssistant/`: WPF 本地助手与核心客户端。

新开发者必须先阅读 [开发者入门手册](docs/developer-onboarding.md)，再按本 README 启动本地环境。进行前端或 UI 开发前，还必须阅读 [Web 设计系统总入口](DESIGN.md)。

## 文档

长期项目规范：

- [产品上下文](PRODUCT.md)
- [Web 设计系统总入口](DESIGN.md)
- [结构化设计系统](.impeccable/design.json)
- [产品原则与范围](docs/product-principles-and-scope.md)
- [开发者入门手册](docs/developer-onboarding.md)
- [架构规范](docs/architecture.md)
- [工程质量规范](docs/engineering-quality.md)
- [代码组织与风格规范](docs/code-organization-and-style.md)
- [后台运行与性能规范](docs/performance-and-background-runtime.md)
- [问题修复边界守则](docs/issue-fix-boundary-guardrails.md)
- [API 与数据契约规范](docs/api-and-data-contracts.md)
- [安全、隐私与数据边界规范](docs/security-privacy-and-data-boundaries.md)
- [产品界面统一原则](docs/product-interface-principles.md)
- [Web UI 设计系统 V2.1](docs/web-ui-design-system-v2.md)
- [Web 首页设计](docs/web-homepage-terminal-design.md)
- [WPF 本地助手 UI 规范](docs/wpf-assistant-ui-guidelines.md)
- [Web 工作台 UI 规范](docs/web-workbench-ui-guidelines.md)
- [路线图与优先级](docs/roadmap-and-prioritization.md)
- [版本与发布策略](docs/versioning-and-release-policy.md)

历史资料和阶段性文档归档到 `docs/archive/`。当前既有的 `docs/superpowers/plans/`、`docs/superpowers/specs/` 与 `memory/` 仍作为专项背景和历史决策保留，不替代上述长期规范。

## 开发环境

本项目默认在 Windows + PowerShell 环境下开发。推荐从仓库根目录启动服务。

### 必备工具

- Git。
- Python 虚拟环境：`Wuwa/.venv/`，用于运行 Django 后端。
- PostgreSQL：默认连接 `127.0.0.1:5432/wuwa_dev`。
- Node.js：优先使用仓库内的 `.tools/node/`。
- .NET SDK 10：用于 `WuwaAssistant` WPF 本地助手。

不要提交 `.venv/`、`node_modules/`、`dist/`、`build/`、`tmp/`、本地数据库、日志或私有配置。

### 首次拉取

```powershell
git clone https://github.com/weiyanju/Wuwa-echo-lab.git
cd Wuwa-echo-lab
git switch main
git pull origin main
```

接手正在开发的功能分支时，将 `<branch-name>` 替换为实际远端分支：

```powershell
git fetch origin
git switch --track origin/<branch-name>
```

更多分支规则见 [开发者入门手册](docs/developer-onboarding.md)。

### 一键启动

仓库根目录提供了本地开发启动脚本：

```powershell
.\start-dev.bat --check
.\start-dev.bat
```

`--check` 只检查 Node、npm、路径和启动脚本依赖，不启动服务。`start-dev.bat` 会安装依赖、执行 Django migration，并分别打开后端和前端窗口。该脚本只用于本地开发，数据库凭据应在运行前通过环境变量明确提供，不能把本地开发值用于共享环境或生产环境。

可选环境变量：

```powershell
$env:DB_NAME = "wuwa_dev"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "your-password"
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "5432"
$env:SKIP_INSTALL = "1"
$env:SKIP_MIGRATE = "1"
.\start-dev.bat
```

如果需要通过 SSH 隧道连接数据库，再设置：

```powershell
$env:DB_USE_SSH_TUNNEL = "1"
$env:KEY_PATH = "C:\path\to\ssh.pem"
$env:SSH_USER = "admin"
$env:SSH_HOST = "your-server"
.\start-dev.bat
```

### 后端

手动启动 Django 后端：

```powershell
cd Wuwa
$env:DB_NAME = "wuwa_dev"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "your-password"
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "5432"
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8001
```

后端健康检查：

```text
http://127.0.0.1:8001/api/health/
```

数据库凭据不是仓库稳定默认值。手动启动、测试和部署都应显式设置 `DB_USER` 与 `DB_PASSWORD`，不要依赖 `settings.py` 或启动脚本中的本地开发回退值。

### 前端

手动启动 Vue + Vite 前端：

```powershell
cd WuwaFrontend
$env:PATH = "$PWD\..\.tools\node;$env:PATH"
$env:npm_config_cache = "$PWD\..\.tools\npm-cache"
..\.tools\node\npm.cmd install
..\.tools\node\npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

前端开发地址：

```text
http://127.0.0.1:5173/
```

Vite 会把 `/api` 请求代理到 `http://127.0.0.1:8001`，所以前端开发时直接调用 `/api/...`。

### WuwaAssistant

本地助手位于 `WuwaAssistant/`，包含 WPF UI、Core 客户端和测试项目。

```powershell
dotnet build WuwaAssistant\WuwaAssistant.slnx
dotnet run --project WuwaAssistant\WuwaAssistant\WuwaAssistant.csproj
```

运行 Assistant 测试：

```powershell
dotnet run --project WuwaAssistant\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj
```

### 验证

前端：

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test
..\.tools\node\npm.cmd run build
```

后端：

```powershell
cd Wuwa
$env:DB_PASSWORD = "your-password"
.\.venv\Scripts\python.exe manage.py test
```

WPF Assistant：

```powershell
dotnet build WuwaAssistant\WuwaAssistant.slnx
dotnet run --project WuwaAssistant\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj
```

### 常见问题

- `fe_sendauth: no password supplied`: 设置 `DB_PASSWORD`，或调整本地 PostgreSQL 认证方式。
- 前端无法访问 API：确认 Django 后端运行在 `http://127.0.0.1:8001`，或确认 `VITE_BACKEND_TARGET` 指向了你设置的 `BACKEND_PORT`。
- `5173` 或 `8001` 端口被占用：关闭旧服务，或设置 `FRONTEND_PORT` / `BACKEND_PORT` 后再运行 `start-dev.bat`。
- npm 下载慢或缓存异常：确认 `npm_config_cache` 指向仓库内 `.tools/npm-cache`。
