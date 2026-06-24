from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

from apps.question_bank.models import ContentFormat


ALLOWED_RICH_TEXT_TAGS = {
    "a",
    "blockquote",
    "br",
    "code",
    "em",
    "figcaption",
    "figure",
    "h1",
    "h2",
    "h3",
    "h4",
    "hr",
    "img",
    "i",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "strong",
    "sub",
    "sup",
    "u",
    "ul",
}
VOID_RICH_TEXT_TAGS = {"br", "hr", "img"}
ALLOWED_RICH_TEXT_ATTRS = {
    "a": {"href", "target", "rel"},
    "figure": {"data-align"},
    "img": {"src", "alt", "title", "data-size", "data-align", "width"},
}
ALLOWED_LINK_SCHEMES = {"http", "https", "mailto", "tel"}
ALLOWED_IMAGE_SCHEMES = {"http", "https"}
EMPTY_RICH_TEXT_MARKERS = {"", "<br>", "<p></p>", "<p><br></p>"}


def _sanitize_link(value: str) -> str | None:
    candidate = (value or "").strip()
    if not candidate:
        return None

    parsed = urlparse(candidate)
    if parsed.scheme and parsed.scheme.lower() not in ALLOWED_LINK_SCHEMES:
        return None
    if parsed.scheme.lower() == "javascript":
        return None
    return escape(candidate, quote=True)


def _sanitize_image_src(value: str) -> str | None:
    candidate = (value or "").strip()
    if not candidate:
        return None

    parsed = urlparse(candidate)
    if parsed.scheme.lower() not in ALLOWED_IMAGE_SCHEMES:
        return None
    return escape(candidate, quote=True)


class _RichTextSanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._fragments: list[str] = []
        self._open_tags: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag not in ALLOWED_RICH_TEXT_TAGS:
            return

        if tag in VOID_RICH_TEXT_TAGS:
            attr_markup = ""
            if tag in ALLOWED_RICH_TEXT_ATTRS:
                cleaned_pairs: list[str] = []
                for name, value in attrs:
                    attr_name = (name or "").lower()
                    if attr_name not in ALLOWED_RICH_TEXT_ATTRS[tag]:
                        continue
                    if tag == "img" and attr_name == "src":
                        sanitized_src = _sanitize_image_src(value or "")
                        if not sanitized_src:
                            continue
                        cleaned_pairs.append(f'src="{sanitized_src}"')
                        continue
                    if tag == "img" and attr_name in {"alt", "title"}:
                        cleaned_pairs.append(f'{attr_name}="{escape(value or "", quote=True)}"')
                    if tag == "img" and attr_name == "data-size":
                        if value not in {"small", "medium", "full"}:
                            continue
                        cleaned_pairs.append(f'data-size="{escape(value or "", quote=True)}"')
                    if tag == "img" and attr_name == "data-align":
                        if value not in {"left", "center", "right"}:
                            continue
                        cleaned_pairs.append(f'data-align="{escape(value or "", quote=True)}"')
                    if tag == "img" and attr_name == "width":
                        try:
                            width = int(str(value or "").strip())
                        except (TypeError, ValueError):
                            continue
                        if width < 120 or width > 720:
                            continue
                        cleaned_pairs.append(f'width="{width}"')
                if tag == "img" and not any(pair.startswith("src=") for pair in cleaned_pairs):
                    return
                if cleaned_pairs:
                    attr_markup = " " + " ".join(cleaned_pairs)
            self._fragments.append(f"<{tag}{attr_markup}>")
            return

        attr_markup = ""
        if tag in ALLOWED_RICH_TEXT_ATTRS:
            cleaned_pairs: list[str] = []
            for name, value in attrs:
                attr_name = (name or "").lower()
                if attr_name not in ALLOWED_RICH_TEXT_ATTRS[tag]:
                    continue
                if tag == "figure" and attr_name == "data-align":
                    if value not in {"left", "center", "right"}:
                        continue
                    cleaned_pairs.append(f'data-align="{escape(value or "", quote=True)}"')
                    continue
                if tag == "a" and attr_name == "href":
                    sanitized_href = _sanitize_link(value or "")
                    if not sanitized_href:
                        continue
                    cleaned_pairs.append(f'href="{sanitized_href}"')
                    continue
                if tag == "a" and attr_name == "target":
                    if value not in {"_blank", "_self"}:
                        continue
                    cleaned_pairs.append(f'target="{escape(value, quote=True)}"')
                    continue
                if tag == "a" and attr_name == "rel":
                    cleaned_pairs.append(f'rel="{escape(value or "noopener noreferrer", quote=True)}"')

            if tag == "a" and not any(pair.startswith("rel=") for pair in cleaned_pairs):
                cleaned_pairs.append('rel="noopener noreferrer"')
            if cleaned_pairs:
                attr_markup = " " + " ".join(cleaned_pairs)

        self._fragments.append(f"<{tag}{attr_markup}>")
        self._open_tags.append(tag)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in VOID_RICH_TEXT_TAGS or not self._open_tags or self._open_tags[-1] != tag:
            return
        self._open_tags.pop()
        self._fragments.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        if data:
            self._fragments.append(escape(data))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)

    def get_html(self) -> str:
        while self._open_tags:
            tag = self._open_tags.pop()
            self._fragments.append(f"</{tag}>")
        return "".join(self._fragments).strip()


def sanitize_rich_text_html(value: str) -> str:
    sanitizer = _RichTextSanitizer()
    sanitizer.feed((value or "").strip())
    sanitizer.close()
    cleaned = sanitizer.get_html()
    return "" if cleaned in EMPTY_RICH_TEXT_MARKERS else cleaned


def sanitize_content_by_format(content_format: str, value: str) -> str:
    if content_format == ContentFormat.RICH_TEXT_HTML:
        return sanitize_rich_text_html(value)
    return (value or "").strip()
