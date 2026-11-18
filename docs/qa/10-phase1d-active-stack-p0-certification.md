# Phase 1D Active-Stack P0 Certification

Date: 2026-10-14  
Baseline: `docs/qa/09-active-stack-p0-stabilization.md` and `docs/qa/04-master-qa-coverage-matrix.md`  
Active scope: Django, Next.js, APIs/integrations, and Expo/React Native. Flutter remains legacy and was not inspected, changed, executed, or counted.

## Release Decision

**Not production-ready.** The three outstanding exam-state parity gates are verified, but the student web release pack has six unresolved failures, the teacher results smoke has one failure, and the Expo/Maestro login-to-exams gate has not passed. Parent passed 3/3 and the focused admin/institute smoke cases passed; the broad operator core packs remain incomplete.

Correct scoring (`2.00` for two deterministic correct answers), published-result visibility, and duplicate-submit rejection retain the passing Phase 1C evidence. No scoring, result, submission, tenant-scope, or authorization production code was weakened or bypassed.

## Exam-State Certification

The lifecycle test creates a disposable institute, teacher, students, exam, questions, assignment, and schedule. A test-only Django shell helper mutates only that synthetic exam and returns persisted state. Browser and API assertions then exercise the real application controls.

| Gate | Persisted state | API evidence | Browser evidence | Result |
| --- | --- | --- | --- | --- |
| Inactive assignment | Selected assignment `is_active=false`; exam remains live | Detail `404`; start `400`, `reason_code=not_assigned` | Exam detail is unavailable and start cannot be reached | Pass |
| Future start | Assignment active; status `scheduled`; start/end one day ahead | Detail/start both report `before_window`; start `400` | Disabled `Not Available Yet`; future-window message captured | Pass |
| Expired window | Assignment active; status `live`; start/end in the past | Detail/start both report `after_window`; start `400` | Disabled `Not Available Yet`; expired-window message captured | Pass |
| Restore valid access | Assignment active; status `live`; current valid window | Persisted state attached; subsequent start returned `201` | Exam detail presented enabled start action | Pass |

The first expired-window diagnostic used status `completed`, which correctly produced the earlier policy result `exam_not_startable`. That was a fixture defect because status validation precedes schedule validation. The final fixture keeps the exam `live` with an elapsed end time and proves the intended `after_window` rule.

The expanded composite lifecycle run later failed outside these three gates: start returned `201` and the backend served the new attempt, but the test's generic URL wait expired during client rendering. The test now synchronizes on the real `POST /api/v1/attempts/start/` response, validates `201`, extracts the attempt ID, and waits for that exact route. TypeScript passes after this change; the complete long lifecycle was not repeated again because the state evidence was already captured and the focused role packs were the next required gate.

## Execution Counts

Counts use unique certification cases, not retries. The three browser parity scenarios are counted separately because they were the three explicit P0 cases recorded as not run in Phase 1C. The two focused Django cases repeat cases already included in the Phase 1C 266-test batch and therefore are execution evidence but are not added again to cumulative unique totals.

### Phase 1D selected cases

| Priority | Passed | Failed | Blocked | Skipped | Not run | Basis |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| P0 | 30 | 8 | 0 | 0 | 171 | 3 exam-state browser cases passed; student core 20/26 passed; role smoke added 4 new passes and 1 new failure; parent passed 3/3; one unique Maestro flow failed; 171 broad operator cases remain not run |
| P1 | 0 | 0 | 0 | 0 | 0 | No distinct P1 batch selected |
| P2 | 0 | 0 | 0 | 0 | 0 | No P2 batch selected |

### Cumulative unique active-stack cases

| Priority | Passed | Failed | Blocked | Skipped | Not run |
| --- | ---: | ---: | ---: | ---: | ---: |
| P0 | 41 | 8 | 0 | 0 | 171 |
| P1 | 256 | 0 | 0 | 0 | 0 |
| P2 | 0 | 0 | 0 | 0 | 0 |

Diagnostic invocations excluded from unique counts: one wrong-port Playwright environment failure, one expired-status fixture failure, one downstream lifecycle navigation failure after all three state gates passed, one interrupted development-server student pack, and two additional Maestro retries.

## Test Results

| Batch | Result | Evidence |
| --- | --- | --- |
| Focused backend inactive/future/expired policy | 2/2 passed in 20.014s | Existing Django cases; system check also reported no issues |
| Exam state browser/API/database parity | 3/3 scenario gates passed | JSON, screenshots, and trace under the state-parity evidence root |
| Web typecheck after test changes | Passed | `next typegen && tsc --noEmit --pretty false` |
| Student core, production Next server | 20 passed, 6 failed of 26 | Six retained traces/screenshots; failures are navigation or suite-timeout defects |
| Student core, development server diagnostic | 6 passed, 2 failed, 1 interrupted, 17 not run | Classified non-release environment run; superseded by production-server run |
| Cross-role release smoke | 7 passed, 1 failed of 8 | Admin 2/2, institute 2/2, student 3/3; teacher results refresh-URL contract failed |
| Parent browser/mobile pack | 3/3 passed | Desktop routes/settings/search and mobile dashboard/alerts/settings passed |
| Expo Android release build | Passed | `assembleRelease`; 529 Gradle tasks; APK installed on API 35 emulator |
| Maestro login-to-exams, Android emulator | Failed | Debug runs exposed startup/invocation defects; release run reached login but Android blocked the local cleartext HTTP endpoint |
| Maestro remaining seven student flows | Not run | Login-to-exams prerequisite did not pass |
| Remaining operator core cases | Not run | Admin 56, institute 65, institute-results 5, teacher 45; parent has no remaining cases in the selected pack |

The production student failures are:

1. `student-exam-key-workspace.spec.ts`: Tests-link navigation did not leave the exam-key error route.
2. `student-practice-workspace.spec.ts`: Ready filter click did not update `practice_filter=ready`.
3. `student-results-workspace.spec.ts`: Summary/review action did not navigate to the attempt route.
4. `student-review-workspace.spec.ts`: login/navigation exceeded the test budget.
5. `student-summary-review-source-persistence.spec.ts`: source drill link did not navigate from analytics.
6. `student-utility-workspace.spec.ts`: dashboard navigation ended with `ERR_ABORTED`/detached frame.

These are not converted to passes because no assertions were weakened and no skips were added.

## Defects And Root Causes

| Finding | Classification | Root cause / disposition |
| --- | --- | --- |
| Expired scenario returned `exam_not_startable` | Automation fixture defect, fixed | Fixture combined `completed` status with elapsed window; isolated window condition now uses `live` |
| Attempt start URL wait timed out after API `201` | Automation synchronization defect, fixed in source | Test now synchronizes on start response and exact returned attempt ID |
| Maestro credentials became `undefined` | Invocation/harness defect, identified | Maestro 2.6.1 requires explicit `-e` variables; corrected retry used explicit variables without exposing them in artifacts |
| Maestro clear-state startup misses role gate | Environment/mobile gate failure, unresolved | Debug APK/Metro startup produced blank screenshots before UI hierarchy became available; bounded readiness wait was raised from measured 30s to 60s, but retry still failed |
| Release APK cannot reach local HTTP API | Environment/security boundary, unresolved | APK embeds `http://10.0.2.2:9001` and emulator TCP reachability passes, but cleartext is allowed only in the debug manifest; production security was not weakened for the test |
| Student core navigation failures | Unresolved product-or-hydration defects | Reproduced against production Next server; trace analysis and focused fixes are required before rerunning the pack |
| Teacher result refresh URL contract | Unresolved product-or-test contract defect | Refresh retained the full query string while the test permits only no query or a `message` query; focused contract decision is required |

## Files Changed In Phase 1D

- `edutech_web/tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts`
- `nexora_student_mobile/.maestro/student-login-and-exams.yaml`
- `docs/qa/04-master-qa-coverage-matrix.md`
- `docs/qa/10-phase1d-active-stack-p0-certification.md`

No Flutter file was changed.

## Evidence Paths

- State parity root: `edutech_web/test-results/phase1d-state-parity-rerun-20261014212700/`
- State trace: `edutech_web/test-results/phase1d-state-parity-rerun-20261014212700/workflow-institute-full-ac-a9769--run-a-student-exam-attempt-chromium/trace.zip`
- State JSON/screenshots: the same directory's `inactive-assignment-access-denied.*`, `future-window-start-blocked.*`, `expired-window-start-blocked.*`, and `restored-live-access-state.json`
- Student production pack: `edutech_web/test-results/phase1d-student-core-production-20261014214700/`
- Cross-role smoke: `edutech_web/test-results/phase1d-role-release-smoke-20261014223000/`
- Parent release pack: `edutech_web/test-results/phase1d-parent-release-20261014223600/`
- Maestro debug/release artifacts: `~/.maestro/tests/2026-10-14_212726/`, `~/.maestro/tests/2026-10-14_213146/`, `~/.maestro/tests/2026-10-14_214313/`, and `~/.maestro/tests/2026-10-14_221409/`
- Release APK: `nexora_student_mobile/android/app/build/outputs/apk/release/app-release.apk`
- Preserved Phase 1C scoring evidence: `edutech_web/test-results/phase1c-isolation-final-20261014205043/`

Artifacts contain synthetic/demo identifiers and no attached passwords or access tokens.

## Remaining P0 Gates

1. Diagnose and close the six student production-pack failures, then obtain 26/26 on an uncontended release environment.
2. Obtain a passing Expo release-build Maestro login/exams flow, then execute exams detail, results, result timeline, review, review pagination, active attempt, and analytics/logout.
3. Resolve the teacher results refresh contract, then execute the remaining 56 admin, 65 institute, 5 institute-results, and 45 teacher cases. Parent is green at 3/3.
4. Rerun the complete composite exam lifecycle once with the exact-response synchronization change to reconfirm scoring/result/duplicate-submit behavior in the same final trace.

## Recommended Next Batch

Phase 1E should be a narrow navigation and mobile-runtime stabilization batch: reproduce each of the six retained web traces individually, distinguish slow server rendering from missing client navigation, fix only confirmed source or synchronization defects, rerun the six focused cases, and then rerun student core. In parallel, use the bundled Android release APK rather than Metro/debug mode for Maestro. Only after both gates pass should the other role core packs run, followed by cross-browser and accessibility checks.
