from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.academics.models import Subject
from apps.accounts.models import AccountProfile
from apps.accounts.services import (
    complete_public_onboarding,
    create_public_registration_account,
    validate_confirmed_password,
)
from apps.economy.models import ReferralCode
from apps.geography.services import resolve_location_selection


User = get_user_model()


class AccountProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    display_name = serializers.SerializerMethodField()
    institute_name = serializers.SerializerMethodField()
    student_context = serializers.SerializerMethodField()
    parent_context = serializers.SerializerMethodField()
    location_context = serializers.SerializerMethodField()
    acquisition_context = serializers.SerializerMethodField()

    def get_display_name(self, obj):
        student_profile = getattr(obj, "student_profile", None)
        if student_profile and student_profile.full_name.strip():
            return student_profile.full_name.strip()
        parent_profile = getattr(obj, "parent_profile", None)
        if parent_profile and parent_profile.full_name.strip():
            return parent_profile.full_name.strip()

        user = getattr(obj, "user", None)
        full_name = " ".join(
            part.strip()
            for part in [
                getattr(user, "first_name", ""),
                getattr(user, "last_name", ""),
            ]
            if part and part.strip()
        )
        if full_name:
            return full_name
        return getattr(user, "username", "")

    def get_institute_name(self, obj):
        institute = getattr(obj, "institute", None)
        if institute and getattr(institute, "name", "").strip():
            return institute.name.strip()
        return None

    def get_student_context(self, obj):
        if obj.role != "student" or obj.student_profile_id is None:
            return None

        student = obj.student_profile
        subject_names = []
        seen = set()

        def add_subject_name(value):
            name = str(value or "").strip()
            normalized = name.lower()
            if not name or normalized in seen:
                return
            seen.add(normalized)
            subject_names.append(name)

        program_subjects = Subject.objects.filter(
            institute=student.institute,
            is_active=True,
        ).filter(
            Q(program=student.program) | Q(program__isnull=True)
        ).order_by("sort_order", "name")
        for subject in program_subjects:
            add_subject_name(subject.name)

        result_subject_names = (
            student.topic_performances.filter(is_active=True)
            .select_related("subject")
            .order_by("subject__sort_order", "subject__name")
            .values_list("subject__name", flat=True)
            .distinct()
        )
        for subject_name in result_subject_names:
            add_subject_name(subject_name)

        registered_subjects = obj.registration_context.get("subject_interests", [])
        if isinstance(registered_subjects, list):
            for subject_name in registered_subjects:
                add_subject_name(subject_name)

        referral_code = (
            ReferralCode.objects.filter(
                owner_student=student,
                institute=student.institute,
                is_active=True,
            )
            .order_by("created_at")
            .values_list("code", flat=True)
            .first()
        )

        return {
            "full_name": student.full_name,
            "program_name": student.program.name,
            "academic_year_name": student.academic_year.name,
            "cohort_name": student.cohort.name if student.cohort_id else "",
            "referral_code": referral_code,
            "subject_options": [
                {
                    "value": name,
                    "label": name,
                }
                for name in subject_names
            ],
        }

    def get_parent_context(self, obj):
        if obj.role != "parent":
            return None
        parent_profile = getattr(obj, "parent_profile", None)
        if parent_profile is None:
            return {
                "parent_profile_id": None,
                "linked_children_count": 0,
                "has_active_links": False,
            }
        active_relationships = parent_profile.relationships.filter(status="active", is_active=True).count()
        return {
            "parent_profile_id": str(parent_profile.id),
            "linked_children_count": active_relationships,
            "has_active_links": active_relationships > 0,
        }

    def get_location_context(self, obj):
        location_profile = getattr(obj, "location_profile", None)
        if location_profile is None:
            return None
        return {
            "detected_country": location_profile.detected_country,
            "detected_state": location_profile.detected_state,
            "detected_city": location_profile.detected_city,
            "detected_pincode": location_profile.detected_pincode,
            "detected_timezone": location_profile.detected_timezone,
            "detection_source": location_profile.detection_source,
            "detected_at": location_profile.detected_at,
            "confirmed_country": location_profile.confirmed_country,
            "confirmed_state": location_profile.confirmed_state,
            "confirmed_city": location_profile.confirmed_city,
            "confirmed_pincode": location_profile.confirmed_pincode,
            "confirmed_timezone": location_profile.confirmed_timezone,
            "confirmed_at": location_profile.confirmed_at,
        }

    def get_acquisition_context(self, obj):
        acquisition_profile = getattr(obj, "acquisition_profile", None)
        if acquisition_profile is None:
            return None
        return {
            "signup_source": acquisition_profile.signup_source,
            "landing_variant": acquisition_profile.landing_variant,
            "platform": acquisition_profile.platform,
            "device_category": acquisition_profile.device_category,
            "app_version": acquisition_profile.app_version,
            "browser_family": acquisition_profile.browser_family,
            "utm_source": acquisition_profile.utm_source,
            "utm_medium": acquisition_profile.utm_medium,
            "utm_campaign": acquisition_profile.utm_campaign,
            "utm_term": acquisition_profile.utm_term,
            "utm_content": acquisition_profile.utm_content,
            "referral_channel": acquisition_profile.referral_channel,
            "referral_identifier": acquisition_profile.referral_identifier,
            "invite_code": acquisition_profile.invite_code,
            "school_name_text": acquisition_profile.school_name_text,
            "school_normalization_status": acquisition_profile.school_normalization_status,
            "metadata": acquisition_profile.metadata,
        }

    class Meta:
        model = AccountProfile
        fields = (
            "id",
            "username",
            "email",
            "display_name",
            "role",
            "institute",
            "institute_name",
            "student_profile",
            "teacher_profile",
            "registration_context",
            "onboarding_status",
            "profile_completion_required",
            "profile_completion_completed_at",
            "onboarding_role",
            "onboarding_version",
            "student_context",
            "parent_context",
            "location_context",
            "acquisition_context",
            "is_active",
        )


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        existing_user = User.objects.filter(username=attrs["username"]).first()
        if existing_user and existing_user.check_password(attrs["password"]) and not existing_user.is_active:
            raise serializers.ValidationError({"detail": "User account is inactive."})
        user = authenticate(username=attrs["username"], password=attrs["password"])
        if user is None:
            raise serializers.ValidationError({"detail": "Invalid credentials."})
        if not hasattr(user, "account_profile") or not user.account_profile.is_active:
            raise serializers.ValidationError({"detail": "Account profile is inactive or missing."})
        attrs["user"] = user
        return attrs

    def create(self, validated_data):
        user = validated_data["user"]
        refresh = RefreshToken.for_user(user)
        profile = user.account_profile
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": AccountProfileSerializer(profile).data,
        }


class RefreshTokenSerializer(TokenRefreshSerializer):
    pass


class CredentialStatusMixin(serializers.Serializer):
    has_login = serializers.SerializerMethodField()
    login_username = serializers.SerializerMethodField()
    login_is_active = serializers.SerializerMethodField()
    account_user_id = serializers.SerializerMethodField()

    def get_has_login(self, obj):
        return hasattr(obj, "account_profile") and obj.account_profile is not None

    def get_login_username(self, obj):
        profile = getattr(obj, "account_profile", None)
        return getattr(getattr(profile, "user", None), "username", None)

    def get_login_is_active(self, obj):
        profile = getattr(obj, "account_profile", None)
        user = getattr(profile, "user", None)
        return bool(user and user.is_active)

    def get_account_user_id(self, obj):
        profile = getattr(obj, "account_profile", None)
        user = getattr(profile, "user", None)
        return getattr(user, "id", None)


class CreateLoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    confirm_password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    auto_generate = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        auto_generate = attrs.get("auto_generate", False)
        username = (attrs.get("username") or "").strip()
        password = attrs.get("password") or ""
        confirm_password = attrs.get("confirm_password") or ""

        if auto_generate:
            attrs["username"] = ""
            attrs["password"] = ""
            attrs["confirm_password"] = ""
            return attrs

        if not username:
            raise serializers.ValidationError({"username": "Username is required."})
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "Username already exists."})
        validate_confirmed_password(password, confirm_password)
        attrs["username"] = username
        return attrs


class ResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    confirm_password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    auto_generate = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if attrs.get("auto_generate", False):
            return attrs
        validate_confirmed_password(
            attrs.get("new_password") or "",
            attrs.get("confirm_password") or "",
        )
        return attrs


class StudentExamAccessKeySerializer(serializers.Serializer):
    access_key = serializers.CharField()

    def validate_access_key(self, value):
        normalized = "".join(str(value or "").upper().split())
        if not normalized:
            raise serializers.ValidationError("Exam key is required.")
        return normalized


class PublicRegistrationSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=("student", "parent", "teacher"))
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    school_code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    school_name = serializers.CharField(required=False, allow_blank=True, max_length=255)

    class_level = serializers.CharField(required=False, allow_blank=True, max_length=20)
    board = serializers.CharField(required=False, allow_blank=True, max_length=50)
    exam_interest = serializers.CharField(required=False, allow_blank=True, max_length=100)
    subject_interests = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True,
    )

    child_class_level = serializers.CharField(required=False, allow_blank=True, max_length=20)
    child_board = serializers.CharField(required=False, allow_blank=True, max_length=50)
    parent_focus = serializers.CharField(required=False, allow_blank=True, max_length=100)

    teaching_focus = serializers.CharField(required=False, allow_blank=True, max_length=100)
    teaching_scope = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True,
    )
    referral_code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    signup_source = serializers.CharField(required=False, allow_blank=True, max_length=50)
    landing_variant = serializers.CharField(required=False, allow_blank=True, max_length=100)
    platform = serializers.CharField(required=False, allow_blank=True, max_length=50)
    device_category = serializers.CharField(required=False, allow_blank=True, max_length=50)
    app_version = serializers.CharField(required=False, allow_blank=True, max_length=50)
    browser_family = serializers.CharField(required=False, allow_blank=True, max_length=100)
    utm_source = serializers.CharField(required=False, allow_blank=True, max_length=100)
    utm_medium = serializers.CharField(required=False, allow_blank=True, max_length=100)
    utm_campaign = serializers.CharField(required=False, allow_blank=True, max_length=150)
    utm_term = serializers.CharField(required=False, allow_blank=True, max_length=150)
    utm_content = serializers.CharField(required=False, allow_blank=True, max_length=150)
    invite_code = serializers.CharField(required=False, allow_blank=True, max_length=100)
    detected_country = serializers.CharField(required=False, allow_blank=True, max_length=100)
    detected_state = serializers.CharField(required=False, allow_blank=True, max_length=100)
    detected_city = serializers.CharField(required=False, allow_blank=True, max_length=100)
    detected_pincode = serializers.CharField(required=False, allow_blank=True, max_length=20)
    detected_timezone = serializers.CharField(required=False, allow_blank=True, max_length=100)
    detection_source = serializers.CharField(required=False, allow_blank=True, max_length=50)

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        if User.objects.filter(username__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return normalized

    def validate(self, attrs):
        validate_confirmed_password(attrs.get("password") or "", attrs.get("confirm_password") or "")

        if not str(attrs.get("phone") or "").strip():
            raise serializers.ValidationError({"phone": "Phone number is required."})

        return attrs

    def create(self, validated_data):
        try:
            return create_public_registration_account(validated_data)
        except DjangoValidationError as exc:
            detail = exc.message_dict if getattr(exc, "message_dict", None) else {"detail": exc.messages}
            raise serializers.ValidationError(detail) from exc


class OnboardingProfileSerializer(serializers.Serializer):
    class_level = serializers.CharField(required=False, allow_blank=True, max_length=20)
    board = serializers.CharField(required=False, allow_blank=True, max_length=50)
    exam_interest = serializers.CharField(required=False, allow_blank=True, max_length=100)
    subject_interests = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True,
    )
    child_class_level = serializers.CharField(required=False, allow_blank=True, max_length=20)
    child_board = serializers.CharField(required=False, allow_blank=True, max_length=50)
    parent_focus = serializers.CharField(required=False, allow_blank=True, max_length=100)
    teaching_focus = serializers.CharField(required=False, allow_blank=True, max_length=100)
    teaching_scope = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True,
    )
    school_code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    school_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    country = serializers.CharField(required=False, allow_blank=True, max_length=100)
    state = serializers.CharField(required=False, allow_blank=True, max_length=100)
    city = serializers.CharField(required=False, allow_blank=True, max_length=100)
    pincode = serializers.CharField(required=False, allow_blank=True, max_length=20)
    timezone = serializers.CharField(required=False, allow_blank=True, max_length=100)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)

    def validate(self, attrs):
        account_profile = self.context["request"].user.account_profile
        role = account_profile.role
        errors = {}

        if role not in {"student", "teacher", "parent"}:
            raise serializers.ValidationError({"role": "This account does not support public onboarding completion."})

        required_location_fields = ("country", "state", "city", "pincode")
        missing_location = [
            field for field in required_location_fields if not str(attrs.get(field) or "").strip()
        ]
        if missing_location:
            errors.update({field: f"{field.replace('_', ' ').title()} is required." for field in missing_location})
        elif not errors:
            try:
                normalized_location = resolve_location_selection(
                    country_name=attrs.get("country", ""),
                    state_name=attrs.get("state", ""),
                    city_name=attrs.get("city", ""),
                    postal_code=attrs.get("pincode", ""),
                )
                attrs["country"] = normalized_location["country"]
                attrs["state"] = normalized_location["state"]
                attrs["city"] = normalized_location["city"]
                attrs["pincode"] = normalized_location["pincode"]
            except DjangoValidationError as exc:
                detail = exc.message_dict if getattr(exc, "message_dict", None) else {"detail": exc.messages}
                raise serializers.ValidationError(detail) from exc

        if role == "student":
            if not str(attrs.get("class_level") or "").strip():
                errors["class_level"] = "Class level is required."
            if not str(attrs.get("board") or "").strip():
                errors["board"] = "Board is required."
            if not str(attrs.get("exam_interest") or "").strip():
                errors["exam_interest"] = "Exam interest is required."
        elif role == "teacher":
            if not str(attrs.get("teaching_focus") or "").strip():
                errors["teaching_focus"] = "Teaching focus is required."
        elif role == "parent":
            if not str(attrs.get("child_class_level") or "").strip():
                errors["child_class_level"] = "Child class level is required."
            if not str(attrs.get("child_board") or "").strip():
                errors["child_board"] = "Child board is required."

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def create(self, validated_data):
        try:
            return complete_public_onboarding(self.context["request"].user.account_profile, validated_data)
        except DjangoValidationError as exc:
            detail = exc.message_dict if getattr(exc, "message_dict", None) else {"detail": exc.messages}
            raise serializers.ValidationError(detail) from exc
