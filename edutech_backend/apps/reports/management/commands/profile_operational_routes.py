import json
from time import perf_counter

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.accounts.models import AccountRole
from apps.attempts.models import StudentExamAttempt
from apps.parents.models import ParentChildRelationship, ParentRelationshipStatus


User = get_user_model()


class Command(BaseCommand):
    help = (
        "Profile operational institute/admin/teacher/parent routes with wall-clock and query-count output."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--institute-admin-username",
            type=str,
            default="demo-institute-admin",
            help="Institute admin username to use for institute-scoped routes.",
        )
        parser.add_argument(
            "--teacher-username",
            type=str,
            default="demo-teacher",
            help="Teacher username to use for teacher-scoped routes.",
        )
        parser.add_argument(
            "--platform-admin-username",
            type=str,
            default="demo-platform-admin",
            help="Platform admin username to use for platform-admin economy routes.",
        )
        parser.add_argument(
            "--student-username",
            type=str,
            default="demo-student",
            help="Student username to use for student and notification routes.",
        )
        parser.add_argument(
            "--parent-username",
            type=str,
            default="demo-parent",
            help="Parent username to use for parent-scoped routes.",
        )
        parser.add_argument(
            "--repeat",
            type=int,
            default=2,
            help="Number of repeated measurements to capture for each route.",
        )
        parser.add_argument(
            "--route-label",
            type=str,
            default="",
            help="Profile only the route with this label.",
        )
        parser.add_argument(
            "--include-query-sql",
            action="store_true",
            help="Include a small sample of captured SQL statements for each measured run.",
        )

    def handle(self, *args, **options):
        repeat = max(int(options["repeat"] or 1), 1)
        route_label_filter = str(options.get("route_label", "") or "").strip()
        include_query_sql = bool(options.get("include_query_sql", False))
        institute_admin_user = self._resolve_user(
            options["institute_admin_username"],
            expected_role=AccountRole.INSTITUTE_ADMIN,
        )
        teacher_user = self._resolve_user(
            options["teacher_username"],
            expected_role=AccountRole.TEACHER,
        )
        platform_admin_user = self._resolve_user(
            options["platform_admin_username"],
            expected_role=AccountRole.PLATFORM_ADMIN,
        )
        student_user = self._resolve_user(
            options["student_username"],
            expected_role=AccountRole.STUDENT,
        )
        parent_user = self._resolve_user(
            options["parent_username"],
            expected_role=AccountRole.PARENT,
        )

        parent_child_id = self._resolve_parent_child_id(parent_user)
        student_attempt_id = self._resolve_student_attempt_id(student_user)
        student_exam_id = self._resolve_student_exam_id(student_user)

        routes = self._build_routes(
            institute_admin_user=institute_admin_user,
            teacher_user=teacher_user,
            platform_admin_user=platform_admin_user,
            student_user=student_user,
            parent_user=parent_user,
            parent_child_id=parent_child_id,
            student_attempt_id=student_attempt_id,
            student_exam_id=student_exam_id,
        )

        if route_label_filter:
            routes = [route for route in routes if route["label"] == route_label_filter]
            if not routes:
                raise CommandError(
                    f"Route label '{route_label_filter}' was not found in the operational profiler route set."
                )

        report = {
            "repeat": repeat,
            "route_label": route_label_filter or None,
            "include_query_sql": include_query_sql,
            "users": {
                "institute_admin": institute_admin_user.username,
                "teacher": teacher_user.username,
                "platform_admin": platform_admin_user.username,
                "student": student_user.username,
                "parent": parent_user.username,
            },
            "parent_child_id": str(parent_child_id) if parent_child_id is not None else None,
            "routes": [],
        }
        for route in routes:
            report["routes"].append(
                self._profile_route(
                    route=route,
                    repeat=repeat,
                    include_query_sql=include_query_sql,
                )
            )

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

    def _resolve_parent_child_id(self, user):
        account_profile = getattr(user, "account_profile", None)
        try:
            parent_profile = account_profile.parent_profile if account_profile is not None else None
        except Exception:  # noqa: BLE001
            parent_profile = None
        if parent_profile is None:
            return None
        relationship = (
            ParentChildRelationship.objects.filter(
                parent_profile=parent_profile,
                status=ParentRelationshipStatus.ACTIVE,
                is_active=True,
                student__is_active=True,
            )
            .order_by("-is_primary_contact", "student__full_name")
            .first()
        )
        return relationship.student_id if relationship is not None else None

    def _resolve_student_attempt_id(self, user):
        account_profile = getattr(user, "account_profile", None)
        try:
            student_profile = account_profile.student_profile if account_profile is not None else None
        except Exception:  # noqa: BLE001
            student_profile = None
        if student_profile is None:
            return None
        attempt = (
            StudentExamAttempt.objects.filter(
                student=student_profile,
                is_active=True,
            )
            .order_by("-started_at", "-created_at")
            .first()
        )
        return attempt.id if attempt is not None else None

    def _resolve_student_exam_id(self, user):
        account_profile = getattr(user, "account_profile", None)
        try:
            student_profile = account_profile.student_profile if account_profile is not None else None
        except Exception:  # noqa: BLE001
            student_profile = None
        if student_profile is None:
            return None
        attempt = (
            StudentExamAttempt.objects.filter(
                student=student_profile,
                is_active=True,
                exam__is_active=True,
            )
            .select_related("exam")
            .order_by("-started_at", "-created_at")
            .first()
        )
        return attempt.exam_id if attempt is not None else None

    def _build_routes(
        self,
        *,
        institute_admin_user,
        teacher_user,
        platform_admin_user,
        student_user,
        parent_user,
        parent_child_id,
        student_attempt_id,
        student_exam_id,
    ):
        routes = [
            {
                "label": "institute_dashboard_summary",
                "user": institute_admin_user,
                "path": "/api/v1/institute/dashboard/summary/",
            },
            {
                "label": "teacher_exam_list",
                "user": teacher_user,
                "path": "/api/v1/teacher/exams/?page=1&page_size=10&filter=all&sort=recommended",
            },
            {
                "label": "teacher_results_summary",
                "user": teacher_user,
                "path": "/api/v1/teacher/results/summary/",
            },
            {
                "label": "review_queue_summary",
                "user": teacher_user,
                "path": "/api/v1/attempts/review-tasks/summary/",
            },
            {
                "label": "master_question_library",
                "user": teacher_user,
                "path": "/api/v1/question-bank/master-library/?page=1&page_size=10",
            },
            {
                "label": "question_bank_questions_compact",
                "user": institute_admin_user,
                "path": "/api/v1/question-bank/questions/?page=1&page_size=10&compact=1",
            },
            {
                "label": "question_bank_passages_list",
                "user": institute_admin_user,
                "path": "/api/v1/question-bank/passages/?page=1&page_size=10",
            },
            {
                "label": "student_available_exams",
                "user": student_user,
                "path": "/api/v1/student/exams/available/",
            },
            {
                "label": "student_attempt_list",
                "user": student_user,
                "path": "/api/v1/student/attempts/",
            },
            {
                "label": "student_result_list",
                "user": student_user,
                "path": "/api/v1/student/results/",
            },
            {
                "label": "student_wallet",
                "user": student_user,
                "path": "/api/v1/economy/wallet/",
            },
            {
                "label": "student_subscriptions",
                "user": student_user,
                "path": "/api/v1/economy/subscriptions/",
            },
            {
                "label": "notification_list",
                "user": student_user,
                "path": "/api/v1/notifications/?page=1&page_size=10&ordering=newest",
            },
            {
                "label": "notification_unread_count",
                "user": student_user,
                "path": "/api/v1/notifications/unread-count/",
            },
            {
                "label": "admin_economy_catalog_overview",
                "user": platform_admin_user,
                "path": "/api/v1/economy/admin/catalog-overview/",
            },
            {
                "label": "admin_question_bank_packages",
                "user": platform_admin_user,
                "path": "/api/v1/economy/admin/question-bank-packages/",
            },
            {
                "label": "admin_question_bank_entitlements",
                "user": platform_admin_user,
                "path": "/api/v1/economy/admin/question-bank-entitlements/",
            },
            {
                "label": "institute_scoped_question_bank_entitlements",
                "user": institute_admin_user,
                "path": "/api/v1/economy/admin/institute-question-bank-entitlements/",
            },
        ]
        if student_exam_id is not None:
            routes.append(
                {
                    "label": "student_exam_detail",
                    "user": student_user,
                    "path": f"/api/v1/student/exams/{student_exam_id}/detail/",
                }
            )
        if student_attempt_id is not None:
            routes.append(
                {
                    "label": "student_attempt_detail",
                    "user": student_user,
                    "path": f"/api/v1/attempts/{student_attempt_id}/detail/",
                }
            )
            routes.append(
                {
                    "label": "student_attempt_summary",
                    "user": student_user,
                    "path": f"/api/v1/attempts/{student_attempt_id}/summary/",
                }
            )
            routes.append(
                {
                    "label": "student_attempt_review",
                    "user": student_user,
                    "path": f"/api/v1/attempts/{student_attempt_id}/review/",
                }
            )
        if parent_child_id is not None:
            routes.extend(
                [
                    {
                        "label": "parent_dashboard_summary",
                        "user": parent_user,
                        "path": f"/api/v1/parent/dashboard/summary/?child_id={parent_child_id}",
                    },
                    {
                        "label": "parent_alerts",
                        "user": parent_user,
                        "path": f"/api/v1/parent/alerts/?child_id={parent_child_id}&ordering=latest",
                    },
                ]
            )
        return routes

    def _profile_route(self, *, route, repeat, include_query_sql):
        client = APIClient()
        client.force_authenticate(user=route["user"])
        cache.clear()
        first_cold_run = self._measure(
            client=client,
            path=route["path"],
            include_query_sql=include_query_sql,
        )
        if first_cold_run["status_code"] != 200:
            return {
                "label": route["label"],
                "path": route["path"],
                "status": "skipped",
                "status_code": first_cold_run["status_code"],
                "reason": "Route did not return HTTP 200 for the profiling user.",
            }
        cold_runs = [first_cold_run] + [
            self._measure(client=client, path=route["path"], include_query_sql=include_query_sql)
            for _ in range(max(repeat - 1, 0))
        ]
        warm_runs = [
            self._measure(client=client, path=route["path"], include_query_sql=include_query_sql)
            for _ in range(repeat)
        ]
        return {
            "label": route["label"],
            "path": route["path"],
            "cold_runs": cold_runs,
            "warm_runs": warm_runs,
            "cold_summary": self._summarize_runs(cold_runs),
            "warm_summary": self._summarize_runs(warm_runs),
        }

    def _measure(self, *, client, path, include_query_sql):
        started = perf_counter()
        allowed_hosts = list(getattr(settings, "ALLOWED_HOSTS", []))
        for host in ("testserver", "localhost", "127.0.0.1"):
            if host not in allowed_hosts:
                allowed_hosts.append(host)
        with override_settings(ALLOWED_HOSTS=allowed_hosts):
            with CaptureQueriesContext(connection) as query_context:
                response = client.get(path)
        elapsed_ms = round((perf_counter() - started) * 1000, 2)
        payload = getattr(response, "data", None)
        if payload is None:
            try:
                payload = json.loads(response.content.decode("utf-8"))
            except Exception:  # noqa: BLE001
                payload = {"response_type": type(response).__name__}
        measurement = {
            "status_code": response.status_code,
            "elapsed_ms": elapsed_ms,
            "query_count": len(query_context),
            "result_size_hint": self._result_size_hint(payload),
        }
        if include_query_sql:
            measurement["query_sql_samples"] = self._query_sql_samples(query_context)
        return measurement

    def _query_sql_samples(self, query_context, *, limit=5, max_length=240):
        samples = []
        for query in query_context.captured_queries[:limit]:
            sql = " ".join(str(query.get("sql", "")).split())
            if len(sql) > max_length:
                sql = f"{sql[: max_length - 3]}..."
            samples.append(sql)
        return samples

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
            if isinstance(payload.get("results"), list):
                return {"results": len(payload["results"])}
            if isinstance(payload.get("reviewers"), list):
                return {"reviewers": len(payload["reviewers"])}
            if isinstance(payload.get("recent_exam_analytics"), list):
                return {"recent_exam_analytics": len(payload["recent_exam_analytics"])}
            if isinstance(payload.get("available_alert_types"), list):
                return {"available_alert_types": len(payload["available_alert_types"])}
            return {"top_level_keys": len(payload.keys())}
        if isinstance(payload, list):
            return {"items": len(payload)}
        return {"type": type(payload).__name__}
