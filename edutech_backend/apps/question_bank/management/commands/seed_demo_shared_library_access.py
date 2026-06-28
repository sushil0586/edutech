from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academics.models import Program, Subject, Topic
from apps.economy.models import (
    InstituteQuestionUsageActionType,
    InstituteQuestionUsageLedger,
    InstituteQuestionEntitlement,
    QuestionBankOwnershipType,
    QuestionBankAccessMode,
    QuestionBankPackage,
    QuestionBankPackageScope,
    QuestionBankPackageType,
)
from apps.economy.services import grant_institute_question_bank_entitlement
from apps.economy.services import grant_institute_feature_entitlement
from apps.institutes.models import Institute
from apps.question_bank.models import (
    InstituteQuestionAccess,
    MasterQuestion,
    MasterQuestionOption,
    MasterQuestionSourceType,
    MasterQuestionVisibility,
    Question,
)
from apps.question_bank.services import link_master_question_to_institute


SEED_BATCH = "demo_shared_library_access_v2"
SHARED_LIBRARY_FEATURE_CODE = "QUESTION_BANK_SHARED_LIBRARY"
BLOCKED_MATCHABLE_PREFIX = "BLOCKED MATCHABLE DEMO :: "
PAUSED_ONLY_PREFIX = "PAUSED ONLY DEMO :: "


class Command(BaseCommand):
    help = (
        "Seed a dedicated public content hub, clone a small platform master-question set into it, "
        "create a matching package, and grant the package to the demo institute so Playwright can "
        "exercise shared-library request and link flows against real cross-institute data."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--target-institute-code",
            default="DLI001",
            help="Institute code that should receive the shared-library entitlement.",
        )
        parser.add_argument(
            "--public-hub-code",
            default="PUBDLI1",
            help="Separate public content hub institute code to create or refresh.",
        )
        parser.add_argument(
            "--subject-code",
            default="MATH10",
            help="Donor subject code to clone into the public hub.",
        )
        parser.add_argument(
            "--question-count",
            type=int,
            default=8,
            help="How many donor master questions to clone into the public hub.",
        )
        parser.add_argument(
            "--package-code",
            default="DEMO_SHARED_LIBRARY_ACCESS",
            help="Package code to create or refresh in the public hub.",
        )
        parser.add_argument(
            "--package-name",
            default="Demo Shared Library Access",
            help="Package name to create or refresh in the public hub.",
        )
        parser.add_argument(
            "--unentitled-subject-code",
            default="CLS7-MATH",
            help="Subject code to clone into the public hub without granting package access.",
        )
        parser.add_argument(
            "--unentitled-question-count",
            type=int,
            default=1,
            help="How many unentitled demo questions to clone.",
        )
        parser.add_argument(
            "--quota-demo-subject-code",
            default="CLS7-MATH",
            help="Subject code to clone into the public hub for quota-exhausted demo coverage.",
        )
        parser.add_argument(
            "--quota-demo-question-count",
            type=int,
            default=2,
            help="How many quota-demo questions to clone. Must be at least 2 for one linked + one exhausted card.",
        )
        parser.add_argument(
            "--quota-package-code",
            default="DEMO_SHARED_LIBRARY_QUOTA",
            help="Quota-limited package code to create or refresh in the public hub.",
        )
        parser.add_argument(
            "--quota-package-name",
            default="Demo Shared Library Quota Exhausted",
            help="Quota-limited package name to create or refresh in the public hub.",
        )
        parser.add_argument(
            "--blocked-matchable-subject-code",
            default="DM-NEET-BIO",
            help="Subject code to clone into the public hub with matching package coverage but no entitlement grant.",
        )
        parser.add_argument(
            "--blocked-matchable-question-count",
            type=int,
            default=1,
            help="How many blocked-but-matchable demo questions to clone.",
        )
        parser.add_argument(
            "--blocked-matchable-package-code",
            default="DEMO_SHARED_LIBRARY_BLOCKED",
            help="Package code to create or refresh for blocked-but-matchable shared-library coverage.",
        )
        parser.add_argument(
            "--blocked-matchable-package-name",
            default="Demo Shared Library Blocked Matchable",
            help="Package name to create or refresh for blocked-but-matchable shared-library coverage.",
        )
        parser.add_argument(
            "--paused-only-subject-code",
            default="DM-AWS-CP",
            help="Subject code to clone into the public hub for paused-only shared-library coverage.",
        )
        parser.add_argument(
            "--paused-only-question-count",
            type=int,
            default=1,
            help="How many paused-only demo questions to clone.",
        )
        parser.add_argument(
            "--paused-only-package-code",
            default="DEMO_SHARED_LIBRARY_PAUSED_ONLY",
            help="Package code to create or refresh for paused-only shared-library coverage.",
        )
        parser.add_argument(
            "--paused-only-package-name",
            default="Demo Shared Library Paused Only",
            help="Package name to create or refresh for paused-only shared-library coverage.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        target_institute = self._resolve_institute(options["target_institute_code"].strip())
        public_hub = self._resolve_or_create_public_hub(
            hub_code=options["public_hub_code"].strip(),
            target_institute=target_institute,
        )
        self._cleanup_legacy_demo_packages(
            public_hub=public_hub,
            canonical_package_codes=[
                options["package_code"].strip(),
                options["quota_package_code"].strip(),
            ],
        )
        question_count = options["question_count"]
        if question_count <= 0:
            raise CommandError("--question-count must be greater than zero.")

        donor_questions = self._resolve_donor_questions(
            donor_institute=target_institute,
            subject_code=options["subject_code"].strip(),
            question_count=question_count,
            include_private=True,
        )
        donor_subject = donor_questions[0].source_subject
        donor_program = donor_questions[0].source_program

        hub_program = self._upsert_program(public_hub=public_hub, donor_program=donor_program)
        hub_subject = self._upsert_subject(
            public_hub=public_hub,
            hub_program=hub_program,
            donor_subject=donor_subject,
        )

        cloned_questions = []
        for donor_question in donor_questions:
            hub_topic = self._upsert_topic(
                public_hub=public_hub,
                hub_subject=hub_subject,
                donor_topic=donor_question.source_topic,
            )
            cloned_questions.append(
                self._upsert_master_question(
                    public_hub=public_hub,
                    hub_program=hub_program,
                    hub_subject=hub_subject,
                    hub_topic=hub_topic,
                    donor_question=donor_question,
                    question_text_prefix="",
                    seed_lane="base_access",
                    override_visibility=MasterQuestionVisibility.SHARED_BY_REQUEST,
                )
            )
        self._reset_shared_library_demo_access(
            target_institute=target_institute,
            master_questions=cloned_questions,
        )

        unentitled_questions = self._seed_unentitled_demo_lane(
            donor_institute=target_institute,
            public_hub=public_hub,
            subject_code=options["unentitled_subject_code"].strip(),
            question_count=options["unentitled_question_count"],
            fallback_subject_code=options["subject_code"].strip(),
        )
        quota_demo = self._seed_quota_exhausted_demo_lane(
            donor_institute=target_institute,
            target_institute=target_institute,
            public_hub=public_hub,
            subject_code=options["quota_demo_subject_code"].strip(),
            question_count=options["quota_demo_question_count"],
            package_code=options["quota_package_code"].strip(),
            package_name=options["quota_package_name"].strip(),
            fallback_subject_code=options["subject_code"].strip(),
        )
        blocked_matchable_demo = self._seed_blocked_matchable_demo_lane(
            donor_institute=target_institute,
            target_institute=target_institute,
            public_hub=public_hub,
            subject_code=options["blocked_matchable_subject_code"].strip(),
            question_count=options["blocked_matchable_question_count"],
            package_code=options["blocked_matchable_package_code"].strip(),
            package_name=options["blocked_matchable_package_name"].strip(),
            fallback_subject_code=options["subject_code"].strip(),
        )
        paused_only_demo = self._seed_paused_only_demo_lane(
            donor_institute=target_institute,
            target_institute=target_institute,
            public_hub=public_hub,
            subject_code=options["paused_only_subject_code"].strip(),
            question_count=options["paused_only_question_count"],
            package_code=options["paused_only_package_code"].strip(),
            package_name=options["paused_only_package_name"].strip(),
            fallback_subject_code=options["subject_code"].strip(),
        )

        package = self._upsert_package(
            public_hub=public_hub,
            hub_program=hub_program,
            hub_subject=hub_subject,
            package_code=options["package_code"].strip(),
            package_name=options["package_name"].strip(),
        )
        scope = self._upsert_scope(
            public_hub=public_hub,
            package=package,
            hub_program=hub_program,
            hub_subject=hub_subject,
            metadata={"master_question_seed_lanes": ["base_access"]},
        )
        entitlement, created = grant_institute_question_bank_entitlement(
            institute=target_institute,
            question_bank_package=package,
            notes="Seeded by seed_demo_shared_library_access command.",
        )
        feature_entitlement, feature_created = grant_institute_feature_entitlement(
            institute=target_institute,
            feature_code=SHARED_LIBRARY_FEATURE_CODE,
            source_package=package,
            metadata={"seed_batch": SEED_BATCH, "source": "seed_demo_shared_library_access"},
        )

        self.stdout.write(self.style.SUCCESS("Demo shared-library access is ready."))
        self.stdout.write(f"- target_institute={target_institute.code}")
        self.stdout.write(f"- public_hub={public_hub.code}")
        self.stdout.write(f"- donor_subject={donor_subject.code}")
        self.stdout.write(f"- cloned_questions={len(cloned_questions)}")
        self.stdout.write(f"- unentitled_cloned_questions={len(unentitled_questions)}")
        self.stdout.write(f"- quota_demo_questions={len(quota_demo['questions'])}")
        self.stdout.write(f"- quota_demo_package={quota_demo['package'].code}")
        self.stdout.write(f"- blocked_matchable_questions={len(blocked_matchable_demo['questions'])}")
        self.stdout.write(f"- blocked_matchable_package={blocked_matchable_demo['package'].code}")
        self.stdout.write(f"- paused_only_questions={len(paused_only_demo['questions'])}")
        self.stdout.write(f"- paused_only_package={paused_only_demo['package'].code}")
        self.stdout.write(f"- package={package.code} ({package.name})")
        self.stdout.write(f"- scope_row_id={scope.id}")
        self.stdout.write(f"- canonical_package_owner={public_hub.code}")
        self.stdout.write(f"- entitlement_status={entitlement.status} created={created}")
        self.stdout.write(
            f"- feature_entitlement={feature_entitlement.feature_code} status={feature_entitlement.status} created={feature_created}"
        )

    def _resolve_institute(self, institute_code):
        institute = Institute.objects.filter(code=institute_code).first()
        if institute is None:
            raise CommandError(f"Institute not found: {institute_code}")
        return institute

    def _resolve_or_create_public_hub(self, *, hub_code, target_institute):
        hub = Institute.objects.filter(code=hub_code).first()
        if hub is None:
            hub = Institute.objects.create(
                name="Demo Learning Public Content Hub",
                code=hub_code,
                email=target_institute.email,
                phone=target_institute.phone,
                address=target_institute.address,
                city=target_institute.city,
                state=target_institute.state,
                country=target_institute.country,
                pincode=target_institute.pincode,
                website=target_institute.website,
                description="Public content hub seeded for shared-library demo automation.",
                metadata={"is_public_content_hub": True, "seed_batch": SEED_BATCH},
            )
        elif not (hub.metadata or {}).get("is_public_content_hub"):
            hub.metadata = {**(hub.metadata or {}), "is_public_content_hub": True, "seed_batch": SEED_BATCH}
            hub.save(update_fields=["metadata", "updated_at"])

        if (target_institute.metadata or {}).get("is_public_content_hub") and target_institute.code != hub.code:
            metadata = {**(target_institute.metadata or {})}
            metadata.pop("is_public_content_hub", None)
            target_institute.metadata = metadata
            target_institute.save(update_fields=["metadata", "updated_at"])

        return hub

    def _resolve_donor_questions(
        self,
        *,
        donor_institute,
        subject_code,
        question_count,
        source_type=None,
        include_private=False,
    ):
        donor_question_queryset = MasterQuestion.objects.filter(
            source_institute=donor_institute,
            source_subject__code=subject_code,
            is_active=True,
        )
        if source_type:
            donor_question_queryset = donor_question_queryset.filter(source_type=source_type)
        if not include_private:
            donor_question_queryset = donor_question_queryset.exclude(visibility=MasterQuestionVisibility.PRIVATE)

        donor_questions = list(
            donor_question_queryset
            .select_related("source_program", "source_subject", "source_topic")
            .prefetch_related("options")
            .order_by("-created_at")[:question_count]
        )
        if not donor_questions:
            raise CommandError(
                f"No eligible donor master questions were found in {donor_institute.code} for subject {subject_code}."
            )
        if donor_questions[0].source_program is None or donor_questions[0].source_subject is None:
            raise CommandError("Donor questions must have source program and source subject set.")
        return donor_questions

    def _resolve_donor_questions_with_fallback(
        self,
        *,
        donor_institute,
        subject_code,
        question_count,
        fallback_subject_code=None,
        source_type=None,
        include_private=False,
    ):
        try:
            return self._resolve_donor_questions(
                donor_institute=donor_institute,
                subject_code=subject_code,
                question_count=question_count,
                source_type=source_type,
                include_private=include_private,
            )
        except CommandError:
            normalized_fallback = str(fallback_subject_code or "").strip()
            if not normalized_fallback or normalized_fallback == subject_code:
                raise
            return self._resolve_donor_questions(
                donor_institute=donor_institute,
                subject_code=normalized_fallback,
                question_count=question_count,
                source_type=source_type,
                include_private=include_private,
            )

    def _cleanup_legacy_demo_packages(self, *, public_hub, canonical_package_codes):
        normalized_codes = [str(code or "").strip().upper() for code in canonical_package_codes if str(code or "").strip()]
        if not normalized_codes:
            return

        legacy_packages = list(
            QuestionBankPackage.objects.filter(code__in=normalized_codes)
            .exclude(institute=public_hub)
            .select_related("institute")
        )
        if not legacy_packages:
            return

        legacy_package_ids = [package.id for package in legacy_packages]
        legacy_labels = [f"{package.code}@{package.institute.code}" for package in legacy_packages]

        QuestionBankPackageScope.objects.filter(package_id__in=legacy_package_ids).delete()
        QuestionBankPackage.objects.filter(id__in=legacy_package_ids).delete()

        self.stdout.write(
            self.style.WARNING(
                "Removed legacy non-canonical demo package rows: " + ", ".join(sorted(legacy_labels))
            )
        )

    def _upsert_program(self, *, public_hub, donor_program):
        program, _ = Program.objects.update_or_create(
            institute=public_hub,
            code=donor_program.code,
            defaults={
                "assessment_family": donor_program.assessment_family,
                "name": donor_program.name,
                "category": donor_program.category,
                "description": donor_program.description,
                "sort_order": donor_program.sort_order,
                "is_active": True,
            },
        )
        return program

    def _upsert_subject(self, *, public_hub, hub_program, donor_subject):
        subject, _ = Subject.objects.update_or_create(
            institute=public_hub,
            code=donor_subject.code,
            defaults={
                "program": hub_program,
                "name": donor_subject.name,
                "description": donor_subject.description,
                "sort_order": donor_subject.sort_order,
                "is_active": True,
            },
        )
        return subject

    def _upsert_topic(self, *, public_hub, hub_subject, donor_topic):
        if donor_topic is None:
            return None
        topic, _ = Topic.objects.update_or_create(
            institute=public_hub,
            subject=hub_subject,
            code=donor_topic.code,
            defaults={
                "parent_topic": None,
                "name": donor_topic.name,
                "description": donor_topic.description,
                "difficulty_level": donor_topic.difficulty_level,
                "sort_order": donor_topic.sort_order,
                "is_active": True,
            },
        )
        return topic

    def _upsert_master_question(
        self,
        *,
        public_hub,
        hub_program,
        hub_subject,
        hub_topic,
        donor_question,
        question_text_prefix,
        seed_lane,
        override_visibility=None,
    ):
        metadata = {
            **(donor_question.metadata if isinstance(donor_question.metadata, dict) else {}),
            "seed_batch": SEED_BATCH,
            "seed_lane": seed_lane,
            "seed_origin_master_question_id": str(donor_question.id),
        }
        master_question, _ = MasterQuestion.objects.update_or_create(
            source_institute=public_hub,
            metadata__seed_batch=SEED_BATCH,
            metadata__seed_lane=seed_lane,
            metadata__seed_origin_master_question_id=str(donor_question.id),
            defaults={
                "source_program": hub_program,
                "source_subject": hub_subject,
                "source_topic": hub_topic,
                "created_by_teacher": None,
                "question_type": donor_question.question_type,
                "difficulty_level": donor_question.difficulty_level,
                "content_format": donor_question.content_format,
                "question_text": f"{question_text_prefix}{donor_question.question_text}",
                "explanation": donor_question.explanation,
                "default_marks": donor_question.default_marks,
                "negative_marks": donor_question.negative_marks,
                "is_verified": donor_question.is_verified,
                "source_type": MasterQuestionSourceType.PLATFORM,
                "visibility": override_visibility or donor_question.visibility,
                "metadata": metadata,
                "is_active": True,
            },
        )
        master_question.options.all().delete()
        MasterQuestionOption.objects.bulk_create(
            [
                MasterQuestionOption(
                    master_question=master_question,
                    content_format=option.content_format,
                    option_text=option.option_text,
                    option_order=option.option_order,
                    is_correct=option.is_correct,
                    is_active=option.is_active,
                )
                for option in donor_question.options.all().order_by("option_order")
            ]
        )
        return master_question

    def _seed_unentitled_demo_lane(
        self,
        *,
        donor_institute,
        public_hub,
        subject_code,
        question_count,
        fallback_subject_code=None,
    ):
        if not subject_code or question_count <= 0:
            return []

        donor_questions = self._resolve_donor_questions_with_fallback(
            donor_institute=donor_institute,
            subject_code=subject_code,
            question_count=question_count,
            include_private=True,
            fallback_subject_code=fallback_subject_code,
        )
        donor_subject = donor_questions[0].source_subject
        donor_program = donor_questions[0].source_program
        if donor_program is None or donor_subject is None:
            raise CommandError("Unentitled donor questions must have source program and subject.")

        hub_program = self._upsert_program(public_hub=public_hub, donor_program=donor_program)
        hub_subject = self._upsert_subject(
            public_hub=public_hub,
            hub_program=hub_program,
            donor_subject=donor_subject,
        )

        unentitled_questions = []
        for donor_question in donor_questions:
            hub_topic = self._upsert_topic(
                public_hub=public_hub,
                hub_subject=hub_subject,
                donor_topic=donor_question.source_topic,
            )
            unentitled_questions.append(
                self._upsert_master_question(
                    public_hub=public_hub,
                    hub_program=hub_program,
                    hub_subject=hub_subject,
                    hub_topic=hub_topic,
                    donor_question=donor_question,
                    question_text_prefix="UNENTITLED DEMO :: ",
                    seed_lane="unentitled",
                    override_visibility=MasterQuestionVisibility.SHARED_BY_REQUEST,
                )
            )
        return unentitled_questions

    def _seed_quota_exhausted_demo_lane(
        self,
        *,
        donor_institute,
        target_institute,
        public_hub,
        subject_code,
        question_count,
        package_code,
        package_name,
        fallback_subject_code=None,
    ):
        if not subject_code or question_count <= 0:
            return {"questions": [], "package": self._resolve_existing_package(public_hub, package_code)}
        if question_count < 2:
            raise CommandError("--quota-demo-question-count must be at least 2.")

        donor_questions = self._resolve_donor_questions_with_fallback(
            donor_institute=donor_institute,
            subject_code=subject_code,
            question_count=question_count,
            include_private=True,
            fallback_subject_code=fallback_subject_code,
        )
        donor_subject = donor_questions[0].source_subject
        donor_program = donor_questions[0].source_program
        if donor_program is None or donor_subject is None:
            raise CommandError("Quota demo donor questions must have source program and subject.")

        hub_program = self._upsert_program(public_hub=public_hub, donor_program=donor_program)
        hub_subject = self._upsert_subject(
            public_hub=public_hub,
            hub_program=hub_program,
            donor_subject=donor_subject,
        )

        quota_questions = []
        for donor_question in donor_questions:
            hub_topic = self._upsert_topic(
                public_hub=public_hub,
                hub_subject=hub_subject,
                donor_topic=donor_question.source_topic,
            )
            quota_questions.append(
                self._upsert_master_question(
                    public_hub=public_hub,
                    hub_program=hub_program,
                    hub_subject=hub_subject,
                    hub_topic=hub_topic,
                    donor_question=donor_question,
                    question_text_prefix="QUOTA LOCK DEMO :: ",
                    seed_lane="quota_exhausted",
                    override_visibility=MasterQuestionVisibility.SHARED_BY_REQUEST,
                )
            )

        package = self._upsert_package(
            public_hub=public_hub,
            hub_program=hub_program,
            hub_subject=hub_subject,
            package_code=package_code,
            package_name=package_name,
            access_mode=QuestionBankAccessMode.QUOTA_LIMITED,
            description="Demo package seeded for Playwright shared-library quota exhausted coverage.",
            sort_order=11,
        )
        self._upsert_scope(
            public_hub=public_hub,
            package=package,
            hub_program=hub_program,
            hub_subject=hub_subject,
            max_questions_total=1,
            metadata={"master_question_seed_lanes": ["quota_exhausted"]},
        )
        self._reset_quota_demo_usage(
            public_hub=public_hub,
            target_institute=target_institute,
            package=package,
            quota_questions=quota_questions,
        )
        grant_institute_question_bank_entitlement(
            institute=target_institute,
            question_bank_package=package,
            notes="Seeded quota-exhausted shared-library demo coverage.",
        )

        first_master_question = quota_questions[0]
        local_program, local_subject, local_topic = self._resolve_target_local_scope(
            target_institute=target_institute,
            donor_program=donor_program,
            donor_subject=donor_subject,
            donor_topic=donor_questions[0].source_topic,
        )
        link_master_question_to_institute(
            master_question=first_master_question,
            institute=target_institute,
            local_program=local_program,
            local_subject=local_subject,
            local_topic=local_topic,
            notes="Seeded quota-exhausted shared-library coverage.",
        )
        return {"questions": quota_questions, "package": package}

    def _seed_blocked_matchable_demo_lane(
        self,
        *,
        donor_institute,
        target_institute,
        public_hub,
        subject_code,
        question_count,
        package_code,
        package_name,
        fallback_subject_code=None,
    ):
        if not subject_code or question_count <= 0:
            return {"questions": [], "package": self._resolve_existing_package(public_hub, package_code)}

        donor_questions = self._resolve_donor_questions_with_fallback(
            donor_institute=donor_institute,
            subject_code=subject_code,
            question_count=question_count,
            include_private=True,
            fallback_subject_code=fallback_subject_code,
        )
        donor_subject = donor_questions[0].source_subject
        donor_program = donor_questions[0].source_program
        if donor_program is None or donor_subject is None:
            raise CommandError("Blocked-matchable donor questions must have source program and subject.")

        hub_program = self._upsert_program(public_hub=public_hub, donor_program=donor_program)
        hub_subject = self._upsert_subject(
            public_hub=public_hub,
            hub_program=hub_program,
            donor_subject=donor_subject,
        )

        blocked_questions = []
        for donor_question in donor_questions:
            hub_topic = self._upsert_topic(
                public_hub=public_hub,
                hub_subject=hub_subject,
                donor_topic=donor_question.source_topic,
            )
            blocked_questions.append(
                self._upsert_master_question(
                    public_hub=public_hub,
                    hub_program=hub_program,
                    hub_subject=hub_subject,
                    hub_topic=hub_topic,
                    donor_question=donor_question,
                    question_text_prefix=BLOCKED_MATCHABLE_PREFIX,
                    seed_lane="blocked_matchable",
                    override_visibility=MasterQuestionVisibility.SHARED_BY_REQUEST,
                )
            )

        package = self._upsert_package(
            public_hub=public_hub,
            hub_program=hub_program,
            hub_subject=hub_subject,
            package_code=package_code,
            package_name=package_name,
            description="Demo package seeded for blocked-but-matchable shared-library workflow coverage.",
            sort_order=12,
        )
        self._upsert_scope(
            public_hub=public_hub,
            package=package,
            hub_program=hub_program,
            hub_subject=hub_subject,
            metadata={"master_question_seed_lanes": ["blocked_matchable"]},
        )
        self._reset_shared_library_demo_access(
            target_institute=target_institute,
            master_questions=blocked_questions,
        )
        InstituteQuestionEntitlement.objects.filter(
            institute=target_institute,
            question_bank_package=package,
        ).delete()
        return {"questions": blocked_questions, "package": package}

    def _seed_paused_only_demo_lane(
        self,
        *,
        donor_institute,
        target_institute,
        public_hub,
        subject_code,
        question_count,
        package_code,
        package_name,
        fallback_subject_code=None,
    ):
        if not subject_code or question_count <= 0:
            return {"questions": [], "package": self._resolve_existing_package(public_hub, package_code)}

        donor_questions = self._resolve_donor_questions_with_fallback(
            donor_institute=donor_institute,
            subject_code=subject_code,
            question_count=question_count,
            include_private=True,
            fallback_subject_code=fallback_subject_code,
        )
        donor_subject = donor_questions[0].source_subject
        donor_program = donor_questions[0].source_program
        if donor_program is None or donor_subject is None:
            raise CommandError("Paused-only donor questions must have source program and subject.")

        hub_program = self._upsert_program(public_hub=public_hub, donor_program=donor_program)
        hub_subject = self._upsert_subject(
            public_hub=public_hub,
            hub_program=hub_program,
            donor_subject=donor_subject,
        )

        paused_questions = []
        for donor_question in donor_questions:
            hub_topic = self._upsert_topic(
                public_hub=public_hub,
                hub_subject=hub_subject,
                donor_topic=donor_question.source_topic,
            )
            paused_questions.append(
                self._upsert_master_question(
                    public_hub=public_hub,
                    hub_program=hub_program,
                    hub_subject=hub_subject,
                    hub_topic=hub_topic,
                    donor_question=donor_question,
                    question_text_prefix=PAUSED_ONLY_PREFIX,
                    seed_lane="paused_only",
                    override_visibility=MasterQuestionVisibility.SHARED_BY_REQUEST,
                )
            )

        package = self._upsert_package(
            public_hub=public_hub,
            hub_program=hub_program,
            hub_subject=hub_subject,
            package_code=package_code,
            package_name=package_name,
            description="Demo package seeded for paused-only shared-library workflow coverage.",
            sort_order=13,
        )
        self._upsert_scope(
            public_hub=public_hub,
            package=package,
            hub_program=hub_program,
            hub_subject=hub_subject,
            max_questions_total=1,
            metadata={"master_question_seed_lanes": ["paused_only"]},
        )
        self._reset_shared_library_demo_access(
            target_institute=target_institute,
            master_questions=paused_questions,
        )
        InstituteQuestionEntitlement.objects.filter(
            institute=target_institute,
            question_bank_package=package,
        ).delete()
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=target_institute,
            question_bank_package=package,
            notes="Seeded paused-only shared-library demo coverage.",
        )

        first_master_question = paused_questions[0]
        local_program, local_subject, local_topic = self._resolve_target_local_scope(
            target_institute=target_institute,
            donor_program=donor_program,
            donor_subject=donor_subject,
            donor_topic=donor_questions[0].source_topic,
        )
        link_master_question_to_institute(
            master_question=first_master_question,
            institute=target_institute,
            local_program=local_program,
            local_subject=local_subject,
            local_topic=local_topic,
            notes="Seeded paused-only shared-library coverage.",
        )
        return {"questions": paused_questions, "package": package, "entitlement": entitlement}

    def _reset_quota_demo_usage(self, *, public_hub, target_institute, package, quota_questions):
        quota_master_ids = list(
            MasterQuestion.objects.filter(
                source_institute=public_hub,
                question_text__startswith="QUOTA LOCK DEMO :: ",
                is_active=True,
            ).values_list("id", flat=True)
        )
        quota_master_ids.extend(
            question.id for question in quota_questions if question.id and question.id not in quota_master_ids
        )
        if not quota_master_ids:
            return

        existing_access_rows = list(
            InstituteQuestionAccess.objects.filter(
                institute=target_institute,
                master_question_id__in=quota_master_ids,
                is_active=True,
            ).select_related("linked_question")
        )
        linked_question_ids = [
            access.linked_question_id for access in existing_access_rows if access.linked_question_id
        ]

        InstituteQuestionUsageLedger.objects.filter(
            institute=target_institute,
            action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
            master_question_id__in=quota_master_ids,
            is_active=True,
        ).delete()

        if linked_question_ids:
            Question.objects.filter(
                institute=target_institute,
                id__in=linked_question_ids,
                is_active=True,
            ).delete()

        if existing_access_rows:
            InstituteQuestionAccess.objects.filter(
                id__in=[access.id for access in existing_access_rows],
            ).delete()

    def _reset_shared_library_demo_access(self, *, target_institute, master_questions):
        master_question_ids = [question.id for question in master_questions if question.id]
        if not master_question_ids:
            return

        existing_access_rows = list(
            InstituteQuestionAccess.objects.filter(
                institute=target_institute,
                master_question_id__in=master_question_ids,
                is_active=True,
            ).select_related("linked_question")
        )
        linked_question_ids = [
            access.linked_question_id for access in existing_access_rows if access.linked_question_id
        ]

        InstituteQuestionUsageLedger.objects.filter(
            institute=target_institute,
            action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
            master_question_id__in=master_question_ids,
            is_active=True,
        ).delete()

        if linked_question_ids:
            Question.objects.filter(
                institute=target_institute,
                id__in=linked_question_ids,
                is_active=True,
            ).delete()

        if existing_access_rows:
            InstituteQuestionAccess.objects.filter(
                id__in=[access.id for access in existing_access_rows],
            ).delete()

    def _resolve_existing_package(self, public_hub, package_code):
        if not package_code:
            return None
        return QuestionBankPackage.objects.filter(institute=public_hub, code=package_code).first()

    def _resolve_target_local_scope(self, *, target_institute, donor_program, donor_subject, donor_topic):
        local_program = Program.objects.filter(
            institute=target_institute,
            code=donor_program.code,
            is_active=True,
        ).first()
        if local_program is None:
            raise CommandError(
                f"Target institute {target_institute.code} is missing program {donor_program.code} for quota demo link."
            )

        local_subject = Subject.objects.filter(
            institute=target_institute,
            program=local_program,
            code=donor_subject.code,
            is_active=True,
        ).first()
        if local_subject is None:
            raise CommandError(
                f"Target institute {target_institute.code} is missing subject {donor_subject.code} for quota demo link."
            )

        local_topic = None
        if donor_topic is not None:
            local_topic = Topic.objects.filter(
                institute=target_institute,
                subject=local_subject,
                code=donor_topic.code,
                is_active=True,
            ).first()
            if local_topic is None:
                raise CommandError(
                    f"Target institute {target_institute.code} is missing topic {donor_topic.code} for quota demo link."
                )

        return local_program, local_subject, local_topic

    def _upsert_package(
        self,
        *,
        public_hub,
        hub_program,
        hub_subject,
        package_code,
        package_name,
        access_mode=QuestionBankAccessMode.FULL_SCOPE,
        description="Demo package seeded for Playwright shared-library request/link coverage.",
        sort_order=10,
    ):
        package, _ = QuestionBankPackage.objects.update_or_create(
            institute=public_hub,
            code=package_code,
            defaults={
                "name": package_name,
                "description": description,
                "package_type": QuestionBankPackageType.SUBJECT_LIBRARY,
                "ownership_type": QuestionBankOwnershipType.PLATFORM,
                "access_mode": access_mode,
                "is_public_catalog": True,
                "sort_order": sort_order,
                "metadata": {
                    "seed_batch": SEED_BATCH,
                    "program_code": hub_program.code,
                    "subject_code": hub_subject.code,
                },
                "is_active": True,
            },
        )
        return package

    def _upsert_scope(
        self,
        *,
        public_hub,
        package,
        hub_program,
        hub_subject,
        max_questions_total=None,
        max_questions_per_topic=None,
        metadata=None,
    ):
        scope, _ = QuestionBankPackageScope.objects.update_or_create(
            institute=public_hub,
            package=package,
            program=hub_program,
            subject=hub_subject,
            topic=None,
            difficulty_level="",
            question_type="",
            master_visibility=MasterQuestionVisibility.SHARED_BY_REQUEST,
            defaults={
                "question_source_type": "platform_only",
                "max_questions_total": max_questions_total,
                "max_questions_per_topic": max_questions_per_topic,
                "metadata": {"seed_batch": SEED_BATCH, **(metadata or {})},
                "is_active": True,
            },
        )
        return scope
