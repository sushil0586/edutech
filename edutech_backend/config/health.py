from django.conf import settings
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        database_ok = False
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            database_ok = True
        except Exception:
            database_ok = False

        status_code = 200 if database_ok else 503
        return Response(
            {
                "status": "ok" if database_ok else "degraded",
                "database": "ok" if database_ok else "unavailable",
                "version": getattr(settings, "APP_VERSION", "1.0.0"),
                "build": getattr(settings, "APP_BUILD", "local"),
            },
            status=status_code,
        )
