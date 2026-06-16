import json
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.core.exceptions import ValidationError

from apps.exams.services import create_advanced_exam_from_blueprint, preview_advanced_exam_blueprint


User = get_user_model()


class Command(BaseCommand):
    help = (
        "Create or preview an advanced exam from a JSON blueprint file using the same "
        "service path as the advanced exam builder UI."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "blueprint_file",
            help="Path to the advanced exam blueprint JSON file.",
        )
        parser.add_argument(
            "--username",
            required=True,
            help="Username of the actor whose scope/permissions should be used.",
        )
        parser.add_argument(
            "--preview-only",
            action="store_true",
            help="Validate and preview the blueprint without creating the exam.",
        )

    def handle(self, *args, **options):
        blueprint_path = Path(options["blueprint_file"]).expanduser().resolve()
        if not blueprint_path.exists():
            raise CommandError(f"Blueprint file not found: {blueprint_path}")

        actor = User.objects.filter(username=options["username"]).first()
        if actor is None:
            raise CommandError(f"User not found: {options['username']}")

        blueprint = self._load_blueprint(blueprint_path)

        try:
            preview = preview_advanced_exam_blueprint(actor=actor, blueprint=blueprint)
        except ValidationError as exc:
            raise CommandError(self._stringify_validation_error(exc)) from exc

        self.stdout.write(self.style.SUCCESS("Blueprint preview resolved successfully."))
        self.stdout.write(
            f"- title={preview['resolved_exam']['title']} "
            f"code={preview['resolved_exam']['code']} "
            f"questions={preview['resolved_exam']['total_questions']} "
            f"marks={preview['resolved_exam']['total_marks']}"
        )
        for section in preview["sections"]:
            self.stdout.write(
                f"- section {section['order']}: {section['name']} "
                f"requested={section['requested']} resolved={section['resolved']}"
            )
        if preview["warnings"]:
            self.stdout.write(self.style.WARNING("Warnings:"))
            for warning in preview["warnings"]:
                self.stdout.write(f"  - {warning}")

        if options["preview_only"]:
            return

        try:
            result = create_advanced_exam_from_blueprint(actor=actor, blueprint=blueprint)
        except ValidationError as exc:
            raise CommandError(self._stringify_validation_error(exc)) from exc

        exam = result["exam"]
        self.stdout.write(self.style.SUCCESS("Exam created successfully."))
        self.stdout.write(
            f"- exam_id={exam.id} code={exam.code} title={exam.title} "
            f"status={exam.status} total_marks={exam.total_marks}"
        )

    def _load_blueprint(self, blueprint_path):
        try:
            return json.loads(blueprint_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON in blueprint file {blueprint_path}: {exc}") from exc
        except OSError as exc:
            raise CommandError(f"Could not read blueprint file {blueprint_path}: {exc}") from exc

    def _stringify_validation_error(self, exc):
        message = getattr(exc, "message_dict", None)
        if message:
            return json.dumps(message, ensure_ascii=False)
        return str(exc)
