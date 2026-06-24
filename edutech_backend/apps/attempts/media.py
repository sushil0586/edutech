import os
import uuid
from pathlib import Path

from django.core.exceptions import ValidationError


RESPONSE_ARTIFACT_RULES = {
    "audio_recording": {
        "extensions": {".mp3", ".wav", ".m4a", ".aac", ".ogg"},
        "mime_prefixes": ("audio/",),
        "max_size_bytes": 25 * 1024 * 1024,
        "label": "audio recording",
    },
    "video_recording": {
        "extensions": {".mp4", ".webm", ".mov", ".m4v"},
        "mime_prefixes": ("video/",),
        "max_size_bytes": 100 * 1024 * 1024,
        "label": "video recording",
    },
    "image_upload": {
        "extensions": {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"},
        "mime_prefixes": ("image/",),
        "max_size_bytes": 10 * 1024 * 1024,
        "label": "image file",
    },
    "document_upload": {
        "extensions": {".pdf"},
        "mime_prefixes": ("application/pdf",),
        "max_size_bytes": 20 * 1024 * 1024,
        "label": "PDF document",
    },
}


def _format_size_mb(size_bytes):
    return int(size_bytes / (1024 * 1024))


def validate_response_artifact_file(*, uploaded_file, asset_kind):
    if uploaded_file is None:
        raise ValidationError({"file": "Choose a response artifact file before uploading."})

    if asset_kind not in RESPONSE_ARTIFACT_RULES:
        raise ValidationError({"asset_kind": "Unsupported response artifact type."})

    rule = RESPONSE_ARTIFACT_RULES[asset_kind]
    normalized_name = str(getattr(uploaded_file, "name", "") or "").strip().lower()
    extension = Path(normalized_name).suffix.lower()
    content_type = str(getattr(uploaded_file, "content_type", "") or "").strip().lower()
    size = int(getattr(uploaded_file, "size", 0) or 0)

    if size <= 0:
        raise ValidationError({"file": "The uploaded response artifact is empty."})

    if size > rule["max_size_bytes"]:
        raise ValidationError(
            {"file": f"Upload a {rule['label']} smaller than {_format_size_mb(rule['max_size_bytes'])} MB."}
        )

    extension_matches = extension in rule["extensions"]
    mime_matches = any(
        content_type == prefix or content_type.startswith(prefix)
        for prefix in rule["mime_prefixes"]
    )
    if not extension_matches and not mime_matches:
        raise ValidationError({"file": f"Upload a valid {rule['label']}."})


def build_response_artifact_storage_path(*, attempt_id, question_id, asset_kind, original_name):
    extension = os.path.splitext(str(original_name or ""))[1].lower().strip() or ""
    return (
        f"attempts/response-artifacts/{attempt_id}/{question_id}/"
        f"{asset_kind}-{uuid.uuid4().hex}{extension}"
    )
