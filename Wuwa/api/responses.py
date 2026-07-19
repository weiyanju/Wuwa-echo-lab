from django.http import JsonResponse


def success_response(payload, status=200):
    return JsonResponse(payload, status=status)


def error_response(message, status, code=None):
    payload = {"error": message}
    if code:
        payload["code"] = code
    return JsonResponse(payload, status=status)
