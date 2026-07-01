# Teacher Question Bank Functional Spec

## Objective

The teacher question bank is the reusable content system behind exam creation.

It must support:

- creation
- editing
- tagging
- filtering
- import
- reuse inside exams

## Route Scope

- `/teacher/question-bank`
- `/teacher/question-bank/new`
- `/teacher/question-bank/[questionId]`
- `/teacher/question-bank/import`

## 1. Question Bank List

Route:

- `/teacher/question-bank`

Purpose:

- browse and curate teacher-scoped questions

Current capabilities already visible:

- search
- filter by program
- filter by subject
- filter by topic
- filter by tag
- filter by question type
- filter by difficulty
- ordering
- missing explanation filter
- bulk actions

Summary cards should show:

- total filtered questions
- verified or published count
- missing explanation count
- academic scope count

## 2. Bulk Actions

Current workflow supports grouped operations on selected questions.

Documented actions should include:

- difficulty change
- topic change
- attach tag
- remove tag
- any other backend-supported bulk action returned by implementation

Bulk-action rules:

- no action without selected questions
- tag-based actions must validate tag choice
- success messaging should reflect completed action
- failure messaging should preserve teacher trust

## 3. Question Create

Route:

- `/teacher/question-bank/new`

Teacher can create a question with:

- academic context
- question text
- question type
- difficulty
- explanation
- options and answer structure
- default marks
- tags later or during editing

Also supports:

- duplicate existing question into a new draft

Create success:

- redirect to question detail

## 4. Question Detail And Update

Route:

- `/teacher/question-bank/[questionId]`

Purpose:

- edit one question in depth

Teacher can:

- update core fields
- add tags
- remove tags
- upload attachments
- remove attachments

Attachment preview should support:

- image
- diagram
- pdf
- audio
- generic file fallback

## 5. Question Attachments

Each attachment should carry:

- file
- type
- title
- alt text
- display order
- inline flag

Teacher rules:

- attachment add and remove must be explicit
- attachment preview should help trust the saved asset

## 6. Tags

Question tags are reusable metadata.

Teacher can:

- attach tag
- remove tag

Bulk tag operations must avoid duplicate mapping issues.

## 7. Question Import

Route:

- `/teacher/question-bank/import`

Import workflow should be preview-first.

Phases:

1. teacher downloads or reviews template
2. teacher uploads CSV
3. backend preview validates records
4. teacher finalizes import

Rules:

- no blind import without validation
- row-level errors should be clear
- import should preserve teacher confidence

## 8. Reuse Into Exam Builder

Question bank is not isolated.

It must connect cleanly into:

- exam builder attach flow
- rapid attach flow
- quick-add from scoped bank window

## 9. Empty And Error States

Valid states:

- no questions yet
- no questions in current filters
- question detail unavailable
- import template unavailable
- academic lookup failure

Each state should explain whether the issue is:

- no data
- filter mismatch
- backend load failure

## Definition Of Done

Question bank is complete when:

- teacher can create and edit questions comfortably
- filters and bulk actions behave predictably
- tags and attachments work reliably
- CSV import is preview-first and trustworthy
- reuse into builder is fast and consistent
