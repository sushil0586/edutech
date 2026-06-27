# Multi-Subject Exam Implementation Plan

## Purpose

This document defines the rollout plan for evolving the current exam model from:

- one exam -> one subject

to:

- one exam -> multiple subjects
- one section -> exactly one subject

This change is especially important for the three highest-priority lanes:

- School
- NEET
- JEE

It should be treated as a product-model shift across authoring, delivery, reporting, and QA, not as a cosmetic create-form enhancement.

## Current Reality

The platform currently assumes a singular subject at exam scope across key creation and read surfaces.

Primary touchpoints:

- [create-exam-wizard.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/create-exam-wizard.tsx:346)
- [create-exam-wizard.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/create-exam-wizard.tsx:797)
- [advanced-exam-builder.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/advanced-exam-builder.tsx:1224)
- [advanced-exam-builder.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/advanced-exam-builder.tsx:1568)
- [new exam page](/Users/ansh/Documents/Eductech/edutech_web/src/app/(institute)/institute/exams/new/page.tsx:47)
- [ExamReadSerializer](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:924)
- [ExamListSerializer](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:1011)

What that means in practice:

- guided create selects one subject for the exam shell
- advanced builder fetches topics from one selected subject
- exam detail and list responses expose one `subject_name`
- surrounding analytics and workspace views frequently assume singular subject display

## Product Decision

## Target Model

Adopt this rule set:

- an exam may contain one or more sections
- every section must belong to exactly one subject
- an exam may therefore span one or many subjects
- questions inside a section must match that section's subject

Examples:

- School:
  - Section A -> Mathematics
  - Section B -> Science
- NEET:
  - Physics
  - Chemistry
  - Biology
- JEE:
  - Physics
  - Chemistry
  - Mathematics

## Recommended Compatibility Posture

Use a transitional hybrid model first:

- keep exam-level `subject` or `primary_subject` for compatibility, defaults, and legacy display support
- make section subject the true authoring and runtime source of truth

This is safer than removing exam-level subject immediately because current list views, filters, analytics summaries, and integrations still rely on a singular subject signal.

## Goals

This plan is complete when:

- institute, admin, and teacher users can create multi-subject exams through the builder
- section subject selection is explicit and validated
- topic and question selection respects the selected section subject
- student runtime and results remain coherent for both legacy single-subject exams and new multi-subject exams
- School, NEET, and JEE authoring become meaningfully more natural

## Non-Goals For The First Rollout

- redesigning all analytics into a full multidimensional subject engine
- removing legacy exam-level subject immediately
- solving every future family such as GRE, language proficiency, or certification subdomain reporting in the same release

## Execution Principles

Build in this order:

1. contract and migration design
2. backend compatibility layer
3. advanced builder support
4. guided wizard support
5. read surfaces and reporting cleanup
6. role-based QA and automation

This order avoids shipping partial UI support before the API and legacy data model are safe.

## Phase 0: Audit And Contract Lock

### Objective

Identify every place where `exam.subject` is treated as the only subject signal and lock the new product contract before implementation begins.

### Scope

Audit:

- exam creation payloads
- advanced builder payloads
- serializer contracts
- exam detail and list UI
- student attempt metadata
- student results and analytics subject displays
- workspace search and quick filters
- economy or policy surfaces that mention `subject_name`

### Key audit surfaces

- [teacher-builder API types](/Users/ansh/Documents/Eductech/edutech_web/src/lib/api/teacher-builder.ts:78)
- [student subject context](/Users/ansh/Documents/Eductech/edutech_web/src/lib/student/subject-context.ts:375)
- [student analytics derivations](/Users/ansh/Documents/Eductech/edutech_web/src/lib/student/analytics-derivations.ts:166)
- [student practice helpers](/Users/ansh/Documents/Eductech/edutech_web/src/lib/student/practice.ts:83)
- [workspace live search](/Users/ansh/Documents/Eductech/edutech_web/src/lib/workspace/live-search.ts:67)

### Deliverables

- one agreed source-of-truth model note
- one affected-surface inventory
- one compatibility decision on whether exam-level subject remains temporarily required, optional, or derived

### Acceptance Criteria

- no team is building against conflicting assumptions
- all impacted roles and surfaces are known before schema work starts

## Phase 1: Data Model And Migration Foundation

### Objective

Introduce section-level subject ownership without breaking existing exams.

### Recommended data direction

- add subject ownership to every section if not already durable enough for authoring truth
- retain exam-level subject as a compatibility field during transition
- treat exam-level subject as:
  - default subject seed for first section
  - legacy display hint
  - fallback for untouched single-subject exams

### Migration Rules

For existing exams:

- if an exam has one subject and all sections are currently generic, backfill that subject to every section
- if an exam has no sections yet, preserve the current exam-level subject and use it as the first builder default
- if historical data contains inconsistent section/question subject relationships, mark those records for manual audit rather than silently rewriting question links

### Acceptance Criteria

- all legacy exams continue to read correctly
- migrated sections always have one valid subject
- no existing create or read path hard-fails because section subject is absent during rollout

## Phase 2: Backend API And Validation

### Objective

Make APIs capable of receiving and returning section-level subject data while preserving legacy behavior during transition.

### Work Items

- extend advanced builder serializers to accept `subject` per section blueprint
- validate that every section has exactly one subject
- validate that chosen topics belong to the section subject
- validate that linked questions belong to the section subject unless an explicit override policy is introduced later
- add compatibility handling so old single-subject payloads can still be normalized
- decide how `subject_name` should be represented on read:
  - legacy singular field
  - derived primary subject field
  - new subject-summary structure

### Primary backend files

- [exam serializers](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:428)
- [exam serializers](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:924)
- [exam serializers](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:1011)

### Acceptance Criteria

- builder APIs support section subject in create, preview, and update flows
- invalid cross-subject section payloads are rejected clearly
- legacy clients still receive enough subject information to render safely

## Phase 3: Advanced Builder Support

### Objective

Make the advanced builder the first complete authoring surface for multi-subject exams.

### Why this comes first

The advanced builder already owns sections, topic allocation, and family-aware authoring. It is the lowest-risk surface for introducing section-level subject selection.

### Work Items

- replace single exam-wide subject dependence with per-section subject selection
- let the exam retain an optional primary subject or default subject seed
- fetch topics according to the active section subject
- update section draft creation so new sections choose a subject first
- update preview summaries to show multi-subject composition
- update title and code suggestions so they do not overfit a single subject when the exam spans multiple subjects
- update family defaults for School, NEET, and JEE:
  - School can scaffold mixed-subject tests
  - NEET should scaffold Physics, Chemistry, Biology
  - JEE should scaffold Physics, Chemistry, Mathematics

### Primary frontend file

- [advanced-exam-builder.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/advanced-exam-builder.tsx:1224)

### Acceptance Criteria

- users can create a multi-subject exam end-to-end in the advanced builder
- each section has a visible subject and valid topic pool
- builder previews no longer misrepresent the exam as single-subject

## Phase 4: Guided Wizard Support

### Objective

Bring guided creation into alignment after the advanced builder contract is stable.

### Work Items

- change wizard copy from single-subject framing to section-aware framing
- keep the first-step subject field only if used as a default seed
- otherwise make the wizard clearly route mixed-subject cases into section configuration
- update preset guidance to explain when one exam should contain multiple subjects vs separate subject-specific exams
- ensure teacher and institute create flows can still quickly create simple one-subject exams without extra burden

### Primary frontend files

- [create-exam-wizard.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/create-exam-wizard.tsx:346)
- [new exam page](/Users/ansh/Documents/Eductech/edutech_web/src/app/(institute)/institute/exams/new/page.tsx:47)

### Acceptance Criteria

- simple exams remain quick to create
- mixed-subject authoring no longer feels blocked by the wizard
- wizard wording does not reinforce the old single-subject limitation

## Phase 5: Read Surfaces, Runtime, And Reporting

### Objective

Ensure downstream surfaces remain truthful once an exam can span multiple subjects.

### Impacted areas

- exam list cards
- exam detail headers
- workspace search descriptions
- student exam detail metadata
- attempt summaries
- results cards
- analytics summaries that group by subject

### Product decisions needed

- how should an exam card display subject when the exam has many sections
- should lists show:
  - primary subject
  - subject count
  - joined subject labels
- how should student analytics treat a multi-subject exam:
  - whole-exam score only
  - section-by-section subject breakdown
  - both

### Acceptance Criteria

- no surface falsely implies a mixed-subject exam belongs to only one subject
- student-facing outcomes remain understandable
- legacy single-subject analytics continue to work

## Phase 6: School, NEET, And JEE Hardening

### Objective

Use the new model to improve the three priority lanes first.

### School

Target outcomes:

- mixed subject periodic tests
- combined half-yearly or unit tests
- cleaner section-to-subject mapping for school admins and teachers

### NEET

Target outcomes:

- standard three-subject mock structure
- clearer section defaults and blueprinting
- reduced need for awkward single-subject exam splitting

### JEE

Target outcomes:

- standard PCM structure
- cleaner section subject ownership for mixed objective and numeric patterns
- stronger family-aligned defaults in builder scaffolding

### Acceptance Criteria

- each family has one recommended multi-subject exam scaffold
- family presets and docs reflect the new authoring model

## Phase 7: QA And Automation

### Objective

Prove that the shift is safe across roles and does not regress current delivery.

### Role coverage

- platform admin
- institute admin
- teacher
- student

### Required validation

- legacy single-subject exam creation and delivery still work
- multi-subject exam builder create, edit, preview, and publish work
- section subject changes correctly refresh topic pools
- student runtime displays mixed-subject exams clearly
- result and review surfaces remain truthful

### Automation priorities

- extend exam creation scenario catalog with multi-subject cases
- add Playwright coverage for institute and teacher authoring
- add student playback coverage for mixed-subject exam attempts
- add targeted serializer or API contract tests for migration and validation rules

### Reference

- [EXAM_CREATION_SCENARIO_CATALOG.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/EXAM_CREATION_SCENARIO_CATALOG.md:1)

## Risks

Primary risks:

- singular `subject_name` assumptions are broader than exam creation alone
- analytics and search may quietly become misleading if not updated
- title, code, and preset defaults may feel awkward for mixed-subject exams
- migrating historical data without clear audit rules could create hidden inconsistencies

## Recommended Rollout Sequence

1. lock the contract and migration rules
2. implement backend compatibility
3. ship advanced builder support behind internal validation first
4. update guided wizard
5. update read and student surfaces
6. harden School, NEET, and JEE presets
7. expand Playwright and backend regression coverage

## Immediate Next Tickets

1. Create the affected-surface audit table for all singular-subject dependencies.
2. Define the exact section payload contract for builder create and preview APIs.
3. Decide the compatibility rule for exam-level `subject`:
   - keep required temporarily
   - make optional with fallback derivation
   - replace with explicit `primary_subject`
4. Implement advanced builder section subject selection first.
5. Add one School mixed-subject scaffold, one NEET scaffold, and one JEE scaffold.

## Recommendation

For the first implementation wave, optimize for:

- compatibility over purity
- advanced builder first
- School, NEET, and JEE first

That gives the product the right model without forcing a risky platform-wide rewrite in one pass.
