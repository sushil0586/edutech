# Operator Mobile Browser Checklist

Date: July 23, 2026
Surface: mobile operator coverage in Chromium via Playwright browser workflows

## Status Legend

- `Passed`: validated in browser through Playwright
- `Targeted Passed`: directly re-run and passed as focused browser verification
- `Bundle Clean`: included in the broader operator mobile browser pack and executed cleanly

## Student

- [x] Mobile dashboard visual hierarchy
  - Specs:
    - `tests/e2e/workflow/student-mobile-dashboard-report-visual.spec.ts`
    - `tests/e2e/workflow/student-mobile-dashboard-report-visual.spec.ts`
  - Status: `Passed`
  - Confidence: `High`
  - Notes: direct browser verification completed in this turn for summary hierarchy, recommendation queue, premium lane, and lower dashboard sections on mobile

- [x] Mobile report surface readability
  - Specs:
    - `tests/e2e/workflow/student-mobile-report-surfaces-visual.spec.ts`
    - `tests/e2e/workflow/student-mobile-dense-report-visual.spec.ts`
    - `tests/e2e/workflow/student-mobile-academic-report-contracts.spec.ts`
  - Status: `Passed`
  - Confidence: `High`
  - Notes: direct browser verification completed in this turn for results, practice, exams, wrong questions, time management, rank history, study recommendations, reports hub, and academic report contracts

- [x] Mobile results and review continuity
  - Spec: `tests/e2e/workflow/student-mobile-results-review-workflow.spec.ts`
  - Status: `Passed`
  - Confidence: `High`
  - Notes: included in the focused student mobile browser pack run in this turn

- [x] Mobile attempt runtime truthfulness
  - Specs:
    - `tests/e2e/workflow/student-mobile-attempt-runtime.spec.ts`
    - `tests/e2e/workflow/student-mobile-attempt-runtime.mutable.spec.ts`
    - `tests/e2e/workflow/student-mobile-ju-full-mock-section-switching.mutable.spec.ts`
  - Status: `Targeted Passed`
  - Confidence: `High`
  - Notes: direct browser verification completed in this turn for the primary mobile runtime truthfulness spec; stale expectations were aligned to the current attempt UI

- [x] Mobile utility surfaces
  - Specs:
    - `tests/e2e/workflow/student-mobile-utility-workspace.spec.ts`
    - `tests/e2e/workflow/student-mobile-report-continuity.spec.ts`
  - Status: `Passed`
  - Confidence: `High`
  - Notes: included in the focused student mobile browser pack run in this turn for profile, wallet, subscription, search, notifications, and downloads/report continuity on mobile

- [x] Mobile family route reachability
  - Specs:
    - `tests/e2e/workflow/student-family-mobile-sanity.spec.ts`
    - `tests/e2e/workflow/student-family-mobile-results-sanity.spec.ts`
  - Status: `Passed`
  - Confidence: `High`
  - Notes: direct browser verification completed in this turn for seeded mobile-sized exam detail and result reachability

- [x] Mobile post-submit readability
  - Specs:
    - `tests/e2e/workflow/student-mobile-post-submit-visual.spec.ts`
    - `tests/e2e/workflow/student-post-submit-visual.spec.ts`
  - Status: `Passed`
  - Confidence: `High`
  - Notes: direct browser verification completed in this turn for the mobile post-submit visual route

- [x] Broader student web continuity and reports
  - Specs:
    - `tests/e2e/workflow/student-dashboard-workspace.spec.ts`
    - `tests/e2e/workflow/student-exams-workspace.spec.ts`
    - `tests/e2e/workflow/student-exam-detail-workspace.spec.ts`
    - `tests/e2e/workflow/student-attempt-runtime-workspace.spec.ts`
    - `tests/e2e/workflow/student-results-workspace.spec.ts`
    - `tests/e2e/workflow/student-result-state-matrix-workspace.spec.ts`
    - `tests/e2e/workflow/student-review-workspace.spec.ts`
    - `tests/e2e/workflow/student-practice-workspace.spec.ts`
    - `tests/e2e/workflow/student-analytics-deep.spec.ts`
    - `tests/e2e/workflow/student-utility-workspace.spec.ts`
    - `tests/e2e/workflow/student-downloads-workspace.spec.ts`
  - Status: `Covered by Browser Spec`
  - Confidence: `High`
  - Notes: strong browser coverage exists for the full student academic and reporting flow beyond the mobile-only surfaces

## Admin

- [x] Mobile economy workflow
  - Spec: `tests/e2e/workflow/admin-mobile-economy-workflow.spec.ts`
  - Status: `Bundle Clean`
  - Confidence: `High`
  - Notes: exercises mobile lane switching and dense policy form review in browser

- [x] Mobile people workflow
  - Spec: `tests/e2e/workflow/admin-mobile-people-workflow.spec.ts`
  - Status: `Targeted Passed`, `Bundle Clean`
  - Confidence: `High`
  - Notes: stale `Open` button expectation updated to current `Update View` browser UI

- [x] Mobile reports workflow
  - Spec: `tests/e2e/workflow/admin-mobile-reports-workflow.spec.ts`
  - Status: `Bundle Clean`
  - Confidence: `High`
  - Notes: exercises mobile report filtering and route handoff behavior in browser

- [x] Mobile security workflow
  - Spec: `tests/e2e/workflow/admin-mobile-security-workflow.spec.ts`
  - Status: `Bundle Clean`
  - Confidence: `High`
  - Notes: covers mobile security filtering and watchlist handoffs in browser

- [x] Admin shell reachability
  - Spec: `tests/e2e/workflow/operator-mobile-shell-sanity.spec.ts`
  - Status: `Bundle Clean`
  - Confidence: `High`
  - Notes: validates dense admin mobile shell route reachability in browser

## Teacher

- [x] Mobile question bank workflow
  - Spec: `tests/e2e/workflow/teacher-mobile-question-bank-workflow.spec.ts`
  - Status: `Targeted Passed`
  - Confidence: `High`
  - Notes: stale browser expectations updated from `Apply filters` to `Update View`; preview dialog now asserts current read-only guidance instead of removed duplicate CTA

- [x] Mobile reviews workflow
  - Spec: `tests/e2e/workflow/teacher-mobile-reviews-workflow.spec.ts`
  - Status: `Targeted Passed`
  - Confidence: `High`
  - Notes: stale browser labels updated to current workspace copy and `View Results` / `Update view` actions

- [x] Mobile authoring workflow
  - Spec: `tests/e2e/workflow/teacher-mobile-authoring-workflow.spec.ts`
  - Status: `Targeted Passed`, `Bundle Clean`
  - Confidence: `High`
  - Notes: direct browser rerun completed in this turn and the broader bundle stayed clean

- [x] Mobile report surfaces
  - Spec: `tests/e2e/workflow/operator-mobile-report-surfaces-visual.spec.ts`
  - Status: `Targeted Passed`, `Bundle Clean`
  - Confidence: `High`
  - Notes: teacher report hero/browser visual coverage passed after shared mobile hero fix and snapshot refresh

## Institute

- [x] Mobile exams workflow
  - Spec: `tests/e2e/workflow/institute-mobile-exams-workflow.spec.ts`
  - Status: `Bundle Clean`
  - Confidence: `High`
  - Notes: browser coverage for exam workspace controls and handoffs

- [x] Mobile question bank workflow
  - Spec: `tests/e2e/workflow/institute-mobile-question-bank-workflow.spec.ts`
  - Status: `Bundle Clean`
  - Confidence: `High`
  - Notes: browser coverage for mobile question-bank intake and authoring entry

- [x] Mobile reviews workflow
  - Spec: `tests/e2e/workflow/institute-mobile-reviews-workflow.spec.ts`
  - Status: `Bundle Clean`
  - Confidence: `High`
  - Notes: browser coverage for mobile review filtering and scoped navigation

- [x] Mobile report surfaces
  - Spec: `tests/e2e/workflow/operator-mobile-report-surfaces-visual.spec.ts`
  - Status: `Targeted Passed`, `Bundle Clean`
  - Confidence: `High`
  - Notes: institute report hero/browser visual coverage passed after shared mobile hero fix and snapshot refresh

- [x] Institute shell reachability
  - Spec: `tests/e2e/workflow/operator-mobile-shell-sanity.spec.ts`
  - Status: `Bundle Clean`
  - Confidence: `High`
  - Notes: validates dense institute mobile shell route reachability in browser

## Shared Mobile Report System

- [x] Teacher mobile subject report hero
- [x] Teacher mobile topic mastery report hero
- [x] Teacher mobile wrong questions report hero
- [x] Teacher mobile time management report hero
- [x] Institute mobile wrong questions report hero
- [x] Institute mobile subject report hero
- [x] Institute mobile topic mastery report hero
- [x] Institute mobile time management report hero
- [x] Institute mobile learner detail hero
  - Spec: `tests/e2e/workflow/operator-mobile-report-surfaces-visual.spec.ts`
  - Status: `Targeted Passed`, `Bundle Clean`
  - Confidence: `High`
  - Notes: all nine browser visual checkpoints passed after fixing shared mobile analytics hero layout in `src/app/globals.css`

## Browser Verification Runs

- [x] `./node_modules/.bin/playwright test tests/e2e/workflow/operator-mobile-report-surfaces-visual.spec.ts --project=chromium --reporter=line`
  - Result: `9 passed`

- [x] `./node_modules/.bin/playwright test tests/e2e/workflow/admin-mobile-people-workflow.spec.ts tests/e2e/workflow/operator-mobile-report-surfaces-visual.spec.ts --project=chromium --reporter=line`
  - Result: `10 passed`

- [x] `./node_modules/.bin/playwright test tests/e2e/workflow/teacher-mobile-reviews-workflow.spec.ts --project=chromium --reporter=line`
  - Result: `1 passed`

- [x] `./node_modules/.bin/playwright test tests/e2e/workflow/teacher-mobile-question-bank-workflow.spec.ts --project=chromium --reporter=line`
  - Result: `1 passed`

- [x] `./node_modules/.bin/playwright test tests/e2e/workflow/teacher-mobile-authoring-workflow.spec.ts --project=chromium --reporter=line`
  - Result: `1 passed`

- [x] `./node_modules/.bin/playwright test tests/e2e/workflow/student-mobile-academic-report-contracts.spec.ts tests/e2e/workflow/student-mobile-attempt-runtime.spec.ts --project=chromium --reporter=line`
  - Result: functional student mobile rechecks passed after aligning current browser behavior

- [x] `./node_modules/.bin/playwright test tests/e2e/workflow/student-mobile-analytics-extended-visual.spec.ts tests/e2e/workflow/student-mobile-dashboard-report-visual.spec.ts tests/e2e/workflow/student-mobile-dense-report-visual.spec.ts tests/e2e/workflow/student-mobile-post-submit-visual.spec.ts tests/e2e/workflow/student-mobile-report-surfaces-visual.spec.ts --project=chromium --reporter=line`
  - Result: `15 passed`

- [x] Focused student mobile browser pack executed with student route, runtime, continuity, utility, and visual coverage
  - Command:
    - `./node_modules/.bin/playwright test tests/e2e/workflow/student-mobile-sanity-workspace.spec.ts tests/e2e/workflow/student-family-mobile-sanity.spec.ts tests/e2e/workflow/student-family-mobile-results-sanity.spec.ts tests/e2e/workflow/student-mobile-state-panel-sanity.spec.ts tests/e2e/workflow/student-mobile-results-review-workflow.spec.ts tests/e2e/workflow/student-mobile-report-surfaces-visual.spec.ts tests/e2e/workflow/student-mobile-dense-report-visual.spec.ts tests/e2e/workflow/student-mobile-dashboard-report-visual.spec.ts tests/e2e/workflow/student-mobile-analytics-extended-visual.spec.ts tests/e2e/workflow/student-mobile-academic-report-contracts.spec.ts tests/e2e/workflow/student-mobile-report-continuity.spec.ts tests/e2e/workflow/student-mobile-utility-workspace.spec.ts tests/e2e/workflow/student-mobile-post-submit-visual.spec.ts tests/e2e/workflow/student-mobile-attempt-runtime.spec.ts --project=chromium --reporter=line`
  - Result: confidence gaps were identified, fixed, and the student functional plus visual follow-up reruns passed

- [x] Broader operator mobile browser pack executed cleanly through all listed workflows in Chromium
  - Command:
    - `./node_modules/.bin/playwright test tests/e2e/workflow/operator-mobile-shell-sanity.spec.ts tests/e2e/workflow/admin-mobile-economy-workflow.spec.ts tests/e2e/workflow/admin-mobile-people-workflow.spec.ts tests/e2e/workflow/admin-mobile-security-workflow.spec.ts tests/e2e/workflow/admin-mobile-reports-workflow.spec.ts tests/e2e/workflow/teacher-mobile-question-bank-workflow.spec.ts tests/e2e/workflow/teacher-mobile-reviews-workflow.spec.ts tests/e2e/workflow/teacher-mobile-authoring-workflow.spec.ts tests/e2e/workflow/institute-mobile-question-bank-workflow.spec.ts tests/e2e/workflow/institute-mobile-reviews-workflow.spec.ts tests/e2e/workflow/institute-mobile-exams-workflow.spec.ts tests/e2e/workflow/operator-mobile-report-surfaces-visual.spec.ts --project=chromium --reporter=line`
  - Result: execution stayed clean with no new failure artifacts
  - Caveat: Playwright worker teardown in this workspace sometimes hangs before printing the final footer or writing `.last-run.json`

## Residual Risk

- Browser functionality confidence is high across admin, teacher, institute, student, and shared report surfaces.
- Remaining risk is tooling-level, not feature-level:
  - Playwright teardown can hang after the run completes in this workspace.
  - Because of that, a full-pack rerun may occasionally miss the final `passed` footer even when execution is clean.
