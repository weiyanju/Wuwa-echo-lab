from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from echoes.models import EchoRecord, SubstatRoll

from .services.roll_summary import invalidate_roll_summary_for_echo


@receiver([post_save, post_delete], sender=SubstatRoll)
def invalidate_roll_summary_after_roll_change(sender, instance, **kwargs):
    invalidate_roll_summary_for_echo(instance.echo)


@receiver(post_save, sender=EchoRecord)
def invalidate_roll_summary_after_context_change(sender, instance, update_fields=None, **kwargs):
    if update_fields is None:
        return
    if {"set_name", "cost", "main_stat", "game_account", "user"} & set(update_fields):
        invalidate_roll_summary_for_echo(instance)
