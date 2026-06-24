from django.db import migrations


def seed_assertion_reason_option(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")
    OptionCatalogEntry.objects.update_or_create(
        namespace="question_type",
        code="assertion_reason",
        defaults={
            "label": "Assertion / Reason",
            "description": "Fixed four-option assertion and reason objective question.",
            "sort_order": 40,
            "is_default": False,
            "is_active": True,
            "metadata": {},
        },
    )


def unseed_assertion_reason_option(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")
    OptionCatalogEntry.objects.filter(
        namespace="question_type",
        code="assertion_reason",
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("academics", "0006_seed_fill_in_blanks_option"),
    ]

    operations = [
        migrations.RunPython(seed_assertion_reason_option, unseed_assertion_reason_option),
    ]
