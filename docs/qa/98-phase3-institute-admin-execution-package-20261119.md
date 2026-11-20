# Phase 3 Institute Administrator Execution Package

Date: 2026-11-19  
Status: AUTHORIZED, IN PROGRESS  
Candidate: dirty working tree at `2221b9193b781fc22dac3e7684d199a06a4c8c7f`

## Authorized scope

Execute `EDU-IADM-001` through `EDU-IADM-016` in a fresh task-owned PostgreSQL/Redis environment. Necessary test and fixture repairs, retained browser/API/database/audit evidence, and exact campaign cleanup are authorized. Staging mutation, deployment, commit, push, and invented Product/QA dispositions are excluded.

## Frozen evidence map

| IDs | Contract | Primary executable evidence |
|---|---|---|
| `EDU-IADM-001`..`004` | Academic year, program, cohort and subject CRUD plus validation | Institute academic-setup browser mutation and API/audit suites |
| `EDU-IADM-005` | Topic and catalog consistency | Academic setup readback plus question authoring selectors |
| `EDU-IADM-006` | Teacher CRUD | Institute roster browser mutation with API/database reconciliation |
| `EDU-IADM-007` | Student CRUD | Institute roster browser mutation with API/database reconciliation |
| `EDU-IADM-008` | Teacher assignment lifecycle | Institute teacher-assignment mutation and rejection suites |
| `EDU-IADM-009` | Question create/update | Institute question mutation and browser validation suites |
| `EDU-IADM-010` | Comprehension content | Institute comprehension mutation and browser coverage suites |
| `EDU-IADM-011` | CSV preview/finalize | Institute question-import preview, mapping and finalize suites |
| `EDU-IADM-012` | Partial failure and replay | Import rejection/recovery plus persisted database and audit state |
| `EDU-IADM-013` | Licensed library access | Shared-library workspace/link and entitlement denial suites |
| `EDU-IADM-014` | Invalid references | Assignment, question and import rejection suites with non-mutation checks |
| `EDU-IADM-015` | Tenant isolation | Institute security/API checks and cross-tenant denial evidence |
| `EDU-IADM-016` | Audit, search and page states | API audit, search/filter, loading, empty and pagination evidence |

## Environment and ownership

- Compose project: `edutech-phase3-20261119`.
- Local gateway only: `127.0.0.1:39300`.
- Django production settings with PostgreSQL 16 and Redis 7.4.
- In-memory email backend; no external email, SMS or webhook delivery.
- Synthetic demo tenant and exact test-owned records only.
- One Playwright worker initially; mutating execution is owned by the primary agent.
- Optional review activity is read-only.

## Execution order

1. Verify effective PostgreSQL, Redis, frontend, backend and provider destinations.
2. Seed supported geography, demo role identities and complete academic fixtures.
3. Execute read-only institute workspaces and API/audit checks.
4. Execute academic, roster, assignment, question, comprehension and import mutations.
5. Execute licensed-library, invalid-reference and tenant-isolation cases.
6. Review retained desktop/mobile/cross-browser screenshots for applicable states.
7. Run bounded backend, TypeScript, Django and migration-drift regression.
8. Reconcile database/audit evidence and remove the exact Compose project and volumes.

## Stop conditions

Stop on tenant leakage, unauthorized mutation, audit misattribution, external delivery, ambiguous PostgreSQL identity, broad cleanup requirements, or candidate source changes during execution. Preserve failures rather than weakening assertions.

