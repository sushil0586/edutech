from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from django.utils import timezone

from apps.accounts.access import ensure_account_access
from apps.accounts.models import AccountSession


class AccountJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        authenticated = super().authenticate(request)
        if authenticated is not None:
            user, token = authenticated
            session_id = token.get("sid")
            if not session_id or not AccountSession.objects.filter(
                id=session_id,
                user=user,
                is_active=True,
                revoked_at__isnull=True,
                expires_at__gt=timezone.now(),
            ).exists():
                raise AuthenticationFailed("Session is no longer active.", code="session_revoked")
            ensure_account_access(user, request=request)
        return authenticated
