# Phase 2 Platform Administrator Closure

Date: 2026-11-19  
Verdict: BLOCKED BY CONTRACT GAPS  
Candidate: dirty working tree at `2221b9193b781fc22dac3e7684d199a06a4c8c7f`

## Authorized scope

Close `EDU-PADM-001` through `EDU-PADM-016` in a fresh task-owned PostgreSQL/Redis environment, repair test-contract defects, retain independent browser/API/database/audit evidence, and clean all campaign resources. No deployment or source-control action was authorized.

## Changes

- `admin-institute-management-mode.mutable.spec.ts`: replaced two hard-coded backend URLs with the shared configured backend resolver.
- `admin-form-validation-browser-coverage.spec.ts`: replaced a stale institute UUID and exact eight-row assumption with authenticated dynamic fixture discovery and a minimum two-row contract.
- `admin-multi-institute-assignment-isolation.mutable.spec.ts`: moved fixture student creation to authenticated API setup, reused the original admin token for exact cleanup, and increased the bounded timeout.
- `admin-institute-subscription-request.mutable.spec.ts`: selected the cycle by its accessible label, opened the current support-operations queue, and asserted the persisted review status returned by the API after the pending-filter row disappeared.

Application business logic was not changed. The earlier `redis==6.4.0` production dependency repair remains included.

## Environment

- Compose project: `edutech-phase2-closure-20261119`.
- PostgreSQL 16 database: `phase2_cert`.
- Redis 7.4 with Python Redis client 6.4.0.
- Production-built backend and web images from the repaired Phase 2 candidate.
- Local-only gateway: `127.0.0.1:39200`.
- Email: in-memory backend; external delivery zero.
- Fixtures: supported geography, demo academic/auth seed, one second academic tenant, economy defaults, and exact task-owned roster/request rows.

## Execution results

| Execution | Result |
|---|---:|
| PostgreSQL/Redis backend regression carried from repaired candidate | 89 passed, 0 failed, 0 skipped |
| Initial Phase 2 closure browser pack | 24 passed, 5 failed, 3 skipped |
| Corrected duplicate create/edit validation rerun | 4 passed |
| Corrected two-tenant assignment-isolation rerun | 1 passed |
| Corrected subscription reject/approve rerun | 2 passed |
| Missing-request negative case | 1 skipped; pending fixture was not exposed by the current queue contract |
| Firefox/WebKit institute workspace | 2 passed |
| TypeScript | PASS |
| Django system check | PASS, 0 issues |
| Migration drift | PASS, no changes detected |

Distinct Chromium cases in the closure pack: **31 passed, 1 skipped** after corrections. Cross-browser verification added **2 passed** executions.

## Exact scenario verdicts

| IDs | Verdict | Evidence summary |
|---|---|---|
| `EDU-PADM-001`..`004` | PASS | Create, required/invalid input, duplicate rejection, inspect/read and refresh persistence |
| `EDU-PADM-005` | BLOCKED | Update passes; no supported stale-write/version-token contract exists for institute mutation |
| `EDU-PADM-006`..`008` | PASS | Suspend/reactivate and rejected-operation non-mutation |
| `EDU-PADM-009`..`010` | PASS | Blank, starter and trial onboarding profiles plus tracked run/task validation |
| `EDU-PADM-011`..`012` | PASS | People assignment and two-institute isolation with exact fixture cleanup |
| `EDU-PADM-013`..`014` | PASS | Subscription submit/reject/approve, entitlement reconciliation, and economy-policy enforcement |
| `EDU-PADM-015` | BLOCKED | Search and workspace state pass; exhaustive sortable-column and multi-page pagination contract is not exposed by the current directory |
| `EDU-PADM-016` | PASS | Audit attribution confirmed for platform and institute actors |

Phase 2 register: **14 PASS, 0 CONDITIONAL, 0 FAIL, 2 BLOCKED**. Including the two repaired authentication cases, the frozen global register is **16 PASS, 0 CONDITIONAL, 0 FAIL, 2 BLOCKED, 94 NOT RUN**.

## PostgreSQL and audit reconciliation

Audit rows were attributed only to the synthetic `demo-platform-admin` and `demo-institute-admin` identities. Evidence covered institute login controls, economy policy updates, subscription request creation/review, package and plan mutations, exam creation, and authentication. Rejected operations did not produce false success or unintended target mutation.

Failed attempts left seven `PW-MIAS` students, one `PW-MIAS` exam, and one pending negative-test request in the disposable database. These were retained until evidence capture and then removed with the entire exact campaign-owned PostgreSQL volume.

Post-cleanup verification: **0 campaign containers, 0 campaign volumes, and 0 campaign networks**. No external messages were sent.

## Evidence

Sanitized logs, screenshots, and checksums: `docs/qa/evidence/phase2-platform-admin-closure-20261119/`. Token-bearing error contexts were not retained. Historical failed attempts remain documented in reports 95 and 96.

## Contract decisions required

1. `EDU-PADM-005`: approve a stale-write/version-token requirement and implementation, or approve Not Applicable for institute records.
2. `EDU-PADM-015`: approve the generated exhaustive sort/pagination requirement, or narrow it to the currently supported search/filter workspace contract.

Phase 2 cannot be marked PASS until both receive explicit Product/QA disposition. Phase 3 is not authorized by this report.

## Superseding blocker closure

Both blockers were subsequently implemented and executed under the user's authorization to work on the blockers. See `100-phase2-platform-admin-blocker-closure-20261119.md`. This historical report and its original BLOCKED verdict remain preserved; the current Phase 2 verdict is PASS.
