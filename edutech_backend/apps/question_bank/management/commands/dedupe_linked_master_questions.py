from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count

from apps.attempts.models import StudentAnswer, StudentAnswerReviewEvent, StudentAnswerReviewTask
from apps.economy.models import InstituteQuestionUsageLedger
from apps.exams.models import ExamQuestion
from apps.institutes.models import Institute
from apps.question_bank.models import (
    InstituteQuestionAccess,
    Question,
    QuestionAttachment,
    QuestionTagMap,
)


class Command(BaseCommand):
    help = (
        "Deduplicate institute question-bank rows that point to the same master question. "
        "Keeps one operational row per (institute, master_question) and reassigns dependent records."
    )

    def add_arguments(self, parser):
        parser.add_argument("institute_code", help="Institute code to clean.")
        parser.add_argument(
            "--subject-code",
            default="",
            help="Optional subject code filter, for example CLS7-SCI.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually write changes. Without this flag the command runs in dry-run mode.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        institute = Institute.objects.filter(code=options["institute_code"].strip()).first()
        if institute is None:
            raise CommandError(f"Institute not found: {options['institute_code']}")

        queryset = Question.objects.filter(
            institute=institute,
            master_question__isnull=False,
            is_active=True,
        )
        subject_code = options["subject_code"].strip()
        if subject_code:
            queryset = queryset.filter(subject__code=subject_code)

        duplicate_groups = list(
            queryset.values("master_question_id")
            .annotate(total=Count("id"))
            .filter(total__gt=1)
            .order_by("master_question_id")
        )

        if not duplicate_groups:
            self.stdout.write(self.style.SUCCESS("No duplicate linked master-question rows were found."))
            return

        dry_run = not options["apply"]
        duplicate_question_count = 0
        deleted_question_count = 0
        reassigned_reference_count = 0

        for group in duplicate_groups:
            master_question_id = group["master_question_id"]
            duplicate_rows = list(
                Question.objects.filter(
                    institute=institute,
                    master_question_id=master_question_id,
                    is_active=True,
                )
                .select_related("master_question", "subject", "topic")
                .order_by("created_at", "id")
            )
            duplicate_question_count += len(duplicate_rows)

            linked_access = (
                InstituteQuestionAccess.objects.filter(
                    institute=institute,
                    master_question_id=master_question_id,
                    linked_question_id__in=[row.id for row in duplicate_rows],
                    is_active=True,
                )
                .order_by("created_at", "id")
                .first()
            )
            keep_question = None
            if linked_access and linked_access.linked_question_id:
                keep_question = next(
                    (row for row in duplicate_rows if row.id == linked_access.linked_question_id),
                    None,
                )
            if keep_question is None:
                keep_question = duplicate_rows[0]

            duplicate_ids = [row.id for row in duplicate_rows if row.id != keep_question.id]
            if not duplicate_ids:
                continue

            self.stdout.write(
                f"master={master_question_id} keep={keep_question.id} remove={len(duplicate_ids)}"
            )

            if dry_run:
                continue

            reassigned_reference_count += InstituteQuestionAccess.objects.filter(
                linked_question_id__in=duplicate_ids
            ).update(linked_question=keep_question)
            reassigned_reference_count += InstituteQuestionUsageLedger.objects.filter(
                question_id__in=duplicate_ids
            ).update(question=keep_question)
            reassigned_reference_count += ExamQuestion.objects.filter(
                question_id__in=duplicate_ids
            ).update(question=keep_question)
            reassigned_reference_count += StudentAnswer.objects.filter(
                question_id__in=duplicate_ids
            ).update(question=keep_question)
            reassigned_reference_count += StudentAnswerReviewTask.objects.filter(
                question_id__in=duplicate_ids
            ).update(question=keep_question)
            reassigned_reference_count += StudentAnswerReviewEvent.objects.filter(
                question_id__in=duplicate_ids
            ).update(question=keep_question)
            reassigned_reference_count += QuestionAttachment.objects.filter(
                question_id__in=duplicate_ids
            ).update(question=keep_question)

            for duplicate_id in duplicate_ids:
                for tag_map in QuestionTagMap.objects.filter(question_id=duplicate_id):
                    QuestionTagMap.objects.get_or_create(
                        question=keep_question,
                        tag=tag_map.tag,
                    )
                    tag_map.delete()

            deleted_count, _ = Question.objects.filter(id__in=duplicate_ids).delete()
            deleted_question_count += deleted_count

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"Dry run only. Found {len(duplicate_groups)} duplicate master-question groups "
                    f"covering {duplicate_question_count} question rows. Re-run with --apply to clean them."
                )
            )
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Deduplicated {len(duplicate_groups)} duplicate master-question groups in {institute.code}."
            )
        )
        self.stdout.write(f"- duplicate_question_rows_seen={duplicate_question_count}")
        self.stdout.write(f"- deleted_records={deleted_question_count}")
        self.stdout.write(f"- reassigned_references={reassigned_reference_count}")
