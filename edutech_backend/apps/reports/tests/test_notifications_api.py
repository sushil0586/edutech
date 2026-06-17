from rest_framework import status
from rest_framework.test import APITestCase

from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.exams.services import mark_exam_completed, publish_exam, sync_total_marks_from_questions
from apps.reports.models import AuditLog, InAppNotification, NotificationType
from apps.results.services import generate_result_from_attempt, publish_exam_results
from common.tests.builders import AcademicAssessmentBuilder


class NotificationApiTestCase(APITestCase):
    @staticmethod
    def _list_data(response):
        if isinstance(response.data, dict):
            return response.data.get("results", [])
        return response.data

    @staticmethod
    def _action_data(response):
        if isinstance(response.data, dict) and "data" in response.data:
            return response.data["data"]
        return response.data

    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.student_user, _ = self.builder.create_student_account(
            institute=self.context["institute"],
            student_profile=self.context["student"],
            username="notify-student",
            password="Student@123",
        )
        self.teacher_user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="notify-teacher",
            password="Teacher@123",
        )
        self.other_student = self.builder.create_student(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            admission_no="STU099",
            email="other-notify@example.com",
            first_name="Other",
            last_name="Student",
        )
        self.other_student_user, _ = self.builder.create_student_account(
            institute=self.context["institute"],
            student_profile=self.other_student,
            username="notify-other-student",
            password="Student@123",
        )

        self.exam = sync_total_marks_from_questions(self.context["exam"])
        self.exam.passing_marks = self.exam.total_marks
        self.exam.save(update_fields=["passing_marks", "updated_at"])
        publish_exam(self.exam, changed_by=self.context["teacher"], remarks="Notification publish")

    def test_user_sees_only_own_notifications(self):
        self.client.force_authenticate(self.student_user)
        response = self.client.get("/api/v1/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        items = self._list_data(response)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["notification_type"], NotificationType.EXAM_SCHEDULED)
        self.assertEqual(str(items[0]["recipient_user"]), str(self.student_user.id))

        self.client.force_authenticate(self.other_student_user)
        response = self.client.get("/api/v1/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        items = self._list_data(response)
        self.assertEqual(len(items), 1)
        self.assertEqual(str(items[0]["recipient_user"]), str(self.other_student_user.id))
        self.assertIn("summary", response.data)
        self.assertIn("available_notification_types", response.data)

    def test_mark_read_and_unread_count_work(self):
        notification = InAppNotification.objects.filter(recipient_user=self.student_user).first()
        self.client.force_authenticate(self.student_user)

        count_response = self.client.get("/api/v1/notifications/unread-count/")
        self.assertEqual(count_response.status_code, status.HTTP_200_OK)
        self.assertEqual(count_response.data["unread_count"], 1)

        read_response = self.client.post(f"/api/v1/notifications/{notification.id}/mark-read/")
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertTrue(read_response.data["success"])
        self.assertTrue(self._action_data(read_response)["is_read"])

        count_response = self.client.get("/api/v1/notifications/unread-count/")
        self.assertEqual(count_response.data["unread_count"], 0)
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.student_user,
                action="notification_mark_read",
                entity_type="notification",
            ).exists()
        )

        mark_all_response = self.client.post("/api/v1/notifications/mark-all-read/")
        self.assertEqual(mark_all_response.status_code, status.HTTP_200_OK)
        self.assertTrue(mark_all_response.data["success"])
        self.assertIn("updated_count", self._action_data(mark_all_response))

    def test_exam_publish_creates_notifications(self):
        self.assertTrue(
            InAppNotification.objects.filter(
                recipient_user=self.student_user,
                notification_type=NotificationType.EXAM_SCHEDULED,
                related_object_id=str(self.exam.id),
            ).exists()
        )
        self.assertTrue(
            InAppNotification.objects.filter(
                recipient_user=self.teacher_user,
                notification_type=NotificationType.EXAM_SCHEDULED,
                related_object_id=str(self.exam.id),
            ).exists()
        )

    def test_result_publish_creates_notifications(self):
        attempt = start_attempt(self.context["student"], self.exam)
        correct_option = next(option for option in self.context["options"] if option.is_correct)
        save_answer(
            attempt=attempt,
            question=self.context["question"],
            selected_option=correct_option,
            time_spent_seconds=18,
        )
        attempt = submit_attempt(attempt)
        generate_result_from_attempt(attempt)
        mark_exam_completed(self.exam, changed_by=self.context["teacher"])
        publish_exam_results(self.exam)

        self.assertTrue(
            InAppNotification.objects.filter(
                recipient_user=self.student_user,
                notification_type=NotificationType.RESULT_PUBLISHED,
            ).exists()
        )

    def test_notification_list_supports_filters_and_pagination(self):
        InAppNotification.objects.create(
            recipient_user=self.student_user,
            institute=self.context["institute"],
            notification_type=NotificationType.EXAM_LIVE,
            title="Live exam reminder",
            message="An exam is now live.",
            related_object_type="exam",
            related_object_id=str(self.exam.id),
        )
        read_notification = InAppNotification.objects.create(
            recipient_user=self.student_user,
            institute=self.context["institute"],
            notification_type=NotificationType.RESULT_PUBLISHED,
            title="Result ready",
            message="Result is published.",
            related_object_type="result",
            related_object_id="result-1",
            is_read=True,
        )

        self.client.force_authenticate(self.student_user)
        response = self.client.get(
            "/api/v1/notifications/",
            {
                "status": "unread",
                "notification_type": NotificationType.EXAM_LIVE,
                "page_size": 1,
                "ordering": "oldest",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(self._list_data(response)), 1)
        self.assertEqual(
            self._list_data(response)[0]["notification_type"],
            NotificationType.EXAM_LIVE,
        )
        self.assertEqual(response.data["summary"]["total"], 3)
        self.assertEqual(response.data["summary"]["read"], 1)
        self.assertEqual(response.data["summary"]["unread"], 2)
        self.assertEqual(response.data["applied_filters"]["status"], "unread")
        self.assertEqual(
            response.data["applied_filters"]["notification_type"],
            NotificationType.EXAM_LIVE,
        )
        self.assertTrue(
            any(
                item["value"] == NotificationType.RESULT_PUBLISHED
                for item in response.data["available_notification_types"]
            )
        )
        read_notification.refresh_from_db()
        self.assertTrue(read_notification.is_read)
