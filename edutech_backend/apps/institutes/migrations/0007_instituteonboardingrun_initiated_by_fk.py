import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def forward_copy_initiated_by(apps, schema_editor):
    onboarding_run_model = apps.get_model("institutes", "InstituteOnboardingRun")
    database_alias = schema_editor.connection.alias

    for run in onboarding_run_model.objects.using(database_alias).exclude(initiated_by_user_id__isnull=True):
        run.initiated_by_id = run.initiated_by_user_id
        run.save(update_fields=["initiated_by"])


def reverse_copy_initiated_by(apps, schema_editor):
    onboarding_run_model = apps.get_model("institutes", "InstituteOnboardingRun")
    database_alias = schema_editor.connection.alias

    for run in onboarding_run_model.objects.using(database_alias).exclude(initiated_by_id__isnull=True):
        run.initiated_by_user_id = run.initiated_by_id
        run.save(update_fields=["initiated_by_user_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("institutes", "0006_institute_management_mode"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="instituteonboardingrun",
            name="initiated_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="initiated_institute_onboarding_runs",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(forward_copy_initiated_by, reverse_copy_initiated_by),
        migrations.RemoveField(
            model_name="instituteonboardingrun",
            name="initiated_by_user_id",
        ),
    ]
