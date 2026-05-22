from rest_framework.routers import DefaultRouter

from apps.institutes.views import InstituteViewSet

app_name = "institutes"

router = DefaultRouter()
router.register("", InstituteViewSet, basename="institutes")

urlpatterns = router.urls
