from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from apps.reports.management.commands.profile_operational_routes import Command


class ProfileOperationalRoutesCommandTestCase(SimpleTestCase):
    def test_build_routes_includes_student_and_economy_labels(self):
        command = Command()
        institute_admin_user = SimpleNamespace(username="institute-admin")
        teacher_user = SimpleNamespace(username="teacher")
        platform_admin_user = SimpleNamespace(username="platform-admin")
        student_user = SimpleNamespace(username="student")
        parent_user = SimpleNamespace(username="parent")

        routes = command._build_routes(
            institute_admin_user=institute_admin_user,
            teacher_user=teacher_user,
            platform_admin_user=platform_admin_user,
            student_user=student_user,
            parent_user=parent_user,
            parent_child_id="child-1",
            student_attempt_id="attempt-1",
            student_exam_id="exam-1",
            teacher_exam_id="teacher-exam-1",
        )

        labels = {route["label"] for route in routes}

        self.assertIn("student_available_exams", labels)
        self.assertIn("question_bank_questions_compact", labels)
        self.assertIn("question_bank_passages_list", labels)
        self.assertIn("teacher_results_leaderboard", labels)
        self.assertIn("student_attempt_list", labels)
        self.assertIn("student_exam_detail", labels)
        self.assertIn("student_attempt_detail", labels)
        self.assertIn("student_attempt_summary", labels)
        self.assertIn("student_attempt_review", labels)
        self.assertIn("student_result_list", labels)
        self.assertIn("student_wallet", labels)
        self.assertIn("student_subscriptions", labels)
        self.assertIn("admin_economy_catalog_overview", labels)
        self.assertIn("admin_question_bank_packages", labels)
        self.assertIn("admin_question_bank_entitlements", labels)
        self.assertIn("institute_scoped_question_bank_entitlements", labels)
        self.assertIn("parent_dashboard_summary", labels)
        self.assertIn("parent_alerts", labels)

    def test_handle_reports_platform_admin_user_and_new_route_labels(self):
        command = Command()
        institute_admin_user = SimpleNamespace(username="demo-institute-admin")
        teacher_user = SimpleNamespace(username="demo-teacher")
        platform_admin_user = SimpleNamespace(username="demo-platform-admin")
        student_user = SimpleNamespace(username="demo-student")
        parent_user = SimpleNamespace(username="demo-parent")

        def fake_resolve_user(username, *, expected_role):
            role_map = {
                "demo-institute-admin": institute_admin_user,
                "demo-teacher": teacher_user,
                "demo-platform-admin": platform_admin_user,
                "demo-student": student_user,
                "demo-parent": parent_user,
            }
            return role_map[username]

        with patch.object(command, "_resolve_user", side_effect=fake_resolve_user), patch.object(
            command,
            "_resolve_parent_child_id",
            return_value=None,
        ), patch.object(
            command,
            "_resolve_student_attempt_id",
            return_value="attempt-1",
        ), patch.object(
            command,
            "_resolve_student_exam_id",
            return_value="exam-1",
        ), patch.object(
            command,
            "_resolve_teacher_exam_id",
            return_value="teacher-exam-1",
        ), patch.object(
            command,
            "_profile_route",
            side_effect=lambda **kwargs: {"label": kwargs["route"]["label"], "path": kwargs["route"]["path"]},
        ), patch.object(command.stdout, "write") as write_mock:
            command.handle(
                institute_admin_username="demo-institute-admin",
                teacher_username="demo-teacher",
                platform_admin_username="demo-platform-admin",
                student_username="demo-student",
                parent_username="demo-parent",
                repeat=1,
                route_label="",
                include_query_sql=False,
            )

        self.assertTrue(write_mock.called)
        output = write_mock.call_args.args[0]
        self.assertIn('"platform_admin": "demo-platform-admin"', output)
        self.assertIn('"label": "question_bank_questions_compact"', output)
        self.assertIn('"label": "question_bank_passages_list"', output)
        self.assertIn('"label": "teacher_results_leaderboard"', output)
        self.assertIn('"label": "student_available_exams"', output)
        self.assertIn('"label": "student_exam_detail"', output)
        self.assertIn('"label": "student_attempt_detail"', output)
        self.assertIn('"label": "student_attempt_summary"', output)
        self.assertIn('"label": "student_attempt_review"', output)
        self.assertIn('"label": "admin_economy_catalog_overview"', output)
