from django.db import migrations


def seed_matrix_match_option(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")
    OptionCatalogEntry.objects.update_or_create(
        namespace="question_type",
        code="matrix_match",
        defaults={
            "label": "Matrix Match",
            "description": "Structured match-the-columns question with answer options.",
            "sort_order": 45,
            "is_default": False,
            "is_active": True,
            "metadata": {},
        },
    )


def unseed_matrix_match_option(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")
    OptionCatalogEntry.objects.filter(
        namespace="question_type",
        code="matrix_match",
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("academics", "0007_seed_assertion_reason_option"),
    ]

    operations = [
        migrations.RunPython(seed_matrix_match_option, unseed_matrix_match_option),
    ]
