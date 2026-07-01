# Multi-Subject Exam Phase 0 And Phase 1 Implementation Tickets

## Purpose

This document converts the approved multi-subject exam plan into implementation-ready tickets for the first two phases:

1. contract and dependency alignment
2. data model, migration, and backend compatibility foundation

It should be used together with:

- [MULTI_SUBJECT_EXAM_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/MULTI_SUBJECT_EXAM_IMPLEMENTATION_PLAN.md:1)
- [EXAM_CREATION_SCENARIO_CATALOG.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/EXAM_CREATION_SCENARIO_CATALOG.md:1)

## Implementation Order

Build these phases in this order:

1. singular-subject dependency audit
2. target contract lock
3. migration rules
4. serializer and payload compatibility
5. advanced builder backend support

This order avoids introducing section-level subject UX before the API and historical data rules are stable.

## Ticket Group A: Phase 0 Contract And Dependency Alignment

## Ticket A1: Create singular-subject dependency inventory

### Objective

Identify every important place where the platform currently assumes `one exam = one subject`.

### Outcome

The team gets one explicit map of product and technical surfaces that will be affected by the multi-subject shift.

### Scope

Audit at least these surfaces:

- guided exam creation
- advanced exam builder
- exam create and edit payloads
- exam serializers
- exam list and detail pages
- student runtime metadata
- student results and analytics
- workspace search and filters
- any economy or policy summary that exposes `subject_name`

### Suggested locations to audit first

- [create-exam-wizard.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/create-exam-wizard.tsx:346)
- [advanced-exam-builder.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/advanced-exam-builder.tsx:1224)
- [new exam page](/Users/ansh/Documents/Eductech/edutech_web/src/app/(institute)/institute/exams/new/page.tsx:47)
- [teacher-builder API types](/Users/ansh/Documents/Eductech/edutech_web/src/lib/api/teacher-builder.ts:78)
- [exam serializers](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:924)
- [student subject context](/Users/ansh/Documents/Eductech/edutech_web/src/lib/student/subject-context.ts:375)
- [workspace live search](/Users/ansh/Documents/Eductech/edutech_web/src/lib/workspace/live-search.ts:67)

### Deliverable format

- one table with:
  - surface
  - current singular-subject assumption
  - target multi-subject behavior
  - migration risk
  - owner or implementation lane

### Acceptance criteria

- no critical subject-dependent surface is still unknown
- downstream reporting and student surfaces are included, not only authoring screens

## Ticket A2: Lock canonical multi-subject product contract

### Objective

Turn the discussion into one stable product contract that all implementation teams can build against.

### Outcome

The platform stops relying on ad hoc interpretation of what “multi-subject exam” means.

### Scope

Lock these rules explicitly:

- an exam may span multiple subjects
- each section must have exactly one subject
- section questions must match that section subject
- exam-level subject is either:
  - temporary compatibility field
  - primary display field
  - default seed only

### Required decisions

- whether exam-level `subject` remains required, optional, or replaced by `primary_subject`
- how mixed-subject exam cards should display subject summary
- whether question linking allows any future cross-subject override

### Acceptance criteria

- backend and frontend teams can point to one contract
- no launch-critical ambiguity remains on section ownership or payload shape

## Ticket A3: Define compatibility and migration rules

### Objective

Make the transition safe for current production data and current UI consumers.

### Outcome

Existing single-subject exams continue to work while new multi-subject exams become possible.

### Scope

Define rules for:

- existing exams with one exam-level subject and existing sections
- existing draft exams with no sections yet
- read APIs consumed by screens that expect one `subject_name`
- inconsistent historical records where section and question subject relationships may not align perfectly

### Required outputs

- one backfill rule for section subject population
- one fallback rule for read serializers
- one manual-audit rule for inconsistent historical records

### Acceptance criteria

- migration strategy is explicit before schema or serializer work begins
- no team depends on hidden or informal backfill behavior

## Ticket A4: Define subject-summary read contract

### Objective

Prepare read surfaces for the fact that an exam may no longer map cleanly to one subject label.

### Outcome

List views, detail headers, and student pages can evolve without ambiguous serializer behavior.

### Scope

Decide how read APIs should expose:

- legacy `subject`
- legacy `subject_name`
- primary subject if any
- multi-subject summary
- section subject detail

### Options to evaluate

- keep `subject_name` as compatibility field and add a new `subject_summary`
- derive `subject_name` from primary subject only
- mark mixed-subject exams with a generic label plus explicit subject list

### Acceptance criteria

- read contract is clear enough for UI work to start
- legacy consumers have a transition path

## Ticket Group B: Phase 1 Data Model, API, And Builder Foundation

## Ticket B1: Add section-level subject support to authoring contract

### Objective

Make section subject the source of truth for new exam authoring.

### Outcome

Section drafts and section blueprints can carry one explicit subject each.

### Scope

Update section authoring contract to support:

- subject id per section
- section-level topic filtering
- section-level validation against linked questions

### Suggested implementation surfaces

- [AdvancedExamSectionBlueprintSerializer](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:470)
- builder-side section draft types near [advanced-exam-builder.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/advanced-exam-builder.tsx:1224)

### Acceptance criteria

- new section payloads can carry one subject each
- section payload contract is stable enough for preview and create flows

## Ticket B2: Implement migration-safe backend validation

### Objective

Prevent invalid cross-subject authoring while preserving compatibility for legacy data during rollout.

### Outcome

The API enforces the new rules without hard-breaking older exams that have not been re-authored yet.

### Scope

Validate that:

- every authored section has one subject
- selected topics belong to the section subject
- linked questions belong to the section subject
- old payloads without section subject can still be normalized during transition when allowed

### Acceptance criteria

- invalid mixed-subject payloads fail with clear messages
- legacy single-subject flows still work during the migration window

## Ticket B3: Introduce read compatibility layer for mixed-subject exams

### Objective

Return enough information for old and new UI surfaces to coexist during rollout.

### Outcome

Serializer consumers can continue rendering safely while newer surfaces start using richer subject metadata.

### Scope

Update read serializers to expose:

- section subject data
- compatibility subject display fields
- optional multi-subject summary fields

### Primary files

- [ExamReadSerializer](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:924)
- [ExamListSerializer](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:1011)

### Acceptance criteria

- list and detail APIs remain consumable by current UI
- newer UI can differentiate single-subject and mixed-subject exams

## Ticket B4: Add advanced builder backend support for section subject flows

### Objective

Enable the advanced builder to preview and create multi-subject exams correctly.

### Outcome

Builder preview and create APIs support mixed-subject section composition.

### Scope

- accept section subject in preview payloads
- accept section subject in create payloads
- return section subject in preview responses
- ensure topic pools are validated against the section subject

### Acceptance criteria

- advanced builder API can represent one exam with multiple section subjects
- backend preview results are truthful for mixed-subject composition

## Ticket B5: Refactor advanced builder state model away from one global subject dependency

### Objective

Prepare the frontend builder foundation before guided wizard work begins.

### Outcome

The builder no longer treats one selected subject as the only authoring scope.

### Scope

Replace or reduce the current dependency on:

- one exam-wide selected subject
- one exam-wide topic pool
- one subject-derived identity seed for all sections

Support instead:

- default subject seed at exam level if needed
- section-level subject selection
- section-local topic filtering and hints

### Primary file

- [advanced-exam-builder.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/advanced-exam-builder.tsx:1224)

### Acceptance criteria

- builder state can represent mixed-subject drafts cleanly
- adding a new section no longer assumes the same subject as all earlier sections

## Ticket B6: Add first family scaffolds for School, NEET, and JEE

### Objective

Use the new model to prove value in the most important launch lanes first.

### Outcome

The new architecture is exercised by real, high-value exam structures instead of generic examples only.

### Scope

Create scaffold expectations for:

- School mixed-subject periodic or unit tests
- NEET Physics, Chemistry, Biology mock structure
- JEE Physics, Chemistry, Mathematics structure

### Acceptance criteria

- at least one recommended scaffold exists for each of the three lanes
- builder defaults can demonstrate real multi-subject value, not just technical capability

## Ticket B7: Add backend and contract regression coverage

### Objective

Lock down the new data rules before broader UI rollout.

### Outcome

The platform gains regression protection around the most failure-prone part of the change.

### Scope

Add tests for:

- legacy single-subject create and read behavior
- multi-subject section payload acceptance
- invalid cross-subject topic or question payload rejection
- serializer output for mixed-subject list and detail responses

### Acceptance criteria

- backend contract tests cover both old and new models
- migration-safe behavior is proven, not only assumed

## Recommended Start Order Inside Phase 1

1. `B1` section-level authoring contract
2. `B2` validation rules
3. `B3` read compatibility layer
4. `B4` advanced builder backend support
5. `B5` advanced builder frontend state refactor
6. `B6` family scaffolds
7. `B7` regression coverage

## Exit Criteria For Phase 1

Phase 1 is complete when:

- backend contracts support section-level subject authoring
- old single-subject flows still function
- advanced builder can represent mixed-subject exam drafts
- School, NEET, and JEE scaffolding direction is clear
- regression coverage exists for both compatibility and new behavior

## What Comes Next

After this document is complete, the next implementation lane should be:

1. advanced builder UX completion
2. guided wizard alignment
3. exam list, detail, and student-surface truthfulness updates
4. Playwright expansion for mixed-subject authoring and runtime
