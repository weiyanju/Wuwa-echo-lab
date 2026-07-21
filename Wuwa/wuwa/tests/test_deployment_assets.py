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
