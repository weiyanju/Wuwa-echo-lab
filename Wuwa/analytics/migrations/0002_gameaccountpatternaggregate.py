import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("analytics", "0001_initial")]
    operations = [
        migrations.CreateModel(
            name="GameAccountPatternAggregate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("length", models.PositiveSmallIntegerField()),
                ("prefix", models.CharField(max_length=255)),
                ("anchor", models.CharField(max_length=80)),
                ("next_counts", models.JSONField(default=dict)),
                (
                    "game_account",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="analytics_pattern_aggregates",
                        to="accounts.gameaccount",
                    ),
                ),
            ],
            options={"db_table": "analytics_game_account_pattern"},
        ),
        migrations.AddConstraint(
            model_name="gameaccountpatternaggregate",
            constraint=models.UniqueConstraint(
                fields=("game_account", "length", "prefix"),
                name="analytics_pattern_account_length_prefix_unique",
            ),
        ),
        migrations.AddConstraint(
            model_name="gameaccountpatternaggregate",
            constraint=models.CheckConstraint(
                condition=models.Q(("length__gte", 1), ("length__lte", 3)),
                name="analytics_pattern_length_1_to_3",
            ),
        ),
        migrations.AddIndex(
            model_name="gameaccountpatternaggregate",
            index=models.Index(
                fields=["game_account", "length", "anchor"],
                name="analytics_g_game_ac_3d4998_idx",
            ),
        ),
        migrations.AlterField(
            model_name="gameaccountanalyticsstate",
            name="schema_version",
            field=models.PositiveSmallIntegerField(default=2),
        ),
        migrations.AlterField(
            model_name="gameaccountanalyticsstate",
            name="model_version",
            field=models.CharField(default="incremental-v2", max_length=40),
        ),
        migrations.AddField(
            model_name="gameaccountanalyticsstate",
            name="rebuild_token",
            field=models.UUIDField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name="gameaccountanalyticsstate",
            name="rebuild_started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
