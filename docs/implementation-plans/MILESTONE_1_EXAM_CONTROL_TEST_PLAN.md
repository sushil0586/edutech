# Milestone 1 Exam Control Test Plan

## Goal

Validate slot-managed access, attempt-start timing, capacity enforcement, and support overrides before scale-up.

## Test layers

### 1. Model tests

Validate:

- invalid slot end before start is rejected
- `start_capacity > assignment_capacity` is rejected
- student cannot be assigned to wrong institute / program / cohort
- slot assignment capacity is enforced
- access mode defaults resolve correctly for legacy exams

### 2. Service tests

Validate:

- attempt start inside slot succeeds
- attempt start before slot start fails
- attempt start after slot end plus grace fails
- attempt start respects hard-close policy
- resume does not create new attempt
- resume does not re-consume subscription allowance
- slot start capacity blocks excess starts
- support override changes effective slot

### 3. API tests

Validate:

- slot CRUD endpoints
- student slot override endpoint
- runtime start error codes
- support override actions
- audit entries are written

### 4. E2E tests

Required Playwright flows:

1. Admin creates slot-managed exam
2. Admin assigns students to slot
3. Student sees slot window and starts inside slot
4. Student blocked outside slot
5. Admin moves student to another slot
6. Student starts in new slot
7. Subscription-backed exam starts consume allowance only once

### 5. Load and concurrency tests

Required scenarios:

- 10 concurrent starts
- 50 concurrent starts
- 100 concurrent starts
- 500 concurrent starts

Measure:

- start-attempt latency
- failed starts by reason
- autosave error rate
- submit latency
- DB contention around attempt creation

## Critical regression areas

- existing legacy exam start flow
- resume flow
- section timer flow
- result publication timing assumptions
- subscription allowance consumption rules

## Pilot exit criteria

Pilot-safe only if all are true:

- slot-based blocked reasons are stable
- timer expiry is correct across normal and edge cases
- no duplicate attempt creation under retry conditions
- no double allowance consumption on resume
- admin override actions reliably update runtime behavior

## Scale exit criteria

Scale-safe only if all are true:

- concurrency caps work under load
- synchronized start spikes stay within acceptable latency
- blocked starts are explained cleanly
- no major autosave or submit instability under target load
