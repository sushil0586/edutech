# Comprehension Set Implementation Plan

## Objective

This document defines how comprehension-style questions should be implemented in the current platform.

The goal is to support question patterns like:

- reading comprehension
- passage-based reasoning
- case-study questions
- data-interpretation sets
- source-based grouped questions

without breaking the existing question engine.


## Product Decision

Comprehension should be treated as a **grouped content extension**, not as a brand-new base `question_type`.

That means:

- `mcq_single`, `mcq_multiple`, `true_false`, and `short_answer` remain the answer interaction types
- comprehension becomes a **shared passage + child questions** structure

From the user point of view:

- a teacher creates either a `Standalone Question` or a `Comprehension Set`
- a comprehension set contains:
  - one shared passage
  - optional instructions
  - multiple child questions
- each child question still uses an existing answer type

This keeps the platform simpler and avoids rewriting scoring, answering, and analytics for a fake new question type.


## Why This Model Fits The Current System

The current system already assumes that `question_type` describes how a student answers:

- single choice
- multi-select
- true/false
- short answer

These assumptions exist in:

- question bank models
- question option validation
- attempt save-answer flow
- student attempt rendering
- evaluation services
- analytics grouping

So if we create a new `comprehension` question type directly, we would create confusion:

- does it itself hold an answer?
- does it need options?
- is it scored?
- how does builder attach it?
- how does the student save one answer against multiple sub-questions?

The grouped-content model avoids all of that.


## User-Facing Mental Model

### Teacher / Institute Admin

The author should see two creation paths:

1. `Create Standalone Question`
2. `Create Comprehension Set`

Inside a comprehension set, the workflow should be:

1. add passage title
2. add passage text or media
3. add instructions if needed
4. create child questions below the passage
5. save the full set

### Exam Builder User

The builder user should be able to:

- attach one standalone question
- attach one full comprehension set
- preview child questions nested under the shared passage

### Student

The student should experience:

- passage shown clearly
- multiple linked questions under the same passage
- no confusion about where the shared context starts and ends
- question numbering that still feels natural


## Implementation Scope

This plan covers:

- data model
- API contracts
- question bank authoring
- exam builder
- student attempt flow
- review flow
- bulk upload
- analytics
- rollout phases


## Current Capability Snapshot

The platform already supports:

- question bank CRUD
- options-based questions
- short answer questions
- exam builder linking
- student attempt save-answer
- result generation
- analytics by question and topic

The missing concept is:

- one content block shared by many child questions


## Proposed Data Model

## 1. New Group Model

Recommended name:

- `QuestionPassage`

Alternative naming:

- `ComprehensionSet`
- `QuestionGroup`

Recommended fields:

- `id`
- `institute`
- `program`
- `subject`
- `topic`
- `created_by_teacher`
- `title`
- `passage_type`
  - comprehension
  - case_study
  - data_interpretation
  - source_analysis
  - custom
- `content_format`
- `passage_text`
- `instructions`
- `metadata`
- `is_active`
- timestamps

Optional:

- `difficulty_level`
- `default_child_marks`
- `tagging fields`


## 2. Link Child Questions To Passage

Recommended additions to `Question`:

- `passage = ForeignKey(QuestionPassage, null=True, blank=True)`
- `passage_question_order = PositiveIntegerField(default=1)`

Rules:

- question remains independently typed
- question can exist without passage
- passage child questions must stay in the same academic scope


## 3. Passage Attachments

If comprehension passages may include images, charts, or PDFs, add:

- `QuestionPassageAttachment`

Fields:

- `passage`
- `file`
- `attachment_type`
- `title`
- `display_order`
- `alt_text`
- `is_inline`

This mirrors the current question attachment pattern and keeps media support consistent.


## Data Integrity Rules

Passage rules:

- passage subject must match child question subject
- passage institute must match child question institute
- if passage program exists, it must match child question program
- if passage topic exists, child question topic must belong to same subject

Child question rules:

- child questions still validate using existing option rules
- comprehension does not change correctness evaluation logic

Deletion rules:

- archiving a passage should archive passage visibility, not hard-delete children
- child questions should not become orphaned invisibly


## Backend API Plan

## 1. Question Passage CRUD

Add new endpoints for:

- list passages
- create passage
- retrieve passage
- update passage
- archive passage

Suggested scope:

- question-bank scoped, like normal questions

Examples:

- `/api/v1/question-bank/passages/`
- `/api/v1/question-bank/passages/{id}/`


## 2. Passage Child Question Management

Options:

- manage children through existing question endpoints with `passage` field
- or provide nested endpoints for convenience

Recommended approach:

- keep child question create/update in the current `Question` flow
- allow passing `passage` id

This reduces duplication.


## 3. Builder Retrieval

Builder needs grouped payloads.

Recommended exam-builder read payload should support:

- standalone question
- grouped passage with child questions

For each linked child question, return:

- passage metadata
- child order
- child question data


## 4. Student Attempt Delivery

Attempt detail payload should include:

- passage id
- passage title
- passage type
- passage text
- passage instructions
- passage attachments
- child question order inside passage

This is required for correct student rendering.


## 5. Review Payload

Attempt review page should also include passage data so students can see:

- the shared passage
- the question they answered
- the explanation in context


## Question Bank UX Plan

## 1. Question Bank List

Question bank should support two row types:

- standalone question
- comprehension set

Comprehension set card should show:

- title
- subject
- topic
- passage type
- child question count
- total estimated marks
- last updated

Quick actions:

- open set
- duplicate set
- archive set


## 2. Create Comprehension Set

New route suggestion:

- `/teacher/question-bank/comprehension/new`
- `/institute/question-bank/comprehension/new`

Suggested form sections:

### A. Shared Passage

- title
- passage type
- subject
- topic
- passage text
- instructions
- attachments

### B. Child Questions

For each child:

- question text
- question type
- options if needed
- explanation
- marks
- negative marks
- order

### C. Save Behavior

Save should:

- create passage
- create linked child questions
- preserve order


## 3. Edit Comprehension Set

Suggested route:

- `/teacher/question-bank/comprehension/[passageId]`
- `/institute/question-bank/comprehension/[passageId]`

Allowed actions:

- edit passage text
- add/remove attachments
- create child question
- update child question
- reorder child question
- duplicate child question
- archive child question


## Exam Builder Plan

## 1. Builder Library View

Builder question inventory should support filtering by:

- standalone
- comprehension set
- question type
- subject
- topic

Comprehension card should preview:

- passage title
- child count
- question type mix
- marks total


## 2. Builder Attach Flow

When user attaches a comprehension set:

- all child questions are attached
- passage context is preserved
- child order is preserved

Recommended builder display:

- one collapsible passage block
- nested linked child questions


## 3. Builder Ordering Rules

Need to support:

- movement of whole passage block
- optional reordering of child questions inside the block

Recommended initial scope:

- move whole group as one unit
- preserve child order inside group

Later enhancement:

- allow internal child reordering


## Student Attempt Experience

## 1. Rendering

Student attempt screen should show:

- passage panel
- current child question below it
- clear context that this question belongs to the same passage set

Recommended UI:

- sticky passage card on larger screens
- collapsible passage panel on mobile
- label like:
  - `Passage 1`
  - `Question 2 of 5 in this passage`


## 2. Navigation

When student moves among child questions in the same passage:

- passage stays visible
- question changes normally

No new save-answer logic is required if child questions remain standard question types.


## 3. Timing And Review

Keep existing timing behavior.

Optional later improvement:

- per-passage dwell-time analytics


## Evaluation And Results

No separate comprehension scoring engine is needed.

Each child question should:

- save answer normally
- evaluate normally
- contribute marks normally

Passage itself is not scored directly.


## Bulk Upload Plan

The current import is flat.

To support comprehension, extend the template with group columns.

Recommended new columns:

- `passage_code`
- `passage_title`
- `passage_type`
- `passage_text`
- `passage_instructions`
- `passage_attachment_url` optional later
- `passage_question_order`

Behavior:

- rows with same `passage_code` belong to one comprehension set
- each row is one child question
- rows without `passage_code` remain standalone questions

Validation rules:

- same `passage_code` must keep same academic scope
- same `passage_code` must keep same passage text and title
- child orders must be unique inside one passage


## Analytics Plan

Add passage-aware analytics later in two layers.

## 1. Passage-Level Analytics

Show:

- average accuracy per passage
- highest-wrong child inside passage
- skip rate across the set
- average time across the set

## 2. Student Drill-Down

For one student:

- show passage
- show each child question outcome
- identify whether weakness is:
  - passage understanding
  - one distractor trap
  - pacing
  - review uncertainty


## Search And Filtering

Question bank filters should support:

- standalone vs comprehension
- passage type
- child question type
- subject
- topic

Builder filters should support:

- grouped sets only
- standalone only
- mixed


## Migration And Backward Compatibility

This plan is backward compatible if:

- existing questions remain unchanged
- new fields are nullable
- old routes keep working

No current exam should break if it contains only standalone questions.


## Suggested Rollout Phases

## Phase 1: Data Foundation

- add `QuestionPassage` model
- add `passage` link on `Question`
- add serializers and scoped CRUD APIs
- add tests for data integrity

## Phase 2: Question Bank Authoring

- create comprehension set create/edit screens
- support child question management
- support passage attachments

## Phase 3: Exam Builder

- list comprehension sets in builder inventory
- attach full set into exam
- render grouped preview in builder

## Phase 4: Student Attempt And Review

- show passage in attempt page
- show passage in review page
- verify navigation and submission flow

## Phase 5: Bulk Upload

- extend CSV template
- add preview validation for grouped rows
- finalize grouped import

## Phase 6: Analytics

- passage-level performance
- student passage drill-down
- hard-passage and high-skip reporting


## Testing Plan

Must test:

- create comprehension set
- edit passage text
- add and reorder child questions
- attach set into exam
- student sees shared passage
- student answers child questions correctly
- results calculate correctly
- bulk import with grouped rows
- analytics remain truthful


## Risks

### 1. Builder Complexity

If builder treats every child question as a flat question without passage context, comprehension will feel broken.

### 2. CSV Import Complexity

Grouped imports are more error-prone than standalone rows.

### 3. Student UI Density

Long passages plus options can create mobile readability issues.

### 4. Reuse Semantics

Need clear rules for whether child questions can also be reused standalone outside the passage.

Recommended initial rule:

- child questions remain normal questions
- if linked to a passage, builder should prefer using them through the passage card


## Recommendation

Proceed with comprehension as:

- a new grouped content layer
- not a replacement for existing question types
- not a new scoring type

This is the cleanest fit for the current architecture and the best mental model for teachers, institute admins, and students.


## Definition Of Done

Comprehension support is complete when:

- author can create a passage and linked child questions
- builder can attach and preview the set clearly
- student can answer the set with passage context visible
- results and analytics stay accurate
- bulk upload supports grouped rows safely
