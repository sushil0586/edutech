import csv
import io
import re
import secrets
from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.academics.models import AcademicYear, Cohort, Program
from apps.accounts.models import (
    AccountAcquisition,
    AccountLocation,
    AccountProfile,
    AccountRole,
    OnboardingStatus,
)
from apps.geography.services import build_location_catalog, has_active_geography_data
from apps.institutes.models import Institute
from apps.parents.models import ParentProfile
from apps.students.models import StudentProfile
from apps.teachers.models import TeacherProfile


User = get_user_model()

STUDENT_IMPORT_TEMPLATE_COLUMNS = [
    "admission_no",
    "first_name",
    "last_name",
    "gender",
    "academic_year",
    "program",
    "cohort",
    "email",
    "phone",
    "guardian_name",
    "guardian_phone",
    "address",
    "joined_at",
    "is_active",
    "create_login",
    "username",
    "password",
]

TEACHER_IMPORT_TEMPLATE_COLUMNS = [
    "employee_code",
    "first_name",
    "last_name",
    "email",
    "phone",
    "qualification",
    "specialization",
    "bio",
    "joined_at",
    "is_active",
    "create_login",
    "username",
    "password",
]


def _normalize_username_seed(value, fallback):
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "", (value or "").strip().lower())
    return cleaned or fallback


def build_unique_username(seed):
    base = _normalize_username_seed(seed, "nexora-user")
    candidate = base
    suffix = 1
    while User.objects.filter(username=candidate).exists():
        suffix += 1
        candidate = f"{base}{suffix}"
    return candidate


def build_unique_code(model, field_name, seed, prefix):
    base = _normalize_username_seed(seed, prefix)
    if not base.startswith(prefix):
        base = f"{prefix}-{base}" if base else prefix
    candidate = base[:50]
    suffix = 1
    while model.objects.filter(**{field_name: candidate}).exists():
        suffix += 1
        candidate = f"{base}-{suffix}"[:50]
    return candidate


def generate_temporary_password(length=12):
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"
    password = "".join(secrets.choice(alphabet) for _ in range(length))
    validate_password(password)
    return password


def validate_confirmed_password(password, confirm_password, *, user=None):
    if password != confirm_password:
        raise ValidationError({"confirm_password": ["Passwords do not match."]})
    validate_password(password, user=user)


PUBLIC_REGISTRATION_INSTITUTE_CODE = "NEXORA-PUBLIC"
PUBLIC_REGISTRATION_INSTITUTE_NAME = "Nexora Public Learning"
PUBLIC_REGISTRATION_YEAR_NAME = "Public Journey"
PUBLIC_REGISTRATION_PROGRAM_CODE = "PUBLIC-LEARN"
PUBLIC_REGISTRATION_DEFAULT_CATALOG = {
    "class_levels": [str(level) for level in range(1, 13)],
    "boards": ["CBSE", "ICSE", "State Board", "IB", "IGCSE"],
    "student_exam_interests": [
        "Olympiad",
        "NSTSE",
        "School exams",
        "Board prep",
        "Mental aptitude",
    ],
    "teacher_focus_options": [
        "School classes",
        "Competitive exams",
        "Board preparation",
        "Mixed cohorts",
    ],
    "parent_focus_options": [
        "Readiness",
        "Weak subjects",
        "Recent outcomes",
        "Attendance and activity",
        "Milestones and alerts",
    ],
    "subject_catalog": {
        "foundation": ["Math", "Science", "Computer", "GK", "Mental aptitude"],
        "middleSchool": ["Math", "Science", "Computer", "SST", "GK", "Mental aptitude"],
        "board": ["Math", "Science", "SST", "English", "Hindi", "Computer"],
        "senior": ["Math", "Physics", "Chemistry", "Biology", "English", "Computer"],
    },
    "location_catalog": [],
}


@transaction.atomic
def get_or_create_public_registration_institute():
    institute, _ = Institute.objects.get_or_create(
        code=PUBLIC_REGISTRATION_INSTITUTE_CODE,
        defaults={
            "name": PUBLIC_REGISTRATION_INSTITUTE_NAME,
            "email": "hello@nexora.public",
            "description": "Public registration tenant for self-serve student, parent, and teacher onboarding.",
            "metadata": {
                "is_public_registration": True,
                "is_demo": True,
                "registration_catalog": PUBLIC_REGISTRATION_DEFAULT_CATALOG,
            },
            "is_active": True,
        },
    )
    if institute.name != PUBLIC_REGISTRATION_INSTITUTE_NAME:
        institute.name = PUBLIC_REGISTRATION_INSTITUTE_NAME
        institute.metadata = {
            **(institute.metadata or {}),
            "is_public_registration": True,
            "is_demo": True,
            "registration_catalog": {
                **PUBLIC_REGISTRATION_DEFAULT_CATALOG,
                **(institute.metadata or {}).get("registration_catalog", {}),
            },
        }
        institute.save(update_fields=["name", "metadata", "updated_at"])
    return institute


def get_public_registration_catalog():
    institute = get_or_create_public_registration_institute()
    catalog = (institute.metadata or {}).get("registration_catalog", {})
    merged_catalog = {
        **PUBLIC_REGISTRATION_DEFAULT_CATALOG,
        **catalog,
    }
    merged_catalog["subject_catalog"] = {
        **PUBLIC_REGISTRATION_DEFAULT_CATALOG["subject_catalog"],
        **catalog.get("subject_catalog", {}),
    }
    merged_catalog["location_catalog"] = build_location_catalog() if has_active_geography_data() else []
    return {
        "schools": [
            {
                "id": str(item.id),
                "name": item.name,
                "code": item.code,
            }
            for item in Institute.objects.filter(is_active=True)
            .exclude(code=PUBLIC_REGISTRATION_INSTITUTE_CODE)
            .order_by("name")
        ],
        "class_levels": merged_catalog["class_levels"],
        "boards": merged_catalog["boards"],
        "student_exam_interests": merged_catalog["student_exam_interests"],
        "teacher_focus_options": merged_catalog["teacher_focus_options"],
        "parent_focus_options": merged_catalog["parent_focus_options"],
        "subject_catalog": merged_catalog["subject_catalog"],
        "location_catalog": merged_catalog["location_catalog"],
    }


def get_public_registration_options():
    public_institute = get_or_create_public_registration_institute()
    catalog = get_public_registration_catalog()
    exam_catalog = {
        "foundation": list(catalog["student_exam_interests"]),
        "middleSchool": list(catalog["student_exam_interests"]),
        "board": list(catalog["student_exam_interests"]),
        "senior": list(catalog["student_exam_interests"]),
    }
    return {
        "public_institute": {
            "id": str(public_institute.id),
            "name": public_institute.name,
            "code": public_institute.code,
        },
        **catalog,
        "exam_catalog": exam_catalog,
    }


def _resolve_public_registration_institute(validated_data):
    school_code = (validated_data.get("school_code") or "").strip()
    school_name = (validated_data.get("school_name") or "").strip()

    institute = None
    if school_code:
        institute = Institute.objects.filter(code__iexact=school_code).first()
    if institute is None and school_name:
        institute = Institute.objects.filter(name__iexact=school_name).first()
    if institute is None:
        institute = get_or_create_public_registration_institute()

    return institute


@transaction.atomic
def get_or_create_public_registration_academic_year(institute):
    start_date = date.today().replace(month=1, day=1)
    end_date = date.today().replace(month=12, day=31)

    current_year = (
        AcademicYear.objects.filter(institute=institute, is_current=True)
        .order_by("-start_date", "-created_at")
        .first()
    )
    if current_year is not None:
        updates = []
        if not current_year.is_active:
            current_year.is_active = True
            updates.append("is_active")
        if not current_year.name:
            current_year.name = PUBLIC_REGISTRATION_YEAR_NAME
            updates.append("name")
        if updates:
            current_year.save(update_fields=[*updates, "updated_at"])
        return current_year

    overlapping_year = (
        AcademicYear.objects.filter(
            institute=institute,
            start_date__lte=end_date,
            end_date__gte=start_date,
        )
        .order_by("-start_date", "-created_at")
        .first()
    )
    if overlapping_year is not None:
        overlapping_year.is_current = True
        if not overlapping_year.is_active:
            overlapping_year.is_active = True
            overlapping_year.save(update_fields=["is_current", "is_active", "updated_at"])
        else:
            overlapping_year.save(update_fields=["is_current", "updated_at"])
        return overlapping_year

    academic_year, _ = AcademicYear.objects.get_or_create(
        institute=institute,
        name=PUBLIC_REGISTRATION_YEAR_NAME,
        defaults={
            "start_date": start_date,
            "end_date": end_date,
            "is_current": True,
            "is_active": True,
        },
    )
    if not academic_year.is_current or not academic_year.is_active:
        academic_year.is_current = True
        academic_year.is_active = True
        academic_year.save(update_fields=["is_current", "is_active", "updated_at"])
    return academic_year


@transaction.atomic
def get_or_create_public_registration_program(institute, *, class_level, board):
    normalized_board = _normalize_username_seed(board, "board").replace("-", "")
    normalized_class = _normalize_username_seed(class_level, "class").replace("-", "")
    code = f"public-{normalized_class}-{normalized_board}"
    program, _ = Program.objects.get_or_create(
        institute=institute,
        code=code[:50],
        defaults={
            "name": f"Class {class_level} {board}",
            "category": "public-registration",
            "description": "Public learner lane created from self-registration.",
            "sort_order": int(re.sub(r"[^0-9]", "", str(class_level)) or 0) or 1,
            "is_active": True,
        },
    )
    if program.name != f"Class {class_level} {board}":
        program.name = f"Class {class_level} {board}"
        program.category = "public-registration"
        program.description = "Public learner lane created from self-registration."
        program.save(update_fields=["name", "category", "description", "updated_at"])
    return program


def _build_registration_context(role, *, class_level=None, board=None, exam_interest=None,
                                subject_interests=None, child_class_level=None,
                                child_board=None, parent_focus=None, teaching_focus=None,
                                teaching_scope=None, school_name=None, school_code=None,
                                referral_code=None, country=None, state=None, city=None,
                                pincode=None, timezone_name=None, phone=None):
    context = {"role": role}
    if class_level:
        context["class_level"] = class_level
    if board:
        context["board"] = board
    if exam_interest:
        context["exam_interest"] = exam_interest
    if subject_interests:
        context["subject_interests"] = subject_interests
    if child_class_level:
        context["child_class_level"] = child_class_level
    if child_board:
        context["child_board"] = child_board
    if parent_focus:
        context["parent_focus"] = parent_focus
    if teaching_focus:
        context["teaching_focus"] = teaching_focus
    if teaching_scope:
        context["teaching_scope"] = teaching_scope
    if school_name:
        context["school_name"] = school_name
    if school_code:
        context["school_code"] = school_code
    if referral_code:
        context["referral_code"] = referral_code
    if phone:
        context["phone"] = phone
    if country:
        context["country"] = country
    if state:
        context["state"] = state
    if city:
        context["city"] = city
    if pincode:
        context["pincode"] = pincode
    if timezone_name:
        context["timezone"] = timezone_name
    return context


def upsert_account_location(
    account_profile,
    *,
    detected_country="",
    detected_state="",
    detected_city="",
    detected_pincode="",
    detected_timezone="",
    detection_source="",
    confirmed_country="",
    confirmed_state="",
    confirmed_city="",
    confirmed_pincode="",
    confirmed_timezone="",
):
    location_profile, _ = AccountLocation.objects.get_or_create(account_profile=account_profile)
    now = timezone.now()

    detected_updates = {
        "detected_country": (detected_country or "").strip(),
        "detected_state": (detected_state or "").strip(),
        "detected_city": (detected_city or "").strip(),
        "detected_pincode": (detected_pincode or "").strip(),
        "detected_timezone": (detected_timezone or "").strip(),
        "detection_source": (detection_source or "").strip(),
    }
    if any(detected_updates.values()):
        for field, value in detected_updates.items():
            if value:
                setattr(location_profile, field, value)
        location_profile.detected_at = now

    confirmed_updates = {
        "confirmed_country": (confirmed_country or "").strip(),
        "confirmed_state": (confirmed_state or "").strip(),
        "confirmed_city": (confirmed_city or "").strip(),
        "confirmed_pincode": (confirmed_pincode or "").strip(),
        "confirmed_timezone": (confirmed_timezone or "").strip(),
    }
    if any(confirmed_updates.values()):
        for field, value in confirmed_updates.items():
            if value:
                setattr(location_profile, field, value)
        location_profile.confirmed_at = now

    location_profile.save()
    return location_profile


def upsert_account_acquisition(
    account_profile,
    *,
    signup_source="",
    landing_variant="",
    platform="",
    device_category="",
    app_version="",
    browser_family="",
    utm_source="",
    utm_medium="",
    utm_campaign="",
    utm_term="",
    utm_content="",
    referral_channel="",
    referral_identifier="",
    invite_code="",
    school_name_text="",
    school_normalization_status="",
    metadata=None,
):
    acquisition_profile, _ = AccountAcquisition.objects.get_or_create(account_profile=account_profile)
    updates = {
        "signup_source": signup_source,
        "landing_variant": landing_variant,
        "platform": platform,
        "device_category": device_category,
        "app_version": app_version,
        "browser_family": browser_family,
        "utm_source": utm_source,
        "utm_medium": utm_medium,
        "utm_campaign": utm_campaign,
        "utm_term": utm_term,
        "utm_content": utm_content,
        "referral_channel": referral_channel,
        "referral_identifier": referral_identifier,
        "invite_code": invite_code,
        "school_name_text": school_name_text,
        "school_normalization_status": school_normalization_status,
    }

    for field, value in updates.items():
        normalized = (value or "").strip()
        if normalized:
            setattr(acquisition_profile, field, normalized)

    if metadata:
        current_metadata = dict(acquisition_profile.metadata or {})
        current_metadata.update(metadata)
        acquisition_profile.metadata = current_metadata

    acquisition_profile.save()
    return acquisition_profile


@transaction.atomic
def create_public_registration_account(validated_data):
    role = validated_data["role"]
    email = validated_data["email"]
    first_name = validated_data["first_name"].strip()
    last_name = validated_data.get("last_name", "").strip()
    phone = validated_data.get("phone", "").strip()
    password = validated_data["password"]

    institute = _resolve_public_registration_institute(validated_data)
    selected_school_name = validated_data.get("school_name", "").strip() or institute.name
    selected_school_code = institute.code
    username = email
    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
        is_active=True,
        first_name=first_name,
        last_name=last_name,
    )

    registration_context = _build_registration_context(
        role,
        class_level=validated_data.get("class_level", "").strip(),
        board=validated_data.get("board", "").strip(),
        exam_interest=validated_data.get("exam_interest", "").strip(),
        subject_interests=validated_data.get("subject_interests", []),
        child_class_level=validated_data.get("child_class_level", "").strip(),
        child_board=validated_data.get("child_board", "").strip(),
        parent_focus=validated_data.get("parent_focus", "").strip(),
        teaching_focus=validated_data.get("teaching_focus", "").strip(),
        teaching_scope=validated_data.get("teaching_scope", []),
        school_name=selected_school_name,
        school_code=selected_school_code,
        referral_code=validated_data.get("referral_code", "").strip(),
        phone=phone,
    )

    account_profile = AccountProfile.objects.create(
        user=user,
        role=role,
        institute=institute,
        registration_context=registration_context,
        onboarding_status=OnboardingStatus.NOT_STARTED,
        profile_completion_required=True,
        onboarding_role=role,
        onboarding_version="v1_public_quick_signup",
        is_active=True,
    )

    referral_code = (validated_data.get("referral_code") or "").strip()
    upsert_account_location(
        account_profile,
        detected_country=validated_data.get("detected_country", ""),
        detected_state=validated_data.get("detected_state", ""),
        detected_city=validated_data.get("detected_city", ""),
        detected_pincode=validated_data.get("detected_pincode", ""),
        detected_timezone=validated_data.get("detected_timezone", ""),
        detection_source=validated_data.get("detection_source", ""),
    )
    upsert_account_acquisition(
        account_profile,
        signup_source=validated_data.get("signup_source", ""),
        landing_variant=validated_data.get("landing_variant", ""),
        platform=validated_data.get("platform", ""),
        device_category=validated_data.get("device_category", ""),
        app_version=validated_data.get("app_version", ""),
        browser_family=validated_data.get("browser_family", ""),
        utm_source=validated_data.get("utm_source", ""),
        utm_medium=validated_data.get("utm_medium", ""),
        utm_campaign=validated_data.get("utm_campaign", ""),
        utm_term=validated_data.get("utm_term", ""),
        utm_content=validated_data.get("utm_content", ""),
        referral_channel="code" if referral_code else "",
        referral_identifier=referral_code,
        invite_code=validated_data.get("invite_code", ""),
        school_name_text=selected_school_name,
        school_normalization_status="matched_existing"
        if institute.code != PUBLIC_REGISTRATION_INSTITUTE_CODE
        else "public_default",
        metadata={
            "onboarding_role": role,
            "school_code": selected_school_code,
        },
    )

    return account_profile


def merge_registration_context(profile, **updates):
    context = dict(profile.registration_context or {})
    for key, value in updates.items():
        if isinstance(value, str):
            normalized = value.strip()
            if normalized:
                context[key] = normalized
        elif isinstance(value, list):
            cleaned = [str(item).strip() for item in value if str(item).strip()]
            if cleaned:
                context[key] = cleaned
        elif value:
            context[key] = value
    profile.registration_context = context
    return context


@transaction.atomic
@transaction.atomic
def complete_public_onboarding(account_profile, validated_data):
    role = account_profile.role
    user = account_profile.user

    school_code = (validated_data.get("school_code") or "").strip()
    school_name = (validated_data.get("school_name") or "").strip()
    if school_code and not school_name:
        school = Institute.objects.filter(code__iexact=school_code).first()
        if school:
            school_name = school.name
    if not school_code:
        school_code = account_profile.institute.code if account_profile.institute_id else ""
    if not school_name:
        school_name = account_profile.institute.name if account_profile.institute_id else ""

    confirmed_country = validated_data.get("country", "").strip()
    confirmed_state = validated_data.get("state", "").strip()
    confirmed_city = validated_data.get("city", "").strip()
    confirmed_pincode = validated_data.get("pincode", "").strip()
    confirmed_timezone = validated_data.get("timezone", "").strip()
    phone = (validated_data.get("phone") or "").strip() or (account_profile.registration_context or {}).get("phone", "")

    merge_registration_context(
        account_profile,
        school_code=school_code,
        school_name=school_name,
        country=confirmed_country,
        state=confirmed_state,
        city=confirmed_city,
        pincode=confirmed_pincode,
        timezone_name=confirmed_timezone,
        phone=phone,
    )
    upsert_account_location(
        account_profile,
        confirmed_country=confirmed_country,
        confirmed_state=confirmed_state,
        confirmed_city=confirmed_city,
        confirmed_pincode=confirmed_pincode,
        confirmed_timezone=confirmed_timezone,
    )
    upsert_account_acquisition(
        account_profile,
        school_name_text=school_name,
        school_normalization_status="confirmed_by_user",
        metadata={
            "completed_role": role,
            "completed_school_code": school_code,
        },
    )

    if role == AccountRole.STUDENT:
        from apps.economy.services import (
            apply_referral_code_for_student_signup,
            get_or_create_student_referral_code,
            process_signup_rewards,
        )

        class_level = validated_data["class_level"].strip()
        board = validated_data["board"].strip()
        exam_interest = validated_data["exam_interest"].strip()
        subject_interests = validated_data.get("subject_interests", [])
        academic_year = get_or_create_public_registration_academic_year(account_profile.institute)
        program = get_or_create_public_registration_program(
            account_profile.institute,
            class_level=class_level,
            board=board,
        )

        accommodation_profile = {
            "class_level": class_level,
            "board": board,
            "exam_interest": exam_interest,
            "subject_interests": subject_interests,
            "referral_code": (account_profile.registration_context or {}).get("referral_code", ""),
            "school_name": school_name,
            "school_code": school_code,
            "country": confirmed_country,
            "state": confirmed_state,
            "city": confirmed_city,
            "pincode": confirmed_pincode,
            "timezone": confirmed_timezone,
            "source": "public_registration",
        }

        if account_profile.student_profile_id:
            student_profile = account_profile.student_profile
            student_profile.academic_year = academic_year
            student_profile.program = program
            student_profile.first_name = user.first_name
            student_profile.last_name = user.last_name
            student_profile.email = user.email
            student_profile.phone = phone or student_profile.phone
            student_profile.accommodation_profile = accommodation_profile
            student_profile.save()
        else:
            admission_seed = f"{user.email}-{class_level}-{board}"
            student_profile = StudentProfile.objects.create(
                institute=account_profile.institute,
                academic_year=academic_year,
                program=program,
                cohort=None,
                admission_no=build_unique_code(StudentProfile, "admission_no", admission_seed, "stu"),
                first_name=user.first_name,
                last_name=user.last_name,
                email=user.email,
                phone=phone,
                accommodation_profile=accommodation_profile,
                is_active=True,
            )
            account_profile.student_profile = student_profile

        merge_registration_context(
            account_profile,
            class_level=class_level,
            board=board,
            exam_interest=exam_interest,
            subject_interests=subject_interests,
        )

        # Public student onboarding is the first point where the account has a real
        # student profile, institute context, and finalized academic placement.
        process_signup_rewards(
            student=student_profile,
            created_by=user,
        )

        referral_code = (account_profile.registration_context or {}).get("referral_code", "").strip()
        if referral_code:
            apply_referral_code_for_student_signup(
                student=student_profile,
                referral_code=referral_code,
                created_by=user,
                metadata={"trigger": "public_onboarding"},
            )

        get_or_create_student_referral_code(student=student_profile)

    elif role == AccountRole.TEACHER:
        teaching_focus = validated_data["teaching_focus"].strip()
        teaching_scope = validated_data.get("teaching_scope", [])
        if account_profile.teacher_profile_id:
            teacher_profile = account_profile.teacher_profile
            teacher_profile.first_name = user.first_name
            teacher_profile.last_name = user.last_name
            teacher_profile.email = user.email
            teacher_profile.phone = phone or teacher_profile.phone
            teacher_profile.specialization = teaching_focus
            teacher_profile.save()
        else:
            teacher_profile = TeacherProfile.objects.create(
                institute=account_profile.institute,
                employee_code=build_unique_code(TeacherProfile, "employee_code", user.email, "tch"),
                first_name=user.first_name,
                last_name=user.last_name,
                email=user.email,
                phone=phone,
                specialization=teaching_focus,
                bio="",
                is_active=True,
            )
            account_profile.teacher_profile = teacher_profile

        merge_registration_context(
            account_profile,
            teaching_focus=teaching_focus,
            teaching_scope=teaching_scope,
        )

    elif role == AccountRole.PARENT:
        child_class_level = validated_data["child_class_level"].strip()
        child_board = validated_data["child_board"].strip()
        parent_focus = (validated_data.get("parent_focus") or "").strip()
        if hasattr(account_profile, "parent_profile"):
            parent_profile = account_profile.parent_profile
            parent_profile.first_name = user.first_name
            parent_profile.last_name = user.last_name
            parent_profile.email = user.email
            parent_profile.phone = phone or parent_profile.phone
            parent_profile.metadata = {
                **(parent_profile.metadata or {}),
                "source": "public_registration",
                "parent_focus": parent_focus,
                "child_class_level": child_class_level,
                "child_board": child_board,
                "school_name": school_name,
                "school_code": school_code,
                "country": confirmed_country,
                "state": confirmed_state,
                "city": confirmed_city,
                "pincode": confirmed_pincode,
                "timezone": confirmed_timezone,
            }
            parent_profile.save()
        else:
            ParentProfile.objects.create(
                institute=account_profile.institute,
                account_profile=account_profile,
                first_name=user.first_name,
                last_name=user.last_name,
                phone=phone,
                email=user.email,
                metadata={
                    "source": "public_registration",
                    "parent_focus": parent_focus,
                    "child_class_level": child_class_level,
                    "child_board": child_board,
                    "school_name": school_name,
                    "school_code": school_code,
                    "country": confirmed_country,
                    "state": confirmed_state,
                    "city": confirmed_city,
                    "pincode": confirmed_pincode,
                    "timezone": confirmed_timezone,
                },
                is_active=True,
            )

        merge_registration_context(
            account_profile,
            child_class_level=child_class_level,
            child_board=child_board,
            parent_focus=parent_focus,
        )

    else:
        raise ValidationError({"role": "This account role does not support public onboarding completion."})

    account_profile.onboarding_status = OnboardingStatus.COMPLETED
    account_profile.profile_completion_required = False
    account_profile.profile_completion_completed_at = timezone.now()
    account_profile.save()
    return account_profile


@transaction.atomic
def create_institute_login(*, institute, username=None, password=None, auto_generate=False):
    if AccountProfile.objects.filter(
        institute=institute,
        role=AccountRole.INSTITUTE_ADMIN,
    ).exists():
        raise ValidationError({"institute": ["Login already exists for this institute."]})

    generated_password = None
    if auto_generate:
        if not username:
            username = build_unique_username(institute.code or institute.name)
        if not password:
            password = generate_temporary_password()
            generated_password = password

    user = User.objects.create_user(
        username=username,
        password=password,
        email=institute.email or f"{username}@nexora.local",
        is_active=True,
    )
    profile = AccountProfile.objects.create(
        user=user,
        role=AccountRole.INSTITUTE_ADMIN,
        institute=institute,
        is_active=True,
    )
    return profile, generated_password


@transaction.atomic
def create_student_login(*, student, username=None, password=None, auto_generate=False):
    if hasattr(student, "account_profile"):
        raise ValidationError({"student": ["Login already exists for this student."]})

    generated_password = None
    if auto_generate:
        if not username:
            username = build_unique_username(student.admission_no or student.full_name)
        if not password:
            password = generate_temporary_password()
            generated_password = password

    user = User.objects.create_user(
        username=username,
        password=password,
        email=student.email or f"{username}@nexora.local",
        is_active=True,
    )
    profile = AccountProfile.objects.create(
        user=user,
        role=AccountRole.STUDENT,
        institute=student.institute,
        student_profile=student,
        is_active=True,
    )
    return profile, generated_password


@transaction.atomic
def create_teacher_login(*, teacher, username=None, password=None, auto_generate=False):
    if hasattr(teacher, "account_profile"):
        raise ValidationError({"teacher": ["Login already exists for this teacher."]})

    generated_password = None
    if auto_generate:
        if not username:
            username = build_unique_username(teacher.employee_code or teacher.full_name)
        if not password:
            password = generate_temporary_password()
            generated_password = password

    user = User.objects.create_user(
        username=username,
        password=password,
        email=teacher.email or f"{username}@nexora.local",
        is_active=True,
    )
    profile = AccountProfile.objects.create(
        user=user,
        role=AccountRole.TEACHER,
        institute=teacher.institute,
        teacher_profile=teacher,
        is_active=True,
    )
    return profile, generated_password


def get_scoped_student_for_admin(*, student_id, requesting_profile):
    queryset = StudentProfile.objects.select_related("institute")
    if requesting_profile.role != AccountRole.PLATFORM_ADMIN:
        queryset = queryset.filter(institute_id=requesting_profile.institute_id)
    return queryset.filter(pk=student_id).first()


def get_scoped_institute_for_admin(*, institute_id, requesting_profile):
    queryset = Institute.objects.all()
    if requesting_profile.role != AccountRole.PLATFORM_ADMIN:
        queryset = queryset.filter(pk=requesting_profile.institute_id)
    return queryset.filter(pk=institute_id).first()


def get_scoped_teacher_for_admin(*, teacher_id, requesting_profile):
    queryset = TeacherProfile.objects.select_related("institute")
    if requesting_profile.role != AccountRole.PLATFORM_ADMIN:
        queryset = queryset.filter(institute_id=requesting_profile.institute_id)
    return queryset.filter(pk=teacher_id).first()


def get_scoped_user_for_admin(*, user_id, requesting_profile):
    queryset = User.objects.select_related("account_profile", "account_profile__institute")
    if requesting_profile.role != AccountRole.PLATFORM_ADMIN:
        queryset = queryset.filter(account_profile__institute_id=requesting_profile.institute_id)
    return queryset.filter(pk=user_id).first()


def student_import_template_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(STUDENT_IMPORT_TEMPLATE_COLUMNS)
    writer.writerow(
        [
            "STU101",
            "Aarav",
            "Sharma",
            "male",
            "2026-2027",
            "Math Foundation",
            "Batch A",
            "aarav@example.com",
            "9876543210",
            "Rakesh Sharma",
            "9876500000",
            "Delhi",
            str(date.today()),
            "true",
            "true",
            "aarav.math",
            "Student@123",
        ]
    )
    return output.getvalue()


def teacher_import_template_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(TEACHER_IMPORT_TEMPLATE_COLUMNS)
    writer.writerow(
        [
            "TCH101",
            "Meera",
            "Joshi",
            "meera@example.com",
            "9876543210",
            "M.Sc Mathematics",
            "Algebra",
            "Senior maths faculty",
            str(date.today()),
            "true",
            "true",
            "meera.math",
            "Teacher@123",
        ]
    )
    return output.getvalue()


def parse_csv_import_file(uploaded_file, required_columns):
    try:
        content = uploaded_file.read().decode("utf-8-sig")
    finally:
        uploaded_file.seek(0)
    if not content.strip():
        raise ValidationError({"file": "The uploaded file is empty."})
    reader = csv.DictReader(io.StringIO(content))
    missing_columns = [column for column in required_columns if column not in (reader.fieldnames or [])]
    if missing_columns:
        raise ValidationError({"file": f"Missing required columns: {', '.join(missing_columns)}."})
    return list(reader)


def _parse_bool(value, *, default=False):
    raw = str(value).strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "y"}


def _parse_date(value, field_name):
    raw = (value or "").strip()
    if not raw:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError as exc:
        raise ValidationError({field_name: "Use YYYY-MM-DD date format."}) from exc


def _resolve_academic_year(institute, value):
    lookup = (value or "").strip()
    if not lookup:
        raise ValidationError({"academic_year": "Academic year is required."})
    academic_year = (
        AcademicYear.objects.filter(institute=institute, is_active=True)
        .filter(name__iexact=lookup)
        .first()
    )
    if academic_year:
        return academic_year
    raise ValidationError({"academic_year": f"Academic year '{lookup}' was not found."})


def _resolve_program(institute, value):
    lookup = (value or "").strip()
    if not lookup:
        raise ValidationError({"program": "Program is required."})
    program = (
        Program.objects.filter(institute=institute, is_active=True).filter(code__iexact=lookup).first()
    )
    if program:
        return program
    program = (
        Program.objects.filter(institute=institute, is_active=True).filter(name__iexact=lookup).first()
    )
    if program:
        return program
    raise ValidationError({"program": f"Program '{lookup}' was not found."})


def _resolve_cohort(institute, program, academic_year, value):
    lookup = (value or "").strip()
    if not lookup:
        return None
    cohort = (
        Cohort.objects.filter(institute=institute, program=program, academic_year=academic_year, is_active=True)
        .filter(code__iexact=lookup)
        .first()
    )
    if cohort:
        return cohort
    cohort = (
        Cohort.objects.filter(institute=institute, program=program, academic_year=academic_year, is_active=True)
        .filter(name__iexact=lookup)
        .first()
    )
    if cohort:
        return cohort
    raise ValidationError({"cohort": f"Cohort '{lookup}' was not found."})


def _validate_login_fields(*, username, password, create_login, identifier_seed):
    normalized_username = (username or "").strip()
    normalized_password = password or ""
    auto_generate = False
    if not create_login:
        return {
            "create_login": False,
            "username": None,
            "password": None,
            "auto_generate": False,
            "resolved_username": None,
        }
    if normalized_username and User.objects.filter(username=normalized_username).exists():
        raise ValidationError({"username": "Username already exists."})
    if normalized_password:
        validate_password(normalized_password)
    else:
        auto_generate = True
    resolved_username = normalized_username or build_unique_username(identifier_seed)
    return {
        "create_login": True,
        "username": normalized_username or None,
        "password": normalized_password or None,
        "auto_generate": auto_generate or not normalized_username,
        "resolved_username": resolved_username,
    }


def preview_bulk_student_import(*, institute, rows):
    preview_rows = []
    valid_payloads = []

    for index, row in enumerate(rows, start=2):
        errors = {}
        try:
            academic_year = _resolve_academic_year(institute, row.get("academic_year"))
            program = _resolve_program(institute, row.get("program"))
            cohort = _resolve_cohort(institute, program, academic_year, row.get("cohort"))
            admission_no = (row.get("admission_no") or "").strip()
            first_name = (row.get("first_name") or "").strip()
            last_name = (row.get("last_name") or "").strip()
            if not admission_no:
                raise ValidationError({"admission_no": "Admission number is required."})
            if not first_name:
                raise ValidationError({"first_name": "First name is required."})
            if StudentProfile.objects.filter(institute=institute, admission_no__iexact=admission_no).exists():
                raise ValidationError({"admission_no": "Admission number already exists."})
            joined_at = _parse_date(row.get("joined_at"), "joined_at") or date.today()
            login_details = _validate_login_fields(
                username=row.get("username"),
                password=row.get("password"),
                create_login=_parse_bool(row.get("create_login")),
                identifier_seed=admission_no or first_name,
            )
            payload = {
                "institute": str(institute.id),
                "academic_year": str(academic_year.id),
                "program": str(program.id),
                "cohort": str(cohort.id) if cohort else None,
                "admission_no": admission_no,
                "first_name": first_name,
                "last_name": last_name,
                "gender": (row.get("gender") or StudentProfile._meta.get_field("gender").default).strip()
                or StudentProfile._meta.get_field("gender").default,
                "date_of_birth": (row.get("date_of_birth") or "").strip() or None,
                "email": (row.get("email") or "").strip(),
                "phone": (row.get("phone") or "").strip(),
                "guardian_name": (row.get("guardian_name") or "").strip(),
                "guardian_phone": (row.get("guardian_phone") or "").strip(),
                "address": (row.get("address") or "").strip(),
                "joined_at": joined_at.isoformat(),
                "is_active": _parse_bool(row.get("is_active"), default=True),
                **login_details,
            }
            preview_rows.append(
                {
                    "row_number": index,
                    "status": "valid",
                    "display_name": " ".join(part for part in [first_name, last_name] if part).strip(),
                    "identifier": admission_no,
                    "username": payload["resolved_username"],
                    "create_login": payload["create_login"],
                    "errors": {},
                }
            )
            valid_payloads.append(payload)
        except ValidationError as exc:
            errors = getattr(exc, "message_dict", None) or {"detail": exc.messages}
            preview_rows.append(
                {
                    "row_number": index,
                    "status": "invalid",
                    "display_name": " ".join(
                        part for part in [(row.get("first_name") or "").strip(), (row.get("last_name") or "").strip()]
                        if part
                    ).strip(),
                    "identifier": (row.get("admission_no") or "").strip(),
                    "username": (row.get("username") or "").strip(),
                    "create_login": _parse_bool(row.get("create_login")),
                    "errors": errors,
                }
            )

    return {
        "total_rows": len(preview_rows),
        "valid_rows": len(valid_payloads),
        "invalid_rows": len([row for row in preview_rows if row["status"] == "invalid"]),
        "rows": preview_rows,
        "valid_payloads": valid_payloads,
    }


def preview_bulk_teacher_import(*, institute, rows):
    preview_rows = []
    valid_payloads = []

    for index, row in enumerate(rows, start=2):
        try:
            employee_code = (row.get("employee_code") or "").strip()
            first_name = (row.get("first_name") or "").strip()
            last_name = (row.get("last_name") or "").strip()
            if not employee_code:
                raise ValidationError({"employee_code": "Employee code is required."})
            if not first_name:
                raise ValidationError({"first_name": "First name is required."})
            if TeacherProfile.objects.filter(institute=institute, employee_code__iexact=employee_code).exists():
                raise ValidationError({"employee_code": "Employee code already exists."})
            joined_at = _parse_date(row.get("joined_at"), "joined_at") or date.today()
            login_details = _validate_login_fields(
                username=row.get("username"),
                password=row.get("password"),
                create_login=_parse_bool(row.get("create_login")),
                identifier_seed=employee_code or first_name,
            )
            payload = {
                "institute": str(institute.id),
                "employee_code": employee_code,
                "first_name": first_name,
                "last_name": last_name,
                "email": (row.get("email") or "").strip(),
                "phone": (row.get("phone") or "").strip(),
                "qualification": (row.get("qualification") or "").strip(),
                "specialization": (row.get("specialization") or "").strip(),
                "bio": (row.get("bio") or "").strip(),
                "joined_at": joined_at.isoformat(),
                "is_active": _parse_bool(row.get("is_active"), default=True),
                **login_details,
            }
            preview_rows.append(
                {
                    "row_number": index,
                    "status": "valid",
                    "display_name": " ".join(part for part in [first_name, last_name] if part).strip(),
                    "identifier": employee_code,
                    "username": payload["resolved_username"],
                    "create_login": payload["create_login"],
                    "errors": {},
                }
            )
            valid_payloads.append(payload)
        except ValidationError as exc:
            errors = getattr(exc, "message_dict", None) or {"detail": exc.messages}
            preview_rows.append(
                {
                    "row_number": index,
                    "status": "invalid",
                    "display_name": " ".join(
                        part for part in [(row.get("first_name") or "").strip(), (row.get("last_name") or "").strip()]
                        if part
                    ).strip(),
                    "identifier": (row.get("employee_code") or "").strip(),
                    "username": (row.get("username") or "").strip(),
                    "create_login": _parse_bool(row.get("create_login")),
                    "errors": errors,
                }
            )

    return {
        "total_rows": len(preview_rows),
        "valid_rows": len(valid_payloads),
        "invalid_rows": len([row for row in preview_rows if row["status"] == "invalid"]),
        "rows": preview_rows,
        "valid_payloads": valid_payloads,
    }


@transaction.atomic
def import_bulk_students(*, institute, valid_payloads):
    created_count = 0
    failed_count = 0
    credentials = []
    errors = []

    for index, payload in enumerate(valid_payloads, start=1):
        try:
            student = StudentProfile.objects.create(
                institute=institute,
                academic_year=AcademicYear.objects.get(pk=payload["academic_year"], institute=institute),
                program=Program.objects.get(pk=payload["program"], institute=institute),
                cohort=(
                    Cohort.objects.get(pk=payload["cohort"], institute=institute)
                    if payload.get("cohort")
                    else None
                ),
                admission_no=payload["admission_no"],
                first_name=payload["first_name"],
                last_name=payload.get("last_name", ""),
                gender=payload.get("gender") or StudentProfile._meta.get_field("gender").default,
                date_of_birth=_parse_date(payload.get("date_of_birth"), "date_of_birth")
                if payload.get("date_of_birth")
                else None,
                email=payload.get("email", ""),
                phone=payload.get("phone", ""),
                guardian_name=payload.get("guardian_name", ""),
                guardian_phone=payload.get("guardian_phone", ""),
                address=payload.get("address", ""),
                joined_at=_parse_date(payload["joined_at"], "joined_at") or date.today(),
                is_active=payload.get("is_active", True),
            )
            if payload.get("create_login"):
                account_profile, generated_password = create_student_login(
                    student=student,
                    username=payload.get("username"),
                    password=payload.get("password"),
                    auto_generate=payload.get("auto_generate", False),
                )
                credentials.append(
                    {
                        "profile_id": str(student.id),
                        "full_name": student.full_name,
                        "identifier": student.admission_no,
                        "username": account_profile.user.username,
                        "generated_password": generated_password,
                    }
                )
            created_count += 1
        except Exception as exc:  # noqa: BLE001
            failed_count += 1
            errors.append({"row_number": index, "detail": str(exc)})

    return {
        "created_count": created_count,
        "failed_count": failed_count,
        "errors": errors,
        "credentials": credentials,
    }


@transaction.atomic
def import_bulk_teachers(*, institute, valid_payloads):
    created_count = 0
    failed_count = 0
    credentials = []
    errors = []

    for index, payload in enumerate(valid_payloads, start=1):
        try:
            teacher = TeacherProfile.objects.create(
                institute=institute,
                employee_code=payload["employee_code"],
                first_name=payload["first_name"],
                last_name=payload.get("last_name", ""),
                email=payload.get("email", ""),
                phone=payload.get("phone", ""),
                qualification=payload.get("qualification", ""),
                specialization=payload.get("specialization", ""),
                bio=payload.get("bio", ""),
                joined_at=_parse_date(payload["joined_at"], "joined_at") or date.today(),
                is_active=payload.get("is_active", True),
            )
            if payload.get("create_login"):
                account_profile, generated_password = create_teacher_login(
                    teacher=teacher,
                    username=payload.get("username"),
                    password=payload.get("password"),
                    auto_generate=payload.get("auto_generate", False),
                )
                credentials.append(
                    {
                        "profile_id": str(teacher.id),
                        "full_name": teacher.full_name,
                        "identifier": teacher.employee_code,
                        "username": account_profile.user.username,
                        "generated_password": generated_password,
                    }
                )
            created_count += 1
        except Exception as exc:  # noqa: BLE001
            failed_count += 1
            errors.append({"row_number": index, "detail": str(exc)})

    return {
        "created_count": created_count,
        "failed_count": failed_count,
        "errors": errors,
        "credentials": credentials,
    }
