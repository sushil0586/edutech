from .base import *  # noqa: F403,F401
from decouple import config


DEBUG = True

# Keep local development permissive enough for the known frontend hosts,
# but do not default to wildcard CORS across every origin.
LOCAL_DEV_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3200",
    "http://127.0.0.1:3200",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CORS_ALLOW_ALL_ORIGINS = False
if not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = LOCAL_DEV_CORS_ORIGINS

if not CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS = LOCAL_DEV_CORS_ORIGINS

DEV_PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.ScryptPasswordHasher",
    # Keep MD5 as a dev-only fallback so a fast-auth load run does not leave
    # local seeded users unreadable on the normal dev server afterward.
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

PASSWORD_HASHERS = DEV_PASSWORD_HASHERS

# Optional local-only fast auth mode for load profiling.
# This keeps normal dev defaults intact while allowing stress runs
# to isolate module latency from expensive password hashing.
ENABLE_FAST_AUTH_FOR_LOAD_TESTS = config(
    "ENABLE_FAST_AUTH_FOR_LOAD_TESTS",
    cast=bool,
    default=False,
)

if ENABLE_FAST_AUTH_FOR_LOAD_TESTS:
    PASSWORD_HASHERS = [
        "django.contrib.auth.hashers.MD5PasswordHasher",
        *[hasher for hasher in DEV_PASSWORD_HASHERS if hasher != "django.contrib.auth.hashers.MD5PasswordHasher"],
    ]
