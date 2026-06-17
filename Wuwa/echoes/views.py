from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from accounts.models import GameAccount
from api.serializers import json_body
from api.views import api_login_required

from .models import EchoRecord, SubstatRoll
from .services import create_substat_roll
from .serializers import (
    create_echo_from_payload,
    serialize_echo,
    serialize_roll,
    update_echo_from_payload,
)


def game_account_for_request(request):
    game_account_id = request.GET.get("game_account_id") or None
    if request.method != "GET":
        try:
            game_account_id = json_body(request).get("game_account_id") or game_account_id
        except ValueError:
            pass
    if game_account_id:
        return GameAccount.objects.get(id=game_account_id, user=request.user)
    return request.user.game_accounts.get(is_default=True)


@api_login_required
@require_http_methods(["GET", "POST"])
def echo_list(request):
    if request.method == "GET":
        try:
            game_account = game_account_for_request(request)
        except ObjectDoesNotExist:
            return JsonResponse({"error": "Game account not found."}, status=404)
        echoes = game_account.echo_records.prefetch_related("substat_rolls").all()
        return JsonResponse({"results": [serialize_echo(echo) for echo in echoes]})

    try:
        echo = create_echo_from_payload(request.user, json_body(request))
    except ObjectDoesNotExist:
        return JsonResponse({"error": "Game account not found."}, status=404)
    except (ValidationError, ValueError, TypeError, IntegrityError) as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    return JsonResponse(serialize_echo(echo), status=201)


def owned_echo_or_404(user, echo_id, *, prefetch_rolls=True):
    echoes = user.echo_records
    if prefetch_rolls:
        echoes = echoes.prefetch_related("substat_rolls")
    return echoes.get(id=echo_id)


@api_login_required
@require_http_methods(["GET", "PATCH", "DELETE"])
def echo_detail(request, echo_id):
    try:
        echo = owned_echo_or_404(request.user, echo_id)
    except ObjectDoesNotExist:
        return JsonResponse({"error": "声骸不存在。"}, status=404)

    if request.method == "DELETE":
        deleted_echo_id = echo.id
        echo.delete()
        return JsonResponse({"deleted_echo_id": deleted_echo_id})

    if request.method == "PATCH":
        try:
            echo = update_echo_from_payload(echo, json_body(request))
        except (ValidationError, ValueError, TypeError, IntegrityError) as exc:
            return JsonResponse({"error": str(exc)}, status=400)

    return JsonResponse(serialize_echo(echo))


@api_login_required
@require_POST
def substat_create(request, echo_id):
    try:
        echo = owned_echo_or_404(request.user, echo_id, prefetch_rolls=False)
        existing_roll_count = SubstatRoll.objects.filter(echo=echo).count()
        roll = create_substat_roll(echo, json_body(request), existing_roll_count=existing_roll_count)
    except ObjectDoesNotExist:
        return JsonResponse({"error": "声骸不存在。"}, status=404)
    except (ValidationError, ValueError, TypeError, IntegrityError) as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    return JsonResponse(serialize_roll(roll), status=201)


@api_login_required
@require_http_methods(["DELETE"])
def substat_undo_last(request, echo_id):
    try:
        echo = owned_echo_or_404(request.user, echo_id)
    except ObjectDoesNotExist:
        return JsonResponse({"error": "声骸不存在。"}, status=404)

    last_roll = echo.substat_rolls.order_by("-position", "-id").first()
    if last_roll is None:
        return JsonResponse({"error": "没有可撤回的副词条。"}, status=400)

    removed = serialize_roll(last_roll)
    last_roll.delete()

    remaining_rolls = SubstatRoll.objects.filter(echo=echo)
    remaining_last_roll = remaining_rolls.order_by("-position", "-id").first()
    echo.last_tuned_at = remaining_last_roll.tuned_at if remaining_last_roll else None
    if echo.status != EchoRecord.Status.ARCHIVED:
        echo.status = EchoRecord.Status.COMPLETED if remaining_rolls.count() >= 5 else EchoRecord.Status.IN_PROGRESS
    echo.save(update_fields=["last_tuned_at", "status", "updated_at"])

    echo = owned_echo_or_404(request.user, echo_id)
    return JsonResponse({"removed": removed, "echo": serialize_echo(echo)})
