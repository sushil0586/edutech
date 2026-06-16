from collections import OrderedDict

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import AccountAcquisition, AccountLocation, AccountProfile
from apps.attempts.models import AttemptIntegrityEvent, StudentAnswer, StudentExamAttempt
from apps.economy.models import (
    PaymentOrder,
    PaymentTransaction,
    ReferralCode,
    ReferralEvent,
    StarLedger,
    StudentEconomyProfile,
    StudentEntitlement,
    StudentRewardEvent,
    StudentSubscription,
    StudentUnlockState,
    SubscriptionBillingEvent,
)
from apps.exams.models import Exam, ExamPublishLog, ExamSection, ExamStudentAssignment
from apps.parents.models import ParentAlert, ParentChildRelationship, ParentProfile
from apps.reports.models import AuditLog, InAppNotification
from apps.results.models import ExamPerformanceSummary, ExamResult, StudentTopicPerformance
from apps.students.models import StudentProfile
from apps.teachers.models import TeacherAssignment, TeacherProfile


User = get_user_model()

DEMO_USERNAMES = (
    "demo-platform-admin",
    "demo-institute-admin",
    "demo-teacher",
    "demo-student",
    "demo-parent",
)


class Command(BaseCommand):
    help = (
        "Delete transactional data, preserve question-bank/master setup, and keep only demo users "
        "(optionally plus superusers). Runs in dry-run mode unless --execute is passed."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Actually perform the purge. Without this flag the command only prints counts.",
        )
        parser.add_argument(
            "--drop-superusers",
            action="store_true",
            help="Also delete non-demo superusers. By default superusers are preserved for safety.",
        )

    def _build_preserved_user_queryset(self, *, drop_superusers):
        queryset = User.objects.filter(username__in=DEMO_USERNAMES)
        if not drop_superusers:
            queryset = User.objects.filter(pk__in=queryset.values("pk")) | User.objects.filter(
                is_superuser=True
            )
        return queryset.distinct()

    def _build_plan(self, *, drop_superusers):
        preserved_users = self._build_preserved_user_queryset(drop_superusers=drop_superusers)
        preserved_user_ids = list(preserved_users.values_list("id", flat=True))
        preserved_profiles = AccountProfile.objects.filter(user_id__in=preserved_user_ids)
        preserved_profile_ids = list(preserved_profiles.values_list("id", flat=True))
        preserved_student_ids = list(
            preserved_profiles.exclude(student_profile_id__isnull=True).values_list(
                "student_profile_id", flat=True
            )
        )
        preserved_teacher_ids = list(
            preserved_profiles.exclude(teacher_profile_id__isnull=True).values_list(
                "teacher_profile_id", flat=True
            )
        )
        preserved_parent_ids = list(
            ParentProfile.objects.filter(account_profile_id__in=preserved_profile_ids).values_list(
                "id", flat=True
            )
        )

        return OrderedDict(
            [
                ("attempt_integrity_events", AttemptIntegrityEvent.objects.all()),
                ("student_answers", StudentAnswer.objects.all()),
                ("student_exam_attempts", StudentExamAttempt.objects.all()),
                ("exam_results", ExamResult.objects.all()),
                ("student_topic_performance", StudentTopicPerformance.objects.all()),
                ("exam_performance_summaries", ExamPerformanceSummary.objects.all()),
                ("exam_publish_logs", ExamPublishLog.objects.all()),
                ("exam_student_assignments", ExamStudentAssignment.objects.all()),
                ("exam_sections", ExamSection.objects.all()),
                ("exams", Exam.objects.all()),
                ("payment_transactions", PaymentTransaction.objects.all()),
                ("payment_orders", PaymentOrder.objects.all()),
                ("subscription_billing_events", SubscriptionBillingEvent.objects.all()),
                ("student_subscriptions", StudentSubscription.objects.all()),
                ("student_reward_events", StudentRewardEvent.objects.all()),
                ("star_ledger_entries", StarLedger.objects.all()),
                ("student_unlock_states", StudentUnlockState.objects.all()),
                ("student_entitlements", StudentEntitlement.objects.all()),
                ("student_economy_profiles", StudentEconomyProfile.objects.all()),
                ("referral_events", ReferralEvent.objects.all()),
                ("referral_codes", ReferralCode.objects.all()),
                ("teacher_assignments", TeacherAssignment.objects.all()),
                ("parent_alerts", ParentAlert.objects.all()),
                ("parent_child_relationships", ParentChildRelationship.objects.all()),
                ("notifications", InAppNotification.objects.all()),
                ("audit_logs", AuditLog.objects.all()),
                ("account_acquisitions_non_demo", AccountAcquisition.objects.exclude(account_profile_id__in=preserved_profile_ids)),
                ("account_locations_non_demo", AccountLocation.objects.exclude(account_profile_id__in=preserved_profile_ids)),
                ("parent_profiles_non_demo", ParentProfile.objects.exclude(id__in=preserved_parent_ids)),
                ("teacher_profiles_non_demo", TeacherProfile.objects.exclude(id__in=preserved_teacher_ids)),
                ("student_profiles_non_demo", StudentProfile.objects.exclude(id__in=preserved_student_ids)),
                ("account_profiles_non_demo", AccountProfile.objects.exclude(id__in=preserved_profile_ids)),
                ("users_non_demo", User.objects.exclude(id__in=preserved_user_ids)),
            ]
        )

    def handle(self, *args, **options):
        execute = options["execute"]
        drop_superusers = options["drop_superusers"]
        plan = self._build_plan(drop_superusers=drop_superusers)

        self.stdout.write(self.style.WARNING("Preserved usernames:"))
        for username in DEMO_USERNAMES:
            self.stdout.write(f" - {username}")
        if not drop_superusers:
            self.stdout.write(" - all current superusers are also preserved")

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
                "Purge complete. Question bank and master setup were preserved, and only demo users remain."
            )
        )
