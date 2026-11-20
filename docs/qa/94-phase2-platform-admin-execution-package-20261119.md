# Phase 2 Platform Administrator Execution Package

Status: READY FOR AUTHORIZATION, NOT EXECUTED

## Proposed scope

Execute `EDU-AUTH-001` through `EDU-AUTH-010` where applicable to the platform-admin identity, plus `EDU-PADM-001` through `EDU-PADM-016`. Do not execute institute, teacher, student, parent, performance, recovery, or deployment phases under this package.

## Required admission

1. Name the exact candidate: current public deployment or a newly deployed discovery-tree candidate.
2. Authorize an isolated PostgreSQL-backed environment or explicitly authorize synthetic mutations on staging.
3. Verify frontend, BFF, Django, PostgreSQL, Redis, storage, and provider destinations before collection.
4. Predeclare synthetic institute/users and exact cleanup identifiers.
5. Suppress external email/SMS/webhooks and prove the effective route.
6. Use one mutating-test owner; optional reviewers remain read-only.
7. Start with one Playwright worker and retain failures, screenshots, traces, API/database/audit evidence, and cleanup receipts.

## Execution order

1. Authentication and role landing/denial.
2. Institute create/read/update, validation, duplicate and stale-write behavior.
3. Suspension/reactivation and rejected-operation non-mutation.
4. Onboarding, people assignment, and cross-tenant denial.
5. Subscription/economy policy and audit attribution.
6. Search, dropdown-only filters, sort, pagination, loading, empty/error states.
7. Keyboard, accessible status, desktop/tablet/320px review.
8. Bounded backend/frontend regression and exact-ID cleanup.

## Stop conditions

Stop immediately on tenant leakage, unauthorized mutation, audit misattribution, financial ledger corruption, non-synthetic external delivery, ambiguous database identity, or cleanup ownership mismatch.

Phase 2 needs separate user authorization. This package performs no tests or mutations.

