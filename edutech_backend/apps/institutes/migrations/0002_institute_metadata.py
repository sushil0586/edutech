from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("institutes", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="institute",
            name="metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
