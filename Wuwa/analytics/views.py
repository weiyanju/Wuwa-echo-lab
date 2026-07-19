from django.core.exceptions import ObjectDoesNotExist
from django.views.decorators.http import require_GET

from accounts.ownership import game_account_for_user
from api.responses import error_response, success_response
from api.views import api_login_required
from echoes.services import owned_echo

from .services.evaluation import build_model_evaluation
from .services.prediction import predict_next_substat
from .services.statistics import build_user_statistics


@api_login_required
@require_GET
def echo_prediction(request, echo_id):
    try:
        echo = owned_echo(request.user, echo_id)
    except ObjectDoesNotExist:
        return error_response("声骸不存在。", status=404)
    include_diagnostics = request.GET.get("mode") != "fast"
    return success_response(predict_next_substat(echo, include_diagnostics=include_diagnostics))


@api_login_required
@require_GET
def stats(request):
    try:
        game_account = game_account_for_user(request.user, request.GET.get("game_account_id"))
    except ObjectDoesNotExist:
        return error_response("Game account not found.", status=404)
    return success_response(build_user_statistics(game_account))


@api_login_required
@require_GET
def model_evaluation(request):
    try:
        game_account = game_account_for_user(request.user, request.GET.get("game_account_id"))
    except ObjectDoesNotExist:
        return error_response("Game account not found.", status=404)
    return success_response(build_model_evaluation(game_account))
