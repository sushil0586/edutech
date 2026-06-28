# Teacher Functionality And Playwright Map

This document describes the teacher role end to end and maps each major workflow to the current Playwright coverage.

## Role purpose

Teacher is the instructional authoring and delivery role. This role focuses on creating questions, preparing exams, delivering assessments, reviewing submissions, and analyzing student performance inside allowed institute or teaching scope.

## End-to-end functionality

### 1. Teacher shell and dashboard

Teacher should be able to:

- land on the dashboard
- move through the teacher shell
- open deep results routes directly
- use the dashboard as the handoff point into exams, question bank, results, and reviews

Associated Playwright:

- Baseline: `tests/e2e/workflow/teacher-cross-browser-shell.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-cross-browser-results.spec.ts`
- Baseline: `tests/e2e/smoke/teacher-workflows.spec.ts`

### 2. Exam management and exam detail

Teacher should be able to:

- inspect exam list
- use quick-create and advanced-builder entry points
- open exam detail
- inspect readiness and lifecycle controls
- manage access policy and history visibility

Associated Playwright:

- Baseline: `tests/e2e/smoke/teacher-workflows.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-exam-detail-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-exam-detail-mutable.spec.ts`

### 3. Exam builder and authoring flow

Teacher should be able to:

- inspect builder sections
- use linked-questions tab
- attach, update, and remove linked questions
- hand off between builder, delivery, results, and reviews
- export paper where supported

Associated Playwright:

- Baseline: `tests/e2e/workflow/exam-builder.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts`

### 4. Advanced-builder templates

Teacher should be able to:

- save advanced builder templates
- export template JSON
- import template JSON
- reuse template structures later

Associated Playwright:

- Mutable: `tests/e2e/workflow/teacher-advanced-builder-templates-mutable.spec.ts`

### 5. Question bank and question authoring

Teacher should be able to:

- browse question bank
- search and filter content
- open create-question and comprehension authoring flows
- create teacher-owned questions
- create comprehension sets
- import question rows
- export/import question data where enabled

Associated Playwright:

- Baseline: `tests/e2e/workflow/question-bank-deep.spec.ts`
- Baseline: `tests/e2e/smoke/teacher-workflows.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-question-mutable.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-comprehension-mutable.spec.ts`
- Mutable: `tests/e2e/workflow/question-import-mutable.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-question-import-export.spec.ts`

### 6. Shared-library question access

Teacher should be able to:

- view shared-library question-bank state
- see no-entitlement state clearly
- request shared-library access instead of directly forcing private entitlements
- link shared-library content when entitled
- hit quota-exhausted state safely
- experience builder/publish enforcement if entitlement is paused or insufficient

Associated Playwright:

- Baseline: `tests/e2e/workflow/teacher-question-bank-shared-library-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-question-bank-shared-library-no-entitlement.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-question-bank-shared-library-quota-exhausted.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-question-bank-shared-library-request.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-question-bank-shared-library-quota-exhausted.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-shared-library-entitlement-enforcement.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-shared-library-builder-flow.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-shared-library-publish-readiness.mutable.spec.ts`

### 7. Results, leaderboard, live monitor, analysis, and attempts

Teacher should be able to:

- inspect results landing
- filter and group results
- open leaderboard
- inspect live monitor
- inspect analysis
- inspect attempts
- navigate between exam, builder, reviews, and question bank from results surfaces

Associated Playwright:

- Baseline: `tests/e2e/workflow/teacher-results-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-results-leaderboard-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-results-live-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-results-attempts-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-results-mutable.spec.ts`

### 8. Reviews and manual grading

Teacher should be able to:

- open the review queue
- filter pending and reviewed tasks
- drill into task detail
- award marks and leave notes for manual-review items

Associated Playwright:

- Baseline: `tests/e2e/workflow/teacher-reviews-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-review-mutable.spec.ts`

### 9. Family-specific teacher lanes

Teacher should be able to:

- work with assessment-family rules and authoring guidance
- validate release paths for NEET, JEE, GRE, AWS, language, and multi-subject scenarios

Associated Playwright:

- Baseline: `tests/e2e/workflow/teacher-assessment-family-registry.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-family-authoring-contracts.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-family-immediate-release.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/teacher-family-release-happy-path.mutable.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-language-family-preset-builder-handoff.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-neet-results-contract.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-jee-results-contract.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-gre-results-contract.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-aws-results-contract.spec.ts`
- Baseline: `tests/e2e/workflow/teacher-multi-subject-results-contract.spec.ts`

## Practical end-to-end teacher journey

1. Open dashboard and review instructional workload.
2. Build or refine questions and comprehension sets.
3. Prepare exams through exam list, detail, and builder flows.
4. Link entitled shared-library questions if available.
5. Deliver or release the exam.
6. Monitor results and review student submissions.
7. Use analysis and leaderboard views for follow-up actions.

## Automation status

- Strong coverage exists for teacher authoring, exam delivery, results analysis, and review workflows.
- Shared-library request and entitlement enforcement behavior is already represented in dedicated teacher specs.

## What is not covered

- Rich-media authoring edge cases such as heavy image, audio, or advanced passage formatting combinations are not fully covered here.
- Very high-volume manual-review operations and grading throughput behavior are not covered here.
- Teacher collaboration or co-authoring workflows are not covered here.
- Offline authoring or unreliable-network draft recovery behavior is not covered here.
- Manual pedagogical quality review of questions and explanations is outside this document and automation scope.
