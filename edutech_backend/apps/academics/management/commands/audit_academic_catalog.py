from django.core.management.base import BaseCommand, CommandError

from apps.academics.services import audit_academic_catalog, normalize_academic_code


class Command(BaseCommand):
    help = "Audit academic catalog consistency across subjects, topics, and question mappings."

    def add_arguments(self, parser):
        parser.add_argument(
            "--institute-code",
            default="",
            help="Optional institute code filter.",
        )
        parser.add_argument(
            "--subject-code",
            default="",
            help="Optional subject code filter.",
        )
        parser.add_argument(
            "--fail-on-empty-active-topics",
            action="store_true",
            help="Treat active topics with zero active questions as audit failures.",
        )
        parser.add_argument(
            "--fail-on-findings",
            action="store_true",
            help="Exit with a non-zero status when any finding is detected.",
        )

    def handle(self, *args, **options):
        institute_code = normalize_academic_code(options["institute_code"])
        subject_code = normalize_academic_code(options["subject_code"])
        fail_on_empty_active_topics = bool(options["fail_on_empty_active_topics"])
        fail_on_findings = bool(options["fail_on_findings"])

        findings = audit_academic_catalog(
            institute_code=institute_code or None,
            subject_code=subject_code or None,
            fail_on_empty_active_topics=fail_on_empty_active_topics,
        )

        if not findings:
            self.stdout.write(self.style.SUCCESS("Academic catalog audit passed with no findings."))
            return

        for finding in findings:
            records = finding.get("records", [])
            self.stdout.write(
                self.style.WARNING(
                    f"{finding['code']}: {len(records)} finding(s)"
                )
            )
            for record in records[:20]:
                self.stdout.write(f"  - {record}")
            if len(records) > 20:
                self.stdout.write(f"  ... {len(records) - 20} more")

        if fail_on_findings:
            raise CommandError("Academic catalog audit failed.")
