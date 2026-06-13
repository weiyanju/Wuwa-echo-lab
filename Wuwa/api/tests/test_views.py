import json

from django.contrib.auth.models import User
from django.db import connection
from django.test import Client, TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse

from api.models import EchoRecord, GameAccount, RecognitionSession, RecognitionSnapshot, SubstatRoll


class ApiViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="tester", password="pw12345")
        self.user.game_accounts.update(uid="123456789")

    def test_register_login_and_me(self):
        response = self.client.post(
            reverse("register"),
            data=json.dumps({"username": "new-user", "password": "pw12345"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["default_game_account"]["uid"], "")
        self.assertTrue(body["default_game_account"]["workspace_locked"])

        response = self.client.post(
            reverse("login"),
            data=json.dumps({"username": "new-user", "password": "pw12345"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

        response = self.client.get(reverse("me"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "new-user")
        self.assertEqual(response.json()["default_game_account"]["uid"], "")
        self.assertTrue(response.json()["workspace_locked"])

    def test_game_account_list_create_and_bind_default(self):
        self.client.login(username="tester", password="pw12345")

        response = self.client.get(reverse("game_account_list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["results"]), 1)
        self.assertEqual(response.json()["results"][0]["uid"], "123456789")

        response = self.client.post(
            reverse("game_account_list"),
            data=json.dumps({"uid": "987654321", "nickname": "alt"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        created = response.json()
        self.assertEqual(created["uid"], "987654321")
        self.assertFalse(created["is_default"])

        response = self.client.patch(
            reverse("game_account_detail", args=[created["id"]]),
            data=json.dumps({"is_default": True, "nickname": "main alt"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["is_default"])
        self.assertEqual(response.json()["nickname"], "main alt")
        self.assertEqual(self.user.game_accounts.filter(is_default=True).get().id, created["id"])

    def test_game_account_rejects_duplicate_uid_for_same_user(self):
        self.client.login(username="tester", password="pw12345")

        response = self.client.post(
            reverse("game_account_list"),
            data=json.dumps({"uid": "123456789", "server": ""}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())

    def test_game_account_requires_ownership(self):
        other = User.objects.create_user(username="other-account", password="pw12345")
        other_account = other.game_accounts.get()
        self.client.login(username="tester", password="pw12345")

        response = self.client.patch(
            reverse("game_account_detail", args=[other_account.id]),
            data=json.dumps({"uid": "111111111"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 404)

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

    def test_add_substat_uses_bounded_queries(self):
        self.client.login(username="tester", password="pw12345")
        echo = EchoRecord.objects.create(
            user=self.user,
            game_account=self.user.game_accounts.get(),
            echo_uid="e-query-budget",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
        )

        with CaptureQueriesContext(connection) as queries:
            response = self.client.post(
                reverse("substat_create", args=[echo.id]),
                data=json.dumps({"substat_type": "crit_rate", "tier_value": 6.3}),
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 201)
        self.assertLessEqual(len(queries.captured_queries), 8)

    def test_create_echo_allocates_uid_when_missing(self):
        self.client.login(username="tester", password="pw12345")

        response = self.client.post(
            reverse("echo_list"),
            data=json.dumps(
                {
                    "cost": 1,
                    "set_name": "Set",
                    "main_stat": "atk_percent",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["echo_uid"], f"{self.user.game_accounts.get().id:06d}000001")

    def test_echo_list_is_scoped_by_game_account(self):
        self.client.login(username="tester", password="pw12345")
        default_account = self.user.game_accounts.get()
        alt_account = GameAccount.objects.create(user=self.user, uid="987654321")
        default_echo = EchoRecord.objects.create(
            user=self.user,
            game_account=default_account,
            echo_uid="default-1",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
        )
        EchoRecord.objects.create(
            user=self.user,
            game_account=alt_account,
            echo_uid="alt-1",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
        )

        response = self.client.get(reverse("echo_list"), {"game_account_id": default_account.id})

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.json()["results"]], [default_echo.id])

    def test_create_echo_rejects_unbound_default_game_account(self):
        self.user.game_accounts.update(uid="")
        self.client.login(username="tester", password="pw12345")

        response = self.client.post(
            reverse("echo_list"),
            data=json.dumps({"cost": 1, "set_name": "Set", "main_stat": "atk_percent"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())

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
        other.game_accounts.update(uid="987654321")
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
        other.game_accounts.update(uid="987654321")
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
        other.game_accounts.update(uid="987654321")
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


class RecognitionApiViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="tester", password="pw12345")
        self.account = self.user.game_accounts.get()
        self.account.uid = "123456789"
        self.account.save()
        self.client.login(username="tester", password="pw12345")

    def _create_session(self):
        response = self.client.post(
            reverse("recognition_session_list"),
            data=json.dumps(
                {
                    "game_account_id": self.account.id,
                    "client_name": "WuwaAssistant",
                    "client_version": "0.1.0",
                    "game_window_title": "Wuthering Waves",
                    "screen_resolution": "2560x1440",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        return response.json()

    def _sample_snapshot_payload(self, session_id, tier_value=6.3, client_event_id="sample-echo-001"):
        return {
            "game_account_id": self.account.id,
            "session_id": session_id,
            "trigger_type": "sample_payload",
            "client_event_id": client_event_id,
            "captured_at": "2026-06-07T12:00:00+08:00",
            "hashes": {"detail": f"detail-hash-{client_event_id}"},
            "detail_snapshot_raw": {
                "name": "Sample Echo",
                "set": "Sierra Gale",
                "cost": 4,
                "main_stat": "crit_rate",
                "substats": [{"name": "crit_rate", "value": tier_value}],
            },
            "normalized_snapshot": {
                "display_name": "Sample Echo",
                "set_name": "Sierra Gale",
                "cost": 4,
                "main_stat": "crit_rate",
                "substats": [
                    {
                        "position": 1,
                        "substat_type": "crit_rate",
                        "tier_value": tier_value,
                    }
                ],
            },
            "field_confidence": {"detail_page": 1.0},
        }

    def test_create_list_and_read_recognition_session(self):
        session = self._create_session()

        self.assertEqual(session["status"], "active")
        self.assertEqual(session["snapshot_count"], 0)
        self.assertEqual(session["saved_roll_count"], 0)
        self.assertEqual(session["conflict_count"], 0)

        response = self.client.get(
            reverse("recognition_session_list"),
            {"game_account_id": self.account.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"][0]["id"], session["id"])

        response = self.client.get(reverse("recognition_session_detail", args=[session["id"]]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], session["id"])

    def test_sample_snapshot_import_creates_formal_echo_and_roll(self):
        session = self._create_session()

        response = self.client.post(
            reverse("recognition_snapshot_list"),
            data=json.dumps(self._sample_snapshot_payload(session["id"])),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], "saved")
        self.assertEqual(body["match_status"], "created")
        self.assertEqual(body["created_roll_count"], 1)
        self.assertIsNotNone(body["created_echo_id"])

        snapshot = RecognitionSnapshot.objects.get(id=body["snapshot_id"])
        echo = EchoRecord.objects.get(id=body["created_echo_id"])
        roll = SubstatRoll.objects.get(echo=echo)
        self.assertEqual(snapshot.created_echo_id, echo.id)
        self.assertEqual(roll.recognition_snapshot_id, snapshot.id)
        self.assertEqual(roll.substat_type, "crit_rate")
        self.assertEqual(roll.tier_value, 6.3)

        db_session = RecognitionSession.objects.get(id=session["id"])
        self.assertEqual(db_session.snapshot_count, 1)
        self.assertEqual(db_session.saved_roll_count, 1)
        self.assertEqual(db_session.created_echo_count, 1)
        self.assertEqual(db_session.conflict_count, 0)

    def test_invalid_tier_snapshot_is_conflict_and_does_not_create_sample(self):
        session = self._create_session()
        roll_count = SubstatRoll.objects.count()

        response = self.client.post(
            reverse("recognition_snapshot_list"),
            data=json.dumps(
                self._sample_snapshot_payload(
                    session["id"],
                    tier_value=7.0,
                    client_event_id="invalid-tier-sample",
                )
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], "conflict")
        self.assertEqual(body["match_status"], "conflict")
        self.assertEqual(body["created_roll_count"], 0)
        self.assertEqual(body["error_code"], "invalid_substat_tier")

        self.assertEqual(SubstatRoll.objects.count(), roll_count)
        db_session = RecognitionSession.objects.get(id=session["id"])
        self.assertEqual(db_session.snapshot_count, 1)
        self.assertEqual(db_session.saved_roll_count, 0)
        self.assertEqual(db_session.conflict_count, 1)

    def test_repeated_client_event_id_replays_existing_snapshot_without_duplicate_sample(self):
        session = self._create_session()
        payload = self._sample_snapshot_payload(session["id"])

        first_response = self.client.post(
            reverse("recognition_snapshot_list"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        second_response = self.client.post(
            reverse("recognition_snapshot_list"),
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 200)
        first_body = first_response.json()
        second_body = second_response.json()
        self.assertEqual(second_body["snapshot_id"], first_body["snapshot_id"])
        self.assertEqual(second_body["created_echo_id"], first_body["created_echo_id"])
        self.assertEqual(EchoRecord.objects.filter(game_account=self.account).count(), 1)
        self.assertEqual(SubstatRoll.objects.count(), 1)

        db_session = RecognitionSession.objects.get(id=session["id"])
        self.assertEqual(db_session.snapshot_count, 1)
        self.assertEqual(db_session.saved_roll_count, 1)

    def test_repeated_detail_hash_is_ignored_duplicate_without_formal_sample(self):
        session = self._create_session()
        first_payload = self._sample_snapshot_payload(session["id"], client_event_id="detail-hash-first")
        second_payload = self._sample_snapshot_payload(session["id"], client_event_id="detail-hash-second")
        second_payload["hashes"]["detail"] = first_payload["hashes"]["detail"]

        first_response = self.client.post(
            reverse("recognition_snapshot_list"),
            data=json.dumps(first_payload),
            content_type="application/json",
        )
        second_response = self.client.post(
            reverse("recognition_snapshot_list"),
            data=json.dumps(second_payload),
            content_type="application/json",
        )

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 201)
        second_body = second_response.json()
        self.assertEqual(second_body["status"], "ignored_duplicate")
        self.assertEqual(second_body["match_status"], "conflict")
        self.assertEqual(second_body["created_roll_count"], 0)
        self.assertEqual(second_body["error_code"], "duplicate_detail_screenshot_hash")
        self.assertEqual(EchoRecord.objects.filter(game_account=self.account).count(), 1)
        self.assertEqual(SubstatRoll.objects.count(), 1)

        db_session = RecognitionSession.objects.get(id=session["id"])
        self.assertEqual(db_session.snapshot_count, 2)
        self.assertEqual(db_session.saved_roll_count, 1)
        self.assertEqual(db_session.conflict_count, 0)

    def test_snapshot_list_returns_game_account_scoped_review_rows(self):
        session = self._create_session()
        saved_response = self.client.post(
            reverse("recognition_snapshot_list"),
            data=json.dumps(self._sample_snapshot_payload(session["id"], client_event_id="review-saved")),
            content_type="application/json",
        )
        conflict_response = self.client.post(
            reverse("recognition_snapshot_list"),
            data=json.dumps(
                self._sample_snapshot_payload(
                    session["id"],
                    tier_value=7.0,
                    client_event_id="review-conflict",
                )
            ),
            content_type="application/json",
        )

        response = self.client.get(
            reverse("recognition_snapshot_list"),
            {"game_account_id": self.account.id, "status": "saved,conflict,rejected,ignored_duplicate"},
        )

        self.assertEqual(response.status_code, 200)
        rows = response.json()["results"]
        self.assertEqual([row["snapshot_id"] for row in rows], [conflict_response.json()["snapshot_id"], saved_response.json()["snapshot_id"]])
        self.assertEqual(rows[0]["status"], "conflict")
        self.assertEqual(rows[1]["status"], "saved")
        self.assertEqual(rows[1]["created_roll_count"], 1)

    def test_snapshot_list_requires_game_account_ownership(self):
        other = User.objects.create_user(username="other-snapshot-list", password="pw12345")
        other_account = other.game_accounts.get()
        other_account.uid = "987654321"
        other_account.save()

        response = self.client.get(
            reverse("recognition_snapshot_list"),
            {"game_account_id": other_account.id},
        )

        self.assertEqual(response.status_code, 404)

    def test_revert_snapshot_removes_created_rolls_and_empty_created_echo(self):
        session = self._create_session()
        response = self.client.post(
            reverse("recognition_snapshot_list"),
            data=json.dumps(self._sample_snapshot_payload(session["id"])),
            content_type="application/json",
        )
        body = response.json()
        snapshot_id = body["snapshot_id"]
        created_echo_id = body["created_echo_id"]
        created_roll_ids = body["created_roll_ids"]

        response = self.client.post(reverse("recognition_snapshot_revert", args=[snapshot_id]))

        self.assertEqual(response.status_code, 200)
        reverted = response.json()
        self.assertEqual(reverted["status"], "reverted")
        self.assertIsNotNone(reverted["reverted_at"])
        self.assertFalse(EchoRecord.objects.filter(id=created_echo_id).exists())
        self.assertFalse(SubstatRoll.objects.filter(id__in=created_roll_ids).exists())

        snapshot = RecognitionSnapshot.objects.get(id=snapshot_id)
        self.assertEqual(snapshot.status, "reverted")
        db_session = RecognitionSession.objects.get(id=session["id"])
        self.assertEqual(db_session.snapshot_count, 1)
        self.assertEqual(db_session.saved_roll_count, 0)
        self.assertEqual(db_session.created_echo_count, 0)
        self.assertEqual(db_session.reverted_count, 1)

    def test_revert_snapshot_requires_ownership(self):
        other = User.objects.create_user(username="other-recognition", password="pw12345")
        other_account = other.game_accounts.get()
        other_account.uid = "987654321"
        other_account.save()
        other_session = RecognitionSession.objects.create(user=other, game_account=other_account)
        other_snapshot = RecognitionSnapshot.objects.create(
            user=other,
            game_account=other_account,
            session=other_session,
            status=RecognitionSnapshot.Status.SAVED,
        )

        response = self.client.post(reverse("recognition_snapshot_revert", args=[other_snapshot.id]))

        self.assertEqual(response.status_code, 404)
        other_snapshot.refresh_from_db()
        self.assertEqual(other_snapshot.status, RecognitionSnapshot.Status.SAVED)
