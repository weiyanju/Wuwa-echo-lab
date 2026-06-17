# Wuwa

Separated frontend/backend development environment:

- Backend: Django in `Wuwa`
- Frontend: Vue + Vite in `WuwaFrontend`

## 文档

长期项目规范：

- [产品原则与范围](docs/product-principles-and-scope.md)
- [架构规范](docs/architecture.md)
- [工程质量规范](docs/engineering-quality.md)
- [代码组织与风格规范](docs/code-organization-and-style.md)
- [后台运行与性能规范](docs/performance-and-background-runtime.md)
- [问题修复边界守则](docs/issue-fix-boundary-guardrails.md)
- [API 与数据契约规范](docs/api-and-data-contracts.md)
- [安全、隐私与数据边界规范](docs/security-privacy-and-data-boundaries.md)
- [产品界面统一原则](docs/product-interface-principles.md)
- [WPF 本地助手 UI 规范](docs/wpf-assistant-ui-guidelines.md)
- [Web 工作台 UI 规范](docs/web-workbench-ui-guidelines.md)
- [路线图与优先级](docs/roadmap-and-prioritization.md)
- [版本与发布策略](docs/versioning-and-release-policy.md)

历史资料和阶段性文档归档到 `docs/archive/`。当前既有的 `docs/superpowers/plans/` 与 `docs/superpowers/specs/` 仍作为阶段资料保留，不替代上述长期规范。

## Backend

```powershell
cd Wuwa
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Backend health check:

```text
http://127.0.0.1:8000/api/health/
```

## Frontend

```powershell
cd WuwaFrontend
$env:PATH = "$PWD\..\.tools\node;$env:PATH"
$env:npm_config_cache = "$PWD\..\.tools\npm-cache"
..\.tools\node\npm.cmd install
..\.tools\node\npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Frontend development URL:

```text
http://127.0.0.1:5173/
```

Vite proxies `/api` requests to `http://127.0.0.1:8000`, so frontend code can call `/api/...` during development.
