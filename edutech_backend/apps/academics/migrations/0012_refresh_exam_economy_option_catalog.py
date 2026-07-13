from django.db import migrations


EXAM_ECONOMY_ACCESS_POLICY_SEED = [
    ("", "Open Access", "No star or entitlement requirement.", 10, True),
    ("free", "Explicitly Free", "Marked free for reporting and policy clarity.", 20, False),
    ("stars_only", "Stars Only", "Requires stars to unlock.", 30, False),
    ("subscription_only", "Subscription Only", "Requires active subscription-backed access.", 40, False),
    ("subscription_or_stars", "Subscription Or Stars", "Uses subscription first, then stars where allowed.", 50, False),
    ("institute_sponsored", "Institute Sponsored", "Institute covers learner access without charging quota or stars.", 60, False),
    ("platform_managed", "Platform Managed", "Platform centrally governs learner access for this exam.", 70, False),
]


def refresh_exam_economy_option_catalog(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")

    for code, label, description, sort_order, is_default in EXAM_ECONOMY_ACCESS_POLICY_SEED:
        OptionCatalogEntry.objects.update_or_create(
            namespace="exam_economy_access_policy",
            code=code,
            defaults={
                "label": label,
                "description": description,
                "sort_order": sort_order,
                "is_default": is_default,
                "is_active": True,
                "metadata": {},
            },
        )

    OptionCatalogEntry.objects.filter(
        namespace="exam_economy_access_policy",
        code__in=["entitlement_only", "stars_or_entitlement"],
    ).update(is_active=False)


def revert_exam_economy_option_catalog(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")

    OptionCatalogEntry.objects.filter(
        namespace="exam_economy_access_policy",
        code__in=["subscription_only", "subscription_or_stars", "institute_sponsored", "platform_managed"],
    ).delete()

    OptionCatalogEntry.objects.filter(
        namespace="exam_economy_access_policy",
        code__in=["entitlement_only", "stars_or_entitlement"],
    ).update(is_active=True)


class Migration(migrations.Migration):
    dependencies = [
        ("academics", "0011_normalize_assessment_family_codes_lowercase"),
    ]

    operations = [
        migrations.RunPython(
            refresh_exam_economy_option_catalog,
            revert_exam_economy_option_catalog,
        ),
    ]
