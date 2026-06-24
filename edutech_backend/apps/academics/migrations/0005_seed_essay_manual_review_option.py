from django.db import migrations


def seed_essay_manual_review_option(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")
    OptionCatalogEntry.objects.update_or_create(
        namespace="question_type",
        code="essay_manual_review",
        defaults={
            "label": "Essay Manual Review",
            "description": "Extended-response essay question reviewed manually.",
            "sort_order": 60,
            "is_default": False,
            "is_active": True,
            "metadata": {},
        },
    )


def unseed_essay_manual_review_option(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")
    OptionCatalogEntry.objects.filter(
        namespace="question_type",
        code="essay_manual_review",
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("academics", "0004_seed_numeric_answer_option"),
    ]

    operations = [
        migrations.RunPython(seed_essay_manual_review_option, unseed_essay_manual_review_option),
    ]
