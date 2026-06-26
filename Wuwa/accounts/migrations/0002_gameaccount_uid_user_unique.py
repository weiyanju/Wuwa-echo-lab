from django.db import migrations, models
import django.db.models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
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
    ]
