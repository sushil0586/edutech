from rest_framework import serializers

from apps.accounts.models import AccountRole
from apps.exams.models import (
    AttemptPolicy,
    NavigationMode,
    ResultPublishMode,
    ReviewMode,
    SecurityMode,
    TimerMode,
)
from apps.exams.services import INSTITUTE_EXAM_DEFAULT_FIELDS
from apps.geography.services import resolve_location_selection
from apps.institutes.models import Institute, InstituteOnboardingProfile
from apps.institutes.models import InstituteOnboardingRunStatus
from apps.institutes.services import start_institute_onboarding_run


class InstituteAdminCredentialMixin(serializers.Serializer):
    has_login = serializers.SerializerMethodField()
    login_username = serializers.SerializerMethodField()
    login_is_active = serializers.SerializerMethodField()
    account_user_id = serializers.SerializerMethodField()

    def _get_institute_admin_profile(self, obj):
        profiles = getattr(obj, "institute_admin_profiles", None)
        if profiles is None:
            profiles = list(
                obj.account_profiles.filter(role=AccountRole.INSTITUTE_ADMIN)
                .select_related("user")
                .order_by("created_at", "user__username")
            )
        if not profiles:
            return None
        active_profile = next((profile for profile in profiles if profile.is_active), None)
        return active_profile or profiles[0]

    def get_has_login(self, obj):
        profile = self._get_institute_admin_profile(obj)
        return bool(profile and getattr(profile, "user", None))

    def get_login_username(self, obj):
        profile = self._get_institute_admin_profile(obj)
        return getattr(getattr(profile, "user", None), "username", None)

    def get_login_is_active(self, obj):
        profile = self._get_institute_admin_profile(obj)
        user = getattr(profile, "user", None)
        return bool(user and user.is_active)

    def get_account_user_id(self, obj):
        profile = self._get_institute_admin_profile(obj)
        user = getattr(profile, "user", None)
        return getattr(user, "id", None)

    def _get_latest_onboarding_run(self, obj):
        runs = getattr(obj, "prefetched_onboarding_runs", None)
        if runs is None:
            runs = list(
                obj.onboarding_runs.select_related("profile").order_by("-created_at")[:1]
            )
        return runs[0] if runs else None


class InstituteSerializer(InstituteAdminCredentialMixin, serializers.ModelSerializer):
    exam_defaults = serializers.JSONField(required=False)
    onboarding_profile_code = serializers.CharField(
        max_length=80,
        required=False,
        allow_blank=True,
        write_only=True,
    )
    onboarding_run_id = serializers.SerializerMethodField()
    onboarding_run_status = serializers.SerializerMethodField()
    latest_onboarding_profile_code = serializers.SerializerMethodField()
    latest_onboarding_profile_name = serializers.SerializerMethodField()
    latest_onboarding_source = serializers.SerializerMethodField()
    latest_onboarding_completed_at = serializers.SerializerMethodField()

    class Meta:
        model = Institute
        fields = [
            "id",
            "created_at",
            "updated_at",
            "is_active",
            "name",
            "code",
            "email",
            "phone",
            "address",
            "city",
            "state",
            "country",
            "pincode",
            "logo",
            "website",
            "description",
            "metadata",
            "exam_defaults",
            "onboarding_profile_code",
            "onboarding_run_id",
            "onboarding_run_status",
            "latest_onboarding_profile_code",
            "latest_onboarding_profile_name",
            "latest_onboarding_source",
            "latest_onboarding_completed_at",
            "has_login",
            "login_username",
            "login_is_active",
            "account_user_id",
        ]

    def validate_exam_defaults(self, value):
        if value is None or value == "":
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Exam defaults must be a JSON object.")

        unknown_keys = sorted(set(value.keys()) - INSTITUTE_EXAM_DEFAULT_FIELDS)
        if unknown_keys:
            raise serializers.ValidationError(
                f"Unsupported exam default fields: {', '.join(unknown_keys)}."
            )

        validated = dict(value)
        self._validate_positive_int(validated, "duration_minutes", allow_zero=False)
        self._validate_positive_int(validated, "max_attempts", allow_zero=False)
        self._validate_bool(validated, "allow_late_submit")
        self._validate_bool(validated, "randomize_questions")
        self._validate_bool(validated, "randomize_options")
        self._validate_bool(validated, "show_result_immediately")
        self._validate_bool(validated, "allow_review_after_submit")
        self._validate_bool(validated, "allow_resume")
        self._validate_bool(validated, "allow_section_switching")
        self._validate_bool(validated, "allow_return_to_previous_section")
        self._validate_choice(validated, "timer_mode", TimerMode.choices)
        self._validate_choice(validated, "navigation_mode", NavigationMode.choices)
        self._validate_choice(validated, "attempt_policy", AttemptPolicy.choices)
        self._validate_choice(validated, "result_publish_mode", ResultPublishMode.choices)
        self._validate_choice(validated, "review_mode", ReviewMode.choices)
        self._validate_choice(validated, "security_mode", SecurityMode.choices)

        instructions = validated.get("instructions")
        if instructions is not None and not isinstance(instructions, str):
            raise serializers.ValidationError(
                {"instructions": "Instructions must be a string value."}
            )
        return validated

    def validate(self, attrs):
        attrs = super().validate(attrs)

        location_fields = {"country", "state", "city", "pincode"}
        if location_fields.intersection(attrs.keys()):
            instance = getattr(self, "instance", None)
            country = str(attrs.get("country", getattr(instance, "country", "")) or "").strip()
            state = str(attrs.get("state", getattr(instance, "state", "")) or "").strip()
            city = str(attrs.get("city", getattr(instance, "city", "")) or "").strip()
            pincode = str(attrs.get("pincode", getattr(instance, "pincode", "")) or "").strip()
            missing = {
                field: f"{field.replace('_', ' ').title()} is required when institute geography is being set."
                for field, value in {
                    "country": country,
                    "state": state,
                    "city": city,
                    "pincode": pincode,
                }.items()
                if not value
            }
            if missing:
                raise serializers.ValidationError(missing)

            normalized_location = resolve_location_selection(
                country_name=country,
                state_name=state,
                city_name=city,
                postal_code=pincode,
            )
            attrs["country"] = normalized_location["country"]
            attrs["state"] = normalized_location["state"]
            attrs["city"] = normalized_location["city"]
            attrs["pincode"] = normalized_location["pincode"]

        onboarding_profile_code = str(attrs.get("onboarding_profile_code", "") or "").strip().upper()
        if onboarding_profile_code:
            profile_exists = InstituteOnboardingProfile.objects.filter(
                code=onboarding_profile_code,
                is_active=True,
            ).exists()
            if not profile_exists:
                raise serializers.ValidationError(
                    {"onboarding_profile_code": "Selected onboarding profile was not found."}
                )
            attrs["onboarding_profile_code"] = onboarding_profile_code

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        metadata = getattr(instance, "metadata", {}) or {}
        exam_defaults = metadata.get("exam_defaults", {}) if isinstance(metadata, dict) else {}
        data["exam_defaults"] = (
            {key: value for key, value in exam_defaults.items() if key in INSTITUTE_EXAM_DEFAULT_FIELDS}
            if isinstance(exam_defaults, dict)
            else {}
        )
        return data

    def create(self, validated_data):
        exam_defaults = validated_data.pop("exam_defaults", None)
        onboarding_profile_code = validated_data.pop("onboarding_profile_code", "")
        instance = super().create(validated_data)
        if exam_defaults is not None:
            self._write_exam_defaults(instance, exam_defaults)
        if onboarding_profile_code:
            profile = InstituteOnboardingProfile.objects.filter(code=onboarding_profile_code).first()
            onboarding_run = start_institute_onboarding_run(
                institute=instance,
                profile_code=onboarding_profile_code,
                source="institute_create",
                status=InstituteOnboardingRunStatus.PENDING,
                requested_config_json=profile.config_json if profile is not None else {},
                resolved_config_json={
                    "profile_code": onboarding_profile_code,
                    "profile_name": profile.name if profile is not None else "",
                },
                initiated_by=self.context.get("request").user if self.context.get("request") else None,
            )
            setattr(instance, "_created_onboarding_run_id", str(onboarding_run.id))
            setattr(instance, "_created_onboarding_run_status", onboarding_run.status)
        return instance

    def update(self, instance, validated_data):
        exam_defaults = validated_data.pop("exam_defaults", None)
        validated_data.pop("onboarding_profile_code", None)
        instance = super().update(instance, validated_data)
        if exam_defaults is not None:
            self._write_exam_defaults(instance, exam_defaults)
        return instance

    def _write_exam_defaults(self, instance, exam_defaults):
        metadata = instance.metadata if isinstance(instance.metadata, dict) else {}
        next_metadata = dict(metadata)
        next_metadata["exam_defaults"] = exam_defaults
        instance.metadata = next_metadata
        instance.save(update_fields=["metadata", "updated_at"])

    def _validate_choice(self, payload, key, choices):
        value = payload.get(key)
        if value is None:
            return
        valid_values = {choice for choice, _ in choices}
        if value not in valid_values:
            raise serializers.ValidationError(
                {key: f"Invalid value. Expected one of: {', '.join(sorted(valid_values))}."}
            )

    def _validate_bool(self, payload, key):
        value = payload.get(key)
        if value is None:
            return
        if not isinstance(value, bool):
            raise serializers.ValidationError({key: "Value must be true or false."})

    def _validate_positive_int(self, payload, key, allow_zero):
        value = payload.get(key)
        if value is None:
            return
        if not isinstance(value, int):
            raise serializers.ValidationError({key: "Value must be a whole number."})
        if allow_zero:
            if value < 0:
                raise serializers.ValidationError({key: "Value cannot be negative."})
            return
        if value <= 0:
            raise serializers.ValidationError({key: "Value must be greater than zero."})

    def get_onboarding_run_id(self, obj):
        created_run_id = getattr(obj, "_created_onboarding_run_id", None)
        if created_run_id:
            return created_run_id
        latest_run = self._get_latest_onboarding_run(obj)
        return str(latest_run.id) if latest_run is not None else None

    def get_onboarding_run_status(self, obj):
        created_run_status = getattr(obj, "_created_onboarding_run_status", None)
        if created_run_status:
            return created_run_status
        latest_run = self._get_latest_onboarding_run(obj)
        return latest_run.status if latest_run is not None else None

    def get_latest_onboarding_profile_code(self, obj):
        latest_run = self._get_latest_onboarding_run(obj)
        return latest_run.profile_code if latest_run is not None else None

    def get_latest_onboarding_profile_name(self, obj):
        latest_run = self._get_latest_onboarding_run(obj)
        if latest_run is None:
            return None
        profile = getattr(latest_run, "profile", None)
        return profile.name if profile is not None else None

    def get_latest_onboarding_source(self, obj):
        latest_run = self._get_latest_onboarding_run(obj)
        return latest_run.source if latest_run is not None else None

    def get_latest_onboarding_completed_at(self, obj):
        latest_run = self._get_latest_onboarding_run(obj)
        if latest_run is None or latest_run.completed_at is None:
            return None
        return latest_run.completed_at.isoformat()


class InstituteListSerializer(InstituteAdminCredentialMixin, serializers.ModelSerializer):
    class Meta:
        model = Institute
        fields = (
            "id",
            "name",
            "code",
            "email",
            "phone",
            "city",
            "state",
            "country",
            "is_active",
            "has_login",
            "login_username",
            "login_is_active",
            "account_user_id",
        )
        read_only_fields = fields


class InstituteOnboardingProfileListSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstituteOnboardingProfile
        fields = (
            "id",
            "name",
            "code",
            "description",
            "category",
            "is_default",
            "sort_order",
            "config_json",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class InstituteOnboardingRunListSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    profile_code = serializers.CharField(read_only=True)
    profile_name = serializers.SerializerMethodField()
    source = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    task_count = serializers.SerializerMethodField()
    completed_task_count = serializers.SerializerMethodField()
    started_at = serializers.DateTimeField(read_only=True)
    completed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    error_summary = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_profile_name(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.name if profile is not None else None

    def get_task_count(self, obj):
        annotated = getattr(obj, "task_total", None)
        if annotated is not None:
            return annotated
        return obj.tasks.count()

    def get_completed_task_count(self, obj):
        annotated = getattr(obj, "task_completed_total", None)
        if annotated is not None:
            return annotated
        return obj.tasks.exclude(status="pending").count()


class InstituteOnboardingTaskRunListSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    task_code = serializers.CharField(read_only=True)
    label = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    message = serializers.CharField(read_only=True)
    result_json = serializers.JSONField(read_only=True)
    started_at = serializers.DateTimeField(read_only=True, allow_null=True)
    completed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)


class InstituteOnboardingRunDetailSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    profile_code = serializers.CharField(read_only=True)
    profile_name = serializers.SerializerMethodField()
    source = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    requested_config_json = serializers.JSONField(read_only=True)
    resolved_config_json = serializers.JSONField(read_only=True)
    started_at = serializers.DateTimeField(read_only=True, allow_null=True)
    completed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    error_summary = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_profile_name(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.name if profile is not None else None
