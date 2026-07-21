# 2026-07-21 生产部署准备实施记录

## 实施结论

仓库已经具备面向 Ubuntu 24.04 的生产部署资产和操作手册。目标拓扑为：Nginx 提供 Vue SPA 并转发 `/api/`，Gunicorn 仅监听 `127.0.0.1:8001`，systemd 以独立系统用户 `piaobozhe` 运行 Django，Django 使用服务器本机 PostgreSQL 中的 `wuwa` 数据库和 `wuwa_app` 角色。

本次只完成代码仓库层面的部署准备，没有连接、初始化或修改真实服务器。仓库中没有加入真实域名、服务器地址、密码、密钥、token 或用户本机绝对路径。

## 身份与数据边界

- SSH/sudo 管理员负责系统包、`/etc`、Nginx、systemd、防火墙和发布编排。
- `piaobozhe` 不拥有 sudo，用于 Git、Python、npm 与 Gunicorn 应用进程。
- PostgreSQL 登录角色为 `wuwa_app`，与 Linux 用户分离。
- 生产环境文件固定为 `/etc/wuwa/wuwa.env`，权限边界为 `root:piaobozhe 0640`。
- 生产业务数据存放在服务器 PostgreSQL，不使用开发电脑的 `wuwa_dev`。
- 公网只公开 SSH、80 和 443；8001 与 5432 不对公网开放。

## 实际改动

- `.env.example`：提供不含真实值的生产变量模板和 HTTPS 健康检查地址。
- `.gitignore`：忽略 `staticfiles/`，避免第一次 `collectstatic` 后阻断下一次干净工作树发布。
- `Wuwa/requirements.txt`：固定 `gunicorn==26.0.0`。
- `Wuwa/wuwa/settings.py`：增加 `STATIC_ROOT`、代理 HTTPS 识别、HTTPS 重定向、安全 Cookie 和分阶段 HSTS。
- `Wuwa/wuwa/tests/test_database_settings.py`：覆盖开发/生产安全默认值与 HSTS 显式覆盖。
- `Wuwa/wuwa/tests/test_deployment_assets.py`：约束依赖、环境模板、systemd、Nginx、发布脚本、静态输出忽略规则和部署手册。
- `deploy/wuwa.service`：以 `piaobozhe` 运行两个 Gunicorn worker、两个线程和基础 systemd hardening。
- `deploy/nginx.conf`：提供 SPA fallback、`/api/` 反向代理、代理头和点目录保护，并为 Certbot 的 `.well-known` 路径留出边界。
- `deploy/deploy.sh`：提供可执行、加锁、fast-forward-only、失败即停并带外部健康检查的应用发布流程。
- `docs/production-deployment.md`：记录 Ubuntu、Node 22、swap、用户、PostgreSQL、仓库访问、环境变量、Nginx/systemd、Certbot、防火墙、发布验收和备份恢复。
- `README.md`、`docs/developer-onboarding.md`、`docs/security-privacy-and-data-boundaries.md`：链接手册并同步生产、安全和数据所有权边界。
- `docs/superpowers/specs/2026-07-21-production-deployment-readiness-design.md`：保存获批设计。
- `docs/superpowers/plans/2026-07-21-production-deployment-readiness.md`：保存测试先行实施计划和验收口径。

## 生产设置结果

- 开发环境保持 `SECURE_SSL_REDIRECT`、安全 Cookie 和 HSTS 关闭，继续支持本地 HTTP。
- 生产环境启用 `SECURE_PROXY_SSL_HEADER`、`SECURE_SSL_REDIRECT`、`SESSION_COOKIE_SECURE` 与 `CSRF_COOKIE_SECURE`。
- HSTS 初始时长为 3600 秒。
- `SECURE_HSTS_INCLUDE_SUBDOMAINS` 和 `SECURE_HSTS_PRELOAD` 默认关闭，可通过环境变量显式开启。
- Django 静态文件收集目录为 `Wuwa/staticfiles`。

默认分阶段 HSTS 会让 `manage.py check --deploy` 报告 `security.W005` 和 `security.W021` 两条预期警告，但命令以 0 退出。手册要求只接受这两条已记录警告；任何其他部署警告都必须处理。显式开启子域 HSTS 与 preload 后，部署检查为 0 警告。

## 发布脚本结果

`deploy/deploy.sh` 以 root/sudo 启动，但把 Git、Python 与 npm 应用操作降权给 `piaobozhe`。流程为：

1. 检查命令、用户、仓库和环境文件，获取 `/var/lock/wuwa-deploy.lock`。
2. 拒绝非 `main` 或脏工作树。
3. `git fetch origin main`，随后 `git merge --ff-only origin/main`。
4. 校验生产环境、HTTPS 健康检查地址和示例占位值。
5. 创建虚拟环境、安装固定 Python 依赖并运行 `check --deploy`。
6. 使用 `npm ci` 构建前端。
7. 执行迁移和 `collectstatic`。
8. `rsync --delete` 发布 Vue 产物，重启并确认 `wuwa.service` active。
9. 最多重试 12 次外部 HTTPS 健康检查。
10. 失败时输出失败阶段、systemd 状态和最近 80 条服务日志。

脚本不会执行 `git reset --hard`、`git clean` 或猜测数据库回滚。迁移失败或不可逆迁移必须依赖针对该迁移的恢复方案与已验证备份。

## 验证记录

在 Windows 本地仓库完成：

- `Wuwa/.venv/Scripts/python.exe manage.py test --keepdb -v 1`：141/141 通过。
- `python -m unittest wuwa.tests.test_database_settings wuwa.tests.test_deployment_assets -v`：14/14 通过。
- 使用非真实测试变量运行 `manage.py check --deploy`：退出码 0，只出现预期的 `security.W005` 与 `security.W021`。
- 同一检查显式开启 HSTS 子域与 preload：`System check identified no issues (0 silenced)`。
- `npm test`：348/348 通过。
- `npm run build`：Vite 8.0.10 构建成功，89 个模块完成转换；只有插件耗时提示。
- `bash -n deploy/deploy.sh`：退出码 0。
- `git diff --check`：退出码 0。

## 未在本地执行的验证

以下验证依赖真实 Ubuntu、域名、证书和服务器权限，因此本次没有从本地仓库执行：

- 安装 Ubuntu 包、创建 swap、`piaobozhe` 和 PostgreSQL 角色/数据库。
- `systemd-analyze verify`、真实 systemd 启动和 Gunicorn 监听检查。
- 使用真实站点文件执行 `nginx -t`。
- Certbot 证书签发与 `renew --dry-run`。
- 真实迁移、服务器 `collectstatic`、外部 `/api/health/` 和登录/数据持久化验收。
- PostgreSQL 备份复制与隔离恢复演练。

## 下一步

1. 评审并把 `codex/production-deployment-readiness` 合入 `main`。
2. 在服务器按 `docs/production-deployment.md` 完成首次系统配置。
3. 用实际域名替换服务器上的示例域名，生成独立随机密钥和数据库密码。
4. 为 `piaobozhe` 配置只读仓库访问，确认能获取 `main`。
5. 完成 HTTPS 后运行 `/srv/wuwa/app/deploy/deploy.sh`。
6. 按手册完成服务、端口、前端路由、登录、服务器数据库持久化、备份和恢复验收。
