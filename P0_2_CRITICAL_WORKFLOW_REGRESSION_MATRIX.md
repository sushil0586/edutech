# P0.2 Critical Workflow Regression Matrix

## Purpose

This document converts P0.2 into an explicit regression matrix.

P0.2 goal:

- re-verify the most failure-sensitive product workflows
- identify which flows already have automated coverage
- identify which flows still need manual verification
- create a clear checkpoint before moving beyond P0 closeout

Related documents:

- [NEXT_P0_CLOSEOUT_IMPLEMENTATION_PLAN.md](./NEXT_P0_CLOSEOUT_IMPLEMENTATION_PLAN.md)
- [NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md](./NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md)

---

## High-Level Read

P0.2 is not about broad new development.

It is about proving that the current platform still works across:

- authoring
- comprehension
- import
- advanced builder
- preset governance
- attempt runtime
- manual review
- result readiness

The key output is a trusted regression map.

---

## Regression Streams

## Stream A: Authoring and Content Integrity

### Core workflows

1. create question manually
2. edit question manually
3. create rich-text question
4. create rubric-backed manual-review question
5. create comprehension set
6. link child question to comprehension set
7. reject inconsistent subject, topic, or program mappings

### Strong automated coverage

- `edutech_backend/apps/question_bank/tests/test_bulk_workflows.py`
- `edutech_backend/apps/question_bank/tests/test_comprehension_sets.py`
- `edutech_backend/apps/question_bank/tests/test_rich_content.py`

### Manual verification still useful

- teacher UI save/edit flow
- institute UI save/edit flow
- passage popup/preview flow
- rich text toolbar behavior in browser

---

## Stream B: Bulk Import and Bulk Actions

### Core workflows

1. import preview
2. import finalize
3. stale preview rejection
4. row-level validation diagnostics
5. comprehension-linked import rows
6. bulk update actions

### Strong automated coverage

- `edutech_backend/apps/question_bank/tests/test_bulk_workflows.py`

### Manual verification still useful

- template download flow
- operator readability of preview errors
- repeated-error scanning in the importer UI

---

## Stream C: Exam Builder and Exam Governance

### Core workflows

1. advanced builder preview
2. advanced builder create
3. preview blockers
4. section/topic mismatch handling
5. saved advanced templates
6. managed preset packs
7. preset pack library to builder deep-link

### Strong automated coverage

- `edutech_backend/apps/exams/test_advanced_builder_api.py`
- `edutech_backend/apps/exams/test_advanced_templates_api.py`
- `edutech_backend/apps/exams/test_preset_packs_api.py`

### Manual verification still useful

- admin and institute preset-pack library pages
- builder to library navigation
- apply preset pack from standalone library page
- managed preset metadata edit UX

---

## Stream D: Attempt Runtime and Response Saving

### Core workflows

1. start attempt
2. save objective responses
3. save text responses
4. save response artifacts
5. preserve uploaded artifacts across saves
6. review visibility gating
7. section navigation rules
8. delivery snapshot behavior

### Strong automated coverage

- `edutech_backend/apps/attempts/tests/test_attempt_workspace_api.py`

### Manual verification still useful

- audio/video capture in browser
- uploaded artifact preview in attempt page
- uploaded artifact preview in student review page

---

## Stream E: Review Workflow

### Core workflows

1. create manual-review task
2. teacher review queue visibility
3. institute review queue visibility
4. claim next
5. assign reviewer
6. recheck request
7. moderation
8. rubric-backed review submission
9. review history timeline

### Strong automated coverage

- `edutech_backend/apps/attempts/tests/test_attempt_workspace_api.py`

### Manual verification still useful

- teacher review workspace pacing and clarity
- institute moderation flow
- rubric history readability in UI

---

## Stream F: Results and Publication Readiness

### Core workflows

1. cannot publish invalid exam results
2. result generation after valid completion
3. review blockers affect result readiness
4. live monitoring and forced submit actions
5. final learner-visible review gating

### Strong automated coverage

- `edutech_backend/apps/results/tests/test_smoke_flow.py`
- `edutech_backend/apps/accounts/tests/test_auth_access.py`

### Manual verification still useful

- institute results workspace blocker drilldown
- exam detail readiness cues
- student-visible result timing behavior in browser

---

## Stream G: Role and Scope Safety

### Core workflows

1. teacher limited to institute scope
2. institute admin limited to institute scope
3. platform admin governance coverage
4. student attempt and result isolation
5. governed resource manageability

### Strong automated coverage

- `edutech_backend/apps/accounts/tests/test_auth_access.py`
- `edutech_backend/apps/exams/test_preset_packs_api.py`
- `edutech_backend/apps/exams/test_advanced_templates_api.py`

### Manual verification still useful

- route-level visibility sanity check across admin, institute, teacher, and student portals

---

## Recommended Automated Verification Set

This is the recommended backend suite for P0.2:

1. `apps.question_bank.tests.test_bulk_workflows`
2. `apps.question_bank.tests.test_comprehension_sets`
3. `apps.question_bank.tests.test_rich_content`
4. `apps.exams.test_advanced_builder_api`
5. `apps.exams.test_advanced_templates_api`
6. `apps.exams.test_preset_packs_api`
7. `apps.attempts.tests.test_attempt_workspace_api`
8. `apps.results.tests.test_smoke_flow`
9. `apps.accounts.tests.test_auth_access`

This list is intentionally biased toward cross-workflow confidence, not full-suite exhaustiveness.

### Current checkpoint result

Automated verification is complete for the current P0.2 backend checkpoint.

Verified passes:

1. `apps.question_bank.tests.test_bulk_workflows`
2. `apps.question_bank.tests.test_comprehension_sets`
3. `apps.question_bank.tests.test_rich_content`
4. `apps.exams.test_advanced_builder_api`
5. `apps.exams.test_advanced_templates_api`
6. `apps.exams.test_preset_packs_api`
7. `apps.attempts.tests.test_attempt_workspace_api`
8. `apps.results.tests.test_smoke_flow`
9. `apps.accounts.tests.test_auth_access`

Observed during execution:

- parallel Django test execution against the same PostgreSQL test database is not reliable in the current local setup
- sequential execution should be treated as the correct verification method for this checkpoint

Meaningful fixes made during P0.2:

- restored teacher read-only academic lookup scope to institute-wide visibility
- aligned auth-access test fixtures with current platform-admin and institute-admin credential setup
- aligned experience-profile expectations with the current `benchmark` contract for `test` exam type
- removed one stale cross-test assumption in institute-detail auth coverage

---

## Recommended Manual Verification Set

Manual browser pass should cover:

1. teacher question creation and edit
2. institute comprehension authoring
3. import preview readability
4. preset pack library pages
5. builder deep-link from preset library
6. teacher review queue happy path
7. institute moderation happy path
8. student attempt with text and artifact-backed answer
9. results readiness and blocker display

---

## Exit Criteria

P0.2 is complete when:

- the recommended automated verification set passes or known failures are explicitly explained
- manual verification checklist exists for uncovered UX-only flows
- no untracked critical workflow gap remains
- regression confidence is strong enough to proceed to P0.3

### Current status

Automated backend regression confidence is strong enough to proceed.

Still pending before full P0.2 closeout:

- manual browser verification for UX-only flows
- route-to-route sanity pass across admin, institute, teacher, and student portals

---

## Immediate Execution Plan

Run in this order:

1. question-bank workflows
2. exams governance workflows
3. attempts and review workflows
4. results and access workflows

Reason:

- authoring and import failures corrupt downstream systems earliest
- exam governance failures break builder and publish flow next
- attempts, review, and result flows depend on those earlier layers
