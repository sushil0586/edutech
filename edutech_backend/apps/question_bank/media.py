from pathlib import Path

from django.core.exceptions import ValidationError

from apps.question_bank.models import AttachmentType


ATTACHMENT_TYPE_RULES = {
    AttachmentType.IMAGE: {
        "extensions": {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"},
        "mime_prefixes": ("image/",),
        "max_size_bytes": 5 * 1024 * 1024,
        "label": "image",
    },
    AttachmentType.DIAGRAM: {
        "extensions": {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"},
        "mime_prefixes": ("image/",),
        "max_size_bytes": 5 * 1024 * 1024,
        "label": "diagram image",
    },
    AttachmentType.PDF: {
        "extensions": {".pdf"},
        "mime_prefixes": ("application/pdf",),
        "max_size_bytes": 10 * 1024 * 1024,
        "label": "PDF",
    },
    AttachmentType.AUDIO: {
        "extensions": {".mp3", ".wav", ".m4a", ".aac", ".ogg"},
        "mime_prefixes": ("audio/",),
        "max_size_bytes": 20 * 1024 * 1024,
        "label": "audio file",
    },
    AttachmentType.VIDEO: {
        "extensions": {".mp4", ".webm", ".mov", ".m4v"},
        "mime_prefixes": ("video/",),
        "max_size_bytes": 50 * 1024 * 1024,
        "label": "video file",
    },
    AttachmentType.OTHER: {
        "extensions": set(),
        "mime_prefixes": tuple(),
        "max_size_bytes": 25 * 1024 * 1024,
        "label": "attachment file",
    },
}


def _format_size_mb(size_bytes):
    return int(size_bytes / (1024 * 1024))


def validate_question_attachment_file(*, uploaded_file, attachment_type):
    if uploaded_file is None:
        raise ValidationError({"file": "Choose an attachment file before uploading."})

    if attachment_type not in ATTACHMENT_TYPE_RULES:
        raise ValidationError({"attachment_type": "Unsupported attachment type."})

    rule = ATTACHMENT_TYPE_RULES[attachment_type]
    normalized_name = str(getattr(uploaded_file, "name", "") or "").strip().lower()
    extension = Path(normalized_name).suffix.lower()
    content_type = str(getattr(uploaded_file, "content_type", "") or "").strip().lower()
    size = int(getattr(uploaded_file, "size", 0) or 0)

    if size <= 0:
        raise ValidationError({"file": "The uploaded attachment is empty."})

    if size > rule["max_size_bytes"]:
        raise ValidationError(
            {"file": f"Upload a {rule['label']} smaller than {_format_size_mb(rule['max_size_bytes'])} MB."}
        )

    if attachment_type == AttachmentType.OTHER:
        return

    extension_matches = extension in rule["extensions"]
    mime_matches = any(
        content_type == prefix or content_type.startswith(prefix)
        for prefix in rule["mime_prefixes"]
    )
    if not extension_matches and not mime_matches:
        raise ValidationError({"file": f"Upload a valid {rule['label']}."})
