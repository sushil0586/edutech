import csv
import io
import re
import secrets
from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction

from apps.academics.models import AcademicYear, Cohort, Program
from apps.accounts.models import AccountProfile, AccountRole
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


def generate_temporary_password(length=12):
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"
    password = "".join(secrets.choice(alphabet) for _ in range(length))
    validate_password(password)
    return password


def validate_confirmed_password(password, confirm_password, *, user=None):
    if password != confirm_password:
        raise ValidationError({"confirm_password": ["Passwords do not match."]})
    validate_password(password, user=user)


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
