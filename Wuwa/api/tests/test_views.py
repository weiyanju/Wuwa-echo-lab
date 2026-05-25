import json

from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse

from api.models import EchoRecord, SubstatRoll


class ApiViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="tester", password="pw12345")

    def test_register_login_and_me(self):
        response = self.client.post(
            reverse("register"),
            data=json.dumps({"username": "new-user", "password": "pw12345"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)

        response = self.client.post(
            reverse("login"),
            data=json.dumps({"username": "new-user", "password": "pw12345"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

        response = self.client.get(reverse("me"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "new-user")

    def test_spa_can_get_csrf_cookie_and_post_json(self):
        csrf_client = Client(enforce_csrf_checks=True)
        response = csrf_client.get(reverse("health"))
        self.assertEqual(response.status_code, 200)
        token = response.cookies["csrftoken"].value

        response = csrf_client.post(
            reverse("register"),
            data=json.dumps({"username": "csrf-user", "password": "pw12345"}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 201)

    def test_create_echo_and_add_substat(self):
        self.client.login(username="tester", password="pw12345")
        response = self.client.post(
            reverse("echo_list"),
            data=json.dumps(
                {
                    "echo_uid": "e-1",
                    "display_name": "测试声骸",
                    "cost": 1,
                    "set_name": "啸谷长风",
                    "main_stat": "atk_percent",
                    "source": "无音区",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        echo_id = response.json()["id"]

        response = self.client.post(
            reverse("substat_create", args=[echo_id]),
            data=json.dumps({"substat_type": "crit_rate", "tier_value": 6.3}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["position"], 1)

    def test_undo_last_substat_removes_latest_roll_and_reopens_completed_echo(self):
        self.client.login(username="tester", password="pw12345")
        echo = EchoRecord.objects.create(
            user=self.user,
            echo_uid="e-undo",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
        )
        rolls = [
            ("crit_rate", 6.3),
            ("crit_damage", 12.6),
            ("flat_atk", 30),
            ("flat_hp", 320),
            ("skill_damage", 6.4),
        ]
        for position, (substat_type, tier_value) in enumerate(rolls, start=1):
            SubstatRoll.objects.create(
                echo=echo,
                position=position,
                substat_type=substat_type,
                tier_value=tier_value,
            )
        echo.refresh_from_db()
        self.assertEqual(echo.status, EchoRecord.Status.COMPLETED)

        response = self.client.delete(reverse("substat_undo_last", args=[echo.id]))

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["removed"]["position"], 5)
        self.assertEqual(body["echo"]["status"], EchoRecord.Status.IN_PROGRESS)
        self.assertEqual([roll["position"] for roll in body["echo"]["substats"]], [1, 2, 3, 4])
        self.assertFalse(SubstatRoll.objects.filter(echo=echo, position=5).exists())

    def test_undo_last_substat_requires_ownership(self):
        other = User.objects.create_user(username="other-undo", password="pw12345")
        echo = EchoRecord.objects.create(
            user=other,
            echo_uid="other-undo-1",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
        )
        SubstatRoll.objects.create(echo=echo, position=1, substat_type="crit_rate", tier_value=6.3)
        self.client.login(username="tester", password="pw12345")

        response = self.client.delete(reverse("substat_undo_last", args=[echo.id]))

        self.assertEqual(response.status_code, 404)
        self.assertEqual(SubstatRoll.objects.filter(echo=echo).count(), 1)

    def test_prediction_requires_ownership(self):
        other = User.objects.create_user(username="other", password="pw12345")
        echo = EchoRecord.objects.create(
            user=other,
            echo_uid="other-1",
            cost=1,
            set_name="啸谷长风",
            main_stat="atk_percent",
        )
        self.client.login(username="tester", password="pw12345")

        response = self.client.get(reverse("echo_prediction", args=[echo.id]))

        self.assertEqual(response.status_code, 404)

    def test_echo_list_returns_history_with_existing_rolls(self):
        self.client.login(username="tester", password="pw12345")
        echo = EchoRecord.objects.create(
            user=self.user,
            echo_uid="e-1",
            cost=1,
            set_name="啸谷长风",
            main_stat="atk_percent",
        )
        SubstatRoll.objects.create(echo=echo, position=1, substat_type="crit_rate", tier_value=6.3)

        response = self.client.get(reverse("echo_list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"][0]["substats"][0]["substat_type"], "crit_rate")
        self.assertIn("created_at", response.json()["results"][0])

    def test_patch_owned_echo_updates_allowed_fields(self):
        self.client.login(username="tester", password="pw12345")
        echo = EchoRecord.objects.create(
            user=self.user,
            echo_uid="e-1",
            display_name="Old name",
            cost=1,
            set_name="Old set",
            main_stat="atk_percent",
            source="Old source",
        )

        response = self.client.patch(
            reverse("echo_detail", args=[echo.id]),
            data=json.dumps(
                {
                    "display_name": "New name",
                    "set_name": "New set",
                    "source": "New source",
                    "is_continuous_tuning": True,
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["display_name"], "New name")
        self.assertEqual(body["set_name"], "New set")
        self.assertEqual(body["source"], "New source")
        self.assertIs(body["is_continuous_tuning"], True)

        echo.refresh_from_db()
        self.assertEqual(echo.display_name, "New name")
        self.assertEqual(echo.set_name, "New set")
        self.assertEqual(echo.source, "New source")
        self.assertIs(echo.is_continuous_tuning, True)

    def test_patch_echo_requires_ownership(self):
        other = User.objects.create_user(username="other", password="pw12345")
        echo = EchoRecord.objects.create(
            user=other,
            echo_uid="other-1",
            cost=1,
            set_name="Other set",
            main_stat="atk_percent",
        )
        self.client.login(username="tester", password="pw12345")

        response = self.client.patch(
            reverse("echo_detail", args=[echo.id]),
            data=json.dumps({"display_name": "Should not update"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 404)

    def test_get_only_endpoints_reject_post(self):
        self.client.login(username="tester", password="pw12345")
        echo = EchoRecord.objects.create(
            user=self.user,
            echo_uid="e-1",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
        )

        urls = [
            reverse("me"),
            reverse("echo_prediction", args=[echo.id]),
            reverse("stats"),
            reverse("model_evaluation"),
        ]

        for url in urls:
            with self.subTest(url=url):
                response = self.client.post(url)
                self.assertEqual(response.status_code, 405)

    def test_patch_echo_parses_boolean_strings(self):
        self.client.login(username="tester", password="pw12345")
        echo = EchoRecord.objects.create(
            user=self.user,
            echo_uid="e-1",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
            is_continuous_tuning=True,
        )

        response = self.client.patch(
            reverse("echo_detail", args=[echo.id]),
            data=json.dumps({"is_continuous_tuning": "false"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIs(response.json()["is_continuous_tuning"], False)
        echo.refresh_from_db()
        self.assertIs(echo.is_continuous_tuning, False)

        response = self.client.patch(
            reverse("echo_detail", args=[echo.id]),
            data=json.dumps({"is_continuous_tuning": "true"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIs(response.json()["is_continuous_tuning"], True)
        echo.refresh_from_db()
        self.assertIs(echo.is_continuous_tuning, True)

    def test_patch_echo_rejects_non_string_display_name(self):
        self.client.login(username="tester", password="pw12345")
        echo = EchoRecord.objects.create(
            user=self.user,
            echo_uid="e-1",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
        )

        response = self.client.patch(
            reverse("echo_detail", args=[echo.id]),
            data=json.dumps({"display_name": 123}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())

    def test_register_rejects_bad_json(self):
        response = self.client.post(
            reverse("register"),
            data="{bad-json",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())

    def test_unauthenticated_me_returns_json_401(self):
        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"], "请先登录。")

    def test_patch_echo_rejects_json_array_body(self):
        self.client.login(username="tester", password="pw12345")
        echo = EchoRecord.objects.create(
            user=self.user,
            echo_uid="e-1",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
        )

        response = self.client.patch(
            reverse("echo_detail", args=[echo.id]),
            data=json.dumps([]),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())

    def test_register_rejects_json_array_body(self):
        response = self.client.post(
            reverse("register"),
            data=json.dumps([]),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())

    def test_register_rejects_non_string_username(self):
        response = self.client.post(
            reverse("register"),
            data=json.dumps({"username": 123, "password": "pw12345"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())

    def test_login_rejects_non_string_password(self):
        response = self.client.post(
            reverse("login"),
            data=json.dumps({"username": "tester", "password": 123}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())
