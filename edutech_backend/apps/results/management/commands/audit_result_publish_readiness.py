from django.core.management.base import BaseCommand, CommandError

from apps.exams.models import Exam
from apps.results.services import build_result_publish_readiness


class Command(BaseCommand):
    help = "Audit result publication readiness across active exams and optionally fail when blockers exist."

    def add_arguments(self, parser):
        parser.add_argument("--institute-code", type=str, help="Limit the audit to one institute code.")
        parser.add_argument(
            "--only-problem-exams",
            action="store_true",
            help="Print only exams that have blockers or warnings.",
        )
        parser.add_argument(
            "--fail-on-blockers",
            action="store_true",
            help="Exit with a non-zero status code when any exam has result-publication blockers.",
        )

    def handle(self, *args, **options):
        queryset = Exam.objects.filter(is_active=True).select_related("institute")
        institute_code = (options.get("institute_code") or "").strip()
        if institute_code:
            queryset = queryset.filter(institute__code=institute_code)

        blocker_exam_count = 0
        warning_exam_count = 0
        total_exam_count = 0

        for exam in queryset.order_by("institute__code", "title"):
            total_exam_count += 1
            readiness = build_result_publish_readiness(exam)
            has_blockers = readiness["blocker_count"] > 0
            has_warnings = readiness["warning_count"] > 0

            if has_blockers:
                blocker_exam_count += 1
            if has_warnings:
                warning_exam_count += 1

            if options["only_problem_exams"] and not has_blockers and not has_warnings:
                continue

            self.stdout.write(
                f"[{exam.institute.code}] {exam.code} :: ready={str(readiness['ready']).lower()} "
                f"blockers={readiness['blocker_count']} warnings={readiness['warning_count']} "
                f"generated={readiness['generated_results_count']} published={readiness['published_results_count']}"
            )
            for blocker in readiness["blockers"]:
                self.stdout.write(
                    self.style.ERROR(
                        f"  BLOCKER {blocker['code']} ({blocker['field']}): {blocker['message']}"
                    )
                )
            for warning in readiness["warnings"]:
                self.stdout.write(
                    self.style.WARNING(
                        f"  WARNING {warning['code']} ({warning['field']}): {warning['message']}"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Audited {total_exam_count} active exam(s). "
                f"Blocker exams: {blocker_exam_count}. Warning exams: {warning_exam_count}."
            )
        )

        if options["fail_on_blockers"] and blocker_exam_count:
            raise CommandError(
                f"Result publish readiness audit found blockers in {blocker_exam_count} exam(s)."
            )
