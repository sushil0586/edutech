# Milestone 1 Exam Control Backend API Plan

## Goal

Define the backend APIs and service behavior for:

- slot-managed access
- attempt-start timer rules
- runtime capacity enforcement
- support overrides

## Current backend foundation

Existing behavior already present:

- attempt expiry is calculated in `edutech_backend/apps/attempts/services.py`
- slot models exist in `edutech_backend/apps/exams/models.py`
- admin slot management actions already call backend slot APIs through web actions

This milestone should unify those pieces into one explicit runtime policy flow.

## API workstreams

### 1. Exam detail and list payloads

Add explicit delivery fields in exam payloads:

- `access_mode`
- `management_mode`
- `availability_resolution`
- `start_policy_summary`
- `capacity_policy_summary`

Reason:

- admin and student clients should not infer runtime behavior from raw timestamps alone

### 2. Slot CRUD APIs

Existing slot APIs should become the canonical path for private institute scheduling.

Required operations:

- create slot
- update slot
- pause slot
- resume slot
- inspect slot occupancy
- inspect assigned students

Required response fields:

- assignment count
- in-progress attempt count
- assignment capacity
- start capacity
- effective start window
- grace window

### 3. Student assignment and slot override APIs

Required operations:

- assign exam to students
- assign slot to selected students
- move one student to another slot
- clear a student slot override
- inspect current effective slot for one student

Must record audit on every override.

### 4. Attempt start enforcement path

Update attempt start resolution to follow this order:

1. resolve exam access mode
2. resolve effective student slot if any
3. validate student is allowed to start now
4. enforce slot or event capacity
5. enforce commercial rule
6. create attempt
7. compute `expires_at`
8. persist runtime and audit snapshot

Reason:

- access validation should happen before attempt creation
- commercial and runtime rules must not be applied in conflicting order

### 5. Runtime error contract

The attempt-start API should return stable machine-readable reasons, such as:

- `outside_exam_window`
- `outside_slot_window`
- `slot_assignment_required`
- `slot_assignment_missing`
- `slot_assignment_capacity_reached`
- `slot_start_capacity_reached`
- `platform_concurrency_cap_reached`
- `subscription_allowance_exhausted`
- `stars_required`

Reason:

- student and admin UI need clear reason truth

### 6. Support override APIs

Required operations:

- reopen student access
- move student to another slot
- sponsor one exam
- restore subscription allowance
- pause starts for one exam

Each action must:

- validate scope
- write audit
- return updated effective access state

## Service layer changes

### Exam services

Add explicit access resolution helper, for example:

- `resolve_exam_access_runtime(student, exam, now)`

Should produce:

- access mode
- effective window
- effective slot
- hard close policy
- capacity state
- commercial state
- final allow / block decision

### Attempt services

Refactor `start_attempt(...)` to consume the resolved access runtime object instead of performing scattered checks.

### Capacity services

Add a small capacity utility layer:

- slot assignment occupancy
- slot current start occupancy
- current active attempts for exam
- current starts per minute if later needed

## Versioning strategy

Recommended:

- extend current payloads instead of creating a new API version first
- keep `global_window_legacy` fallback behavior during migration

## Delivery order

1. add exam mode fields to serializers
2. centralize runtime resolution
3. enforce slot-start checks at attempt start
4. add support override APIs
5. add audit-backed admin visibility endpoints
