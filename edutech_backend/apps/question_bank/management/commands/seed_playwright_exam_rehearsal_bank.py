from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academics.models import Program, Subject, Topic, TopicDifficulty
from apps.institutes.models import Institute
from apps.question_bank.models import ContentFormat, Question, QuestionOption, QuestionType
from apps.teachers.models import TeacherProfile


BATCH_KEY = "playwright_exam_rehearsal_bank_v1"

TARGET_SUBJECTS = [
    ("Demo NEET Track", "NEET Biology"),
    ("NEET 2026 Foundation", "Biology"),
    ("JEE 2026 Foundation", "Mathematics"),
    ("GRE 2026 Quant Prep", "Quantitative Reasoning"),
    ("AWS 2026 Practitioner Prep", "AWS Cloud Practitioner"),
    ("Demo IELTS Track", "IELTS Academic Skills"),
]


class Command(BaseCommand):
    help = "Top up demo question-bank subjects for large Playwright exam lifecycle rehearsals."

    def add_arguments(self, parser):
        parser.add_argument(
            "--target-count",
            type=int,
            default=60,
            help="Minimum active questions to keep per target subject.",
        )

    def handle(self, *args, **options):
        target_count = int(options["target_count"])
        if target_count < 1:
            raise CommandError("--target-count must be positive.")

        institute = Institute.objects.filter(code="DLI001").first()
        if not institute:
            raise CommandError("Demo Learning Institute (DLI001) was not found. Run prepare_demo_playwright_auth first.")

        teacher = TeacherProfile.objects.filter(institute=institute).order_by("id").first()
        created = 0

        with transaction.atomic():
            for program_name, subject_name in TARGET_SUBJECTS:
                program = Program.objects.filter(institute=institute, name=program_name).first()
                if not program:
                    raise CommandError(f"Program '{program_name}' was not found for DLI001.")

                subject = Subject.objects.filter(institute=institute, program=program, name=subject_name).first()
                if not subject:
                    raise CommandError(f"Subject '{subject_name}' was not found for program '{program_name}'.")

                topic = Topic.objects.filter(institute=institute, subject=subject).order_by("sort_order", "name").first()
                if not topic:
                    topic = Topic.objects.create(
                        institute=institute,
                        program=program,
                        subject=subject,
                        code=f"{subject.code}-PW-TOPIC",
                        name="Playwright Exam Rehearsal",
                        difficulty_level=TopicDifficulty.FOUNDATION,
                        sort_order=999,
                        is_active=True,
                    )

                current_count = Question.objects.filter(
                    institute=institute,
                    program=program,
                    subject=subject,
                    topic=topic,
                    is_active=True,
                ).count()

                for index in range(current_count + 1, target_count + 1):
                    question = Question.objects.create(
                        institute=institute,
                        program=program,
                        subject=subject,
                        topic=topic,
                        created_by_teacher=teacher,
                        question_type=QuestionType.MCQ_SINGLE,
                        difficulty_level=TopicDifficulty.FOUNDATION,
                        content_format=ContentFormat.PLAIN_TEXT,
                        question_text=(
                            f"{subject.name} rehearsal question {index}: choose the option labelled correct."
                        ),
                        explanation="The correct option is intentionally labelled for launch rehearsal automation.",
                        default_marks=Decimal("1.00"),
                        negative_marks=Decimal("0.00"),
                        is_verified=True,
                        metadata={
                            "batch": BATCH_KEY,
                            "program": program.code,
                            "subject": subject.code,
                            "sequence": index,
                        },
                    )
                    QuestionOption.objects.bulk_create(
                        [
                            QuestionOption(
                                question=question,
                                content_format=ContentFormat.PLAIN_TEXT,
                                option_text="Correct answer",
                                option_order=1,
                                is_correct=True,
                            ),
                            QuestionOption(
                                question=question,
                                content_format=ContentFormat.PLAIN_TEXT,
                                option_text="Distractor A",
                                option_order=2,
                                is_correct=False,
                            ),
                            QuestionOption(
                                question=question,
                                content_format=ContentFormat.PLAIN_TEXT,
                                option_text="Distractor B",
                                option_order=3,
                                is_correct=False,
                            ),
                            QuestionOption(
                                question=question,
                                content_format=ContentFormat.PLAIN_TEXT,
                                option_text="Distractor C",
                                option_order=4,
                                is_correct=False,
                            ),
                        ]
                    )
                    created += 1

        self.stdout.write(self.style.SUCCESS("Playwright exam rehearsal bank is ready."))
        self.stdout.write(f"Target questions per subject: {target_count}")
        self.stdout.write(f"Questions created: {created}")
