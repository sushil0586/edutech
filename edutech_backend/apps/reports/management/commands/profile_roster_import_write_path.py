import json
from time import perf_counter
from uuid import uuid4

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext

from apps.accounts.services import import_bulk_students, import_bulk_teachers
from common.tests.builders import AcademicAssessmentBuilder


class Command(BaseCommand):
    help = "Profile bulk roster finalize write paths for student and teacher imports on disposable data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--repeat",
            type=int,
            default=1,
            help="Number of disposable profiling runs to capture.",
        )
        parser.add_argument(
            "--rows",
            type=int,
            default=5,
            help="Number of rows to finalize per import scenario.",
        )

    def handle(self, *args, **options):
        repeat = max(int(options["repeat"] or 1), 1)
        row_count = max(int(options["rows"] or 1), 1)
        report = {
            "repeat": repeat,
            "rows": row_count,
            "scenario": "disposable_roster_import_write_path",
            "steps": [],
        }

        for _ in range(repeat):
            report["steps"].append(self._profile_disposable_flow(row_count=row_count))

        self.stdout.write(json.dumps(report, indent=2, default=str))

    def _profile_disposable_flow(self, *, row_count):
        with transaction.atomic():
            context = self._build_unique_flow_entities()
            run = {
                "finalize_student_import_without_login": self._measure(
                    lambda: import_bulk_students(
                        institute=context["institute"],
                        valid_payloads=self._build_student_payloads(
                            context,
                            row_count=row_count,
                            create_login=False,
                            lane="student-no-login",
                        ),
                    )
                ),
                "finalize_student_import_with_login": self._measure(
                    lambda: import_bulk_students(
                        institute=context["institute"],
                        valid_payloads=self._build_student_payloads(
                            context,
                            row_count=row_count,
                            create_login=True,
                            lane="student-with-login",
                        ),
                    )
                ),
                "finalize_teacher_import_with_login": self._measure(
                    lambda: import_bulk_teachers(
                        institute=context["institute"],
                        valid_payloads=self._build_teacher_payloads(
                            context,
                            row_count=row_count,
                            create_login=True,
                            lane="teacher-with-login",
                        ),
                    )
                ),
            }

            for step in run.values():
                result = step.pop("_result")
                step["created_count"] = result["created_count"]
                step["failed_count"] = result["failed_count"]
                step["credential_count"] = len(result["credentials"])

            transaction.set_rollback(True)
            return run

    def _build_unique_flow_entities(self):
        builder = AcademicAssessmentBuilder()
        suffix = uuid4().hex[:8].upper()
        institute = builder.create_institute(
            code=f"IMP{suffix}",
            name=f"Import Profiling Institute {suffix}",
            email=f"import-{suffix.lower()}@demo.edu",
        )
        academic_year = builder.create_academic_year(
            institute,
            name=f"2026-2027-{suffix}",
        )
        program = builder.create_program(
            institute,
            code=f"PROG-{suffix}",
            name=f"Program {suffix}",
        )
        cohort = builder.create_cohort(
            institute,
            program,
            academic_year,
            code=f"COH-{suffix}",
        )
        return {
            "suffix": suffix,
            "institute": institute,
            "academic_year": academic_year,
            "program": program,
            "cohort": cohort,
        }

    def _build_student_payloads(self, context, *, row_count, create_login, lane):
        payloads = []
        lane_key = lane.replace("-", "").upper()[:8]
        for index in range(1, row_count + 1):
            suffix = f"{context['suffix']}{lane_key}{index:02d}"
            payloads.append(
                {
                    "institute": str(context["institute"].id),
                    "academic_year": str(context["academic_year"].id),
                    "program": str(context["program"].id),
                    "cohort": str(context["cohort"].id),
                    "admission_no": f"STU-{suffix}",
                    "first_name": f"Student{index}",
                    "last_name": "Profile",
                    "gender": "female" if index % 2 else "male",
                    "date_of_birth": "2012-05-21",
                    "email": f"student-{suffix.lower()}@demo.edu",
                    "phone": f"999990{index:04d}",
                    "guardian_name": f"Guardian {index}",
                    "guardian_phone": f"888880{index:04d}",
                    "address": f"Address {index}",
                    "joined_at": "2026-05-21",
                    "is_active": True,
                    "create_login": create_login,
                    "username": f"student.{suffix.lower()}" if create_login else None,
                    "password": "Student@123" if create_login else None,
                    "auto_generate": False,
                    "resolved_username": f"student.{suffix.lower()}" if create_login else None,
                }
            )
        return payloads

    def _build_teacher_payloads(self, context, *, row_count, create_login, lane):
        payloads = []
        lane_key = lane.replace("-", "").upper()[:8]
        for index in range(1, row_count + 1):
            suffix = f"{context['suffix']}{lane_key}{index:02d}"
            payloads.append(
                {
                    "institute": str(context["institute"].id),
                    "employee_code": f"TCH-{suffix}",
                    "first_name": f"Teacher{index}",
                    "last_name": "Profile",
                    "email": f"teacher-{suffix.lower()}@demo.edu",
                    "phone": f"777770{index:04d}",
                    "qualification": "MSc",
                    "specialization": "Science",
                    "bio": "Disposable profiling teacher",
                    "joined_at": "2026-05-21",
                    "is_active": True,
                    "create_login": create_login,
                    "username": f"teacher.{suffix.lower()}" if create_login else None,
                    "password": "Teacher@123" if create_login else None,
                    "auto_generate": False,
                    "resolved_username": f"teacher.{suffix.lower()}" if create_login else None,
                }
            )
        return payloads

    def _measure(self, callback):
        started = perf_counter()
        with CaptureQueriesContext(connection) as query_context:
            result = callback()
        elapsed_ms = round((perf_counter() - started) * 1000, 2)
        return {
            "elapsed_ms": elapsed_ms,
            "query_count": len(query_context),
            "query_sql_samples": self._query_sql_samples(query_context),
            "_result": result,
        }

    def _query_sql_samples(self, query_context, *, limit=5, max_length=240):
        samples = []
        for query in query_context.captured_queries[:limit]:
            sql = " ".join(str(query.get("sql", "")).split())
            if len(sql) > max_length:
                sql = f"{sql[: max_length - 3]}..."
            samples.append(sql)
        return samples
