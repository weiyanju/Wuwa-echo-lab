# Generated manually for the analytics projection's first durable schema.
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [("accounts", "0002_gameaccount_uid_user_unique")]
    operations = [
        migrations.CreateModel(
            name="GameAccountAnalyticsState",
            fields=[
                ("game_account", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, related_name="analytics_state", serialize=False, to="accounts.gameaccount")),
                ("status", models.CharField(choices=[("dirty", "Dirty"), ("building", "Building"), ("ready", "Ready"), ("failed", "Failed")], default="dirty", max_length=16)),
                ("schema_version", models.PositiveSmallIntegerField(default=1)),
                ("model_version", models.CharField(default="incremental-v1", max_length=40)),
                ("source_version", models.PositiveBigIntegerField(default=0)),
                ("total_rolls", models.PositiveBigIntegerField(default=0)),
                ("last_tuned_at", models.DateTimeField(blank=True, null=True)),
                ("last_roll_id", models.BigIntegerField(blank=True, null=True)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("error_code", models.CharField(blank=True, max_length=80)),
                ("built_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "analytics_game_account_state"},
        ),
        migrations.AddIndex(model_name="gameaccountanalyticsstate", index=models.Index(fields=["status", "updated_at"], name="analytics_g_status_9d5d5f_idx")),
    ]
