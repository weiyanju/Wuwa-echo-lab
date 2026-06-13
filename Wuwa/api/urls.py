from django.urls import path

from accounts import views as account_views
from analytics import views as analytics_views
from echoes import views as echo_views
from recognition import views as recognition_views

from . import views as api_views

urlpatterns = [
    path("health/", api_views.health, name="health"),
    path("auth/register/", account_views.register, name="register"),
    path("auth/login/", account_views.login_view, name="login"),
    path("auth/logout/", account_views.logout_view, name="logout"),
    path("me/", account_views.me, name="me"),
    path("game-accounts/", account_views.game_account_list, name="game_account_list"),
    path("game-accounts/<int:account_id>/", account_views.game_account_detail, name="game_account_detail"),
    path("echoes/", echo_views.echo_list, name="echo_list"),
    path("echoes/<int:echo_id>/", echo_views.echo_detail, name="echo_detail"),
    path("echoes/<int:echo_id>/substats/", echo_views.substat_create, name="substat_create"),
    path("echoes/<int:echo_id>/substats/latest/", echo_views.substat_undo_last, name="substat_undo_last"),
    path("echoes/<int:echo_id>/prediction/", analytics_views.echo_prediction, name="echo_prediction"),
    path("stats/", analytics_views.stats, name="stats"),
    path("model-evaluation/", analytics_views.model_evaluation, name="model_evaluation"),
    path("recognition/sessions/", recognition_views.recognition_session_list, name="recognition_session_list"),
    path(
        "recognition/sessions/<int:session_id>/",
        recognition_views.recognition_session_detail,
        name="recognition_session_detail",
    ),
    path("recognition/snapshots/", recognition_views.recognition_snapshot_list, name="recognition_snapshot_list"),
    path(
        "recognition/snapshots/<int:snapshot_id>/revert/",
        recognition_views.recognition_snapshot_revert,
        name="recognition_snapshot_revert",
    ),
]
