# NEXORA Student Exam Source + Subject Phase Wise Implementation Plan

## Purpose

This document defines the phased implementation plan for student exam visibility based on:

- source
- subject

This plan reflects the agreed production rule:

- exam distinction for students should be `source + subject`
- `creator` is not the same as `source`
- a platform teacher can create a platform exam
- an institute teacher can create an institute exam
- a teacher exam should appear as teacher-scoped only when it is intentionally published as teacher-owned visibility

## Final Product Goal

When a student logs in, the exams experience should support:

- one merged exam list by default
- top filter by `Source`
- top filter by `Subject`
- optional teacher filter only when source is `Teacher`
- analytics split by source and subject

The student should clearly understand:

- who provided this exam
- which subject this exam belongs to

## Final Student-Facing Dimensions

### Source

- Platform
- Institute
- Teacher

### Subject

- Math
- Science
- English
- SST
- Computer
- Other configured subjects

## Final Backend Rule

The exam response shown to students must be driven by:

- exam source
- subject
- assignment eligibility
- economy access
- timing and status

The source must be based on publishing scope, not on creator role.

## Current State Summary

Current implementation already supports:

- institute/program/cohort exam scoping
- selected student assignments
- student exam listing
- exam availability states
- economy lock and unlock logic
- subject-based filtering in student areas

Current implementation does not yet support:

- explicit `platform / institute / teacher` source distinction in student exam APIs
- teacher-specific exam source filtering in student UI
- source-aware analytics
- separate source metadata in student-facing exam cards

## Implementation Principles

- no frontend hardcoding of source labels beyond stable enum rendering
- source must come from backend
- subject must come from backend subject relation
- student list should be merged by default
- filters should narrow backend-driven data, not invent categories on frontend
- analytics must align with the same source and subject logic used in exam visibility

---

## Phase 1: Source Model Foundation

### Status

- Completed

### Goal

Introduce a clean source model in the backend without breaking current exam creation or student listing.

### Scope

- backend models
- serializers
- internal services
- no student UI change yet

### Changes

#### 1. Add source fields to exam model

Add fields such as:

- `source_type`
  - `platform`
  - `institute`
  - `teacher`
- `source_teacher`
  - nullable
- `source_institute`
  - nullable if platform logic is global
- optional metadata:
  - `source_label`
  - `source_notes`

### Rule

- if exam is published as platform content, `source_type = platform`
- if exam is published as institute content, `source_type = institute`
- if exam is published as teacher-directed content, `source_type = teacher`

### Important Clarification

- `created_by` can be platform teacher, institute teacher, admin, or other role
- `source_type` is independent from `created_by`

#### 2. Add validation rules

Examples:

- `platform` source should not require `source_teacher`
- `teacher` source should require `source_teacher`
- `institute` source should belong to the same institute as the exam

#### 3. Seed source choices

If option catalogs are used for reporting or admin display, seed source choices:

- Platform
- Institute
- Teacher

### Output of Phase 1

- exam records can store source correctly
- source is normalized and future-safe
- no visible behavior change yet for student screens

### Acceptance Criteria

- exam can be created with valid source
- validation prevents invalid source combinations
- existing exam flows continue working

---

## Phase 2: Assignment Resolution by Source

### Status

- Completed

### Goal

Make student exam visibility understand source in addition to existing assignment logic.

### Scope

- backend visibility services
- student exam availability resolution
- no analytics UI yet

### Changes

#### 1. Expand assignment interpretation

Current practical visibility should evolve into:

- platform default
- institute default
- teacher scope
- teacher selected students
- student direct assignment

This does not require exposing all internal categories to student UI.

Student UI still only sees:

- Platform
- Institute
- Teacher

#### 2. Resolve teacher-linked visibility

Teacher-scoped exam visibility should come from:

- direct selected-student assignment
- matching academic scope through teacher assignments
- optional future link model if needed later

#### 3. Update student exam visibility service

Student exam visibility should:

- start from institute-safe scope
- evaluate assignment eligibility
- classify each visible exam by source

#### 4. Add source metadata to student exam API response

Add fields like:

- `source_type`
- `source_label`
- `teacher_id`
- `teacher_name`
- `visibility_reason`

### Output of Phase 2

- every student-visible exam carries clear source metadata
- backend knows whether an exam is platform, institute, or teacher visible

### Acceptance Criteria

- student exam API returns source fields
- teacher source records include teacher information
- platform and institute source records do not incorrectly appear as teacher

### Phase 2 Execution Checklist

- Add student exam API query support for source filtering
- Accept `source=all|platform|institute|teacher`
- Accept optional `teacher=<teacher_id>` only when source is teacher
- Keep merged response as default when source is not supplied
- Filter only after current assignment eligibility is resolved
- Keep source ownership backend-driven and never infer it from creator role on frontend
- Return teacher source metadata from backend only
- Add focused backend tests for platform, institute, and teacher filtered views

---

## Phase 3: Student Exams Page Filter UX

### Status

- In progress

### Goal

Expose source + subject filtering in the student exams page.

### Scope

- student exams page
- student dashboard exam widgets if needed
- API query support

### Changes

#### 1. Add top bar source filter

Options:

- All
- Platform
- Institute
- Teacher

#### 2. Keep top bar subject filter

Options:

- All Subjects
- subject list from backend

#### 3. Add conditional teacher filter

Only when `Source = Teacher`

Options:

- All teachers
- teacher names returned by backend

#### 4. Add source badges on exam cards

Examples:

- `Platform · Math`
- `Institute · Science`
- `Teacher · Rahul Sharma · English`

#### 5. API filtering support

Add query params like:

- `source=all`
- `source=platform`
- `source=institute`
- `source=teacher`
- `teacher=<id>`
- `subject_id=<id>` or existing subject context equivalent

### Output of Phase 3

- student can browse exams by source and subject
- source filter becomes understandable and production-ready

### Acceptance Criteria

- default view shows merged exam list
- source filter works correctly
- subject filter works correctly
- teacher filter appears only for teacher source

### Phase 3 Execution Checklist

- Extend student exam frontend type to include source metadata
- Extend student exam API helper to pass `source` and `teacher`
- Load merged exam list for teacher option discovery
- Render a top filter row as `Source + Subject + Teacher`
- Keep teacher filter hidden unless source is `Teacher`
- Keep subject-context behavior intact during this phase
- Show source badge on featured exam and list cards
- Keep stars, review state, security state, and next-step actions unchanged

---

## Phase 4: Student Dashboard and Related Student Surfaces

### Status

- In progress

### Goal

Make source + subject visible beyond the exams page.

### Scope

- dashboard
- practice recommendations
- results follow-up cards
- weak areas linked practice cards

### Changes

#### 1. Dashboard cards

Recommended exam cards should show:

- source
- subject

#### 2. Practice and recommendation cards

Practice follow-up should preserve:

- source
- subject

#### 3. Results and attempts follow-up

When suggesting next action, keep source context visible.

Examples:

- `Platform follow-up test`
- `Teacher practice set`
- `Institute mock revision`

### Output of Phase 4

- student sees a consistent source + subject story across the product

### Acceptance Criteria

- dashboard and related student cards use the same source metadata as exams page
- no fake local labels are invented on frontend

---

## Phase 5: Source-Aware Analytics

### Status

- Pending

### Goal

Align analytics with the same source + subject distinction used in exam visibility.

### Scope

- backend summary APIs
- student analytics page
- optional result breakdown widgets

### Changes

#### 1. Analytics grouping dimensions

Support:

- overall
- by source
- by subject
- by source + subject

#### 2. New source-aware metrics

Examples:

- platform exam attempts
- institute exam attempts
- teacher exam attempts
- source-wise average score
- source-wise completion rate
- source-wise weak subjects

#### 3. Teacher sub-analytics

When source is teacher:

- teacher-wise attempt counts
- teacher-wise average scores
- teacher-wise pending work

#### 4. UI filters

Analytics page should use:

- source
- subject
- optional teacher filter

### Output of Phase 5

- analytics matches student exam visibility logic
- student can understand performance by content origin

### Acceptance Criteria

- analytics source totals reconcile with student-visible exam sources
- subject and source filters behave consistently with exam page

---

## Phase 6: Admin and Authoring Alignment

### Status

- Pending

### Goal

Ensure admins and teachers can intentionally choose exam source during creation and publishing.

### Scope

- teacher exam builder
- institute exam builder
- platform exam builder

### Changes

#### 1. Source selection in authoring flows

Allow exam source to be explicitly chosen based on allowed role context.

Examples:

- platform admin or platform teacher can publish as platform
- institute admin or institute teacher can publish as institute
- teacher can publish as teacher when teacher-directed visibility is intended

#### 2. Guardrails

- user should not publish as platform unless role allows it
- institute teacher should not publish platform exams
- teacher source should require teacher ownership linkage

#### 3. Review and QA displays

Teacher and admin pages should show:

- source type
- source owner if relevant

### Output of Phase 6

- content source is intentional and auditable

### Acceptance Criteria

- authoring UI can set source cleanly
- backend permissions enforce source rules

### Current Progress

- completed backend role-aware source validation for exam create and update
- completed teacher exam creation flow with explicit `teacher / institute` source selection
- completed institute admin exam creation flow with explicit `institute` source selection
- completed platform-admin exam creation flow with explicit `platform / institute` source selection
- completed platform-admin exam management screen with source-aware overview cards
- completed platform-admin exam detail and builder wrappers so governance stays inside the admin workspace
- completed backend tests for:
  - teacher defaulting to teacher source
  - teacher intentionally publishing as institute source
  - institute admin defaulting to institute source
  - institute admin being blocked from teacher source publication

---

## Suggested Delivery Order for Production

### Priority 1

- Phase 1
- Phase 2
- Phase 3

This gives:

- source-aware backend
- source-aware student exam API
- source + subject filters on student exam list

### Priority 2

- Phase 4
- Phase 5

This gives:

- consistency across dashboard and recommendations
- source-aware analytics

### Priority 3

- Phase 6

This gives:

- cleaner authoring and governance alignment

---

## Immediate Build Order

1. complete Phase 2 API query support
2. add backend tests for filtered student exam visibility
3. complete Phase 3 student exams page source filter
4. show source metadata on featured exam and exam cards
5. verify source and subject filtering together
6. move to dashboard propagation only after exams page is stable

## Done / Pending Snapshot

### Done

- source fields added to exam model
- source validation added to backend
- source metadata exposed in student exam serializer
- source metadata exposed in admin and teacher read flows

### Pending Now

- student exam API source query filtering
- teacher-specific student filter option
- student exams page source filter controls
- source badges and teacher labels in student exam cards
- source-aware student analytics split

---

## Final Student Output After Completion

Student will see:

- one merged exam list by default
- top filter by `Source`
- top filter by `Subject`
- optional teacher filter when source is teacher
- clear card labels such as:
  - `Platform · Math`
  - `Institute · Science`
  - `Teacher · Rahul Sharma · English`

Analytics will show:

- overall
- source-wise
- subject-wise
- teacher-wise when relevant

---

## Final Technical Output After Completion

- exam source model added
- assignment logic enhanced with source-aware resolution
- student exam API enriched with source metadata
- student exam page source + subject filter implemented
- analytics aligned to the same source + subject dimensions
- authoring flows aligned to intentional publishing scope

---

## Out of Scope for This Plan

- payment provider changes
- economy policy redesign
- institute geography filtering enhancements
- parent analytics redesign
- mobile app parity in the first pass

These can be scheduled after web student production readiness.
