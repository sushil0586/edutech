# Nexora Teacher Module Source Of Truth

## Purpose

This file becomes the main teacher-module implementation guide.

It should be used together with:

- `NEXORA_FINAL_IMPLEMENTATION_SOURCE_OF_TRUTH.md`
- `NEXORA_TEACHER_FRONTEND_FOUNDATION.md`
- `TEACHER_DASHBOARD_FUNCTIONAL_SPEC.md`
- `TEACHER_EXAM_LIFECYCLE_AND_BUILDER_SPEC.md`
- `TEACHER_QUESTION_BANK_FUNCTIONAL_SPEC.md`
- `TEACHER_RESULTS_AND_LIVE_MONITORING_SPEC.md`
- `TEACHER_MODULE_QA_CHECKLIST.md`

When older teacher notes conflict with this file, this file should win.

## Current Teacher Reality

The current teacher workspace in `edutech_web` already has real working surfaces for:

- teacher dashboard
- exam list
- exam detail
- exam builder
- question bank list
- question create and update
- question import
- teacher results workspace
- live monitoring and attempt intervention actions

The current module is not a blank slate.

It is already functional, but it still needs:

- one final documented behavior model
- stronger workflow consistency
- shared UI cleanup so it matches the student workspace more closely
- disciplined end-to-end implementation and QA

## Product Role Of Teacher

Teacher is not the public-facing commercial role.

Teacher is the content-authoring, delivery, monitoring, and performance-analysis role that supports the student product.

Teacher responsibilities in Nexora are:

- create and configure exams
- structure sections
- attach and manage questions
- assign exams to students
- configure learner support where allowed
- monitor live exam activity
- generate, rank, and publish results
- inspect performance signals for remediation

## Core Teacher Principles

### 1. Same Design System As Student

Teacher, parent, institute, and admin should use the same global visual system as the student workspace.

That means:

- same color direction
- same background language
- same card system
- same shell behavior
- same spacing rhythm
- same status-pill language
- same topbar and sidebar architecture

Only the content and role-specific actions should change.

### 2. No Fake Teacher States

Teacher screens must not pretend:

- an exam is publishable when backend rules do not allow it
- results exist when summaries are not generated
- assignment is saved when backend assignment did not persist
- linked questions are active when they are soft-deleted
- monitoring is live when the monitor endpoint is unavailable

### 3. Builder Over Fragmentation

Teacher authoring should feel like one guided workflow, not disconnected tools.

The system may still use multiple backend endpoints, but the teacher experience should feel unified.

### 4. Backend Is The Source Of Operational Truth

Teacher UI must derive behavior from:

- teacher-scoped backend APIs
- exam lifecycle state
- active linked records only
- live assignment data
- generated result summaries and monitor feeds

## Final Teacher Functional Areas

The teacher module is divided into these implementation areas:

1. teacher shell and shared UI behavior
2. teacher dashboard
3. exam management
4. exam builder
5. student assignment and accommodation support
6. question bank
7. question import
8. results and leaderboard
9. live monitoring and intervention
10. teacher QA and release criteria

## Existing Frontend Routes

Current teacher routes already present in `edutech_web`:

- `/teacher/dashboard`
- `/teacher/exams`
- `/teacher/exams/new`
- `/teacher/exams/[examId]`
- `/teacher/exams/[examId]/builder`
- `/teacher/question-bank`
- `/teacher/question-bank/new`
- `/teacher/question-bank/import`
- `/teacher/question-bank/[questionId]`
- `/teacher/results`

## Existing Shared Teacher Shell

Current teacher shell already reuses the shared workspace structure:

- `TeacherSidebar`
- `WorkspaceTopbar`
- shared page headers
- shared status pills
- shared cards and empty states

This is the correct direction and should be kept.

## Teacher Backend Surface Already In Use

The current teacher web module already depends on these major backend areas:

- teacher exam listing and teacher insight summary
- exam detail and exam lifecycle actions
- question bank CRUD and bulk actions
- academic lookup data
- student lookup and assignment endpoints
- result generation and rank calculation
- result publication
- live monitoring
- attempt intervention notes

## Required Documentation Set

The implementation team should follow these files by responsibility:

- `NEXORA_TEACHER_FRONTEND_FOUNDATION.md`
  - global teacher UI rules
  - shell rules
  - component behavior
- `TEACHER_DASHBOARD_FUNCTIONAL_SPEC.md`
  - teacher overview logic
  - KPI behavior
  - intervention entry points
- `TEACHER_EXAM_LIFECYCLE_AND_BUILDER_SPEC.md`
  - exam creation
  - lifecycle transitions
  - section setup
  - linked-question behavior
  - assignment and support behavior
- `ADVANCED_EXAM_BUILDER_EASE_ROADMAP.md`
  - all future builder-ease phases
  - long-term teacher-experience direction
- `ADVANCED_EXAM_BUILDER_PHASE_1_EASE_PLAN.md`
  - teacher-first ease improvements for the advanced builder
  - preview, checklist, feasibility, and summary behavior
- `ADVANCED_EXAM_BUILDER_PHASE_1_IMPLEMENTATION_TICKETS.md`
  - build order and ticketized implementation breakdown for Phase 1
- `TEACHER_SCOPE_MODEL_BACKLOG.md`
  - future backlog item for institute-scoped vs independent teacher support
- `TEACHER_QUESTION_BANK_FUNCTIONAL_SPEC.md`
  - question CRUD
  - filters
  - tags
  - import
  - duplication
  - attachments
- `TEACHER_RESULTS_AND_LIVE_MONITORING_SPEC.md`
  - result generation
  - rank calculation
  - publishing
  - leaderboard
  - analysis
  - live attempt monitoring
- `TEACHER_MODULE_QA_CHECKLIST.md`
  - route-by-route QA
  - lifecycle validation
  - final sign-off checklist

## Teacher Completion Sequence

The order for implementation after student completion should be:

1. freeze teacher functional documentation
2. align teacher shell with the student design system exactly
3. tighten teacher dashboard and exam-management states
4. finalize builder workflow behavior
5. finalize question bank and import behavior
6. finalize results and monitoring behavior
7. run teacher QA
8. lock teacher module before parent/institute polish

## Definition Of Done

Teacher section can be called complete when:

- every teacher workflow is documented
- every teacher screen follows the same shared UI system as student
- every lifecycle state is visible and understandable
- no teacher action relies on hardcoded assumptions
- teacher routes pass end-to-end QA
- teacher can move from authoring to delivery to results without workflow confusion
