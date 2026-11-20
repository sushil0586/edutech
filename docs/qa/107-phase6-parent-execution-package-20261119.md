# Phase 6 Parent Workflow Execution Package

Date: 2026-11-19
Status: AUTHORIZED / PRE-EXECUTION
Candidate HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`
Candidate state: dirty; all pre-existing tracked and untracked changes are preserved.

## Authorized scope

Phase 6 parent workflows only. No Phase 7 execution, commit, deployment, staging mutation, or public-environment testing is authorized.

## Frozen scenarios

| ID | Contract | Required evidence |
|---|---|---|
| EDU-PARN-001 | Active parent-child link is visible | Browser, API, PostgreSQL relationship row |
| EDU-PARN-002 | Unrelated child access is denied | API denial, browser non-disclosure, tenant/scope assertion |
| EDU-PARN-003 | Multiple linked children can be selected independently | Browser selection, child-specific API responses |
| EDU-PARN-004 | Parent sees permitted progress and published results | Browser, API, PostgreSQL result reconciliation |
| EDU-PARN-005 | Alerts are relationship-scoped and read state persists | Browser action, API response, PostgreSQL state |
| EDU-PARN-006 | Notification preferences persist | Browser action, API response, PostgreSQL JSON state |
| EDU-PARN-007 | Revoked relationship immediately loses visibility | API denial, browser removal/empty state, PostgreSQL status |
| EDU-PARN-008 | Empty and recoverable API-error states are usable | Rendered browser evidence, retry/recovery, accessibility |

## Isolated environment contract

- PostgreSQL container: `edutech-phase6-postgres-20261119`
- Database: `phase6_parent_cert`
- Database role: `phase6_parent`
- Backend: `127.0.0.1:39542`
- Production-built frontend: `127.0.0.1:39640`
- Fixture prefix: `P6P-20261119-`
- External notifications: disabled; no provider credentials supplied
- Redis/Celery: not started unless a parent contract proves it necessary
- Cleanup: exact campaign database/container and owned evidence only

## Admission gates

1. Verify effective Django database vendor is PostgreSQL and identity is `phase6_parent_cert` before seeding.
2. Apply current migration graph to the isolated database.
3. Seed only synthetic demo and `P6P-20261119-` fixtures.
4. Run backend parent regression and bounded browser scenarios with one worker.
5. Retain screenshots for populated, empty, error, mobile, and keyboard states.
6. Reconcile API, PostgreSQL, and rendered evidence before assigning verdicts.
7. Stop all task-owned processes and remove the isolated PostgreSQL resource after evidence capture.

## Planned execution

- Backend: parent API tests plus targeted multi-child, revocation, result visibility, and cross-tenant denial assertions.
- Browser: existing parent coverage plus a Phase 6 mutable workflow spec for child selection, alert read state, preferences, revocation, and failure recovery.
- Engines: Chromium first, then Firefox and WebKit after Chromium admission.
- Responsive/accessibility: 320 px reflow, keyboard traversal, accessible status/error states, and screenshot review.

