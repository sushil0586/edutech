# Institute Admin Exam Lifecycle And Builder Spec

## Objective

This document defines how an institute admin creates, configures, structures, assigns, and manages an exam.

The institute exam flow should reuse the same backend-backed mechanics as the teacher exam flow wherever possible.

## Route Scope

Primary routes:

- `/institute/exams`
- `/institute/exams/new`
- `/institute/exams/[examId]`
- `/institute/exams/[examId]/builder`

## Functional Breakdown

### 1. Exam List

Route:

- `/institute/exams`

Purpose:

- show all institute-scoped exams visible to the institute admin
- provide fast entry into setup, linking, lifecycle control, and exam detail

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

Institute framing:

- emphasize institutional ownership, readiness, and shared reuse
- avoid wording that implies only one teacher owns the workflow

### 2. Create Exam

Route:

- `/institute/exams/new`

Purpose:

- create the initial exam shell from real institute academic scope data

Required data sources:

- academic years
- programs
- cohorts
- subjects

Institute admin must be able to configure:

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
- star access policy
- entitlement access policy

Success behavior:

- create exam
- redirect to builder
- show success message

Failure behavior:

- redirect back to create page
- show clear error banner

### 3. Exam Detail

Route:

- `/institute/exams/[examId]`

Purpose:

- operational delivery view for one institute-scoped exam

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
- exam access policy based on stars and entitlements

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

Institute UI rule:

- only show or emphasize actions that make sense in the current state
- keep the lifecycle model aligned with teacher behavior

### 5. Exam Builder

Route:

- `/institute/exams/[examId]/builder`

Purpose:

- unified authoring workflow for institute-owned exam setup

The builder should contain these major tabs:

- Sections
- Linked Questions
- Student Assignment
- Question Bank

It should also contain exam-settings editing above those workspaces.

## Builder Area Details

### A. Scope And Identity

Institute admin can update:

- academic year
- program
- cohort
- subject
- title
- code
- description

Rules:

- values must remain within institute scope
- program and cohort changes must not rely on hardcoded dropdown values

### B. Schedule And Delivery

Institute admin can update:

- duration
- total marks
- passing marks
- start time
- end time
- delivery mode
- exam type

### C. Runtime Rules

Institute admin can update:

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

Institute admin can update:

- instructions
- show result immediately
- allow review after submit
- result publish timing
- review availability range

### E. Sections Workspace

Institute admin can:

- view active sections
- add section
- remove section

### F. Linked Questions Workspace

Institute admin can:

- link individual questions
- bulk attach questions
- edit marks and order
- remove linked questions
- reuse question-bank inventory without duplicating data

### G. Student Assignment Workspace

Institute admin can:

- assign by scope
- assign selected students
- review assigned students
- adjust assignment state before publication

### H. Question Bank Side Workspace

Institute admin can:

- inspect question inventory relevant to the current exam scope
- jump from exam authoring into reusable question selection logic

## Economy And Access Rules

Every premium or restricted exam must support:

- open access
- explicitly free access
- stars-only access
- entitlement-only access
- stars-or-entitlement access

The exam layer must not hardcode any star amount or entitlement decision.

The access policy is configuration data attached to the exam.

## Reuse Rule

If the teacher exam workflow already solves the same problem safely:

- reuse its components
- reuse its backend APIs
- adapt wording and routing
- do not fork behavior unnecessarily

## UI Rule

The institute exam module must stay on the same global visual system used by student, teacher, and institute pages.
