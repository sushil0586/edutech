# NEET JEE GRE AWS Phase 0 And Phase 1 Implementation Tickets

## Purpose

This document converts the approved hardening plan for:

- NEET
- JEE
- GRE
- AWS certification

into implementation-ready tickets for the first two phases:

1. family definition alignment
2. authoring and template hardening

It should be used together with:

- [NEET_JEE_GRE_AWS_EXAM_FAMILY_HARDENING_PLAN.md](/Users/ansh/Documents/Eductech/NEET_JEE_GRE_AWS_EXAM_FAMILY_HARDENING_PLAN.md:1)
- [EXAM_CREATION_SCENARIO_CATALOG.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/EXAM_CREATION_SCENARIO_CATALOG.md:1)

For the next lane after these four families, see:

- [LANGUAGE_PROFICIENCY_PHASE_0_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/LANGUAGE_PROFICIENCY_PHASE_0_1_IMPLEMENTATION_TICKETS.md:1)

## Implementation Order

Build these phases in this order:

1. family metadata contract
2. preset-pack source of truth
3. guided-wizard defaults
4. advanced-builder defaults
5. family-aware authoring hints

This order avoids building UI wording before the family contract is locked.

## Current Execution Snapshot

### Completed now

- `Done` canonical family metadata exists for:
  - NEET
  - JEE
  - GRE
  - AWS certification
- `Done` preset-pack source of truth exists for those lanes
- `Done` guided-create family defaults exist
- `Done` advanced-builder family defaults and guidance exist
- `Done` family-aware authoring hints exist
- `Done` NEET dedicated seeded runtime lane exists and is verified
- `Done` JEE dedicated seeded runtime lane exists and is verified
- `Done` GRE dedicated seeded runtime lane exists and is verified
- `Done` AWS certification dedicated seeded runtime lane exists and is verified

### Verified runtime lanes

- NEET:
  - `DMO-NEET-FULL-01`
  - `DMO-NEET-RESULT-01`
  - `demo-neet-student`
- JEE:
  - `DMO-JEE-FULL-01`
  - `DMO-JEE-RESULT-01`
  - `demo-jee-student`
- GRE:
  - `DMO-GRE-QUANT-01`
  - `DMO-GRE-RESULT-01`
  - `demo-gre-student`
- AWS certification:
  - `DMO-AWS-PRACTICE-01`
  - `DMO-AWS-RESULT-01`
  - `demo-aws-student`

### Verified automation now present

- NEET:
  - backend seed test
  - student contract
  - student mutable lifecycle
  - teacher oversight
  - institute oversight
  - admin oversight
- JEE:
  - backend seed test
  - student contract
  - student mutable lifecycle
  - teacher oversight
  - institute oversight
  - admin oversight
- GRE:
  - backend seed test
  - student contract
  - student mutable lifecycle
  - teacher oversight
  - institute oversight
  - admin oversight
- AWS certification:
  - backend seed test
  - student contract
  - student mutable lifecycle
  - teacher oversight
  - institute oversight
  - admin oversight

### Main work still open from this family set

- deeper reporting/release hardening where customer expectations go beyond current seeded coverage

## Ticket Group A: Phase 0 Family Definition Alignment

## Ticket A1: Define canonical family metadata model

### Objective

Introduce one explicit metadata contract for NEET, JEE, GRE, and AWS certification.

### Outcome

The platform stops treating these families as only labels or notes and starts treating them as structured product lanes.

### Scope

Define a family contract that can carry at least:

- family id
- learner-facing label
- exam-family category
- recommended exam type
- recommended timing model
- recommended security mode
- recommended review policy
- recommended result visibility
- recommended question mix guidance

### Suggested implementation location

- shared assessment metadata layer near preset-pack or exam-family config utilities
- avoid spreading defaults across multiple page components

### Acceptance criteria

- all four families have one canonical metadata definition
- metadata can be consumed by preset packs and future builder defaults
- product does not rely on freeform copy alone to define family behavior

## Ticket A2: Lock family product contract decisions

### Objective

Resolve the key ambiguity questions before UI and QA expansion.

### Outcome

The team can build against a stable product definition instead of assumptions.

### Scope

Lock decisions for:

- NEET:
  - mock only vs mock plus sectional practice
- JEE:
  - numeric-entry support required now vs later
- GRE:
  - total-score readiness first vs sectional reporting first
- AWS:
  - practice-only lane vs practice plus readiness assessment lane

### Deliverable format

- one decision table in the family hardening plan or a linked source-of-truth note

### Acceptance criteria

- no family has unresolved launch-critical ambiguity
- authoring and analytics teams can point to one decision source

## Ticket A3: Create family-to-preset-pack source of truth

### Objective

Make preset-pack behavior deterministic and auditable.

### Outcome

Preset packs become a controlled product surface rather than a loose catalog of ideas.

### Scope

For each of the four families, define:

- preset pack id
- family ownership
- default exam type
- default timing expectation
- default security suggestion
- default review/result suggestion
- authoring note to show in creation flows

### Acceptance criteria

- each family maps to one explicit preset-pack definition
- preset-pack direction matches the canonical family metadata model

## Ticket Group B: Phase 1 Preset And Authoring Hardening

## Ticket B1: Expand preset-pack definitions with real defaults

### Objective

Move preset packs beyond label/note/chip into meaningful creation defaults.

### Outcome

Admin and institute users can start family-aligned exams with less setup ambiguity.

### Scope

Extend preset-pack definitions to carry:

- default exam type
- suggested duration
- suggested section count
- suggested question-count band
- suggested security mode
- suggested review/result behavior
- suggested access/economy posture where appropriate

### Family notes

- NEET:
  - mock-first defaults
- JEE:
  - stricter timed and difficulty-oriented defaults
- GRE:
  - formal timed-section defaults
- AWS:
  - certification practice defaults with cleaner single-section guidance

### Acceptance criteria

- preset-pack objects are meaningful enough to drive first-draft configuration
- no family preset feels like placeholder marketing copy only

## Ticket B2: Add guided-create family defaults

### Objective

Make guided exam creation feel intentionally adapted for these families.

### Outcome

Creation through the wizard no longer starts from a school-only mental model.

### Scope

When a family preset or family choice is selected in the wizard:

- prefill exam type
- prefill suggested duration
- prefill review/result defaults
- prefill security suggestion
- surface a short family setup note

### Acceptance criteria

- guided create produces a reasonable first draft for all four families
- teacher/admin does not need to infer the default shape manually

## Ticket B3: Add advanced-builder family defaults

### Objective

Bring the same family-awareness into the advanced builder.

### Outcome

Advanced builder becomes credible for competitive and certification lanes, not just generic exam shells.

### Scope

Support family defaults for:

- exam identity seed
- duration and timing hints
- section scaffolding
- publish/review/result defaults
- security suggestions

### Acceptance criteria

- advanced builder can open in a family-aligned initial state
- summary rail and preview surfaces reflect family defaults correctly

## Ticket B4: Add family-aware authoring hints in create flows

### Objective

Give authors practical guidance while building.

### Outcome

Family-aligned exams become easier to author correctly on the first try.

### Scope

Add family-aware hints for:

- recommended section structure
- timing expectations
- question-count ranges
- security posture
- review-result expectations

### Family examples

- NEET:
  - exam-day discipline and mock pacing
- JEE:
  - challenge and timing pressure cues
- GRE:
  - formal timed-section pacing
- AWS:
  - domain-cluster certification practice framing

### Acceptance criteria

- hints are visible in wizard and/or builder where decisions are made
- wording helps real authoring decisions instead of repeating preset labels

### Phase 2 hardening progress

- the advanced builder family-profile surface now shows a lane-specific execution checklist for:
  - NEET
  - JEE
  - GRE
  - AWS certification
- the checklist turns preset and family metadata into concrete authoring guardrails such as:
  - mock-first structure discipline for NEET
  - numeric-answer and negative-marking stance for JEE
  - total-score-first reporting caution for GRE
  - domain-cluster scenario framing for AWS certification
- targeted frontend hardening landed in:
  - [edutech_web/src/components/ui/advanced-exam-builder.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/advanced-exam-builder.tsx:1)
  - [edutech_web/src/components/ui/create-exam-wizard.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/create-exam-wizard.tsx:1)

### Validation

- file-level ESLint passed for the advanced builder
- repo-wide `npm run typecheck` passed after the related frontend null-safety cleanup

## Ticket Group C: Family-Specific Definition Passes

## Ticket C1: AWS certification first-pass productization

### Objective

Use AWS as the lowest-friction family to prove the pattern.

### Outcome

One non-school family reaches explicit product readiness before the broader rollout.

### Scope

- finalize AWS family metadata
- finalize AWS preset defaults
- finalize AWS guided/advanced-builder defaults
- add AWS authoring hints

### Acceptance criteria

- AWS family can be created through at least one deliberate, family-aware path
- AWS no longer feels generic or school-first in authoring

### Phase 2 hardening progress

- the student analytics landing page now detects AWS certification context from live analytics data and available certification practice exams
- AWS analytics copy now uses domain-readiness framing instead of school-first weak-topic/mock wording on the main analytics workspace
- targeted frontend hardening landed in:
  - [edutech_web/src/app/(student)/app/analytics/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/analytics/page.tsx:1)

### Validation

- file-level ESLint passed for the analytics page
- repo-wide `npm run typecheck` still fails because of pre-existing unrelated errors in:
  - `src/components/ui/advanced-exam-builder.tsx`
  - `tests/e2e/workflow/student-analytics-scope-persistence-workspace.spec.ts`
  - `tests/e2e/workflow/student-post-submit-workspace.spec.ts`

## Ticket C2: NEET first-pass productization

### Objective

Convert NEET into a clearly supported high-stakes mock lane.

### Scope

- mock-first metadata defaults
- section pacing guidance
- stricter security and runtime suggestion defaults

### Acceptance criteria

- NEET creation feels mock-first and intentional

### Phase 2 hardening progress

- the student attempt runtime page now uses NEET-aware mock/exam-day wording when the active attempt is a NEET-style competitive lane
- the student results workspace now uses NEET-aware mock seriousness and repair-loop wording instead of generic result/practice language
- targeted frontend hardening landed in:
  - [edutech_web/src/app/(student)/app/attempts/[attemptId]/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/page.tsx:1)
  - [edutech_web/src/app/(student)/app/results/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/results/page.tsx:1)

### Validation

- file-level ESLint passed for the touched student attempt and results pages

## Ticket C3: JEE first-pass productization

### Objective

Turn JEE from preset direction into a clear advanced authoring lane.

### Scope

- timing and structure defaults
- explicit stance on numeric-entry support in this phase
- stronger challenge-oriented authoring guidance

### Acceptance criteria

- JEE creation path no longer depends on undocumented assumptions

### Phase 2 hardening progress

- advanced-builder preview now exposes JEE numeric-entry contract signals for `jee_mains_math`
- preview warns when the resolved JEE blueprint contains no numeric-entry questions
- preview now rejects JEE numeric-entry sections that carry negative marking in the current product contract
- targeted backend coverage added in:
  - [edutech_backend/apps/exams/test_advanced_builder_api.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/test_advanced_builder_api.py:1)

## Ticket C4: GRE first-pass productization

### Objective

Make GRE credible as a graduate-admission assessment lane.

### Scope

- sectional timing defaults
- clearer review/result defaults
- explicit score-display roadmap note if sectional scoring is deferred

### Acceptance criteria

- GRE can be authored with a clear product contract even if later analytics/scoring depth is still pending

### Phase 2 hardening progress

- advanced-builder preview now returns an explicit GRE reporting contract for `gre_quant`
- GRE preview now warns when review/result visibility is configured in ways that overpromise the current GRE reporting depth
- advanced-builder create now persists the GRE reporting contract into exam metadata for downstream inspection
- targeted backend coverage added in:
  - [edutech_backend/apps/exams/test_advanced_builder_api.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/test_advanced_builder_api.py:1)

## Ticket Group D: QA And Documentation Support For Phase 0-1

## Ticket D1: Add family-definition checklist

### Objective

Prevent incomplete family rollout claims.

### Scope

Checklist should confirm for each family:

- metadata defined
- preset defaults defined
- wizard defaults defined
- builder defaults defined
- authoring hints written

### Acceptance criteria

- team can tell whether a family is truly Phase 0-1 complete

### Status

Implemented in:

- [EXAM_FAMILY_PHASE_0_1_CHECKLIST.md](/Users/ansh/Documents/Eductech/EXAM_FAMILY_PHASE_0_1_CHECKLIST.md:1)

## Ticket D2: Add family-launch readiness note

### Objective

Keep the confidence level honest while implementation is in progress.

### Scope

Document for each family:

- current confidence
- remaining Phase 2+ blockers
- whether the family is:
  - internal only
  - pilot-ready
  - broader launch-ready

### Acceptance criteria

- product discussions stop treating “preset exists” as “family fully supported”

### Status

Implemented in:

- [EXAM_FAMILY_LAUNCH_READINESS_NOTE.md](/Users/ansh/Documents/Eductech/EXAM_FAMILY_LAUNCH_READINESS_NOTE.md:1)

## Recommended First Execution Slice

Start with these five tickets:

1. `A1` Define canonical family metadata model
2. `A2` Lock family product contract decisions
3. `A3` Create family-to-preset-pack source of truth
4. `B1` Expand preset-pack definitions with real defaults
5. `C1` AWS certification first-pass productization

## Why This Slice First

- it establishes the reusable pattern
- it resolves ambiguity before UI spread
- it gives one fast non-school proof lane through AWS
- it avoids starting with the highest scoring complexity first

## Validated Release Bundle

Use this small bundle when we want a fast confidence check for the currently hardened family-release paths.

### What Is Covered Right Now

- competitive delayed-release flow:
  - NEET
  - JEE
  - GRE
- certification immediate-release flow:
  - AWS Practitioner
- both release modes validated in:
  - admin scope
  - institute scope
  - teacher scope
- backend immediate-result generation safety net
- backend immediate-result retry and rank recalculation safety net

### Web E2E Commands

Run from `edutech_web/`.

Institute competitive delayed-release validation:

```bash
PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1 \
PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 \
npx playwright test tests/e2e/workflow/institute-family-release-happy-path.mutable.spec.ts
```

This proves:

- institute can create and publish family-aligned exams
- student submit stays hidden until institute release for competitive lanes
- institute results readiness moves from blocked to ready
- leaderboard becomes available after release
- learner results and answer review unlock after institute release

Institute certification immediate-release validation:

```bash
PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1 \
PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 \
npx playwright test tests/e2e/workflow/institute-family-immediate-release.mutable.spec.ts
```

This proves:

- AWS learner summary and result availability unlock immediately after submit
- institute results readiness still requires exam completion
- leaderboard becomes ready after completion plus rank calculation
- student result visibility and review-availability messaging stay consistent after persistence catches up

Teacher competitive delayed-release validation:

```bash
PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1 \
PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 \
PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS=1 \
npx playwright test tests/e2e/workflow/teacher-family-release-happy-path.mutable.spec.ts
```

This proves:

- teacher can create and publish family-aligned exams
- student submit stays hidden until teacher release for competitive lanes
- teacher results readiness moves from blocked to ready
- teacher leaderboard becomes available after release
- learner results and answer review unlock after teacher release

Teacher certification immediate-release validation:

```bash
PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1 \
PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 \
PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS=1 \
npx playwright test tests/e2e/workflow/teacher-family-immediate-release.mutable.spec.ts
```

This proves:

- AWS learner summary and result availability unlock immediately after submit under teacher-owned exams
- teacher results readiness still requires exam completion
- teacher leaderboard becomes ready after completion plus rank calculation
- learner result visibility and review-availability messaging stay consistent after persistence catches up

Admin competitive delayed-release validation:

```bash
PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS=1 \
PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 \
npx playwright test tests/e2e/workflow/admin-family-release-happy-path.mutable.spec.ts
```

This proves:

- admin can create and publish family-aligned exams through template-governed builder scope
- student submit stays hidden until admin release for competitive lanes
- admin exam detail shows blocked publish state while live and ready result state after completion plus release
- learner results and answer review unlock after admin release

Admin certification immediate-release validation:

```bash
PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS=1 \
PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 \
npx playwright test tests/e2e/workflow/admin-family-immediate-release.mutable.spec.ts
```

This proves:

- AWS learner summary and result availability unlock immediately after submit under admin-owned exams
- admin exam detail keeps result readiness blocked until exam completion
- admin result readiness becomes ready after completion plus rank calculation
- learner result visibility and review-availability messaging stay consistent after persistence catches up

### Backend Regression Commands

Run from `edutech_backend/`.

Immediate-result creation on submit:

```bash
./.venv/bin/python manage.py test \
  apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_submit_attempt_generates_immediate_result_records
```

Immediate-result retry plus rank recalculation:

```bash
./.venv/bin/python manage.py test \
  apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_immediate_result_mode_publishes_each_retry_and_recalculates_ranks
```

Combined backend bundle:

```bash
./.venv/bin/python manage.py test \
  apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_submit_attempt_generates_immediate_result_records \
  apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_immediate_result_mode_publishes_each_retry_and_recalculates_ranks
```

### Operational Note

- run the backend bundle and the Playwright bundle sequentially when possible
- parallel execution can push the AWS e2e path into timeout noise even when product behavior is correct
- if the AWS immediate-release e2e flakes during builder startup, rerun it in isolation before treating it as a product regression

### CI Entry Point

- cross-role CI validation now lives in [.github/workflows/family-release-validation.yml](/Users/ansh/Documents/Eductech/.github/workflows/family-release-validation.yml:1)
- the workflow runs [scripts/family_release_validation_bundle.sh](/Users/ansh/Documents/Eductech/scripts/family_release_validation_bundle.sh:1) so local signoff and CI use the same backend plus Playwright sequence
- the bundle now validates:
  - institute family release flows
  - teacher family release flows
  - admin family release flows
  - teacher family authoring contracts
  - institute family authoring contracts
  - admin family authoring contracts
