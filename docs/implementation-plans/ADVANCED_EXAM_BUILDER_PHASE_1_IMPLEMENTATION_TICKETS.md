# Advanced Exam Builder Phase 1 Implementation Tickets

## Purpose

This document converts the approved Phase 1 ease plan into implementation-ready tickets.

It should be used together with:

- [ADVANCED_EXAM_BUILDER_PHASE_1_EASE_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/ADVANCED_EXAM_BUILDER_EASE_ROADMAP.md:1)
- [TEACHER_EXAM_LIFECYCLE_AND_BUILDER_SPEC.md](/Users/ansh/Documents/Eductech/docs/frontend-mobile/TEACHER_EXAM_LIFECYCLE_AND_BUILDER_SPEC.md:1)

## Implementation Order

Build Phase 1 in this order:

1. persistent builder summary
2. live feasibility signals
3. pre-create checklist
4. full exam preview

This order keeps early work reusable by later work.

## Ticket 1: Persistent Builder Summary

### Objective

Make the right-side builder summary useful during editing without requiring preview first.

### Teacher Outcome

Teacher can continuously see whether the exam shape still makes sense while editing sections and delivery rules.

### Frontend Scope

Update the advanced builder summary panel to always show:

- total sections
- total requested questions
- total marks
- exam duration
- average time per question
- selected academic scope summary
- delivery mode
- access mode
- preview state badge

### Suggested UI placement

Keep this in the current summary rail rather than introducing a new panel.

### Data source

Use current builder state only.

Do not depend on backend preview for first render.

### Implementation notes

- derive totals from live section state
- surface preview status as:
  - `Not previewed`
  - `Preview clean`
  - `Preview has warnings`
  - `Preview blocked`
- keep labels teacher-readable

### Acceptance criteria

- teacher can see exam totals without running preview
- summary updates when sections change
- summary updates when delivery mode or access mode changes
- summary does not require scrolling through stage panels to understand core totals

## Ticket 2: Live Feasibility Signals

### Objective

Warn teachers early when the current composition is likely to be hard or impossible to resolve cleanly.

### Teacher Outcome

Teacher gets early signals while building instead of learning about problems only at final preview.

### Frontend Scope

Add advisory signals at:

- overall builder level
- each section card
- topic-row level where relevant

### Signal types

- `Good coverage`
- `Limited pool`
- `High risk of shortage`
- `Difficulty mix may be hard to satisfy`
- `Topic selection incomplete`

### Data source

Prefer lightweight resolution metadata driven by available topic/question inventory.

This may require a small backend helper if current frontend state is not enough.

### Implementation notes

- signals are advisory, not blocking
- signal styling must differ from final checklist errors
- do not flood every row with warnings by default
- aggregate repeated warnings at section level when possible

### Backend touchpoint

If needed, add a lightweight feasibility endpoint or extend the preview endpoint with a fast advisory mode.

### Acceptance criteria

- teacher sees section-level risk before preview
- incomplete topic rows are clearly flagged
- shortage-style warnings appear before create
- advisory warnings do not block editing

## Ticket 3: Pre-Create Checklist

### Objective

Give the teacher a clear readiness checklist before create.

### Teacher Outcome

Teacher knows what is ready, what needs attention, and what must be fixed before creating the exam.

### Frontend Scope

Add a checklist panel near final actions that shows:

- pass items
- warning items
- blocked items

### Checklist coverage

- scope selected
- exam identity complete
- at least one section exists
- each section has valid topic rows
- section counts are valid
- delivery settings are internally consistent
- review/result settings are internally consistent
- access settings are internally consistent
- no critical empty fields remain

### UX rules

- use plain teacher language
- checklist should be skimmable
- blocked items should identify the affected section when possible

### Data source

Derived from builder state plus any backend-backed validation that preview already exposes.

### Backend touchpoint

Prefer sharing validation logic with preview instead of inventing a second rules engine.

### Acceptance criteria

- teacher can tell whether create is safe to attempt
- checklist distinguishes warning vs blocked states
- checklist messages are readable without developer context
- checklist updates after builder edits

## Ticket 4: Full Exam Preview

### Objective

Turn preview into a teacher-confidence surface rather than a technical resolution summary.

### Teacher Outcome

Teacher can inspect the exam as a final artifact before creation.

### Frontend Scope

Expand the preview surface to show:

- exam identity and schedule summary
- section order and section details
- section question and marks summary
- topic breakup by section
- difficulty breakup by section
- timer and navigation behavior
- review/result behavior
- access mode summary
- warnings and unresolved constraints

### Reading modes

Preview should support two clear sections:

1. teacher summary
2. student-facing behavior summary

### UX rules

- preview should feel like a review screen, not raw JSON translated into cards
- warnings must be grouped logically
- preview should not bury the final structure under too many micro-metrics

### Backend touchpoint

Likely requires preview payload expansion.

Needed preview payload should include:

- clearer section resolution detail
- section runtime behavior summary
- learner-facing behavior summary
- consistent warning categorization

### Acceptance criteria

- teacher can understand final exam shape from preview alone
- preview shows section structure clearly
- preview explains learner-facing behavior clearly
- preview warnings are understandable and actionable

## Cross-Ticket Rules

### Rule 1

Do not duplicate logic unnecessarily between feasibility, checklist, and preview.

Shared reasoning should come from one validation direction where possible.

### Rule 2

Advisory signals must not behave like hard validation failures.

### Rule 3

Teacher-facing wording must stay operational and simple.

### Rule 4

All new surfaces must fit inside the existing advanced builder shell and design language.

## Recommended Delivery Sequence

### Slice A

Implement Ticket 1 first.

This improves usability immediately and creates the shared summary frame for later states.

### Slice B

Implement Ticket 2 next.

This starts reducing teacher trial and error during composition.

### Slice C

Implement Ticket 3 using the same reasoning model wherever possible.

### Slice D

Implement Ticket 4 last so preview can consume the refined state and validation outputs.

## Definition Of Phase 1 Ready-To-Build

Phase 1 is ready for implementation when:

- ticket order is accepted
- preview payload gaps are identified
- any required backend helper is agreed
- teacher-facing wording is approved before coding starts
