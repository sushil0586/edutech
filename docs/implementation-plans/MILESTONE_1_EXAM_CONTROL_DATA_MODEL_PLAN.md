# Milestone 1 Exam Control Data Model Plan

## Goal

Complete the data model needed for pilot-safe exam control:

- slot-managed access for private institutes
- attempt-start timer governance
- capacity enforcement
- scheduling auditability
- support overrides

## Current foundation already present

Backend foundations already exist in code:

- `Exam.start_at` and `Exam.end_at`
- `Exam.duration_minutes`
- `ExamAccessSlot` in `edutech_backend/apps/exams/models.py`
- `ExamStudentAssignment` with optional `access_slot`
- slot fields already include:
  - `slot_label`
  - `slot_start_at`
  - `slot_end_at`
  - `grace_period_minutes`
  - `assignment_capacity`
  - `start_capacity`
  - `status`
- admin slot create/update/override actions already exist in:
  - `edutech_web/src/app/(admin)/admin/exams/[examId]/page.tsx`

Conclusion:

Milestone 1 should extend and operationalize the existing slot model instead of replacing it.

## Required model additions

### 1. Exam delivery mode

Add an explicit field on `Exam`:

- `access_mode`

Proposed values:

- `global_window_legacy`
- `slot_managed`
- `long_window_attempt_managed`
- `platform_event_managed`

Reason:

- current behavior is inferred from schedule and policy
- explicit mode will make runtime resolution easier and safer

### 2. Institute management mode

Add a platform-governed mode on institute metadata or first-class model config:

- `private_institute_managed`
- `public_institute_managed`
- `platform_managed`

Reason:

- exam runtime rules should not be decided only from one exam row
- institute defaults are needed for operational consistency

### 3. Slot runtime policy fields

Extend `ExamAccessSlot` if needed with:

- `hard_close_at`
- `allow_late_start_until`
- `runtime_concurrency_cap`
- `starts_per_minute_cap`

Notes:

- `start_capacity` already exists and may remain the first pilot control
- do not over-model before runtime enforcement is implemented

### 4. Student support override record

Add explicit override audit model, for example:

- `ExamAccessOverrideLog`

Track:

- exam
- student
- previous slot
- new slot
- override type
- reason
- changed_by
- created_at

Reason:

- current assignment updates are not enough for support traceability

### 5. Scheduling audit log

Add explicit audit model, for example:

- `ExamScheduleAuditLog`

Track:

- exam
- slot if applicable
- action
- changed fields
- changed by
- timestamp

Reason:

- slot edits, capacity edits, and timing edits should be reviewable

## Required compatibility rules

### Legacy exams

If `access_mode` is null for old rows:

- resolve as `global_window_legacy`

### Slot-managed exams

Rules:

- `ExamAccessSlot` remains the source of allowed start windows
- `ExamStudentAssignment.access_slot` remains the student-specific override lane

### Long-window exams

Rules:

- exam-level `start_at` and `end_at` remain the outer availability window
- runtime start checks should happen against the exam-level window

## Timer model

The attempt timer architecture already partly exists:

- `start_attempt(...)` creates `started_at`
- `_calculate_attempt_expires_at(...)` derives `expires_at`

Milestone 1 requirement:

- make attempt-start expiry the formal default for all non-legacy modes
- allow slot hard-close clipping only through explicit policy

## Capacity model

### Existing foundation

- assignment capacity exists
- start capacity exists

### Required completion

Need runtime enforcement for:

- assignment cap at assignment time
- start cap at attempt start time
- optional active concurrency cap for broader public/event modes later

## Recommended migration order

1. Add `access_mode` to `Exam`
2. Add institute management mode config
3. Add scheduling audit models
4. Keep `ExamAccessSlot` and `ExamStudentAssignment` as the primary pilot foundation
5. Add minimal new slot policy fields only if runtime logic actually needs them

## Deliverables

- model change spec
- migration plan
- backward compatibility rules
- audit schema
- slot/runtime policy schema
