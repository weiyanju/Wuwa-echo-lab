from django.utils import timezone

from .models import RecognitionSession
from .service_support import RecognitionPayloadError, game_account_for_user, payload_string


def create_session(user, payload):
    account = game_account_for_user(user, payload.get("game_account_id"))
    return RecognitionSession.objects.create(
        user=user,
        game_account=account,
        client_name=payload_string(payload, "client_name", max_length=80),
        client_version=payload_string(payload, "client_version", max_length=40),
        game_window_title=payload_string(payload, "game_window_title", max_length=160),
        screen_resolution=payload_string(payload, "screen_resolution", max_length=40),
    )


def list_sessions(user, game_account_id=None, limit=20):
    queryset = RecognitionSession.objects.filter(user=user).select_related("game_account")
    if game_account_id:
        account = game_account_for_user(user, game_account_id)
        queryset = queryset.filter(game_account=account)
    return list(queryset[:limit])


def get_session(user, session_id):
    return RecognitionSession.objects.get(id=session_id, user=user)


def update_session(user, session_id, payload):
    status = payload_string(payload, "status", default="", max_length=20)
    if status not in RecognitionSession.Status.values:
        raise RecognitionPayloadError("status is invalid.")

    session = RecognitionSession.objects.get(id=session_id, user=user)
    session.status = status
    if status == RecognitionSession.Status.ACTIVE:
        session.ended_at = None
    elif session.ended_at is None:
        session.ended_at = timezone.now()
    session.save(update_fields=["status", "ended_at", "updated_at"])
    return session
