# Phase 1 Master Scenario Register

Frozen denominator: 112 scenarios  
Current status: 111 PASS, 1 FAILED, 0 BLOCKED, 0 NOT RUN  
Purpose: stable workflow contracts for Phases 2-12; Phase 1 does not execute them.

## Evidence contract

Every scenario requires the applicable browser outcome, API status and authenticated role, PostgreSQL before/after state, tenant ownership, audit attribution, validation/loading/success/error feedback, accessibility state, responsive evidence, rejected-operation non-mutation, and exact fixture cleanup. `PASS` requires all mandatory applicable evidence; a visible toast alone is insufficient.

| IDs | Phase | Stable scenarios | Priority |
|---|---:|---|---|
| `EDU-AUTH-001`..`006` | 2-6 | Login success; invalid login; lock/rate behavior; password recovery; password reset; logout/session invalidation | P0/P1 |
| `EDU-AUTH-007`..`010` | 2-6 | Registration validation; duplicate identity; profile completion; role-correct landing/route denial | P1 |
| `EDU-PADM-001`..`004` | 2 | Institute create; required/invalid fields; duplicate prevention; inspect/read persistence | P1 |
| `EDU-PADM-005`..`008` | 2 | Institute update/stale update; suspend; reactivate; rejected mutation non-mutation | P0/P1 |
| `EDU-PADM-009`..`012` | 2 | Onboarding profile/run; task status; people assignment; cross-tenant denial | P0/P1 |
| `EDU-PADM-013`..`016` | 2 | Subscription request/review; economy policy; search/filter/sort/page; audit attribution | P1/P2 |
| `EDU-IADM-001`..`004` | 3 | Academic year/program/cohort/subject CRUD and validation | P1 |
| `EDU-IADM-005`..`008` | 3 | Topic/catalog consistency; teacher CRUD; student CRUD; assignment lifecycle | P0/P1 |
| `EDU-IADM-009`..`012` | 3 | Question create/update; comprehension content; CSV preview/finalize; partial/replay handling | P1 |
| `EDU-IADM-013`..`016` | 3 | Licensed library access; invalid reference; tenant isolation; audit/search/page states | P0/P1 |
| `EDU-TCHR-001`..`004` | 4 | Teacher scope; question CRUD; import; licensed-content request/link | P0/P1 |
| `EDU-TCHR-005`..`008` | 4 | Exam create; builder validation; slot assignment; schedule conflict/concurrency | P1 |
| `EDU-TCHR-009`..`012` | 4 | Publish; monitor; evaluate/review; result release and immutable history | P0/P1 |
| `EDU-STUD-001`..`004` | 5 | Exam visibility/eligibility; access key; attempt start; unauthorized exam denial | P0/P1 |
| `EDU-STUD-005`..`008` | 5 | Answer save/autosave; refresh/resume; timeout; final submit/exactly-once replay | P0/P1 |
| `EDU-STUD-009`..`012` | 5 | Result visibility; review authorization; practice; analytics consistency | P0/P1 |
| `EDU-STUD-013`..`016` | 5 | Wallet ledger; subscription/order; notifications; profile/settings | P0/P1 |
| `EDU-PARN-001`..`004` | 6 | Child link; unrelated-child denial; multiple children; progress/results visibility | P0/P1 |
| `EDU-PARN-005`..`008` | 6 | Alerts/read state; preferences; relationship revocation; empty/error states | P0/P1 |
| `EDU-E2E-001`..`006` | 6 | Institute-to-academics; assignment-to-exam; publish-to-attempt; submit-to-result; result-to-parent; complete audit/notification reconciliation | P0/P1 |
| `EDU-SEC-001`..`006` | 8 | RBAC matrix; tenant IDOR; token lifecycle; CSRF/CORS; upload controls; secret/provider isolation | P0 |
| `EDU-SEC-007`..`010` | 8 | Stale writes; concurrent mutation; replay/idempotency; rejected-operation non-mutation | P0/P1 |
| `EDU-A11Y-001`..`006` | 9 | Keyboard/focus; dialogs; forms/errors; tables; live regions/toasts; 320px reflow | P1/P2 |
| `EDU-PERF-001`..`004` | 10 | Browser/API latency; bounded concurrency; shared-host resource isolation; overload recovery | P0/P1 |
| `EDU-REC-001`..`004` | 11 | Database backup; media backup; isolated restore/reconciliation; RPO/RTO rehearsal | P0 |
| `EDU-OPS-001`..`004` | 12 | Health/alerts; certificate/capacity monitoring; failed deployment rollback; reboot/admin runbook | P0/P1 |

## Denominator by phase

| Phase | Count | Current result |
|---|---:|---|
| Shared authentication | 10 | 9 PASS, 1 FAIL (`EDU-AUTH-006`) |
| Platform administrator | 16 | 16 PASS |
| Institute administrator | 16 | 16 PASS |
| Teacher | 12 | 12 PASS |
| Student | 16 | 16 PASS |
| Parent | 8 | 8 PASS |
| Connected lifecycle | 6 | 6 PASS |
| Security/integrity | 10 | 10 PASS |
| Accessibility/visual | 6 | 6 PASS |
| Performance | 4 | 4 PASS |
| Recovery | 4 | 4 PASS |
| Operations | 4 | 4 PASS |

Authentication scenarios are shared prerequisites and are counted once in the frozen 112-scenario denominator. Role-phase reports must reference them without double-counting.

## 2026-11-20 Evidence Closure Correction

The unchanged deployed candidate clears browser cookies on logout, but direct replay of the captured access and refresh tokens remains valid. `EDU-AUTH-006` is therefore FAIL and supersedes its prior same-agent PASS. See `132-phase14-independent-evidence-closure-result-20261120.md`.
