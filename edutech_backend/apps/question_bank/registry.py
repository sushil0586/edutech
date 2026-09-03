import json
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True)
class ResponseModeDefinition:
    code: str
    label: str
    description: str
    input_kind: str
    cardinality: str
    requires_options: bool
    allows_manual_entry: bool
    allows_file_upload: bool
    is_available: bool
    lifecycle_stage: str


@dataclass(frozen=True)
class EvaluationModeDefinition:
    code: str
    label: str
    description: str
    scoring_kind: str
    is_auto_scorable: bool
    requires_manual_review: bool
    supports_partial_scoring: bool
    supports_answer_key: bool
    is_available: bool
    lifecycle_stage: str


@dataclass(frozen=True)
class QuestionTypeDefinition:
    code: str
    label: str
    description: str
    family: str
    response_mode: str
    answer_mode: str
    evaluation_mode: str
    option_source: str
    min_active_options: int
    max_active_options: int | None
    min_correct_options: int
    max_correct_options: int | None
    supports_passage: bool
    supports_rich_content: bool
    supports_negative_marking: bool
    supports_partial_scoring: bool
    requires_manual_review: bool
    is_available: bool
    lifecycle_stage: str
    authoring_variant: str
    delivery_variant: str
    supports_attachments: bool
    allowed_attachment_types: tuple[str, ...]
    recommended_attachment_types: tuple[str, ...]
    allowed_response_artifact_types: tuple[str, ...]
    media_delivery_mode: str
    media_preload_strategy: str


QUESTION_TYPE_REGISTRY_PATH = (
    Path(__file__).resolve().parent / "contracts" / "question_type_registry.json"
)


def _build_response_mode_definition(code, payload):
    return ResponseModeDefinition(
        code=code,
        label=payload["label"],
        description=payload["description"],
        input_kind=payload["input_kind"],
        cardinality=payload["cardinality"],
        requires_options=bool(payload["requires_options"]),
        allows_manual_entry=bool(payload["allows_manual_entry"]),
        allows_file_upload=bool(payload["allows_file_upload"]),
        is_available=bool(payload["is_available"]),
        lifecycle_stage=payload["lifecycle_stage"],
    )


def _build_evaluation_mode_definition(code, payload):
    return EvaluationModeDefinition(
        code=code,
        label=payload["label"],
        description=payload["description"],
        scoring_kind=payload["scoring_kind"],
        is_auto_scorable=bool(payload["is_auto_scorable"]),
        requires_manual_review=bool(payload["requires_manual_review"]),
        supports_partial_scoring=bool(payload["supports_partial_scoring"]),
        supports_answer_key=bool(payload["supports_answer_key"]),
        is_available=bool(payload["is_available"]),
        lifecycle_stage=payload["lifecycle_stage"],
    )


def _build_question_type_definition(code, payload):
    return QuestionTypeDefinition(
        code=code,
        label=payload["label"],
        description=payload["description"],
        family=payload["family"],
        response_mode=payload["response_mode"],
        answer_mode=payload["answer_mode"],
        evaluation_mode=payload["evaluation_mode"],
        option_source=payload["option_source"],
        min_active_options=int(payload["min_active_options"]),
        max_active_options=payload["max_active_options"],
        min_correct_options=int(payload["min_correct_options"]),
        max_correct_options=payload["max_correct_options"],
        supports_passage=bool(payload["supports_passage"]),
        supports_rich_content=bool(payload["supports_rich_content"]),
        supports_negative_marking=bool(payload["supports_negative_marking"]),
        supports_partial_scoring=bool(payload["supports_partial_scoring"]),
        requires_manual_review=bool(payload["requires_manual_review"]),
        is_available=bool(payload["is_available"]),
        lifecycle_stage=payload["lifecycle_stage"],
        authoring_variant=payload["authoring_variant"],
        delivery_variant=payload["delivery_variant"],
        supports_attachments=bool(payload["supports_attachments"]),
        allowed_attachment_types=tuple(payload.get("allowed_attachment_types", [])),
        recommended_attachment_types=tuple(payload.get("recommended_attachment_types", [])),
        allowed_response_artifact_types=tuple(payload.get("allowed_response_artifact_types", [])),
        media_delivery_mode=payload["media_delivery_mode"],
        media_preload_strategy=payload["media_preload_strategy"],
    )


@lru_cache(maxsize=1)
def load_question_type_registry():
    with QUESTION_TYPE_REGISTRY_PATH.open(encoding="utf-8") as registry_file:
        payload = json.load(registry_file)

    response_modes = {
        code: _build_response_mode_definition(code, definition)
        for code, definition in payload.get("response_modes", {}).items()
    }
    evaluation_modes = {
        code: _build_evaluation_mode_definition(code, definition)
        for code, definition in payload.get("evaluation_modes", {}).items()
    }
    question_types = {
        code: _build_question_type_definition(code, definition)
        for code, definition in payload.get("question_types", {}).items()
    }
    return {
        "response_modes": response_modes,
        "evaluation_modes": evaluation_modes,
        "question_types": question_types,
    }


_REGISTRY = load_question_type_registry()
RESPONSE_MODE_REGISTRY = _REGISTRY["response_modes"]
EVALUATION_MODE_REGISTRY = _REGISTRY["evaluation_modes"]
QUESTION_TYPE_REGISTRY = _REGISTRY["question_types"]


def get_response_mode_definition(code):
    return RESPONSE_MODE_REGISTRY.get((code or "").strip())


def get_evaluation_mode_definition(code):
    return EVALUATION_MODE_REGISTRY.get((code or "").strip())


def get_response_mode_definition_payload(code):
    definition = get_response_mode_definition(code)
    return asdict(definition) if definition is not None else None


def get_evaluation_mode_definition_payload(code):
    definition = get_evaluation_mode_definition(code)
    return asdict(definition) if definition is not None else None


def get_question_type_definition(code):
    return QUESTION_TYPE_REGISTRY.get((code or "").strip())


def get_question_type_definition_payload(code):
    definition = get_question_type_definition(code)
    if definition is None:
        return None
    payload = asdict(definition)
    payload["response_mode_definition"] = get_response_mode_definition_payload(definition.response_mode)
    payload["evaluation_mode_definition"] = get_evaluation_mode_definition_payload(definition.evaluation_mode)
    payload["capabilities"] = get_question_type_capabilities_payload(definition.code)
    return payload


def list_question_type_definitions(*, available_only=False):
    definitions = list(QUESTION_TYPE_REGISTRY.values())
    if available_only:
        definitions = [definition for definition in definitions if definition.is_available]
    return definitions


def list_question_type_definition_payloads(*, available_only=False):
    return [
        get_question_type_definition_payload(definition.code)
        for definition in list_question_type_definitions(available_only=available_only)
    ]


def list_response_mode_definitions(*, available_only=False):
    definitions = list(RESPONSE_MODE_REGISTRY.values())
    if available_only:
        definitions = [definition for definition in definitions if definition.is_available]
    return definitions


def list_evaluation_mode_definitions(*, available_only=False):
    definitions = list(EVALUATION_MODE_REGISTRY.values())
    if available_only:
        definitions = [definition for definition in definitions if definition.is_available]
    return definitions


def list_response_mode_definition_payloads(*, available_only=False):
    return [asdict(definition) for definition in list_response_mode_definitions(available_only=available_only)]


def list_evaluation_mode_definition_payloads(*, available_only=False):
    return [asdict(definition) for definition in list_evaluation_mode_definitions(available_only=available_only)]


def question_type_supports_options(code):
    definition = get_question_type_definition(code)
    if definition is None:
        return False
    return definition.option_source != "none"


def question_type_supports_multiple_selection(code):
    definition = get_question_type_definition(code)
    return bool(definition and definition.response_mode == "multi_choice")


def question_type_supports_text_answer(code):
    definition = get_question_type_definition(code)
    return bool(definition and definition.response_mode in {"text", "numeric"})


def question_type_is_numeric_response(code):
    definition = get_question_type_definition(code)
    return bool(definition and definition.response_mode == "numeric")


def question_type_is_auto_scorable(code):
    definition = get_question_type_definition(code)
    if definition is None:
        return False
    evaluation_definition = get_evaluation_mode_definition(definition.evaluation_mode)
    return bool(evaluation_definition and evaluation_definition.is_auto_scorable)


def question_type_supports_accepted_answers(code):
    definition = get_question_type_definition(code)
    if definition is None:
        return False
    evaluation_definition = get_evaluation_mode_definition(definition.evaluation_mode)
    return bool(
        definition.response_mode in {"text", "numeric"}
        and evaluation_definition is not None
        and evaluation_definition.supports_answer_key
    )


def question_type_supports_numeric_tolerance(code):
    return question_type_is_numeric_response(code)


def question_type_supports_review_guidance(code):
    definition = get_question_type_definition(code)
    evaluation_definition = (
        get_evaluation_mode_definition(definition.evaluation_mode)
        if definition is not None
        else None
    )
    return bool(evaluation_definition and evaluation_definition.requires_manual_review)


def question_type_requires_manual_review(code):
    definition = get_question_type_definition(code)
    evaluation_definition = (
        get_evaluation_mode_definition(definition.evaluation_mode)
        if definition is not None
        else None
    )
    return bool(evaluation_definition and evaluation_definition.requires_manual_review)


def question_type_supports_attachments(code):
    definition = get_question_type_definition(code)
    return bool(definition and definition.supports_attachments)


def question_type_supports_attachment_type(code, attachment_type):
    definition = get_question_type_definition(code)
    if definition is None:
        return False
    return attachment_type in definition.allowed_attachment_types


def question_type_allowed_response_artifact_types(code):
    definition = get_question_type_definition(code)
    if definition is None:
        return []
    return list(definition.allowed_response_artifact_types)


def question_type_supports_response_artifacts(code):
    return bool(question_type_allowed_response_artifact_types(code))


def get_question_type_capabilities_payload(code):
    definition = get_question_type_definition(code)
    if definition is None:
        return None
    return {
        "supports_options": question_type_supports_options(code),
        "supports_multiple_selection": question_type_supports_multiple_selection(code),
        "supports_text_answer": question_type_supports_text_answer(code),
        "is_numeric_response": question_type_is_numeric_response(code),
        "supports_accepted_answers": question_type_supports_accepted_answers(code),
        "supports_numeric_tolerance": question_type_supports_numeric_tolerance(code),
        "supports_review_guidance": question_type_supports_review_guidance(code),
        "requires_manual_review": question_type_requires_manual_review(code),
        "is_auto_scorable": question_type_is_auto_scorable(code),
        "supports_attachments": question_type_supports_attachments(code),
        "supports_image_attachments": question_type_supports_attachment_type(code, "image"),
        "supports_diagram_attachments": question_type_supports_attachment_type(code, "diagram"),
        "supports_pdf_attachments": question_type_supports_attachment_type(code, "pdf"),
        "supports_audio_attachments": question_type_supports_attachment_type(code, "audio"),
        "supports_video_attachments": question_type_supports_attachment_type(code, "video"),
        "supports_response_artifacts": question_type_supports_response_artifacts(code),
        "allowed_response_artifact_types": question_type_allowed_response_artifact_types(code),
    }
