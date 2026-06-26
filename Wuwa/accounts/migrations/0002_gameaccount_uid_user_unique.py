from django.db import migrations, models
import django.db.models


def validate_no_duplicate_bound_uids(apps, schema_editor):
    game_account = apps.get_model("accounts", "GameAccount")
    duplicate = (
        game_account.objects
        .exclude(uid="")
        .values("user_id", "uid")
        .annotate(count=models.Count("id"))
        .filter(count__gt=1)
        .first()
    )
    if duplicate:
        raise RuntimeError(
            "Cannot migrate GameAccount UID uniqueness: duplicate bound UID "
            f"{duplicate['uid']} exists for user {duplicate['user_id']}. "
            "Merge or remove duplicate game accounts before applying this migration."
        )


def clear_legacy_game_account_metadata(apps, schema_editor):
    game_account = apps.get_model("accounts", "GameAccount")
    game_account.objects.exclude(server="", nickname="").update(server="", nickname="")


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(validate_no_duplicate_bound_uids, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name="gameaccount",
            name="unique_bound_game_account_per_user",
        ),
        migrations.RemoveIndex(
            model_name="gameaccount",
            name="api_gameacc_user_id_0ef2f6_idx",
        ),
        migrations.AddIndex(
            model_name="gameaccount",
            index=models.Index(fields=["user", "uid"], name="api_gameacc_user_id_uid_idx"),
        ),
        migrations.AddConstraint(
            model_name="gameaccount",
            constraint=models.UniqueConstraint(
                condition=~django.db.models.Q(("uid", "")),
                fields=("user", "uid"),
                name="unique_bound_game_account_per_user",
            ),
        ),
        migrations.RunPython(clear_legacy_game_account_metadata, migrations.RunPython.noop),
    ]
