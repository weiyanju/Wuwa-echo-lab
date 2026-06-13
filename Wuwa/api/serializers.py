import json


def json_body(request):
    if not request.body:
        return {}
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError("请求 JSON 格式错误。") from exc
    if not isinstance(payload, dict):
        raise ValueError("请求 JSON 必须是对象。")
    return payload


def clean_string(payload, field, default=""):
    value = payload.get(field, default)
    if value is None:
        return default
    if not isinstance(value, str):
        raise ValueError(f"{field} 必须是字符串。")
    return value.strip()


def require_string(payload, field, default=""):
    value = payload.get(field, default)
    if value is None:
        return default
    if not isinstance(value, str):
        raise ValueError(f"{field} 必须是字符串。")
    return value


def parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off", ""}:
            return False
    raise ValueError("布尔值格式错误。")
