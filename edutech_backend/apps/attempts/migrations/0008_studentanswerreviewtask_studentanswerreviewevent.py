from decimal import Decimal
import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def backfill_review_tasks(apps, schema_editor):
    StudentAnswer = apps.get_model("attempts", "StudentAnswer")
    StudentAnswerReviewTask = apps.get_model("attempts", "StudentAnswerReviewTask")
    StudentAnswerReviewEvent = apps.get_model("attempts", "StudentAnswerReviewEvent")

    manual_answers = StudentAnswer.objects.filter(
        evaluation_status__in=["manual_pending", "manual_reviewed"],
        is_active=True,
    ).select_related("attempt", "question")

    for answer in manual_answers.iterator():
        task_status = "reviewed" if answer.evaluation_status == "manual_reviewed" else "pending"
        opened_at = answer.answered_at or answer.created_at or django.utils.timezone.now()
        resolved_at = answer.reviewed_at if answer.evaluation_status == "manual_reviewed" else None
        task, created = StudentAnswerReviewTask.objects.get_or_create(
            answer_id=answer.id,
            defaults={
                "institute_id": answer.attempt.institute_id,
                "attempt_id": answer.attempt_id,
                "exam_id": answer.attempt.exam_id,
                "student_id": answer.attempt.student_id,
                "question_id": answer.question_id,
                "status": task_status,
                "priority": "normal",
                "opened_at": opened_at,
                "review_started_at": answer.reviewed_at if answer.reviewed_at else None,
                "resolved_at": resolved_at,
                "last_reviewed_at": answer.reviewed_at,
                "last_reviewed_by_teacher_id": answer.reviewed_by_teacher_id,
                "latest_marks_awarded": answer.marks_awarded or Decimal("0.00"),
                "latest_review_summary": answer.review_notes or "",
                "metadata": {},
                "is_active": True,
            },
        )
        if created:
            StudentAnswerReviewEvent.objects.create(
                review_task_id=task.id,
                answer_id=answer.id,
                attempt_id=answer.attempt_id,
                exam_id=answer.attempt.exam_id,
                student_id=answer.attempt.student_id,
                question_id=answer.question_id,
                actor_teacher_id=answer.reviewed_by_teacher_id,
                event_type="task_opened",
                from_status="",
                to_status=task.status,
                marks_awarded=answer.marks_awarded or Decimal("0.00"),
                notes="Backfilled manual review task.",
                metadata={},
                is_active=True,
            )
            if answer.evaluation_status == "manual_reviewed":
                StudentAnswerReviewEvent.objects.create(
                    review_task_id=task.id,
                    answer_id=answer.id,
                    attempt_id=answer.attempt_id,
                    exam_id=answer.attempt.exam_id,
                    student_id=answer.attempt.student_id,
                    question_id=answer.question_id,
                    actor_teacher_id=answer.reviewed_by_teacher_id,
                    event_type="review_saved",
                    from_status="pending",
                    to_status="reviewed",
                    marks_awarded=answer.marks_awarded or Decimal("0.00"),
                    notes=answer.review_notes or "Backfilled completed review.",
                    metadata={},
                    is_active=True,
                )


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("attempts", "0007_studentanswer_manual_review_fields"),
        ("exams", "0001_initial"),
        ("institutes", "0001_initial"),
        ("question_bank", "0008_expand_question_type_choices_essay_manual_review"),
        ("students", "0001_initial"),
        ("teachers", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="StudentAnswerReviewTask",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(default=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("assigned", "Assigned"), ("in_review", "In Review"), ("reviewed", "Reviewed"), ("recheck_requested", "Recheck Requested"), ("moderated", "Moderated"), ("cancelled", "Cancelled")], default="pending", max_length=30)),
                ("priority", models.CharField(choices=[("low", "Low"), ("normal", "Normal"), ("high", "High"), ("urgent", "Urgent")], default="normal", max_length=20)),
                ("opened_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("assigned_at", models.DateTimeField(blank=True, null=True)),
                ("review_started_at", models.DateTimeField(blank=True, null=True)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("last_reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("latest_marks_awarded", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=8)),
                ("latest_review_summary", models.TextField(blank=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("answer", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="review_task", to="attempts.studentanswer")),
                ("assigned_by_user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_answer_review_tasks", to=settings.AUTH_USER_MODEL)),
                ("assigned_to_teacher", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_answer_review_tasks", to="teachers.teacherprofile")),
                ("attempt", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="review_tasks", to="attempts.studentexamattempt")),
                ("exam", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="answer_review_tasks", to="exams.exam")),
                ("institute", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="answer_review_tasks", to="institutes.institute")),
                ("last_reviewed_by_teacher", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="completed_answer_review_tasks", to="teachers.teacherprofile")),
                ("question", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="review_tasks", to="question_bank.question")),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="answer_review_tasks", to="students.studentprofile")),
            ],
            options={
                "ordering": ["status", "-opened_at", "-created_at"],
            },
        ),
        migrations.CreateModel(
            name="StudentAnswerReviewEvent",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(default=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("event_type", models.CharField(choices=[("task_opened", "Task Opened"), ("assigned", "Assigned"), ("unassigned", "Unassigned"), ("review_saved", "Review Saved"), ("review_updated", "Review Updated"), ("recheck_requested", "Recheck Requested"), ("moderated", "Moderated")], max_length=30)),
                ("from_status", models.CharField(blank=True, choices=[("pending", "Pending"), ("assigned", "Assigned"), ("in_review", "In Review"), ("reviewed", "Reviewed"), ("recheck_requested", "Recheck Requested"), ("moderated", "Moderated"), ("cancelled", "Cancelled")], max_length=30)),
                ("to_status", models.CharField(blank=True, choices=[("pending", "Pending"), ("assigned", "Assigned"), ("in_review", "In Review"), ("reviewed", "Reviewed"), ("recheck_requested", "Recheck Requested"), ("moderated", "Moderated"), ("cancelled", "Cancelled")], max_length=30)),
                ("marks_awarded", models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ("notes", models.TextField(blank=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("actor_teacher", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="answer_review_events", to="teachers.teacherprofile")),
                ("actor_user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="answer_review_events", to=settings.AUTH_USER_MODEL)),
                ("answer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="review_events", to="attempts.studentanswer")),
                ("attempt", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="review_events", to="attempts.studentexamattempt")),
                ("exam", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="answer_review_events", to="exams.exam")),
                ("question", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="review_events", to="question_bank.question")),
                ("review_task", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="attempts.studentanswerreviewtask")),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="answer_review_events", to="students.studentprofile")),
            ],
            options={
                "ordering": ["created_at", "id"],
            },
        ),
        migrations.AddIndex(
            model_name="studentanswerreviewtask",
            index=models.Index(fields=["institute", "status", "priority"], name="attempts_st_institu_284883_idx"),
        ),
        migrations.AddIndex(
            model_name="studentanswerreviewtask",
            index=models.Index(fields=["assigned_to_teacher", "status", "opened_at"], name="attempts_st_assigne_5dd8a1_idx"),
        ),
        migrations.AddIndex(
            model_name="studentanswerreviewtask",
            index=models.Index(fields=["exam", "status", "opened_at"], name="attempts_st_exam_id_d205ec_idx"),
        ),
        migrations.AddIndex(
            model_name="studentanswerreviewtask",
            index=models.Index(fields=["student", "status", "opened_at"], name="attempts_st_student_261960_idx"),
        ),
        migrations.AddIndex(
            model_name="studentanswerreviewevent",
            index=models.Index(fields=["review_task", "created_at"], name="attempts_st_review__cd6132_idx"),
        ),
        migrations.AddIndex(
            model_name="studentanswerreviewevent",
            index=models.Index(fields=["exam", "created_at"], name="attempts_st_exam_id_1d330f_idx"),
        ),
        migrations.AddIndex(
            model_name="studentanswerreviewevent",
            index=models.Index(fields=["student", "created_at"], name="attempts_st_student_5a5895_idx"),
        ),
        migrations.RunPython(backfill_review_tasks, migrations.RunPython.noop),
    ]
