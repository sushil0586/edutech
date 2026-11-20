# Phase 5 Student Workflow Execution Package

Date: 2026-11-19  
Authorization: isolated student workflow execution and bounded blocker repair  
Candidate HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f` plus preserved dirty working tree  
Status: CLOSED - 16 PASS

## Environment contract

- PostgreSQL 16 container: `edutech-phase5-postgres-20261119`.
- Database: `phase5_student_cert` on `127.0.0.1:39621`.
- Redis container: `edutech-phase5-redis-20261119` on `127.0.0.1:39622`; not used by Django because the current virtualenv lacks the declared Python Redis package.
- Django: `config.settings.dev`, planned loopback port `39522`.
- Production-built Next.js: planned loopback port `39620`.
- Email: Django locmem backend. No payment, email, SMS, webhook, or production-provider delivery.
- Browser mutation: synthetic demo identities only, one Playwright worker initially.
- Cleanup: exact campaign-created attempts/exams/economy rows followed by removal of both named containers.

## Scenario mapping

| IDs | Required execution |
|---|---|
| `EDU-STUD-001`..`004` | Exam list/detail, eligibility, key admission, attempt start, inactive/upcoming/foreign exam denial and database non-mutation. |
| `EDU-STUD-005`..`008` | Answer save/autosave, refresh/resume, timeout rejection, final submit and replay/exactly-once integrity. |
| `EDU-STUD-009`..`012` | Result release visibility, review scope, practice lifecycle and analytics consistency. |
| `EDU-STUD-013`..`016` | Wallet/economy ledger, subscription entitlement, notification persistence and profile/settings behavior. |

## Admission evidence

- Effective database observed as PostgreSQL 16.15, database `phase5_student_cert`, loopback host.
- All migrations through current graph applied successfully.
- Demo authentication, exam-family, showcase, AWS and multi-subject fixtures seeded.
- The initial Redis-backed seed stopped before completion because the local virtualenv lacks `redis`; the idempotent seed then passed with Django local-memory cache. Redis-backed behavior is excluded from PASS evidence unless the dependency is separately authorized and admitted.

## Hard gates

- No unresolved P0/P1 workflow, tenant, answer, submission, result or financial-integrity failure.
- UI success must reconcile with API and PostgreSQL state.
- Rejected and replayed requests must prove non-mutation.
- Optional fixture-driven skips remain visible and cannot be counted as PASS.
- No deployment, commit, push, public-stage mutation or Phase 6 execution.

## Final scenario verdicts

| ID | Verdict | Current-candidate evidence |
|---|---|---|
| `EDU-STUD-001` | PASS | Exam discovery, detail, eligible/upcoming/closed/star-gated states and current policy feedback passed in the browser. |
| `EDU-STUD-002` | PASS | Access-key admission and invalid-key behavior passed with the current publish control contract. |
| `EDU-STUD-003` | PASS | Attempt start and long-session runtime passed against PostgreSQL. |
| `EDU-STUD-004` | PASS | Inactive, unavailable and unauthorized exam paths denied start without creating an unintended attempt. |
| `EDU-STUD-005` | PASS | Answer save and runtime controls passed; backend attempt workspace regression passed. |
| `EDU-STUD-006` | PASS | Refresh/resume and long-session continuity passed. |
| `EDU-STUD-007` | PASS | Closed-window and timeout rejection contracts passed with truthful policy feedback. |
| `EDU-STUD-008` | PASS | Final submit, replay and exactly-once result behavior passed in browser/backend regression. |
| `EDU-STUD-009` | PASS | Released-result visibility and post-submit workspace passed. |
| `EDU-STUD-010` | PASS | Review authorization and review workspace passed. |
| `EDU-STUD-011` | PASS | Practice selection, attempt, submit and review lifecycle passed after selecting the exact created exam. |
| `EDU-STUD-012` | PASS | Analytics and result consistency passed in the student workspace. |
| `EDU-STUD-013` | PASS | Admin support grant produced a visible, reconciled wallet ledger credit; economy backend regression passed. |
| `EDU-STUD-014` | PASS | The existing self-service purchase flag was enabled consistently in an isolated Django/Next.js environment. Star-pack and subscription requests remained pending without optimistic credit; admin confirmation produced completed order, subscription and wallet-ledger state. |
| `EDU-STUD-015` | PASS | Notification read/filter/grouping URL continuity and navigation handoffs passed. |
| `EDU-STUD-016` | PASS | Dashboard, profile, settings, logout control, search and utility navigation passed. |

## Executed verification

- Browser: 37 distinct passing executions across the admitted student slices; Chromium covered all executable workflows, Firefox/WebKit contributed four shell/runtime passes, and eight keyboard/mobile executions passed.
- Browser continuation: the request-enabled economy pack passed 3/3. Failed locator, fixture, stale-contract and authentication attempts were retained before corrected reruns.
- Django/PostgreSQL: 98 attempt/result tests passed and 87 economy tests passed, for 185 passed and zero failed.
- Production Next.js build: PASS, 158 routes.
- TypeScript: PASS (`next typegen && tsc --noEmit`).
- Targeted ESLint: PASS for the four modified student workflow specs.
- Django system check: PASS, zero issues.
- Migration drift: PASS, no changes detected.
- Cross-browser: Firefox and WebKit student shell/runtime slice, 4/4 passed.
- Responsive/keyboard: 8/8 passed.

## Defects and repairs

- Reconciled stale accessible names from `Sync Marks` to `Sync Scores` and from `Publish Exam` to the supported availability control.
- Reconciled current closed-window and star-lock policy feedback without weakening assertions.
- Scoped practice execution to the exact created exam and accepted the supported `End Test` runtime action.
- Reconciled economy support operations to the current tab and labelled student selector.
- No product P0/P1 defect remains in the 15 executable PASS scenarios.

## Execution incident

One shell continuation initially used `POSTGRES_*` variables even though this repository reads `DB_*`. That command reached the developer's default local database instead of the disposable Phase 5 database. The exact synthetic user and student created there were deleted and verified absent. The economy seed was idempotent but reported updates to existing default rows and one referral-program creation; authoritative pre-state for those local rows was unavailable, so they were not broadly reverted. No public, staging or production database was contacted. All subsequent commands used and verified `DB_HOST=127.0.0.1`, `DB_PORT=39621`, and `DB_NAME=phase5_student_cert`.

## Phase verdict

Phase 5 is **PASS**: all 16 mandatory IDs pass. `EDU-STUD-014` was closed using the existing `STUDENT_SELF_SERVICE_PURCHASES_ENABLED` configuration consistently across Django and Next.js; no assisted-pilot default or business rule was removed. Phase 6 was not authorized or started.

## Cleanup receipt

- Ownership-verified dry-run found six residual Phase 5 exam IDs plus the exact campaign student identity.
- All six exam IDs, the campaign user/student and dependent wallet/referral rows were deleted; verification returned zero matches.
- Loopback Django and Next.js processes were stopped.
- `edutech-phase5-postgres-20261119` and `edutech-phase5-redis-20261119`, including anonymous volumes, were removed.
- Ports `39522`, `39620`, `39621`, and `39622` were verified clear.
