from django.http import JsonResponse


def error_response(message, status):
    return JsonResponse({"error": message}, status=status)
