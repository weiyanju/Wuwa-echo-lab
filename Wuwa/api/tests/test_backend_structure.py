from importlib import import_module
import json
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

    def test_local_database_default_is_named_and_limited_to_development(self):
        settings_source = (Path(__file__).resolve().parents[2] / "wuwa" / "settings.py").read_text(encoding="utf-8")

        self.assertIn("LOCAL_DEVELOPMENT_DB_PASSWORD = 'root'", settings_source)
        self.assertIn("'' if IS_PRODUCTION else LOCAL_DEVELOPMENT_DB_PASSWORD", settings_source)

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

    def test_api_response_helpers_preserve_existing_payload_contracts(self):
        responses = import_module("api.responses")

        success = responses.success_response({"result": "ok"}, status=201)
        error = responses.error_response("invalid", status=400)

        self.assertEqual(success.status_code, 201)
        self.assertEqual(json.loads(success.content), {"result": "ok"})
        self.assertEqual(error.status_code, 400)
        self.assertEqual(json.loads(error.content), {"error": "invalid"})

    def test_recognition_views_use_shared_response_helpers(self):
        source = (Path(__file__).resolve().parents[2] / "recognition" / "views.py").read_text(encoding="utf-8")

        self.assertNotIn("from django.http import JsonResponse", source)
        self.assertIn("from api.responses import error_response, success_response", source)

    def test_domain_views_do_not_construct_json_responses_directly(self):
        backend_root = Path(__file__).resolve().parents[2]

        for relative_path in (
            "accounts/views.py",
            "analytics/views.py",
            "echoes/views.py",
            "recognition/views.py",
            "api/views.py",
        ):
            with self.subTest(relative_path=relative_path):
                source = (backend_root / relative_path).read_text(encoding="utf-8")
                self.assertNotIn("from django.http import JsonResponse", source)

    def test_account_ownership_queries_have_a_single_domain_owner(self):
        ownership = import_module("accounts.ownership")
        backend_root = Path(__file__).resolve().parents[2]

        self.assertTrue(callable(ownership.owned_game_account))
        self.assertTrue(callable(ownership.default_game_account))
        for relative_path in (
            "accounts/views.py",
            "echoes/views.py",
            "echoes/serializers.py",
            "recognition/service_support.py",
        ):
            with self.subTest(relative_path=relative_path):
                source = (backend_root / relative_path).read_text(encoding="utf-8")
                self.assertNotIn("GameAccount.objects.get(id=", source)

    def test_echo_services_own_echo_queries_and_undo_workflow(self):
        services = import_module("echoes.services")
        backend_root = Path(__file__).resolve().parents[2]
        echoes_views = (backend_root / "echoes" / "views.py").read_text(encoding="utf-8")
        analytics_views = (backend_root / "analytics" / "views.py").read_text(encoding="utf-8")

        self.assertTrue(callable(services.owned_echo))
        self.assertTrue(callable(services.undo_last_substat))
        self.assertNotIn("def owned_echo_or_404", echoes_views)
        self.assertNotIn("from echoes.views import", analytics_views)

    def test_domain_services_own_account_and_echo_write_workflows(self):
        accounts_services = import_module("accounts.services")
        echoes_services = import_module("echoes.services")
        backend_root = Path(__file__).resolve().parents[2]
        account_serializers = (backend_root / "accounts" / "serializers.py").read_text(encoding="utf-8")
        echo_serializers = (backend_root / "echoes" / "serializers.py").read_text(encoding="utf-8")

        for name in ("register_user", "create_game_account", "update_game_account"):
            self.assertTrue(callable(getattr(accounts_services, name)))
        for name in ("create_echo", "update_echo", "delete_echo"):
            self.assertTrue(callable(getattr(echoes_services, name)))

        self.assertNotIn("transaction.atomic", account_serializers)
        self.assertNotIn("GameAccount(", account_serializers)
        self.assertNotIn("EchoRecord(", echo_serializers)
        self.assertNotIn("def game_account_from_payload", echo_serializers)

    def test_legacy_api_package_has_no_domain_compatibility_exports(self):
        backend_root = Path(__file__).resolve().parents[2]
        api_models = (backend_root / "api" / "models.py").read_text(encoding="utf-8")

        self.assertNotIn("from accounts.models import", api_models)
        self.assertNotIn("from echoes.models import", api_models)
        self.assertNotIn("from recognition.models import", api_models)
        for name in ("statistics.py", "prediction.py", "evaluation.py"):
            self.assertFalse((backend_root / "api" / "services" / name).exists())
