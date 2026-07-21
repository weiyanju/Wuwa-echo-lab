# Production Deployment Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository safe and repeatable to deploy on the approved Ubuntu 24.04 server with Nginx, systemd, Gunicorn, PostgreSQL, and the dedicated `piaobozhe` service account.

**Architecture:** Nginx serves the built Vue SPA and proxies `/api/` to Gunicorn on `127.0.0.1:8001`. Gunicorn runs Django as `piaobozhe`; Django connects to a local PostgreSQL database using production-only environment values from `/etc/wuwa/wuwa.env`. A root-run deployment script fast-forwards `main`, installs locked dependencies, validates Django, builds the frontend, migrates and collects static files, publishes the SPA, restarts systemd, and checks the public health endpoint.

**Tech Stack:** Ubuntu 24.04, Bash, Nginx, systemd, Python 3, Django 6, Gunicorn 26, PostgreSQL, Node.js/npm, Vue/Vite, Python `unittest`.

---

## Task 1: Add production transport-security settings

**Files:**

- Modify: `Wuwa/wuwa/tests/test_database_settings.py`
- Modify: `Wuwa/wuwa/settings.py`

- [ ] **Step 1: Add failing production security tests**

Extend `DatabaseSettingsTests` with these assertions:

```python
    def test_development_transport_security_defaults_remain_disabled(self):
        settings = self.load_settings_with_env({"WUWA_ENV": "development"})

        self.assertIsNone(settings.SECURE_PROXY_SSL_HEADER)
        self.assertFalse(settings.SECURE_SSL_REDIRECT)
        self.assertFalse(settings.SESSION_COOKIE_SECURE)
        self.assertFalse(settings.CSRF_COOKIE_SECURE)
        self.assertEqual(settings.SECURE_HSTS_SECONDS, 0)
        self.assertFalse(settings.SECURE_HSTS_INCLUDE_SUBDOMAINS)
        self.assertFalse(settings.SECURE_HSTS_PRELOAD)

    def test_production_enables_https_cookie_proxy_and_hsts_settings(self):
        settings = self.load_settings_with_env(
            {
                "WUWA_ENV": "production",
                "DJANGO_SECRET_KEY": "test-only-secret",
                "DB_PASSWORD": "test-only-password",
                "DJANGO_ALLOWED_HOSTS": "api.example.test",
            }
        )

        self.assertEqual(
            settings.SECURE_PROXY_SSL_HEADER,
            ("HTTP_X_FORWARDED_PROTO", "https"),
        )
        self.assertTrue(settings.SECURE_SSL_REDIRECT)
        self.assertTrue(settings.SESSION_COOKIE_SECURE)
        self.assertTrue(settings.CSRF_COOKIE_SECURE)
        self.assertEqual(settings.SECURE_HSTS_SECONDS, 3600)
        self.assertFalse(settings.SECURE_HSTS_INCLUDE_SUBDOMAINS)
        self.assertFalse(settings.SECURE_HSTS_PRELOAD)
        self.assertEqual(settings.STATIC_ROOT, settings.BASE_DIR / "staticfiles")

    def test_production_hsts_settings_accept_explicit_overrides(self):
        settings = self.load_settings_with_env(
            {
                "WUWA_ENV": "production",
                "DJANGO_SECRET_KEY": "test-only-secret",
                "DB_PASSWORD": "test-only-password",
                "DJANGO_ALLOWED_HOSTS": "api.example.test",
                "DJANGO_SECURE_HSTS_SECONDS": "86400",
                "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS": "true",
                "DJANGO_SECURE_HSTS_PRELOAD": "true",
            }
        )

        self.assertEqual(settings.SECURE_HSTS_SECONDS, 86400)
        self.assertTrue(settings.SECURE_HSTS_INCLUDE_SUBDOMAINS)
        self.assertTrue(settings.SECURE_HSTS_PRELOAD)
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run from `Wuwa/`:

```powershell
.\.venv\Scripts\python.exe -m unittest wuwa.tests.test_database_settings -v
```

Expected: the three new tests fail because the production transport-security settings and `STATIC_ROOT` do not yet exist.

- [ ] **Step 3: Implement environment-aware security settings**

Change the static settings block in `Wuwa/wuwa/settings.py` to:

```python
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

SECURE_PROXY_SSL_HEADER = (
    ('HTTP_X_FORWARDED_PROTO', 'https') if IS_PRODUCTION else None
)
SECURE_SSL_REDIRECT = IS_PRODUCTION
SESSION_COOKIE_SECURE = IS_PRODUCTION
CSRF_COOKIE_SECURE = IS_PRODUCTION
SECURE_HSTS_SECONDS = env_int(
    'DJANGO_SECURE_HSTS_SECONDS',
    3600 if IS_PRODUCTION else 0,
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool(
    'DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS',
    False,
)
SECURE_HSTS_PRELOAD = env_bool('DJANGO_SECURE_HSTS_PRELOAD', False)
```

Keep these values disabled in development so local HTTP continues working. HSTS subdomains and preload remain opt-in after the HTTPS configuration has been proven stable.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest wuwa.tests.test_database_settings -v
```

Expected: all database/settings tests pass.

- [ ] **Step 5: Commit the settings change**

```powershell
git add Wuwa/wuwa/settings.py Wuwa/wuwa/tests/test_database_settings.py
git commit -m "feat(server): secure production Django settings"
```

## Task 2: Pin the application server and provide a safe environment template

**Files:**

- Create: `Wuwa/wuwa/tests/test_deployment_assets.py`
- Modify: `Wuwa/requirements.txt`
- Create: `.env.example`

- [ ] **Step 1: Add failing dependency and environment-template contract tests**

Create `Wuwa/wuwa/tests/test_deployment_assets.py` with:

```python
from pathlib import Path
import unittest


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


class DeploymentAssetTests(unittest.TestCase):
    def read_repository_file(self, relative_path):
        return (REPOSITORY_ROOT / relative_path).read_text(encoding="utf-8")

    def test_gunicorn_is_pinned_for_production(self):
        requirements = self.read_repository_file("Wuwa/requirements.txt")

        self.assertIn("gunicorn==26.0.0", requirements.splitlines())

    def test_environment_example_documents_required_production_values(self):
        environment = self.read_repository_file(".env.example")

        required_names = {
            "WUWA_ENV",
            "DJANGO_DEBUG",
            "DJANGO_SECRET_KEY",
            "DJANGO_ALLOWED_HOSTS",
            "DJANGO_CORS_ALLOWED_ORIGINS",
            "DJANGO_CSRF_TRUSTED_ORIGINS",
            "DJANGO_SECURE_HSTS_SECONDS",
            "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS",
            "DJANGO_SECURE_HSTS_PRELOAD",
            "DB_NAME",
            "DB_USER",
            "DB_PASSWORD",
            "DB_HOST",
            "DB_PORT",
            "DB_CONN_MAX_AGE",
            "WUWA_HEALTHCHECK_URL",
        }
        configured_names = {
            line.split("=", 1)[0]
            for line in environment.splitlines()
            if line and not line.startswith("#") and "=" in line
        }

        self.assertTrue(required_names.issubset(configured_names))
        self.assertIn("WUWA_ENV=production", environment)
        self.assertIn("DB_USER=wuwa_app", environment)
        self.assertNotIn("DB_PASSWORD=root", environment)
        self.assertNotIn("wuwa-local-development-secret-key", environment)
```

- [ ] **Step 2: Run the new test and confirm RED**

Run from `Wuwa/`:

```powershell
.\.venv\Scripts\python.exe -m unittest wuwa.tests.test_deployment_assets -v
```

Expected: the Gunicorn assertion fails and `.env.example` is missing.

- [ ] **Step 3: Pin Gunicorn and add the environment template**

Append this exact dependency to `Wuwa/requirements.txt`:

```text
gunicorn==26.0.0
```

Create `.env.example` with example-only values and comments explaining that it must be copied to `/etc/wuwa/wuwa.env`, owned by `root:piaobozhe`, and mode `0640`. Use:

```dotenv
WUWA_ENV=production
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=CHANGE_ME_generate_at_least_50_random_characters
DJANGO_ALLOWED_HOSTS=example.com,www.example.com
DJANGO_CORS_ALLOWED_ORIGINS=
DJANGO_CSRF_TRUSTED_ORIGINS=https://example.com,https://www.example.com
DJANGO_SECURE_HSTS_SECONDS=3600
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=false
DJANGO_SECURE_HSTS_PRELOAD=false
DB_NAME=wuwa
DB_USER=wuwa_app
DB_PASSWORD=CHANGE_ME_generate_a_unique_database_password
DB_HOST=127.0.0.1
DB_PORT=5432
DB_CONN_MAX_AGE=60
WUWA_HEALTHCHECK_URL=https://example.com/api/health/
```

Do not include the actual server IP, domain, secret key, or database password.

- [ ] **Step 4: Run the deployment-asset test and confirm GREEN**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest wuwa.tests.test_deployment_assets -v
```

Expected: both tests pass.

- [ ] **Step 5: Commit dependency and environment template**

```powershell
git add Wuwa/requirements.txt Wuwa/wuwa/tests/test_deployment_assets.py .env.example
git commit -m "build(server): add production runtime inputs"
```

## Task 3: Add systemd and Nginx deployment templates

**Files:**

- Modify: `Wuwa/wuwa/tests/test_deployment_assets.py`
- Create: `deploy/wuwa.service`
- Create: `deploy/nginx.conf`

- [ ] **Step 1: Add failing service and proxy contract tests**

Add these methods to `DeploymentAssetTests`:

```python
    def test_systemd_service_uses_dedicated_unprivileged_identity(self):
        service = self.read_repository_file("deploy/wuwa.service")

        self.assertIn("User=piaobozhe", service)
        self.assertIn("Group=piaobozhe", service)
        self.assertIn("WorkingDirectory=/srv/wuwa/app/Wuwa", service)
        self.assertIn("EnvironmentFile=/etc/wuwa/wuwa.env", service)
        self.assertIn("/srv/wuwa/app/.venv/bin/gunicorn", service)
        self.assertIn("--bind 127.0.0.1:8001", service)
        self.assertIn("wuwa.wsgi:application", service)
        self.assertIn("NoNewPrivileges=true", service)
        self.assertNotIn("User=root", service)

    def test_nginx_serves_spa_and_proxies_only_the_api(self):
        nginx = self.read_repository_file("deploy/nginx.conf")

        self.assertIn("root /var/www/wuwa;", nginx)
        self.assertIn("location /api/", nginx)
        self.assertIn("proxy_pass http://127.0.0.1:8001;", nginx)
        self.assertIn("proxy_set_header X-Forwarded-Proto $scheme;", nginx)
        self.assertIn("try_files $uri $uri/ /index.html;", nginx)
        self.assertIn("location ~ /\\.(?!well-known(?:/|$))", nginx)
        self.assertNotIn("0.0.0.0:8001", nginx)
```

- [ ] **Step 2: Run the deployment-asset test and confirm RED**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest wuwa.tests.test_deployment_assets -v
```

Expected: the service and Nginx tests fail because `deploy/` does not exist.

- [ ] **Step 3: Add the systemd service**

Create `deploy/wuwa.service` with:

```ini
[Unit]
Description=Wuwa Django API
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=notify
NotifyAccess=main
User=piaobozhe
Group=piaobozhe
WorkingDirectory=/srv/wuwa/app/Wuwa
EnvironmentFile=/etc/wuwa/wuwa.env
ExecStart=/srv/wuwa/app/.venv/bin/gunicorn --workers 2 --threads 2 --bind 127.0.0.1:8001 --access-logfile - --error-logfile - wuwa.wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
KillMode=mixed
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
UMask=0027

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 4: Add the Nginx site template**

Create `deploy/nginx.conf` with an HTTP server for `example.com www.example.com`, Vue history fallback, dotfile denial, and `/api/` proxy headers. Do not proxy Django admin, do not expose Gunicorn on a public interface, and do not embed the real production domain. The complete server block is:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    root /var/www/wuwa;
    index index.html;
    server_tokens off;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ /\.(?!well-known(?:/|$)) {
        deny all;
    }
}
```

- [ ] **Step 5: Run the deployment-asset test and confirm GREEN**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest wuwa.tests.test_deployment_assets -v
```

Expected: all deployment-asset tests pass.

- [ ] **Step 6: Commit service and proxy templates**

```powershell
git add Wuwa/wuwa/tests/test_deployment_assets.py deploy/wuwa.service deploy/nginx.conf
git commit -m "feat(server): add systemd and nginx templates"
```

## Task 4: Add the fail-fast application deployment script

**Files:**

- Modify: `Wuwa/wuwa/tests/test_deployment_assets.py`
- Modify: `.gitignore`
- Create: `deploy/deploy.sh`

- [ ] **Step 1: Add a failing deployment workflow contract test**

Add this method to `DeploymentAssetTests`:

```python
    def test_deployment_script_is_locked_fail_fast_and_health_checked(self):
        script = self.read_repository_file("deploy/deploy.sh")

        required_fragments = (
            "set -Eeuo pipefail",
            'APP_USER="piaobozhe"',
            'APP_ROOT="/srv/wuwa/app"',
            'ENV_FILE="/etc/wuwa/wuwa.env"',
            'LOCK_FILE="/var/lock/wuwa-deploy.lock"',
            "flock -n 9",
            "git fetch origin main",
            "git merge --ff-only origin/main",
            "pip install",
            "manage.py check --deploy",
            "npm ci",
            "npm run build",
            "manage.py migrate --noinput",
            "manage.py collectstatic --noinput",
            "rsync -a --delete",
            "systemctl restart",
            "systemctl is-active --quiet",
            "WUWA_HEALTHCHECK_URL",
            "curl --fail",
        )
        for fragment in required_fragments:
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, script)

        self.assertNotIn("git reset --hard", script)
        self.assertNotIn("git clean", script)

    def test_collected_static_output_cannot_dirty_the_deployment_checkout(self):
        gitignore = self.read_repository_file(".gitignore")

        self.assertIn("staticfiles/", gitignore.splitlines())
```

- [ ] **Step 2: Run the deployment-asset test and confirm RED**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest wuwa.tests.test_deployment_assets -v
```

Expected: the deployment-script test fails because `deploy/deploy.sh` is missing, and the static-output test fails because `staticfiles/` is not ignored.

- [ ] **Step 3: Implement the root-orchestrated deployment script**

Create `deploy/deploy.sh` with these exact behaviors:

1. Use `#!/usr/bin/env bash` and `set -Eeuo pipefail`.
2. Require `EUID == 0` because systemd and `/var/www` changes need root.
3. Acquire non-blocking FD 9 lock at `/var/lock/wuwa-deploy.lock`.
4. Verify `git`, `python3`, `npm`, `curl`, `rsync`, `systemctl`, `runuser`, and `flock` exist.
5. Load the root-owned `/etc/wuwa/wuwa.env`; require `WUWA_ENV=production` and `WUWA_HEALTHCHECK_URL` beginning with `https://`.
6. Run Git, Python, and npm commands as `piaobozhe` using a `run_as_app` function, with `HOME=/srv/wuwa`.
7. Refuse to deploy unless the checked-out branch is `main` and the working tree is clean.
8. Use `git fetch origin main` followed by `git merge --ff-only origin/main`; never reset or clean.
9. Create `/srv/wuwa/app/.venv` if absent; install `Wuwa/requirements.txt`.
10. Run Django `check --deploy` before building or migrating.
11. Run `npm ci` and `npm run build` in `WuwaFrontend`.
12. Run `migrate --noinput` and `collectstatic --noinput`.
13. Ignore `staticfiles/` in `.gitignore` so `collectstatic` cannot make later deployments fail the clean-tree preflight.
14. Publish `WuwaFrontend/dist/` to `/var/www/wuwa/` using `rsync -a --delete`, then set `root:www-data` ownership.
15. Restart `wuwa.service` and require it to be active.
16. Retry the external health URL up to 12 times with a five-second delay.
17. On failure, print the failed step, `systemctl status`, and the last 80 service journal lines.

Use quoted variables throughout. Keep the deployment sequence intentionally non-destructive: failure after migration may leave the new schema applied, but the script must never erase the repository, database, or prior deployment output as a rollback shortcut.

- [ ] **Step 4: Run the contract test and Bash syntax check**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest wuwa.tests.test_deployment_assets -v
& 'C:\Program Files\Git\bin\bash.exe' -n deploy/deploy.sh
```

Expected: all tests pass and Bash exits 0 with no output.

- [ ] **Step 5: Commit the deployment script**

```powershell
git add Wuwa/wuwa/tests/test_deployment_assets.py .gitignore deploy/deploy.sh
git commit -m "feat(server): add repeatable deployment script"
```

## Task 5: Document first-time server setup, routine releases, and data ownership

**Files:**

- Create: `docs/production-deployment.md`
- Modify: `README.md`
- Modify: `docs/developer-onboarding.md`
- Modify: `docs/security-privacy-and-data-boundaries.md`

- [ ] **Step 1: Add a failing documentation contract test**

Add this method to `DeploymentAssetTests`:

```python
    def test_production_deployment_runbook_is_linked_and_complete(self):
        runbook = self.read_repository_file("docs/production-deployment.md")
        readme = self.read_repository_file("README.md")
        onboarding = self.read_repository_file("docs/developer-onboarding.md")

        required_runbook_fragments = (
            "Ubuntu 24.04",
            "piaobozhe",
            "wuwa_app",
            "/etc/wuwa/wuwa.env",
            "deploy/wuwa.service",
            "deploy/nginx.conf",
            "deploy/deploy.sh",
            "certbot",
            "pg_dump",
            "check --deploy",
            "/api/health/",
        )
        for fragment in required_runbook_fragments:
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, runbook)

        self.assertIn("docs/production-deployment.md", readme)
        self.assertIn("production-deployment.md", onboarding)
```

- [ ] **Step 2: Run the documentation contract test and confirm RED**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest wuwa.tests.test_deployment_assets -v
```

Expected: the runbook test fails because the production deployment guide does not yet exist or is not linked.

- [ ] **Step 3: Write the first-deployment and release runbook**

Create `docs/production-deployment.md` in Chinese. It must include complete, copyable commands and explicit replacement points for the real domain, repository URL, and generated secrets. Cover:

- Server assumptions: Ubuntu 24.04, 2 cores, 2 GiB RAM, 40 GiB disk, root/sudo administrator, DNS already pointing at the public IP.
- Firewall/security-group ports: SSH, HTTP 80, HTTPS 443 only; never expose PostgreSQL 5432 or Gunicorn 8001.
- OS packages: `nginx`, `postgresql`, `python3-venv`, `python3-pip`, `nodejs`, `npm`, `git`, `rsync`, `curl`, `certbot`, and `python3-certbot-nginx`.
- A 2 GiB swap file for the 2 GiB server, including `swapon --show` verification.
- Creation of `piaobozhe` without passwordless sudo; `/srv/wuwa/app` ownership.
- Local PostgreSQL database `wuwa`, login role `wuwa_app`, generated password, and `127.0.0.1` connection.
- Clone `main` as `piaobozhe` and configure read-only repository credentials if needed.
- Copy `.env.example` to `/etc/wuwa/wuwa.env`, replace every `CHANGE_ME` and `example.com`, then enforce `root:piaobozhe 0640`.
- Validate initial production settings with `manage.py check --deploy`.
- Install `deploy/wuwa.service` and `deploy/nginx.conf`, replace example domains, run `systemctl daemon-reload`, `nginx -t`, and enable both services.
- Obtain HTTPS using Certbot, verify renewal, and keep HSTS subdomain/preload flags false until operational validation is complete.
- First and subsequent release commands using `sudo /srv/wuwa/app/deploy/deploy.sh`.
- Validation: `systemctl status`, `journalctl`, `curl https://REAL_DOMAIN/api/health/`, SPA route refresh, login, and database-backed data check.
- Clarify that production data is stored in PostgreSQL on the server, not in the developer workstation database.
- Nightly `pg_dump` backup example, root-only backup directory, retention example, and an explicit restore-test recommendation.
- Rollback limitations: application Git revisions can be reverted with a new commit/release; irreversible migrations require a tested migration-specific recovery plan and database backup.

Use placeholders such as `YOUR_REPOSITORY_URL` and `YOUR_DOMAIN` rather than real infrastructure values.

- [ ] **Step 4: Link and align the long-lived documentation**

Update:

- `README.md`: replace the current generic production note with a concise summary and link to `docs/production-deployment.md`.
- `docs/developer-onboarding.md`: link the runbook from the production boundary section and state that production releases use `main` or an explicit release commit, never an unmerged feature branch.
- `docs/security-privacy-and-data-boundaries.md`: record the `root:piaobozhe 0640` environment-file boundary, local-only PostgreSQL/Gunicorn ports, HTTPS cookie/proxy settings, staged HSTS policy, and server-side production data ownership.

- [ ] **Step 5: Run the documentation contract and diff checks**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest wuwa.tests.test_deployment_assets -v
git diff --check
```

Expected: all deployment-asset tests pass and Git reports no whitespace errors.

- [ ] **Step 6: Commit the production runbook**

```powershell
git add docs/production-deployment.md README.md docs/developer-onboarding.md docs/security-privacy-and-data-boundaries.md Wuwa/wuwa/tests/test_deployment_assets.py
git commit -m "docs(server): add production deployment runbook"
```

## Task 6: Verify the complete production deployment contract

**Files:**

- Modify only if verification exposes a defect in a file already introduced above.

- [ ] **Step 1: Run backend tests**

From `Wuwa/`:

```powershell
.\.venv\Scripts\python.exe manage.py test --keepdb -v 1
```

Expected: all backend tests pass.

- [ ] **Step 2: Run Django production checks with non-secret test values**

In a temporary PowerShell environment, set:

```powershell
$env:WUWA_ENV = 'production'
$env:DJANGO_DEBUG = 'false'
$env:DJANGO_SECRET_KEY = 'test-only-production-secret-key-with-more-than-fifty-random-characters-123456789'
$env:DJANGO_ALLOWED_HOSTS = 'example.test'
$env:DJANGO_CSRF_TRUSTED_ORIGINS = 'https://example.test'
$env:DB_NAME = 'wuwa_test'
$env:DB_USER = 'wuwa_app'
$env:DB_PASSWORD = 'test-only-production-database-password'
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '5432'
.\.venv\Scripts\python.exe manage.py check --deploy
```

Remove those process-scoped variables immediately after the command. Expected: exit code 0 without requiring a database connection. With the approved staged HSTS defaults, the only accepted warnings are `security.W005` and `security.W021`; any other deployment warning must be investigated. After subdomain HSTS and preload are deliberately enabled, the command should report no issues.

- [ ] **Step 3: Run frontend tests and production build**

From `WuwaFrontend/`:

```powershell
..\.tools\node\npm.cmd test
..\.tools\node\npm.cmd run build
```

Expected: all Node tests pass and Vite produces `dist/` successfully.

- [ ] **Step 4: Validate shell syntax and repository hygiene**

From the repository root:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -n deploy/deploy.sh
git diff --check
git status --short
```

Expected: Bash and whitespace checks succeed; status contains only intentional changes, if any.

## Task 7: Record the delivered result and publish the branch

**Files:**

- Create: `docs/archive/2026-07-21-production-deployment-readiness.md`

- [ ] **Step 1: Add the implementation archive record**

Create the archive document in Chinese with:

- The approved architecture and identity model.
- Every file added or changed.
- Secure settings defaults and HSTS staging behavior.
- Deployment-script sequence and failure diagnostics.
- Tests/check/build commands and their actual results.
- Known boundary: the server bootstrap and live deployment are documented but not executed from the local repository task.
- Next operational step: configure the real domain, secrets, server packages, and repository access on the server, then run the first deployment.

- [ ] **Step 2: Run final hygiene checks**

```powershell
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors and only the archive record is uncommitted.

- [ ] **Step 3: Commit the archive record**

```powershell
git add docs/archive/2026-07-21-production-deployment-readiness.md
git commit -m "docs(server): archive deployment readiness work"
```

- [ ] **Step 4: Push the deployment branch**

```powershell
git push -u origin codex/production-deployment-readiness
```

Expected: the remote branch is created and local HEAD matches its upstream. Do not merge into `main` automatically; hand the verified branch to the user for review and merge.

## Plan self-review

- [ ] Every design requirement maps to an implementation task: Django settings, Gunicorn, `.env.example`, systemd, Nginx, deploy script, operations runbook, long-lived docs, tests, and archive record.
- [ ] Every code/config behavior starts with a failing automated contract test or focused settings test.
- [ ] The plan contains no real production domain, IP, password, secret, token, or private repository URL.
- [ ] Linux application commands run as `piaobozhe`; only the orchestration steps that require root remain privileged.
- [ ] PostgreSQL and Gunicorn stay bound to loopback/private local access; the public surface is Nginx on ports 80/443.
- [ ] Git update behavior is fast-forward-only and refuses dirty/non-`main` deployments.
- [ ] Verification covers backend tests, `check --deploy`, frontend tests/build, Bash syntax, and repository hygiene.
