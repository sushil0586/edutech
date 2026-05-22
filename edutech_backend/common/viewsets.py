from rest_framework import status
from rest_framework.response import Response

from common.responses import action_response


class SoftDeleteModelViewSetMixin:
    archive_message = "Record archived successfully."

    def perform_destroy(self, instance):
        if hasattr(instance, "is_active"):
            instance.is_active = False
            instance.save(update_fields=["is_active", "updated_at"])
            return
        instance.delete()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return action_response(message=self.archive_message, status_code=status.HTTP_200_OK)
