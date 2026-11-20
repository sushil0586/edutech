from django.contrib.auth import get_user_model
from django.core.management import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.models import AccountProfile, AccountRole
from apps.parents.models import (
    ParentAlert,
    ParentAlertSeverity,
    ParentAlertStatus,
    ParentAlertType,
    ParentChildRelationship,
    ParentProfile,
    ParentRelationshipStatus,
    ParentRelationshipType,
    default_notification_preferences,
)
from apps.students.models import StudentProfile


class Command(BaseCommand):
    help = "Seed a linked demo parent workspace for Playwright parent launch coverage."

    def add_arguments(self, parser):
        parser.add_argument("--parent-username", default="demo-parent")
        parser.add_argument("--student-username", default="demo-student")
        parser.add_argument("--linked-by-username", default="demo-institute-admin")

    def handle(self, *args, **options):
        user_model = get_user_model()
        parent_username = options["parent_username"]
        student_username = options["student_username"]
        linked_by_username = options["linked_by_username"]

        parent_user = user_model.objects.filter(username=parent_username).first()
        if parent_user is None:
            raise CommandError(f"Parent user {parent_username!r} was not found. Run prepare_demo_playwright_auth first.")

        parent_account = AccountProfile.objects.select_related("institute").filter(user=parent_user).first()
        if parent_account is None or parent_account.role != AccountRole.PARENT or parent_account.institute_id is None:
            raise CommandError(f"User {parent_username!r} is not an institute-scoped parent account.")

        student_account = (
            AccountProfile.objects.select_related("student_profile", "institute", "user")
            .filter(user__username=student_username, role=AccountRole.STUDENT)
            .first()
        )
        if student_account is None or student_account.student_profile_id is None:
            raise CommandError(f"Student user {student_username!r} was not found or has no linked student profile.")

        student = StudentProfile.objects.select_related("institute").get(id=student_account.student_profile_id)
        if student.institute_id != parent_account.institute_id:
            raise CommandError("Demo parent and demo student must belong to the same institute.")

        linked_by = user_model.objects.filter(username=linked_by_username).first() or parent_user
        now = timezone.now()

        parent_profile, _ = ParentProfile.objects.update_or_create(
            account_profile=parent_account,
            defaults={
                "institute": parent_account.institute,
                "first_name": parent_user.first_name or "Demo",
                "last_name": parent_user.last_name or "Parent",
                "phone": "",
                "email": parent_user.email or "demo.parent@example.test",
                "notification_preferences": default_notification_preferences(),
                "metadata": {"source": "playwright_parent_workspace_seed"},
                "is_active": True,
            },
        )

        relationship, _ = ParentChildRelationship.objects.update_or_create(
            parent_profile=parent_profile,
            student=student,
            relationship_type=ParentRelationshipType.GUARDIAN,
            defaults={
                "institute": parent_account.institute,
                "relationship_label": "Demo guardian",
                "is_primary_contact": True,
                "can_view_progress": True,
                "can_view_results": True,
                "can_view_wallet": False,
                "can_receive_alerts": True,
                "can_receive_weekly_summary": True,
                "status": ParentRelationshipStatus.ACTIVE,
                "linked_by": linked_by,
                "linked_at": now,
                "approved_by": linked_by,
                "approved_at": now,
                "revoked_by": None,
                "revoked_at": None,
                "metadata": {"source": "playwright_parent_workspace_seed"},
                "is_active": True,
            },
        )

        alert_defaults = [
            {
                "source_reference": "playwright-parent-result-published",
                "alert_type": ParentAlertType.RESULT_PUBLISHED,
                "severity": ParentAlertSeverity.INFO,
                "title": "Demo result is ready",
                "message": f"{student.full_name}'s latest published result is available for family review.",
                "status": ParentAlertStatus.NEW,
            },
            {
                "source_reference": "playwright-parent-study-warning",
                "alert_type": ParentAlertType.SCORE_DROP,
                "severity": ParentAlertSeverity.WARNING,
                "title": "Demo study signal needs attention",
                "message": f"{student.full_name} has a study signal that should be reviewed with the academic team.",
                "status": ParentAlertStatus.NEW,
            },
        ]

        for alert in alert_defaults:
            ParentAlert.objects.update_or_create(
                parent_profile=parent_profile,
                source_reference=alert["source_reference"],
                defaults={
                    "institute": parent_account.institute,
                    "student": student,
                    "relationship": relationship,
                    "alert_type": alert["alert_type"],
                    "severity": alert["severity"],
                    "title": alert["title"],
                    "message": alert["message"],
                    "status": alert["status"],
                    "source_type": "playwright_seed",
                    "metadata": {"source": "playwright_parent_workspace_seed"},
                    "read_at": None,
                    "resolved_at": None,
                    "is_active": True,
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded parent workspace: parent={parent_username}, child={student.full_name}, alerts={len(alert_defaults)}"
            )
        )
