import json
from time import perf_counter

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.accounts.models import AccountRole
from apps.results.services import (
    build_student_insight_summary,
    build_student_question_analytics,
    build_teacher_insight_summary,
    bump_student_insight_summary_cache_version,
    bump_student_question_analytics_cache_version,
    bump_teacher_insight_summary_cache_version,
)


User = get_user_model()


class Command(BaseCommand):
    help = (
        "Profile analytics service builders with wall-clock and query-count output for cold and warm cache runs."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--student-username",
            type=str,
            default="demo-student",
            help="Student login username to use for student analytics profiling.",
        )
        parser.add_argument(
            "--teacher-username",
            type=str,
            default="demo-teacher",
            help="Teacher login username to use for teacher analytics profiling.",
        )
        parser.add_argument(
            "--repeat",
            type=int,
            default=3,
            help="Number of repeated measurements to capture for each lane.",
        )
        parser.add_argument(
            "--subject",
            type=str,
            default="",
            help="Optional subject name filter for student question analytics.",
        )
        parser.add_argument(
            "--topic-id",
            type=str,
            default="",
            help="Optional topic id filter for student question analytics.",
        )
        parser.add_argument(
            "--question-type",
            type=str,
            default="",
            help="Optional question type filter for student question analytics.",
        )
        parser.add_argument(
            "--source",
            type=str,
            default="",
            help="Optional source filter for student question analytics.",
        )
        parser.add_argument(
            "--teacher-filter",
            type=str,
            default="",
            help="Optional teacher id filter for student question analytics when source=teacher.",
        )

    def handle(self, *args, **options):
        repeat = max(int(options["repeat"] or 1), 1)
        student_user = self._resolve_user(options["student_username"], expected_role=AccountRole.STUDENT)
        teacher_user = self._resolve_user(options["teacher_username"], expected_role=AccountRole.TEACHER)

        student_profile = getattr(student_user.account_profile, "student_profile", None)
        teacher_profile = getattr(teacher_user, "account_profile", None)
        if student_profile is None:
            raise CommandError(f"User '{student_user.username}' does not have a linked student profile.")
        if teacher_profile is None:
            raise CommandError(f"User '{teacher_user.username}' does not have an account profile.")

        student_question_kwargs = {
            "subject": (options.get("subject") or "").strip(),
            "topic": (options.get("topic_id") or "").strip(),
            "question_type": (options.get("question_type") or "").strip(),
            "source": (options.get("source") or "").strip(),
            "teacher": (options.get("teacher_filter") or "").strip(),
        }

        lanes = [
            {
                "label": "student_question_analytics",
                "invalidate": lambda: bump_student_question_analytics_cache_version(student_profile),
                "call": lambda: build_student_question_analytics(student_profile, **student_question_kwargs),
            },
            {
                "label": "student_insight_summary",
                "invalidate": lambda: bump_student_insight_summary_cache_version(student_profile),
                "call": lambda: build_student_insight_summary(student_profile),
            },
            {
                "label": "teacher_insight_summary",
                "invalidate": bump_teacher_insight_summary_cache_version,
                "call": lambda: build_teacher_insight_summary(teacher_user),
            },
        ]

        report = {
            "student_username": student_user.username,
            "teacher_username": teacher_user.username,
            "repeat": repeat,
            "student_question_filters": student_question_kwargs,
            "lanes": [],
        }
        for lane in lanes:
            report["lanes"].append(self._profile_lane(lane=lane, repeat=repeat))

        self.stdout.write(json.dumps(report, indent=2, default=str))

    def _resolve_user(self, username, *, expected_role):
        normalized_username = (username or "").strip()
        if not normalized_username:
            raise CommandError("Username cannot be blank.")

        try:
            user = User.objects.select_related("account_profile").get(username=normalized_username)
        except User.DoesNotExist as exc:
            raise CommandError(
                f"User '{normalized_username}' was not found. Seed demo data or pass a valid username."
            ) from exc

        account_profile = getattr(user, "account_profile", None)
        if account_profile is None:
            raise CommandError(f"User '{normalized_username}' does not have an account profile.")
        if account_profile.role != expected_role:
            raise CommandError(
                f"User '{normalized_username}' has role '{account_profile.role}', expected '{expected_role}'."
            )
        return user

    def _profile_lane(self, *, lane, repeat):
        lane["invalidate"]()
        cold_runs = [self._measure(lane["call"]) for _ in range(repeat)]
        warm_runs = [self._measure(lane["call"]) for _ in range(repeat)]
        return {
            "label": lane["label"],
            "cold_runs": cold_runs,
            "warm_runs": warm_runs,
            "cold_summary": self._summarize_runs(cold_runs),
            "warm_summary": self._summarize_runs(warm_runs),
        }

    def _measure(self, fn):
        started = perf_counter()
        with CaptureQueriesContext(connection) as query_context:
            payload = fn()
        elapsed_ms = round((perf_counter() - started) * 1000, 2)
        return {
            "elapsed_ms": elapsed_ms,
            "query_count": len(query_context),
            "result_size_hint": self._result_size_hint(payload),
        }

    def _summarize_runs(self, runs):
        elapsed_values = [item["elapsed_ms"] for item in runs]
        query_counts = [item["query_count"] for item in runs]
        return {
            "min_elapsed_ms": min(elapsed_values),
            "max_elapsed_ms": max(elapsed_values),
            "avg_elapsed_ms": round(sum(elapsed_values) / len(elapsed_values), 2),
            "min_query_count": min(query_counts),
            "max_query_count": max(query_counts),
            "avg_query_count": round(sum(query_counts) / len(query_counts), 2),
        }

    def _result_size_hint(self, payload):
        if isinstance(payload, dict):
            if isinstance(payload.get("questions"), list):
                return {"questions": len(payload["questions"])}
            if isinstance(payload.get("recent_exams"), list):
                return {"recent_exams": len(payload["recent_exams"])}
            if isinstance(payload.get("exam_overview"), list):
                return {"exam_overview": len(payload["exam_overview"])}
            return {"top_level_keys": len(payload.keys())}
        if isinstance(payload, list):
            return {"items": len(payload)}
        return {"type": type(payload).__name__}
