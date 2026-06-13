from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from api.views import api_login_required
from echoes.views import game_account_for_request, owned_echo_or_404

from .services.evaluation import build_model_evaluation
from .services.prediction import predict_next_substat
from .services.statistics import build_user_statistics


@api_login_required
@require_GET
def echo_prediction(request, echo_id):
    try:
        echo = owned_echo_or_404(request.user, echo_id)
    except ObjectDoesNotExist:
        return JsonResponse({"error": "声骸不存在。"}, status=404)
    return JsonResponse(predict_next_substat(echo))


@api_login_required
@require_GET
def stats(request):
    try:
        game_account = game_account_for_request(request)
    except ObjectDoesNotExist:
        return JsonResponse({"error": "Game account not found."}, status=404)
    return JsonResponse(build_user_statistics(game_account))


@api_login_required
@require_GET
def model_evaluation(request):
    try:
        game_account = game_account_for_request(request)
    except ObjectDoesNotExist:
        return JsonResponse({"error": "Game account not found."}, status=404)
    return JsonResponse(build_model_evaluation(game_account))

