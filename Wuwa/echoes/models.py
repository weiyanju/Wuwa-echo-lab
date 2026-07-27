from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from .constants import MAIN_STATS_BY_COST, SUBSTAT_TYPES, TIER_TABLES


class EchoRecord(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        ARCHIVED = "archived", "Archived"

    class SourceType(models.TextChoices):
        MANUAL = "manual", "Manual"
        ASSISTANT = "assistant", "Assistant"
        IMPORT = "import", "Import"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="echo_records")
    game_account = models.ForeignKey("accounts.GameAccount", on_delete=models.CASCADE, related_name="echo_records")
    echo_uid = models.CharField(max_length=80)
    display_name = models.CharField(max_length=120, blank=True)
    echo_asset_id = models.CharField(max_length=80, blank=True)
    echo_name = models.CharField(max_length=120, blank=True)
    echo_image = models.CharField(max_length=260, blank=True)
    cost = models.PositiveSmallIntegerField()
    set_name = models.CharField(max_length=120)
    main_stat = models.CharField(max_length=80)
    source = models.CharField(max_length=160, blank=True)
    source_type = models.CharField(max_length=20, choices=SourceType.choices, default=SourceType.MANUAL)
    tuning_batch_id = models.CharField(max_length=120, blank=True)
    is_continuous_tuning = models.BooleanField(default=False)
    auto_imported = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)
    last_tuned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "api_echorecord"
        ordering = ["-last_tuned_at", "-updated_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["game_account", "echo_uid"], name="unique_echo_uid_per_game_account"),
        ]
        indexes = [
            models.Index(fields=["game_account", "status"]),
            models.Index(fields=["game_account", "last_tuned_at"]),
            models.Index(fields=["game_account", "created_at"]),
        ]

    def clean(self):
        super().clean()
        if self.game_account_id and self.user_id and self.game_account.user_id != self.user_id:
            raise ValidationError({"game_account": "Game account must belong to the same user."})
        if self.game_account_id and self.game_account.workspace_locked:
            raise ValidationError({"game_account": "Bind a game UID before creating echo records."})
        if self.cost not in MAIN_STATS_BY_COST:
            raise ValidationError({"cost": "COST must be 1, 3, or 4."})
        if self.main_stat not in MAIN_STATS_BY_COST.get(self.cost, []):
            raise ValidationError({"main_stat": "Main stat is not legal for this COST."})

    def mark_tuned(self, roll_count=None, tuned_at=None):
        tuned_at = tuned_at or timezone.now()
        self.last_tuned_at = tuned_at
        if self.status != self.Status.ARCHIVED:
            if roll_count is None:
                roll_count = self.substat_rolls.count()
            self.status = self.Status.COMPLETED if roll_count >= 5 else self.Status.IN_PROGRESS
        self.updated_at = timezone.now()
        EchoRecord.objects.filter(pk=self.pk).update(
            last_tuned_at=self.last_tuned_at,
            status=self.status,
            updated_at=self.updated_at,
        )

    def recalculate_status(self, save=True):
        if self.status != self.Status.ARCHIVED:
            if self.substat_rolls.count() >= 5:
                self.status = self.Status.COMPLETED
            else:
                self.status = self.Status.IN_PROGRESS
        if save:
            self.save(update_fields=["status", "updated_at"])

    @transaction.atomic
    def save(self, *args, **kwargs):
        if not self.game_account_id and self.user_id:
            self.game_account = self.user.game_accounts.get(is_default=True)
        if not self.echo_uid and self.game_account_id:
            self.echo_uid = self.game_account.allocate_echo_uid()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.echo_name or self.display_name or self.echo_uid


class SubstatRoll(models.Model):
    ENHANCE_PHASE_CHOICES = [
        ("+5", "+5"),
        ("+10", "+10"),
        ("+15", "+15"),
        ("+20", "+20"),
        ("+25", "+25"),
    ]

    class SourceType(models.TextChoices):
        MANUAL = "manual", "Manual"
        ASSISTANT = "assistant", "Assistant"
        IMPORT = "import", "Import"

    echo = models.ForeignKey(EchoRecord, on_delete=models.CASCADE, related_name="substat_rolls")
    recognition_snapshot = models.ForeignKey(
        "recognition.RecognitionSnapshot",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_rolls",
    )
    position = models.PositiveSmallIntegerField()
    substat_type = models.CharField(max_length=80)
    tier_value = models.FloatField()
    tuned_at = models.DateTimeField(default=timezone.now)
    enhance_phase = models.CharField(max_length=8, choices=ENHANCE_PHASE_CHOICES, blank=True)
    tuning_order = models.PositiveIntegerField(null=True, blank=True)
    source_type = models.CharField(max_length=20, choices=SourceType.choices, default=SourceType.MANUAL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "api_substatroll"
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(fields=["echo", "position"], name="unique_substat_position_per_echo"),
            models.UniqueConstraint(fields=["echo", "substat_type"], name="unique_substat_type_per_echo"),
            models.CheckConstraint(condition=models.Q(position__gte=1) & models.Q(position__lte=5), name="substat_position_1_to_5"),
        ]
        indexes = [
            models.Index(fields=["echo"]),
            models.Index(fields=["tuned_at"]),
            models.Index(fields=["substat_type"]),
            models.Index(fields=["echo", "position"]),
        ]

    def clean(self):
        super().clean()
        if self.position < 1 or self.position > 5:
            raise ValidationError({"position": "Substat position must be between 1 and 5."})
        if self.substat_type not in SUBSTAT_TYPES:
            raise ValidationError({"substat_type": "Unknown substat type."})
        legal_values = [row["value"] for row in TIER_TABLES[self.substat_type]]
        if self.tier_value not in legal_values:
            raise ValidationError({"tier_value": "Tier value is not legal for this substat type."})
        if self.recognition_snapshot_id and self.recognition_snapshot.game_account_id != self.echo.game_account_id:
            raise ValidationError({"recognition_snapshot": "Snapshot must belong to the same game account."})

    @transaction.atomic(savepoint=False)
    def save(self, *args, validate=True, mark_echo=True, **kwargs):
        if validate:
            self.full_clean(validate_constraints=False)
        result = super().save(*args, **kwargs)
        if mark_echo:
            self.echo.mark_tuned()
        return result

    def __str__(self):
        return f"{self.echo_id}:{self.position}:{self.substat_type}={self.tier_value}"
