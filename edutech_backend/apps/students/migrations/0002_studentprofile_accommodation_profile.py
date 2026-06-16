from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentprofile",
            name="accommodation_profile",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
