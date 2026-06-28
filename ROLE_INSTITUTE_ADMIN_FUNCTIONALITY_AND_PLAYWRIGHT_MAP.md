# Institute Admin Functionality And Playwright Map

This document describes the institute admin role end to end and maps every major workflow to the existing Playwright coverage.

## Role purpose

Institute admin operates one institute. This role manages local students, teachers, academic structure, institute exams, institute question bank access, results, reviews, and institute-level reporting.

## End-to-end functionality

### 1. Institute shell and dashboard

Institute admin should be able to:

- open the dashboard
- move across the institute shell
- open deep results routes directly
- use the dashboard as the entry point into people, academics, exams, and reviews

Associated Playwright:

- Baseline: `tests/e2e/workflow/institute-dashboard-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/institute-cross-browser-shell.spec.ts`
- Baseline: `tests/e2e/workflow/institute-cross-browser-results.spec.ts`

### 2. People and roster operations

Institute admin should be able to:

- inspect students and teachers
- filter by login or role state
- export roster files
- create student and teacher records
- create, reset, disable, and enable login access
- import student and teacher rows

Associated Playwright:

- Baseline: `tests/e2e/workflow/institute-people-export.spec.ts`
- Mutable: `tests/e2e/workflow/institute-roster-mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-roster-import-mutable.spec.ts`

### 3. Academic setup and teacher assignments

Institute admin should be able to:

- manage academic years, programs, cohorts, subjects, and topics
- open assignment views and exam-default surfaces
- assign teachers to academic combinations
- create, edit, archive, and restore teacher assignments

Associated Playwright:

- Mutable: `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-teacher-assignments-mutable.spec.ts`

### 4. Exam management

Institute admin should be able to:

- browse institute exams
- filter and group by teacher, status, and other exam dimensions
- open exam detail
- open exam builder
- open advanced builder
- open create exam wizard
- open preset/template handoffs

Associated Playwright:

- Baseline: `tests/e2e/workflow/institute-exams-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/institute-exam-detail-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/institute-exam-builder-workspace.spec.ts`

### 5. Guided and advanced exam creation

Institute admin should be able to:

- create institute exams through guided wizard
- create institute exams through advanced builder
- assign learners
- verify institute-scoped student visibility
- save and reuse advanced builder templates

Associated Playwright:

- Mutable: `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-advanced-builder-templates-mutable.spec.ts`

### 6. Exam shell, detail, and results publishing

Institute admin should be able to:

- create a disposable exam shell
- validate detail actions
- review readiness and publish-readiness signals
- submit learner attempts into institute result pipelines
- publish results and verify leaderboard changes

Associated Playwright:

- Mutable: `tests/e2e/workflow/institute-exam-mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-results-mutable.spec.ts`

### 7. Question bank operations

Institute admin should be able to:

- browse question bank inventory
- search and filter question rows
- preview detail
- bulk-update questions where permitted
- author institute-owned questions
- import question CSV data
- export/import question bank files

Associated Playwright:

- Baseline: `tests/e2e/workflow/institute-question-bank-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/institute-question-bank-detail-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/institute-question-bank-bulk-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-question-mutable.spec.ts`
- Mutable: `tests/e2e/workflow/question-import-mutable.spec.ts`
- Baseline: `tests/e2e/workflow/institute-question-import-export.spec.ts`

### 8. Shared-library and entitlement-controlled question access

Institute admin should be able to:

- see shared-library surfaces
- understand no-entitlement state
- link shared-library questions when entitled
- hit quota-exhausted scenarios safely
- experience publish-readiness blockers if package access is paused or insufficient
- reuse linked questions in builder flows when entitlement allows

Associated Playwright:

- Baseline: `tests/e2e/workflow/institute-question-bank-shared-library-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/institute-question-bank-shared-library-no-entitlement.spec.ts`
- Baseline: `tests/e2e/workflow/institute-question-bank-shared-library-quota-exhausted.spec.ts`
- Mutable: `tests/e2e/workflow/institute-question-bank-shared-library-link.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-question-bank-shared-library-quota-exhausted.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-shared-library-entitlement-enforcement.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-shared-library-builder-flow.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-shared-library-publish-readiness.mutable.spec.ts`

### 9. Results, leaderboard, live monitor, analysis, and reviews

Institute admin should be able to:

- inspect results landing
- move into leaderboard
- inspect live monitor
- inspect analysis
- inspect attempt drilldowns
- work review queues for subjective/manual review flows
- navigate between result sub-surfaces without losing context

Associated Playwright:

- Baseline: `tests/e2e/workflow/institute-results-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/institute-results-live-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/institute-reviews-workspace.spec.ts`

### 10. Reports and institute oversight

Institute admin should be able to:

- inspect institute reports
- use report filters and quick lanes
- hand off into results and exam workflows

Associated Playwright:

- Baseline: `tests/e2e/workflow/institute-reports-workspace.spec.ts`

### 11. Family-specific institute exam lanes

Institute admin should be able to:

- apply family-aware defaults for NEET, JEE, GRE, AWS, and multi-subject lanes
- persist family defaults
- validate runtime, release, and result contracts for those families

Associated Playwright:

- Baseline: `tests/e2e/workflow/institute-family-guided-create-defaults.spec.ts`
- Mutable: `tests/e2e/workflow/institute-family-guided-persistence.mutable.spec.ts`
- Baseline: `tests/e2e/workflow/institute-family-preset-builder-handoff.spec.ts`
- Mutable: `tests/e2e/workflow/institute-family-preset-persistence.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-family-immediate-release.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-family-release-happy-path.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-family-release-state.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-family-runtime-smoke.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-family-runtime-depth.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/institute-family-authoring-contracts.mutable.spec.ts`
- Baseline: `tests/e2e/workflow/institute-neet-results-contract.spec.ts`
- Baseline: `tests/e2e/workflow/institute-jee-results-contract.spec.ts`
- Baseline: `tests/e2e/workflow/institute-gre-results-contract.spec.ts`
- Baseline: `tests/e2e/workflow/institute-aws-results-contract.spec.ts`
- Baseline: `tests/e2e/workflow/institute-multi-subject-results-contract.spec.ts`

### 12. Institute economy lane

Institute admin should be able to:

- inspect institute-facing economy or wallet controls where enabled
- validate institute-specific economy interactions

Associated Playwright:

- Baseline: `tests/e2e/workflow/institute-economy-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/institute-economy-mutable.spec.ts`

## Practical end-to-end institute-admin journey

1. Review dashboard and institute operational state.
2. Confirm roster and login readiness for students and teachers.
3. Align academics and teacher assignments.
4. Create or refine exam using guided or advanced flow.
5. Link institute/private or shared-library questions based on entitlement.
6. Publish and monitor attempts/results.
7. Review analytics, leaderboards, live monitor, and review queues.

## Automation status

- Strong coverage exists across exams, results, question bank, roster, academic setup, and shared-library gating.
- Institute question-bank monetization and entitlement workflows are already represented in dedicated specs, including paused/quota cases.

## What is not covered

- Real institute onboarding data migration from external SIS or LMS systems is not covered here.
- Large-volume institute import stress testing and long-running operational performance are not covered here.
- Manual reconciliation of subscription/commercial support cases is not covered here.
- Real classroom/device lab validation across many institute-specific device combinations is not covered here.
- Institute-side custom reporting exports beyond the current workflow coverage are only partially represented.
