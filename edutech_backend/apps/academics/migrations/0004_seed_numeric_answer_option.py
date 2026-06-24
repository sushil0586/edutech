from django.db import migrations


def seed_numeric_answer_option(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")
    OptionCatalogEntry.objects.update_or_create(
        namespace="question_type",
        code="numeric_answer",
        defaults={
            "label": "Numeric Answer",
            "description": "Open-response numeric-answer question.",
            "sort_order": 50,
            "is_default": False,
            "is_active": True,
            "metadata": {},
        },
    )


def unseed_numeric_answer_option(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")
    OptionCatalogEntry.objects.filter(
        namespace="question_type",
        code="numeric_answer",
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("academics", "0003_rename_academics_o_namespa_845505_idx_academics_o_namespa_19c853_idx_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_numeric_answer_option, unseed_numeric_answer_option),
    ]
