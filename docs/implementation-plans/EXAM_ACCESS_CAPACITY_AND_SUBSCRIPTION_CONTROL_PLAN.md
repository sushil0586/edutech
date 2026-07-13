# Exam Access, Capacity, and Subscription Control Plan

## Objective

Make the exam product operationally manageable for pilot and scale by introducing:

- slot-based exam access
- slot capacity control
- attempt-level timer rules
- subscription exam allowance enforcement
- clearer commercial access policy separation
- usage and operations monitoring

This plan is intentionally phased so we can improve scale control without blocking the current pilot path.

## Why This Work Matters

Today the exam system is still centered around a shared exam window model. That creates risk when many students try to enter the same exam at the same time. The product also has a real subscription foundation already, but it does not yet enforce monthly exam allowances like `99 = 4 exams/month`.

The goal of this plan is not only feature expansion. It is to make the product:

- predictable under peak load
- easier to commercialize
- easier to support operationally
- safer to scale from pilot to broader rollout

## Target Outcomes

After this plan is delivered, the platform should support:

- student-wise, batch-wise, and platform-managed exam access slots
- globally or regionally controlled slot capacity
- attempt timers that start from actual attempt start time
- subscription plans that enforce exam quotas per billing period
- clear differentiation between free, star-unlock, subscription-covered, sponsored, and platform-managed exams
- a basic operations view for live exam traffic and quota pressure

## Current Baseline

### What already exists

- exam assignment and exam start flow are working
- economy access rules for exams already support free, stars, entitlement, and mixed access
- student subscriptions already support:
  - plan
  - cycle
  - payment order
  - subscription activation and renewal
  - star crediting
- admin economy workspace is already improved for performance and route-level API efficiency

### Current limitations

- exam access is still effectively tied to a shared exam window
- there is no first-class slot model for students or batches
- there is no enforced slot capacity
- attempt timing is not yet centered on resolved per-student access windows
- subscriptions do not enforce monthly exam consumption rules
- there is no unified operations dashboard for active exam pressure

## Product Model

### Access Model

Each exam should support one of these access modes:

1. `global_window`
Current behavior. Everyone shares the same access timing.

2. `slot_managed`
Students or batches are assigned to one of many access slots.

3. `platform_event_managed`
Platform creates and controls large-scale exam slots centrally.

### Commercial Policy Model

Each exam should resolve to one of these commercial paths:

1. `free`
Student can start directly.

2. `stars_only`
Student must unlock using stars.

3. `subscription_covered`
Student must have an active subscription allowance or exam entitlement.

4. `institute_sponsored`
Institute pays or grants access on behalf of the student.

5. `platform_managed`
Platform controls both access and commercial allowance rules.

6. `mixed_fallback`
Subscription first, then stars, then block if neither is available.

## Phase Plan

## Phase 1: Slot-Based Access Foundation

### Goal

Replace the shared-window dependency with a student-resolved access window model while keeping backward compatibility.

### Scope

- add an `ExamAccessSlot` model
- support linking slots to exams
- support assigning students directly to slots
- support assigning batches or cohorts to slots
- allow exams to continue using current `global_window` mode during migration
- expose slot timing in student exam payloads

### Suggested backend entities

#### `ExamAccessSlot`

- `exam`
- `slot_label`
- `slot_start_at`
- `slot_end_at`
- `capacity_limit`
- `status`
- `metadata`

#### `ExamAccessAssignment`

- `exam`
- `slot`
- `student` nullable
- `cohort` nullable
- `assignment_source`
- `priority`
- `metadata`

### Rules

- a student can resolve to exactly one active slot for a given exam
- if no slot applies, fallback to exam-global window only if the exam is still in legacy mode
- resolved slot should be snapshotted into attempt metadata when the attempt starts

### Deliverables

- migrations
- slot resolution service
- student exam availability payload update
- admin/platform management APIs
- basic admin UI for slot creation and assignment

## Phase 2: Attempt-Level Timer Rules

### Goal

Make the student timer start from actual attempt start time rather than shared exam opening time.

### Scope

- resolve access window before attempt creation
- validate that student starts inside allowed access window
- calculate `expires_at` from:
  - attempt start time
  - exam duration
  - accommodation extra time
  - optional hard final cutoff
- store timing snapshot inside attempt metadata

### Rules

- entering late inside the allowed slot should still work based on configured policy
- reopening an in-progress attempt must not create a second timer
- timer behavior must remain deterministic even if slot configuration changes later

### Deliverables

- updated attempt start service
- updated student attempt detail payload
- migration-safe fallback behavior for legacy exams

## Phase 3: Slot Capacity Control

### Goal

Prevent unlimited concurrency within a slot and make exam start pressure predictable.

### Scope

- define capacity per slot
- track reserved or assigned seats
- track actual started attempts per slot
- block over-assignment or over-capacity starts based on chosen business rule

### Capacity rule options

#### Assignment-cap model

The slot cannot have more assigned students than the configured limit.

#### Start-cap model

The slot can have more assigned students, but only a configured number can actually begin in the active window.

### Recommendation

Use both:

- assignment cap for planning
- start cap for runtime protection

### Deliverables

- slot occupancy service
- over-capacity protection at attempt start
- admin visibility into remaining capacity
- audit trail for blocked starts

## Phase 4: Subscription Exam Allowance System

### Goal

Support plans such as:

- `99 = 4 exams/month`
- `199 = 5 exams/month`
- `299 = 10 exams/month`

with real enforcement at exam start.

### Fit with current subscription architecture

The existing subscription foundation should remain the source of truth for:

- commercial plan definition
- billing cycle
- activation
- renewal
- subscription period boundaries

The new allowance system should extend the current model rather than replace it.

### Recommended model

Keep plan and cycle as they are, and add allowance configuration plus usage tracking.

#### Option A: metadata-only

Store allowance values in cycle metadata.

This is acceptable only for display or early pilot setup, not for final enforcement.

#### Option B: first-class allowance model

Recommended.

##### `SubscriptionExamAllowanceRule`

- `plan_cycle`
- `max_exams_per_period`
- `scope_type`
- `scope_value`
- `allow_fallback_to_stars`
- `metadata`

##### `StudentSubscriptionExamUsage`

- `student_subscription`
- `student`
- `exam`
- `attempt`
- `period_start`
- `period_end`
- `consumed_at`
- `usage_type`
- `metadata`

### Enforcement rules

- consume allowance on successful attempt start
- do not consume again when resuming the same in-progress attempt
- retake consumption should be configurable
- if quota is exhausted:
  - block, or
  - fallback to stars, or
  - bypass if institute-sponsored

### Deliverables

- allowance rule model
- allowance summary service
- exam start quota enforcement
- student-facing remaining allowance display
- admin plan setup UI updates

## Phase 5: Clear Policy Split

### Goal

Make exam access rules easier to reason about commercially and operationally.

### Policy taxonomy

- `free`
- `stars_only`
- `subscription_only`
- `subscription_or_stars`
- `institute_sponsored`
- `platform_managed`

### Recommendation

Do not overload one generic entitlement code for all scenarios. Keep commercial intent explicit in the policy payload and UI.

### Deliverables

- policy type expansion or normalization
- admin policy setup copy and labels
- policy resolution contract used by student exam list and attempt start

## Phase 6: Usage and Operations Dashboard

### Goal

Give operators a live and historical view of exam runtime health.

### Core metrics

- active attempts
- starts per minute
- slot occupancy
- blocked starts by reason
- autosave request rate
- autosave error rate
- submit spike rate
- average attempt start latency
- subscription allowance consumption
- allowance exhaustion counts

### Suggested surfaces

#### Live exam operations view

- active slots
- current starts/minute
- active attempts by exam
- warning states

#### Commercial usage view

- quota consumption by plan
- quota exhaustion by institute
- subscription-covered exam usage trends

### Deliverables

- dashboard summary APIs
- internal admin view
- alert thresholds and runbook references

## Testing Strategy

## 1. Unit Tests

### Slot resolution

- student resolves to direct-assigned slot
- student resolves to batch slot
- direct assignment overrides batch assignment
- no valid slot returns legacy fallback only when enabled
- inactive slot is ignored

### Attempt timer rules

- start inside slot succeeds
- start before slot fails
- start after slot fails
- expires_at uses started_at plus duration
- extra time is applied correctly
- hard cutoff clips expiry correctly

### Capacity logic

- assignment cap blocks excess assignment
- start cap blocks excess runtime starts
- concurrent final-seat attempts do not oversubscribe

### Subscription allowance logic

- active subscription with remaining quota passes
- quota exhausted blocks correctly
- fallback to stars works when configured
- same in-progress attempt does not double-consume
- renewal resets available allowance for next period

### Policy resolution

- free exams bypass commercial checks
- stars-only exams require wallet
- subscription-covered exams require allowance
- institute-sponsored exams bypass student spend path

## 2. Integration Tests

### Core backend workflows

- create slotted exam -> assign student -> start attempt -> verify slot snapshot
- create slot at capacity -> blocked attempt start
- start subscription-covered exam -> usage row created
- quota exhausted -> student blocked or falls back to stars
- platform-managed exam resolves platform slot correctly

### Concurrency-sensitive workflows

- multiple students start in same slot near capacity
- two students compete for final remaining slot start seat
- two starts compete for final remaining subscription allowance seat

## 3. API Contract Tests

### Admin APIs

- create slot
- update slot
- assign students or batches
- fetch slot occupancy
- define subscription allowance rules

### Student APIs

- available exam list returns slot timing
- exam detail returns resolved policy
- attempt start returns correct timer snapshot behavior
- subscription endpoints expose allowance summary

### Ops APIs

- live dashboard metrics
- slot status summary
- quota usage summary

## 4. End-to-End Tests

### Admin and institute workflows

- create exam with slots
- assign batch to slot
- verify student sees assigned window
- verify over-capacity protection

### Student workflows

- start exam inside slot
- blocked outside slot
- resume existing attempt without extra allowance consumption
- quota-covered plan allows exactly configured exam count
- exhausted quota shows correct message

### Platform workflows

- platform exam with multiple slots
- institute cannot overbook unavailable slot capacity

## 5. Performance and Load Testing

### Primary performance checkpoints

- available exam list latency
- exam detail latency
- attempt start latency
- autosave p95 and p99
- submission p95 and p99
- operations dashboard refresh latency

### Load scenarios

- `10` concurrent starts in one slot
- `50` concurrent starts in one slot
- `100` concurrent starts in one slot
- `500` concurrent starts distributed across multiple slots
- burst submission near slot close

### Special race tests

- last seat in slot
- last subscription allowance for period
- autosave burst under 100+ active attempts

## 6. Operational Readiness Testing

- verify alerting on slot saturation
- verify alerting on elevated start failures
- verify dashboard truth during live test run
- verify support flow for slot override and quota override

## Rollout Order

### Recommended order

1. slot-based exam access
2. attempt-level timer rules
3. slot capacity control
4. clear policy split
5. subscription exam allowance system
6. usage and operations dashboard

### Why this order

- phases 1 to 3 reduce scale risk first
- phase 4 clarifies commercial behavior
- phase 5 monetizes the system more safely
- phase 6 improves operational confidence before wider launch

## Pilot Recommendation

### Safe to pilot now if

- concurrency is intentionally limited
- exam times are operationally managed
- platform/global events are supervised
- subscription sales remain simple

### Must-have before larger launch

- slot-based access
- attempt-level timers
- capacity control

### Strongly recommended before commercial scale-up

- subscription exam allowance enforcement
- operations dashboard
- explicit policy split in UI and API contracts

## Suggested Ownership Split

### Backend

- slot models and services
- attempt timing logic
- capacity enforcement
- subscription allowance enforcement
- metrics APIs

### Frontend

- admin slot configuration surfaces
- institute batch assignment flows
- student slot visibility and status
- subscription allowance display
- operations dashboard views

### QA and Performance

- service-level contract tests
- e2e coverage
- concurrency test pack
- slot and quota race-condition validation

## Risks and Design Warnings

- do not implement slot logic only in frontend
- do not rely on plan metadata alone for allowance enforcement
- do not consume quota on page open
- do not let slot configuration changes retroactively alter active attempt timer truth
- do not allow over-capacity race conditions during attempt start

## Recommended Next Step

Convert this plan into execution tickets for:

1. data model changes
2. backend services and API contracts
3. admin and student frontend flows
4. e2e and load test coverage
5. pilot acceptance checklist
