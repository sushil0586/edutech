from dataclasses import asdict, dataclass

from apps.question_bank.models import QuestionType


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


RESPONSE_MODE_REGISTRY = {
    "single_choice": ResponseModeDefinition(
        code="single_choice",
        label="Single Choice",
        description="Learner picks one option from a fixed option set.",
        input_kind="option_select",
        cardinality="single",
        requires_options=True,
        allows_manual_entry=False,
        allows_file_upload=False,
        is_available=True,
        lifecycle_stage="stable",
    ),
    "multi_choice": ResponseModeDefinition(
        code="multi_choice",
        label="Multiple Choice",
        description="Learner picks one or more options from a fixed option set.",
        input_kind="option_select",
        cardinality="multiple",
        requires_options=True,
        allows_manual_entry=False,
        allows_file_upload=False,
        is_available=True,
        lifecycle_stage="stable",
    ),
    "text": ResponseModeDefinition(
        code="text",
        label="Text Response",
        description="Learner types a free-text response.",
        input_kind="text_entry",
        cardinality="single",
        requires_options=False,
        allows_manual_entry=True,
        allows_file_upload=False,
        is_available=True,
        lifecycle_stage="stable",
    ),
    "numeric": ResponseModeDefinition(
        code="numeric",
        label="Numeric Response",
        description="Learner types a numeric response that is validated as a number.",
        input_kind="numeric_entry",
        cardinality="single",
        requires_options=False,
        allows_manual_entry=True,
        allows_file_upload=False,
        is_available=True,
        lifecycle_stage="stable",
    ),
}


EVALUATION_MODE_REGISTRY = {
    "auto_option_match": EvaluationModeDefinition(
        code="auto_option_match",
        label="Automatic Option Match",
        description="System scores responses by comparing selected options against the answer key.",
        scoring_kind="objective",
        is_auto_scorable=True,
        requires_manual_review=False,
        supports_partial_scoring=True,
        supports_answer_key=True,
        is_available=True,
        lifecycle_stage="stable",
    ),
    "auto_text_match": EvaluationModeDefinition(
        code="auto_text_match",
        label="Automatic Text Match",
        description="System scores typed responses against accepted answer text variants.",
        scoring_kind="constructed_response",
        is_auto_scorable=True,
        requires_manual_review=False,
        supports_partial_scoring=False,
        supports_answer_key=True,
        is_available=True,
        lifecycle_stage="stable",
    ),
    "auto_numeric_match": EvaluationModeDefinition(
        code="auto_numeric_match",
        label="Automatic Numeric Match",
        description="System scores numeric responses against one or more accepted values, with optional tolerance.",
        scoring_kind="constructed_response",
        is_auto_scorable=True,
        requires_manual_review=False,
        supports_partial_scoring=False,
        supports_answer_key=True,
        is_available=True,
        lifecycle_stage="stable",
    ),
    "manual_rubric_review": EvaluationModeDefinition(
        code="manual_rubric_review",
        label="Manual Rubric Review",
        description="Teacher or reviewer evaluates the response manually and assigns marks.",
        scoring_kind="constructed_response",
        is_auto_scorable=False,
        requires_manual_review=True,
        supports_partial_scoring=True,
        supports_answer_key=False,
        is_available=True,
        lifecycle_stage="stable",
    ),
}


QUESTION_TYPE_REGISTRY = {
    QuestionType.MCQ_SINGLE: QuestionTypeDefinition(
        code=QuestionType.MCQ_SINGLE,
        label="MCQ Single",
        description="Single-correct multiple-choice question.",
        family="objective",
        response_mode="single_choice",
        answer_mode="single_choice",
        evaluation_mode="auto_option_match",
        option_source="author_defined",
        min_active_options=2,
        max_active_options=None,
        min_correct_options=1,
        max_correct_options=1,
        supports_passage=True,
        supports_rich_content=True,
        supports_negative_marking=True,
        supports_partial_scoring=False,
        requires_manual_review=False,
        is_available=True,
        lifecycle_stage="stable",
        authoring_variant="standard_options",
        delivery_variant="single_select",
        supports_attachments=True,
        allowed_attachment_types=("image", "diagram", "pdf"),
        recommended_attachment_types=("image", "diagram"),
        allowed_response_artifact_types=(),
        media_delivery_mode="optional_reference",
        media_preload_strategy="on_demand",
    ),
    QuestionType.MCQ_MULTIPLE: QuestionTypeDefinition(
        code=QuestionType.MCQ_MULTIPLE,
        label="MCQ Multiple",
        description="Multiple-correct multiple-choice question.",
        family="objective",
        response_mode="multi_choice",
        answer_mode="multi_choice",
        evaluation_mode="auto_option_match",
        option_source="author_defined",
        min_active_options=2,
        max_active_options=None,
        min_correct_options=1,
        max_correct_options=None,
        supports_passage=True,
        supports_rich_content=True,
        supports_negative_marking=True,
        supports_partial_scoring=True,
        requires_manual_review=False,
        is_available=True,
        lifecycle_stage="stable",
        authoring_variant="standard_options",
        delivery_variant="multi_select",
        supports_attachments=True,
        allowed_attachment_types=("image", "diagram", "pdf"),
        recommended_attachment_types=("image", "diagram"),
        allowed_response_artifact_types=(),
        media_delivery_mode="optional_reference",
        media_preload_strategy="on_demand",
    ),
    QuestionType.TRUE_FALSE: QuestionTypeDefinition(
        code=QuestionType.TRUE_FALSE,
        label="True / False",
        description="Binary true/false question with a fixed two-option structure.",
        family="objective",
        response_mode="single_choice",
        answer_mode="single_choice",
        evaluation_mode="auto_option_match",
        option_source="fixed_binary",
        min_active_options=2,
        max_active_options=2,
        min_correct_options=1,
        max_correct_options=1,
        supports_passage=True,
        supports_rich_content=True,
        supports_negative_marking=True,
        supports_partial_scoring=False,
        requires_manual_review=False,
        is_available=True,
        lifecycle_stage="stable",
        authoring_variant="true_false",
        delivery_variant="binary_select",
        supports_attachments=True,
        allowed_attachment_types=("image", "diagram", "pdf"),
        recommended_attachment_types=("image", "diagram"),
        allowed_response_artifact_types=(),
        media_delivery_mode="optional_reference",
        media_preload_strategy="on_demand",
    ),
    QuestionType.ASSERTION_REASON: QuestionTypeDefinition(
        code=QuestionType.ASSERTION_REASON,
        label="Assertion / Reason",
        description="Structured objective question with a fixed four-option assertion and reason relationship pattern.",
        family="objective",
        response_mode="single_choice",
        answer_mode="single_choice",
        evaluation_mode="auto_option_match",
        option_source="fixed_assertion_reason",
        min_active_options=4,
        max_active_options=4,
        min_correct_options=1,
        max_correct_options=1,
        supports_passage=True,
        supports_rich_content=True,
        supports_negative_marking=True,
        supports_partial_scoring=False,
        requires_manual_review=False,
        is_available=True,
        lifecycle_stage="stable",
        authoring_variant="assertion_reason",
        delivery_variant="assertion_reason",
        supports_attachments=True,
        allowed_attachment_types=("image", "diagram", "pdf"),
        recommended_attachment_types=("image", "diagram"),
        allowed_response_artifact_types=(),
        media_delivery_mode="optional_reference",
        media_preload_strategy="on_demand",
    ),
    QuestionType.MATRIX_MATCH: QuestionTypeDefinition(
        code=QuestionType.MATRIX_MATCH,
        label="Matrix Match",
        description="Structured objective question with left and right match columns plus answer options.",
        family="objective",
        response_mode="single_choice",
        answer_mode="single_choice",
        evaluation_mode="auto_option_match",
        option_source="author_defined",
        min_active_options=2,
        max_active_options=None,
        min_correct_options=1,
        max_correct_options=1,
        supports_passage=True,
        supports_rich_content=True,
        supports_negative_marking=True,
        supports_partial_scoring=False,
        requires_manual_review=False,
        is_available=True,
        lifecycle_stage="stable",
        authoring_variant="matrix_match",
        delivery_variant="matrix_match",
        supports_attachments=True,
        allowed_attachment_types=("image", "diagram", "pdf"),
        recommended_attachment_types=("diagram", "image"),
        allowed_response_artifact_types=(),
        media_delivery_mode="optional_reference",
        media_preload_strategy="on_demand",
    ),
    QuestionType.SHORT_ANSWER: QuestionTypeDefinition(
        code=QuestionType.SHORT_ANSWER,
        label="Short Answer",
        description="Open-response short-answer question evaluated against accepted text answers.",
        family="constructed_response",
        response_mode="text",
        answer_mode="text",
        evaluation_mode="auto_text_match",
        option_source="none",
        min_active_options=0,
        max_active_options=0,
        min_correct_options=0,
        max_correct_options=0,
        supports_passage=True,
        supports_rich_content=True,
        supports_negative_marking=True,
        supports_partial_scoring=False,
        requires_manual_review=False,
        is_available=True,
        lifecycle_stage="stable",
        authoring_variant="text_answer",
        delivery_variant="text_response",
        supports_attachments=True,
        allowed_attachment_types=("image", "diagram", "pdf", "audio"),
        recommended_attachment_types=("image", "pdf"),
        allowed_response_artifact_types=(),
        media_delivery_mode="optional_reference",
        media_preload_strategy="on_demand",
    ),
    QuestionType.FILL_IN_BLANKS: QuestionTypeDefinition(
        code=QuestionType.FILL_IN_BLANKS,
        label="Fill in the Blanks",
        description="Prompt contains placeholder blanks that learners fill in using ordered text answers.",
        family="constructed_response",
        response_mode="text",
        answer_mode="text",
        evaluation_mode="auto_text_match",
        option_source="none",
        min_active_options=0,
        max_active_options=0,
        min_correct_options=0,
        max_correct_options=0,
        supports_passage=True,
        supports_rich_content=True,
        supports_negative_marking=True,
        supports_partial_scoring=False,
        requires_manual_review=False,
        is_available=True,
        lifecycle_stage="beta",
        authoring_variant="fill_in_blanks",
        delivery_variant="fill_in_blanks",
        supports_attachments=True,
        allowed_attachment_types=("image", "diagram", "pdf"),
        recommended_attachment_types=("image", "diagram"),
        allowed_response_artifact_types=(),
        media_delivery_mode="optional_reference",
        media_preload_strategy="on_demand",
    ),
    QuestionType.NUMERIC_ANSWER: QuestionTypeDefinition(
        code=QuestionType.NUMERIC_ANSWER,
        label="Numeric Answer",
        description="Open-response numeric question scored against accepted numeric values.",
        family="constructed_response",
        response_mode="numeric",
        answer_mode="text",
        evaluation_mode="auto_numeric_match",
        option_source="none",
        min_active_options=0,
        max_active_options=0,
        min_correct_options=0,
        max_correct_options=0,
        supports_passage=True,
        supports_rich_content=True,
        supports_negative_marking=True,
        supports_partial_scoring=False,
        requires_manual_review=False,
        is_available=True,
        lifecycle_stage="stable",
        authoring_variant="numeric_answer",
        delivery_variant="numeric_response",
        supports_attachments=True,
        allowed_attachment_types=("image", "diagram", "pdf"),
        recommended_attachment_types=("diagram", "image"),
        allowed_response_artifact_types=(),
        media_delivery_mode="optional_reference",
        media_preload_strategy="on_demand",
    ),
    QuestionType.ESSAY_MANUAL_REVIEW: QuestionTypeDefinition(
        code=QuestionType.ESSAY_MANUAL_REVIEW,
        label="Essay Manual Review",
        description="Extended-response essay question reviewed manually with teacher-assigned marks.",
        family="constructed_response",
        response_mode="text",
        answer_mode="text",
        evaluation_mode="manual_rubric_review",
        option_source="none",
        min_active_options=0,
        max_active_options=0,
        min_correct_options=0,
        max_correct_options=0,
        supports_passage=True,
        supports_rich_content=True,
        supports_negative_marking=False,
        supports_partial_scoring=True,
        requires_manual_review=True,
        is_available=True,
        lifecycle_stage="stable",
        authoring_variant="essay_manual_review",
        delivery_variant="essay_response",
        supports_attachments=True,
        allowed_attachment_types=("image", "diagram", "pdf", "audio", "video"),
        recommended_attachment_types=("pdf", "image", "audio"),
        allowed_response_artifact_types=(
            "audio_recording",
            "video_recording",
            "image_upload",
            "document_upload",
        ),
        media_delivery_mode="optional_reference",
        media_preload_strategy="on_demand",
    ),
}


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
