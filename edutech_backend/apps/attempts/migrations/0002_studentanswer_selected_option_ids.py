from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attempts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentanswer",
            name="selected_option_ids",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
