from django.db import models


class GameAccountAnalyticsState(models.Model):
    class Status(models.TextChoices):
        DIRTY = "dirty", "Dirty"
        BUILDING = "building", "Building"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    game_account = models.OneToOneField(
        "accounts.GameAccount", on_delete=models.CASCADE, primary_key=True,
        related_name="analytics_state",
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DIRTY)
    schema_version = models.PositiveSmallIntegerField(default=1)
    model_version = models.CharField(max_length=40, default="incremental-v1")
    source_version = models.PositiveBigIntegerField(default=0)
    total_rolls = models.PositiveBigIntegerField(default=0)
    last_tuned_at = models.DateTimeField(null=True, blank=True)
    last_roll_id = models.BigIntegerField(null=True, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    error_code = models.CharField(max_length=80, blank=True)
    built_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "analytics_game_account_state"
        indexes = [models.Index(fields=["status", "updated_at"])]
