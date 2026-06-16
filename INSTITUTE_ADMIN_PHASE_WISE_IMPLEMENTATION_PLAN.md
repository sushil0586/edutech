# Institute Admin Phase-Wise Implementation Plan

## Objective

Complete the institute admin section in a structured order without breaking the shared UI system or duplicating teacher workflows unnecessarily.

## Phase I. Documentation And Architecture Lock

### Deliverables

- `NEXORA_INSTITUTE_ADMIN_MODULE_SOURCE_OF_TRUTH.md`
- `NEXORA_INSTITUTE_ADMIN_FRONTEND_FOUNDATION.md`
- `INSTITUTE_ADMIN_FUNCTIONAL_SPEC.md`
- this implementation plan

### Outcome

- scope is frozen before implementation
- reuse rules are clear
- route map is clear

## Phase II. Shared Shell And Route Foundation

### Goal

Upgrade institute workspace foundation so it matches student and teacher visually and structurally.

### Deliverables

- modernize institute dashboard layout to match premium student/teacher style
- expand institute sidebar route map
- align headers, hero cards, summary grids, and action lanes

### Result

- institute section becomes visually part of the same product family

## Phase III. Existing Institute Route Cleanup

### Goal

Finish and polish already-existing institute pages before new workspaces are added.

### Deliverables

- dashboard cleanup
- people page polish
- academic setup polish
- settings page conversion from placeholder to real policy screen

### Result

- current institute routes become implementation-grade, not starter shells

## Phase IV. Shared Question Bank For Institute Admin

### Goal

Give institute admins full question-bank capability.

### Deliverables

- `/institute/question-bank`
- `/institute/question-bank/new`
- `/institute/question-bank/[questionId]`
- `/institute/question-bank/import`

### Rule

- reuse teacher question-bank behavior where possible
- keep institute framing and institute summary context

## Phase V. Shared Exam Workspace For Institute Admin

### Goal

Give institute admins full exam-authoring and exam-management capability.

### Deliverables

- `/institute/exams`
- `/institute/exams/new`
- `/institute/exams/[examId]`
- `/institute/exams/[examId]/builder`

### Required capabilities

- create exam
- add and link questions
- assign students
- manage access key
- manage student access policy

## Phase VI. Institute Result Operations

### Goal

Give institute admins institute-wide result readiness and publication visibility.

### Deliverables

- `/institute/results`
- institute-scoped result summary
- publication readiness workflow
- drilldown into exam-level state

## Phase VII. Institute Oversight Layer

### Goal

Add the broader institute control layer beyond teacher-like workflows.

### Deliverables

- teacher assignment health
- institute readiness dashboard blocks
- reports route planning
- economy visibility route planning

## Phase VIII. QA And UAT

### Goal

Validate institute-admin workflows end to end.

### Minimum scenarios

- create student and teacher
- import roster
- update academic setup
- create question
- create exam
- attach questions
- assign audience
- set access policy
- review results readiness

## Priority Order

Implementation should follow this sequence:

1. shell and current route polish
2. question bank
3. exams and builder
4. results
5. institute-specific oversight additions

## Important Reuse Rule

If a teacher workflow already exists and is institute-safe:

- reuse it
- adapt framing
- do not rebuild from scratch

## Important UI Rule

Institute implementation must stay on the same global CSS and visual system used by student and teacher.
