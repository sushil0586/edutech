from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("economy", "0005_institutequestionusageledger"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="InstituteSubscriptionRequest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(default=True)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("fulfilled", "Fulfilled"), ("rejected", "Rejected")], default="pending", max_length=20)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("grant_modes", models.JSONField(blank=True, default=list)),
                ("notes", models.TextField(blank=True)),
                ("operator_notes", models.TextField(blank=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("institute", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="subscription_requests", to="institutes.institute")),
                ("requested_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="institute_subscription_requests", to=settings.AUTH_USER_MODEL)),
                ("reviewed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reviewed_institute_subscription_requests", to=settings.AUTH_USER_MODEL)),
                ("subscription_plan_cycle", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="institute_subscription_requests", to="economy.subscriptionplancycle")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="institutesubscriptionrequest",
            index=models.Index(fields=["institute", "status"], name="economy_ins_institu_0d9ce7_idx"),
        ),
        migrations.AddIndex(
            model_name="institutesubscriptionrequest",
            index=models.Index(fields=["subscription_plan_cycle", "status"], name="economy_ins_subscri_521fb8_idx"),
        ),
        migrations.AddIndex(
            model_name="institutesubscriptionrequest",
            index=models.Index(fields=["is_active"], name="economy_ins_is_acti_90f9d3_idx"),
        ),
    ]
