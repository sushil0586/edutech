# Phase 13 Final Regression Closure

Date: 2026-11-20  
Verdict: **PASS after bounded deployment and public-verification continuations**  
Candidate: local dirty source at HEAD `2221b9193b781fc22dac3e7684d199a06a4c8c7f`  
Final source fingerprint: `a870e5a9effefb1f9d20f7f7905cb835d1ae6c3e874fc1bca421a1ab02c147b4`

Phase 13 exercised the current local source candidate in an isolated PostgreSQL environment. It did not deploy, commit or mutate the public candidate. The frozen 112-scenario register remains **104 PASS, 0 CONDITIONAL, 0 FAIL, 0 BLOCKED, 8 NOT RUN** because Phase 13 is a regression campaign, not a new frozen-scenario wave.

## Environment Admission

- PostgreSQL container: `edutech-phase13-postgres-20261120`.
- Effective database: PostgreSQL 16.15, database `phase13_final_regression`, role `phase13_final`, port `40131`.
- Django email backend: in-memory; no provider credentials or external notification routing.
- Browser and backend used task-owned ports `40130` and `40132`.
- Public checks were read-only.

## Gate Results

| Gate | Result | Evidence |
|---|---|---|
| Django/PostgreSQL | PASS | 536/536 tests passed in 759.536 seconds; Django system check and migration drift passed. |
| Frontend static/build | PASS | TypeScript passed; production build completed 158 routes; ESLint completed with 0 errors and 40 pre-existing warnings. |
| Three-engine critical regression | PASS | 48/48 across Chromium, Firefox and WebKit. |
| AXE route audit | PASS | 6/6 role-group audits passed. |
| Chromium smoke | PASS | 6/6 journeys passed after correcting one stale destination assertion. |
| Release smoke | PASS | 8/8 passed after correcting the Next 16 server-action transport assertion. |
| Operator core | PASS with declared skips | Admin 57 passed/1 skipped; institute 65 passed/2 skipped; institute results 5 passed; teacher 45 passed initially and the single failed teacher-exam case passed after repair. |
| Student current-data core | PASS | 18/18 selected current-data workflows passed. |
| Parent/current connected checks | PASS after bounded continuation | A fresh isolated PostgreSQL continuation recreated the frozen Phase 6 fixture contract. Parent and connected checks passed 18/18 across Chromium, Firefox and WebKit; the exact-ID revoked-scope transition passed 1/1 and was restored. See `docs/qa/125-phase13-parent-fixture-closure-20261120.md`. |
| Public sibling health | PASS | Learn, HRMS and Finacc each returned HTTPS 200 with valid TLS from `65.0.231.86`. |
| Deployed Learn runtime | PASS readback | Backend, web and API gateway containers were running and healthy with immutable image IDs recorded. |
| Cleanup | PASS | Exact PostgreSQL container removed; ports `40130`, `40131` and `40132` verified closed. |

## Defects And Corrections

1. **Teacher exam zero-result filter state**: a valid filter returning no rows was incorrectly rendered as the global no-scope state, removing filter controls. The page now reserves the global empty state for an unfiltered empty scope and preserves controls plus the recoverable no-match state for active filters.
2. **Student smoke destination contract**: the test allowed an `Open practice` or `Practice again` action but rejected `/app/practice`. The destination assertion now matches the action contract.
3. **Next server-action transport contract**: the teacher results test required HTTP 303 even though Next 16 returned HTTP 200 with the valid `x-action-redirect`. The test now accepts 200 or 303 while retaining header, final URL, render and reload assertions.
4. **Teacher live-filter fixture assumption**: the test required a live exam despite a valid zero-result fixture. It now verifies either a visible exam action or the explicit no-match state.

Changed paths and SHA-256 values are frozen in `candidate-fingerprint-final.txt`. No screenshot baseline was updated.

## Preserved Failed Attempts

- The initial 552-test selector mixed staging-only, mutable and external-seed contracts and was stopped after demonstrating that the selector was not an admissible local regression boundary.
- Backend discovery and shell-splitting failures are preserved before the explicit 536-test module invocation.
- Incorrect Django seed settings, the production-server API-target restart error and all browser failure/rerun evidence are preserved.
- The two Parent Phase 6 fixture failures remain visible; they were not converted into PASS or silently excluded from the report.

## Public Candidate Boundary

The repaired candidate was deployed on 2026-11-20 as `phase13-20261120T053600Z`:

- backend: `sha256:9c3fd54de70ddab2a6b0c6c8fc4601a7dd742a624ef9ed7aca3a617b1c779ea6`
- web: `sha256:b3948e23b29506597a3f5274bc724101b71dea3e3cd6a676f685e3b9fd9bb8df`
- gateway: `sha256:78bd35025c7ba85961dd149ae670315129954e77abe2383ac47c89106b35ade9`

Runtime identity, unauthenticated health and authorized authenticated public workflows passed. The seven exact receipt-owned synthetic users and one synthetic tenant were removed and reconciled to zero after execution. See `docs/qa/126-phase13-deployment-and-public-verification-20261120.md` and `docs/qa/127-phase13-public-authenticated-closure-20261120.md`.

## Phase Boundary

Phase 13 blockers are closed. Deployment, runtime identity, authenticated public workflows and exact synthetic-fixture cleanup passed in reports 126 and 127. Phase 14 must separately reconcile the eight shared-authentication NOT RUN scenarios before final certification.

## Evidence

Primary evidence is under `docs/qa/evidence/phase13-final-regression-20261120/`. Historical failures are retained alongside corrected reruns. Fixture passwords in seed output were redacted before custody.

The parent-fixture continuation is retained separately under `docs/qa/evidence/phase13-parent-closure-20261120/`. It closes the local parent/connected evidence gap without overwriting the original failures.

Phase 14 was not authorized or started.
