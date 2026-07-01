import uuid

from django.db import migrations, models


DEFAULT_ONBOARDING_PROFILES = [
    {
        "name": "Blank Institute",
        "code": "BLANK_INSTITUTE",
        "description": "Creates no academic or economy defaults. Use when the operator wants to onboard manually.",
        "category": "baseline",
        "is_default": True,
        "sort_order": 10,
        "config_json": {
            "academic_preset_code": "",
            "apply_mode": "full",
            "question_bank_package_enabled": False,
            "question_bank_package_code": "",
            "advanced_builder_enabled": False,
            "academic_year_name_template": "{next_year_start}-{next_year_end}",
        },
    },
    {
        "name": "School Starter",
        "code": "SCHOOL_STARTER",
        "description": "Prefills the standard Class 7 school preset and keeps premium access disabled until economy configuration is confirmed.",
        "category": "school",
        "is_default": False,
        "sort_order": 20,
        "config_json": {
            "academic_preset_code": "class_7_cbse_core",
            "apply_mode": "full",
            "question_bank_package_enabled": False,
            "question_bank_package_code": "",
            "advanced_builder_enabled": False,
            "academic_year_name_template": "{next_year_start}-{next_year_end}",
        },
    },
    {
        "name": "Trial Full Access",
        "code": "TRIAL_FULL_ACCESS",
        "description": "Prefills academic defaults and enables advanced builder. Package access stays configurable against the live economy catalog.",
        "category": "trial",
        "is_default": False,
        "sort_order": 30,
        "config_json": {
            "academic_preset_code": "class_7_cbse_core",
            "apply_mode": "full",
            "question_bank_package_enabled": False,
            "question_bank_package_code": "",
            "advanced_builder_enabled": True,
            "academic_year_name_template": "{next_year_start}-{next_year_end}",
        },
    },
]


def seed_onboarding_profiles(apps, schema_editor):
    InstituteOnboardingProfile = apps.get_model("institutes", "InstituteOnboardingProfile")
    for seed in DEFAULT_ONBOARDING_PROFILES:
        InstituteOnboardingProfile.objects.update_or_create(
            code=seed["code"],
            defaults=seed,
        )


def unseed_onboarding_profiles(apps, schema_editor):
    InstituteOnboardingProfile = apps.get_model("institutes", "InstituteOnboardingProfile")
    InstituteOnboardingProfile.objects.filter(
        code__in=[seed["code"] for seed in DEFAULT_ONBOARDING_PROFILES]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("institutes", "0002_institute_metadata"),
    ]

    operations = [
        migrations.CreateModel(
            name="InstituteOnboardingProfile",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(default=True)),
                ("name", models.CharField(db_index=True, max_length=255)),
                ("code", models.CharField(max_length=80, unique=True)),
                ("description", models.TextField(blank=True)),
                ("category", models.CharField(blank=True, default="general", max_length=80)),
                ("is_default", models.BooleanField(default=False)),
                ("sort_order", models.PositiveIntegerField(default=100)),
                ("config_json", models.JSONField(blank=True, default=dict)),
            ],
            options={
                "ordering": ["sort_order", "name"],
            },
        ),
        migrations.AddIndex(
            model_name="instituteonboardingprofile",
            index=models.Index(fields=["name"], name="institutes__name_7165be_idx"),
        ),
        migrations.AddIndex(
            model_name="instituteonboardingprofile",
            index=models.Index(fields=["code"], name="institutes__code_bae652_idx"),
        ),
        migrations.AddIndex(
            model_name="instituteonboardingprofile",
            index=models.Index(fields=["category", "is_active"], name="institutes__categor_056f35_idx"),
        ),
        migrations.AddIndex(
            model_name="instituteonboardingprofile",
            index=models.Index(fields=["is_default", "is_active"], name="institutes__is_defa_f8b8d5_idx"),
        ),
        migrations.RunPython(seed_onboarding_profiles, unseed_onboarding_profiles),
    ]
