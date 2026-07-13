import importlib
import os
import unittest
from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured


class DatabaseSettingsTests(unittest.TestCase):
    def load_settings_with_env(self, env):
        with patch.dict(os.environ, env, clear=True):
            import wuwa.settings

            return importlib.reload(wuwa.settings)

    def test_postgresql_defaults_use_local_credentials(self):
        settings = self.load_settings_with_env(
            {
                "DB_NAME": "wuwa_dev",
            }
        )

        database = settings.DATABASES["default"]
        self.assertEqual(database["ENGINE"], "django.db.backends.postgresql")
        self.assertEqual(database["USER"], "PostgreSQL")
        self.assertEqual(database["PASSWORD"], "root")
        self.assertEqual(database["HOST"], "127.0.0.1")
        self.assertEqual(database["PORT"], "5432")

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
