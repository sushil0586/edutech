from django.db import migrations, models


def seed_operator_policy_scopes(apps, schema_editor):
    EconomyOperatorPolicyConfig = apps.get_model("economy", "EconomyOperatorPolicyConfig")
    EconomyOperatorPolicyConfig.objects.update_or_create(
        singleton_key="default",
        defaults={
            "platform_catalog_governance_scope": "platform_only",
            "institute_catalog_governance_scope": "platform_only",
            "platform_support_scope": "cross_institute",
            "institute_support_scope": "institute_only",
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("economy", "0010_remove_institutesubscriptionrequest_grant_modes"),
    ]

    operations = [
        migrations.AddField(
            model_name="economyoperatorpolicyconfig",
            name="institute_catalog_governance_scope",
            field=models.CharField(
                choices=[("platform_only", "Platform Only")],
                default="platform_only",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="economyoperatorpolicyconfig",
            name="institute_support_scope",
            field=models.CharField(
                choices=[("cross_institute", "Cross Institute"), ("institute_only", "Institute Only")],
                default="institute_only",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="economyoperatorpolicyconfig",
            name="platform_catalog_governance_scope",
            field=models.CharField(
                choices=[("platform_only", "Platform Only")],
                default="platform_only",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="economyoperatorpolicyconfig",
            name="platform_support_scope",
            field=models.CharField(
                choices=[("cross_institute", "Cross Institute"), ("institute_only", "Institute Only")],
                default="cross_institute",
                max_length=30,
            ),
        ),
        migrations.RunPython(seed_operator_policy_scopes, migrations.RunPython.noop),
    ]
