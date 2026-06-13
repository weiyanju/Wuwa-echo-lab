from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from api.serializers import clean_string, json_body, require_string
from api.views import api_login_required

from .serializers import (
    create_game_account_from_payload,
    serialize_game_account,
    update_game_account_from_payload,
)


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
    default_account = user.game_accounts.get(is_default=True)
    return JsonResponse(
        {
            "id": user.id,
            "username": user.username,
            "default_game_account": serialize_game_account(default_account),
        },
        status=201,
    )


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
    default_account = request.user.game_accounts.filter(is_default=True).first()
    return JsonResponse({
        "id": request.user.id,
        "username": request.user.username,
        "default_game_account_id": default_account.id if default_account else None,
        "default_game_account": serialize_game_account(default_account) if default_account else None,
        "workspace_locked": default_account.workspace_locked if default_account else True,
    })


@api_login_required
@require_http_methods(["GET", "POST"])
def game_account_list(request):
    if request.method == "GET":
        accounts = request.user.game_accounts.all()
        return JsonResponse({"results": [serialize_game_account(account) for account in accounts]})

    try:
        account = create_game_account_from_payload(request.user, json_body(request))
    except (ValidationError, ValueError, TypeError, IntegrityError) as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    return JsonResponse(serialize_game_account(account), status=201)


@api_login_required
@require_http_methods(["GET", "PATCH"])
def game_account_detail(request, account_id):
    try:
        account = request.user.game_accounts.get(id=account_id)
    except ObjectDoesNotExist:
        return JsonResponse({"error": "Game account not found."}, status=404)

    if request.method == "PATCH":
        try:
            account = update_game_account_from_payload(account, json_body(request))
        except (ValidationError, ValueError, TypeError, IntegrityError) as exc:
            return JsonResponse({"error": str(exc)}, status=400)
    return JsonResponse(serialize_game_account(account))

