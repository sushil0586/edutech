from .base import *  # noqa: F403,F401


DEBUG = False
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

if not SECRET_KEY or SECRET_KEY == "change-me-change-me-change-me-change-me":
    raise RuntimeError("DJANGO_SECRET_KEY must be set to a strong production value.")

if DEBUG:
    raise RuntimeError("DJANGO_DEBUG must be False in config.settings.prod.")
