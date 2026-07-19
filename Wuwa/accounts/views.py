from django.contrib.auth import authenticate, login, logout
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from api.responses import error_response, success_response
from api.serializers import clean_string, json_body, require_string
from api.views import api_login_required

from .ownership import default_game_account, owned_game_account
from .serializers import serialize_game_account
from .services import (
    RegistrationAlreadyComplete,
    RegistrationCredentialsInvalid,
    create_game_account,
    start_registration,
    update_game_account,
)


@require_POST
def register(request):
    try:
        payload = json_body(request)
        username = clean_string(payload, "username")
        password = require_string(payload, "password")
    except ValueError as exc:
        return error_response(str(exc), status=400)
    if not username or not password:
        return error_response("用户名和密码不能为空。", status=400)
    try:
        result = start_registration(username, password)
    except RegistrationCredentialsInvalid:
        return error_response(
            "无法继续创建档案，请检查账号与访问密钥。",
            status=400,
            code="registration_credentials_invalid",
        )
    except RegistrationAlreadyComplete:
        return error_response(
            "档案已完成，请使用终端登录。",
            status=409,
            code="registration_complete",
        )
    default_account = default_game_account(result.user)
    serialized_default_account = serialize_game_account(default_account)
    login(request, result.user)
    return success_response(
        {
            "id": result.user.id,
            "username": result.user.username,
            "registration_outcome": result.outcome,
            "default_game_account": serialized_default_account,
        },
        status=201 if result.outcome == "created" else 200,
    )


@require_POST
def login_view(request):
    try:
        payload = json_body(request)
        username = clean_string(payload, "username")
        password = require_string(payload, "password")
    except ValueError as exc:
        return error_response(str(exc), status=400)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return error_response("用户名或密码错误。", status=400)
    login(request, user)
    return success_response({"id": user.id, "username": user.username})


@require_POST
def logout_view(request):
    logout(request)
    return success_response({"status": "ok"})


@api_login_required
@require_GET
def me(request):
    default_account = request.user.game_accounts.filter(is_default=True).first()
    return success_response({
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
        return success_response({"results": [serialize_game_account(account) for account in accounts]})

    try:
        account = create_game_account(request.user, json_body(request))
    except (ValidationError, ValueError, TypeError, IntegrityError) as exc:
        return error_response(str(exc), status=400)
    return success_response(serialize_game_account(account), status=201)


@api_login_required
@require_http_methods(["GET", "PATCH"])
def game_account_detail(request, account_id):
    try:
        account = owned_game_account(request.user, account_id)
    except ObjectDoesNotExist:
        return error_response("Game account not found.", status=404)

    if request.method == "PATCH":
        try:
            account = update_game_account(account, json_body(request))
        except (ValidationError, ValueError, TypeError, IntegrityError) as exc:
            return error_response(str(exc), status=400)
    return success_response(serialize_game_account(account))
