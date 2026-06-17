from functools import wraps

from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET

from .responses import error_response


@require_GET
@ensure_csrf_cookie
def health(request):
    return JsonResponse({"status": "ok", "service": "wuwa-backend"})


def api_login_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return error_response("请先登录。", status=401)
        return view_func(request, *args, **kwargs)

    return wrapper
