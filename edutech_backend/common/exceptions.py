import logging

from rest_framework.views import exception_handler


logger = logging.getLogger("nexora.api")


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        request = context.get("request")
        view = context.get("view")
        logger.exception(
            "Unhandled API exception",
            extra={
                "path": getattr(request, "path", ""),
                "method": getattr(request, "method", ""),
                "view": view.__class__.__name__ if view else "",
                "user_id": getattr(getattr(request, "user", None), "id", None),
            },
        )
    return response
