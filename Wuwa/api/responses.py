from django.http import JsonResponse


def success_response(payload, status=200):
    return JsonResponse(payload, status=status)


def error_response(message, status):
    return JsonResponse({"error": message}, status=status)
