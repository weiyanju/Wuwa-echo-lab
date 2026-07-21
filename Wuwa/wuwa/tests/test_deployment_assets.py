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
        self.assertNotIn("0.0.0.0:8001", nginx)

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
