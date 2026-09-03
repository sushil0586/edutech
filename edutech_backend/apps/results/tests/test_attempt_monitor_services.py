from datetime import timedelta
from types import SimpleNamespace

from django.test import SimpleTestCase
from django.utils import timezone

from apps.results.services import (
    search_teacher_attempt_monitor_payloads,
    sort_teacher_attempt_monitor_payloads,
)


class TeacherAttemptMonitorServiceTestCase(SimpleTestCase):
    def _attempt(self, *, student_name, admission_no, exam_title, started_offset_minutes=0):
        now = timezone.now()
        return SimpleNamespace(
            student=SimpleNamespace(full_name=student_name, admission_no=admission_no),
            exam=SimpleNamespace(title=exam_title),
            status="submitted",
            submitted_at=None,
            started_at=now - timedelta(minutes=started_offset_minutes),
            updated_at=now,
            is_auto_submitted=False,
            percentage=75,
            skipped_questions=0,
            time_taken_seconds=120,
            _monitor_alerts_cache=[],
            _monitor_metadata_cache={"priority_score": 0, "health": "stable"},
        )

    def test_search_uses_related_student_and_exam_fields_without_annotations(self):
        attempts = [
            self._attempt(
                student_name="Aarav Sharma",
                admission_no="DLI-1001",
                exam_title="Class 7 Mathematics Drill",
            ),
            self._attempt(
                student_name="Isha Mehta",
                admission_no="DLI-1002",
                exam_title="Science Drill",
            ),
        ]

        self.assertEqual(
            search_teacher_attempt_monitor_payloads(attempts, "aarav"),
            [attempts[0]],
        )
        self.assertEqual(
            search_teacher_attempt_monitor_payloads(attempts, "mathematics"),
            [attempts[0]],
        )
        self.assertEqual(
            search_teacher_attempt_monitor_payloads(attempts, "DLI-1002"),
            [attempts[1]],
        )

    def test_name_sort_uses_related_student_field_without_annotations(self):
        attempts = [
            self._attempt(student_name="Zara", admission_no="DLI-3", exam_title="Math", started_offset_minutes=3),
            self._attempt(student_name="Aarav", admission_no="DLI-1", exam_title="Math", started_offset_minutes=1),
        ]

        sorted_attempts = sort_teacher_attempt_monitor_payloads(attempts, "name")

        self.assertEqual(sorted_attempts, [attempts[1], attempts[0]])
