# Phase 1 Manageability Implementation Tickets

## Purpose

This document breaks the highest-priority product manageability work into Phase 1 implementation tickets.

Phase 1 focus:

1. slot-based exam access
2. attempt-level timer refactor
3. slot capacity control
4. audit trail for critical actions
5. configuration guardrails
6. support override tooling

Primary planning references:

- [PRODUCT_MANAGEABILITY_PRIORITIZATION_SHEET.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/PRODUCT_MANAGEABILITY_PRIORITIZATION_SHEET.md)
- [EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_CONTROL_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_CONTROL_PLAN.md)
- [EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_EXECUTION_TRACKER.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_EXECUTION_TRACKER.md)
- [APP_MANAGEABILITY_GAP_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/APP_MANAGEABILITY_GAP_PLAN.md)

## Phase 1 Success Criteria

Phase 1 is successful when:

- students can be assigned to exam slots
- attempt start timing is resolved from the student’s slot, not just one global exam window
- slot capacity can block overfilled starts safely
- all critical scheduling and override actions are auditable
- invalid slot and access configurations are blocked before going live
- support can recover common live-access issues without DB-level intervention

## Work Package 1: Slot-Based Exam Access

## Ticket P1-01: Add Exam Slot Data Model

### Scope

Create first-class slot entities for exams.

### Deliverables

- `ExamAccessSlot` model
- `ExamAccessAssignment` model
- migrations
- indexes for exam, slot state, and student resolution lookup

### Required fields

#### `ExamAccessSlot`

- `exam`
- `slot_label`
- `slot_start_at`
- `slot_end_at`
- `assignment_capacity`
- `start_capacity`
- `status`
- `metadata`

#### `ExamAccessAssignment`

- `exam`
- `slot`
- `student` nullable
- `cohort` nullable
- `assigned_by`
- `assignment_source`
- `priority`
- `metadata`

### Acceptance criteria

- an exam can have multiple slots
- a slot can be assigned directly to students or to cohorts
- schema supports future platform-managed allocation

### Suggested file areas

- `edutech_backend/apps/exams/models.py`
- `edutech_backend/apps/exams/migrations/`

## Ticket P1-02: Build Slot Resolution Service

### Scope

Resolve one student’s effective exam slot.

### Deliverables

- `resolve_student_exam_slot(student, exam)`
- student direct assignment precedence
- cohort assignment fallback
- legacy fallback for non-slotted exams

### Acceptance criteria

- direct assignment overrides cohort assignment
- inactive or invalid slots are ignored
- response is deterministic and reusable

### Suggested file areas

- `edutech_backend/apps/exams/services.py`

## Ticket P1-03: Expose Slot Data in Student Exam Contracts

### Scope

Expose resolved slot truth in student-facing exam APIs.

### Deliverables

- slot timing in available exam payload
- slot timing in exam detail payload
- access state labels driven by resolved slot

### Acceptance criteria

- student can see actual assigned access window
- frontend does not have to infer timing behavior

### Suggested file areas

- `edutech_backend/apps/exams/serializers/__init__.py`
- student exam API view layer as needed

## Work Package 2: Attempt-Level Timer Refactor

## Ticket P1-04: Refactor Attempt Start to Use Resolved Slot Window

### Scope

Replace global-window-only gating with slot-aware attempt start validation.

### Deliverables

- resolve slot before start
- validate slot time window
- preserve legacy exam behavior

### Acceptance criteria

- student can start only inside valid slot access
- legacy exams still work safely

### Suggested file areas

- `edutech_backend/apps/attempts/services.py`

## Ticket P1-05: Snapshot Timing Rules into Attempt Metadata

### Scope

Ensure active attempts keep timing truth even if later configuration changes.

### Deliverables

- slot snapshot
- timing snapshot
- hard cutoff snapshot if used
- support snapshot for accommodation-adjusted duration

### Acceptance criteria

- post-start changes do not alter active attempt timing unexpectedly

### Suggested file areas

- `edutech_backend/apps/attempts/services.py`
- attempt serializer layer if timing metadata is surfaced

## Ticket P1-06: Centralize Attempt Expiry Calculation

### Scope

Make attempt expiry logic explicit and reusable.

### Deliverables

- central function for:
  - started_at
  - duration
  - extra time
  - hard cutoff
- tests for late-start and clipped-expiry behavior

### Acceptance criteria

- expiry calculation is deterministic and documented through tests

### Suggested file areas

- `edutech_backend/apps/attempts/services.py`

## Work Package 3: Slot Capacity Control

## Ticket P1-07: Build Slot Occupancy and Capacity Summary Service

### Scope

Compute assignment and runtime occupancy for every slot.

### Deliverables

- assigned seat count
- active start count
- remaining assignment capacity
- remaining start capacity

### Acceptance criteria

- admin and support views can consume slot occupancy summary

### Suggested file areas

- `edutech_backend/apps/exams/services.py`

## Ticket P1-08: Enforce Slot Capacity at Attempt Start

### Scope

Prevent over-capacity starts under concurrent conditions.

### Deliverables

- transactional runtime cap enforcement
- blocked-start reason capture
- deterministic error message

### Acceptance criteria

- last-seat race condition does not oversubscribe
- over-capacity student receives clear feedback

### Suggested file areas

- `edutech_backend/apps/attempts/services.py`

## Ticket P1-09: Admin Visibility for Slot Pressure

### Scope

Expose near-full and full status to admins.

### Deliverables

- slot summary API
- occupancy flags:
  - healthy
  - near_full
  - full

### Acceptance criteria

- admin can identify risky slots before exam start

### Suggested file areas

- backend summary endpoint
- admin frontend slot table or card

## Work Package 4: Audit Trail

## Ticket P1-10: Define Critical Scheduling and Access Audit Events

### Scope

Introduce explicit audit coverage for Phase 1 changes.

### Audit events

- slot created
- slot updated
- slot capacity changed
- student assigned to slot
- cohort assigned to slot
- slot override applied
- access reopened
- start blocked by capacity

### Acceptance criteria

- all listed actions create queryable audit records

### Suggested file areas

- `edutech_backend/apps/reports/services.py`
- relevant `views` and service write paths

## Ticket P1-11: Persist Before/After Snapshot for Critical Changes

### Scope

Store useful audit context for support and rollback understanding.

### Deliverables

- previous values
- new values
- actor
- note or reason

### Acceptance criteria

- support can reconstruct what changed without reading raw DB state

## Work Package 5: Configuration Guardrails

## Ticket P1-12: Add Slot Validation Rules

### Scope

Reject invalid slot definitions and risky overlaps.

### Validation targets

- slot end must be after slot start
- slot must belong to same exam
- capacity cannot be negative or invalid
- assignment cap cannot be lower than already assigned count on update
- start cap cannot be invalid relative to assignment cap where enforced

### Acceptance criteria

- invalid slot configuration is blocked with useful errors

### Suggested file areas

- `edutech_backend/apps/exams/models.py`
- serializer validation layer

## Ticket P1-13: Add Assignment Guardrails

### Scope

Prevent invalid or dangerous student-slot assignments.

### Validation targets

- duplicate active assignment prevention
- conflicting slot assignment handling
- unsupported cohort or student mismatch handling

### Acceptance criteria

- one student resolves cleanly to intended slot behavior

### Suggested file areas

- `edutech_backend/apps/exams/services.py`
- assignment serializers or service layer

## Ticket P1-14: Add Pre-Live Exam Readiness Checks for Slot Mode

### Scope

Prevent slotted exams from going live with incomplete setup.

### Readiness rules

- exam has valid slot set
- slot windows are valid
- expected students are assigned
- no broken capacity state
- access policy is resolvable

### Acceptance criteria

- slotted exam publish path surfaces readiness issues before launch

### Suggested file areas

- `edutech_backend/apps/exams/services.py`
- publish flow integration

## Work Package 6: Support Override Tooling

## Ticket P1-15: Add Student Slot Override Support Action

### Scope

Allow support or platform admin to move one student to another slot.

### Deliverables

- safe override endpoint or action
- audit log
- reason required

### Acceptance criteria

- support can move one student without manual DB intervention

### Suggested file areas

- backend admin/support endpoint
- admin/support UI action surface

## Ticket P1-16: Add Reopen Access Window Support Action

### Scope

Allow time-bounded reopening for one student.

### Deliverables

- reopen action
- validity window
- actor and reason capture

### Acceptance criteria

- a blocked or missed student can be granted a controlled retry window

## Ticket P1-17: Add Manual Sponsored Access Override for One Exam

### Scope

Allow support/admin to grant one-off access where business permits.

### Deliverables

- exam-specific sponsored access action
- expiration support if needed
- audit log

### Acceptance criteria

- student can be granted one-off access cleanly
- support action is visible and traceable

## Frontend Tasks

## Ticket P1-18: Admin Slot Management UI

### Scope

Create initial admin UI for:

- slot create
- slot edit
- slot list
- capacity view

### Acceptance criteria

- admin can manage slots from UI

### Suggested file areas

- `edutech_web/src/components/admin/`
- `edutech_web/src/app/(admin)/`

## Ticket P1-19: Student Slot Visibility UI

### Scope

Update student exam surfaces to show:

- assigned slot
- start window
- blocked reason
- access status

### Acceptance criteria

- student understands when and why they can or cannot start

### Suggested file areas

- `edutech_web/src/app/(student)/`
- `edutech_web/src/components/ui/`

## Ticket P1-20: Admin Support Action UI

### Scope

Expose override actions in a controlled admin/support surface.

### Acceptance criteria

- admin can:
  - move student slot
  - reopen access
  - sponsor one-off access

### Suggested file areas

- `edutech_web/src/components/admin/`
- relevant admin route screens

## QA and Testing Tickets

## Ticket P1-21: Unit Test Coverage for Phase 1 Core Logic

### Test areas

- slot resolution
- timing validation
- expiry calculation
- capacity enforcement
- guardrail validation

### Acceptance criteria

- critical Phase 1 services have direct unit coverage

## Ticket P1-22: Integration Tests for Slotted Attempt Workflow

### Test areas

- slot-assigned student starts successfully
- outside-slot student blocked
- slot-full student blocked
- override actions recover access appropriately

### Acceptance criteria

- service-layer flows pass reliably

## Ticket P1-23: E2E Browser Tests for Admin and Student Slot Flow

### Test areas

- admin creates slot
- admin assigns student or batch
- student sees assigned slot
- student starts inside slot
- student blocked outside slot

### Acceptance criteria

- core browser journey is covered end to end

## Ticket P1-24: Concurrency and Race Validation

### Test areas

- final remaining slot seat
- multiple concurrent starts
- blocked-start correctness under contention

### Acceptance criteria

- no capacity oversubscription under concurrent load

## Suggested Execution Order

### Wave 1

- P1-01
- P1-02
- P1-04
- P1-06

### Wave 2

- P1-03
- P1-05
- P1-07
- P1-08

### Wave 3

- P1-10
- P1-11
- P1-12
- P1-13
- P1-14

### Wave 4

- P1-15
- P1-16
- P1-17
- P1-18
- P1-19
- P1-20

### Wave 5

- P1-21
- P1-22
- P1-23
- P1-24

## Minimum Phase 1 Signoff

Before Phase 1 is considered complete:

- all core backend tickets through `P1-17` are implemented
- slot-based attempt flow is e2e-covered
- no over-capacity race is reproducible in validation
- audit logs are emitted for critical actions
- basic admin and student UI paths are usable

## Recommended Next Step

Start implementation from:

- `P1-01` through `P1-06`

That creates the base needed for every other Phase 1 ticket.
