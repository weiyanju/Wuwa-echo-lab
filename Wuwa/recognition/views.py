from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError
from django.views.decorators.http import require_http_methods

from api.responses import error_response, success_response
from api.serializers import json_body
from api.views import api_login_required

from .serializers import serialize_session, serialize_snapshot_result
from .services import (
    RecognitionPayloadError,
    create_session,
    get_session,
    list_sessions,
    list_snapshots,
    revert_snapshot,
    submit_snapshot,
    update_session,
)


@api_login_required
@require_http_methods(["GET", "POST"])
def recognition_session_list(request):
    if request.method == "GET":
        game_account_id = request.GET.get("game_account_id")
        try:
            sessions = list_sessions(request.user, game_account_id=game_account_id)
        except ObjectDoesNotExist:
            return error_response("Game account not found.", status=404)
        except (RecognitionPayloadError, ValidationError, ValueError, TypeError) as exc:
            return error_response(str(exc), status=400)
        return success_response({"results": [serialize_session(session) for session in sessions]})

    try:
        session = create_session(request.user, json_body(request))
    except ObjectDoesNotExist:
        return error_response("Game account not found.", status=404)
    except (RecognitionPayloadError, ValidationError, ValueError, TypeError, IntegrityError) as exc:
        return error_response(str(exc), status=400)
    return success_response(serialize_session(session), status=201)


@api_login_required
@require_http_methods(["GET", "PATCH"])
def recognition_session_detail(request, session_id):
    try:
        if request.method == "PATCH":
            session = update_session(request.user, session_id, json_body(request))
        else:
            session = get_session(request.user, session_id)
    except ObjectDoesNotExist:
        return error_response("Recognition session not found.", status=404)
    except (RecognitionPayloadError, ValidationError, ValueError, TypeError) as exc:
        return error_response(str(exc), status=400)
    return success_response(serialize_session(session))


@api_login_required
@require_http_methods(["GET", "POST"])
def recognition_snapshot_list(request):
    if request.method == "GET":
        try:
            statuses = [item.strip() for item in request.GET.get("status", "").split(",") if item.strip()]
            snapshots = list_snapshots(
                request.user,
                game_account_id=request.GET.get("game_account_id"),
                statuses=statuses,
            )
        except ObjectDoesNotExist:
            return error_response("Game account not found.", status=404)
        except (RecognitionPayloadError, ValidationError, ValueError, TypeError) as exc:
            return error_response(str(exc), status=400)
        return success_response({"results": [serialize_snapshot_result(snapshot) for snapshot in snapshots]})

    try:
        result = submit_snapshot(request.user, json_body(request))
    except ObjectDoesNotExist:
        return error_response("Recognition session or game account not found.", status=404)
    except (RecognitionPayloadError, ValidationError, ValueError, TypeError, IntegrityError) as exc:
        return error_response(str(exc), status=400)
    return success_response(serialize_snapshot_result(result.snapshot), status=201 if result.created else 200)


@api_login_required
@require_http_methods(["POST"])
def recognition_snapshot_revert(request, snapshot_id):
    try:
        snapshot = revert_snapshot(request.user, snapshot_id)
    except ObjectDoesNotExist:
        return error_response("Recognition snapshot not found.", status=404)
    except (RecognitionPayloadError, ValidationError, ValueError, TypeError, IntegrityError) as exc:
        return error_response(str(exc), status=400)
    return success_response(serialize_snapshot_result(snapshot))
