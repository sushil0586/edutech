# Phase 1B Exam Lifecycle Certification

Date: 2026-10-14  
Scope: P0 examination lifecycle, evidence reliability, and access isolation.  
Baseline: `docs/qa/00-product-discovery-report.md` through `docs/qa/06-phase1a-p0-technical-verification.md`.

## Certification Status

The examination module is **not certified** for production. Backend API/database coverage now verifies the critical isolation and lifecycle rules listed below, and browser artifact capture is reliable. The browser end-to-end workflow still has a P0 result-scoring evidence failure: after two distinct known-correct browser answer saves, the published student result returned `final_score = 1` instead of the expected `>= 2`.

## Test Counts

| Priority | Passed | Failed | Blocked | Skipped | Not run | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| P0 | 9 | 1 | 1 | 0 | 6 | 8 backend tests passed, 1 focused TS compile passed, 1 browser lifecycle failed on score evidence, global TS blocks suite-level readiness |
| P1 | 0 | 0 | 1 | 0 | 4 | Evidence packaging fixed; global TypeScript errors remain a harness quality blocker |
| P2 | 0 | 0 | 0 | 0 | 2 | React duplicate-key warning in advanced-builder preview logged for later UI cleanup |

## Evidence Reliability

| Area | Result | Evidence |
| --- | --- | --- |
| Playwright trace packaging | Fixed/verified | Unique output directories produced `.last-run.json`, screenshots, `error-context.md`, and `trace.zip` under `edutech_web/test-results/phase1b-*` |
| Screenshots | Verified | `student-exam-detail-before-start.png`, `student-attempt-question-loaded.png`, `student-attempt-before-submit.png` captured in failed lifecycle runs |
| Cleanup evidence | Verified for failed runs | Backend logs showed `DELETE /api/v1/institutes/<id>/` returning `200` after failures |
| Global TypeScript | Blocked | `npm run typecheck -- --pretty false` produced 73 `error TS` entries in existing Playwright specs |
| Focused TypeScript | Passed | Focused compile of touched lifecycle/page-object files passed |

## Backend API/Database Verification

Command:

```bash
cd edutech_backend
../edutech_backend/.venv/bin/python manage.py test \
  apps.results.tests.test_smoke_flow.AcademicAssessmentSmokeTestCase.test_full_academic_assessment_flow_end_to_end \
  apps.results.tests.test_smoke_flow.AcademicAssessmentSmokeTestCase.test_cannot_generate_duplicate_result_for_same_attempt \
  apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_student_cannot_see_another_students_attempts_or_results \
  apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_teacher_can_access_only_institute_exam_and_question_data \
  apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_selected_student_assignment_limits_exam_visibility_and_start \
  apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_inactive_selected_student_assignment_blocks_visibility_detail_and_start \
  apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_draft_exam_is_hidden_and_cannot_start \
  apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_upcoming_and_expired_exams_cannot_be_started \
  --keepdb
```

Result: `Ran 8 tests ... OK`.

Verified:

- Full academic assessment API flow, result generation, and duplicate-result protection.
- Student cannot read another student's attempts/results.
- Teacher cannot access unauthorized institute exam/question/result data.
- Selected-student assignment limits visibility and start.
- Inactive selected-student assignment blocks list/detail/start.
- Draft/unpublished exam is hidden from list/detail/access and cannot start.
- Future and expired windows block start.

## Confirmed Defects And Fixes

| ID | Priority | Classification | Root cause | Fix |
| --- | --- | --- | --- | --- |
| P1B-D01 | P0 | Confirmed product defect, fixed | Student exam list/detail/access-key paths filtered only `is_active=True`; draft exams were student-visible when assignment scope matched | Added lifecycle status filters for `scheduled`, `live`, `completed` in `edutech_backend/apps/accounts/views/__init__.py`; added regression tests |
| P1B-D02 | P0 | Test automation defect, fixed | Browser final submit requires a native confirmation dialog; Playwright clicked `End Test` without accepting, cancelling submit | Added explicit `page.once("dialog", ...)` acceptance in lifecycle spec |
| P1B-D03 | P1 | Test synchronization defect, fixed | Onboarding outcome assertion did not wait for the existing `Last apply result` contract before looking for nested summary | `AdminInstituteOnboardingPage.expectOnboardingOutcomeSummary` now waits through `expectLastApplyResult()` |
| P1B-D04 | P0 | Unresolved product/test evidence failure | Browser result publication completed, but published score was `1` after the test saved two distinct known-correct answers | Open blocker; inspect attempt answer rows and result calculation inputs before certification |

## Browser Workflow Evidence

Focused command shape:

```bash
cd edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 \
PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1 \
PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS=1 \
PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS=1 \
npx playwright test tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts \
  --project=chromium --trace on --output test-results/<phase1b-run-id>
```

Latest evidence path:

- `edutech_web/test-results/phase1b-20261014182022/workflow-institute-full-ac-a9769--run-a-student-exam-attempt-chromium/trace.zip`
- `edutech_web/test-results/phase1b-20261014182022/workflow-institute-full-ac-a9769--run-a-student-exam-attempt-chromium/error-context.md`
- `edutech_web/test-results/phase1b-20261014182022/workflow-institute-full-ac-a9769--run-a-student-exam-attempt-chromium/student-exam-detail-before-start.png`
- `edutech_web/test-results/phase1b-20261014182022/workflow-institute-full-ac-a9769--run-a-student-exam-attempt-chromium/student-attempt-question-loaded.png`
- `edutech_web/test-results/phase1b-20261014182022/workflow-institute-full-ac-a9769--run-a-student-exam-attempt-chromium/student-attempt-before-submit.png`
- `edutech_web/test-results/phase1b-20261014182022/workflow-institute-full-ac-a9769--run-a-student-exam-attempt-chromium/pw-full-access-exam-1791982228440362-questions.csv`

Verified before failure:

- Synthetic full-access institute created.
- Academic preset and question-bank/advanced-builder access applied.
- Institute, teacher, and student login holders created.
- Ten MCQs imported; preview showed valid rows and Option A marked correct.
- Exam created with valid live schedule.
- Students assigned; exam published.
- Assigned student saw detail page and started attempt.
- Question page loaded.
- Answer save worked.
- Save-and-next navigation worked.
- Refresh/relogin recovery returned to attempt workspace.
- Final submit confirmation accepted.
- Duplicate-submit protection and result publication path were reached before the score assertion failed.

Not certified:

- Correct browser score calculation evidence.
- Complete student result UI visibility after score assertion.
- Full negative browser/API agreement matrix.
- Platform admin result visibility in browser.

## Security And Access Isolation

Backend tests verified the highest-risk P0 isolation paths listed above. Browser negative scenarios remain not-run in Phase 1B because the positive lifecycle still fails certification on score evidence. API/browser agreement is therefore **partial**, not certified.

## Global TypeScript Findings

`npm run typecheck -- --pretty false` generated route types successfully, then failed with 73 `error TS` entries. Categories:

- Possibly-null seeded exam/result variables in result contract specs.
- Mis-typed fixture argument as `String`, causing missing `.page`.
- Missing `Page` import in mobile exam workflow spec.
- Possibly-null selectors/data variables in teacher result specs.
- Locator/null matcher misuse in shared-library request spec.

Classification: test-source/harness blocker, not caused by Phase 1B changes.

## Files Changed

- `edutech_backend/apps/accounts/views/__init__.py`
- `edutech_backend/apps/accounts/tests/test_auth_access.py`
- `edutech_web/tests/e2e/page-objects/admin/admin-institute-onboarding.po.ts`
- `edutech_web/tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts`
- `docs/qa/04-master-qa-coverage-matrix.md`
- `docs/qa/07-phase1b-exam-lifecycle-certification.md`

## Remaining P0 Launch Blockers

1. Browser lifecycle result scoring mismatch: published result score is `1` after two distinct known-correct browser saves.
2. Browser negative access-isolation scenarios are not yet executed.
3. Global TypeScript failure blocks suite-level automation confidence.
4. Exam module cannot be called certified until submit/results and mandatory access-isolation cases pass in the same evidence pack.

## Recommendation For Phase 1C

Start with a narrow score-forensics pass: preserve the synthetic institute after failure, query attempt answers/results before cleanup, compare browser-saved question IDs/options to backend `AttemptAnswer` rows, then fix the calculation or browser save path if confirmed. After that, rerun the same focused lifecycle and only then add browser negative isolation cases.
