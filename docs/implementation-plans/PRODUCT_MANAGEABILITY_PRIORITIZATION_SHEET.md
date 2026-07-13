# Product Manageability Prioritization Sheet

## Purpose

This sheet compresses the broader planning work into a practical prioritization view:

- what is good enough for pilot now
- what must be built next
- what can wait for later maturity

Primary supporting documents:

- [EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_CONTROL_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_CONTROL_PLAN.md)
- [EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_EXECUTION_TRACKER.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_EXECUTION_TRACKER.md)
- [APP_MANAGEABILITY_GAP_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/APP_MANAGEABILITY_GAP_PLAN.md)

## Executive Summary

### Pilot now

Yes, a controlled pilot is possible now if:

- concurrency is intentionally limited
- exam schedules are manually managed
- platform events are supervised
- commercial subscription behavior stays simple

### Must build next

The highest-value next build set is:

1. slot-based exam access
2. attempt-level timer rules
3. slot capacity control
4. minimum audit trail
5. config guardrails
6. support override tools

### Later maturity

The product becomes truly strong operationally after:

- subscription exam quota enforcement
- operations dashboard
- notifications
- reconciliation reporting
- background jobs and alerting maturity

## Bucket 1: Good Enough For Pilot Now

These capabilities are already sufficient for a controlled pilot if operating carefully.

### Current usable strengths

- core exam creation and start flows exist
- admin economy workspace performance has been improved
- economy policy system exists
- subscription foundation already exists
- student, teacher, institute, and admin flows are broadly usable

### Pilot constraints

Pilot should remain:

- low to moderate concurrency
- manually supervised during important exams
- limited in simultaneous same-time exam starts
- limited in commercial complexity

### Safe pilot operating rules

1. avoid large shared exam spikes
2. stagger important exams manually where possible
3. do not promise large-scale public exam events yet
4. keep subscription selling simple until quota logic is real
5. keep support operators ready during live exams

## Bucket 2: Must Build Next

These are the most valuable changes to improve manageability fast.

## 2.1 Slot-Based Exam Access

### Why now

This is the single biggest control improvement for exam load and student access management.

### Impact

- reduces same-second traffic spikes
- enables controlled scheduling
- supports institute and platform growth

### Priority

`P0`

## 2.2 Attempt-Level Timer Rules

### Why now

Once slots exist, attempt timing must resolve from student start, not only one global opening time.

### Impact

- makes timing fairer
- reduces rush pressure
- supports slot-based access properly

### Priority

`P0`

## 2.3 Slot Capacity Control

### Why now

Without this, slots alone do not fully solve concurrency spikes.

### Impact

- makes concurrency predictable
- prevents oversubscription
- supports real load planning

### Priority

`P0`

## 2.4 Audit Trail For Critical Actions

### Why now

As soon as slot changes, sponsored access, overrides, and subscription behaviors become more complex, traceability becomes essential.

### Impact

- helps support
- helps finance and ops
- reduces ambiguity during incidents

### Priority

`P0`

## 2.5 Configuration Guardrails

### Why now

More flexibility without validation increases operational risk quickly.

### Impact

- prevents bad launches
- prevents invalid slot and policy setups
- reduces support burden

### Priority

`P0`

## 2.6 Support Override Tooling

### Why now

Pilot and early rollout both need recovery tools for live incidents.

### Impact

- allows fast recovery
- reduces engineering dependency
- makes live operations safer

### Priority

`P0`

## Bucket 3: Must Build Before Broader Scale or Paid Complexity

These are not all required before a small pilot, but they should be built before heavier commercialization or larger concurrency.

## 3.1 Subscription Exam Allowance Enforcement

### Why

If plans are sold as `4 exams/month` or similar, the product needs real enforcement, not just displayed plan copy.

### Impact

- supports monetization safely
- prevents commercial confusion
- keeps business and product aligned

### Priority

`P1`

## 3.2 Clear Commercial Policy Split

### Why

The system needs explicit separation between:

- free
- stars
- subscription
- sponsored
- platform-managed

### Impact

- reduces logic ambiguity
- improves supportability
- makes pricing and UX clearer

### Priority

`P1`

## 3.3 Operations Dashboard

### Why

Scale without runtime visibility is risky.

### Impact

- helps live monitoring
- helps incident response
- helps launch readiness

### Priority

`P1`

## 3.4 Minimum Alerting and Observability

### Why

The system should detect degradation before users escalate heavily.

### Impact

- better detection
- faster response
- less blind operation

### Priority

`P1`

## Bucket 4: Later Operational Maturity

These changes make the system excellent, but they do not all need to block the immediate next phase.

## 4.1 Notification System

- exam reminders
- quota warnings
- slot alerts
- incident communication

### Priority

`P2`

## 4.2 Commercial and Usage Reconciliation

- subscription-covered usage
- sponsored usage
- restored usage
- blocked start patterns

### Priority

`P2`

## 4.3 Background Processing Discipline

- analytics jobs
- notifications
- reconciliation
- export generation
- retry and dead-letter handling

### Priority

`P2`

## 4.4 Workflow State Normalization

- clearer lifecycle states for exams, slots, subscriptions, and access objects

### Priority

`P2`

## 4.5 Readiness Checklists and Guided Setup

- pre-publish checks
- slot readiness checks
- subscription launch checks

### Priority

`P2`

## 4.6 Data Lifecycle and Cleanup

- archive stale data
- keep operational views cleaner

### Priority

`P3`

## Recommended Build Sequence

### Step 1

Build:

- slot-based access
- attempt-level timers
- slot capacity control

### Step 2

Add:

- audit trail
- config guardrails
- support override tooling

### Step 3

Add:

- subscription exam quota enforcement
- commercial policy split normalization

### Step 4

Add:

- operations dashboard
- minimum alerting

### Step 5

Add later maturity improvements:

- notifications
- reconciliation
- background job discipline
- readiness checklists

## Recommended Decision Framework

### If the goal is `pilot safely now`

Do not wait for everything.

Proceed with:

- pilot under low concurrency
- careful operational supervision
- build Step 1 and Step 2 next

### If the goal is `start selling subscription exam bundles confidently`

Do not launch that promise until:

- subscription exam quota enforcement is real
- policy split is explicit
- support override path exists

### If the goal is `run larger shared exam events`

Do not scale there until:

- slot-based access exists
- capacity control exists
- observability and dashboard minimums exist

## Minimum Recommended Package Before Larger Rollout

This is the smallest serious “next stage” package:

1. slot-based exam access
2. attempt-level timers
3. slot capacity control
4. audit trail
5. config guardrails
6. support overrides

## Strong Recommended Package Before Commercial Scale-Up

1. subscription exam allowance enforcement
2. explicit commercial policy split
3. ops dashboard
4. minimum alerting

## Best-In-Class Package

1. notifications
2. reconciliation reporting
3. background jobs and retry safety
4. readiness checklists
5. lifecycle cleanup and archival

## Final Recommendation

### Yes for pilot now

with controlled volume and supervision.

### No for aggressive scale yet

until slot access, capacity control, and timing refactor are in place.

### Best next engineering focus

Start immediately with:

`slot access + timer refactor + capacity control + audit + guardrails + support overrides`

That is the strongest improvement package for overall product manageability.
