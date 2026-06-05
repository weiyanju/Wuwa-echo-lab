from functools import wraps

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from api.models import EchoRecord, SubstatRoll
from api.serializers import (
    clean_string,
    create_echo_from_payload,
    create_roll_from_payload,
    json_body,
    require_string,
    serialize_echo,
    serialize_roll,
    update_echo_from_payload,
)
from api.services.evaluation import build_model_evaluation
from api.services.prediction import predict_next_substat
from api.services.statistics import build_user_statistics


@require_GET
@ensure_csrf_cookie
def health(request):
    return JsonResponse({"status": "ok", "service": "wuwa-backend"})


def api_login_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "请先登录。"}, status=401)
        return view_func(request, *args, **kwargs)

    return wrapper


@require_POST
def register(request):
    try:
        payload = json_body(request)
        username = clean_string(payload, "username")
        password = require_string(payload, "password")
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    if not username or not password:
        return JsonResponse({"error": "用户名和密码不能为空。"}, status=400)
    if User.objects.filter(username=username).exists():
        return JsonResponse({"error": "用户名已存在。"}, status=400)
    user = User.objects.create_user(username=username, password=password)
    return JsonResponse({"id": user.id, "username": user.username}, status=201)


@require_POST
def login_view(request):
    try:
        payload = json_body(request)
        username = clean_string(payload, "username")
        password = require_string(payload, "password")
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"error": "用户名或密码错误。"}, status=400)
    login(request, user)
    return JsonResponse({"id": user.id, "username": user.username})


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"status": "ok"})


@api_login_required
@require_GET
def me(request):
    return JsonResponse({"id": request.user.id, "username": request.user.username})


@api_login_required
@require_http_methods(["GET", "POST"])
def echo_list(request):
    if request.method == "GET":
        echoes = request.user.echo_records.prefetch_related("substat_rolls").all()
        return JsonResponse({"results": [serialize_echo(echo) for echo in echoes]})

    try:
        echo = create_echo_from_payload(request.user, json_body(request))
    except (ValidationError, ValueError, TypeError, IntegrityError) as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    return JsonResponse(serialize_echo(echo), status=201)


def _owned_echo_or_404(user, echo_id):
    return user.echo_records.prefetch_related("substat_rolls").get(id=echo_id)


@api_login_required
@require_http_methods(["GET", "PATCH"])
def echo_detail(request, echo_id):
    try:
        echo = _owned_echo_or_404(request.user, echo_id)
    except ObjectDoesNotExist:
        return JsonResponse({"error": "声骸不存在。"}, status=404)
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
        echo = _owned_echo_or_404(request.user, echo_id)
        roll = create_roll_from_payload(echo, json_body(request))
    except ObjectDoesNotExist:
        return JsonResponse({"error": "声骸不存在。"}, status=404)
    except (ValidationError, ValueError, TypeError, IntegrityError) as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    return JsonResponse(serialize_roll(roll), status=201)


@api_login_required
@require_http_methods(["DELETE"])
def substat_undo_last(request, echo_id):
    try:
        echo = _owned_echo_or_404(request.user, echo_id)
    except ObjectDoesNotExist:
        return JsonResponse({"error": "澹伴涓嶅瓨鍦ㄣ€?"}, status=404)

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

    echo = _owned_echo_or_404(request.user, echo_id)
    return JsonResponse({"removed": removed, "echo": serialize_echo(echo)})


@api_login_required
@require_GET
def echo_prediction(request, echo_id):
    try:
        echo = _owned_echo_or_404(request.user, echo_id)
    except ObjectDoesNotExist:
        return JsonResponse({"error": "声骸不存在。"}, status=404)
    return JsonResponse(predict_next_substat(echo))


@api_login_required
@require_GET
def stats(request):
    return JsonResponse(build_user_statistics(request.user))


@api_login_required
@require_GET
def model_evaluation(request):
    return JsonResponse(build_model_evaluation(request.user))
