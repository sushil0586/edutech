# Milestone 1 Exam Control Implementation Tickets

## Objective

Convert Milestone 1 into implementation-ready tickets for:

- slot-managed exam access
- attempt-start timer governance
- capacity control
- scheduling auditability
- support overrides

## Important delivery note

Milestone 1 is not greenfield.

Existing foundations already present:

- `ExamAccessSlot`
- `ExamStudentAssignment`
- attempt expiry logic in `apps/attempts/services.py`
- admin slot create/update/override actions in `edutech_web/src/app/(admin)/admin/exams/[examId]/page.tsx`

The tickets below are written to complete and operationalize those foundations.

## Ticket Group A: Data Model and Migrations

### M1-A1: Add explicit exam access mode

Goal:

- add `access_mode` to `Exam`

Suggested values:

- `global_window_legacy`
- `slot_managed`
- `long_window_attempt_managed`
- `platform_event_managed`

Primary files:

- `edutech_backend/apps/exams/models.py`
- related serializers and admin payloads

Acceptance criteria:

- new field exists with safe backward-compatible default
- legacy exams continue to behave correctly
- exam detail payload exposes the field

### M1-A2: Add institute management mode config

Goal:

- persist institute-level runtime governance mode

Suggested values:

- `private_institute_managed`
- `public_institute_managed`
- `platform_managed`

Primary files:

- institute model or institute config surface
- institute serializers

Acceptance criteria:

- mode can be read by runtime services
- platform admin can set it
- institute-scoped defaults resolve correctly

### M1-A3: Add scheduling audit models

Goal:

- track slot changes and access overrides explicitly

Suggested models:

- `ExamScheduleAuditLog`
- `ExamAccessOverrideLog`

Primary files:

- `edutech_backend/apps/exams/models.py`
- migrations

Acceptance criteria:

- slot create/update/pause/resume writes audit
- student slot override writes audit
- reason and actor are preserved

### M1-A4: Evaluate minimal slot policy extension

Goal:

- add only the extra slot fields truly needed for runtime enforcement

Candidate fields:

- `hard_close_at`
- `allow_late_start_until`

Note:

- do not add speculative fields without service usage

Acceptance criteria:

- final field list is justified by service logic
- model validation covers impossible combinations

## Ticket Group B: Backend Runtime Services

### M1-B1: Add centralized exam access runtime resolver

Goal:

- create one service that resolves effective runtime access for one student and one exam

Suggested service:

- `resolve_exam_access_runtime(student, exam, now)`

Should resolve:

- access mode
- effective slot
- effective start window
- grace rule
- hard close rule
- capacity state
- final allow/block decision

Primary files:

- `edutech_backend/apps/exams/services.py`

Acceptance criteria:

- one canonical runtime decision object exists
- legacy behavior is still supported
- student and admin consumers can use the same decision output

### M1-B2: Refactor attempt start to use runtime resolver

Goal:

- move `start_attempt(...)` onto the centralized runtime decision flow

Primary files:

- `edutech_backend/apps/attempts/services.py`

Acceptance criteria:

- attempt creation happens only after runtime access is approved
- `expires_at` still derives from `started_at`
- resume path remains unaffected
- subscription allowance is still consumed only on successful new attempt start

### M1-B3: Enforce slot start capacity at runtime

Goal:

- block attempt start when slot runtime capacity is exceeded

Primary files:

- `edutech_backend/apps/attempts/services.py`
- capacity utility helpers

Acceptance criteria:

- concurrent start pressure respects `start_capacity`
- blocked start returns stable machine-readable reason
- no over-admission under concurrent requests in normal expected conditions

### M1-B4: Add stable blocked-start reason contract

Goal:

- standardize runtime start failure reasons

Suggested reasons:

- `outside_exam_window`
- `outside_slot_window`
- `slot_assignment_required`
- `slot_assignment_missing`
- `slot_assignment_capacity_reached`
- `slot_start_capacity_reached`

Primary files:

- `apps/exams/services.py`
- `apps/attempts/services.py`
- API serializers/responses

Acceptance criteria:

- student UI can render specific blocked reasons
- admin UI can inspect the same reason codes

### M1-B5: Add support override service layer

Goal:

- formalize support actions instead of relying only on direct row updates

Required actions:

- move student to another slot
- clear student slot override
- reopen one student
- pause starts for an exam

Acceptance criteria:

- each action validates scope
- each action writes audit
- updated effective access can be inspected immediately

## Ticket Group C: Backend APIs

### M1-C1: Extend exam payloads with runtime fields

Goal:

- expose explicit delivery/runtime fields in exam detail and exam list payloads

Fields:

- `access_mode`
- `management_mode`
- `availability_resolution`
- `capacity_policy_summary`

Acceptance criteria:

- admin exam detail can render runtime truth
- student exam detail can render blocked-reason truth

### M1-C2: Harden slot CRUD APIs

Goal:

- make slot APIs first-class operational APIs

Required endpoints:

- create slot
- update slot
- pause/resume slot
- inspect slot occupancy
- inspect slot assignments

Acceptance criteria:

- occupancy metrics are returned
- assignment and start capacities are visible
- paused slot behavior is explicit

### M1-C3: Add explicit student slot override APIs

Goal:

- move from basic override action to a clearer override contract

Required operations:

- set slot override
- clear slot override
- inspect effective slot
- inspect override history

Acceptance criteria:

- one student’s effective runtime slot can be explained end to end

## Ticket Group D: Admin UI

### M1-D1: Add exam access mode selector

Goal:

- let admins configure runtime delivery mode directly

Primary files:

- `edutech_web/src/app/(admin)/admin/exams/[examId]/builder/page.tsx`
- or `.../[examId]/page.tsx`

Acceptance criteria:

- admin can choose legacy vs slot-managed vs long-window mode
- warnings appear if selected mode is not fully configured

### M1-D2: Harden slot management panel

Goal:

- turn the current slot section into a stronger operations panel

Needed UI:

- create/edit/pause/resume slot
- slot occupancy
- slot assignment count
- slot status clarity

Acceptance criteria:

- admins can see which slot is saturated or underused
- slot errors are understandable

### M1-D3: Harden student override panel

Goal:

- make the override workflow support-friendly

Needed UI:

- searchable student selection
- current effective slot
- override history
- clear override action

Acceptance criteria:

- support/admin can explain and change a student’s slot with confidence

### M1-D4: Add exam readiness warnings

Goal:

- block unsafe publishing and highlight incomplete runtime setup

Warnings:

- slot-managed exam with no slots
- mandatory slot flow with unassigned students
- impossible capacity configuration

Acceptance criteria:

- runtime readiness is visible before live use

## Ticket Group E: Student Experience

### M1-E1: Add blocked-reason truth to student exam detail

Goal:

- student can see exactly why a start is blocked

Acceptance criteria:

- time, slot, and quota reasons are distinguishable

### M1-E2: Add slot window messaging to student exams list

Goal:

- student can see assigned slot and whether start is currently open

Acceptance criteria:

- slot start/end and grace are visible where relevant

### M1-E3: Confirm resume and timer behavior

Goal:

- keep timer based on attempt start
- keep resume behavior non-destructive

Acceptance criteria:

- resume does not create a new attempt
- resume does not re-consume subscription allowance

## Ticket Group F: Testing and Validation

### M1-F1: Model and service tests

Cover:

- slot validation
- assignment capacity
- runtime start window checks
- start capacity enforcement

### M1-F2: API tests

Cover:

- slot CRUD
- override APIs
- blocked reason payloads
- audit creation

### M1-F3: E2E tests

Cover:

1. admin creates slot-managed exam
2. admin assigns students to slot
3. student starts inside slot
4. student blocked outside slot
5. admin changes slot override
6. student starts through updated slot

### M1-F4: Load test preparation

Goal:

- prepare runtime validation for slot starts under concurrency

Initial target bands:

- 10
- 50
- 100
- 500 concurrent starts

## Recommended implementation order

1. `M1-A1`
2. `M1-B1`
3. `M1-B2`
4. `M1-B3`
5. `M1-C1`
6. `M1-C2`
7. `M1-D1`
8. `M1-D2`
9. `M1-D3`
10. `M1-E1`
11. `M1-E2`
12. `M1-A3`
13. `M1-B5`
14. `M1-C3`
15. `M1-D4`
16. `M1-F1`
17. `M1-F2`
18. `M1-F3`
19. `M1-F4`

## Pilot minimum cut

Minimum acceptable pilot-safe delivery:

- `M1-A1`
- `M1-B1`
- `M1-B2`
- `M1-B3`
- `M1-C1`
- `M1-C2`
- `M1-D1`
- `M1-D2`
- `M1-D3`
- `M1-E1`
- `M1-E2`
- `M1-F1`
- `M1-F2`
- `M1-F3`

## Scale-readiness add-ons after pilot

- deeper audit and override tooling
- public long-window threshold engine
- larger load-test validation
- richer operator dashboards
