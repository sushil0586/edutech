# Final Exam Access and Platform Manageability Plan

## Current Implementation Status

This document began as the target-state plan. It now also reflects the current build status.

### Completed now

- subscription allowance config per subscription plan cycle
- subscription allowance usage tracking
- subscription allowance enforcement at attempt start
- subscription-aware fallback handling for mixed paths such as `subscription_or_stars`
- student-facing allowance visibility on:
  - dashboard
  - exams list
  - exam detail
  - wallet
  - subscriptions
- admin subscription-plan allowance management UI
- admin student subscription and allowance inspection
- admin support summary for:
  - active quota subscriptions
  - students near exhaustion
  - students exhausted
  - top-used plans

### Partially completed

- commercial policy normalization is partially in place for subscription-backed paths, but not yet fully normalized across every planned access mode
- support operations visibility is partially in place, but deeper observability such as active attempts, starts per minute, autosave pressure, and submission spikes is still pending
- admin manageability is materially improved for subscriptions and scheduling, but broader override tooling is still pending

### Still pending

- long-window threshold engine for public and platform-managed exams
- institute-sponsored and platform-managed commercial flows end to end
- scheduling audit and override tooling
- readiness guardrails for publish and runtime operations
- role-specific operational dashboards beyond the current economy support summaries
- large-scale load testing and production concurrency validation

## Objective

Define one concrete, actionable operating model for exam access, scale control, subscriptions, and product manageability across all major scenarios:

- private institute exams
- public institute exams
- platform-wide public exams
- low-concurrency pilot operation
- high-concurrency production operation
- subscription-backed exam access
- sponsored and platform-managed access

This document is the consolidated final plan built from the earlier planning and prioritization work.

## Final Recommendation

The product should run on a **governed multi-mode exam access architecture** with:

1. institute-type-aware access rules
2. slot-based access for private institutes
3. long-window attempt-based access for public/platform exams
4. capacity thresholds based on runtime concurrency, not just enrollment
5. subscription exam allowance enforcement
6. clear commercial access policy separation
7. audit, guardrails, support overrides, and operational dashboards

## Core Governance Model

## 1. Institute Management Modes

Every institute should resolve to one of these management modes:

### `private_institute_managed`

Used for schools, coaching centers, and timetable-based institutes.

Characteristics:

- short exam windows
- batch and classroom scheduling
- stricter timing
- slot-based concurrency control

### `public_institute_managed`

Used for public/self-serve institutes with broader learner access but still under platform governance.

Characteristics:

- longer access windows allowed
- platform guardrails still apply
- capacity is governed at institute and platform level

### `platform_managed`

Used for fully platform-owned, large-scale, public or cross-institute exams.

Characteristics:

- platform controls event behavior
- long access windows possible
- concurrency thresholds enforced by platform runtime policy

## 2. Exam Access Modes

Every exam should resolve to one of these access modes:

### `global_window_legacy`

Old model. Shared fixed exam window.

Use only for backward compatibility during migration.

### `slot_managed`

Students or batches are assigned to one or more short access slots.

### `long_window_attempt_managed`

Students can begin anytime within a long availability window.

The attempt timer starts only when the student actually starts.

### `platform_event_managed`

Platform controls access, capacity, thresholds, and commercial rules centrally.

## Final Rules by Scenario

## Scenario A: Private Institute Exams

### Final access rule

Use `slot_managed`.

### Window model

- access slot duration: `1 hour` or `2 hours`
- grace period: `20 to 30 minutes` if allowed
- attempt duration: fixed by exam, for example `60 minutes`

### Behavior

- student must start inside assigned slot
- timer starts when student clicks start
- exam expires based on attempt timer
- optional hard close can clip exam if institute requires strict final end

### Threshold model

Use slot-level capacity:

- assignment capacity
- runtime start capacity

Example:

- slot `10:00 AM to 12:00 PM`
- assignment cap: `120`
- runtime start cap: `80`
- grace period: `20 min`

### Best use cases

- school test schedules
- coaching batch exams
- supervised institutional assessments

## Scenario B: Public Institute Exams

### Final access rule

Use `long_window_attempt_managed` or `slot_managed` depending on volume and exam type.

### Window model

For flexible public institute exams:

- access window can be multiple days or weeks
- timer starts only on actual attempt start

For heavier traffic or scheduled events:

- switch to slotted mode

### Threshold model

Do not use just one total threshold for the full window.

Use:

- total eligible students
- daily start limit
- optional hourly start limit
- concurrent active attempt limit

Example:

- access window: `1 Aug to 31 Aug`
- duration: `60 min`
- total eligible students: `10,000`
- daily start limit: `1,000`
- hourly start limit: `150`
- concurrent active attempt cap: `250`

### Best use cases

- self-paced institute-wide mock exams
- non-synchronized competitive preparation exams
- practice-like but time-bound public tests

## Scenario C: Platform-Wide Public Exams

### Final access rule

Use `platform_event_managed`.

### Window model

Can use:

- long access window for flexible public exams
- multiple controlled slots for high-stakes events

### Threshold model

Use 3-layer thresholding:

1. total eligibility
2. rate limit by day or hour
3. concurrent active attempt limit

### Example

- access window: `1 Aug to 31 Aug`
- duration: `60 min`
- eligible users: `50,000`
- daily start cap: `2,000`
- hourly start cap: `250`
- concurrent active attempt cap: `300`

If current active attempts already equal `300`, new starts should:

- queue briefly, or
- be asked to retry, or
- be blocked by strict policy

### Best use cases

- national mock exams
- scholarship discovery tests
- platform-wide public competitive practice events

## Timer Rules

## Final timer policy

The timer should always be based on **attempt start**, not just exam open time.

### Standard behavior

- student starts attempt
- system stores `started_at`
- system calculates `expires_at`
- timer remains fixed for that attempt

### Expiry calculation inputs

- attempt `started_at`
- exam duration
- accommodation extra time
- optional hard final cutoff
- policy-based grace if applicable

### Why this is final recommendation

- fairer for students
- compatible with slots
- compatible with long public windows
- easier to reason about operationally

## Capacity and Threshold Framework

## Private institute threshold framework

Primary control:

- slot assignment cap
- slot runtime start cap

Optional:

- institute concurrent attempt cap

## Public institute threshold framework

Primary control:

- daily start cap
- hourly start cap
- concurrent active attempt cap

Secondary control:

- mandatory slotting above configured student volume

## Platform threshold framework

Primary control:

- global concurrent active attempt cap
- daily start cap
- hourly or per-minute start smoothing

Secondary control:

- region-level cap
- institute-level cap for participating public institutes

## Rule for month-long public windows

Do **not** set one threshold for the entire month.

Set thresholds on:

- starts per day
- starts per hour
- active attempts at once

This is the correct scale-control unit because real load is caused by simultaneous runtime activity, not by total eligibility alone.

## Subscription Model

## Final subscription rule

Subscription plans should support monthly exam allowances with hard backend enforcement.

### Example commercial plans

- `99` -> `4 exams/month`
- `199` -> `5 exams/month`
- `299` -> `10 exams/month`

### Enforcement rule

Consume allowance when a **new attempt starts successfully**.

Do not consume again when:

- student resumes an in-progress attempt

Configurable behavior:

- retake may consume again
- sponsored access may bypass allowance
- fallback to stars may be allowed

### Required implementation approach

Keep existing plan and cycle billing model.

Add:

- allowance rule per plan cycle
- subscription exam usage ledger
- allowance resolution service
- attempt-start allowance enforcement

## Commercial Policy Model

## Final policy set

All exams should resolve into one of these commercial access paths:

### `free`

No payment or quota needed.

### `stars_only`

Student must unlock using stars.

### `subscription_only`

Student must have remaining subscription coverage.

### `subscription_or_stars`

Use subscription first, then stars if allowed and configured.

### `institute_sponsored`

Institute grants or covers access.

### `platform_managed`

Platform decides commercial and runtime behavior centrally.

## Manageability Requirements

These are mandatory if the platform should be manageable from all sides.

## 1. Audit trail

Audit:

- slot changes
- schedule changes
- capacity changes
- overrides
- sponsored access
- subscription allowance changes

## 2. Configuration guardrails

Reject:

- invalid slot windows
- broken assignment states
- impossible capacities
- invalid subscription allowance config
- publish without readiness

## 3. Support override tooling

Operators must be able to:

- move student to another slot
- reopen one student’s access
- sponsor one exam
- restore allowance if consumed incorrectly
- pause starts for an exam in incident conditions

## 4. Role-based operational dashboards

### Platform admin

- system load
- exam event health
- institute pressure
- subscription usage

### Institute admin

- slot fill
- blocked students
- exam readiness

### Teacher

- exam progress
- pending evaluation

### Student

- start time truth
- blocked reason truth
- quota truth

## 5. Observability and alerts

Track:

- attempt-start latency
- autosave failure rate
- submit failure rate
- slot saturation
- blocked starts
- subscription quota exhaustion spikes

## Final Build Order

## Phase 1

Build:

1. slot-based exam access
2. attempt-level timer rules
3. slot capacity control
4. audit trail for scheduling and overrides
5. configuration guardrails
6. support override tools

### Phase 1 status

Largely completed for the current target.

Progress toward this phase:

- slot-managed scheduling implementation is in place
- slot capacity enforcement is in place at attempt start
- attempt-timer architecture has been refactored around actual attempt start
- scheduling audit visibility exists for slot operations
- publish readiness warnings now cover key scheduling risks
- the full override toolkit is still incomplete

Conclusion:

Phase 1 is no longer the main missing architecture block. The remaining work is override depth, long-window observability, and production confidence.

## Phase 2

Build:

1. subscription exam allowance enforcement
2. commercial policy normalization
3. public institute governance rules
4. platform threshold engine for long-window events

### Phase 2 status

Partially completed.

Completed from this phase:

- subscription exam allowance enforcement
- plan-cycle allowance configuration
- allowance usage ledger
- attempt-start quota consumption
- student and admin visibility for subscription allowance state
- runtime threshold controls for long-window and platform-managed access

Still pending from this phase:

- full commercial policy normalization across all planned access paths
- public institute governance rules
- deeper threshold observability for long-window exams

## Phase 3

Build:

1. role-based operations dashboard
2. minimum alerting
3. runtime monitoring summaries
4. support incident workflow polish

### Phase 3 status

Partially completed.

Completed from this phase:

- basic subscription support summaries for admin support operations
- shared runtime summaries for admin, institute, and teacher operations views

Still pending from this phase:

- role-based operational dashboards
- runtime monitoring summaries
- minimum alerting
- incident workflow polish

## Phase 4

Build:

1. notifications
2. reconciliation reporting
3. background job discipline
4. readiness checklist automation
5. data lifecycle and cleanup rules

### Phase 4 status

Not started yet in any meaningful platform-wide way.

## Practical Readiness Summary

### Ready enough now

- pilot usage with controlled concurrency
- subscription-backed exam access for student and admin workflows
- admin commercial management for subscription allowances
- support review of student quota consumption and plan pressure

### Not ready yet for aggressive scale

- synchronized heavy exam traffic across many institutes
- large public exam events
- platform-wide concurrency-sensitive events
- high-confidence operational handling of load spikes

### Highest-priority next build step

Complete the remaining production-confidence layer:

- commercial-path normalization across sponsored and managed flows
- deeper operations telemetry
- browser and load validation for slot and quota races
- timer-start governance
- scheduling and override operations

## Execution Checklist

This section converts the architecture plan into an execution sequence.

### Milestone 1 reference docs

- [Milestone 1 Data Model Plan](/Users/ansh/Documents/Eductech/docs/implementation-plans/MILESTONE_1_EXAM_CONTROL_DATA_MODEL_PLAN.md)
- [Milestone 1 Backend API Plan](/Users/ansh/Documents/Eductech/docs/implementation-plans/MILESTONE_1_EXAM_CONTROL_BACKEND_API_PLAN.md)
- [Milestone 1 Admin UI Plan](/Users/ansh/Documents/Eductech/docs/implementation-plans/MILESTONE_1_EXAM_CONTROL_ADMIN_UI_PLAN.md)
- [Milestone 1 Student Flow Plan](/Users/ansh/Documents/Eductech/docs/implementation-plans/MILESTONE_1_EXAM_CONTROL_STUDENT_FLOW_PLAN.md)
- [Milestone 1 Test Plan](/Users/ansh/Documents/Eductech/docs/implementation-plans/MILESTONE_1_EXAM_CONTROL_TEST_PLAN.md)
- [Milestone 1 Implementation Tickets](/Users/ansh/Documents/Eductech/docs/implementation-plans/MILESTONE_1_EXAM_CONTROL_IMPLEMENTATION_TICKETS.md)

### Milestone 0: Current baseline

Status: completed

Checklist:

- subscription allowance configuration exists
- allowance enforcement exists at attempt start
- student allowance visibility exists
- admin allowance configuration exists
- admin support summary exists for subscription pressure

Outcome:

- the subscription-quota commercial model is usable in controlled pilot conditions

### Milestone 1: Pilot-safe exam control

Status: pending

Checklist:

- add slot entity and slot assignment model
- add private institute slot-based exam access
- move timer to attempt-start based expiry as platform default
- add slot assignment cap
- add slot runtime start cap
- add schedule audit records
- add support override actions for:
  - move student to another slot
  - reopen one student
  - pause starts for an exam

Dependencies:

- milestone 0 only

Pilot gate:

- this milestone must be complete before allowing synchronized multi-class institute exams at higher confidence

### Milestone 2: Public and platform event governance

Status: pending

Checklist:

- add long-window attempt-managed access mode
- add daily start cap
- add hourly or per-minute start cap
- add concurrent active attempt cap
- add threshold policy resolution by institute mode and exam mode
- add public institute governance rules
- add platform event runtime policy hooks

Dependencies:

- milestone 1 timer model

Scale gate:

- this milestone must be complete before large public exams or platform-wide events

### Milestone 3: Commercial policy normalization

Status: partially completed

Checklist:

- normalize all exam access into:
  - `free`
  - `stars_only`
  - `subscription_only`
  - `subscription_or_stars`
  - `institute_sponsored`
  - `platform_managed`
- finish institute-sponsored access flow
- finish platform-managed commercial flow
- define fallback precedence rules explicitly
- add admin restore / correction flow for incorrectly consumed allowance

Already completed:

- subscription-backed paths
- partial mixed-path fallback handling

Dependencies:

- milestone 0 already provides the subscription base

### Milestone 4: Operator manageability

Status: partially completed

Checklist:

- add support dashboard for active attempts
- add starts-per-minute view
- add slot occupancy view
- add blocked start reasons summary
- add autosave and submission pressure metrics
- add institute-level readiness view
- add teacher exam progress summary

Already completed:

- student support wallet / rewards / orders tooling
- student subscription allowance inspection
- subscription pressure summary

Dependencies:

- milestone 1 and milestone 2 provide most of the operational signals

### Milestone 5: Validation and scale-readiness

Status: pending

Checklist:

- add E2E flow for student subscription consumption
- add E2E flow for admin subscription allowance management
- add E2E flow for slot-based exam access
- add load tests for:
  - 10 users
  - 50 users
  - 100 users
  - 500 users
- validate synchronized starts
- validate autosave and submit behavior under load
- define production readiness checklist

Dependencies:

- milestones 1 to 4

### Dependency order

Recommended order:

1. Milestone 1
2. Milestone 3 remaining work that supports pilot operations
3. Milestone 4 minimum operator dashboard
4. Milestone 5 pilot validation
5. Milestone 2 for large public and platform events
6. Milestone 4 deeper observability
7. Milestone 5 scale validation

### Pilot readiness checklist

Pilot can proceed when all of these are true:

- subscription allowance flow works end to end
- admin can inspect student quota usage
- admin can manage subscription allowance config
- exam concurrency is manually controlled
- live public/platform events are limited
- support team can resolve quota confusion and order issues

### Scale readiness checklist

Aggressive scale should wait until all of these are true:

- slot-based access is active for private institutes
- attempt-start timer model is the default
- start-rate and concurrent-attempt caps exist
- support override tooling exists
- operator dashboards expose runtime pressure
- load tests have passed at target concurrency bands

### Suggested ownership split

Platform/backend:

- access modes
- timer rules
- capacity engine
- commercial policy resolution
- observability and summary APIs

Web/admin:

- subscription management UI
- support tooling
- dashboards
- operator workflow polish

QA/performance:

- E2E coverage
- load-test scenarios
- rollout validation

## Pilot Recommendation

## Can pilot now

Yes, if:

- concurrency is controlled
- live exams are supervised
- public/platform large events are not yet aggressively scaled

## Should not scale aggressively yet

Do not run large, heavy public or synchronized exam events until:

- slot control exists
- timer refactor exists
- capacity enforcement exists
- minimum observability exists

## Final threshold recommendation by mode

### Private institutes

- slot assignment cap
- slot runtime start cap
- optional institute concurrency cap

### Public institutes

- daily start cap
- hourly start cap
- active attempt cap

### Platform-wide public exams

- global active attempt cap
- daily start cap
- hourly or per-minute start smoothing
- optional queueing policy

## Default Product Decision Set

These are the concrete defaults I recommend unless business explicitly overrides them.

### Private institute defaults

- access mode: `slot_managed`
- slot length: `1 to 2 hours`
- grace period: `20 to 30 minutes`
- timer: starts on attempt start
- capacity: slot assignment cap + slot runtime cap

### Public institute defaults

- access mode: `long_window_attempt_managed`
- long window allowed for flexible exams
- mandatory slotting above configured load threshold
- timer: starts on attempt start
- capacity: daily + hourly + active attempt caps

### Platform exam defaults

- access mode: `platform_event_managed`
- timer: starts on attempt start
- thresholding: concurrent active attempts + daily/hourly caps
- queue or retry behavior when concurrency is saturated

### Subscription defaults

- consume on new attempt start
- do not re-consume on resume
- retake consumption configurable
- fallback to stars configurable

## Final Summary

The best final model for this product is:

- **private institutes** use short controlled slots
- **public/platform institutes** use long access windows with attempt-based timing
- **capacity is controlled by real runtime thresholds**
- **subscriptions enforce exam usage at attempt start**
- **manageability is supported by audit, guardrails, support tools, dashboards, and alerts**

This is the cleanest model that supports:

- pilot operation
- institute scheduling discipline
- public flexibility
- platform scale control
- commercial clarity
- long-term operational manageability

## Recommended Next Step

Start implementation from the Phase 1 package:

- slot-based access
- timer refactor
- capacity control
- audit
- guardrails
- support overrides

Then implement Phase 2 before scaling public and subscription-heavy production behavior.
