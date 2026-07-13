# Local Development Configuration Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the repository around the approved pre-release local PostgreSQL defaults, remove obsolete SSH/remote startup configuration, and add an explicit fail-fast production configuration boundary.

**Architecture:** Keep local development zero-friction through named, documented defaults limited to loopback PostgreSQL. Introduce `WUWA_ENV=production` as the deployment boundary: production uses no database-password fallback, requires an explicit Django secret and allowed hosts, disables debug, and drops localhost CORS/CSRF defaults unless explicitly configured. Keep the launcher local-only and preserve user work outside the scoped files.

**Tech Stack:** Django 6 settings, Python `unittest`, Windows batch, PowerShell static launcher tests, Markdown governance documentation

---

### Task 1: Reconcile Django settings and the conflicting tests

**Files:**
- Modify: `Wuwa/api/tests/test_backend_structure.py`
- Modify: `Wuwa/wuwa/tests/test_database_settings.py`
- Modify: `Wuwa/wuwa/settings.py`
- Test: `Wuwa/api/tests/test_backend_structure.py`
- Test: `Wuwa/wuwa/tests/test_database_settings.py`

- [x] **Step 1: Reproduce the existing policy conflict**

Run:

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test api.tests.test_backend_structure wuwa.tests.test_database_settings
```

Expected: FAIL only because `test_database_password_is_not_hardcoded_to_local_default` rejects the already-approved local fallback.

- [x] **Step 2: Replace the obsolete assertion and add deployment-boundary tests**

Replace the obsolete structure test with an intentional-contract assertion:

```python
def test_local_database_default_is_named_and_limited_to_development(self):
    settings_source = (Path(__file__).resolve().parents[2] / "wuwa" / "settings.py").read_text(encoding="utf-8")

    self.assertIn("LOCAL_DEVELOPMENT_DB_PASSWORD = 'root'", settings_source)
    self.assertIn("'' if IS_PRODUCTION else LOCAL_DEVELOPMENT_DB_PASSWORD", settings_source)
```

Extend `DatabaseSettingsTests` with deterministic environment loading and these behaviors:

```python
from django.core.exceptions import ImproperlyConfigured

def load_settings_with_env(self, env):
    with patch.dict(os.environ, env, clear=True):
        import wuwa.settings

        return importlib.reload(wuwa.settings)

def test_development_settings_accept_environment_overrides(self):
    settings = self.load_settings_with_env(
        {
            "WUWA_ENV": "development",
            "DJANGO_SECRET_KEY": "test-only-secret",
            "DJANGO_DEBUG": "false",
            "DJANGO_ALLOWED_HOSTS": "example.test,api.example.test",
            "DJANGO_CORS_ALLOWED_ORIGINS": "https://app.example.test",
            "DJANGO_CSRF_TRUSTED_ORIGINS": "https://app.example.test",
            "DB_PASSWORD": "test-only-password",
        }
    )

    self.assertFalse(settings.DEBUG)
    self.assertEqual(settings.ALLOWED_HOSTS, ["example.test", "api.example.test"])
    self.assertEqual(settings.CORS_ALLOWED_ORIGINS, ["https://app.example.test"])
    self.assertEqual(settings.CSRF_TRUSTED_ORIGINS, ["https://app.example.test"])
    self.assertEqual(settings.DATABASES["default"]["PASSWORD"], "test-only-password")

def test_production_requires_explicit_secret_database_password_and_hosts(self):
    try:
        with patch.dict(os.environ, {"WUWA_ENV": "production"}, clear=True):
            import wuwa.settings

            with self.assertRaisesRegex(
                ImproperlyConfigured,
                "DJANGO_SECRET_KEY, DB_PASSWORD, DJANGO_ALLOWED_HOSTS",
            ):
                importlib.reload(wuwa.settings)
    finally:
        self.load_settings_with_env({})

def test_production_uses_explicit_values_without_local_origin_defaults(self):
    settings = self.load_settings_with_env(
        {
            "WUWA_ENV": "production",
            "DJANGO_SECRET_KEY": "test-only-secret",
            "DB_PASSWORD": "test-only-password",
            "DJANGO_ALLOWED_HOSTS": "api.example.test",
        }
    )

    self.assertFalse(settings.DEBUG)
    self.assertEqual(settings.ALLOWED_HOSTS, ["api.example.test"])
    self.assertEqual(settings.CORS_ALLOWED_ORIGINS, [])
    self.assertEqual(settings.CSRF_TRUSTED_ORIGINS, [])
```

- [x] **Step 3: Run the settings tests and verify the new red state**

Run the command from Step 1.

Expected: FAIL because the named local constant, environment parsers, and production gate do not exist yet.

- [x] **Step 4: Implement the minimal environment model in `settings.py`**

Add configuration helpers and mode constants:

```python
from django.core.exceptions import ImproperlyConfigured

LOCAL_DEVELOPMENT_DB_PASSWORD = 'root'
LOCAL_DEVELOPMENT_SECRET_KEY = 'wuwa-local-development-only-not-for-production'
LOCAL_HOSTS = ['127.0.0.1', 'localhost']
LOCAL_WEB_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173']


def env_bool(name, default):
    value = os.environ.get(name)
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {'1', 'true', 'yes', 'on'}:
        return True
    if normalized in {'0', 'false', 'no', 'off'}:
        return False
    raise ImproperlyConfigured(f'{name} must be a boolean value')


def env_list(name, default):
    value = os.environ.get(name)
    if value is None:
        return list(default)
    return [item.strip() for item in value.split(',') if item.strip()]


WUWA_ENV = os.environ.get('WUWA_ENV', 'development').strip().lower()
if WUWA_ENV not in {'development', 'production'}:
    raise ImproperlyConfigured('WUWA_ENV must be development or production')
IS_PRODUCTION = WUWA_ENV == 'production'
```

Use environment-first values with local-only fallbacks:

```python
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', LOCAL_DEVELOPMENT_SECRET_KEY)
DEBUG = env_bool('DJANGO_DEBUG', not IS_PRODUCTION)

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', [] if IS_PRODUCTION else LOCAL_HOSTS)
CORS_ALLOWED_ORIGINS = env_list(
    'DJANGO_CORS_ALLOWED_ORIGINS',
    [] if IS_PRODUCTION else LOCAL_WEB_ORIGINS,
)
CSRF_TRUSTED_ORIGINS = env_list(
    'DJANGO_CSRF_TRUSTED_ORIGINS',
    [] if IS_PRODUCTION else LOCAL_WEB_ORIGINS,
)
```

Keep the approved default only in development:

```python
'PASSWORD': os.environ.get(
    'DB_PASSWORD',
    '' if IS_PRODUCTION else LOCAL_DEVELOPMENT_DB_PASSWORD,
),
```

Fail fast at the end of settings initialization:

```python
if IS_PRODUCTION:
    missing_production_settings = []
    if not os.environ.get('DJANGO_SECRET_KEY'):
        missing_production_settings.append('DJANGO_SECRET_KEY')
    if not os.environ.get('DB_PASSWORD'):
        missing_production_settings.append('DB_PASSWORD')
    if not ALLOWED_HOSTS:
        missing_production_settings.append('DJANGO_ALLOWED_HOSTS')
    if missing_production_settings:
        raise ImproperlyConfigured(
            'Production configuration requires: '
            + ', '.join(missing_production_settings)
        )
    if DEBUG:
        raise ImproperlyConfigured('DJANGO_DEBUG must be false in production')
```

- [x] **Step 5: Run the focused settings tests and verify green**

Run the command from Step 1.

Expected: all focused settings and structure tests pass.

### Task 2: Make `start-dev.bat` local-PostgreSQL-only

**Files:**
- Modify: `scripts/test-start-dev-script.ps1`
- Modify: `start-dev.bat`
- Test: `scripts/test-start-dev-script.ps1`

- [x] **Step 1: Add failing launcher-policy assertions**

Add this helper and contract to `scripts/test-start-dev-script.ps1`:

```powershell
function Assert-NotContains {
    param(
        [string] $Text,
        [string] $Unexpected
    )

    if ($Text.Contains($Unexpected)) {
        throw "Expected start-dev.bat not to contain: $Unexpected"
    }
}

Assert-Contains $script 'if not defined DB_PASSWORD set "DB_PASSWORD=root"'
Assert-Contains $script 'start-dev.bat only supports PostgreSQL on 127.0.0.1 or localhost.'

foreach ($obsoleteToken in @(
    'DB_USE_SSH_TUNNEL',
    'DB_REMOTE_HOST',
    'DB_REMOTE_PORT',
    'SSH_HOST',
    'SSH_USER',
    'KEY_PATH',
    'ssh -i',
    'Wuwa DB Tunnel'
)) {
    Assert-NotContains $script $obsoleteToken
}

if ($script -match 'C:\\Users\\') {
    throw 'start-dev.bat must not contain a user-local absolute path.'
}
```

- [x] **Step 2: Run the launcher test and verify red**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-start-dev-script.ps1
```

Expected: FAIL on the obsolete SSH/tunnel tokens and missing local-only gate.

- [x] **Step 3: Remove the SSH path and add the local-only gate**

In `start-dev.bat`:

- delete `DB_USE_SSH_TUNNEL`, `DB_REMOTE_HOST`, `DB_REMOTE_PORT`, `SSH_HOST`, `SSH_USER`, and `KEY_PATH` documentation/defaults;
- always default `DB_PORT` to `5432`;
- delete SSH prerequisite checks, the reconnecting tunnel window, and tunnel-specific shutdown copy;
- simplify PostgreSQL discovery/start conditions because the launcher now has only one database path;
- retain `DB_NAME=wuwa_dev`, `DB_USER=PostgreSQL`, `DB_PASSWORD=root`, and loopback defaults;
- add this fail-fast check after defaults:

```bat
if /I not "%DB_HOST%"=="127.0.0.1" if /I not "%DB_HOST%"=="localhost" (
    echo ERROR: start-dev.bat only supports PostgreSQL on 127.0.0.1 or localhost.
    echo Use deployment-specific configuration instead of the local launcher for remote hosts.
    goto fail
)
```

- [x] **Step 4: Run the static launcher test and `--check`**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-start-dev-script.ps1
$env:NO_PAUSE = '1'
$env:ENSURE_POSTGRES_DB = '0'
.\start-dev.bat --check
```

Expected: static test passes; `--check` exits 0 and starts no services.

### Task 3: Document the approved temporary exception and production gate

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `docs/developer-onboarding.md`
- Modify: `docs/security-privacy-and-data-boundaries.md`

- [x] **Step 1: Update the local startup contract**

Document these exact current facts in README and onboarding:

- the repository is pre-release and currently runs Django against local PostgreSQL;
- the approved development defaults are database `wuwa_dev`, role `PostgreSQL`, password `root`, host `127.0.0.1`, and port `5432`;
- Codex should use this path without asking for another database method and must not substitute SQLite;
- `start-dev.bat` is local-only and no longer offers SSH tunneling;
- environment variables may override development defaults when needed.

- [x] **Step 2: Update the security boundary and agent entrypoint**

Replace the blanket contradiction with a narrow exception:

```markdown
当前唯一允许写入受版本控制文件的凭据型默认值，是 pre-release 阶段仅绑定本机回环 PostgreSQL 的开发密码 `root`。这是用户明确批准的临时开发约定，不是生产凭据，也不得复用于远端或共享数据库。
```

Document the production boundary:

Document `WUWA_ENV=production` as the switch; require `DJANGO_SECRET_KEY`,
`DB_PASSWORD`, and comma-separated `DJANGO_ALLOWED_HOSTS`; require
`DJANGO_DEBUG=false`; and describe comma-separated
`DJANGO_CORS_ALLOWED_ORIGINS` and `DJANGO_CSRF_TRUSTED_ORIGINS` as optional
when the deployed Web origin differs from the API origin.

State that production mode refuses to start when required settings are absent, never uses the local database fallback, and never inherits localhost origin defaults.

- [x] **Step 3: Scan the active guidance for contradictions and obsolete SSH instructions**

Run:

```powershell
rg -n "SSH tunnel|DB_USE_SSH_TUNNEL|数据库凭据不是仓库稳定默认值|Django 数据库配置不能把本地密码写成代码级默认值" README.md AGENTS.md docs/developer-onboarding.md docs/security-privacy-and-data-boundaries.md
```

Expected: no obsolete instructions or blanket prohibition remain; the limited exception and production gate are present.

### Task 4: Remove temporary assets and close the audit record

**Files:**
- Delete: `_crop_check.png`
- Delete: `translated_probability_formula_cn.png`
- Modify: `docs/archive/2026-07-13-project-documentation-audit.md`
- Create: `docs/archive/2026-07-13-local-development-configuration-implementation.md`
- Modify: `docs/superpowers/plans/2026-07-13-local-development-configuration.md`

- [x] **Step 1: Delete the two approved temporary images**

Delete only the two tracked root files named above. Confirm no Markdown or source reference points to them before deletion.

- [x] **Step 2: Correct the audit statuses and acceptance criteria**

Update the audit so it records:

- the password-test conflict is closed by the approved pre-release local default and a production-only explicit password requirement;
- obsolete remote address, SSH user, private-key path, and tunnel code were removed from the launcher;
- `SECRET_KEY`, debug, allowed hosts, CORS, and CSRF settings are environment-aware;
- the Impeccable side-accent rule remains unchanged because the later design review confirmed it is built-in;
- both temporary images were deleted.

- [x] **Step 3: Write the implementation evidence record**

Record changed files, the temporary local exception, production gate, deleted assets, commands run, actual test counts, and any unexecuted validation with reasons. Do not claim deployment readiness; production mode is only a gate until a real server configuration is supplied and tested.

### Task 5: Run full verification and commit only this mainline closure

**Files:**
- Verify all files from Tasks 1-4

- [x] **Step 1: Run the complete Django suite**

Run:

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test
```

Expected: all Django tests pass with 0 failures.

- [x] **Step 2: Run launcher and repository checks**

Run from the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-start-dev-script.ps1
git diff --check
git status --short
```

Expected: launcher test passes; no whitespace errors; no generated files are added.

- [x] **Step 3: Review and stage only scoped files**

Review the complete diff, then stage only:

```text
AGENTS.md
README.md
Wuwa/api/tests/test_backend_structure.py
Wuwa/wuwa/settings.py
Wuwa/wuwa/tests/test_database_settings.py
start-dev.bat
scripts/test-start-dev-script.ps1
docs/developer-onboarding.md
docs/security-privacy-and-data-boundaries.md
docs/archive/2026-07-13-project-documentation-audit.md
docs/archive/2026-07-13-local-development-configuration-implementation.md
docs/superpowers/plans/2026-07-13-local-development-configuration.md
_crop_check.png (deletion)
translated_probability_formula_cn.png (deletion)
```

Do not stage existing unrelated documentation and design-system changes.

- [x] **Step 4: Commit the verified closure**

Run:

```powershell
git commit -m "fix: close local development configuration"
```

Expected: one isolated commit; unrelated working-tree changes remain unstaged.
