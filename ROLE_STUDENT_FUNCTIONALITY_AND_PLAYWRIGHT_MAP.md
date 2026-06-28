# Student Functionality And Playwright Map

This document describes the student role from start to finish and maps the student experience to existing Playwright coverage.

## Role purpose

Student is the learner-facing role. This role discovers exams, enters exam access, attempts assessments, reviews results, studies through practice and analytics, and uses learner utilities such as notifications, wallet, subscriptions, and profile/settings.

## End-to-end functionality

### 1. Student shell, dashboard, and mobile access

Student should be able to:

- open the dashboard
- move across dashboard, exams, results, analytics, profile, and utilities
- use the mobile drawer and route shell safely
- access the student shell in Chromium, Firefox, WebKit, and phone view sanity lanes

Associated Playwright:

- Baseline: `tests/e2e/workflow/student-dashboard-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/student-mobile-sanity-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/student-cross-browser-shell.spec.ts`
- Baseline: `tests/e2e/workflow/student-family-mobile-sanity.spec.ts`
- Baseline: `tests/e2e/workflow/student-family-mobile-results-sanity.spec.ts`
- Baseline: `tests/e2e/workflow/student-mobile-state-panel-sanity.spec.ts`

### 2. Exam discovery and exam detail

Student should be able to:

- browse exam list
- filter and inspect available exams
- open exam detail
- review readiness, policy, blueprint, and section visibility
- follow safe handoffs into attempt, summary, review, or wallet depending on state

Associated Playwright:

- Baseline: `tests/e2e/smoke/student-attempts.spec.ts`
- Baseline: `tests/e2e/workflow/student-exam-detail-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/student-exam-detail-mutable.spec.ts`
- Baseline: `tests/e2e/workflow/student-cross-browser-exam-runtime.spec.ts`

### 3. Exam-key access

Student should be able to:

- open exam-key entry
- validate required input
- submit live access key
- open the assigned exam when key is valid

Associated Playwright:

- Baseline: `tests/e2e/workflow/student-exam-key-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/student-exam-key-mutable.spec.ts`

### 4. Attempt runtime and post-submit flow

Student should be able to:

- start an attempt
- save progress
- navigate palette and progress indicators
- submit the attempt
- view post-submit summary and review surfaces when allowed
- tolerate locked/expired/submitted states truthfully

Associated Playwright:

- Baseline: `tests/e2e/workflow/student-attempt-runtime-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/student-post-submit-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/student-cross-browser-attempts-summary.spec.ts`
- Mutable: `tests/e2e/workflow/student-attempt-mutable.spec.ts`
- Mutable: `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts`

### 5. Attempts and results history

Student should be able to:

- inspect attempts workspace
- inspect results landing
- filter and group results
- drill into summary and review
- see correct result-state behavior for pending, summary-only, and review-ready records
- view published results after teacher/admin release

Associated Playwright:

- Baseline: `tests/e2e/workflow/student-attempts-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/student-results-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/student-result-state-matrix-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/student-review-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/student-results-mutable.spec.ts`

### 6. Practice and weak-areas learning loop

Student should be able to:

- open practice workspace
- filter practice sets
- reset filters
- open weak-areas surfaces
- start, resume, submit, and review practice loops

Associated Playwright:

- Baseline: `tests/e2e/workflow/student-practice-workspace.spec.ts`
- Baseline: `tests/e2e/smoke/student-attempts.spec.ts`
- Mutable: `tests/e2e/workflow/student-practice-mutable.spec.ts`
- Baseline: `tests/e2e/workflow/student-practice-attempts-scope-persistence.spec.ts`

### 7. Analytics and learning continuity

Student should be able to:

- open analytics landing
- drill by source, subject, compare, and timeline views
- keep source/subject/teacher context alive across drills
- move between action-center, timeline, compare, and results without losing scope

Associated Playwright:

- Baseline: `tests/e2e/workflow/student-analytics-deep.spec.ts`
- Baseline: `tests/e2e/workflow/student-analytics-scope-persistence-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/student-analytics-timeline-compare-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/student-summary-review-scope-persistence.spec.ts`
- Baseline: `tests/e2e/workflow/student-summary-review-source-persistence.spec.ts`
- Baseline: `tests/e2e/workflow/student-cross-browser-analytics-results.spec.ts`

### 8. Utility surfaces

Student should be able to:

- inspect profile
- inspect settings
- inspect search
- inspect wallet
- inspect subscriptions
- inspect notifications and mark messages read

Associated Playwright:

- Baseline: `tests/e2e/workflow/student-utility-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/student-notifications-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/student-economy-mutable.spec.ts`
- Mutable: `tests/e2e/workflow/student-referral-wallet-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/student-referral-onboarding.mutable.spec.ts`

### 9. Referral, wallet, subscription, and entitlement-facing learner flows

Student should be able to:

- onboard into referral flow
- inspect wallet/referral surfaces
- see admin grants reflected in ledger
- see package/question-bank entitlement visibility when relevant

Associated Playwright:

- Mutable: `tests/e2e/workflow/student-referral-onboarding.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/student-referral-wallet-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/student-economy-mutable.spec.ts`
- Mutable: `tests/e2e/workflow/student-question-bank-entitlement-visibility-contract.mutable.spec.ts`

### 10. Family-specific learner contract lanes

Student should be able to:

- consume family-specific exam experiences for NEET, JEE, GRE, AWS, and multi-subject cases
- validate lifecycle and result-state expectations per family

Associated Playwright:

- Baseline: `tests/e2e/workflow/student-family-experience-detail.spec.ts`
- Baseline: `tests/e2e/workflow/student-neet-full-mock-contract.spec.ts`
- Mutable: `tests/e2e/workflow/student-neet-full-mock-lifecycle.mutable.spec.ts`
- Baseline: `tests/e2e/workflow/student-jee-full-mock-contract.spec.ts`
- Mutable: `tests/e2e/workflow/student-jee-full-mock-lifecycle.mutable.spec.ts`
- Baseline: `tests/e2e/workflow/student-gre-quant-contract.spec.ts`
- Mutable: `tests/e2e/workflow/student-gre-quant-lifecycle.mutable.spec.ts`
- Baseline: `tests/e2e/workflow/student-aws-practice-contract.spec.ts`
- Mutable: `tests/e2e/workflow/student-aws-practice-lifecycle.mutable.spec.ts`
- Baseline: `tests/e2e/workflow/student-multi-subject-contract.spec.ts`
- Mutable: `tests/e2e/workflow/student-multi-subject-lifecycle.mutable.spec.ts`

## Practical end-to-end student journey

1. Open dashboard and review recommended actions.
2. Discover assigned or accessible exams.
3. Open exam detail or enter exam key.
4. Attempt the exam and submit.
5. Review results, summary, and allowed review screens.
6. Continue with practice, analytics, weak areas, notifications, and utility flows.
7. Use wallet/referral/subscription experiences when enabled.

## Automation status

- Student coverage is broad across desktop, mobile sanity, live attempt flow, results, analytics, and utility surfaces.
- New referral/wallet lanes are already represented in dedicated mutable specs.

## What is not covered

- Real-device QA across a broad matrix of Android and iPhone versions is not fully covered here.
- Weak-network, interruption, background/resume, battery-saver, and low-memory device behavior are not fully covered here.
- Accessibility validation with screen readers, zoom, and assistive technologies is not fully covered here.
- Long-duration attempt behavior over the full production exam window is only partially represented.
- App-store-native mobile packaging, push-notification delivery, and native wrapper behaviors are outside this web-role document unless separately covered.
