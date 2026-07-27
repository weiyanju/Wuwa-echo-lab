from django.db.models.signals import post_delete, post_save, pre_delete, pre_save
from django.dispatch import receiver

from echoes.models import EchoRecord, SubstatRoll

from .services.state_store import advance_state_for_roll, mark_game_account_state_dirty


@receiver(post_save, sender=SubstatRoll)
def advance_analytics_after_roll_save(sender, instance, created, **kwargs):
    if created:
        advance_state_for_roll(instance)
        return

    old_account_id = getattr(instance, "_analytics_previous_game_account_id", None)
    account_ids = {account_id for account_id in (old_account_id, instance.echo.game_account_id) if account_id}
    for account_id in account_ids:
        mark_game_account_state_dirty(account_id, error_code="roll_updated")


@receiver(pre_save, sender=SubstatRoll)
def remember_previous_roll_owner(sender, instance, **kwargs):
    if not instance.pk:
        return
    previous = SubstatRoll.objects.filter(pk=instance.pk).values(
        "echo__game_account_id",
    ).first()
    if previous is None:
        return
    instance._analytics_previous_game_account_id = previous["echo__game_account_id"]


@receiver(pre_delete, sender=SubstatRoll)
def remember_analytics_owner_before_roll_delete(sender, instance, **kwargs):
    instance._analytics_game_account_id = instance.echo.game_account_id


@receiver(post_delete, sender=SubstatRoll)
def dirty_analytics_after_roll_delete(sender, instance, **kwargs):
    account_id = getattr(instance, "_analytics_game_account_id", None)
    if account_id:
        mark_game_account_state_dirty(account_id, error_code="roll_deleted")


@receiver(pre_save, sender=EchoRecord)
def remember_previous_echo_game_account(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        instance._analytics_previous_game_account_id = (
            EchoRecord.objects.only("game_account_id").get(pk=instance.pk).game_account_id
        )
    except EchoRecord.DoesNotExist:
        return


@receiver(post_save, sender=EchoRecord)
def dirty_analytics_after_echo_context_change(sender, instance, update_fields=None, **kwargs):
    if not instance.pk:
        return
    relevant_fields = {"set_name", "cost", "main_stat", "game_account", "user"}
    if update_fields is not None and not relevant_fields & set(update_fields):
        return
    old_account_id = getattr(instance, "_analytics_previous_game_account_id", None)
    if old_account_id is None and update_fields is None:
        return
    account_ids = {account_id for account_id in (old_account_id, instance.game_account_id) if account_id}
    if account_ids:
        for account_id in account_ids:
            mark_game_account_state_dirty(account_id, error_code="echo_context_updated")
