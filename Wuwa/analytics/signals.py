from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from echoes.models import EchoRecord, SubstatRoll

from .services.roll_summary import invalidate_roll_summary_for_echo
from .services.state_store import mark_game_account_state_dirty


@receiver([post_save, post_delete], sender=SubstatRoll)
def invalidate_roll_summary_after_roll_change(sender, instance, **kwargs):
    invalidate_roll_summary_for_echo(instance.echo)
    if instance.echo.game_account_id:
        mark_game_account_state_dirty(instance.echo.game_account)


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
def invalidate_roll_summary_after_context_change(sender, instance, update_fields=None, **kwargs):
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
        invalidate_roll_summary_for_echo(instance)
        for account_id in account_ids:
            mark_game_account_state_dirty(account_id)
