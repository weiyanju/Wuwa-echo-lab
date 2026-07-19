from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from accounts.ownership import game_account_for_user
from api.responses import error_response, success_response
from api.serializers import json_body
from api.views import api_login_required

from .serializers import serialize_echo, serialize_roll
from .services import (
    NoSubstatRollToUndo,
    create_echo,
    create_substat_roll,
    delete_echo,
    list_echoes,
    owned_echo,
    undo_last_substat,
    update_echo,
)

ECHO_NOT_FOUND_MESSAGE = "声骸不存在。"
NO_ROLL_TO_UNDO_MESSAGE = "没有可撤回的副词条。"


def game_account_for_request(request):
    game_account_id = request.GET.get("game_account_id") or None
    if request.method != "GET":
        try:
            game_account_id = json_body(request).get("game_account_id") or game_account_id
        except ValueError:
            pass
    return game_account_for_user(request.user, game_account_id)


@api_login_required
@require_http_methods(["GET", "POST"])
def echo_list(request):
    if request.method == "GET":
        try:
            game_account = game_account_for_request(request)
        except ObjectDoesNotExist:
            return error_response("Game account not found.", status=404)
        echoes = list_echoes(game_account)
        return success_response({"results": [serialize_echo(echo) for echo in echoes]})

    try:
        echo = create_echo(request.user, json_body(request))
    except ObjectDoesNotExist:
        return error_response("Game account not found.", status=404)
    except (ValidationError, ValueError, TypeError, IntegrityError) as exc:
        return error_response(str(exc), status=400)
    return success_response(serialize_echo(echo), status=201)


@api_login_required
@require_http_methods(["GET", "PATCH", "DELETE"])
def echo_detail(request, echo_id):
    try:
        echo = owned_echo(request.user, echo_id)
    except ObjectDoesNotExist:
        return error_response(ECHO_NOT_FOUND_MESSAGE, status=404)

    if request.method == "DELETE":
        deleted_echo_id = delete_echo(echo)
        return success_response({"deleted_echo_id": deleted_echo_id})

    if request.method == "PATCH":
        try:
            echo = update_echo(echo, json_body(request))
        except (ValidationError, ValueError, TypeError, IntegrityError) as exc:
            return error_response(str(exc), status=400)

    return success_response(serialize_echo(echo))


@api_login_required
@require_POST
def substat_create(request, echo_id):
    try:
        echo = owned_echo(request.user, echo_id, prefetch_rolls=False)
        roll = create_substat_roll(echo, json_body(request))
    except ObjectDoesNotExist:
        return error_response(ECHO_NOT_FOUND_MESSAGE, status=404)
    except (ValidationError, ValueError, TypeError, IntegrityError) as exc:
        return error_response(str(exc), status=400)
    return success_response(serialize_roll(roll), status=201)


@api_login_required
@require_http_methods(["DELETE"])
def substat_undo_last(request, echo_id):
    try:
        echo = owned_echo(request.user, echo_id)
    except ObjectDoesNotExist:
        return error_response(ECHO_NOT_FOUND_MESSAGE, status=404)

    try:
        result = undo_last_substat(echo)
    except NoSubstatRollToUndo:
        return error_response(NO_ROLL_TO_UNDO_MESSAGE, status=400)
    return success_response({
        "removed": serialize_roll(result.removed_roll),
        "echo": serialize_echo(result.echo),
    })
