# Advanced Exam Builder Phase 1 Ease Plan

## Purpose

This document defines the first teacher-experience improvement phase for the advanced exam builder.

It does not replace the core builder spec.

Implementation tickets for this phase live in:

- [ADVANCED_EXAM_BUILDER_PHASE_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/ADVANCED_EXAM_BUILDER_PHASE_1_IMPLEMENTATION_TICKETS.md:1)

It focuses on one question:

`How do we make advanced exam creation feel easier, safer, and more confidence-driven for teachers without reducing builder power?`

## Context

The current advanced builder already has strong foundations:

- live academic scope
- section-based composition
- delivery and access controls
- template support
- backend preview support

The current friction is not lack of capability.

The friction is teacher confidence and effort:

- teachers still need to mentally validate whether the paper is sensible
- teachers still repeat setup work across similar exams
- teachers still discover availability and structure issues too late
- preview is useful, but not yet teacher-complete

Marks support is already handled and is not a Phase 1 scope item for this plan.

## Phase 1 Goal

Reduce teacher uncertainty during exam creation.

At the end of Phase 1, a teacher should be able to:

- understand whether the current exam setup is structurally valid
- see what the exam will look like before final creation
- detect shortages or conflicts earlier
- move through the advanced builder with less second-guessing

## Phase 1 Success Outcomes

Phase 1 is successful if teachers can do the following with less friction:

1. trust the builder preview before creating the exam
2. catch missing or risky configuration before create
3. understand whether enough questions exist for their requested composition
4. see the final learner-facing exam shape clearly enough to self-validate

## Phase 1 Scope

Phase 1 should include only the following four improvements:

1. full exam preview
2. pre-create checklist
3. live feasibility signals
4. stronger persistent builder summary

## Phase 1 Non-Goals

Do not include these in Phase 1:

- clone from existing exam
- simple mode vs advanced mode
- section presets
- auto-distribute helpers
- new marks-planning flows
- template redesign
- major backend model changes unless preview/checklist requires them

Those belong to later phases.

## Phase 1 Workstreams

### 1. Full Exam Preview

#### Problem

Current preview is a resolution summary.

It helps developers and advanced users, but it is not yet the teacher’s final confidence surface.

Teachers need a fuller answer to:

`If I create this now, what exactly will this exam feel like?`

#### Phase 1 Requirement

Preview should become a teacher-readable review surface.

It should show:

- exam title
- exam code
- exam type
- delivery mode
- duration
- total questions
- total marks
- schedule summary
- section order
- section names
- section question counts
- section marks summary
- section timer behavior
- section navigation behavior
- topic breakup by section
- difficulty breakup by section
- learner-facing instructions summary
- result and review behavior summary
- access mode summary
- warnings and unresolved constraints

#### Teacher Value

This reduces the need to mentally combine information from multiple builder panels.

#### UX Rule

Preview should have two reading modes inside the same surface:

- `Teacher summary`
- `Student-facing behavior`

This does not mean a full rendered attempt runtime yet.

It means the teacher can clearly understand what the student experience will be.

### 2. Pre-Create Checklist

#### Problem

Teachers should not discover major issues only after pressing create.

#### Phase 1 Requirement

Before final create, the builder should show a checklist panel with pass, warning, or blocked states.

Checklist items should cover:

- academic scope selected
- title and code present
- at least one section exists
- each section has at least one topic
- requested question counts are valid
- section composition is feasible enough to preview
- delivery settings are internally consistent
- review/result settings are internally consistent
- access settings are internally consistent
- no obviously empty or invalid runtime fields remain

#### Teacher Value

This gives teachers a clear sense of readiness instead of forcing them to infer it.

#### UX Rule

Checklist must be human-readable.

Avoid generic technical messages.

Good example:

- `Section B has no valid topic rows yet.`

Bad example:

- `Composition payload invalid.`

### 3. Live Feasibility Signals

#### Problem

Teachers often configure sections and topic mixes before knowing whether the question inventory can actually satisfy that request.

That creates avoidable trial and error.

#### Phase 1 Requirement

Show live signals while the teacher builds.

Signals should appear at:

- overall builder level
- section level
- topic-row level where relevant

Signals should help answer:

- do enough questions exist?
- is this section over-requesting inventory?
- is the advanced-difficulty mix realistic?
- is a selected topic too shallow for the requested count?

#### Suggested signal language

- `Good coverage`
- `Limited pool`
- `High risk of shortage`
- `Advanced mix may be hard to resolve`
- `Topic request exceeds likely inventory`

#### Teacher Value

This moves validation earlier and makes the builder feel supportive rather than reactive.

#### UX Rule

These are advisory signals, not final backend truth.

They should be visually distinct from final preview validation.

### 4. Persistent Builder Summary

#### Problem

Teachers keep re-checking the same top-level exam math and structure while editing.

#### Phase 1 Requirement

The summary panel should always keep the key exam totals visible.

It should show:

- total sections
- total requested questions
- total marks
- exam duration
- average time per question
- selected subject
- selected cohort or scope summary
- delivery mode
- access mode
- current preview state:
  - not run yet
  - valid with warnings
  - valid and clean
  - blocked

#### Teacher Value

This reduces back-and-forth across stages and lowers cognitive load.

## Recommended Build Order

Phase 1 should be implemented in this order:

1. stronger persistent builder summary
2. live feasibility signals
3. pre-create checklist
4. full exam preview

Reason:

- summary and signals improve editing immediately
- checklist depends on some of the same validation reasoning
- full preview should be built last so it can consume the final summary and validation outputs cleanly

## UX Principles For Phase 1

### 1. Support confidence, do not add clutter

Each new element must reduce doubt.

Do not add explanation-heavy panels that say the same thing twice.

### 2. Separate advisory from final

Live signals are advisory.

Preview and checklist are stronger final guidance.

The UI should not blur those meanings.

### 3. Keep advanced power intact

Do not hide existing controls in Phase 1.

The goal is guidance, not simplification by removal.

### 4. Show consequences clearly

Runtime settings should be summarized in teacher language.

Example:

- `Learners can return to previous sections`
- `Results appear only after review`
- `Each section runs on its own timer`

## Suggested Teacher Flow After Phase 1

1. Teacher chooses scope and basic exam identity.
2. Teacher composes sections and topics.
3. Builder shows live feasibility signals while they edit.
4. Teacher checks the persistent summary for totals and structure.
5. Teacher runs preview.
6. Preview and checklist together show whether the exam is ready.
7. Teacher creates the exam with far less uncertainty.

## Acceptance Criteria

Phase 1 can be considered complete when:

1. a teacher can preview the full exam shape before creation
2. the builder exposes readiness and warning states before create
3. inventory or composition risks are visible before final preview
4. the right-side summary is useful enough to guide editing continuously
5. the builder feels more supportive without introducing new workflow confusion

## Dependencies

Phase 1 may depend on:

- existing preview endpoint expansion
- additional preview payload details
- question-inventory aggregation or resolution hints
- frontend state modeling for advisory vs final validation states

If backend expansion is needed, keep it additive and builder-focused.

## Risks To Avoid

- turning preview into a dense developer dump
- showing low-confidence warnings as hard failures
- duplicating the same status across three different panels
- making the checklist too technical
- blocking create on advisory-only issues

## Follow-Up After Phase 1

Once Phase 1 is complete, the next best teacher-easing work should be:

1. clone from existing exam
2. section presets
3. auto-distribute helpers
4. simple mode vs advanced mode
5. student-mode preview
