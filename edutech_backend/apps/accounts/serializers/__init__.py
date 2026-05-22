from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import AccountProfile
from apps.accounts.services import validate_confirmed_password


User = get_user_model()


class AccountProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = AccountProfile
        fields = (
            "id",
            "username",
            "email",
            "role",
            "institute",
            "student_profile",
            "teacher_profile",
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
