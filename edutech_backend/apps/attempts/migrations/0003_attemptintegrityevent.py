from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("attempts", "0002_studentanswer_selected_option_ids"),
    ]

    operations = [
        migrations.CreateModel(
            name="AttemptIntegrityEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "event_type",
                    models.CharField(
                        choices=[
                            ("focus_lost", "Focus Lost"),
                            ("visibility_hidden", "Tab Hidden"),
                            ("fullscreen_exited", "Fullscreen Exited"),
                            ("fullscreen_restored", "Fullscreen Restored"),
                            ("connection_lost", "Connection Lost"),
                            ("connection_restored", "Connection Restored"),
                            ("warning_threshold_reached", "Warning Threshold Reached"),
                        ],
                        max_length=40,
                    ),
                ),
                (
                    "severity",
                    models.CharField(
                        choices=[("low", "Low"), ("medium", "Medium"), ("high", "High")],
                        default="low",
                        max_length=10,
                    ),
                ),
                ("counts_as_violation", models.BooleanField(default=False)),
                ("event_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "attempt",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="integrity_events",
                        to="attempts.studentexamattempt",
                    ),
                ),
                (
                    "exam",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="integrity_events",
                        to="exams.exam",
                    ),
                ),
                (
                    "institute",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="attempt_integrity_events",
                        to="institutes.institute",
                    ),
                ),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="attempt_integrity_events",
                        to="students.studentprofile",
                    ),
                ),
            ],
            options={
                "ordering": ["-event_at", "-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="attemptintegrityevent",
            index=models.Index(
                fields=["attempt", "event_type", "event_at"],
                name="attempts_at_attempt_7eb4b8_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="attemptintegrityevent",
            index=models.Index(
                fields=["exam", "student", "event_at"],
                name="attempts_at_exam_id_6faed8_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="attemptintegrityevent",
            index=models.Index(
                fields=["severity", "counts_as_violation"],
                name="attempts_at_severit_319c1c_idx",
            ),
        ),
    ]
