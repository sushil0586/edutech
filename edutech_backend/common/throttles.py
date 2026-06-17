from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle


class _UserOrIpThrottle(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        if request.user and request.user.is_authenticated:
            ident = f"user:{request.user.pk}"
        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class LoginRateThrottle(_UserOrIpThrottle):
    scope = "login"


class RegistrationRateThrottle(_UserOrIpThrottle):
    scope = "registration"

    def get_cache_key(self, request, view):
        if settings.DEBUG:
            return None
        return super().get_cache_key(request, view)


class AttemptSaveAnswerRateThrottle(_UserOrIpThrottle):
    scope = "attempt_save_answer"


class AttemptLifecycleRateThrottle(_UserOrIpThrottle):
    scope = "attempt_lifecycle"


class BulkImportRateThrottle(_UserOrIpThrottle):
    scope = "bulk_import"


class TokenRefreshRateThrottle(_UserOrIpThrottle):
    scope = "token_refresh"


class AdminProvisionRateThrottle(_UserOrIpThrottle):
    scope = "admin_provision"
