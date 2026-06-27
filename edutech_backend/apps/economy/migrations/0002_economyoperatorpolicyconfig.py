from decimal import Decimal
import uuid

from django.db import migrations, models


def seed_default_policy(apps, schema_editor):
    EconomyOperatorPolicyConfig = apps.get_model("economy", "EconomyOperatorPolicyConfig")
    EconomyOperatorPolicyConfig.objects.update_or_create(
        singleton_key="default",
        defaults={
            "institute_admin_can_confirm_orders": True,
            "institute_admin_max_confirm_order_amount": Decimal("5000.00"),
            "institute_admin_confirm_order_currency": "INR",
            "institute_admin_can_grant_stars": True,
            "institute_admin_max_grant_stars": 250,
            "is_active": True,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("economy", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="EconomyOperatorPolicyConfig",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(default=True)),
                ("singleton_key", models.CharField(default="default", max_length=50, unique=True)),
                ("institute_admin_can_confirm_orders", models.BooleanField(default=True)),
                ("institute_admin_max_confirm_order_amount", models.DecimalField(decimal_places=2, default=Decimal("5000.00"), max_digits=10)),
                ("institute_admin_confirm_order_currency", models.CharField(default="INR", max_length=10)),
                ("institute_admin_can_grant_stars", models.BooleanField(default=True)),
                ("institute_admin_max_grant_stars", models.PositiveIntegerField(default=250)),
            ],
            options={
                "verbose_name": "Economy operator policy config",
                "verbose_name_plural": "Economy operator policy config",
            },
        ),
        migrations.RunPython(seed_default_policy, migrations.RunPython.noop),
    ]
