#!/usr/bin/env python3
"""Create a new institute, create a scoped public package, and assign it in one go.

This script uses the live backend APIs instead of direct ORM access so it follows
the same product contracts the admin UI depends on.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from typing import Any


DEFAULT_BASE_URL = "http://127.0.0.1:9001"
DEFAULT_ADMIN_USERNAME = "demo-platform-admin"
DEFAULT_ADMIN_PASSWORD = "Demo@12345"
DEFAULT_PUBLIC_HUB_CODE = "PUB001"
DEFAULT_PRESET_CODE = "class_7_cbse_core"

MATH_TOPIC_CODES = [
    "MATH-GEOMETRY-ANGLES",
    "MATH-ARITH-DECIMALS",
    "MATH-ALGEBRA-LETTERS",
    "MATH-ALGEBRA",
]

SCIENCE_TOPIC_CODES = [
    "SCI-MATTER-ACIDBASE",
    "SCI-LIFE-PLANTS",
    "SCI-LIFE-TRANSPORT",
    "SCI-MOTION-MOTION",
]


@dataclass
class ApiClient:
    base_url: str
    token: str

    def request(
        self,
        method: str,
        path: str,
        *,
        payload: dict[str, Any] | None = None,
        query: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = self.base_url.rstrip("/") + path
        if query:
            encoded = urllib.parse.urlencode(
                {key: value for key, value in query.items() if value is not None},
                doseq=True,
            )
            url = f"{url}?{encoded}"
        data = None
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
        }
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(url, data=data, headers=headers, method=method.upper())
        try:
            with urllib.request.urlopen(request) as response:
                body = response.read().decode("utf-8")
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8")
            raise RuntimeError(f"{method} {path} failed with {exc.code}: {body}") from exc


def login(base_url: str, username: str, password: str) -> str:
    payload = json.dumps({"username": username, "password": password}).encode("utf-8")
    request = urllib.request.Request(
        base_url.rstrip("/") + "/api/v1/auth/login/",
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        body = json.loads(response.read().decode("utf-8"))
    return body["access"]


def fetch_results(client: ApiClient, path: str, *, query: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    payload = client.request("GET", path, query=query)
    if isinstance(payload, dict) and "results" in payload:
        return payload["results"]
    if isinstance(payload, list):
        return payload
    return payload.get("data", []) if isinstance(payload, dict) else []


def find_one(items: list[dict[str, Any]], *, key: str, value: str, label: str) -> dict[str, Any]:
    for item in items:
        if str(item.get(key)) == value:
            return item
    raise RuntimeError(f"Unable to find {label} where {key}={value!r}.")


def build_scope_rows(
    *,
    public_program_id: str,
    math_subject_id: str,
    science_subject_id: str,
    topics_by_code: dict[str, dict[str, Any]],
    per_topic_limit: int,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for topic_code in MATH_TOPIC_CODES:
        topic = topics_by_code[topic_code]
        rows.append(
            {
                "program": public_program_id,
                "subject": math_subject_id,
                "topic": topic["id"],
                "question_source_type": "platform_only",
                "difficulty_level": "",
                "question_type": "",
                "master_visibility": "",
                "max_questions_total": per_topic_limit,
                "max_questions_per_topic": per_topic_limit,
                "metadata": {"seed_topic_code": topic_code},
                "is_active": True,
            }
        )

    for topic_code in SCIENCE_TOPIC_CODES:
        topic = topics_by_code[topic_code]
        rows.append(
            {
                "program": public_program_id,
                "subject": science_subject_id,
                "topic": topic["id"],
                "question_source_type": "platform_only",
                "difficulty_level": "",
                "question_type": "",
                "master_visibility": "",
                "max_questions_total": per_topic_limit,
                "max_questions_per_topic": per_topic_limit,
                "metadata": {"seed_topic_code": topic_code},
                "is_active": True,
            }
        )

    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--admin-username", default=DEFAULT_ADMIN_USERNAME)
    parser.add_argument("--admin-password", default=DEFAULT_ADMIN_PASSWORD)
    parser.add_argument("--public-hub-code", default=DEFAULT_PUBLIC_HUB_CODE)
    parser.add_argument("--preset-code", default=DEFAULT_PRESET_CODE)
    parser.add_argument("--institute-name", default="")
    parser.add_argument("--institute-code", default="")
    parser.add_argument("--email", default="")
    parser.add_argument("--phone", default="")
    parser.add_argument("--website", default="")
    parser.add_argument("--package-name", default="")
    parser.add_argument("--package-code", default="")
    parser.add_argument("--academic-year-name", default="2026-2027")
    parser.add_argument("--academic-year-start", default="2026-04-01")
    parser.add_argument("--academic-year-end", default="2027-03-31")
    parser.add_argument("--per-topic-limit", type=int, default=50)
    parser.add_argument("--enable-advanced-builder", action="store_true")
    parser.add_argument("--disable-shared-library-feature", action="store_true")
    args = parser.parse_args()

    stamp = datetime.now().strftime("%Y%m%d%H%M%S")
    institute_code = args.institute_code or f"TRL{stamp[-6:]}"
    institute_name = args.institute_name or f"Trial Scoped Institute {stamp}"
    package_code = args.package_code or f"trial_scoped_pkg_{stamp}"
    package_name = args.package_name or f"Trial Scoped Package {stamp}"
    email = args.email or f"{institute_code.lower()}@example.com"
    phone = args.phone or "9999999999"
    website = args.website or f"https://{institute_code.lower()}.example.com"

    token = login(args.base_url, args.admin_username, args.admin_password)
    client = ApiClient(base_url=args.base_url, token=token)

    institutes = fetch_results(client, "/api/v1/institutes/", query={"page_size": 200})
    public_hub = find_one(institutes, key="code", value=args.public_hub_code, label="public hub institute")

    programs = fetch_results(
        client,
        "/api/v1/academics/programs/",
        query={"page_size": 200, "institute": public_hub["id"]},
    )
    public_program = find_one(programs, key="code", value="CLS7", label="public Class 7 program")

    subjects = fetch_results(
        client,
        "/api/v1/academics/subjects/",
        query={"page_size": 200, "institute": public_hub["id"]},
    )
    math_subject = find_one(subjects, key="code", value="CLS7-MATH", label="public Math subject")
    science_subject = find_one(subjects, key="code", value="CLS7-SCI", label="public Science subject")

    topics = fetch_results(
        client,
        "/api/v1/academics/topics/",
        query={"page_size": 400, "institute": public_hub["id"]},
    )
    topics_by_code = {str(topic.get("code")): topic for topic in topics}
    required_topic_codes = MATH_TOPIC_CODES + SCIENCE_TOPIC_CODES
    missing_codes = [code for code in required_topic_codes if code not in topics_by_code]
    if missing_codes:
        raise RuntimeError(f"Missing required public-hub topic codes: {', '.join(missing_codes)}")

    scope_rows = build_scope_rows(
        public_program_id=public_program["id"],
        math_subject_id=math_subject["id"],
        science_subject_id=science_subject["id"],
        topics_by_code=topics_by_code,
        per_topic_limit=args.per_topic_limit,
    )

    package_response = client.request(
        "POST",
        "/api/v1/economy/admin/question-bank-packages/",
        payload={
            "institute": public_hub["id"],
            "name": package_name,
            "code": package_code,
            "description": "Scoped trial package with 200 Math + 200 Science question exposure.",
            "package_type": "subject_library",
            "ownership_type": "platform",
            "access_mode": "quota_limited",
            "is_public_catalog": True,
            "sort_order": 100,
            "metadata": {
                "bootstrap_kind": "trial_scoped_package",
                "math_topics": MATH_TOPIC_CODES,
                "science_topics": SCIENCE_TOPIC_CODES,
                "target_totals": {"math": 200, "science": 200},
            },
            "is_active": True,
            "scopes": scope_rows,
        },
    )
    package = package_response["data"]

    institute_response = client.request(
        "POST",
        "/api/v1/institutes/",
        payload={
            "name": institute_name,
            "code": institute_code,
            "email": email,
            "phone": phone,
            "website": website,
            "description": "Created by scoped package bootstrap script.",
        },
    )

    institute_id = institute_response["id"]
    onboarding_run_id = institute_response.get("onboarding_run_id")

    login_response = client.request(
        "POST",
        f"/api/v1/accounts/institutes/{institute_id}/create-login/",
        payload={"auto_generate": True},
    )

    preset_response = client.request(
        "POST",
        "/api/v1/academics/presets/apply/",
        payload={
            "institute": institute_id,
            "onboarding_run_id": onboarding_run_id,
            "preset_code": args.preset_code,
            "mode": "selected_subjects",
            "subject_codes": ["CLS7-MATH", "CLS7-SCI"],
            "academic_year_name": args.academic_year_name,
            "academic_year_start": args.academic_year_start,
            "academic_year_end": args.academic_year_end,
            "question_bank_package_enabled": True,
            "question_bank_package_code": package["code"],
            "advanced_builder_enabled": bool(args.enable_advanced_builder),
            "onboarding_profile_code": "TRIAL_FULL_ACCESS",
        },
    )

    feature_response = None
    if not args.disable_shared_library_feature:
        feature_response = client.request(
            "POST",
            "/api/v1/economy/admin/question-bank-feature-entitlements/",
            payload={
                "institute": institute_id,
                "feature_code": "QUESTION_BANK_SHARED_LIBRARY",
                "source_package": package["id"],
                "metadata": {
                    "source": "bootstrap_scoped_institute_package",
                    "package_code": package["code"],
                },
            },
        )

    entitlements = fetch_results(
        client,
        "/api/v1/economy/admin/institute-question-bank-entitlements/",
        query={"institute": institute_id, "page_size": 100},
    )
    package_entitlements = [
        item for item in entitlements if item.get("question_bank_package_code") == package["code"]
    ]

    result = {
        "institute": {
            "id": institute_id,
            "name": institute_name,
            "code": institute_code,
            "email": email,
            "website": website,
        },
        "login": login_response,
        "package": {
            "id": package["id"],
            "name": package["name"],
            "code": package["code"],
            "scope_count": package.get("scope_count"),
            "math_topic_codes": MATH_TOPIC_CODES,
            "science_topic_codes": SCIENCE_TOPIC_CODES,
            "per_topic_limit": args.per_topic_limit,
            "intended_totals": {"math": 4 * args.per_topic_limit, "science": 4 * args.per_topic_limit},
        },
        "preset_apply": {
            "onboarding_run": preset_response.get("onboarding_run"),
            "summary": preset_response.get("summary"),
            "access_results": preset_response.get("access_results"),
        },
        "shared_library_feature": feature_response.get("data") if isinstance(feature_response, dict) else None,
        "entitlements": package_entitlements,
    }

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - one-shot operator script
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
