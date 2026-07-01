# Platform Admin Functionality And Playwright Map

This document describes the platform admin role from start to finish: what the role owns, what flows the role should be able to execute, and which Playwright specs currently verify those flows.

## Role purpose

Platform admin is the top-level operator role. This role governs institutes, users, academic setup defaults, exams, preset/template systems, reporting, security monitoring, and economy controls across the platform.

## End-to-end functionality

### 1. Admin shell and navigation

Platform admin should be able to:

- land on the dashboard
- move safely across the admin shell
- open deep routes directly
- use old route aliases without breaking navigation

Associated Playwright:

- Baseline: `tests/e2e/workflow/admin-dashboard-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/admin-cross-browser-shell.spec.ts`
- Baseline: `tests/e2e/workflow/admin-cross-browser-deep-routes.spec.ts`
- Baseline: `tests/e2e/workflow/admin-dashboard-redirect.spec.ts`

### 2. Dashboard and operational overview

Platform admin should be able to:

- inspect priority cards and health indicators
- filter by focus lane and sort strategy
- jump into institutes, people, academics, and reports
- use the dashboard as the control-center entry point

Associated Playwright:

- Baseline: `tests/e2e/workflow/admin-dashboard-workspace.spec.ts`

### 3. Search and settings governance

Platform admin should be able to:

- search across records and workspaces
- filter and group search results
- open result handoffs into the correct destination
- review governance settings and current live-control posture
- jump from settings into people and academics

Associated Playwright:

- Baseline: `tests/e2e/workflow/admin-search-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/admin-settings-workspace.spec.ts`

### 4. Institute lifecycle management

Platform admin should be able to:

- browse all institutes
- inspect institute detail and credential controls
- create a new institute
- edit an institute
- create login access for the institute admin
- reset, disable, or re-enable institute login
- remove disposable/test institute records when required

Associated Playwright:

- Baseline: `tests/e2e/workflow/admin-institutes-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/admin-institutes-mutable.spec.ts`

### 5. People and roster governance

Platform admin should be able to:

- inspect student and teacher rosters
- filter and export roster data
- create student and teacher records
- create or manage login state
- import student and teacher rows through CSV

Associated Playwright:

- Baseline: `tests/e2e/workflow/admin-people-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/admin-roster-mutable.spec.ts`
- Mutable: `tests/e2e/workflow/admin-roster-import-mutable.spec.ts`

### 6. Academic setup governance

Platform admin should be able to:

- switch institute scope
- manage academic years, programs, cohorts, subjects, and topics
- review assignment and exam-default policy surfaces
- create, edit, archive, and restore academic records

Associated Playwright:

- Baseline: `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/admin-academic-setup-mutable.spec.ts`

### 7. Exam catalog and exam creation

Platform admin should be able to:

- browse the platform exam list
- filter by status, source, group, type, and institute scope
- open exam detail
- open exam builder
- create exams through the guided wizard
- create exams through the advanced builder
- save and reuse templates
- use preset packs
- create practice, quiz, and mock exam variants

Associated Playwright:

- Baseline: `tests/e2e/workflow/admin-exams-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/admin-exams-create-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/admin-preset-pack-library.spec.ts`
- Mutable: `tests/e2e/workflow/admin-preset-pack-library-mutable.spec.ts`
- Mutable: `tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/admin-advanced-builder-templates-mutable.spec.ts`

### 8. Exam detail and builder operations

Platform admin should be able to:

- inspect exam KPI and readiness panels
- manage lifecycle controls and access policy
- inspect assignment and publish history
- edit builder settings
- add or remove sections
- attach, update, and remove linked questions
- hand off from detail to builder and back

Associated Playwright:

- Baseline: `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts`
- Baseline: `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/admin-exam-builder-mutable.spec.ts`

### 9. Family-specific exam authoring

Platform admin should be able to:

- apply family-aware defaults for NEET, JEE, GRE, AWS, and language lanes
- see checklist guidance and composition hints
- persist family defaults into created exams
- validate contract behavior for exam families and multi-subject lanes

Associated Playwright:

- Baseline: `tests/e2e/workflow/family-advanced-builder-guidance.spec.ts`
- Baseline: `tests/e2e/workflow/admin-family-guided-create-defaults.spec.ts`
- Mutable: `tests/e2e/workflow/admin-family-guided-persistence.mutable.spec.ts`
- Baseline: `tests/e2e/workflow/admin-family-preset-builder-handoff.spec.ts`
- Baseline: `tests/e2e/workflow/admin-family-preset-packs.spec.ts`
- Mutable: `tests/e2e/workflow/admin-family-preset-persistence.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/admin-family-immediate-release.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/admin-family-release-happy-path.mutable.spec.ts`
- Baseline: `tests/e2e/workflow/admin-family-authoring-contracts.spec.ts`
- Baseline: `tests/e2e/workflow/admin-multi-subject-contract.spec.ts`
- Baseline: `tests/e2e/workflow/admin-multi-subject-results-contract.spec.ts`
- Baseline: `tests/e2e/workflow/admin-neet-results-contract.spec.ts`
- Baseline: `tests/e2e/workflow/admin-jee-results-contract.spec.ts`
- Baseline: `tests/e2e/workflow/admin-gre-results-contract.spec.ts`
- Baseline: `tests/e2e/workflow/admin-aws-results-contract.spec.ts`

### 10. Student handoff from admin-created exams

Platform admin should be able to:

- create an exam
- assign a learner
- publish or make it live
- verify learner handoff into the student experience

Associated Playwright:

- Mutable: `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts`

### 11. Reports and security monitoring

Platform admin should be able to:

- review platform reports
- inspect publication backlog and exam performance
- inspect live monitoring and watch states
- group attempts by health or status
- move between reports, security, and other oversight surfaces

Associated Playwright:

- Baseline: `tests/e2e/workflow/admin-reports-workspace.spec.ts`
- Baseline: `tests/e2e/workflow/admin-security-workspace.spec.ts`

### 12. Economy, subscription, and package governance

Platform admin should be able to:

- inspect wallet/economy overview cards
- grant wallet credit or stars with proper validation
- review scenario planning sections
- manage subscription requests and institute economy policy surfaces
- verify package visibility behavior

Associated Playwright:

- Baseline: `tests/e2e/workflow/admin-economy-workspace.spec.ts`
- Mutable: `tests/e2e/workflow/admin-economy-mutable.spec.ts`
- Mutable: `tests/e2e/workflow/admin-institute-subscription-request.mutable.spec.ts`
- Mutable: `tests/e2e/workflow/admin-institute-economy-policy-contract.mutable.spec.ts`
- Baseline: `tests/e2e/workflow/admin-question-bank-package-visibility.spec.ts`

## Practical end-to-end admin journey

Typical platform-admin journey:

1. Open dashboard and inspect platform health.
2. Review or create institute and login readiness.
3. Confirm academic setup scope and defaults.
4. Create or refine an exam using wizard, advanced builder, presets, or templates.
5. Review exam detail and readiness posture.
6. Assign learners or release according to policy.
7. Monitor downstream behavior through reports, security, and economy surfaces.

## Automation status

- Strongest coverage areas: admin navigation, institute governance, exam creation, detail/builder workflows, reporting, and security.
- High-value mutable coverage exists for CRUD, imports, exam creation, templates, assignment handoff, and economy actions.
- Family and multi-subject contract lanes are already represented in dedicated contract specs.

## What is not covered

- Full end-to-end payment gateway or real billing settlement behavior is not covered here.
- Deep production-scale admin reporting validation with large datasets is not covered here.
- Real operator approval workflows outside the seeded demo lifecycle are only partially represented.
- Manual exploratory UI polish checks, responsiveness edge cases, and browser-performance profiling are not covered here.
- Disaster-recovery, backup/restore, and infrastructure-admin operations are outside this role document and its Playwright mapping.
