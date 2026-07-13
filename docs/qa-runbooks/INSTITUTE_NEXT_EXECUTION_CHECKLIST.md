# Institute Next Execution Checklist

Last updated: 2026-07-13

## Goal

Turn the remaining institute and adjacent product gaps into a clear execution sequence with the next test files to run.

## Priority Order

### 1. Finish institute visual and UX review

Target:

- remaining institute desktop visual review
- any dense or low-support-safe layout issues that still show up during screenshot review

Next evidence files:

- `docs/qa-runbooks/VISUAL_REVIEW_MASTER_PLAN.md`
- `docs/qa-runbooks/VISUAL_PASS_FINDINGS_2026-07-09.md`
- `docs/qa-runbooks/BROWSER_VISUAL_PENDING_EXECUTION_BOARD_2026-07-13.md`

Acceptance:

- institute pages remain readable at desktop and mobile sizes
- dense pages still have clear hierarchy and no clipped controls
- no new visual regressions appear in the major institute routes

### 2. Harden institute question-bank density and recovery

Target:

- question-bank visual hierarchy
- linked/local clarity
- recovery and empty-state readability

Next test files:

- `edutech_web/tests/e2e/workflow/institute-question-bank-browser-coverage.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-question-bank-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-question-bank-detail-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-question-bank-shared-library-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-question-bank-bulk-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts`

Acceptance:

- filters, bulk actions, and linked/shared-library states stay truthful
- no density issue obscures the primary action or the active state
- empty-state and recovery messaging stays distinct from loaded state

### 3. Expand institute results breadth

Target:

- broader result interpretation confidence
- long-tail result states
- current grouped results browser proof is green for results, attempts, leaderboard, analysis, and live monitor workspaces

Next test files:

- `edutech_web/tests/e2e/workflow/institute-results-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-results-attempts-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-results-analysis-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-results-live-workspace.spec.ts`

Acceptance:

- the result views remain truthful under filters and drilldowns
- leaderboard, attempts, and analysis continue to open and read correctly
- the page family keeps a clear operator story

### 4. Keep exam policy, slots, and advanced builder stable

Target:

- slot-based access
- policy/security combinations
- advanced-builder grouped creation
- current grouped mutable proof is green for policy/security and slot management

Next test files:

- `edutech_web/tests/e2e/workflow/institute-exam-policy-security-matrix.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-exam-slot-management.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-exam-detail-mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-exam-builder-workspace.spec.ts`

Acceptance:

- stars-based and subscription-based policy states remain stable
- slot windows and student overrides remain truthful
- practice, quiz, and mock-exam builder paths stay green

### 5. Complete cross-browser expansion where Chromium is still the lead proof

Target:

- Firefox and WebKit parity for remaining major shells/deep routes
- institute shell and results routes are now green in Chromium, Firefox, and WebKit

Next test files:

- `edutech_web/tests/e2e/workflow/institute-cross-browser-shell.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-cross-browser-results.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-cross-browser-shell.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-cross-browser-deep-routes.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-cross-browser-shell.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-cross-browser-results.spec.ts`

Acceptance:

- major shell and deep-route lanes pass in Chromium, Firefox, and WebKit where expected
- no browser-specific layout or interaction bug remains untracked

### 6. Reduce student seed-dependent skips

Target:

- lower flake and lower skip rates in student review/runtime tests

Next test files:

- `edutech_web/tests/e2e/workflow/student-results-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/student-mobile-results-review-workflow.spec.ts`
- `edutech_web/tests/e2e/workflow/student-mobile-attempt-runtime.spec.ts`
- `edutech_web/tests/e2e/workflow/student-exam-detail-mutable.spec.ts`

Acceptance:

- seed-dependent failures are minimized
- skips only remain when the backend truly cannot produce live data

### 7. Keep compact mobile stress open for admin and teacher

Target:

- dense mobile operator surfaces outside institute

Next test files:

- `edutech_web/tests/e2e/workflow/admin-mobile-reports-workflow.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-mobile-security-workflow.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-mobile-economy-workflow.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-mobile-authoring-workflow.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-mobile-question-bank-workflow.spec.ts`

Acceptance:

- compact layouts keep a visible primary action and readable hierarchy
- drawer/nav behavior stays usable on phone-sized viewports

## Suggested next run order

1. `institute-question-bank-browser-coverage.spec.ts`
2. `institute-results-workspace.spec.ts`
3. `institute-exam-policy-security-matrix.mutable.spec.ts`
4. `institute-exam-slot-management.mutable.spec.ts`
5. `institute-exam-creation-advanced-matrix.mutable.spec.ts`
6. `institute-cross-browser-shell.spec.ts`
7. `student-mobile-results-review-workflow.spec.ts`
8. `admin-mobile-economy-workflow.spec.ts`
9. `teacher-mobile-authoring-workflow.spec.ts`

## Notes

- The institute compact mobile stress lane is already green.
- The current open visual-product gap is mostly about broader product breadth and export/download CTAs.
- Keep the checklist updated as individual routes move from “strong” to “done”.
