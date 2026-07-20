from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from accounts.models import GameAccount
from echoes.models import EchoRecord, SubstatRoll
from recognition.models import RecognitionSession, RecognitionSnapshot


class EchoRecordModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pw")
        self.game_account = self.user.game_accounts.get()
        self.game_account.uid = "123456789"
        self.game_account.save(update_fields=["uid", "updated_at"])

    def test_user_creation_creates_default_empty_game_account(self):
        user = User.objects.create_user(username="new-user", password="pw")

        account = user.game_accounts.get()

        self.assertEqual(account.uid, "")
        self.assertTrue(account.is_default)
        self.assertTrue(account.workspace_locked)

    def test_bound_game_account_unlocks_workspace(self):
        self.assertFalse(self.game_account.workspace_locked)

    def test_game_account_allocates_echo_uid_without_frontend_sequence_storage(self):
        first_uid = self.game_account.allocate_echo_uid()
        second_uid = self.game_account.allocate_echo_uid()

        self.assertEqual(first_uid, f"{self.game_account.id:06d}000001")
        self.assertEqual(second_uid, f"{self.game_account.id:06d}000002")
        self.game_account.refresh_from_db()
        self.assertEqual(self.game_account.next_echo_sequence, 3)

    def test_echo_rejects_invalid_cost(self):
        echo = EchoRecord(
            user=self.user,
            game_account=self.game_account,
            echo_uid="e-1",
            cost=2,
            set_name="Sierra Gale",
            main_stat="atk_percent",
        )
        with self.assertRaises(ValidationError):
            echo.full_clean()

    def test_echo_rejects_invalid_main_stat_for_cost(self):
        echo = EchoRecord(
            user=self.user,
            game_account=self.game_account,
            echo_uid="e-1",
            cost=1,
            set_name="Sierra Gale",
            main_stat="crit_rate",
        )
        with self.assertRaises(ValidationError):
            echo.full_clean()

    def test_three_cost_accepts_hp_percent_main_stat(self):
        echo = EchoRecord(
            user=self.user,
            game_account=self.game_account,
            echo_uid="e-1",
            cost=3,
            set_name="Sierra Gale",
            main_stat="hp_percent",
        )
        echo.full_clean()

    def test_echo_defaults_to_in_progress(self):
        echo = EchoRecord.objects.create(
            user=self.user,
            game_account=self.game_account,
            echo_uid="e-1",
            cost=1,
            set_name="Sierra Gale",
            main_stat="atk_percent",
        )
        self.assertEqual(echo.status, EchoRecord.Status.IN_PROGRESS)

    def test_echo_rejects_game_account_from_another_user(self):
        other = User.objects.create_user(username="other", password="pw")
        other_account = other.game_accounts.get()
        echo = EchoRecord(
            user=self.user,
            game_account=other_account,
            echo_uid="e-1",
            cost=1,
            set_name="Sierra Gale",
            main_stat="atk_percent",
        )

        with self.assertRaises(ValidationError):
            echo.full_clean()

    def test_echo_rejects_unbound_game_account_on_save(self):
        self.game_account.uid = ""
        self.game_account.save(update_fields=["uid", "updated_at"])

        echo = EchoRecord(
            user=self.user,
            game_account=self.game_account,
            echo_uid="e-locked",
            cost=1,
            set_name="Sierra Gale",
            main_stat="atk_percent",
        )

        with self.assertRaises(ValidationError):
            echo.save()


class SubstatRollModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pw")
        self.game_account = self.user.game_accounts.get()
        self.game_account.uid = "123456789"
        self.game_account.save(update_fields=["uid", "updated_at"])
        self.echo = EchoRecord.objects.create(
            user=self.user,
            game_account=self.game_account,
            echo_uid="e-1",
            cost=1,
            set_name="Sierra Gale",
            main_stat="atk_percent",
        )

    def test_roll_rejects_invalid_substat_type(self):
        roll = SubstatRoll(echo=self.echo, position=1, substat_type="not_real", tier_value=1)
        with self.assertRaises(ValidationError):
            roll.full_clean()

    def test_roll_rejects_invalid_tier_value(self):
        roll = SubstatRoll(echo=self.echo, position=1, substat_type="crit_rate", tier_value=7.0)
        with self.assertRaises(ValidationError):
            roll.full_clean()

    def test_roll_rejects_duplicate_position(self):
        SubstatRoll.objects.create(echo=self.echo, position=1, substat_type="crit_rate", tier_value=6.3)
        with self.assertRaises(IntegrityError):
            SubstatRoll.objects.create(echo=self.echo, position=1, substat_type="crit_damage", tier_value=12.6)

    def test_roll_rejects_duplicate_substat_type(self):
        SubstatRoll.objects.create(echo=self.echo, position=1, substat_type="crit_rate", tier_value=6.3)
        with self.assertRaises(IntegrityError):
            SubstatRoll.objects.create(echo=self.echo, position=2, substat_type="crit_rate", tier_value=6.9)

    def test_roll_save_marks_echo_tuned_without_completing_first_roll(self):
        SubstatRoll.objects.create(echo=self.echo, position=1, substat_type="crit_rate", tier_value=6.3)

        self.echo.refresh_from_db()
        self.assertIsNotNone(self.echo.last_tuned_at)
        self.assertEqual(self.echo.status, EchoRecord.Status.IN_PROGRESS)

    def test_roll_save_completes_echo_after_fifth_roll(self):
        rolls = [
            (1, "crit_rate", 6.3),
            (2, "crit_damage", 12.6),
            (3, "atk_percent", 6.4),
            (4, "hp_percent", 7.1),
            (5, "def_percent", 8.1),
        ]
        for position, substat_type, tier_value in rolls:
            SubstatRoll.objects.create(
                echo=self.echo,
                position=position,
                substat_type=substat_type,
                tier_value=tier_value,
            )

        self.echo.refresh_from_db()
        self.assertEqual(self.echo.status, EchoRecord.Status.COMPLETED)

    def test_roll_save_preserves_archived_echo_status(self):
        self.echo.status = EchoRecord.Status.ARCHIVED
        self.echo.save(update_fields=["status"])

        SubstatRoll.objects.create(echo=self.echo, position=1, substat_type="crit_rate", tier_value=6.3)

        self.echo.refresh_from_db()
        self.assertIsNotNone(self.echo.last_tuned_at)
        self.assertEqual(self.echo.status, EchoRecord.Status.ARCHIVED)


class RecognitionModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pw")
        self.game_account = self.user.game_accounts.get()
        self.game_account.uid = "123456789"
        self.game_account.save(update_fields=["uid", "updated_at"])

    def test_session_belongs_to_user_and_game_account(self):
        session = RecognitionSession.objects.create(
            user=self.user,
            game_account=self.game_account,
            client_name="local-recognition-client",
            client_version="0.1.0",
        )

        self.assertEqual(session.status, RecognitionSession.Status.ACTIVE)
        self.assertEqual(session.snapshot_count, 0)

    def test_snapshot_stores_idempotency_and_raw_payload(self):
        session = RecognitionSession.objects.create(user=self.user, game_account=self.game_account)

        snapshot = RecognitionSnapshot.objects.create(
            session=session,
            user=self.user,
            game_account=self.game_account,
            trigger_type=RecognitionSnapshot.TriggerType.SAMPLE_PAYLOAD,
            client_event_id="sample-1",
            detail_snapshot_raw={"cost": 4, "main_stat": "crit_rate"},
            normalized_snapshot={"substats": [{"position": 1, "substat_type": "crit_rate", "tier_value": 6.3}]},
            field_confidence={"detail_page": 1.0},
            detail_screenshot_hash="hash-1",
        )

        self.assertEqual(snapshot.status, RecognitionSnapshot.Status.SAVED)
        self.assertEqual(snapshot.match_status, RecognitionSnapshot.MatchStatus.CREATED)
        self.assertEqual(snapshot.normalized_snapshot["substats"][0]["substat_type"], "crit_rate")

        with self.assertRaises(ValidationError):
            RecognitionSnapshot.objects.create(
                session=session,
                user=self.user,
                game_account=self.game_account,
                client_event_id="sample-1",
            )

    def test_session_rejects_game_account_from_another_user_on_save(self):
        other = User.objects.create_user(username="other", password="pw")
        session = RecognitionSession(user=self.user, game_account=other.game_accounts.get())

        with self.assertRaises(ValidationError):
            session.save()

    def test_snapshot_rejects_session_from_different_game_account_on_save(self):
        other_account = GameAccount.objects.create(user=self.user, uid="987654321")
        session = RecognitionSession.objects.create(user=self.user, game_account=self.game_account)
        snapshot = RecognitionSnapshot(session=session, user=self.user, game_account=other_account)

        with self.assertRaises(ValidationError):
            snapshot.save()
