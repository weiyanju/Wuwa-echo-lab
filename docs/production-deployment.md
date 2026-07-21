# Wuwa 生产部署手册

本文描述如何把 `main` 分支部署到一台 Ubuntu 24.04 服务器。目标结构是：Nginx 公开提供 Vue 静态站点，并把 `/api/` 转发到只监听 `127.0.0.1:8001` 的 Gunicorn；Gunicorn 以独立系统用户 `piaobozhe` 运行 Django；Django 使用服务器本机 PostgreSQL 中的 `wuwa` 数据库和 `wuwa_app` 角色。

生产数据因此存放在服务器 PostgreSQL 中，不会使用开发电脑上的 `wuwa_dev` 数据库。仓库只提供示例配置，真实域名、服务器地址、密码、密钥和私有仓库凭据都不得提交。

## 1. 部署前提

- 服务器是 Ubuntu 24.04，具有 2 核 CPU、2 GiB 内存和至少 40 GiB 磁盘。
- 管理员能通过 SSH 登录并执行 `sudo`。
- 域名的 A/AAAA 记录已经指向服务器公网地址；以下命令统一以 `YOUR_DOMAIN` 和可选的 `www.YOUR_DOMAIN` 表示。
- 阿里云安全组与服务器防火墙只公开实际 SSH 端口、HTTP 80 和 HTTPS 443。不要公开 PostgreSQL 5432 或 Gunicorn 8001。
- 要发布的代码已经合并到 `main`，或者 `main` 已明确指向经过验收的发布提交。服务器不部署未合并功能分支。

首次操作时保留当前 SSH 会话，并另开一个会话验证新登录和防火墙规则，确认无误后再退出旧会话。

## 2. 更新系统并安装基础软件

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y \
  ca-certificates curl git gnupg nginx openssl postgresql \
  postgresql-contrib python3-pip python3-venv rsync snapd
```

Vite 8 要求 Node `^20.19.0` 或 `>=22.12.0`。这里按 [NodeSource 的 Ubuntu Node 22 说明](https://github.com/nodesource/distributions/blob/master/DEV_README.md) 下载脚本到本地，检查后再以管理员权限执行；不要直接把未知远程响应通过管道交给 root shell。

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
less /tmp/nodesource_setup.sh
sudo -E bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
rm /tmp/nodesource_setup.sh
node --version
npm --version
node -e "const [a,b]=process.versions.node.split('.').map(Number); if (a<22 || (a===22 && b<12)) process.exit(1)"
```

最后一条命令必须以 0 退出。部署脚本依赖 `git`、`python3`、`npm`、`curl`、`rsync`、`systemctl`、`runuser` 和 `flock`，缺少任一命令都会在修改应用前停止。

## 3. 为 2 GiB 服务器添加交换空间

先确认是否已有交换空间：

```bash
swapon --show
free -h
```

若输出没有 swap，再创建 2 GiB 交换文件：

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
swapon --show
```

不要在 `/etc/fstab` 中重复添加同一行。

## 4. 创建独立应用用户

`piaobozhe` 只运行和更新应用，不授予 sudo，也不用于日常 SSH 管理：

```bash
sudo adduser --system --group \
  --home /srv/wuwa \
  --shell /usr/sbin/nologin \
  piaobozhe
sudo install -d -o piaobozhe -g piaobozhe -m 0755 /srv/wuwa/app
```

管理员仍负责 `/etc`、systemd、Nginx 和发布脚本中的特权操作。systemd 服务使用 `User=piaobozhe` 与 `Group=piaobozhe`，不会以 root 运行 Django。

## 5. 创建服务器 PostgreSQL 数据库

先生成一个 URL-safe 数据库密码并暂存到密码管理器，避免 Bash 与 systemd 环境文件对特殊字符产生不同解释：

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(48))'
```

然后进入 PostgreSQL 管理终端：

```bash
sudo -u postgres psql
```

在 `psql` 内创建登录角色，交互式设置一个唯一随机密码，并让它拥有生产数据库：

```sql
CREATE ROLE wuwa_app LOGIN;
\password wuwa_app
CREATE DATABASE wuwa OWNER wuwa_app;
\q
```

把该密码写入后面的 `/etc/wuwa/wuwa.env`，不要写入 shell 命令、仓库或聊天记录。验证本机 TCP 登录：

```bash
psql -h 127.0.0.1 -U wuwa_app -d wuwa -W -c 'select current_database(), current_user;'
```

应显示数据库 `wuwa` 和角色 `wuwa_app`。PostgreSQL 继续只接受服务器本机连接；安全组和 UFW 不开放 5432。

```bash
sudo -u postgres psql -tAc 'show listen_addresses;'
sudo ss -lntp | grep 5432
```

监听地址必须只包含 `localhost`、`127.0.0.1` 或 `::1`。若服务器镜像原先改过 PostgreSQL 配置，应先恢复本机监听并检查 `pg_hba.conf`，再继续部署。

## 6. 克隆经过合并的 `main`

确保 `/srv/wuwa/app` 为空，然后以应用用户克隆：

```bash
sudo -u piaobozhe -H git clone \
  --branch main \
  --single-branch \
  YOUR_REPOSITORY_URL \
  /srv/wuwa/app
sudo -u piaobozhe -H git -C /srv/wuwa/app status --short --branch
```

若仓库私有，使用代码托管平台提供的只读 deploy key 或范围最小的只读凭据。私钥只能由 `piaobozhe` 读取，不要把 token 写进 Git URL，也不要赋予该凭据写仓库权限。确认下列命令能非交互读取 `main`：

```bash
sudo -u piaobozhe -H git -C /srv/wuwa/app fetch origin main
```

## 7. 配置生产环境变量

再生成一个与数据库密码不同的 Django 密钥：

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
```

复制仓库模板并限制权限：

```bash
sudo install -d -o root -g piaobozhe -m 0750 /etc/wuwa
sudo install \
  -o root -g piaobozhe -m 0640 \
  /srv/wuwa/app/.env.example \
  /etc/wuwa/wuwa.env
sudoedit /etc/wuwa/wuwa.env
sudo chown root:piaobozhe /etc/wuwa/wuwa.env
sudo chmod 0640 /etc/wuwa/wuwa.env
```

至少替换：

- `DJANGO_SECRET_KEY`：不少于 50 个随机字符，不能复用开发值。
- `DJANGO_ALLOWED_HOSTS`：`YOUR_DOMAIN,www.YOUR_DOMAIN`；没有 `www` 时删除对应值。
- `DJANGO_CSRF_TRUSTED_ORIGINS`：`https://YOUR_DOMAIN,https://www.YOUR_DOMAIN`。
- `DB_PASSWORD`：第 5 节为 `wuwa_app` 设置的密码。
- `WUWA_HEALTHCHECK_URL`：`https://YOUR_DOMAIN/api/health/`。

同源部署可以保持 `DJANGO_CORS_ALLOWED_ORIGINS=` 为空。确认没有示例值残留；下列命令应无输出：

```bash
sudo grep -nE 'CHANGE_ME|example\.com' /etc/wuwa/wuwa.env
```

不要使用 `source` 后运行会打印全部环境变量的调试命令。真实值只保存在服务器的 `/etc/wuwa/wuwa.env`。

## 8. 安装 systemd 与 Nginx 配置

先安装 systemd 单元，但暂不启动：

```bash
sudo install \
  -o root -g root -m 0644 \
  /srv/wuwa/app/deploy/wuwa.service \
  /etc/systemd/system/wuwa.service
sudo systemctl daemon-reload
sudo systemctl enable wuwa.service
```

准备 Web 根目录并安装 Nginx 模板：

```bash
sudo install -d -o root -g www-data -m 0755 /var/www/wuwa
sudo install \
  -o root -g root -m 0644 \
  /srv/wuwa/app/deploy/nginx.conf \
  /etc/nginx/sites-available/wuwa
sudoedit /etc/nginx/sites-available/wuwa
```

把模板中的 `example.com www.example.com` 改为实际域名。随后启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/wuwa /etc/nginx/sites-enabled/wuwa
sudo unlink /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

如果软链接已经存在，不要重复创建；确认它指向正确文件。此模板只转发 `/api/`，不公开 Django Admin。Gunicorn 只监听回环地址，外部只能经过 Nginx。

## 9. 配置防火墙与 HTTPS

先在阿里云安全组确认实际 SSH 端口、80 和 443 已放行，再配置 UFW。若 SSH 不是 22，先放行真实端口，不要照抄 `OpenSSH` 后立即断开当前会话。

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status verbose
```

按 [Certbot 官方 Nginx 指南](https://certbot.eff.org/instructions?ws=nginx&os=snap) 安装并签发证书：

```bash
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/local/bin/certbot
sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

没有 `www` 记录时，从 Certbot 命令中删除第二个 `-d`。证书签发后确认浏览器能通过 HTTPS 打开域名。Certbot 会修改服务器上的活动 Nginx 配置；以后更新仓库模板时要合并差异，不要直接覆盖证书配置。

生产默认设置 `DJANGO_SECURE_HSTS_SECONDS=3600`，但 `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=false` 和 `DJANGO_SECURE_HSTS_PRELOAD=false`。只有所有子域都稳定支持 HTTPS、续期和恢复流程都经过验证后，才分阶段提高时长并考虑子域或 preload；不要在第一次部署时启用 preload。

## 10. 首次发布

运行仓库中的部署脚本：

```bash
sudo /srv/wuwa/app/deploy/deploy.sh
```

脚本按顺序执行：

1. 获取部署锁，确认检出位于干净的 `main`。
2. `git fetch origin main` 并 `git merge --ff-only origin/main`。
3. 创建 Python 虚拟环境并安装固定依赖。
4. 执行 `manage.py check --deploy`。
5. 执行 `npm ci` 与 `npm run build`。
6. 执行数据库迁移和 `collectstatic`。
7. 用 `rsync` 发布 Vue 产物，重启 `wuwa.service`。
8. 请求配置的 HTTPS `/api/health/`，失败时显示服务状态和最近日志。

若要独立复核 Django 部署检查，可在首次发布创建虚拟环境后执行：

```bash
sudo bash -c '
set -a
source /etc/wuwa/wuwa.env
set +a
runuser --preserve-environment -u piaobozhe -- \
  /srv/wuwa/app/.venv/bin/python \
  /srv/wuwa/app/Wuwa/manage.py check --deploy
'
```

初始 HSTS 策略下，该命令应以 0 退出，并且只允许出现 `security.W005`（尚未覆盖所有子域）与 `security.W021`（尚未进入 preload）两条已知警告。它们与本手册第 9 节的分阶段启用策略一致。若出现任何其他部署警告或错误，先修复再继续；当未来显式启用子域 HSTS 与 preload 后，检查应变为 `System check identified no issues`。

## 11. 发布后验收

```bash
sudo systemctl --no-pager --full status wuwa.service
sudo journalctl -u wuwa.service -n 100 --no-pager
sudo nginx -t
curl --fail --show-error https://YOUR_DOMAIN/api/health/
ss -lntp | grep -E ':(80|443|8001|5432)\b'
```

同时人工确认：

- 首页和至少一个前端历史路由能刷新，不返回 Nginx 404。
- 注册、登录和退出流程可用，浏览器使用 HTTPS 安全 Cookie。
- 新增一条可识别的业务数据后刷新页面仍存在，证明数据写入服务器 PostgreSQL。
- 外网不能直接访问 8001 或 5432。
- systemd 日志不包含密码、Cookie、session 或完整环境变量。

## 12. 后续发布

先把功能分支评审并合入 `main`，确认远端 CI/本地验证通过，然后在服务器执行同一条命令：

```bash
sudo /srv/wuwa/app/deploy/deploy.sh
```

脚本不会部署服务器上的未提交改动，也不会执行 `git reset --hard` 或 `git clean`。如果 `main` 不能 fast-forward，先在代码仓库解决历史问题；不要在生产服务器手工合并功能分支。

部署脚本会运行迁移但不会猜测数据库回滚。应用代码问题应通过新的修复/回退提交重新发布；可能不可逆的数据迁移必须在上线前制定专用恢复步骤并验证备份。

## 13. PostgreSQL 备份与恢复演练

创建只有 PostgreSQL 管理用户可访问的备份目录：

```bash
sudo install -d -o postgres -g postgres -m 0700 /var/backups/wuwa
sudo -u postgres pg_dump \
  -Fc \
  -d wuwa \
  -f "/var/backups/wuwa/wuwa-$(date +%F-%H%M%S).dump"
sudo -u postgres ls -lh /var/backups/wuwa
```

`-Fc` 是 PostgreSQL 自定义格式，应使用 `pg_restore` 恢复；参见 [PostgreSQL 官方备份文档](https://www.postgresql.org/docs/current/backup-dump.html)。可将以上命令配置为每日定时任务，并在确认备份已经复制到另一台主机或对象存储后，清理超过 14 天的本机备份：

```bash
sudo find /var/backups/wuwa \
  -type f \
  -name 'wuwa-*.dump' \
  -mtime +14 \
  -delete
```

本机备份不能抵御整台服务器或磁盘丢失。至少定期把加密备份复制到独立位置，并在隔离的测试数据库中执行 `createdb`、`pg_restore`、数据核对和 `dropdb`，证明备份确实可恢复。不要第一次在真实 `wuwa` 数据库上练习恢复。

## 14. 常用排障

- `Deployment checkout must be on main`：切回已合并的 `main`，不要绕过检查。
- `Deployment checkout has uncommitted changes`：查明变更来源；生产服务器不应承载手工代码修改。
- `check --deploy` 失败：检查 `/etc/wuwa/wuwa.env` 的必需值、HTTPS 设置和 `root:piaobozhe 0640` 权限。
- `502 Bad Gateway`：检查 `systemctl status wuwa.service`、`journalctl -u wuwa.service` 和 `ss -lntp | grep 8001`。
- 健康检查失败：确认 Certbot 已生效、DNS 指向当前服务器、Nginx `/api/` 代理正常且安全组开放 443。
- 数据库登录失败：用 `psql -h 127.0.0.1 -U wuwa_app -d wuwa -W` 独立验证，不要把密码打印到日志。
