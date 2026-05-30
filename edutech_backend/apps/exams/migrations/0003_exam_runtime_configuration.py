from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("exams", "0002_examquestion_section_link"),
    ]

    operations = [
        migrations.AddField(
            model_name="exam",
            name="allow_resume",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="exam",
            name="allow_return_to_previous_section",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="exam",
            name="allow_section_switching",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="exam",
            name="attempt_policy",
            field=models.CharField(
                choices=[
                    ("single", "Single Attempt"),
                    ("latest", "Latest Attempt Counted"),
                    ("best", "Best Attempt Counted"),
                    ("unlimited_practice", "Unlimited Practice"),
                ],
                default="single",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="exam",
            name="navigation_mode",
            field=models.CharField(
                choices=[
                    ("free_exam", "Free Across Exam"),
                    ("free_section", "Free Within Section"),
                    ("sequential", "Sequential Sections"),
                    ("hybrid", "Hybrid"),
                ],
                default="free_exam",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="exam",
            name="result_publish_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="exam",
            name="result_publish_mode",
            field=models.CharField(
                choices=[
                    ("immediate", "Immediate"),
                    ("scheduled", "Scheduled"),
                    ("after_review", "After Review"),
                ],
                default="after_review",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="exam",
            name="review_available_from",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="exam",
            name="review_available_until",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="exam",
            name="review_mode",
            field=models.CharField(
                choices=[
                    ("none", "No Review"),
                    ("attempted_only", "Attempted Only"),
                    ("all_questions", "All Questions"),
                    ("solution_review", "Solution Review"),
                ],
                default="attempted_only",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="exam",
            name="security_mode",
            field=models.CharField(
                choices=[
                    ("normal", "Normal"),
                    ("focus", "Focus Mode"),
                    ("fullscreen", "Fullscreen Required"),
                    ("violation_limited", "Violation Limited"),
                    ("proctored", "Proctored"),
                ],
                default="normal",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="exam",
            name="timer_mode",
            field=models.CharField(
                choices=[
                    ("global", "Global Timer"),
                    ("section", "Section Timer"),
                    ("hybrid", "Hybrid Timer"),
                ],
                default="global",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="examsection",
            name="allow_skip_section",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="examsection",
            name="duration_minutes",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="examsection",
            name="lock_after_submit",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="examsection",
            name="timer_enabled",
            field=models.BooleanField(default=False),
        ),
    ]
