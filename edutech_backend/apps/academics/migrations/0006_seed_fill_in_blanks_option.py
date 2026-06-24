from django.db import migrations


def seed_fill_in_blanks_option(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")
    OptionCatalogEntry.objects.update_or_create(
        namespace="question_type",
        code="fill_in_blanks",
        defaults={
            "label": "Fill in the Blanks",
            "description": "Prompt contains placeholder blanks answered in order.",
            "sort_order": 50,
            "is_default": False,
            "is_active": True,
            "metadata": {},
        },
    )


def unseed_fill_in_blanks_option(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")
    OptionCatalogEntry.objects.filter(
        namespace="question_type",
        code="fill_in_blanks",
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("academics", "0005_seed_essay_manual_review_option"),
    ]

    operations = [
        migrations.RunPython(seed_fill_in_blanks_option, unseed_fill_in_blanks_option),
    ]
