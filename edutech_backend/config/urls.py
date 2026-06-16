from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from config.health import HealthCheckView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", HealthCheckView.as_view(), name="health-check"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/docs/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("api/v1/", include(("apps.accounts.urls", "accounts"), namespace="accounts-root")),
    path(
        "api/v1/accounts/",
        include(("apps.accounts.management_urls", "accounts-management"), namespace="accounts"),
    ),
    path("api/v1/institutes/", include("apps.institutes.urls")),
    path("api/v1/academics/", include("apps.academics.urls")),
    path("api/v1/students/", include("apps.students.urls")),
    path("api/v1/teachers/", include("apps.teachers.urls")),
    path("api/v1/question-bank/", include("apps.question_bank.urls")),
    path("api/v1/exams/", include("apps.exams.urls")),
    path("api/v1/attempts/", include("apps.attempts.urls")),
    path("api/v1/results/", include("apps.results.urls")),
    path("api/v1/economy/", include("apps.economy.urls")),
    path("api/v1/parent/", include("apps.parents.urls")),
    path("api/v1/notifications/", include("apps.reports.urls")),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
