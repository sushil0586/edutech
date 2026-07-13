# Exam Access, Capacity, and Subscription Execution Tracker

## Purpose

This tracker converts the broader planning document into concrete implementation workstreams.

Primary reference:

- [EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_CONTROL_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_CONTROL_PLAN.md)

## Delivery Approach

Work should be delivered in this order:

1. finish slot-management polish and operator override depth
2. complete commercial policy normalization across all managed paths
3. deepen live operations telemetry and actionability
4. expand browser coverage for slot and quota workflows
5. run controlled load and concurrency validation

## Current Status Snapshot

### Completed

- slot-based exam access data model and migration path
- slot resolution and student assignment support
- attempt start validation against resolved slot or long-window runtime
- attempt-level timer behavior with attempt-based expiry
- slot runtime start-cap enforcement inside attempt-start transaction
- runtime threshold enforcement for long-window and platform-managed modes
- subscription allowance config on plan cycles
- subscription allowance usage ledger
- subscription allowance resolution and attempt-start consumption
- student-facing subscription allowance visibility
- admin subscription allowance support summaries
- slot audit logging
- bulk slot assignment and auto-distribution
- preview tooling for slot assignment plans, including current-to-projected occupancy

### Partially completed

- commercial policy normalization across every planned path and label
- support override tooling beyond current slot reassignment and audit visibility
- live operations telemetry beyond current support and runtime summaries
- browser-based end-to-end confidence for all slot and subscription branches

### Still pending

- richer platform/public threshold observability such as starts per minute and submission spikes
- explicit manual support actions like allowance restoration and exam-level pause controls
- race-focused load validation at 10, 50, 100, and 500 concurrent starts
- broader commercial-path proof for institute-sponsored and platform-managed scenarios

## Milestone Summary

### Milestone 1

`Slot-aware exam access works end-to-end`

Status: largely complete

### Milestone 2

`Attempt timing is student-resolved and slot-safe`

Status: complete for current architecture target

### Milestone 3

`Slot capacity is enforceable and race-safe`

Status: backend-complete, broader concurrency proof still pending

### Milestone 4

`Commercial exam access is explicit and manageable`

Status: partially complete

### Milestone 5

`Subscription plans enforce exam usage limits`

Status: complete for first release scope

### Milestone 6

`Operations can observe and support live exam activity`

Status: partially complete

## Workstream A: Backend Foundation

## A1. Slot-Based Access Models

### Tickets

1. Add `ExamAccessSlot` model
2. Add `ExamAccessAssignment` model
3. Add slot status, timing, capacity, and metadata fields
4. Add indexes for exam, slot window, status, and assignment lookup
5. Add backward-compatible migration path for legacy global-window exams

### Acceptance criteria

- an exam can have zero or more slots
- a student can resolve to an active slot through direct or batch assignment
- legacy exams continue to work without slots

### Suggested file areas

- `edutech_backend/apps/exams/models.py`
- `edutech_backend/apps/exams/migrations/`

## A2. Slot Resolution Service

### Tickets

1. Build `resolve_student_exam_slot(student, exam)`
2. Support direct student assignment override
3. Support cohort or batch-based assignment
4. Return normalized slot resolution payload
5. Add fallback behavior for legacy exam mode

### Acceptance criteria

- direct assignment wins over batch assignment
- inactive or expired slots are ignored
- service returns deterministic resolved access data

### Suggested file areas

- `edutech_backend/apps/exams/services.py`

## A3. Student Availability Contract

### Tickets

1. Update available-exam serializer to expose resolved slot timing
2. Update exam detail serializer to expose access mode and slot window
3. Add access status values:
   - `upcoming`
   - `available_now`
   - `missed`
   - `locked`
   - `quota_exhausted`
4. Keep legacy payload compatibility where required

### Acceptance criteria

- student exam list shows slot-specific truth
- frontend can render exact allowed access window

### Suggested file areas

- `edutech_backend/apps/exams/serializers/__init__.py`

## Workstream B: Attempt Timing and Runtime Enforcement

## B1. Attempt Start Refactor

### Tickets

1. Resolve slot before attempt creation
2. Validate attempt start against resolved slot window
3. Replace global-only timing assumption with resolved timing
4. Snapshot slot and timing data into attempt metadata
5. Preserve behavior for in-progress attempt resume

### Acceptance criteria

- student can start only inside valid access window
- attempt metadata stores timing snapshot
- timer does not change if slot config changes later

### Suggested file areas

- `edutech_backend/apps/attempts/services.py`

## B2. Attempt Expiry Calculation

### Tickets

1. Refactor expiry calculation to use:
   - started time
   - duration
   - accommodation extra time
   - optional hard cutoff
2. Add support for “late start allowed inside slot”
3. Document and centralize timer policy

### Acceptance criteria

- expiry is deterministic
- accommodation time still works
- optional hard close can clip attempt expiry

### Suggested file areas

- `edutech_backend/apps/attempts/services.py`

## Workstream C: Slot Capacity Control

## C1. Capacity Data and Counters

### Tickets

1. Add slot capacity fields
2. Define assignment cap and runtime start cap behavior
3. Add slot occupancy summary service
4. Track active attempts by slot

### Acceptance criteria

- remaining capacity is queryable
- active slot occupancy can be calculated accurately

### Suggested file areas

- `edutech_backend/apps/exams/models.py`
- `edutech_backend/apps/exams/services.py`

## C2. Capacity Enforcement at Runtime

### Tickets

1. Enforce slot capacity during attempt start transaction
2. Prevent oversubscription under concurrent starts
3. Record blocked-start reason for support visibility

### Acceptance criteria

- no race allows capacity overrun
- blocked student gets deterministic error message

### Suggested file areas

- `edutech_backend/apps/attempts/services.py`

## Workstream D: Commercial Policy Normalization

## D1. Policy Model Review

### Tickets

1. Review existing access policy types and entitlement semantics
2. Define canonical exam commercial policy taxonomy
3. Normalize naming in API payloads and admin forms
4. Preserve backward compatibility for existing economy rules

### Target policy set

- `free`
- `stars_only`
- `subscription_only`
- `subscription_or_stars`
- `institute_sponsored`
- `platform_managed`

### Acceptance criteria

- policy meaning is clear in both backend and UI
- student-facing messages reflect actual access rule

### Suggested file areas

- `edutech_backend/apps/economy/models.py`
- `edutech_backend/apps/economy/services.py`
- `edutech_backend/apps/exams/services.py`

## D2. Sponsored and Managed Access Flows

### Tickets

1. Define institute-sponsored bypass path
2. Define platform-managed event access path
3. Ensure commercial path resolves before attempt start

### Acceptance criteria

- sponsored exams bypass student-spend path correctly
- platform-managed exams remain controlled centrally

## Workstream E: Subscription Exam Allowance

## E1. Subscription Allowance Configuration

### Tickets

1. Add `SubscriptionExamAllowanceRule` model or equivalent first-class structure
2. Link allowance rule to `SubscriptionPlanCycle`
3. Support scope definition for which exams count toward quota
4. Support fallback-to-stars flag

### Acceptance criteria

- a cycle can define `4`, `5`, `10`, or custom exam allowance
- rule can target only specific exam classes if needed

### Suggested file areas

- `edutech_backend/apps/economy/models.py`
- `edutech_backend/apps/economy/migrations/`

## E2. Subscription Usage Ledger

### Tickets

1. Add `StudentSubscriptionExamUsage` model
2. Record one usage per allowed consumption event
3. Store:
   - subscription
   - student
   - exam
   - attempt
   - period start
   - period end
   - consumed time
4. Add unique/race-safe protection to stop double-consumption

### Acceptance criteria

- in-progress resume does not consume twice
- usage rows support audit and analytics

### Suggested file areas

- `edutech_backend/apps/economy/models.py`

## E3. Allowance Resolution Service

### Tickets

1. Build `resolve_student_exam_subscription_allowance(student, exam)`
2. Detect active subscription in current billing period
3. Compute used and remaining quota
4. Return fallback options if quota is exhausted

### Acceptance criteria

- service returns a single source of truth for allowance status
- inactive or expired subscriptions do not count

### Suggested file areas

- `edutech_backend/apps/economy/services.py`

## E4. Exam Start Quota Enforcement

### Tickets

1. Integrate allowance resolution into attempt start flow
2. Consume quota only on successful new attempt start
3. Support fallback to stars where configured
4. Return actionable student-facing error messages

### Acceptance criteria

- quota-covered exam start succeeds only when remaining allowance exists
- fallback path behaves according to configured plan policy

### Suggested file areas

- `edutech_backend/apps/attempts/services.py`
- `edutech_backend/apps/exams/services.py`
- `edutech_backend/apps/economy/services.py`

## Workstream F: Admin and Student Frontend

## F1. Admin Slot Management UI

### Tickets

1. Add slot creation and edit flow
2. Add student/batch assignment UI
3. Add slot occupancy and capacity visibility
4. Show warnings for full or near-full slots

### Acceptance criteria

- admin can create and manage slots without manual backend edits
- admin can understand slot pressure quickly

### Suggested file areas

- `edutech_web/src/app/(admin)/`
- `edutech_web/src/components/admin/`

## F2. Student Exam Visibility Updates

### Tickets

1. Show assigned slot and exact access window
2. Show clear start-state messaging
3. Show blocked reasons:
   - outside slot
   - capacity reached
   - quota exhausted
   - locked by policy
4. Show remaining subscription exam allowance where relevant

### Acceptance criteria

- student understands when the exam is available
- student understands why access is blocked

### Suggested file areas

- `edutech_web/src/app/(student)/`
- `edutech_web/src/components/ui/`

## F3. Subscription Plan UX Enhancements

### Tickets

1. Surface allowance benefits in student subscriptions page
2. Show current remaining exam quota for active plans
3. Show commercial comparison:
   - stars
   - subscription
   - sponsored access
4. Add admin plan configuration support for allowance rules

### Acceptance criteria

- plan value is visible before purchase
- student can see remaining covered exams this period

### Suggested file areas

- `edutech_web/src/app/(student)/app/subscriptions/page.tsx`
- `edutech_web/src/components/admin/economy-subscription-plan-management-card.tsx`

## Workstream G: Operations Dashboard

## G1. Metrics APIs

### Tickets

1. Build summary API for:
   - active attempts
   - starts per minute
   - slot occupancy
   - blocked starts
   - autosave volume
   - submit volume
   - subscription usage
2. Add range filters and exam filters

### Acceptance criteria

- operators can fetch current and recent operational summary

### Suggested file areas

- `edutech_backend/apps/reports/`
- or new `ops` / `monitoring` service area if preferred

## G2. Admin Operations View

### Tickets

1. Add admin dashboard section for live exam operations
2. Add cards for slot pressure and attempt pressure
3. Add summary for subscription quota usage
4. Add support status and manual action hints

### Acceptance criteria

- operator can identify stress points quickly
- operator can distinguish slot saturation from quota exhaustion

### Suggested file areas

- `edutech_web/src/app/(admin)/admin/`
- `edutech_web/src/components/admin/`

## Workstream H: QA and Testing

## H1. Unit Test Pack

### Tickets

1. slot resolution tests
2. timing calculation tests
3. capacity enforcement tests
4. subscription allowance tests
5. policy resolution tests

### Acceptance criteria

- all critical branching logic is covered at service level

## H2. Integration Test Pack

### Tickets

1. slotted exam creation to start flow
2. slot full blocking flow
3. subscription-covered attempt flow
4. allowance exhaustion flow
5. platform-managed slot flow

### Suggested file areas

- `edutech_backend/apps/*/tests/`

## H3. E2E Browser Coverage

### Tickets

1. admin slot creation workflow
2. student slot-based attempt workflow
3. blocked outside-slot workflow
4. quota consumption and exhaustion workflow
5. admin operations dashboard smoke coverage

### Suggested file areas

- `edutech_web/tests/e2e/workflow/`

## H4. Load and Concurrency Validation

### Tickets

1. test 10 concurrent starts in a slot
2. test 50 concurrent starts in a slot
3. test 100 concurrent starts in a slot
4. test 500 concurrent starts distributed across slots
5. race test for last seat in slot
6. race test for last subscription allowance in period
7. autosave burst test
8. submit spike test

### Acceptance criteria

- no slot oversubscription under concurrent load
- no double-consumption of quota under concurrent load
- p95 and p99 start times remain acceptable under controlled scenarios

## Pilot Signoff Checklist

### Required before expanded pilot

- slot-based access foundation complete
- attempt timing refactor complete
- slot capacity enforcement complete
- critical service tests passing
- minimum e2e flows passing

Current read:

- first four items are in good shape
- minimum e2e flow coverage is still not broad enough for final signoff

### Required before paid subscription launch for exam quotas

- subscription allowance models complete
- allowance enforcement complete
- student-facing quota display complete
- quota edge cases tested

Current read:

- this block is materially complete for first-release quota behavior
- remaining work is confidence expansion, not core feature absence

### Required before larger production exam events

- operations dashboard minimum viable view complete
- load validation complete
- support runbook updated

Current read:

- minimum viable operations visibility exists, but deeper event telemetry is pending
- load validation remains the largest open production-readiness gap

## Suggested Ticket Grouping by Sprint

### Sprint 1

- A1
- A2
- A3

### Sprint 2

- B1
- B2
- F2 initial student visibility

### Sprint 3

- C1
- C2
- F1 admin slot management

### Sprint 4

- D1
- D2
- E1
- E2

### Sprint 5

- E3
- E4
- F3 subscription UX

### Sprint 6

- G1
- G2
- H4 scale validation

## Open Decisions

These need explicit product confirmation during execution:

1. Does retaking the same exam consume additional subscription allowance?
2. Should late start inside slot always grant full duration, or clip at hard close?
3. Should slot capacity block assignment, start, or both?
4. Should sponsored exams bypass subscription limits completely?
5. Should platform exams allow student self-booking, institute-booking, or only system allocation?

## Recommended Next Step

Create implementation tickets from:

- `A1` to `B2` first

That gives the strongest reduction in scale and access risk before commercial quota work begins.
