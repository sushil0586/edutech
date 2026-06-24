# Phase 1 Foundation Hardening Implementation Plan

## Purpose

This document breaks Phase 1 of the next implementation roadmap into execution-ready tickets.

Phase 1 focus:

- strict content validation
- bulk import hardening
- academic mapping integrity
- role-wise CRUD confidence
- regression coverage for recent question-type expansion

This plan is intended to be implemented before larger expansion into reviewer queues, media-heavy items, and exam-family profiles.

Related documents:

- [NEXT_IMPLEMENTATION_ROADMAP.md](./NEXT_IMPLEMENTATION_ROADMAP.md)
- [FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md](./FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md)

---

## Phase 1 Goal

Make the current question-bank and import foundation safe enough that future question types and exam families can be added without data corruption, academic mismatches, or weak operator feedback.

---

## Current Risk Areas

These are the main places where Phase 1 should focus:

1. Question authoring can still drift into weak academic mappings.
2. Bulk import validation is good, but not yet complete enough for future type growth.
3. UI feedback is still more “error happened” than “here is exactly what to fix.”
4. Role-wise behavior needs an explicit regression pass instead of informal confidence.
5. Recent new types like `numeric_answer` and `essay_manual_review` need broader validation and import coverage.

---

## Main Implementation Streams

## Stream A: Academic Mapping Integrity

### Outcome

Questions, passages, and imports must always respect institute academic structure.

### Tickets

### A1. Centralize question academic validation service

#### Goal

Move academic mapping checks into one reusable validation layer that can be called by serializers, import preview, and future APIs.

#### Backend scope

- create or extract a shared validation helper in `edutech_backend/apps/question_bank`
- validate:
  - question `program`, `subject`, `topic`
  - subject belongs to institute
  - topic belongs to institute
  - topic belongs to subject
  - subject belongs to program when program is required
  - question program matches subject program when both exist
  - comprehension passage academic mapping stays aligned with child question mapping

#### Suggested files

- `edutech_backend/apps/question_bank/services.py`
- `edutech_backend/apps/question_bank/serializers/__init__.py`
- possibly model `clean()` methods if appropriate

#### Acceptance criteria

- same invalid combination is rejected consistently from manual create, edit, and import preview
- error messages are field-specific

---

### A2. Define explicit rule for `program = null`

#### Goal

Remove ambiguity around when `program` can be blank.

#### Decision to implement

Support one explicit rule only:

- either allow `program = null` only for intentionally unscoped/common-bank items
- or block `program = null` whenever a subject is program-bound

The codebase should not rely on accidental nulls.

#### Backend scope

- encode the rule in question and passage validation
- align import preview with the same rule
- return actionable error copy

#### Acceptance criteria

- no question is saved with academically inconsistent null program state
- import preview clearly explains why null program is rejected

---

### A3. Validate comprehension parent-child consistency

#### Goal

Comprehension passage metadata must stay structurally consistent with all linked child questions.

#### Scope

- child question institute must match passage institute
- child question academic mapping must be compatible with passage mapping
- prevent cross-subject or cross-program drift unless explicitly allowed
- validate `passage_order` and linkage consistency

#### Acceptance criteria

- broken comprehension set links cannot be created or updated silently

---

## Stream B: Bulk Import Hardening

### Outcome

CSV import should be trusted for real production onboarding without producing hidden bad content.

### Tickets

### B1. Expand row-level validation coverage by question type

#### Goal

Every supported question type must have explicit validation rules during import preview.

#### Current code surface

- `edutech_backend/apps/question_bank/services.py`
- `preview_bulk_question_import`

#### Scope

- validate options according to type
- validate accepted answers for text-based types
- validate numeric tolerance for `numeric_answer`
- validate review guidance for `essay_manual_review`
- validate that unsupported fields are rejected instead of ignored
- prepare the preview payload so it can support future type-specific field warnings

#### Acceptance criteria

- import preview catches missing or invalid fields before finalize
- invalid type-specific data returns row and field level messages

---

### B2. Add import rule metadata to preview responses

#### Goal

Make the importer explain not only “what failed” but also “what this type expects.”

#### Backend scope

- enrich preview response with machine-readable error details where useful
- optionally include warning categories such as:
  - missing academic link
  - invalid type field
  - unsupported optional field
  - inactive lookup reference

#### Frontend scope

- show richer row diagnostics in import UI
- allow quick scanning of repeated failure patterns

#### Acceptance criteria

- importer users can identify the exact fix without reading raw payloads

---

### B3. Prevent finalize when preview snapshot is stale or incomplete

#### Goal

Avoid importing payloads that no longer match current backend validation assumptions.

#### Scope

- add preview schema version or hash
- validate finalize request against current expected structure
- reject finalize when preview rows are missing or tampered with

#### Acceptance criteria

- finalize cannot import malformed or outdated preview payloads

---

### B4. Add question-import template evolution strategy

#### Goal

Ensure the template can grow with new types without confusing operators.

#### Scope

- version the import template conceptually
- mark which columns are universal vs type-specific
- update template copy in frontend importer
- define how new fields are introduced without breaking older CSV habits

#### Frontend scope

- improve template guidance in `teacher-question-import-workspace`
- document type-specific expectations near the upload panel

#### Acceptance criteria

- importer workflow remains understandable as more item types are added

---

## Stream C: Authoring UX Validation Feedback

### Outcome

Manual create/edit screens should prevent invalid saves earlier and explain constraints clearly.

### Tickets

### C1. Surface backend academic validation clearly in question editor

#### Goal

Manual authoring UI should display precise validation messages for program/subject/topic issues.

#### Frontend scope

- improve error mapping in question create/edit routes
- ensure question editor fields display field-level errors
- keep error copy aligned with backend validation language

#### Suggested files

- `edutech_web/src/components/ui/teacher-question-editor.tsx`
- create/edit route actions under teacher and institute question bank pages

#### Acceptance criteria

- invalid academic combinations are visible directly near the affected fields

---

### C2. Make dependent academic selectors stricter

#### Goal

Reduce invalid combinations before form submission.

#### Scope

- program selection filters subject choices
- subject selection filters topic choices
- clearing parent selection clears incompatible child selections
- comprehension create/edit screens follow the same rules

#### Acceptance criteria

- users are guided into valid mappings instead of discovering errors only on submit

---

### C3. Add inline type-specific guidance in the authoring form

#### Goal

As more question types appear, the form must explain what each type needs.

#### Scope

- accepted answers guidance for text and numeric types
- review guidance explanation for manual-review types
- option requirements for MCQ and true/false
- import parity hints where useful

#### Acceptance criteria

- authoring UI remains understandable as question-type complexity grows

---

## Stream D: Role and CRUD Regression Confidence

### Outcome

The team should know exactly what each role can do and where the platform is still weak.

### Tickets

### D1. Build role-wise CRUD verification matrix

#### Goal

Create an explicit execution matrix for:

- institute admin
- teacher
- student where review visibility is relevant

#### Scope

- question create
- question edit
- comprehension create
- comprehension edit
- import preview
- import finalize
- bulk question actions
- question preview/detail
- manual review visibility
- results analysis visibility

#### Deliverable

- repo checklist document
- mark each action as pass, fail, blocked, or intentionally forbidden

#### Acceptance criteria

- no ambiguity remains around which role can do what

---

### D2. Add backend tests for role-sensitive question-bank actions

#### Goal

Lock the permissions into tests, not memory.

#### Backend scope

- add API tests for teacher and institute question-bank flows
- verify cross-scope access is blocked
- verify manual review access remains limited to allowed roles

#### Acceptance criteria

- major role-sensitive routes have regression coverage

---

## Stream E: Regression Test Expansion

### Outcome

Recent new features become stable enough to build on.

### Tickets

### E1. Expand bulk workflow tests for new question types

#### Scope

- valid and invalid `numeric_answer`
- valid and invalid `essay_manual_review`
- accepted answer validation
- numeric tolerance validation
- review guidance validation
- academic mapping errors

#### Suggested files

- `edutech_backend/apps/question_bank/tests/test_bulk_workflows.py`

#### Acceptance criteria

- new question-type import rules are protected by automated tests

---

### E2. Add serializer and model validation tests for question create/update

#### Scope

- direct serializer validation coverage for academic mismatches
- option mismatches by type
- comprehension linkage consistency
- null-program rule coverage

#### Acceptance criteria

- manual authoring rules have isolated tests, not only import tests

---

### E3. Add frontend smoke validation for import and authoring paths

#### Scope

- importer displays row errors
- importer blocks finalize when no valid rows exist
- question editor surfaces backend validation copy
- comprehension editor handles invalid linkage feedback

#### Acceptance criteria

- the most important operator flows are smoke-tested or at minimum covered by documented QA steps

---

## Suggested Sprint Breakdown

## Sprint 1A: Backend Integrity

Implement:

- A1 central academic validation
- A2 null program rule
- B1 row-level validation expansion
- E1 bulk workflow backend tests
- E2 serializer validation tests

### Exit condition

No invalid academic mapping can be saved through create/edit/import.

---

## Sprint 1B: Import and Authoring UX

Implement:

- B2 richer preview diagnostics
- B3 stale preview protection
- C1 field-level validation feedback
- C2 stricter dependent selectors
- C3 type-specific form guidance

### Exit condition

Operators can understand and fix import/authoring issues without developer help.

---

## Sprint 1C: Role Hardening and QA

Implement:

- D1 role-wise CRUD verification matrix
- D2 role-sensitive backend tests
- E3 frontend smoke validation / QA checklist
- B4 template evolution guidance

### Exit condition

The team has explicit confidence in permission behavior and onboarding workflows.

---

## API and Contract Impact

Expected backend contract changes in this phase:

- richer import preview row payloads
- more explicit validation error maps
- possibly preview version/hash field for finalize safety
- stricter serializer error semantics for question create/update

Expected frontend impact:

- improved importer diagnostics UI
- stronger field-level error display
- better academic selector behavior

---

## Recommended Ownership Split

### Backend-heavy tickets

- A1
- A2
- A3
- B1
- B3
- D2
- E1
- E2

### Frontend-heavy tickets

- B2
- B4
- C1
- C2
- C3
- E3

### Joint tickets

- D1

---

## Definition of Done for Phase 1

Phase 1 is complete when all of the following are true:

- invalid academic mappings are blocked everywhere
- question import produces clear row-level feedback
- finalize import cannot commit stale or malformed preview data
- authoring forms guide users into valid combinations
- role-wise permissions are documented and tested
- recent question-type additions are covered by regression tests

---

## Immediate Recommended Build Order

If implementation starts now, do it in this order:

1. A1 central academic validation
2. A2 null-program rule
3. B1 import validation expansion
4. E1 and E2 backend regression coverage
5. B2 importer diagnostics UX
6. C1 and C2 authoring validation UX
7. D1 and D2 role verification hardening
8. B3 finalize safety
9. B4 template guidance
10. E3 frontend QA pass

This order gives maximum risk reduction early while keeping frontend rework low.
