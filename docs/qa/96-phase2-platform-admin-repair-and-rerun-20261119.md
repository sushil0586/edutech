# Phase 2 Platform Administrator Repair and Rerun

Date: 2026-11-19  
Verdict: BLOCKED  
Historical result preserved: `95-phase2-platform-admin-execution-20261119.md` remains the original FAIL record.

## Authorized change

The production dependency defect was repaired by adding the previously proven `redis==6.4.0` Python client to `edutech_backend/requirements.txt`. No other application source was changed by this continuation. The pre-existing dirty tree, including the existing `whitenoise` requirement, was preserved.

## Candidate and environment

- Source HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`; dirty tree preserved.
- Backend image: `edutech-phase2-backend:20261119`, manifest digest `sha256:5c8be2e2edb44b66b16887c92011e0e15a70e2c74c7faeb84e4a51742ce9b16f`.
- Web image: `edutech-phase2-web:20261119`, digest `sha256:26dbd5f65efbf2fc4075312779004e0c631d93c8a5d49ff42969b3cc0d953fa8`.
- Effective database: isolated PostgreSQL 16 database `phase2_cert`.
- Effective cache: isolated Redis 7.4; Python client `6.4.0`; real cache set/get returned `ok`.
- Email: Django in-memory backend; no provider credentials or external delivery.
- Browser origin: local-only `http://127.0.0.1:39200`.
- Browser engine/worker: Chromium, one worker, no retries.

## Verification results

| Slice | Result | Disposition |
|---|---:|---|
| Production build and TypeScript | PASS; 158 routes generated | Current repaired candidate built successfully |
| Backend PostgreSQL/Redis suites | 89 passed, 0 failed, 0 skipped in 206.202s | PASS with `SECURE_SSL_REDIRECT=False` only for Django's in-process HTTP client; deployed runtime keeps redirect enforcement |
| Initial auth/registration/admin gate | 5 passed, 0 failed | PASS after supported geography seeding and corrected local gateway routing |
| Expanded platform-admin browser slice | 14 passed, 12 failed, 3 skipped; 29 total | BLOCKED by missing deterministic role/data fixtures and one hard-coded test endpoint |

The first backend attempt under production redirect settings produced 65 failures and 17 errors because the in-process Django client received HTTP 301 responses. That harness mismatch is retained and was not treated as an application defect.

## Scenario disposition

- `EDU-AUTH-001`: PASS. Platform-admin authentication now succeeds with the supported Redis configuration.
- `EDU-AUTH-007`: PASS. Student and teacher registration entry paths complete the repaired authentication step.
- `EDU-PADM-001` through `EDU-PADM-010`: executable coverage was obtained for institute creation, validation, duplicate prevention, edit/cancel, deactivate/reactivate, onboarding profiles, and onboarding validation. These remain BLOCKED at package level until the frozen per-ID API/PostgreSQL/audit evidence is reconciled.
- `EDU-PADM-011` through `EDU-PADM-015`: BLOCKED by absent deterministic people, institute-role, academic-year, subscription-review, or multi-institute fixtures.
- `EDU-PADM-016`: browser/API audit coverage passed, but remains BLOCKED at package level pending the same exact-ID evidence reconciliation.
- Remaining frozen scenarios: NOT RUN.

Current frozen register: **2 PASS, 0 CONDITIONAL, 0 FAIL, 16 BLOCKED, 94 NOT RUN**. The 16 blocked cases are `EDU-PADM-001` through `EDU-PADM-016`; the repaired P1 Redis defect is closed locally and no unresolved product P0/P1 was confirmed by this continuation.

## Expanded-run findings

The 12 browser failures are not currently classified as product defects:

- Academic-year overlap expected a pre-existing academic year in the selected public institute.
- People duplicate and support-action cases expected pre-existing student/teacher rows or referred to stale institute identifiers.
- Economy-policy and institute-management negative cases lacked institute-role credentials.
- Subscription/review cases lacked an institute role or review request and three cases skipped explicitly.
- Multi-institute isolation expected at least two configured scopes.
- One management-mode spec bypasses the configured base URL and calls `127.0.0.1:9001`, which is not the admitted gateway.
- One institutes-workspace assertion expects legacy demo rows and a legacy table selector that are absent from the fresh fixture.

These prerequisites must be frozen as owned fixtures, or the affected tests must be corrected under separate test-maintenance authorization. No assertions were weakened and no unsupported business data was fabricated.

## Evidence and confidentiality

Screenshots and the Playwright result summary are retained under `docs/qa/evidence/phase2-platform-admin-20261119/repair-rerun/`. Token-bearing `error-context.md` files were deliberately excluded from retained evidence. The original failed attempt and its evidence remain unchanged.

## Cleanup

The campaign used one exact task-owned Compose project: `edutech-phase2-20261119`. Twelve institutes and four users existed immediately before teardown, including failed-test residue. Cleanup removed the complete task-owned PostgreSQL, media, static, network, and container set rather than deleting rows by a broad prefix. Post-cleanup inspection found **0 containers, 0 volumes, and 0 networks** matching the campaign name. External messages sent: zero.

## Next authorization

Phase 2 requires a bounded fixture-contract continuation: create deterministic institute-admin, student, teacher, academic-year, subscription-review, and second-institute fixtures in a fresh isolated PostgreSQL environment; correct the single hard-coded test endpoint; then rerun only the 14 blocked `EDU-PADM` cases with exact browser/API/database/audit mapping. Phase 3 is not authorized by this result.
