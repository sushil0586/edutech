from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attempts", "0008_studentanswerreviewtask_studentanswerreviewevent"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentanswer",
            name="answer_transcript",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="studentanswer",
            name="response_artifacts",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
