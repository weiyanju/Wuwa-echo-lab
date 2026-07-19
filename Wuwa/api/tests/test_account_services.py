from unittest.mock import patch

from django.contrib.auth.models import User
from django.db import IntegrityError
from django.test import TestCase

from accounts import services


class AccountServiceTests(TestCase):
    def test_start_registration_resumes_existing_user_after_create_race(self):
        unfinished_user = User.objects.create_user(username="unfinished", password="pw12345")
        unfinished_account = unfinished_user.game_accounts.get()

        self.assertTrue(hasattr(services, "start_registration"))
        with patch("accounts.services.register_user", side_effect=IntegrityError):
            result = services.start_registration("unfinished", "pw12345")

        self.assertEqual(result.user.id, unfinished_user.id)
        self.assertEqual(result.outcome, "resumed")
        self.assertEqual(User.objects.filter(username="unfinished").count(), 1)
        self.assertEqual(unfinished_user.game_accounts.count(), 1)
        self.assertEqual(unfinished_user.game_accounts.get().id, unfinished_account.id)
