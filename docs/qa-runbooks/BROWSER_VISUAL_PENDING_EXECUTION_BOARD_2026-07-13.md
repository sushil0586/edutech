# Browser Visual Pending Execution Board

Date: 2026-07-13

## Goal

Track the remaining browser-visual work that is still worth doing after the current admin, institute, teacher, and student coverage pass.

## What is already covered

- Core admin, institute, teacher, and student workspaces.
- Desktop Chromium plus cross-browser sanity for the major shell and deep-route lanes.
- Institute shell and results cross-browser sanity is green in Chromium, Firefox, and WebKit.
- Parent browser coverage is green in Chromium, Firefox, and WebKit, with compact mobile coverage for dashboard, alerts, and settings.
- iPhone 13 and Pixel 7 mobile proof for the key admin, institute, teacher, and student pages checked in the latest run.
- Mutable CRUD and lifecycle coverage for the highest-risk data flows.
- Institute reports, economy, security, settings, and reviews browser coverage are green on the live build.
- The institute desktop visual pass capture is green for the full institute route set in the visual harness.
- Admin economy, admin security, and teacher authoring compact mobile workflows are green on the live build.

## Pending work

### 1. Product gaps that block stronger visual proof

- Add export/download CTAs on results and reports surfaces if the product should expose them.
- Once those controls exist, add browser assertions for the downloaded file or export payload.

### 2. Cross-browser expansion

- Broaden Firefox and WebKit coverage where Chromium is still the main proof.
- Focus on admin, institute, and teacher shell/deep-route lanes first.
- Keep student as the most complete baseline, then expand the remaining browser matrix where it matters.

### 3. Mutable high-risk combinations

- Expand stars-policy combinations in exam-detail coverage.
- Expand multi-learner distribution in advanced-builder and guided-wizard exam creation.
- Expand results publication flows beyond single-learner and single-ranked cases.
- Institute stars-policy, slot-management, and advanced-builder matrix proofs are currently green on the live build; keep the broader admin-side breadth expansion open.

### 4. Seed resilience

- Reduce student runtime and review skips where the route is seed-dependent.
- Keep skips only when the backend truly has no live data to exercise.
- Student results workspace is currently green on the live build; the mobile results-review path still skips when the seeded review-ready data is sparse.

### 5. Smaller-screen stress

- Add denser mobile stress for admin, institute, and teacher compact layouts.
- Focus on drawer behavior, long cards, and compact handoffs.
- Institute compact mobile stress is now green for dashboard, reports, economy, security, settings, exams, reviews, and question-bank flows.

## Suggested execution order

1. Product gaps
2. Mutable high-risk combinations
3. Cross-browser expansion
4. Seed resilience
5. Smaller-screen stress

## Trackable checklist

| Status | Item | Owner lane |
| --- | --- | --- |
| [ ] Pending | Add export/download CTAs on results and reports surfaces | admin, institute, teacher, student |
| [ ] Pending | Add file-download assertions once real CTAs exist | admin, institute, teacher, student |
| [ ] Pending | Expand stars-policy combinations in exam-detail coverage | admin, institute |
| [ ] Pending | Expand multi-learner distribution in exam creation matrices | admin, institute |
| [ ] Pending | Expand results publication beyond single-learner proof | teacher, institute, student |
| [x] Done | Add Firefox coverage for remaining shell/deep-route lanes | admin, institute, teacher |
| [x] Done | Add WebKit coverage for remaining shell/deep-route lanes | admin, institute, teacher |
| [ ] Pending | Reduce student runtime/review seed-dependent skips | student |
| [x] Done | Add denser mobile stress for compact operator layouts | admin, institute, teacher |
| [x] Done | Institute compact mobile support pages passed on 390x844 viewport | institute |
| [x] Done | iPhone 13 and Pixel 7 coverage for the main mobile pages checked in the latest run | admin, institute, teacher, student |

## Practical next Playwright lanes

- `tests/e2e/workflow/admin-reports-workspace.spec.ts`
- `tests/e2e/workflow/institute-reports-workspace.spec.ts`
- `tests/e2e/workflow/teacher-results-workspace.spec.ts`
- `tests/e2e/workflow/student-results-workspace.spec.ts`
- `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-detail-mutable.spec.ts`
- `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts`
- `tests/e2e/workflow/admin-cross-browser-shell.spec.ts`
- `tests/e2e/workflow/admin-cross-browser-deep-routes.spec.ts`
- `tests/e2e/workflow/teacher-cross-browser-shell.spec.ts`
- `tests/e2e/workflow/teacher-cross-browser-results.spec.ts`
- `tests/e2e/workflow/institute-cross-browser-shell.spec.ts`
- `tests/e2e/workflow/institute-cross-browser-results.spec.ts`
- `tests/e2e/workflow/student-mobile-attempt-runtime.spec.ts`
- `tests/e2e/workflow/student-mobile-results-review-workflow.spec.ts`
- `tests/e2e/workflow/admin-mobile-reports-workflow.spec.ts`
- `tests/e2e/workflow/admin-mobile-security-workflow.spec.ts`
- `tests/e2e/workflow/admin-mobile-economy-workflow.spec.ts`
- `tests/e2e/workflow/institute-mobile-exams-workflow.spec.ts`
- `tests/e2e/workflow/institute-mobile-reviews-workflow.spec.ts`
- `tests/e2e/workflow/teacher-mobile-authoring-workflow.spec.ts`

## Exit criteria

- Results and reports expose real download or export CTAs if product wants file verification.
- Cross-browser coverage exists for the remaining important shells and deep routes.
- Firefox and WebKit coverage is verified for the remaining important shells and deep routes.
- Mutable coverage includes more than single-learner, single-policy proof.
- Student seed-dependent skips are minimized.
- Mobile layout checks remain green on iPhone and Pixel for the major role pages.
