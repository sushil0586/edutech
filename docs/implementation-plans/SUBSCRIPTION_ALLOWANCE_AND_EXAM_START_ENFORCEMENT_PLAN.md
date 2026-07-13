# Subscription Allowance And Exam-Start Enforcement Plan

## Current Build Status

### Completed now

- allowance configuration linked to `SubscriptionPlanCycle`
- `StudentSubscriptionAllowanceUsage` ledger
- allowance resolution service
- attempt-start enforcement with transactional consumption
- `subscription_or_stars` fallback behavior
- student allowance visibility on dashboard, exams list, exam detail, and subscriptions
- admin allowance visibility in plan management, student inspection, and support summaries

### Still pending

- concurrent last-allowance load proof beyond service-level confidence
- richer operator actions such as manual allowance restoration
- broader end-to-end proof for sponsored and managed commercial-path combinations

## Objective

Add a production-safe subscription allowance system so plans like:

- `99` = `4 exams/month`
- `199` = `5 exams/month`
- `299` = `10 exams/month`

can be enforced at exam start without breaking:

- slot-based access
- institute-sponsored exams
- free exams
- star-unlock exams
- public/platform-managed exams

The goal is one clear decision engine before attempt creation.

---

## Product Outcome

Before a student starts an exam, the platform should resolve:

1. whether the student is allowed by slot/window rules
2. whether the exam is free, sponsored, subscription-covered, or payable
3. whether the student has remaining subscription allowance
4. whether the allowance should be consumed on this start
5. what fallback path to show if allowance is exhausted

This keeps monetization, load control, and exam runtime aligned.

---

## Core Product Rules

### Access policy split

Every exam should resolve into one of these commercial paths:

- `free_exam`
- `star_unlock_exam`
- `subscription_covered_exam`
- `subscription_or_stars_exam`
- `institute_sponsored_exam`
- `platform_sponsored_exam`

### Allowance counting rule

Default rule:

- consume allowance only when a new attempt is successfully created

Do not consume allowance when:

- the student is blocked before attempt creation
- the slot is full
- the student is outside the access window
- the exam is sponsored or free

### Retake rule

Recommended first version:

- every fresh attempt consumes allowance

Reason:

- simplest commercial rule
- easier to explain
- avoids hidden loopholes

If needed later, add plan-level retake exemptions as a second-phase feature.

### Sponsored exam bypass

Institute-sponsored and platform-sponsored exams should bypass subscription quota entirely.

This is important because:

- institutes may pay on behalf of learners
- public/platform campaigns should not burn paid student quota

### Subscription period rule

Allowance should be tied to the active billing period of the student subscription.

The decision engine must always resolve:

- active subscription
- current billing window
- used allowance in that window
- remaining allowance

---

## Architecture Change

## 1. Add explicit subscription allowance model

Add a backend allowance configuration linked to `SubscriptionPlanCycle`.

Suggested fields:

- `included_exam_attempts`
- `allowance_period_mode`
- `counting_scope`
- `is_active`
- `metadata`

Suggested enums:

- `allowance_period_mode`
  - `billing_cycle`

- `counting_scope`
  - `all_eligible_exams`
  - `subscription_only_exams`
  - `tag_filtered_exams`

First release should support:

- billing-cycle-based limits
- all eligible subscription-covered exams

---

## 2. Add allowance consumption ledger

Add a durable ledger for quota usage.

Suggested model:

- `StudentSubscriptionAllowanceUsage`

Suggested fields:

- `student_subscription`
- `student`
- `exam`
- `attempt`
- `billing_period_start`
- `billing_period_end`
- `consumed_count`
- `consumed_at`
- `consumption_reason`

This gives:

- auditability
- race-safe counting
- refund/reversal support later if business rules change

---

## 3. Add one exam-start access resolution service

Create a single backend service, conceptually:

- `resolve_exam_start_entitlement(student, exam)`

It should compose:

- slot resolution
- schedule validation
- sponsored access checks
- economy policy checks
- subscription allowance checks
- star fallback checks

Return a normalized decision object like:

- `allowed`
- `decision_type`
- `reason_code`
- `slot_resolution`
- `subscription_resolution`
- `fallback_options`

Example reason codes:

- `allowed_free`
- `allowed_sponsored`
- `allowed_subscription`
- `allowed_star_unlock`
- `blocked_outside_slot`
- `blocked_slot_full`
- `blocked_no_subscription_allowance`
- `blocked_no_unlock_path`

---

## 4. Integrate decision service into attempt creation

Attempt creation should become:

1. resolve slot
2. resolve commercial entitlement
3. enforce slot capacity
4. create attempt transactionally
5. consume subscription allowance only after successful attempt creation

This should happen in one transaction boundary where practical.

Critical requirement:

- no double consumption under concurrent start attempts

---

## Backend Implementation Phases

## Phase A: Data foundation

- add subscription allowance config model
- add allowance usage ledger
- add migrations
- add admin serializers and read APIs

Definition of done:

- plans can define allowance counts per cycle
- allowance config is queryable in backend APIs

## Phase B: Decision engine

- build subscription allowance resolution service
- resolve active billing cycle
- count used allowance in current period
- return remaining allowance and access outcome

Definition of done:

- one backend service gives the full allowance truth

## Phase C: Attempt-start enforcement

- integrate allowance resolution into attempt start
- block when quota is exhausted and no fallback route exists
- support `subscription_or_stars` fallback
- persist ledger row only on successful new attempt creation

Definition of done:

- attempt creation is quota-safe and race-safe

## Phase D: Student and operator visibility

- show remaining quota on exam detail
- show remaining quota on subscriptions page
- show quota usage summary in admin economy/ops surfaces

Definition of done:

- students understand why they are blocked or allowed
- operators can monitor usage pressure

---

## Frontend Changes

## Student surfaces

### Exam detail

Show:

- `Included in your subscription`
- `Remaining subscription exams this cycle: X`
- `This exam will use 1 allowance on start`
- fallback guidance when exhausted

Blocked states:

- `No subscription allowance left`
- `Use stars to unlock`
- `Wait for next billing cycle`

### Subscriptions page

Show:

- active plan
- included exam allowance
- used this cycle
- remaining this cycle
- next reset date

## Admin/operator surfaces

### Subscription plan management

Add allowance fields:

- included exams
- counting scope
- active/inactive state

### Operations dashboard

Add:

- active attempts
- starts per minute
- slot occupancy
- subscription allowance consumption today
- students near quota exhaustion
- top exams consuming allowance

---

## Testing Strategy

## Backend unit tests

- active subscription with remaining allowance
- active subscription with zero allowance
- expired subscription
- sponsored exam bypass
- free exam bypass
- `subscription_or_stars` fallback
- concurrent last-allowance race

## Backend integration tests

- successful attempt consumes one allowance
- blocked attempt consumes none
- retry after block consumes none
- star fallback works when allowance exhausted

## Playwright tests

- student starts subscription-covered exam successfully
- student sees remaining quota decrease
- student blocked after exhausting quota
- sponsored exam does not reduce quota
- subscription-or-stars exam offers fallback path

## Load and concurrency tests

- two concurrent starts for last remaining allowance
- many concurrent starts across multiple subscribed students
- combined slot-capacity plus allowance race

Success condition:

- no duplicate allowance consumption
- no oversubscription of exam starts

---

## Rollout Order

1. backend models and migrations
2. allowance resolution service
3. attempt-start enforcement
4. student messaging
5. admin plan configuration
6. operations dashboard summary

Recommended release posture:

- ship behind a feature flag first
- enable for one internal/demo plan
- validate ledger correctness
- then enable on paid plans

---

## Risks

### 1. Double consumption under concurrency

Mitigation:

- transactional attempt start
- row-level locking or equivalent safe counter strategy

### 2. Confusing overlap with stars and sponsorship

Mitigation:

- one normalized entitlement decision object
- explicit priority rules

### 3. Poor student understanding

Mitigation:

- clear reason codes
- explicit remaining quota display
- reset-date messaging

### 4. Hidden coupling with current subscription models

Mitigation:

- build allowance as a thin layer linked to existing `SubscriptionPlanCycle`
- avoid rewriting broader subscription settlement first

---

## Recommended Scope For Next Sprint

Build only the remaining confidence and operations layer:

- end-to-end browser coverage for success, exhaustion, and fallback paths
- race-focused load checks for last remaining allowance
- operator tooling for allowance correction and support actions

Defer to later:

- advanced counting scopes
- allowance refunds/reversals
- rich ops dashboard analytics
- retake exemptions

---

## Delivery Exit Criteria

- plans can define included exam counts
- student allowance is resolved correctly at exam start
- quota is consumed only on successful new attempts
- exhausted quota blocks subscription-only starts
- subscription-or-stars fallback works
- sponsored exams bypass quota
- admin and student can see remaining quota
- concurrency tests show no double-consumption

---

## Immediate Next Tickets

1. add Playwright lifecycle test for allowance success and exhaustion
2. add Playwright proof for `subscription_or_stars` fallback
3. add concurrency test for the last remaining allowance race
4. add operator correction path for allowance restoration
5. validate sponsored exam bypass under the final normalized commercial taxonomy
