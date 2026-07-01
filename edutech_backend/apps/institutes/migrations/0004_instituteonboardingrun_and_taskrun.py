import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("institutes", "0003_instituteonboardingprofile"),
    ]

    operations = [
        migrations.CreateModel(
            name="InstituteOnboardingRun",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(default=True)),
                ("profile_code", models.CharField(blank=True, max_length=80)),
                ("source", models.CharField(default="master_defaults", max_length=80)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("running", "Running"), ("completed", "Completed"), ("failed", "Failed")], default="pending", max_length=20)),
                ("requested_config_json", models.JSONField(blank=True, default=dict)),
                ("resolved_config_json", models.JSONField(blank=True, default=dict)),
                ("initiated_by_user_id", models.IntegerField(blank=True, null=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("error_summary", models.TextField(blank=True)),
                ("institute", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="onboarding_runs", to="institutes.institute")),
                ("profile", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="runs", to="institutes.instituteonboardingprofile")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="InstituteOnboardingTaskRun",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(default=True)),
                ("task_code", models.CharField(max_length=120)),
                ("label", models.CharField(blank=True, max_length=255)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("completed", "Completed"), ("skipped", "Skipped"), ("failed", "Failed")], default="pending", max_length=20)),
                ("message", models.TextField(blank=True)),
                ("result_json", models.JSONField(blank=True, default=dict)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("run", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="tasks", to="institutes.instituteonboardingrun")),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.AddIndex(
            model_name="instituteonboardingrun",
            index=models.Index(fields=["institute", "created_at"], name="institutes__institu_1eb390_idx"),
        ),
        migrations.AddIndex(
            model_name="instituteonboardingrun",
            index=models.Index(fields=["profile_code", "created_at"], name="institutes__profile_157b61_idx"),
        ),
        migrations.AddIndex(
            model_name="instituteonboardingrun",
            index=models.Index(fields=["status", "created_at"], name="institutes__status_fef34d_idx"),
        ),
        migrations.AddIndex(
            model_name="instituteonboardingrun",
            index=models.Index(fields=["source", "created_at"], name="institutes__source_07f047_idx"),
        ),
        migrations.AddIndex(
            model_name="instituteonboardingtaskrun",
            index=models.Index(fields=["run", "created_at"], name="institutes__run_id_c4e8f8_idx"),
        ),
        migrations.AddIndex(
            model_name="instituteonboardingtaskrun",
            index=models.Index(fields=["task_code", "status"], name="institutes__task_co_7781f2_idx"),
        ),
    ]
