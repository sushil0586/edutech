from __future__ import annotations

from copy import deepcopy
from decimal import Decimal


ASSESSMENT_FAMILY_ALLOWED_QUESTION_TYPE_ALIASES = {
    "integer_response": "numeric_answer",
    "numerical_response": "numeric_answer",
}

ASSESSMENT_FAMILY_CONTRACTS = {
    "school": {
        "allowed_question_types": [
            "mcq_single",
            "mcq_multiple",
            "true_false",
            "short_answer",
            "essay_manual_review",
            "fill_in_blanks",
            "assertion_reason",
            "matrix_match",
        ],
        "scoring_defaults": {
            "strategy": "standard_marks",
            "negative_marking_default": False,
            "negative_marking_scope": "disabled",
            "supports_numeric_entry": False,
            "supports_partial_scoring": True,
            "recommended_attempt_policy": "single",
        },
    },
    "competitive": {
        "allowed_question_types": [
            "mcq_single",
            "mcq_multiple",
            "true_false",
            "assertion_reason",
            "matrix_match",
            "numeric_answer",
        ],
        "scoring_defaults": {
            "strategy": "negative_marks",
            "negative_marking_default": True,
            "negative_marking_scope": "objective_only",
            "supports_numeric_entry": True,
            "supports_partial_scoring": True,
            "recommended_attempt_policy": "single",
        },
    },
    "certification": {
        "allowed_question_types": [
            "mcq_single",
            "mcq_multiple",
            "true_false",
            "short_answer",
        ],
        "scoring_defaults": {
            "strategy": "standard_marks",
            "negative_marking_default": False,
            "negative_marking_scope": "disabled",
            "supports_numeric_entry": False,
            "supports_partial_scoring": True,
            "recommended_attempt_policy": "best",
        },
    },
    "language_proficiency": {
        "allowed_question_types": [
            "mcq_single",
            "short_answer",
            "fill_in_blanks",
            "essay_manual_review",
        ],
        "scoring_defaults": {
            "strategy": "band_score",
            "negative_marking_default": False,
            "negative_marking_scope": "disabled",
            "supports_numeric_entry": False,
            "supports_partial_scoring": True,
            "recommended_attempt_policy": "single",
        },
    },
}


def normalize_assessment_family_allowed_question_types(codes: list[str] | tuple[str, ...] | None):
    normalized_codes: list[str] = []
    seen: set[str] = set()
    for raw_code in codes or []:
        code = str(raw_code or "").strip()
        if not code:
            continue
        normalized = ASSESSMENT_FAMILY_ALLOWED_QUESTION_TYPE_ALIASES.get(code, code)
        if normalized in seen:
            continue
        seen.add(normalized)
        normalized_codes.append(normalized)
    return normalized_codes


def get_assessment_family_contract_defaults(family_code: str | None):
    if not family_code:
        return None
    contract = ASSESSMENT_FAMILY_CONTRACTS.get(str(family_code).strip())
    return deepcopy(contract) if contract is not None else None


def merge_assessment_family_contract(*, family_code: str | None, allowed_question_types, scoring_defaults):
    contract_defaults = get_assessment_family_contract_defaults(family_code)
    normalized_allowed_question_types = normalize_assessment_family_allowed_question_types(
        allowed_question_types,
    )
    merged_scoring_defaults = deepcopy(scoring_defaults) if isinstance(scoring_defaults, dict) else {}

    if contract_defaults is None:
        return {
            "allowed_question_types": normalized_allowed_question_types,
            "scoring_defaults": merged_scoring_defaults,
        }

    contract_allowed_question_types = normalize_assessment_family_allowed_question_types(
        contract_defaults.get("allowed_question_types", []),
    )
    if not normalized_allowed_question_types:
        normalized_allowed_question_types = contract_allowed_question_types

    merged_scoring_defaults = {
        **contract_defaults.get("scoring_defaults", {}),
        **merged_scoring_defaults,
    }

    return {
        "allowed_question_types": normalized_allowed_question_types,
        "scoring_defaults": merged_scoring_defaults,
    }


def validate_program_assessment_family_question_contract(
    *,
    program,
    question_type: str | None,
    marks,
    negative_marks,
    question_type_definition=None,
):
    family = getattr(program, "assessment_family", None)
    contract = merge_assessment_family_contract(
        family_code=getattr(family, "code", None),
        allowed_question_types=getattr(family, "allowed_question_types", []),
        scoring_defaults=getattr(family, "scoring_defaults", {}),
    )

    errors: dict[str, str] = {}
    normalized_question_type = str(question_type or "").strip()
    allowed_question_types = contract.get("allowed_question_types", [])

    if normalized_question_type and allowed_question_types and normalized_question_type not in allowed_question_types:
        family_label = getattr(family, "label", "this assessment family")
        errors["question_type"] = (
            f"{normalized_question_type} is not allowed for the {family_label} contract."
        )

    try:
        effective_marks = Decimal(str(marks if marks not in (None, "") else "0"))
    except Exception:
        effective_marks = Decimal("0")

    try:
        effective_negative_marks = Decimal(str(negative_marks if negative_marks not in (None, "") else "0"))
    except Exception:
        effective_negative_marks = Decimal("0")

    if question_type_definition is not None:
        supports_negative_marking = bool(
            getattr(question_type_definition, "supports_negative_marking", False)
        )
        if effective_negative_marks > 0 and not supports_negative_marking:
            errors["negative_marks"] = (
                f"{normalized_question_type or 'This question type'} does not support negative marking."
            )

    if effective_negative_marks > 0 and effective_marks > 0 and effective_negative_marks >= effective_marks:
        errors["negative_marks"] = (
            "Negative marks must stay lower than the positive marks awarded for the question."
        )

    return errors
