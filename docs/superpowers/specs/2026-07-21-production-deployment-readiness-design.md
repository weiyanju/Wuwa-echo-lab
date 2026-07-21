# Wuwa 生产部署准备设计

**日期：** 2026-07-21
**目标分支：** `codex/production-deployment-readiness`
**目标环境：** 阿里云杭州、Ubuntu 24.04、2 核 CPU、2 GiB 内存、40 GiB 系统盘

## 1. 目标

本次工作把 Wuwa 从“存在生产环境变量门槛”推进到“仓库具备可复用的单机生产部署资产”。完成后，仓库应能支持在 Ubuntu 24.04 上使用 Nginx、systemd、Gunicorn 和本机 PostgreSQL 部署 Django API 与 Vue Web 工作台。

部署分为两类操作：

1. 首次服务器初始化：创建低权限运行账户、安装系统软件、创建数据库、写入服务器私有环境变量、安装 Nginx/systemd 配置和申请 HTTPS 证书。
2. 日常应用发布：通过仓库内一键脚本更新 `main`、安装应用依赖、执行部署检查、构建前端、迁移数据库、同步静态文件、重启服务并验证健康状态。

## 2. 非目标

本次不包含：

- 实际登录或修改远程服务器。
- 在仓库中保存真实域名、公网 IP、数据库密码、Django secret、SSH 用户凭据或证书路径。
- Docker、Kubernetes、云托管数据库或 GitHub Actions 自动发布。
- 自动申请 ICP 备案或自动配置阿里云控制台防火墙。
- 自动回滚数据库 migration。
- 将完整截图或 OCR 流程迁移到云端。

## 3. 生产架构

生产请求链路为：

```text
浏览器 / 本地识别客户端
            |
          HTTPS
            |
          Nginx
          /   \
  Vue 静态文件  /api/ 反向代理
                    |
             Gunicorn + Django
                    |
        本机 PostgreSQL 127.0.0.1:5432
```

Nginx 是唯一公网入口，只开放 80 和 443。Gunicorn 只监听 `127.0.0.1:8001`，PostgreSQL 只接受本机连接，不向公网开放 8001 或 5432。

Vue 与 API 使用同一域名。前端继续使用相对路径 `/api`，生产环境不需要跨域访问。若未来拆分 Web 与 API 域名，再通过现有的 `DJANGO_CORS_ALLOWED_ORIGINS` 和 `DJANGO_CSRF_TRUSTED_ORIGINS` 显式配置。

## 4. 身份与权限边界

服务器使用三个互不替代的身份：

- SSH 管理用户：由服务器所有者使用，用于首次初始化、部署和必要的 `sudo` 操作。
- Linux 服务账户 `piaobozhe`：不可通过 SSH 登录、无登录密码、无 sudo 权限，只负责运行 Gunicorn 和读取应用文件。
- PostgreSQL 角色 `wuwa_app`：只拥有 Wuwa 生产数据库，不是 Linux 用户，也不能登录服务器。

systemd 使用：

```ini
User=piaobozhe
Group=piaobozhe
```

应用固定部署在 `/srv/wuwa/app`，Vue 构建产物同步到 `/var/www/wuwa`。服务器私有环境变量保存在 `/etc/wuwa/wuwa.env`，文件所有者和权限为 `root:piaobozhe`、`0640`。Nginx 的 `www-data` 用户不能读取该文件。

## 5. 仓库文件边界

### 5.1 Django 设置

修改 `Wuwa/wuwa/settings.py`：

- 保持开发环境现有行为不变。
- 生产环境设置 `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")`。
- 生产环境启用 `SECURE_SSL_REDIRECT`。
- 生产环境启用 `SESSION_COOKIE_SECURE` 和 `CSRF_COOKIE_SECURE`。
- 生产环境默认设置一小时 HSTS。
- `SECURE_HSTS_INCLUDE_SUBDOMAINS` 与 `SECURE_HSTS_PRELOAD` 默认关闭。
- 允许通过环境变量调整 HSTS 时长和两个高风险开关。
- 增加 `STATIC_ROOT = BASE_DIR / "staticfiles"`。

HSTS 初始值为 3600 秒。只有在主域名和所有需要保留的子域名持续稳定使用 HTTPS 后，才把时长提升到 31536000 秒。`includeSubDomains` 和 preload 需要单独人工确认，不由部署脚本自动开启。

### 5.2 Python 依赖

修改 `Wuwa/requirements.txt`，固定一个经过本仓库测试的 Gunicorn 版本。生产环境不使用 Django `runserver`。

### 5.3 环境变量样例

新增根目录 `.env.example`，列出：

- `WUWA_ENV`
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_CORS_ALLOWED_ORIGINS`
- `DJANGO_CSRF_TRUSTED_ORIGINS`
- HSTS 相关变量
- `DB_NAME`、`DB_USER`、`DB_PASSWORD`、`DB_HOST`、`DB_PORT`、`DB_CONN_MAX_AGE`
- 外部 HTTPS 健康检查 URL

样例只使用明显不可直接上线的替换标记和文档域名，不包含用户服务器的真实公网 IP 或生产域名。

### 5.4 systemd

新增 `deploy/wuwa.service`：

- 工作目录 `/srv/wuwa/app/Wuwa`。
- 环境变量文件 `/etc/wuwa/wuwa.env`。
- 使用 `/srv/wuwa/app/.venv/bin/gunicorn` 启动 `wuwa.wsgi:application`。
- 使用 2 个 worker、每个 worker 2 个线程。
- 绑定 `127.0.0.1:8001`。
- 失败时自动重启，日志进入 journald。
- 启用 `NoNewPrivileges`、`PrivateTmp`、`ProtectSystem=full`、`ProtectHome=true` 和 `UMask=0027`。

### 5.5 Nginx

新增 `deploy/nginx.conf`：

- 静态根目录 `/var/www/wuwa`。
- `/api/` 代理到 `127.0.0.1:8001`。
- 传递 `Host`、`X-Real-IP`、`X-Forwarded-For` 和 `X-Forwarded-Proto`。
- `/` 使用 `try_files` 回退到 Vue `index.html`。
- 初始模板只监听 HTTP；真实服务器在域名解析和 HTTP 验证完成后由 Certbot 写入证书配置和 HTTP 到 HTTPS 跳转。

模板中的域名是文档域名，安装时必须替换。证书文件、真实域名和真实服务器地址不进入 Git。

### 5.6 一键部署脚本

新增 `deploy/deploy.sh`。脚本面向已经完成首次初始化的服务器，不负责安装 apt 软件包、创建数据库、创建 Linux 用户或签发证书。

脚本由 SSH 管理用户通过 `sudo` 执行。需要 Git、Python、Node 和 Django 权限的命令通过 `runuser` 降权为 `piaobozhe` 执行；只有写入 `/var/www/wuwa`、重启 systemd 服务和读取受保护环境文件的步骤保留 root 权限。`piaobozhe` 本身不获得 sudo 权限。

脚本流程：

1. 使用文件锁拒绝并发部署。
2. 验证在 `/srv/wuwa/app`、当前分支为 `main`、Git 工作区干净。
3. 检查环境变量文件和 Python、Node、npm、curl、rsync、systemctl 等命令。
4. `git fetch origin main`，然后只使用 fast-forward 更新到 `origin/main`。
5. 从 `/etc/wuwa/wuwa.env` 加载生产变量。
6. 创建或复用 `.venv`，安装固定 Python 依赖。
7. 运行 `manage.py check --deploy`。
8. 使用 `npm ci` 安装前端依赖并运行生产构建。
9. 运行 `manage.py migrate --noinput` 和 `manage.py collectstatic --noinput`。
10. 使用 `rsync --delete` 同步 Vue `dist/` 到 `/var/www/wuwa`。
11. 重启 `wuwa.service`。
12. 对环境变量中配置的 HTTPS 健康检查 URL 进行有限次数重试。

部署脚本使用 `set -Eeuo pipefail`。任何步骤失败立即退出。健康检查失败时输出服务状态与近期 journald 日志，并返回非零退出码。

脚本不执行 `git reset --hard`，不自动创建合并提交，不自动回滚 migration，也不打印环境变量文件内容。

## 6. 数据边界与备份

生产数据写入服务器本机 PostgreSQL。浏览器和外部本地识别客户端只能通过 HTTPS API 访问 Django，不能直接连接数据库。

生产数据库配置为：

```text
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=wuwa_app
```

真实数据库名和密码只保存在服务器环境变量中。部署指南必须包含每日 `pg_dump`、备份保留周期、异机复制和恢复演练要求。部署脚本不自动删除或重建数据库。

云端部署不改变现有 OCR 隐私边界：完整截图仍不进入常规后端上传路径。

## 7. 失败处理

- 依赖安装、部署检查和前端构建都在 migration 前完成，尽量减少数据库已经变化但应用无法启动的风险。
- migration 失败时停止发布，不重启服务。
- 静态文件同步或服务重启失败时停止并打印失败阶段。
- 健康检查使用有限重试，不进行无限快速重试。
- 数据库 migration 不做自动反向操作；需要根据具体 migration 和备份人工决定恢复方式。
- 首次服务器安装中的 `nginx -t`、systemd 启动和证书签发失败由部署指南提供诊断命令。

## 8. 测试设计

### 8.1 设置行为测试

扩展 `Wuwa/wuwa/tests/test_database_settings.py`：

- 开发环境的安全开关保持关闭。
- 生产环境启用安全 Cookie、HTTPS 重定向和代理协议识别。
- 生产环境 HSTS 初始值为 3600 秒。
- HSTS 时长、子域名和 preload 可以通过有效环境变量覆盖。
- `STATIC_ROOT` 指向后端目录下的 `staticfiles`。

测试先失败，再实现设置变更。

### 8.2 部署资产契约测试

新增 `Wuwa/wuwa/tests/test_deployment_assets.py`，静态读取部署资产并验证：

- Gunicorn 已固定在 requirements 中。
- systemd 使用 `piaobozhe`、固定工作目录、环境文件和 loopback 绑定。
- Nginx 代理目标为 loopback，Vue 根目录和 SPA fallback 正确。
- 部署脚本只允许 `main` 的 fast-forward 更新，包含部署检查、构建、migration、静态同步、重启和健康检查。
- `.env.example` 包含全部必需变量，且不包含本地开发密码 `root` 作为生产数据库密码。

### 8.3 完整验证

实现完成后执行：

- 命中的 Django 设置与部署资产测试。
- Django 全量测试。
- Vue 全量测试。
- Vue 生产构建。
- `bash -n deploy/deploy.sh`。
- 使用长度合格的测试 secret、非真实数据库密码和文档域名运行 `manage.py check --deploy`，要求零警告。
- `git diff --check`。

真实服务器上的 `nginx -t`、`systemd-analyze verify`、服务启动、HTTPS 证书、外部健康检查、数据库备份和恢复属于服务器验收项。本地实施记录不得把这些未执行步骤写成已通过。

## 9. 文档与归档

新增 `docs/production-deployment.md`，覆盖：

- 阿里云防火墙与 Ubuntu 端口边界。
- ICP 备案前置条件。
- 首次系统初始化。
- 创建 `piaobozhe` 与 `wuwa_app`。
- 环境变量和文件权限。
- Nginx、systemd 与 Certbot 安装。
- 第一次部署与日常一键部署。
- 日志、健康检查、备份、恢复和 HSTS 提升。

`README.md` 与 `docs/developer-onboarding.md` 增加部署指南入口。`docs/security-privacy-and-data-boundaries.md` 同步生产 HTTPS、Cookie、数据库端口和秘密管理边界。

实现和验证完成后，在 `docs/archive/` 写入实际变更、测试结果、未执行的真实服务器验收项和后续操作。

## 10. 完成标准

本功能只有在以下条件全部满足时才完成：

- 所有设计内文件已实现且职责一致。
- 生产设置的安全行为有先失败后通过的自动化测试。
- 部署资产契约测试通过。
- Django 全量测试、Vue 全量测试和 Vue 生产构建通过。
- `manage.py check --deploy` 在测试生产变量下零警告。
- 部署脚本通过 Bash 语法检查。
- 仓库不包含真实秘密、真实生产域名或用户服务器公网 IP。
- 生产部署指南和实施归档已完成。
- 真实服务器验收仍明确标记为后续步骤，直到实际执行并取得证据。
