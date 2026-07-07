from .base import *  # noqa: F403,F401


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
