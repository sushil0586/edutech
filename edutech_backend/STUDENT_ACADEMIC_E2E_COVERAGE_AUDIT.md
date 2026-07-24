# Student Academic E2E Coverage Audit

## Scope

This audit covers the student academic surfaces only.

It focuses on:

- academic report pages
- academic drill-down pages
- exam and attempt academic flow pages
- Playwright workflow protection for those surfaces

It does not focus on non-academic utility pages such as:

- profile
- settings
- notifications
- subscriptions
- wallet
- generic search

Audit date:

- July 19, 2026

---

## Coverage Status Legend

| Status | Meaning |
| --- | --- |
| Strong | Dedicated workflow coverage exists for the page or report behavior |
| Partial | Some indirect or mutable coverage exists, but the primary page behavior is not fully protected |
| Missing | No clear dedicated workflow protection exists yet |

---

## Student Academic Route Matrix

| Route | Academic role | Current status | Primary Playwright coverage |
| --- | --- | --- | --- |
| `/app/results` | Student Results Report | Strong | `student-results-workspace.spec.ts`, `student-result-state-matrix-workspace.spec.ts` |
| `/app/weak-areas` | Student Topic Mastery Report | Strong | `student-weak-areas-workspace.spec.ts` |
| `/app/analytics` | Student Subject Performance Report anchor | Strong | `student-analytics-subject-report-workspace.spec.ts` |
| `/app/practice` | Student Practice Recommendation Report | Strong | `student-practice-workspace.spec.ts` |
| `/app/analytics/questions` | Student Question Pattern Report | Strong | `student-analytics-actions-questions-workspace.spec.ts` |
| `/app/analytics/wrong-questions` | Student Wrong Questions Report | Strong | `student-wrong-questions-workspace.spec.ts`, `student-dense-report-visual.spec.ts` |
| `/app/analytics/time-management` | Student Time Management Report | Strong | `student-time-management-workspace.spec.ts`, `student-dense-report-visual.spec.ts` |
| `/app/analytics/study-recommendations` | Student Study Recommendations Report | Strong | `student-study-recommendations-workspace.spec.ts`, `student-dense-report-visual.spec.ts` |
| `/app/analytics/rank-history` | Student Rank History Report | Strong | `student-rank-history-workspace.spec.ts`, `student-dense-report-visual.spec.ts` |
| `/app/analytics/downloads` | Student Downloadable Reports Surface | Strong | `student-downloads-workspace.spec.ts`, `student-dense-report-visual.spec.ts` |
| `/app/analytics/subjects/[subject]` | Subject deep-dive analytics | Strong | `student-analytics-deep-dive-workspace.spec.ts` |
| `/app/analytics/topics/[topic]` | Topic deep-dive analytics | Strong guarded coverage | `student-analytics-deep-dive-workspace.spec.ts` |
| `/app/analytics/question-types/[questionType]` | Question-type deep-dive analytics | Strong guarded coverage | `student-analytics-deep-dive-workspace.spec.ts` |
| `/app/analytics/sources/[sourceKey]` | Source deep-dive analytics | Strong | `student-analytics-scope-persistence-workspace.spec.ts`, `student-analytics-actions-sources-visual.spec.ts` |
| `/app/analytics/timeline` | Trend and result timeline drill-down | Strong | `student-analytics-timeline-compare-workspace.spec.ts` |
| `/app/analytics/results/compare` | Result comparison report | Strong | `student-analytics-timeline-compare-workspace.spec.ts`, `student-analytics-results-compare-visual.spec.ts` |
| `/app/analytics/actions` | Action center / next-best-move drill-down | Strong | `student-analytics-actions-questions-workspace.spec.ts` |
| `/app/attempts` | Attempt history / academic ledger | Strong | `student-attempts-workspace.spec.ts` |
| `/app/attempts/[attemptId]` | Live runtime / active attempt | Strong | `student-attempt-runtime-workspace.spec.ts`, runtime and visual specs |
| post-submit / summary / review surfaces | Result follow-up and review path | Strong | `student-post-submit-workspace.spec.ts`, `student-review-workspace.spec.ts`, timing and visual specs |
| `/app/exams` | Exam catalog / academic entry | Strong | `student-exams-workspace.spec.ts` |
| `/app/exams/[examId]` | Exam detail / launch surface | Strong | `student-exam-detail-workspace.spec.ts` |
| `/app/exams/enter-key` | Access-key exam entry | Strong | `student-exam-key-workspace.spec.ts` |
| `/app/dashboard` | Academic overview shell | Strong | `student-dashboard-workspace.spec.ts`, visual specs |

---

## What Was Closed In This Phase

### Core student academic reports now protected

The student academic reporting layer now has dedicated workflow protection for both the core report surfaces and the newer dense analytics reports:

1. Student Results Report
2. Student Topic Mastery Report
3. Student Subject Performance Report
4. Student Practice Recommendation Report
5. Student Question Pattern Report
6. Student Wrong Questions Report
7. Student Time Management Report
8. Student Study Recommendations Report
9. Student Rank History Report
10. Student Downloadable Reports Surface

### Adjacent drill-down protection added

This phase also closed a practical coverage gap around analytics follow-up surfaces:

- action center
- question analytics drill-down
- source analytics drill-down
- results comparison report
- timeline continuity report
- report-surface visual contracts
- mobile report-surface visual contracts

New spec added:

- `edutech_web/tests/e2e/workflow/student-analytics-actions-questions-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/student-wrong-questions-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/student-time-management-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/student-study-recommendations-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/student-rank-history-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/student-downloads-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/student-dense-report-visual.spec.ts`
- `edutech_web/tests/e2e/workflow/student-mobile-dense-report-visual.spec.ts`
- `edutech_web/tests/e2e/workflow/student-analytics-actions-sources-visual.spec.ts`
- `edutech_web/tests/e2e/workflow/student-analytics-results-compare-visual.spec.ts`

---

## Current Skip Audit

Full student Chromium regression status on July 19, 2026:

- `104 passed`
- `46 skipped`
- `0 failed`

Additional stable-skip reduction completed later on July 19, 2026:

- stable family-neutral student specs no longer self-skip for missing summary, review, runtime, or scoped source routes
- remaining explicit skip branches are now concentrated in mutable or environment-dependent families

The skipped set is now mostly intentional. It falls into three buckets.

### 1. Intentional Mutable Coverage

These are not release blockers for the stable student academic surface. They are lifecycle or seeded-state mutation flows that require disposable data, operator actions, or both.

Representative specs:

- `student-attempt-mutable.spec.ts`
- `student-practice-mutable.spec.ts`
- `student-results-mutable.spec.ts`
- `student-results-storytelling.mutable.spec.ts`
- `student-descriptive-runtime.mutable.spec.ts`
- `student-descriptive-result-storytelling.mutable.spec.ts`
- `student-descriptive-analytics-continuity.mutable.spec.ts`
- `student-opbms-class7-runtime.mutable.spec.ts`
- `student-opbms-navigation-recovery.mutable.spec.ts`
- `student-mobile-attempt-runtime.mutable.spec.ts`
- `student-mobile-results-review-workflow.spec.ts`
- `student-economy-mutable.spec.ts`
- `student-referral-onboarding.mutable.spec.ts`

Assessment:

- Expected skip family
- Keep as mutable unless we invest in disposable seeded provisioning and cleanup

### 2. Environment-Dependent Family and Product Contracts

These depend on seeded family-specific data existing in the current environment. They are valuable, but they are not guaranteed to run green everywhere unless the matching NEET, GRE, JEE, AWS, or mixed-subject fixtures are present.

Representative specs:

- `student-aws-practice-contract.spec.ts`
- `student-aws-practice-lifecycle.mutable.spec.ts`
- `student-jee-full-mock-contract.spec.ts`
- `student-jee-full-mock-lifecycle.mutable.spec.ts`
- `student-neet-full-mock-contract.spec.ts`
- `student-neet-full-mock-lifecycle.mutable.spec.ts`
- `student-gre-quant-contract.spec.ts`
- `student-gre-quant-lifecycle.mutable.spec.ts`
- `student-multi-subject-contract.spec.ts`
- `student-multi-subject-lifecycle.mutable.spec.ts`
- `student-family-mobile-sanity.spec.ts`
- `student-family-mobile-results-sanity.spec.ts`
- `student-family-weak-network.mutable.spec.ts`

Assessment:

- Useful release confidence layer for seeded demo lanes
- Should stay, but should eventually be backed by stronger fixture validation or environment tags

### 3. Conditional Stable Contracts Still Depending On Seeded Availability

These are the best candidates for the next stabilization phase. They are not fundamentally mutable, but they still self-skip when the seeded account does not expose the required route, record, or state.

Representative specs:

- `student-cross-browser-attempts-summary.spec.ts`
- `student-attempt-runtime-workspace.spec.ts`
- `student-cross-browser-exam-runtime.spec.ts`
- `student-post-submit-workspace.spec.ts`
- `student-result-state-matrix-workspace.spec.ts`
- `student-practice-attempts-scope-persistence.spec.ts`
- `student-summary-review-source-persistence.spec.ts`
- `student-review-workspace.spec.ts`
- `student-mobile-attempt-runtime.spec.ts`

Assessment:

- Completed on July 19, 2026 for the family-neutral stable student layer
- These specs now use route-tolerant or fallback truth contracts instead of self-skipping

## Remaining Gaps

These are the remaining academic gaps after the current phase.

### 1. Family-specific academic contracts are still environment-bound

Status:

- Partial

Why it is still a gap:

- JEE, NEET, GRE, AWS, and mixed-subject contracts are useful
- but they still depend on fixture availability in the current environment
- this reduces portability of the full release suite across environments

Recommended next step:

- add a preflight fixture validator or provisioning layer for family demo products

### 2. Mutable lifecycle coverage is broad but expensive to maintain

Status:

- Partial

Why it is still a gap:

- mutable specs now cover many valuable student flows
- but they require admin, teacher, seeded learners, or multi-step backend state transitions
- that makes them slower and more fragile than the stable academic surface suite

Recommended next step:

- split mutable specs into:
  - disposable provisioning flows
  - seeded-state mutation flows
  - operator-assisted settlement flows
- then tag them separately for release gating

### 3. Coverage maps are now partly stale relative to the authored suite

Status:

- Partial

Why it is still a gap:

- the authored student suite is now materially broader than the old summary tables
- several new student report and visual contract specs exist in the repo
- but some coverage summary documents still describe the student layer as if only the earlier core routes are protected

Recommended next step:

- refresh `ROLE_MODULE_COVERAGE_MAP.md`
- refresh the student sections of `PAGE_ACTION_COVERAGE_MAP.md`
- keep route inventory and coverage docs synchronized after each student reporting phase

---

## Recommended Next Phases

## Phase 3

Completed on July 19, 2026:

- summary route availability reduced into fallback truth contracts
- review route availability reduced into fallback truth contracts
- result state matrix availability reduced into fallback truth contracts
- scoped analytics follow-up availability reduced into fallback truth contracts
- mobile runtime seeded-route skip removed for the stable student contract

## Phase 4

Add fixture validation and environment tagging for family-specific student demo contracts.

## Phase 5

Rationalize mutable student flows into smaller, role-aware release buckets.

---

## Current Bottom Line

The student academic reporting release is now in a strong state for the stable student workflow layer.

As of July 19, 2026:

- the core student academic reports are protected on desktop and mobile
- the newer dense academic report pages are also protected on desktop and mobile
- the major student academic drill-down routes are protected
- the main live runtime, post-submit, and report surfaces now pass in Chromium
- the stable family-neutral student contracts no longer depend on seeded-route self-skips
- the mutable student results publication lane was re-stabilized and the targeted student results trio passed:
  - `student-analytics-drilldown.mutable.spec.ts`
  - `student-results-mutable.spec.ts`
  - `student-results-storytelling.mutable.spec.ts`
- the student regression finished at `104 passed`, `46 skipped`, `0 failed`
- the remaining work is now mostly fixture portability and mutable lifecycle isolation
- the remaining documentation work is to bring the higher-level coverage maps in line with the real authored student suite
