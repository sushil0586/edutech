from rest_framework.routers import DefaultRouter

from apps.students.views import StudentProfileViewSet

app_name = "students"

router = DefaultRouter()
router.register("", StudentProfileViewSet, basename="students")

urlpatterns = router.urls
