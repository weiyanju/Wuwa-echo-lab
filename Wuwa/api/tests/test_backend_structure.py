from importlib import import_module
from pathlib import Path

from django.apps import apps
from django.test import SimpleTestCase


class BackendStructureTests(SimpleTestCase):
    def test_backend_is_split_into_domain_apps(self):
        installed_labels = {config.label for config in apps.get_app_configs()}

        self.assertIn("accounts", installed_labels)
        self.assertIn("echoes", installed_labels)
        self.assertIn("recognition", installed_labels)
        self.assertIn("analytics", installed_labels)

    def test_legacy_api_app_does_not_own_domain_models(self):
        api_models = {model.__name__ for model in apps.get_app_config("api").get_models()}

        self.assertEqual(api_models, set())

    def test_database_password_is_not_hardcoded_to_local_default(self):
        settings_source = (Path(__file__).resolve().parents[2] / "wuwa" / "settings.py").read_text(encoding="utf-8")

        self.assertNotIn("os.environ.get('DB_PASSWORD', 'root')", settings_source)

    def test_echoes_service_layer_owns_substat_creation(self):
        services = import_module("echoes.services")

        self.assertTrue(callable(services.create_substat_roll))

    def test_recognition_services_are_split_by_workflow(self):
        facade = import_module("recognition.services")
        sessions = import_module("recognition.session_services")
        snapshots = import_module("recognition.snapshot_services")

        self.assertTrue(callable(sessions.create_session))
        self.assertTrue(callable(sessions.update_session))
        self.assertTrue(callable(snapshots.submit_snapshot))
        self.assertTrue(callable(snapshots.revert_snapshot))
        self.assertIs(facade.create_session, sessions.create_session)
        self.assertIs(facade.submit_snapshot, snapshots.submit_snapshot)

        facade_source = (Path(__file__).resolve().parents[2] / "recognition" / "services.py").read_text(encoding="utf-8")
        self.assertLessEqual(len(facade_source.splitlines()), 30)
