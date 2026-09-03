from __future__ import annotations

import json
from copy import deepcopy
from decimal import Decimal
from functools import lru_cache
from pathlib import Path


ASSESSMENT_FAMILY_ALLOWED_QUESTION_TYPE_ALIASES = {
    "integer_response": "numeric_answer",
    "numerical_response": "numeric_answer",
}

ASSESSMENT_FAMILY_CONTRACTS_PATH = (
    Path(__file__).resolve().parent / "contracts" / "assessment_family_contracts.json"
)


@lru_cache(maxsize=1)
def load_assessment_family_contracts():
    with ASSESSMENT_FAMILY_CONTRACTS_PATH.open(encoding="utf-8") as contract_file:
        payload = json.load(contract_file)

    if not isinstance(payload, dict):
        raise ValueError("Assessment family contracts manifest must be a JSON object.")

    contracts: dict[str, dict] = {}
    for family_code, contract in payload.items():
        normalized_family_code = str(family_code or "").strip()
        if not normalized_family_code:
            continue
        if not isinstance(contract, dict):
            raise ValueError(
                f"Assessment family contract for '{normalized_family_code}' must be a JSON object."
            )
        contracts[normalized_family_code] = contract
    return contracts


ASSESSMENT_FAMILY_CONTRACTS = load_assessment_family_contracts()


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
