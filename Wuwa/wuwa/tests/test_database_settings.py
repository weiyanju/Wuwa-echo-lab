import importlib
import os
import unittest
from unittest.mock import patch


class DatabaseSettingsTests(unittest.TestCase):
    def load_settings_with_env(self, env):
        with patch.dict(os.environ, env, clear=False):
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
