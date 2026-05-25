from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("auth/register/", views.register, name="register"),
    path("auth/login/", views.login_view, name="login"),
    path("auth/logout/", views.logout_view, name="logout"),
    path("me/", views.me, name="me"),
    path("echoes/", views.echo_list, name="echo_list"),
    path("echoes/<int:echo_id>/", views.echo_detail, name="echo_detail"),
    path("echoes/<int:echo_id>/substats/", views.substat_create, name="substat_create"),
    path("echoes/<int:echo_id>/substats/latest/", views.substat_undo_last, name="substat_undo_last"),
    path("echoes/<int:echo_id>/prediction/", views.echo_prediction, name="echo_prediction"),
    path("stats/", views.stats, name="stats"),
    path("model-evaluation/", views.model_evaluation, name="model_evaluation"),
]
