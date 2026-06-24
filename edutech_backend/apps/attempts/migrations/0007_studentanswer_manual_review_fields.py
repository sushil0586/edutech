from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("teachers", "0001_initial"),
        ("attempts", "0006_studentexamattempt_attempts_st_exam_id_19b8a7_idx"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentanswer",
            name="evaluation_status",
            field=models.CharField(
                choices=[
                    ("auto_evaluated", "Auto Evaluated"),
                    ("manual_pending", "Manual Review Pending"),
                    ("manual_reviewed", "Manual Review Completed"),
                ],
                default="auto_evaluated",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="studentanswer",
            name="review_notes",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="studentanswer",
            name="reviewed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="studentanswer",
            name="reviewed_by_teacher",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reviewed_student_answers",
                to="teachers.teacherprofile",
            ),
        ),
    ]
