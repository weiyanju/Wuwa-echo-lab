from dataclasses import dataclass

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from accounts.models import GameAccount

from .models import RecognitionSession, RecognitionSnapshot


class RecognitionPayloadError(ValueError):
    pass


@dataclass(frozen=True)
class SnapshotValidationResult:
    is_valid: bool
    error_code: str = ""
    warnings: tuple[str, ...] = ()


@dataclass(frozen=True)
class SnapshotSubmissionResult:
    snapshot: RecognitionSnapshot
    created: bool


def payload_string(payload, key, default="", max_length=None):
    value = payload.get(key, default)
    if value is None:
        return default
    if not isinstance(value, str):
        raise RecognitionPayloadError(f"{key} must be a string.")
    value = value.strip()
    if max_length is not None:
        value = value[:max_length]
    return value


def payload_dict(payload, key, default=None):
    value = payload.get(key, default if default is not None else {})
    if not isinstance(value, dict):
        raise RecognitionPayloadError(f"{key} must be an object.")
    return value


def game_account_for_user(user, account_id):
    if not account_id:
        raise RecognitionPayloadError("game_account_id is required.")
    return GameAccount.objects.get(id=account_id, user=user)


def session_for_user(user, session_id):
    if not session_id:
        raise RecognitionPayloadError("session_id is required.")
    return RecognitionSession.objects.get(id=session_id, user=user)


def captured_at(payload):
    value = payload.get("captured_at")
    if not value:
        return timezone.now()
    if not isinstance(value, str):
        raise RecognitionPayloadError("captured_at must be an ISO datetime string.")
    parsed = parse_datetime(value)
    if parsed is None:
        raise RecognitionPayloadError("captured_at must be an ISO datetime string.")
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def normalized_string(normalized, key, default=""):
    value = normalized.get(key, default)
    if value is None:
        return default
    if not isinstance(value, str):
        raise RecognitionPayloadError(f"normalized_snapshot.{key} must be a string.")
    return value.strip()
