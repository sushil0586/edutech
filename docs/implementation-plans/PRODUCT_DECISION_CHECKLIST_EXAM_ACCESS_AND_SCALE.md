# Product Decision Checklist: Exam Access and Scale

## Purpose

This is the short decision checklist version of the final plan so product and founder-level review can happen quickly.

Primary reference:

- [FINAL_EXAM_ACCESS_AND_PLATFORM_MANAGEABILITY_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/FINAL_EXAM_ACCESS_AND_PLATFORM_MANAGEABILITY_PLAN.md)

## Final Product Decisions

## 1. Institute Types

We will support 3 management modes:

- `private_institute_managed`
- `public_institute_managed`
- `platform_managed`

Decision:

- private institutes get tighter scheduled control
- public institutes get flexible access with platform guardrails
- platform-managed exams are centrally governed

## 2. Private Institute Exam Model

Decision:

- use `slot_managed` access
- slot length: `1 to 2 hours`
- grace period: `20 to 30 minutes`
- timer starts when the student actually starts

Reason:

- keeps institutional discipline
- supports school/coaching schedules
- controls concurrency better

## 3. Public Institute Exam Model

Decision:

- default to `long_window_attempt_managed`
- allow long windows like `days` or `1 month`
- student can start anytime inside the allowed window
- timer starts on actual attempt start

Reason:

- supports public and self-paced usage
- reduces synchronized traffic spikes

## 4. Platform-Wide Public Exam Model

Decision:

- use `platform_event_managed`
- platform controls thresholds and runtime behavior centrally
- can use long window or controlled slots depending on exam type

Reason:

- large public events need platform governance

## 5. Timer Rule

Decision:

- timer is based on `attempt start`, not just exam open time

Reason:

- works for both slots and long windows
- is fairer and operationally cleaner

## 6. Capacity Rule

Decision:

- capacity will be enforced using runtime thresholds, not just total student count

Private institutes:

- slot assignment cap
- slot runtime start cap

Public/platform exams:

- daily start cap
- hourly start cap
- concurrent active attempt cap

Reason:

- real load comes from simultaneous activity, not total enrollment

## 7. Long Window Threshold Rule

Decision:

For a long public exam window like:

- `1 Aug to 31 Aug`
- `60 min exam`

we will **not** use one threshold for the full month.

We will control:

- total eligible students
- starts per day
- starts per hour
- concurrent active attempts

Reason:

- this is the correct load-control model

## 8. Subscription Exam Allowance

Decision:

Plans like:

- `99 = 4 exams/month`
- `199 = 5 exams/month`
- `299 = 10 exams/month`

will be enforced in backend at attempt start.

Rules:

- consume allowance on successful new attempt start
- do not consume again on attempt resume
- retake consumption configurable
- fallback to stars configurable

Reason:

- keeps commercial promise and product behavior aligned

## 9. Commercial Policy Split

Decision:

Exams should resolve into one of these commercial paths:

- `free`
- `stars_only`
- `subscription_only`
- `subscription_or_stars`
- `institute_sponsored`
- `platform_managed`

Reason:

- reduces confusion
- makes support and pricing clearer

## 10. Must-Have Manageability Layer

Decision:

We will not rely only on core exam logic. We also need:

- audit trail
- config guardrails
- support override tools
- role-based dashboards
- minimum observability and alerts

Reason:

- this is what makes the product truly manageable in live operation

## 11. Pilot Decision

Decision:

- controlled pilot can proceed now
- aggressive scale should wait for Phase 1 and minimum observability work

Reason:

- product is usable, but not yet fully scale-safe

## 12. Build Order

Decision:

### Phase 1

- slot-based access
- timer refactor
- capacity control
- audit
- guardrails
- support overrides

### Phase 2

- subscription exam allowance
- policy split normalization
- public/platform governance logic

### Phase 3

- operations dashboard
- alerts
- runtime monitoring

### Phase 4

- notifications
- reconciliation
- background jobs
- readiness automation

## Founder-Level Yes/No Checklist

Confirm these decisions:

- Yes: private institutes use short slots
- Yes: public/platform institutes use long access windows or governed slots
- Yes: timer starts on attempt start
- Yes: thresholds are based on concurrency and start rate
- Yes: subscription exam quotas are enforced at attempt start
- Yes: commercial access types stay explicit
- Yes: audit, guardrails, and support tooling are mandatory
- Yes: pilot now, scale later

## Final Recommendation

Approve this operating model and begin implementation from Phase 1.
