from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from decouple import Csv, config


BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config(
    "DJANGO_SECRET_KEY",
    default="change-me-change-me-change-me-change-me",
)
DEBUG = config("DJANGO_DEBUG", cast=bool, default=False)
if not DEBUG and SECRET_KEY == "change-me-change-me-change-me-change-me":
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is false.")
APP_VERSION = config("APP_VERSION", default="1.0.0")
APP_BUILD = config("APP_BUILD", default="local")
ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", cast=Csv(), default="127.0.0.1,localhost")

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "corsheaders",
    "django_filters",
    "rest_framework",
    "rest_framework_simplejwt",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.accounts",
    "apps.institutes",
    "apps.geography",
    "apps.academics",
    "apps.students",
    "apps.teachers",
    "apps.economy",
    "apps.parents",
    "apps.question_bank",
    "apps.exams",
    "apps.attempts",
    "apps.results",
    "apps.reports",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="edutech_db"),
        "USER": config("DB_USER", default="postgres"),
        "PASSWORD": config("DB_PASSWORD", default="postgres"),
        "HOST": config("DB_HOST", default="127.0.0.1"),
        "PORT": config("DB_PORT", default="5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "common.pagination.StandardResultsSetPagination",
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "EXCEPTION_HANDLER": "common.exceptions.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "PAGE_SIZE": 20,
}

REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {
    "login": config("THROTTLE_LOGIN", default="10/minute"),
    "registration": config("THROTTLE_REGISTRATION", default="20/hour"),
    "attempt_save_answer": config("THROTTLE_ATTEMPT_SAVE", default="120/minute"),
    "attempt_lifecycle": config("THROTTLE_ATTEMPT_LIFECYCLE", default="30/minute"),
    "bulk_import": config("THROTTLE_BULK_IMPORT", default="10/hour"),
    "token_refresh": config("THROTTLE_TOKEN_REFRESH", default="60/hour"),
    "admin_provision": config("THROTTLE_ADMIN_PROVISION", default="30/hour"),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("ACCESS_TOKEN_LIFETIME_MINUTES", cast=int, default=60)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("REFRESH_TOKEN_LIFETIME_DAYS", cast=int, default=7)
    ),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "EduTech API",
    "DESCRIPTION": "REST API foundation for the EduTech education portal.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

CORS_ALLOW_ALL_ORIGINS = config("CORS_ALLOW_ALL_ORIGINS", cast=bool, default=False)
CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", cast=Csv(), default="")
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", cast=Csv(), default="")
USE_X_FORWARDED_HOST = config("USE_X_FORWARDED_HOST", cast=bool, default=False)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", cast=bool, default=not DEBUG)
SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", cast=int, default=31536000 if not DEBUG else 0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS",
    cast=bool,
    default=not DEBUG,
)
SECURE_HSTS_PRELOAD = config("SECURE_HSTS_PRELOAD", cast=bool, default=not DEBUG)
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = config(
    "SECURE_REFERRER_POLICY",
    default="strict-origin-when-cross-origin",
)
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", cast=bool, default=not DEBUG)
SESSION_COOKIE_SAMESITE = config("SESSION_COOKIE_SAMESITE", default="Lax")
CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", cast=bool, default=not DEBUG)
CSRF_COOKIE_SAMESITE = config("CSRF_COOKIE_SAMESITE", default="Lax")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "structured": {
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "structured",
        }
    },
    "loggers": {
        "nexora.auth": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "nexora.exam": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "nexora.import": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "nexora.api": {"handlers": ["console"], "level": "ERROR", "propagate": False},
    },
}
