from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from .constants import MAIN_STATS_BY_COST, SUBSTAT_TYPES, TIER_TABLES


class EchoRecord(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "强化中"
        COMPLETED = "completed", "已完成"
        ARCHIVED = "archived", "已归档"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="echo_records")
    echo_uid = models.CharField(max_length=80)
    display_name = models.CharField(max_length=120, blank=True)
    cost = models.PositiveSmallIntegerField()
    set_name = models.CharField(max_length=120)
    main_stat = models.CharField(max_length=80)
    source = models.CharField(max_length=160, blank=True)
    tuning_batch_id = models.CharField(max_length=120, blank=True)
    is_continuous_tuning = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)
    last_tuned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_tuned_at", "-updated_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["user", "echo_uid"], name="unique_echo_uid_per_user"),
        ]

    def clean(self):
        super().clean()
        if self.cost not in MAIN_STATS_BY_COST:
            raise ValidationError({"cost": "COST 必须是 1、3 或 4。"})
        if self.main_stat not in MAIN_STATS_BY_COST.get(self.cost, []):
            raise ValidationError({"main_stat": "主词条与 COST 不匹配。"})

    def mark_tuned(self):
        self.last_tuned_at = timezone.now()
        if self.status != self.Status.ARCHIVED:
            if self.substat_rolls.count() >= 5:
                self.status = self.Status.COMPLETED
            else:
                self.status = self.Status.IN_PROGRESS
        self.save(update_fields=["last_tuned_at", "status", "updated_at"])

    def __str__(self):
        return self.display_name or self.echo_uid


class SubstatRoll(models.Model):
    ENHANCE_PHASE_CHOICES = [
        ("+5", "+5"),
        ("+10", "+10"),
        ("+15", "+15"),
        ("+20", "+20"),
        ("+25", "+25"),
    ]

    echo = models.ForeignKey(EchoRecord, on_delete=models.CASCADE, related_name="substat_rolls")
    position = models.PositiveSmallIntegerField()
    substat_type = models.CharField(max_length=80)
    tier_value = models.FloatField()
    tuned_at = models.DateTimeField(default=timezone.now)
    enhance_phase = models.CharField(max_length=8, choices=ENHANCE_PHASE_CHOICES, blank=True)
    tuning_order = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(fields=["echo", "position"], name="unique_substat_position_per_echo"),
            models.UniqueConstraint(fields=["echo", "substat_type"], name="unique_substat_type_per_echo"),
        ]

    def clean(self):
        super().clean()
        if self.position < 1 or self.position > 5:
            raise ValidationError({"position": "副词条位置必须在 1 到 5 之间。"})
        if self.substat_type not in SUBSTAT_TYPES:
            raise ValidationError({"substat_type": "未知副词条类型。"})
        legal_values = [row["value"] for row in TIER_TABLES[self.substat_type]]
        if self.tier_value not in legal_values:
            raise ValidationError({"tier_value": "该副词条没有这个合法档位。"})

    def save(self, *args, **kwargs):
        self.full_clean(validate_constraints=False)
        result = super().save(*args, **kwargs)
        self.echo.mark_tuned()
        return result

    def __str__(self):
        return f"{self.echo_id}:{self.position}:{self.substat_type}={self.tier_value}"
