# Next P0 Closeout Implementation Plan

## Purpose

This document turns the remaining P0 work into a practical closeout phase.

Important clarification:

- original P0 feature scope is functionally complete
- the remaining P0 work is now stabilization, verification, cleanup, and release hardening
- this phase should produce a trustworthy baseline before broader assessment-family expansion

Related documents:

- [NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md](./NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md)
- [FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md](/Users/ansh/Documents/Eductech/docs/architecture-product/FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md)
- [PHASE_1_FOUNDATION_HARDENING_IMPLEMENTATION_PLAN.md](./PHASE_1_FOUNDATION_HARDENING_IMPLEMENTATION_PLAN.md)
- [PHASE_2_REVIEWER_WORKFLOW_ENGINE_IMPLEMENTATION_PLAN.md](./PHASE_2_REVIEWER_WORKFLOW_ENGINE_IMPLEMENTATION_PLAN.md)
- [PHASE_3_FRONTEND_REGISTRY_ADOPTION_PLAN.md](./PHASE_3_FRONTEND_REGISTRY_ADOPTION_PLAN.md)
- [PHASE_4B_RUBRIC_REVIEW_ENGINE_IMPLEMENTATION_PLAN.md](./PHASE_4B_RUBRIC_REVIEW_ENGINE_IMPLEMENTATION_PLAN.md)

---

## High-Level Read

P0 no longer means:

- inventing new safety features from scratch
- redesigning the architecture
- reopening already solved review or builder foundations

P0 now means:

- stabilizing the current large implementation wave
- making migrations and contracts consistent
- verifying role behavior and critical workflows intentionally
- reducing regression risk before Phase 5 and later expansion

In short:

`P0 is now a release-hardening checkpoint.`

---

## Current P0 Position

The original P0 streams are effectively in place:

1. question bank data integrity
2. bulk upload hardening
3. exam builder safety
4. review workflow completion
5. result readiness clarity

What remains is not missing architecture.
What remains is operational confidence.

---

## P0 Closeout Goal

Produce a clean, verified, migration-safe, regression-resistant baseline that is ready for:

- assessment family profiles
- richer media-first exam modes
- broader analytics maturity
- multi-institute SaaS scale

---

## P0 Closeout Streams

## Stream 1: Migration and Schema Consistency

### Goal

Make sure the current backend state is structurally safe to migrate, deploy, and extend.

### Scope

- verify all newly added migrations apply in order from a clean database
- verify no accidental model and migration mismatches remain
- verify UUID versus non-UUID assumptions are consistent
- verify seed migrations and option-catalog migrations are stable
- verify new question-bank, attempts, exams, and review schema changes work together

### Key areas

- `edutech_backend/apps/question_bank/migrations`
- `edutech_backend/apps/attempts/migrations`
- `edutech_backend/apps/exams/migrations`
- `edutech_backend/apps/academics/migrations`

### Exit criteria

- full migrate from clean state succeeds
- no migration graph conflicts
- no model-to-migration drift remains

---

## Stream 2: Critical Workflow Regression Pass

### Goal

Re-verify the highest-risk product flows end to end with current contracts.

### Scope

- question create and edit
- comprehension create, edit, import, and child linking
- bulk preview and finalize
- advanced exam builder preview and create
- preset-pack create, update, delete, and apply
- teacher review queue actions
- institute review queue actions
- result publication readiness blockers
- student attempt save-answer for objective, text, and artifact-backed paths

### Required flow groups

#### Authoring

- teacher question authoring
- institute question authoring
- comprehension workflows
- rich-text content paths

#### Exam build and publish

- advanced builder
- section mapping
- managed preset packs
- exam result readiness

#### Attempt and evaluation

- student attempt
- manual review
- rubric review
- artifact-backed response paths

### Exit criteria

- no major broken path in authoring, builder, review, results, or attempt surfaces
- each critical flow has either automated coverage or a documented manual test checklist

---

## Stream 3: Role and Scope Verification

### Goal

Confirm that platform admin, institute admin, teacher, and student behavior matches intended scope rules.

### Scope

- verify platform admin versus institute admin governance boundaries
- verify teacher visibility and manageability across templates, packs, reviews, and exams
- verify read-only versus editable behavior on governed resources
- verify student-only attempt and review visibility remains protected

### Priority checks

- preset-pack governance scope
- review-task ownership and escalation scope
- exam visibility by source and role
- question-bank manageability by role and institute

### Exit criteria

- no scope leaks
- no false-positive manage permissions
- no missing access where the product expects access

---

## Stream 4: Frontend Contract Cleanup

### Goal

Reduce temporary UI branching and leave the current surfaces easier to maintain.

### Scope

- normalize shared question rendering across teacher, student, review, and results surfaces
- remove low-value one-off UI branches where shared helpers now exist
- align builder, library, and analytics copy with the real product contract
- ensure empty states and filter-zero states are intentional
- ensure route-to-route navigation between related workflows feels complete

### Focus files

- `edutech_web/src/components/ui`
- `edutech_web/src/features/results-workspace`
- `edutech_web/src/app/(teacher)`
- `edutech_web/src/app/(institute)`
- `edutech_web/src/app/(admin)`

### Exit criteria

- no obviously unfinished or contradictory UX in newly delivered surfaces
- shared components are used where the capability engine already supports them

---

## Stream 5: Test and Release Readiness

### Goal

Turn current confidence into something repeatable.

### Scope

- identify the minimum mandatory automated suite for this checkpoint
- run backend targeted tests for question bank, attempts, exams, results, and review flows
- run frontend typecheck and any existing lint/build guards
- document known deferred risks rather than leaving them implicit

### Minimum release gates

1. backend migrations succeed from clean state
2. backend targeted tests for critical domains pass
3. frontend typecheck passes
4. no known severity-1 scope or data-integrity bug remains

### Exit criteria

- a clear pass/fail release gate exists
- remaining risks are explicitly documented

---

## Execution Order

Recommended order:

1. migration and schema consistency
2. critical workflow regression pass
3. role and scope verification
4. frontend contract cleanup
5. final test and release readiness checkpoint

Reason:

- schema problems invalidate all higher-level confidence
- workflow verification is more valuable once migrations are trusted
- permission verification matters after flows are stable
- UI cleanup should follow confirmed contracts, not guess them

---

## Implementation Slices

## Slice P0.1

### Title

Migration and clean-state verification

### Deliverables

- clean migration run
- migration drift fixes
- schema mismatch fixes
- documented migration checklist

### Current status

Complete for the current checkpoint.

What was verified:

- migration graph is healthy
- `manage.py makemigrations --check --dry-run` returns no model drift
- `exams.0011_exampresetpack` was the only unapplied local migration in the active checkpoint path
- local database migration to `exams.0011_exampresetpack` now succeeds
- clean test-database creation and targeted backend test execution succeed after the migration fix

What was fixed:

- `ExamPresetPack` index names in `apps/exams/models.py` were pinned to the checked-in migration names so Django stops generating rename-only drift migrations

---

## Slice P0.2

### Title

Critical workflow regression matrix

### Deliverables

- documented workflow checklist
- targeted automated test pass
- identified gaps between manual and automated coverage

### Current status

Complete for the current checkpoint.

What was verified:

- workflow regression matrix documented
- targeted backend workflow suites passed sequentially
- critical authoring, builder, attempt, review, and result flows were re-verified

What was fixed:

- restored teacher read-only academic lookup scope to institute-wide visibility
- aligned auth-access test fixtures and expectations with the current contracts

---

## Slice P0.3

### Title

Scope and governance verification

### Deliverables

- role matrix for platform admin, institute admin, teacher, student
- fixed scope leaks or permission inconsistencies
- documented expected manageability rules

### Current status

Complete for the current checkpoint.

What was verified:

- role and scope verification matrix documented
- focused role and governance test suites passed
- no additional scope leak fix was required during the focused verification pass

---

## Slice P0.4

### Title

Frontend closeout and UX consistency

### Deliverables

- polished empty states
- shared rendering usage where already available
- tightened route links between governance surfaces
- reduced obvious unfinished UI states

### Current status

Complete enough for the current checkpoint.

What was verified:

- recently added governance surfaces now have connected route coverage in the production build output
- no unresolved frontend contract issue blocked typecheck or production build

Remaining non-blocking work:

- continue browser-level UX polish in later phases where needed

---

## Slice P0.5

### Title

Release checkpoint

### Deliverables

- final typecheck and targeted test pass
- known-risks section
- recommendation to move into Phase 5

### Current status

Complete for the current checkpoint.

What was verified:

- frontend typecheck passed
- production frontend build passed
- targeted backend suites for the checkpoint passed

What was fixed:

- extracted `TeacherBuilderApiError` into a client-safe shared module so server-only auth/session logic no longer leaked into browser-side imports

---

## What Should Not Be Added In P0

Do not expand P0 with:

- new advanced exam families
- adaptive testing
- large new analytics domains
- broad new scoring systems beyond already-delivered contracts
- premium packaging logic

Those belong to later phases.
P0 should close, not sprawl.

---

## Risks If P0 Closeout Is Skipped

1. migration drift may surface late during deployment or environment resets
2. role and scope bugs may survive because the platform now has many more governance surfaces
3. later family-profile work could build on unstable assumptions
4. regression cost rises as the platform expands further

---

## Definition of Done

P0 closeout is done when:

- clean database migration succeeds
- critical authoring, builder, review, results, and attempt flows are re-verified
- role-wise scope behavior is intentionally checked
- newly added governance surfaces no longer feel unfinished
- targeted backend tests and frontend typecheck pass
- remaining known risks are documented

At that point, the platform should treat P0 as closed and move forward to:

`Phase 5 assessment family profiles`

---

## Recommended Immediate Next Build

If implementation begins right now, the best first slice is:

`Slice P0.1: migration and clean-state verification`

Then:

`Slice P0.2: critical workflow regression matrix`

These two slices produce the fastest real confidence gain for the current codebase state.
