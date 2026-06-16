# Teacher Exam Lifecycle And Builder Spec

## Objective

This document defines how a teacher creates, configures, structures, assigns, and manages an exam.

This is the largest teacher workflow.

Focused Phase 1 ease planning for the advanced builder lives in:

- [ADVANCED_EXAM_BUILDER_PHASE_1_EASE_PLAN.md](/Users/ansh/Documents/Eductech/ADVANCED_EXAM_BUILDER_PHASE_1_EASE_PLAN.md:1)

## Route Scope

Primary routes:

- `/teacher/exams`
- `/teacher/exams/new`
- `/teacher/exams/[examId]`
- `/teacher/exams/[examId]/builder`

## Functional Breakdown

### 1. Exam List

Route:

- `/teacher/exams`

Purpose:

- show all teacher-scoped exams
- provide fast entry into setup, linking, and detail

Each exam card should show:

- title
- code
- subject
- status
- duration
- question count
- assigned student count
- total marks
- start time if available
- brief description or instructions fallback

Actions:

- Create Exam
- Link Questions
- Setup
- Open Exam

### 2. Create Exam

Route:

- `/teacher/exams/new`

Purpose:

- create the initial exam shell from real academic scope data

Required data sources:

- academic years
- programs
- cohorts
- subjects

Teacher must be able to configure:

- academic scope
- title
- code
- description
- exam type
- delivery mode
- duration
- total marks
- passing marks
- start and end time
- instructions
- late submit behavior
- randomization behavior
- result visibility behavior
- review behavior
- attempt policy
- timer mode
- navigation mode
- security mode

Success behavior:

- create exam
- redirect to builder
- show success message

Failure behavior:

- redirect back to create page
- show clear error banner

### 3. Exam Detail

Route:

- `/teacher/exams/[examId]`

Purpose:

- operational delivery view for one exam

This page is not the deep authoring workspace.

It is the lifecycle control surface.

Must show:

- status
- exam code
- subject
- active question count
- section count
- assigned students count
- assignment mode
- access key and whether enabled
- schedule
- result policy
- navigation policy
- passing marks
- section summaries
- assigned students
- publish and lifecycle history

Primary actions:

- Open Builder
- Link Questions
- Refresh Status
- Sync Marks
- Toggle Access Key
- Regenerate Access Key

Conditional lifecycle actions:

- Publish Exam when status is draft
- Mark Live when status is scheduled
- Cancel when status is scheduled
- Mark Completed when status is live

These actions must depend on backend state, not frontend guesses.

### 4. Lifecycle Rules

The frontend must treat lifecycle as backend-owned.

Supported actions currently visible:

- publish
- refresh-status
- mark-live
- mark-completed
- cancel
- sync-marks
- regenerate-access-key
- toggle-access-key

Teacher UI rule:

- only show or emphasize actions that make sense in the current state

### 5. Exam Builder

Route:

- `/teacher/exams/[examId]/builder`

Purpose:

- unified authoring workflow

The builder currently contains these major tabs:

- Sections
- Linked Questions
- Student Assignment
- Question Bank

It also contains exam-settings editing above those workspaces.

## Builder Area Details

### A. Scope And Identity

Teacher can update:

- academic year
- program
- cohort
- subject
- title
- code
- description

Rules:

- values must remain scoped to teacher institute visibility
- program and cohort changes must not rely on hardcoded dropdown values

### B. Schedule And Delivery

Teacher can update:

- duration
- total marks
- passing marks
- start time
- end time
- delivery mode
- exam type

### C. Runtime Rules

Teacher can update:

- timer mode
- navigation mode
- attempt policy
- result publish mode
- review mode
- security mode
- allow resume
- section switching
- return to previous section

### D. Learner Experience Rules

Teacher can update:

- instructions
- show result immediately
- allow review after submit
- result publish timing
- review availability range

### E. Sections Workspace

Teacher can:

- view active sections
- add section
- remove section

Section create fields:

- name
- order
- total questions
- duration
- description
- instructions
- timer enabled
- allow skip section
- lock after submit

### F. Linked Questions Workspace

Teacher can:

- view active linked questions
- attach a single question
- bulk attach multiple questions
- remove a linked question

Link fields:

- question
- section
- order
- marks override
- negative marks override
- mandatory flag

Special current behavior to preserve:

- if an exam-question pair already exists but is soft-deleted or inactive, the workflow should reactivate and update the existing link instead of failing permanently

### G. Rapid Attach

Rapid attach is a power-user workflow.

It should support:

- multiple question selection
- default section choice
- base order
- topic grouping
- faster bulk mapping into the exam

### H. Assignment Workspace

Teacher can:

- switch assignment mode
- select student list
- save assignment

Assignment mode currently supports backend-driven targeting rather than static frontend logic.

### I. Accommodation Support

Inside the assignment area, teacher can configure student-specific support values.

Current supported fields:

- extra time minutes
- extra time percentage
- additional violation allowance
- simplified warning copy
- alternative instructions
- support notes

Important behavior:

- support values should be stored on student accommodation profile
- new attempts snapshot these values when the learner starts the exam

### J. Question Bank Window

Builder also shows a scoped question bank slice for quick attach.

Behavior:

- show a subset of available questions
- indicate whether already linked
- allow quick add when not linked

## Empty-State Rules

### No Sections

Teacher should be guided to create structure first.

### No Linked Questions

Teacher should be strongly guided to attach questions before publishing.

### No Students In Scope

Teacher should see that current academic scope returned no learners.

## Definition Of Done

This area is complete when:

- teacher can create an exam shell
- teacher can edit settings without confusion
- teacher can add sections
- teacher can link questions reliably
- teacher can assign students reliably
- teacher can configure accommodation support
- lifecycle actions remain truthful to backend state
