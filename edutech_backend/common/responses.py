from rest_framework.response import Response


def action_response(*, data=None, message, success=True, status_code=200):
    return Response(
        {
            "success": success,
            "message": message,
            "data": data,
        },
        status=status_code,
    )
