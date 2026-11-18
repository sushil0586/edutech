# Active Stack P0 Stabilization

Date: 2026-10-14  
Baseline: `docs/qa/08-full-repository-recursive-audit.md`  
Active scope: Next.js web, Django API/database, integrations, and Expo/React Native mobile.  
Explicit exclusion: Flutter is legacy and is not included in this phase's findings, counts, recommendations, or readiness assessment.

## Outcome

The browser score mismatch is resolved and classified as a Playwright synchronization defect, not a backend scoring defect. A fresh trace-enabled browser run persisted two distinct correct answers, submitted the attempt, generated and published the result, and returned `final_score = 2.00` as expected.

The web TypeScript gate, Next.js production build, Django system check, Expo TypeScript gate, focused P0 backend pack, and broad Django discovery batch now pass. The product is **not certified as production-ready** because mandatory browser parity for inactive assignments and future/expired windows, wider role release packs, and Expo device execution remain outstanding.

## Final Test Counts

These are non-overlapping, unique automated test cases from the final clean runs. The 10 focused P0 backend cases are included in the 266-test broad Django run, so the remaining 256 broad cases are counted as P1 rather than counted twice.

| Priority | Passed | Failed | Blocked | Skipped | Not run | Basis |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| P0 | 11 | 0 | 0 | 0 | 3 | 10 focused Django API/database cases plus 1 composite Playwright lifecycle; direct browser parity for inactive assignment, future window, and expired window remains not run |
| P1 | 256 | 0 | 0 | 0 | 0 | Additional unique cases in the 266-test Django accounts/exams/attempts/results batch |
| P2 | 0 | 0 | 0 | 0 | 0 | No P2 cases selected for this stabilization batch |
| **Total executed unique cases** | **267** | **0** | **0** | **0** | **3** | Static/build gates are reported separately below |

Intermediate diagnostic failures are not hidden by the final tally:

- The first isolation-expanded browser run failed because the test expected the student results collection to be empty. The endpoint ignored `?exam=` and correctly returned only that authenticated student's unrelated results; no target exam/attempt result leaked. The assertion now checks the security invariant directly.
- One focused Django command used the correct test method under the wrong class label and produced a unittest loader error. The label was corrected, the individual case passed, and the complete clean 10-case pack then passed.
- The first broad Django run after resolving discovery exposed two stale assumptions in the moved legacy exam tests. Both fixtures were repaired and the complete 266-test rerun passed.

## Execution Results

| Gate or batch | Result | Count / evidence |
| --- | --- | --- |
| Focused P0 Django API/database pack | Passed | 10/10 in 43.732s |
| Broad Django accounts/exams/attempts/results | Passed | 266/266 in 458.127s |
| Focused relocated legacy exam module | Passed | 11/11 in 0.970s |
| Django system check | Passed | `System check identified no issues (0 silenced)` |
| Focused Playwright exam lifecycle, Chromium, trace on | Passed | 1/1 in 1.5m |
| Trace archive integrity | Passed | `unzip -t` reported no errors; final trace is 23 MB |
| Web TypeScript | Passed | `next typegen && tsc --noEmit --pretty false` |
| Next.js production build | Passed | 153 static pages generated; build and route collection completed |
| Expo/React Native TypeScript | Passed | `tsc --noEmit` |
| Full 440-spec Playwright suite | Not run | Intentionally deferred until mandatory P0 browser parity is complete |
| Expo Maestro/device suite | Not run | Emulator/device evidence is not available in this phase |

## P0 Score Mismatch Root Cause

### Reproduction

The retained Phase 1B trace showed a published result score of `1.00` after the test intended to save two correct answers. Backend and database evidence showed only one saved answer. The server therefore calculated the persisted state correctly.

### Trace

The original test clicked `Save & Next`, matched generic `/saved/i` text that was already present in the attempt UI, and used a URL assertion that was already true because the current URL contained a `question` parameter. It then reloaded while the Next.js server action was still pending. The same missing persistence wait existed before final submission for the second answer.

The false signal was in test timing:

1. The UI click started an asynchronous server action.
2. Existing text and the existing query parameter satisfied the test's waits.
3. Reload or submit raced the pending save.
4. One `StudentAnswer` row existed at submission.
5. `calculate_attempt_score` correctly produced `1.00`, and result generation copied that value.

### Fix And Regression

`edutech_web/tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts` now:

- polls `/api/v1/attempts/{attemptId}/detail/` until the first selected option is persisted;
- waits for the current question ID to change, rather than merely matching any `question` query parameter;
- polls until two distinct question IDs have persisted `Option A` selections;
- attaches pre-submit and post-submit attempt JSON;
- asserts submitted status, two attempted questions, two correct answers, and exact score `2.00`;
- retains duplicate-submit and published-result assertions.

No production scoring code was changed. Relevant production flow remains:

- request handling: `edutech_backend/apps/attempts/views/__init__.py` (`save_answer_action`);
- answer evaluation and submission scoring: `edutech_backend/apps/attempts/services.py` (`save_answer`, `calculate_attempt_score`, `submit_attempt`);
- result projection: `edutech_backend/apps/results/services.py` (`result.final_score = attempt.final_score`).

Final evidence proves:

- two distinct persisted questions;
- both selected `Option A`;
- both `is_correct = true`;
- both `marks_awarded = 1.00`;
- submitted `attempted_questions = 2` and `correct_answers = 2`;
- attempt and published result `final_score = 2.00`;
- result percentage `40.00` for a five-question exam;
- duplicate submit rejected with HTTP 400.

Classification: **test automation defect, fixed**. Backend scoring mismatch: **false positive**.

## Authorization And Isolation

| Scenario | API/database | Browser | Result |
| --- | --- | --- | --- |
| Assigned student visibility/start | Verified | Verified | Pass |
| Draft/unpublished exam | Verified | Verified | 404/blocked |
| Same-institute unassigned student | Verified | Verified | 404/blocked |
| Inactive selected-student assignment | Verified | Not directly seeded through a supported browser/API setup surface | Backend pass; browser parity not run |
| Future-scheduled exam start | Verified | Not run | Backend pass; browser parity not run |
| Expired exam start | Verified | Not run | Backend pass; browser parity not run |
| Cross-institute student exam access | Verified | Verified | 404; exam absent in UI |
| Cross-student attempt access | Verified | Verified | 404; target title absent in UI |
| Cross-student result access | Verified | Verified | Authenticated student's result list contains no target exam or attempt |
| Unauthorized teacher exam access | Verified | Verified | 404; target title absent in teacher UI |
| Unauthenticated attempt API | Verified | N/A | 401 |
| Institute result generation/rank/publication | Verified | Browser-driven session plus direct API evidence | Pass |
| Student published result visibility | Verified | Verified | Pass, score `2.00` |

The student results endpoint currently does not apply the supplied `?exam=` filter. This did not expose another student's data because queryset ownership scoping remained effective, but the filter behavior is an unresolved P1 API contract defect.

## Web TypeScript Stabilization

The baseline contained 73 errors in 18 Playwright specs:

| TypeScript code | Count | Root cause group |
| --- | ---: | --- |
| `TS18047` | 35 | Values narrowed by Playwright assertions or `test.skip` remained nullable to TypeScript |
| `TS2345` | 26 | Nullable IDs/data passed into helpers requiring concrete strings |
| `TS2339` | 6 | Incorrect fixture typing and nullable locator usage |
| `TS2304` | 6 | Missing `Page` type/import or missing local selector helper |

Fixes use explicit runtime guards, concrete ID initialization, correct Playwright `Page` imports/types, and restoration of the missing selector helper. No `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, exclusion, or weakened assertion was introduced.

Affected specs:

- `admin-gre-results-contract.spec.ts`
- `admin-language-family-preset-builder-handoff.spec.ts`
- `admin-multi-subject-results-contract.spec.ts`
- `institute-family-preset-builder-handoff.spec.ts`
- `institute-gre-results-contract.spec.ts`
- `institute-mobile-exams-workflow.spec.ts`
- `institute-multi-subject-results-contract.spec.ts`
- `institute-teacher-assignments-mutable.spec.ts`
- `teacher-advanced-builder-browser-buttons.spec.ts`
- `teacher-advanced-builder-visual.spec.ts`
- `teacher-gre-results-contract.spec.ts`
- `teacher-multi-subject-results-contract.spec.ts`
- `teacher-question-bank-shared-library-request.mutable.spec.ts`
- `teacher-results-analysis-populated.mutable.spec.ts`
- `teacher-results-live-populated.mutable.spec.ts`
- `teacher-results-multi-learner.mutable.spec.ts`
- `teacher-results-mutable.spec.ts`
- `teacher-review-mutable.spec.ts`

## Django Discovery Collision

Root cause: `apps.exams.tests` existed both as `apps/exams/tests.py` and as the package directory `apps/exams/tests/`. Python/unittest discovery could not consistently import the same module name from both locations.

Resolution:

- moved the legacy module into the existing package as `apps/exams/tests/test_core.py`;
- made no production route/model/service change for discovery;
- repaired two newly exposed stale tests by creating their required `ExamSection` fixture explicitly and linking the exam question to it;
- verified the moved module (`11/11`) and broad app-label discovery (`266/266`).

Classification: **confirmed test architecture defect, fixed**.

## Files Changed

Backend product/regression:

- `edutech_backend/apps/accounts/views/__init__.py`
- `edutech_backend/apps/accounts/tests/test_auth_access.py`
- `edutech_backend/apps/exams/tests.py` (relocated)
- `edutech_backend/apps/exams/tests/test_core.py` (new package location)

Web lifecycle, evidence, and typing:

- `edutech_web/tests/e2e/page-objects/admin/admin-institute-onboarding.po.ts`
- `edutech_web/tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts`
- the 18 Playwright specs listed in the TypeScript section above

Documentation:

- `docs/qa/04-master-qa-coverage-matrix.md`
- `docs/qa/09-active-stack-p0-stabilization.md`

Flutter files changed: **none**.

## Evidence Paths

Final browser evidence root:

`edutech_web/test-results/phase1c-isolation-final-20261014205043/workflow-institute-full-ac-a9769--run-a-student-exam-attempt-chromium/`

Primary artifacts:

- `trace.zip`
- `attempt-before-submit.json`
- `attempt-after-submit.json`
- `phase1b-lifecycle-evidence.json`
- `draft-exam-access-denied.json`
- `unassigned-student-access-denied.json`
- `student-exam-detail-before-start.png`
- `student-attempt-question-loaded.png`
- `student-attempt-before-submit.png`
- `student-published-result-visible.png`
- `pw-full-access-exam-1791991248623195-questions.csv`

The evidence contains synthetic identifiers and the existing demo-role response data required for isolation assertions. It does not attach passwords, access tokens, or production data.

## Remaining Blockers

P0:

1. Direct browser parity remains unexecuted for inactive assignment, future-scheduled start denial, and expired-window denial. Backend API/database tests pass for all three.
2. The complete role-level P0 release packs have not been rerun after the TypeScript repairs; this phase intentionally avoided all 440 Playwright specs.
3. Expo exam/attempt/result flows have static type evidence only; no emulator/device Maestro evidence exists for this phase.

P1:

1. `/api/v1/student/results/?exam=...` does not apply the exam filter, although ownership isolation is enforced.
2. The successful lifecycle logs a hydration mismatch in `AttemptResiliencePanel` after save/recovery.
3. The advanced-builder preview logs duplicate React keys for repeated topic rows.
4. Cross-browser and accessibility regression packs were not run.

## Recommended Next QA Batch

Phase 1D should be an active-stack release-pack batch:

1. Add deterministic browser setup for inactive assignment and future/expired exam states without introducing a production-only backdoor, then execute API/browser parity for all three.
2. Fix the student result exam filter, `AttemptResiliencePanel` hydration mismatch, and advanced-builder duplicate keys; add focused regressions.
3. Run focused student, institute, teacher, admin, and parent P0 Playwright release packs in isolated batches with traces on failure.
4. Run Expo Maestro login, exam discovery/detail, active attempt, results, review, analytics, and offline-error flows on a controlled emulator.
5. Run cross-browser smoke, accessibility, and then performance smoke only after the functional P0 gates stay green.

Production readiness is not claimed.
