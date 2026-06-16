from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academics.models import AcademicYear, Program, Subject, Topic
from apps.academics.management.seed_presets import PRESETS
from apps.institutes.models import Institute


class Command(BaseCommand):
    help = "Seed public academic structure for the shared public institute."

    def add_arguments(self, parser):
        parser.add_argument(
            "--preset",
            default="class_7_cbse_core",
            choices=sorted(PRESETS.keys()),
            help="Academic preset to seed into the shared public institute.",
        )
        parser.add_argument(
            "--institute-code",
            default="",
            help="Optional public institute code override. When omitted, the active public institute is auto-detected.",
        )
        parser.add_argument(
            "--academic-year-name",
            default="2026-2027",
            help="Academic year name to create or update for the public institute.",
        )
        parser.add_argument(
            "--academic-year-start",
            default="2026-04-01",
            help="Academic year start date in YYYY-MM-DD format.",
        )
        parser.add_argument(
            "--academic-year-end",
            default="2027-03-31",
            help="Academic year end date in YYYY-MM-DD format.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        institute = self._resolve_public_institute(institute_code=options["institute_code"].strip())
        preset = PRESETS[options["preset"]]
        start_date = date.fromisoformat(options["academic_year_start"])
        end_date = date.fromisoformat(options["academic_year_end"])

        summary = {
            "academic_years": {"created": 0, "updated": 0},
            "programs": {"created": 0, "updated": 0},
            "subjects": {"created": 0, "updated": 0},
            "topics": {"created": 0, "updated": 0},
        }

        self._upsert_academic_year(
            institute=institute,
            name=options["academic_year_name"].strip(),
            start_date=start_date,
            end_date=end_date,
            summary=summary["academic_years"],
        )
        program = self._upsert_program(institute=institute, payload=preset["program"], summary=summary["programs"])

        for subject_payload in preset["subjects"]:
            subject = self._upsert_subject(
                institute=institute,
                program=program,
                payload=subject_payload,
                summary=summary["subjects"],
            )
            for topic_payload in subject_payload["topics"]:
                parent_topic = self._upsert_topic(
                    institute=institute,
                    subject=subject,
                    parent_topic=None,
                    payload=topic_payload,
                    summary=summary["topics"],
                )
                for child_name, child_code, child_sort_order in topic_payload.get("children", []):
                    self._upsert_topic(
                        institute=institute,
                        subject=subject,
                        parent_topic=parent_topic,
                        payload={
                            "name": child_name,
                            "code": child_code,
                            "description": "",
                            "sort_order": child_sort_order,
                        },
                        summary=summary["topics"],
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"Public academics seeded for {institute.code} using preset {options['preset']}."
            )
        )
        for label, counts in summary.items():
            self.stdout.write(f"- {label}: created={counts['created']} updated={counts['updated']}")

    def _resolve_public_institute(self, *, institute_code):
        if institute_code:
            institute = Institute.objects.filter(code=institute_code).first()
            if institute is None:
                raise CommandError(f"Public institute not found: {institute_code}")
            if not (institute.metadata or {}).get("is_public_content_hub"):
                raise CommandError(
                    f"Institute {institute_code} is not marked as the public content hub."
                )
            return institute

        public_institute = Institute.objects.filter(metadata__is_public_content_hub=True).first()
        if public_institute is None:
            raise CommandError(
                "No public institute found. Run seed_public_institute_bootstrap first."
            )
        return public_institute

    def _upsert_academic_year(self, *, institute, name, start_date, end_date, summary):
        AcademicYear.objects.filter(institute=institute, is_current=True).exclude(name=name).update(
            is_current=False
        )
        academic_year, created = AcademicYear.objects.update_or_create(
            institute=institute,
            name=name,
            defaults={
                "start_date": start_date,
                "end_date": end_date,
                "is_current": True,
                "is_active": True,
            },
        )
        if created:
            summary["created"] += 1
        else:
            summary["updated"] += 1

        AcademicYear.objects.filter(institute=institute).exclude(pk=academic_year.pk).update(
            is_current=False
        )
        return academic_year

    def _upsert_program(self, *, institute, payload, summary):
        program, created = Program.objects.update_or_create(
            institute=institute,
            code=payload["code"],
            defaults={
                "name": payload["name"],
                "category": payload["category"],
                "description": payload["description"],
                "sort_order": payload["sort_order"],
                "is_active": True,
            },
        )
        if created:
            summary["created"] += 1
        else:
            summary["updated"] += 1
        return program

    def _upsert_subject(self, *, institute, program, payload, summary):
        subject, created = Subject.objects.update_or_create(
            institute=institute,
            code=payload["code"],
            defaults={
                "program": program,
                "name": payload["name"],
                "description": payload["description"],
                "sort_order": payload["sort_order"],
                "is_active": True,
            },
        )
        if created:
            summary["created"] += 1
        else:
            summary["updated"] += 1
        return subject

    def _upsert_topic(self, *, institute, subject, parent_topic, payload, summary):
        topic, created = Topic.objects.update_or_create(
            subject=subject,
            code=payload["code"],
            defaults={
                "institute": institute,
                "parent_topic": parent_topic,
                "name": payload["name"],
                "description": payload.get("description", ""),
                "difficulty_level": "intermediate",
                "sort_order": payload["sort_order"],
                "is_active": True,
            },
        )
        if created:
            summary["created"] += 1
        else:
            summary["updated"] += 1
        return topic
