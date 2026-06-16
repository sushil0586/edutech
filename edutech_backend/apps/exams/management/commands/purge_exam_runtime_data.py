from collections import OrderedDict

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.attempts.models import AttemptIntegrityEvent, StudentAnswer, StudentExamAttempt
from apps.exams.models import Exam, ExamPublishLog, ExamQuestion, ExamSection, ExamStudentAssignment
from apps.reports.models import AuditLog, InAppNotification
from apps.results.models import ExamPerformanceSummary, ExamResult, StudentTopicPerformance


EXAM_NOTIFICATION_TYPES = ("exam", "attempt", "result")
EXAM_AUDIT_ENTITY_TYPES = ("exam", "attempt")


class Command(BaseCommand):
    help = (
        "Delete exam lifecycle data only: exams, sections, linked exam questions, attempts, "
        "answers, results, and related exam notifications/audit logs. "
        "Question bank content and users are preserved."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Actually perform the purge. Without this flag the command only prints counts.",
        )

    def _build_plan(self):
        return OrderedDict(
            [
                ("attempt_integrity_events", AttemptIntegrityEvent.objects.all()),
                ("student_answers", StudentAnswer.objects.all()),
                ("exam_results", ExamResult.objects.all()),
                ("student_topic_performance", StudentTopicPerformance.objects.all()),
                ("exam_performance_summaries", ExamPerformanceSummary.objects.all()),
                ("student_exam_attempts", StudentExamAttempt.objects.all()),
                (
                    "exam_notifications",
                    InAppNotification.objects.filter(
                        related_object_type__in=EXAM_NOTIFICATION_TYPES,
                    ),
                ),
                (
                    "exam_audit_logs",
                    AuditLog.objects.filter(entity_type__in=EXAM_AUDIT_ENTITY_TYPES),
                ),
                ("exam_publish_logs", ExamPublishLog.objects.all()),
                ("exam_student_assignments", ExamStudentAssignment.objects.all()),
                ("exam_questions", ExamQuestion.objects.all()),
                ("exam_sections", ExamSection.objects.all()),
                ("exams", Exam.objects.all()),
            ]
        )

    def handle(self, *args, **options):
        execute = options["execute"]
        plan = self._build_plan()

        self.stdout.write(
            self.style.WARNING(
                "This command removes exam runtime data only. Users, profiles, institutes, "
                "academics, and the question bank are preserved."
            )
        )
        self.stdout.write("")
        self.stdout.write(self.style.WARNING("Purge plan:"))

        total_rows = 0
        for label, queryset in plan.items():
            count = queryset.count()
            total_rows += count
            self.stdout.write(f" - {label}: {count}")

        self.stdout.write("")
        if not execute:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Dry run complete. {total_rows} rows would be deleted. "
                    "Run again with --execute to apply."
                )
            )
            return

        with transaction.atomic():
            for label, queryset in plan.items():
                deleted_count, _ = queryset.delete()
                self.stdout.write(f"Deleted {deleted_count} rows from {label}")

        self.stdout.write(
            self.style.SUCCESS(
                "Exam runtime purge complete. You can now seed or create fresh exams for testing."
            )
        )
