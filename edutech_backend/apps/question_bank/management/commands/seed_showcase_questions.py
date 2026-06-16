from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.academics.models import Program, Subject, Topic, TopicDifficulty
from apps.institutes.models import Institute
from apps.question_bank.models import Question, QuestionOption, QuestionType
from apps.question_bank.services import sync_master_question_from_institute_question
from apps.teachers.models import TeacherProfile


SHOWCASE_BATCH = "showcase_100_v1"


TOPIC_BLUEPRINTS = [
    {
        "code": "ALG-01",
        "name": "Algebra",
        "difficulty_level": TopicDifficulty.INTERMEDIATE,
        "sort_order": 1,
        "description": "Expressions, equations, identities, and linear reasoning.",
    },
    {
        "code": "ARI-01",
        "name": "Arithmetic",
        "difficulty_level": TopicDifficulty.FOUNDATION,
        "sort_order": 2,
        "description": "Ratios, percentages, profit-loss, and number operations.",
    },
    {
        "code": "GEO-01",
        "name": "Geometry",
        "difficulty_level": TopicDifficulty.INTERMEDIATE,
        "sort_order": 3,
        "description": "Angles, triangles, circles, and mensuration concepts.",
    },
    {
        "code": "STA-01",
        "name": "Statistics",
        "difficulty_level": TopicDifficulty.FOUNDATION,
        "sort_order": 4,
        "description": "Data handling, central tendency, and interpretation.",
    },
    {
        "code": "NUM-01",
        "name": "Number Systems",
        "difficulty_level": TopicDifficulty.INTERMEDIATE,
        "sort_order": 5,
        "description": "Integers, surds, indices, and properties of real numbers.",
    },
]


def _mcq_single_payload(index, topic):
    topic_name = topic["name"]
    if topic_name == "Algebra":
        a = 2 + (index % 7)
        b = 3 + (index % 5)
        c = a + b
        return {
            "question_text": f"Solve for x: x + {a} = {c}.",
            "explanation": f"Subtract {a} from both sides to get x = {b}.",
            "difficulty_level": TopicDifficulty.FOUNDATION if index % 2 else TopicDifficulty.INTERMEDIATE,
            "default_marks": Decimal("1.00"),
            "negative_marks": Decimal("0.25"),
            "options": [
                {"option_text": str(b - 2), "is_correct": False},
                {"option_text": str(b), "is_correct": True},
                {"option_text": str(b + 1), "is_correct": False},
                {"option_text": str(c), "is_correct": False},
            ],
        }
    if topic_name == "Arithmetic":
        percent = 10 + (index % 9) * 5
        base = 80 + (index % 6) * 20
        answer = (base * percent) // 100
        return {
            "question_text": f"What is {percent}% of {base}?",
            "explanation": f"{percent}% of {base} = {base} x {percent}/100 = {answer}.",
            "difficulty_level": TopicDifficulty.FOUNDATION,
            "default_marks": Decimal("1.00"),
            "negative_marks": Decimal("0.25"),
            "options": [
                {"option_text": str(answer - 4), "is_correct": False},
                {"option_text": str(answer), "is_correct": True},
                {"option_text": str(answer + 6), "is_correct": False},
                {"option_text": str(base + percent), "is_correct": False},
            ],
        }
    if topic_name == "Geometry":
        angle = 20 + (index % 6) * 10
        answer = 180 - 2 * angle
        return {
            "question_text": f"In an isosceles triangle, two equal angles are {angle} degrees each. Find the third angle.",
            "explanation": f"Triangle angles total 180 degrees, so third angle = 180 - 2 x {angle} = {answer}.",
            "difficulty_level": TopicDifficulty.INTERMEDIATE,
            "default_marks": Decimal("1.00"),
            "negative_marks": Decimal("0.25"),
            "options": [
                {"option_text": str(answer), "is_correct": True},
                {"option_text": str(angle), "is_correct": False},
                {"option_text": str(180 - angle), "is_correct": False},
                {"option_text": str(answer + 10), "is_correct": False},
            ],
        }
    if topic_name == "Statistics":
        start = 4 + (index % 5)
        values = [start, start + 2, start + 4]
        answer = sum(values) // len(values)
        return {
            "question_text": f"Find the mean of {values[0]}, {values[1]}, and {values[2]}.",
            "explanation": f"Mean = ({values[0]} + {values[1]} + {values[2]}) / 3 = {answer}.",
            "difficulty_level": TopicDifficulty.FOUNDATION,
            "default_marks": Decimal("1.00"),
            "negative_marks": Decimal("0.25"),
            "options": [
                {"option_text": str(answer - 1), "is_correct": False},
                {"option_text": str(answer), "is_correct": True},
                {"option_text": str(answer + 2), "is_correct": False},
                {"option_text": str(sum(values)), "is_correct": False},
            ],
        }

    exponent = 2 + (index % 4)
    base = 2 + (index % 3)
    answer = base**exponent
    return {
        "question_text": f"Evaluate {base}^{exponent}.",
        "explanation": f"{base}^{exponent} means multiplying {base} by itself {exponent} times, giving {answer}.",
        "difficulty_level": TopicDifficulty.INTERMEDIATE,
        "default_marks": Decimal("1.00"),
        "negative_marks": Decimal("0.25"),
        "options": [
            {"option_text": str(answer - base), "is_correct": False},
            {"option_text": str(answer), "is_correct": True},
            {"option_text": str(answer + exponent), "is_correct": False},
            {"option_text": str(base * exponent), "is_correct": False},
        ],
    }


def _mcq_multiple_payload(index, topic):
    topic_name = topic["name"]
    if topic_name == "Algebra":
        value = 1 + (index % 5)
        expressions = [
            (f"x + {2 * value}", 3 * value, True),
            (f"2x", 2 * value, True),
            (f"x^2", value**2, value == 1),
            (f"x - {value}", 0, False),
        ]
        answer_value = 2 * value
        return {
            "question_text": f"If x = {value}, which expressions evaluate to {answer_value}? Select all that apply.",
            "explanation": "Substitute the given x-value into each expression and compare the results.",
            "difficulty_level": TopicDifficulty.INTERMEDIATE,
            "default_marks": Decimal("2.00"),
            "negative_marks": Decimal("0.50"),
            "options": [
                {"option_text": expressions[0][0], "is_correct": False},
                {"option_text": expressions[1][0], "is_correct": True},
                {"option_text": expressions[2][0], "is_correct": value == 2},
                {"option_text": expressions[3][0], "is_correct": False},
            ],
        }
    if topic_name == "Arithmetic":
        number = 12 + (index % 6)
        return {
            "question_text": f"Which of the following are factors of {number}? Select all that apply.",
            "explanation": f"A factor divides {number} exactly with no remainder.",
            "difficulty_level": TopicDifficulty.FOUNDATION,
            "default_marks": Decimal("2.00"),
            "negative_marks": Decimal("0.50"),
            "options": [
                {"option_text": "2", "is_correct": number % 2 == 0},
                {"option_text": "3", "is_correct": number % 3 == 0},
                {"option_text": "5", "is_correct": number % 5 == 0},
                {"option_text": str(number), "is_correct": True},
            ],
        }
    if topic_name == "Geometry":
        return {
            "question_text": "Which statements about a rectangle are always true? Select all that apply.",
            "explanation": "A rectangle has opposite sides equal, all angles 90 degrees, and equal diagonals.",
            "difficulty_level": TopicDifficulty.INTERMEDIATE,
            "default_marks": Decimal("2.00"),
            "negative_marks": Decimal("0.50"),
            "options": [
                {"option_text": "All interior angles are right angles.", "is_correct": True},
                {"option_text": "Diagonals are always equal.", "is_correct": True},
                {"option_text": "All four sides are equal.", "is_correct": False},
                {"option_text": "Opposite sides are parallel.", "is_correct": True},
            ],
        }
    if topic_name == "Statistics":
        return {
            "question_text": "Which measures can be used to describe the center of a dataset? Select all that apply.",
            "explanation": "Mean, median, and mode are common measures of central tendency.",
            "difficulty_level": TopicDifficulty.FOUNDATION,
            "default_marks": Decimal("2.00"),
            "negative_marks": Decimal("0.50"),
            "options": [
                {"option_text": "Mean", "is_correct": True},
                {"option_text": "Median", "is_correct": True},
                {"option_text": "Mode", "is_correct": True},
                {"option_text": "Range", "is_correct": False},
            ],
        }

    return {
        "question_text": "Which of the following are rational numbers? Select all that apply.",
        "explanation": "Integers and fractions of integers are rational numbers.",
        "difficulty_level": TopicDifficulty.INTERMEDIATE,
        "default_marks": Decimal("2.00"),
        "negative_marks": Decimal("0.50"),
        "options": [
            {"option_text": "7/9", "is_correct": True},
            {"option_text": "sqrt(2)", "is_correct": False},
            {"option_text": "-4", "is_correct": True},
            {"option_text": "0.125", "is_correct": True},
        ],
    }


def _true_false_payload(index, topic):
    topic_name = topic["name"]
    statements = {
        "Algebra": ("A linear equation in one variable can have at most one solution.", True),
        "Arithmetic": ("A number divisible by 10 must also be divisible by 5.", True),
        "Geometry": ("The sum of the interior angles of a triangle is 360 degrees.", False),
        "Statistics": ("The median is always affected by extreme outliers more than the mean.", False),
        "Number Systems": ("Every integer is a rational number.", True),
    }
    statement, is_true = statements.get(topic_name, statements["Number Systems"])
    return {
        "question_text": f"True or False: {statement}",
        "explanation": "Evaluate the mathematical statement directly from the definition or theorem.",
        "difficulty_level": TopicDifficulty.FOUNDATION if index % 2 else TopicDifficulty.INTERMEDIATE,
        "default_marks": Decimal("1.00"),
        "negative_marks": Decimal("0.00"),
        "options": [
            {"option_text": "True", "is_correct": is_true},
            {"option_text": "False", "is_correct": not is_true},
        ],
    }


def _short_answer_payload(index, topic):
    topic_name = topic["name"]
    if topic_name == "Algebra":
        start = 2 + (index % 6)
        answer = start * 3
        return {
            "question_text": f"If y = 3x and x = {start}, what is y?",
            "explanation": f"Substitute x = {start}, so y = 3 x {start} = {answer}.",
            "difficulty_level": TopicDifficulty.FOUNDATION,
            "default_marks": Decimal("2.00"),
            "negative_marks": Decimal("0.00"),
            "metadata": {"accepted_answers": [str(answer)]},
        }
    if topic_name == "Arithmetic":
        total = 150 + (index % 5) * 25
        spent = 40 + (index % 4) * 10
        answer = total - spent
        return {
            "question_text": f"A student had Rs. {total} and spent Rs. {spent}. How much money is left?",
            "explanation": f"Remaining money = {total} - {spent} = {answer}.",
            "difficulty_level": TopicDifficulty.FOUNDATION,
            "default_marks": Decimal("2.00"),
            "negative_marks": Decimal("0.00"),
            "metadata": {"accepted_answers": [str(answer)]},
        }
    if topic_name == "Geometry":
        side = 4 + (index % 6)
        answer = side * side
        return {
            "question_text": f"Find the area of a square with side {side} cm.",
            "explanation": f"Area of a square = side x side = {side} x {side} = {answer} square cm.",
            "difficulty_level": TopicDifficulty.INTERMEDIATE,
            "default_marks": Decimal("2.00"),
            "negative_marks": Decimal("0.00"),
            "metadata": {"accepted_answers": [str(answer), f"{answer} square cm"]},
        }
    if topic_name == "Statistics":
        low = 6 + (index % 4)
        high = low + 12
        answer = high - low
        return {
            "question_text": f"Find the range of the dataset: {low}, {low + 3}, {low + 6}, {high}.",
            "explanation": f"Range = highest value - lowest value = {high} - {low} = {answer}.",
            "difficulty_level": TopicDifficulty.FOUNDATION,
            "default_marks": Decimal("2.00"),
            "negative_marks": Decimal("0.00"),
            "metadata": {"accepted_answers": [str(answer)]},
        }

    number = 16 + (index % 5) * 9
    root = int(number ** 0.5)
    return {
        "question_text": f"What is the principal square root of {number}?",
        "explanation": f"The principal square root of {number} is {root}.",
        "difficulty_level": TopicDifficulty.INTERMEDIATE,
        "default_marks": Decimal("2.00"),
        "negative_marks": Decimal("0.00"),
        "metadata": {"accepted_answers": [str(root)]},
    }


QUESTION_DISTRIBUTION = (
    [(QuestionType.MCQ_SINGLE, _mcq_single_payload)] * 35
    + [(QuestionType.MCQ_MULTIPLE, _mcq_multiple_payload)] * 25
    + [(QuestionType.TRUE_FALSE, _true_false_payload)] * 20
    + [(QuestionType.SHORT_ANSWER, _short_answer_payload)] * 20
)


class Command(BaseCommand):
    help = "Seed 100 mixed-type showcase questions for realistic student and teacher demos."

    def _ensure_institute(self):
        institute, _ = Institute.objects.get_or_create(
            code="DLI001",
            defaults={
                "name": "Demo Learning Institute",
                "email": "hello@demo.edu",
                "phone": "9999999999",
                "city": "Bengaluru",
                "state": "Karnataka",
                "country": "India",
                "is_active": True,
            },
        )
        return institute

    def _ensure_program(self, institute):
        program, _ = Program.objects.get_or_create(
            institute=institute,
            code="CLS10F",
            defaults={
                "name": "Class 10 Foundation",
                "category": "school",
                "description": "Demo program for math readiness and practice flows.",
                "sort_order": 1,
                "is_active": True,
            },
        )
        return program

    def _ensure_subject(self, institute, program):
        subject, _ = Subject.objects.get_or_create(
            institute=institute,
            code="MATH10",
            defaults={
                "program": program,
                "name": "Mathematics",
                "description": "Showcase subject with multi-topic seeded question bank.",
                "sort_order": 1,
                "is_active": True,
            },
        )
        if subject.program_id is None:
            subject.program = program
            subject.save(update_fields=["program", "updated_at"])
        return subject

    def _ensure_teacher(self, institute):
        teacher, _ = TeacherProfile.objects.get_or_create(
            institute=institute,
            employee_code="TCH001",
            defaults={
                "first_name": "Neha",
                "last_name": "Kapoor",
                "email": "neha@example.com",
                "specialization": "Mathematics",
                "is_active": True,
            },
        )
        return teacher

    def _ensure_topics(self, institute, subject):
        topics = []
        for blueprint in TOPIC_BLUEPRINTS:
            topic, _ = Topic.objects.get_or_create(
                institute=institute,
                subject=subject,
                code=blueprint["code"],
                defaults={
                    "name": blueprint["name"],
                    "description": blueprint["description"],
                    "difficulty_level": blueprint["difficulty_level"],
                    "sort_order": blueprint["sort_order"],
                    "is_active": True,
                },
            )
            topics.append(topic)
        return topics

    def _upsert_question(self, *, institute, program, subject, topic, teacher, question_type, payload, sequence_number):
        metadata = {
            "seed_batch": SHOWCASE_BATCH,
            "seed_sequence": sequence_number,
            "topic_code": topic.code,
            "topic_name": topic.name,
            **(payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {}),
        }
        question_defaults = {
            "program": program,
            "topic": topic,
            "created_by_teacher": teacher,
            "question_type": question_type,
            "difficulty_level": payload["difficulty_level"],
            "explanation": payload["explanation"],
            "default_marks": payload["default_marks"],
            "negative_marks": payload["negative_marks"],
            "is_verified": True,
            "is_active": True,
            "metadata": metadata,
        }
        question = Question.objects.filter(
            institute=institute,
            subject=subject,
            topic=topic,
            metadata__seed_batch=SHOWCASE_BATCH,
            metadata__seed_sequence=sequence_number,
        ).first()
        created = question is None
        if question is None:
            question = Question(
                institute=institute,
                subject=subject,
                question_text=payload["question_text"],
                **question_defaults,
            )
        else:
            question.question_text = payload["question_text"]
            for field, value in question_defaults.items():
                setattr(question, field, value)
        question.save()

        options = payload.get("options", [])
        question.options.all().delete()
        for option_order, option in enumerate(options, start=1):
            QuestionOption.objects.create(
                question=question,
                option_text=option["option_text"],
                option_order=option_order,
                is_correct=option["is_correct"],
                is_active=True,
            )
        sync_master_question_from_institute_question(question)
        return created

    @transaction.atomic
    def handle(self, *args, **options):
        institute = self._ensure_institute()
        program = self._ensure_program(institute)
        subject = self._ensure_subject(institute, program)
        teacher = self._ensure_teacher(institute)
        topics = self._ensure_topics(institute, subject)

        created_count = 0
        updated_count = 0
        type_counts = {
            QuestionType.MCQ_SINGLE: 0,
            QuestionType.MCQ_MULTIPLE: 0,
            QuestionType.TRUE_FALSE: 0,
            QuestionType.SHORT_ANSWER: 0,
        }

        for sequence_number, (question_type, builder) in enumerate(QUESTION_DISTRIBUTION, start=1):
            topic = topics[(sequence_number - 1) % len(topics)]
            payload = builder(sequence_number, {"name": topic.name, "code": topic.code})
            created = self._upsert_question(
                institute=institute,
                program=program,
                subject=subject,
                topic=topic,
                teacher=teacher,
                question_type=question_type,
                payload=payload,
                sequence_number=sequence_number,
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
            type_counts[question_type] += 1

        total_seeded = sum(type_counts.values())
        self.stdout.write(self.style.SUCCESS("Showcase question bank data is ready."))
        self.stdout.write(
            "\n".join(
                [
                    f"Institute: {institute.name} ({institute.code})",
                    f"Program: {program.name} ({program.code})",
                    f"Subject: {subject.name} ({subject.code})",
                    f"Topics ensured: {', '.join(topic.name for topic in topics)}",
                    f"Batch: {SHOWCASE_BATCH}",
                    f"Questions processed: {total_seeded}",
                    f"Created: {created_count}",
                    f"Updated: {updated_count}",
                    f"MCQ Single: {type_counts[QuestionType.MCQ_SINGLE]}",
                    f"MCQ Multiple: {type_counts[QuestionType.MCQ_MULTIPLE]}",
                    f"True / False: {type_counts[QuestionType.TRUE_FALSE]}",
                    f"Short Answer: {type_counts[QuestionType.SHORT_ANSWER]}",
                ]
            )
        )
