from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from api.models import EchoRecord, SubstatRoll


class EchoRecordModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pw")

    def test_echo_rejects_invalid_cost(self):
        echo = EchoRecord(user=self.user, echo_uid="e-1", cost=2, set_name="啸谷长风", main_stat="atk_percent")
        with self.assertRaises(ValidationError):
            echo.full_clean()

    def test_echo_rejects_invalid_main_stat_for_cost(self):
        echo = EchoRecord(user=self.user, echo_uid="e-1", cost=1, set_name="啸谷长风", main_stat="crit_rate")
        with self.assertRaises(ValidationError):
            echo.full_clean()

    def test_three_cost_accepts_hp_percent_main_stat(self):
        echo = EchoRecord(user=self.user, echo_uid="e-1", cost=3, set_name="啸谷长风", main_stat="hp_percent")
        echo.full_clean()

    def test_echo_defaults_to_in_progress(self):
        echo = EchoRecord.objects.create(user=self.user, echo_uid="e-1", cost=1, set_name="啸谷长风", main_stat="atk_percent")
        self.assertEqual(echo.status, EchoRecord.Status.IN_PROGRESS)


class SubstatRollModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pw")
        self.echo = EchoRecord.objects.create(
            user=self.user,
            echo_uid="e-1",
            cost=1,
            set_name="啸谷长风",
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
