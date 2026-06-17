from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count, Q

from apps.academics.models import Subject, Topic


class Command(BaseCommand):
    help = (
        "Deactivate active topics under the selected subject code when they have "
        "zero active questions attached."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--subject-code",
            default="",
            help="Subject code to clean, for example CLS7-MATH.",
        )
        parser.add_argument(
            "--institute-code",
            default="",
            help="Optional institute code filter.",
        )
        parser.add_argument(
            "--all-subjects",
            action="store_true",
            help="Clean every active subject in scope instead of one subject code.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without writing to the database.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        subject_code = str(options["subject_code"]).strip()
        institute_code = str(options["institute_code"]).strip()
        all_subjects = bool(options["all_subjects"])
        dry_run = bool(options["dry_run"])

        if not all_subjects and not subject_code:
            raise CommandError("Provide --subject-code or use --all-subjects.")

        subject_filters = {"is_active": True}
        if subject_code:
            subject_filters["code"] = subject_code
        if institute_code:
            subject_filters["institute__code"] = institute_code

        subjects = list(
            Subject.objects.filter(**subject_filters)
            .select_related("program", "institute")
            .order_by("institute__code", "program__code", "id")
        )
        if not subjects:
            scope_hint = subject_code or "all active subjects"
            if institute_code:
                scope_hint = f"{scope_hint} in institute {institute_code}"
            raise CommandError(f"No active subject found for {scope_hint}.")

        total_deactivated = 0

        for subject in subjects:
            topics = list(
                Topic.objects.filter(subject=subject, is_active=True)
                .annotate(
                    active_question_count=Count(
                        "questions",
                        filter=Q(questions__is_active=True),
                    )
                )
                .order_by("sort_order", "name")
            )

            empty_topics = [topic for topic in topics if int(topic.active_question_count or 0) == 0]
            populated_topics = [topic for topic in topics if int(topic.active_question_count or 0) > 0]

            self.stdout.write(
                self.style.NOTICE(
                    f"Subject {subject.code} | institute={subject.institute_id} | "
                    f"program={getattr(subject.program, 'code', '')} | "
                    f"populated={len(populated_topics)} | empty={len(empty_topics)}"
                )
            )

            for topic in empty_topics:
                self.stdout.write(
                    f"  - {'Would deactivate' if dry_run else 'Deactivating'} "
                    f"{topic.code} | {topic.name}"
                )

            if dry_run or not empty_topics:
                continue

            Topic.objects.filter(id__in=[topic.id for topic in empty_topics]).update(is_active=False)
            total_deactivated += len(empty_topics)

        if dry_run:
            raise CommandError("Dry run complete. No database changes were written.")

        self.stdout.write(
            self.style.SUCCESS(
                "Deactivated "
                f"{total_deactivated} empty active topic(s) for "
                f"{subject_code if subject_code else 'all active subjects'}"
                f"{f' in institute {institute_code}' if institute_code else ''}."
            )
        )
