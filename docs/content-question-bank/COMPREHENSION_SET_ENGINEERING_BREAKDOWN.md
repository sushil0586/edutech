# Comprehension Set Engineering Breakdown

## Purpose

This document converts the approved comprehension-set plan into implementation-ready engineering work.

It should be used together with:

- [COMPREHENSION_SET_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/COMPREHENSION_SET_IMPLEMENTATION_PLAN.md:1)
- [TEACHER_QUESTION_BANK_FUNCTIONAL_SPEC.md](/Users/ansh/Documents/Eductech/docs/content-question-bank/TEACHER_QUESTION_BANK_FUNCTIONAL_SPEC.md:1)
- [INSTITUTE_ADMIN_EXAM_LIFECYCLE_AND_BUILDER_SPEC.md](/Users/ansh/Documents/Eductech/docs/frontend-mobile/INSTITUTE_ADMIN_EXAM_LIFECYCLE_AND_BUILDER_SPEC.md:1)

## Executive Read

Comprehension support should be built as a grouped-content layer:

- one shared passage
- multiple linked child questions
- each child question still uses an existing `question_type`

The implementation order should minimize risk:

1. data model and backend contract
2. question bank authoring
3. exam builder integration
4. student attempt and review rendering
5. bulk import
6. analytics and reporting

This order keeps scoring and attempt logic stable while progressively exposing the new structure.


## Core Engineering Rule

Do not implement comprehension as a new base `question_type`.

Build it as:

- a new passage/group entity
- optional linkage on `Question`
- grouped retrieval and rendering in builder and attempt surfaces

This preserves:

- option validation
- save-answer behavior
- scoring
- result generation
- most current analytics logic


## Working Vocabulary

Use these terms consistently in code and UI:

- `Passage`
  - the shared stimulus
- `Comprehension Set`
  - the full grouped item from authoring point of view
- `Child Question`
  - one answerable question linked to a passage
- `Standalone Question`
  - a question not linked to any passage


## Recommended Delivery Order

### Phase A

Backend foundation

### Phase B

Question bank authoring and editing

### Phase C

Exam builder integration

### Phase D

Student attempt and review rendering

### Phase E

Bulk upload and validation

### Phase F

Analytics and reporting


## Phase A: Backend Foundation

## Ticket A1: Add Passage Data Model

### Objective

Introduce a first-class passage/group model without disturbing existing questions.

### Backend Scope

Add a new model, recommended as `QuestionPassage`.

Suggested fields:

- `institute`
- `program`
- `subject`
- `topic`
- `created_by_teacher`
- `title`
- `passage_type`
- `content_format`
- `passage_text`
- `instructions`
- `metadata`
- `is_active`
- timestamps

### Acceptance Criteria

- passage can be created without child questions initially
- institute and academic scope validation works
- subject/topic/program linkage is consistent with existing question rules


## Ticket A2: Link Questions To Passage

### Objective

Allow normal questions to belong to a shared passage.

### Backend Scope

Update `Question`:

- `passage = ForeignKey(QuestionPassage, null=True, blank=True, related_name="questions")`
- `passage_question_order = PositiveIntegerField(default=1)`

### Validation Rules

- question subject must match passage subject
- question institute must match passage institute
- question program must match passage program when both exist
- child order should be unique within the passage

### Acceptance Criteria

- existing standalone questions still work unchanged
- child questions can be linked safely to a passage
- ordering is stable and queryable


## Ticket A3: Add Passage Serializer Layer

### Objective

Expose passage and child-question structure cleanly to the frontend.

### Backend Scope

Add serializers for:

- passage list
- passage detail
- child question summary inside passage
- passage attachments if added in this phase

### Payload Design Notes

Frontend needs:

- passage identity
- passage scope
- passage text
- instructions
- child question count
- child question summaries

### Acceptance Criteria

- passage list payload is light enough for question-bank browsing
- detail payload includes child question ordering
- payload is reusable for both teacher and institute routes


## Ticket A4: Add Passage CRUD Endpoints

### Objective

Make passage creation and editing backend-backed before UI work begins.

### Backend Scope

Add scoped endpoints under question-bank.

Suggested routes:

- `GET /api/v1/question-bank/passages/`
- `POST /api/v1/question-bank/passages/`
- `GET /api/v1/question-bank/passages/{id}/`
- `PATCH /api/v1/question-bank/passages/{id}/`
- archive or soft-delete action

### Acceptance Criteria

- teacher and institute scope rules are enforced
- archive is soft-delete aligned with existing question flows
- child question linkage is returned in detail responses


## Ticket A5: Add Passage Tests

### Objective

Protect the new structure early.

### Test Coverage

- create passage
- invalid scope mismatch
- attach child question
- invalid child question scope
- child order uniqueness
- scoped list visibility by role

### Acceptance Criteria

- test suite proves backward compatibility with standalone questions


## Phase B: Question Bank Authoring

## Ticket B1: Add Comprehension Creation Entry Point

### Objective

Give the author an explicit, readable way to start a comprehension set.

### Frontend Scope

Add entry points from:

- `/teacher/question-bank`
- `/institute/question-bank`

Suggested labels:

- `Create Standalone Question`
- `Create Comprehension Set`

### Acceptance Criteria

- author can discover comprehension creation without guessing
- wording is not technical


## Ticket B2: Build Passage Editor Screen

### Objective

Author can create and edit the shared passage comfortably.

### Frontend Scope

New screens:

- `/teacher/question-bank/comprehension/new`
- `/teacher/question-bank/comprehension/[passageId]`
- institute equivalents

### Form Sections

- shared academic scope
- passage title
- passage type
- passage text
- instructions
- optional attachments

### Acceptance Criteria

- author can save passage before adding children
- validation errors are readable
- edit flow feels like first-class content authoring, not a hacked question form


## Ticket B3: Build Child Question Manager

### Objective

Author can manage child questions inside one passage workspace.

### Frontend Scope

Within the passage editor:

- add child question
- edit child question
- reorder child question
- duplicate child question
- archive child question

### Reuse Strategy

Reuse as much of the current question editor behavior as possible for:

- question text
- question type
- options
- explanation
- marks

### Acceptance Criteria

- author can create multiple child questions in one flow
- order is visible and editable
- question-type-specific behavior remains correct


## Ticket B4: Question Bank List Rendering For Comprehension

### Objective

Question bank should display comprehension sets clearly.

### Frontend Scope

Add comprehension set cards or grouped rows showing:

- passage title
- subject
- topic
- child count
- total marks estimate
- last updated

### Filter Updates

Add filters for:

- standalone only
- comprehension only
- passage type

### Acceptance Criteria

- author can distinguish grouped content from standalone questions quickly
- filters remain readable and useful


## Phase C: Exam Builder Integration

## Ticket C1: Builder Inventory Support For Comprehension

### Objective

Comprehension sets must appear in the builder inventory as attachable units.

### Frontend Scope

Update builder question bank pane to show:

- standalone question cards
- comprehension set cards

Comprehension card should preview:

- passage title
- child count
- child question type mix
- total marks

### Acceptance Criteria

- builder can browse and recognize grouped content
- no ambiguity about what gets attached


## Ticket C2: Attach Full Passage Set Into Exam

### Objective

Attaching a comprehension set should link all child questions while preserving shared context.

### Backend Scope

Ensure exam-builder attach flow supports grouped attach semantics.

### Frontend Scope

When attaching a comprehension set:

- all child questions attach in one action
- child order remains stable
- passage metadata is available for preview

### Acceptance Criteria

- one click can attach the full set
- builder does not flatten away the passage context visually


## Ticket C3: Builder Preview For Grouped Questions

### Objective

Builder should show grouped comprehension blocks, not just unrelated flat questions.

### Frontend Scope

Render:

- one passage block
- nested child questions
- total marks per set

### Initial Interaction Rule

Phase 1 builder behavior:

- move whole group as one unit
- preserve child order inside group

Later enhancement:

- edit internal child order from builder

### Acceptance Criteria

- builder layout remains understandable
- passage context is visible in preview and linked-question lists


## Phase D: Student Attempt And Review

## Ticket D1: Attempt Payload Passage Support

### Objective

Student attempt detail must include passage context.

### Backend Scope

Extend exam question and attempt payloads to expose:

- passage id
- passage title
- passage type
- passage text
- passage instructions
- attachments if present
- child order in set

### Acceptance Criteria

- frontend can render a question with full shared context from one payload


## Ticket D2: Student Attempt UI For Comprehension

### Objective

Student sees the passage clearly while answering linked child questions.

### Frontend Scope

Update:

- `/app/attempts/[attemptId]`

Recommended behavior:

- passage panel above current child question
- passage remains visible while moving through child questions
- mobile layout uses collapsible or stacked passage card

### Acceptance Criteria

- student never loses the passage while answering linked questions
- standalone question UX remains unchanged


## Ticket D3: Student Review UI For Comprehension

### Objective

Review mode should preserve the same context after submission.

### Frontend Scope

Update:

- `/app/attempts/[attemptId]/review`

### Acceptance Criteria

- student can review answers with the original passage visible
- explanations still map clearly to child questions


## Ticket D4: End-To-End Attempt Tests

### Objective

Prove comprehension does not break delivery.

### Test Coverage

- start attempt with passage-based questions
- answer child questions
- submit attempt
- review answers
- score and result generation remain correct

### Acceptance Criteria

- no special scoring branch required beyond existing child-question logic


## Phase E: Bulk Upload

## Ticket E1: Extend Import Template

### Objective

Allow comprehension groups in CSV import without breaking standalone import.

### Backend Scope

Add new columns:

- `passage_code`
- `passage_title`
- `passage_type`
- `passage_text`
- `passage_instructions`
- `passage_question_order`

### Rule

- rows with same `passage_code` belong to one group
- rows without `passage_code` remain standalone

### Acceptance Criteria

- template remains understandable for normal users


## Ticket E2: Preview Validation For Grouped Rows

### Objective

Grouped import should fail clearly when passage rows are inconsistent.

### Validation Coverage

- same `passage_code` must keep same title and text
- same `passage_code` must keep same scope
- child order must be unique
- child question rows must remain valid by question type

### Acceptance Criteria

- row-level errors point to the actual grouping issue
- preview remains trustworthy


## Ticket E3: Finalize Grouped Import

### Objective

Create passages and linked questions from validated CSV data.

### Acceptance Criteria

- import creates one passage per `passage_code`
- linked child questions are ordered correctly
- standalone question import remains unaffected


## Phase F: Analytics And Reporting

## Ticket F1: Passage-Level Analytics Aggregation

### Objective

Support reporting at passage-set level, not only child-question level.

### Backend Scope

Add analytics aggregation for:

- average passage accuracy
- wrong count across child questions
- skipped count across child questions
- average time per set

### Acceptance Criteria

- reports can identify weak comprehension sets, not only weak individual questions


## Ticket F2: Student Drill-Down For Passage Sets

### Objective

Allow teacher or institute user to inspect one student’s performance inside one passage set.

### Frontend Scope

Extend results analytics to show:

- selected passage
- all child outcomes
- pacing and skip behavior

### Acceptance Criteria

- teacher can diagnose whether failure came from:
  - passage misunderstanding
  - one trap question
  - pacing
  - uncertainty


## Cross-Phase Dependencies

### Dependency 1

Do not start builder integration before passage CRUD and child-linking contracts are stable.

### Dependency 2

Do not start attempt rendering until the builder and delivery payload shape for passage context is finalized.

### Dependency 3

Do not start grouped import until the canonical data model and validation rules are settled.

### Dependency 4

Analytics should consume the final delivered structure, not a temporary draft structure.


## Suggested Sprint Breakdown

### Sprint 1

- A1
- A2
- A3
- A4
- A5

### Sprint 2

- B1
- B2
- B3
- B4

### Sprint 3

- C1
- C2
- C3

### Sprint 4

- D1
- D2
- D3
- D4

### Sprint 5

- E1
- E2
- E3

### Sprint 6

- F1
- F2


## Risks To Track

## Risk 1: Builder Complexity

If grouped items are flattened too early, comprehension will feel broken even if technically linked.

## Risk 2: Duplicate Reuse Semantics

Need a clear rule for whether child questions may be reused independently.

Recommended initial rule:

- child questions are normal questions in storage
- builder should present them through the comprehension set by default

## Risk 3: Mobile Density

Long passages plus answer UI can create readability issues.

## Risk 4: CSV Authoring Errors

Grouped import adds more ways for spreadsheet content to drift.


## Recommended Delivery Guardrails

- keep standalone flows untouched where possible
- reuse current answer-save and scoring logic
- keep grouped behavior explicit in UI
- avoid inventing a second hidden question system
- prefer one shared passage model across teacher and institute experiences


## Definition Of Done

Comprehension engineering is complete when:

- backend supports first-class passages and linked child questions
- author can create and edit comprehension sets comfortably
- builder can attach and preview sets clearly
- student can answer comprehension sets without losing passage context
- grouped CSV import works safely
- analytics and reporting remain truthful and useful
