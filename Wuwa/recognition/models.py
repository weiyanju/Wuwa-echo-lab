from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone


class RecognitionSession(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ENDED = "ended", "Ended"
        EXPIRED = "expired", "Expired"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recognition_sessions")
    game_account = models.ForeignKey("accounts.GameAccount", on_delete=models.CASCADE, related_name="recognition_sessions")
    client_name = models.CharField(max_length=80, blank=True)
    client_version = models.CharField(max_length=40, blank=True)
    game_window_title = models.CharField(max_length=160, blank=True)
    screen_resolution = models.CharField(max_length=40, blank=True)
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    snapshot_count = models.PositiveIntegerField(default=0)
    saved_roll_count = models.PositiveIntegerField(default=0)
    created_echo_count = models.PositiveIntegerField(default=0)
    updated_echo_count = models.PositiveIntegerField(default=0)
    conflict_count = models.PositiveIntegerField(default=0)
    reverted_count = models.PositiveIntegerField(default=0)
    last_snapshot_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "api_recognitionsession"
        ordering = ["-started_at", "-id"]
        indexes = [
            models.Index(fields=["game_account", "status"]),
            models.Index(fields=["game_account", "started_at"]),
            models.Index(fields=["user", "started_at"]),
        ]

    def clean(self):
        super().clean()
        if self.game_account_id and self.user_id and self.game_account.user_id != self.user_id:
            raise ValidationError({"game_account": "Game account must belong to the same user."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.game_account_id}:{self.started_at.isoformat()}"


class RecognitionSnapshot(models.Model):
    class TriggerType(models.TextChoices):
        ENHANCE_SUCCESS = "enhance_success", "Enhance success"
        MANUAL_RESCAN = "manual_rescan", "Manual rescan"
        SAMPLE_PAYLOAD = "sample_payload", "Sample payload"

    class Status(models.TextChoices):
        SAVED = "saved", "Saved"
        IGNORED_DUPLICATE = "ignored_duplicate", "Ignored duplicate"
        CONFLICT = "conflict", "Conflict"
        REJECTED = "rejected", "Rejected"
        REVERTED = "reverted", "Reverted"

    class MatchStatus(models.TextChoices):
        EXACT = "exact", "Exact"
        PROBABLE = "probable", "Probable"
        TIME_ORDER = "time_order", "Time order"
        CREATED = "created", "Created"
        CONFLICT = "conflict", "Conflict"

    session = models.ForeignKey(RecognitionSession, on_delete=models.CASCADE, related_name="snapshots")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recognition_snapshots")
    game_account = models.ForeignKey("accounts.GameAccount", on_delete=models.CASCADE, related_name="recognition_snapshots")
    trigger_type = models.CharField(
        max_length=24,
        choices=TriggerType.choices,
        default=TriggerType.SAMPLE_PAYLOAD,
    )
    client_event_id = models.CharField(max_length=120, blank=True)
    captured_at = models.DateTimeField(default=timezone.now)
    popup_delta_raw = models.JSONField(default=dict, blank=True)
    detail_snapshot_raw = models.JSONField(default=dict, blank=True)
    normalized_snapshot = models.JSONField(default=dict, blank=True)
    field_confidence = models.JSONField(default=dict, blank=True)
    popup_screenshot_hash = models.CharField(max_length=128, blank=True)
    detail_screenshot_hash = models.CharField(max_length=128, blank=True)
    match_status = models.CharField(max_length=20, choices=MatchStatus.choices, default=MatchStatus.CREATED)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.SAVED)
    matched_echo = models.ForeignKey(
        "echoes.EchoRecord",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matched_recognition_snapshots",
    )
    created_echo = models.ForeignKey(
        "echoes.EchoRecord",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_by_recognition_snapshots",
    )
    created_roll_ids = models.JSONField(default=list, blank=True)
    created_roll_count = models.PositiveIntegerField(default=0)
    warnings = models.JSONField(default=list, blank=True)
    error_code = models.CharField(max_length=80, blank=True)
    applied_at = models.DateTimeField(null=True, blank=True)
    reverted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "api_recognitionsnapshot"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["session", "client_event_id"],
                condition=~Q(client_event_id=""),
                name="unique_snapshot_client_event_per_session",
            ),
            models.UniqueConstraint(
                fields=["game_account", "detail_screenshot_hash"],
                condition=~Q(detail_screenshot_hash=""),
                name="unique_snapshot_detail_hash_per_game_account",
            ),
        ]
        indexes = [
            models.Index(fields=["game_account", "status"]),
            models.Index(fields=["game_account", "match_status"]),
            models.Index(fields=["session", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def clean(self):
        super().clean()
        if self.game_account_id and self.user_id and self.game_account.user_id != self.user_id:
            raise ValidationError({"game_account": "Game account must belong to the same user."})
        if self.session_id:
            if self.session.user_id != self.user_id:
                raise ValidationError({"session": "Session must belong to the same user."})
            if self.session.game_account_id != self.game_account_id:
                raise ValidationError({"session": "Session must belong to the same game account."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.game_account_id}:{self.status}:{self.created_at.isoformat()}"

