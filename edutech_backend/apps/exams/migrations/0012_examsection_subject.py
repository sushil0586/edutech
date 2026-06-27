from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("academics", "0010_refresh_assessment_family_contracts"),
        ("exams", "0011_exampresetpack"),
    ]

    operations = [
        migrations.AddField(
            model_name="examsection",
            name="subject",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="exam_sections",
                to="academics.subject",
            ),
        ),
    ]
