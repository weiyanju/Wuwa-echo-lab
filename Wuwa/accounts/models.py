from django.conf import settings
from django.db import models, transaction
from django.db.models import Q
from django.db.models.signals import post_save
from django.dispatch import receiver


class GameAccount(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="game_accounts")
    uid = models.CharField(max_length=32, blank=True)
    server = models.CharField(max_length=32, blank=True)
    nickname = models.CharField(max_length=80, blank=True)
    is_default = models.BooleanField(default=False)
    next_echo_sequence = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "api_gameaccount"
        ordering = ["-is_default", "-updated_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "uid", "server"],
                condition=~Q(uid=""),
                name="unique_bound_game_account_per_user",
            ),
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(is_default=True),
                name="unique_default_game_account_per_user",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "is_default"]),
            models.Index(fields=["user", "uid", "server"]),
        ]

    @property
    def workspace_locked(self):
        return not bool(self.uid.strip())

    def allocate_echo_uid(self):
        with transaction.atomic():
            account = GameAccount.objects.select_for_update().get(pk=self.pk)
            sequence = account.next_echo_sequence
            account.next_echo_sequence = sequence + 1
            account.save(update_fields=["next_echo_sequence", "updated_at"])
        self.next_echo_sequence = sequence + 1
        return f"{self.pk:06d}{sequence:06d}"

    def __str__(self):
        return self.uid or f"{self.user_id}:unbound"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_game_account(sender, instance, created, **kwargs):
    if created:
        GameAccount.objects.get_or_create(user=instance, is_default=True, defaults={"uid": ""})

