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
    schema_version = models.PositiveSmallIntegerField(default=2)
    model_version = models.CharField(max_length=40, default="incremental-v2")
    source_version = models.PositiveBigIntegerField(default=0)
    total_rolls = models.PositiveBigIntegerField(default=0)
    last_tuned_at = models.DateTimeField(null=True, blank=True)
    last_roll_id = models.BigIntegerField(null=True, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    error_code = models.CharField(max_length=80, blank=True)
    rebuild_token = models.UUIDField(null=True, blank=True, editable=False)
    rebuild_started_at = models.DateTimeField(null=True, blank=True)
    built_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "analytics_game_account_state"
        indexes = [models.Index(fields=["status", "updated_at"])]


class GameAccountPatternAggregate(models.Model):
    game_account = models.ForeignKey(
        "accounts.GameAccount",
        on_delete=models.CASCADE,
        related_name="analytics_pattern_aggregates",
    )
    length = models.PositiveSmallIntegerField()
    prefix = models.CharField(max_length=255)
    anchor = models.CharField(max_length=80)
    next_counts = models.JSONField(default=dict)

    class Meta:
        db_table = "analytics_game_account_pattern"
        constraints = [
            models.UniqueConstraint(
                fields=["game_account", "length", "prefix"],
                name="analytics_pattern_account_length_prefix_unique",
            ),
            models.CheckConstraint(
                condition=models.Q(length__gte=1) & models.Q(length__lte=3),
                name="analytics_pattern_length_1_to_3",
            ),
        ]
        indexes = [
            models.Index(
                fields=["game_account", "length", "anchor"],
                name="analytics_g_game_ac_3d4998_idx",
            ),
        ]
