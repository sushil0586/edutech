# App Manageability Gap Plan

## Objective

Identify the additional product and platform changes required to make the application manageable from all sides:

- platform operations
- platform admin
- institute admin
- teacher
- student
- support and incident response
- commercial and subscription operations

This document is complementary to the exam access and subscription control plan. That plan focuses on scale-sensitive exam access and monetization control. This document focuses on the broader manageability layer required to operate the product reliably.

## Core Principle

A product becomes manageable when it is:

- easy to configure correctly
- hard to misconfigure dangerously
- observable during live usage
- recoverable when things go wrong
- auditable after the fact
- understandable to each role without hidden system behavior

## Manageability Categories

## 1. Operational Visibility

### Current gap

Important workflows exist, but there is not yet one clear operational truth surface across exam runtime, access policy behavior, subscriptions, and support incidents.

### Required improvements

#### Platform operations dashboard

Track:

- active attempts
- starts per minute
- autosave traffic
- submission spike rate
- failed attempt starts
- slot occupancy
- quota exhaustion rate
- institute-level active load
- degraded endpoints

#### Institute operations dashboard

Track:

- upcoming exams
- assigned vs unassigned students
- slot fill status
- blocked students by reason
- pending payment or subscription issues
- submission completion progress

#### Teacher operations view

Track:

- exams ready to publish
- live attempt counts
- pending evaluation load
- result readiness

### Outcome

Operators and admins should know what is happening without reading raw logs or asking engineering.

## 2. Auditability and Change History

### Current gap

Critical actions can become difficult to reconstruct later, especially around exam configuration, access overrides, sponsored access, plan updates, and student support exceptions.

### Required improvements

Audit every critical action:

- exam creation and publication
- exam slot creation and changes
- student or batch slot assignment changes
- capacity changes
- policy changes
- subscription plan and allowance changes
- sponsored access grants
- manual unlocks and admin overrides
- timer or schedule edits after assignment

### Recommended audit fields

- actor
- role
- entity type
- entity id
- action
- before snapshot
- after snapshot
- reason or note
- timestamp

### Outcome

Support, finance, and operations can reconstruct what happened without ambiguity.

## 3. Configuration Guardrails

### Current gap

As the product grows more flexible, the risk of invalid or dangerous configuration grows too.

### Required improvements

Prevent invalid setup such as:

- overlapping slots for the same student where not allowed
- exam published with no valid access path
- quota-enabled subscription with no allowance definition
- exam marked subscription-only with no covered subscription rule
- impossible timer configuration
- slot capacity set below already assigned students
- platform event published without monitoring hooks

### Guardrail types

#### Hard validation

Reject clearly invalid configuration.

#### Soft warning

Allow but highlight operational risk.

#### Pre-publish readiness check

Show readiness issues before the exam goes live.

### Outcome

Most preventable problems are stopped before they reach students.

## 4. Support and Recovery Tooling

### Current gap

When a student or institute faces a live issue, operators need safe tools to recover without making direct database edits.

### Required improvements

Support tools for:

- move student to a different slot
- reopen access for one student
- sponsor one student for one exam
- restore mistakenly consumed subscription quota
- manually unlock one exam
- pause new starts for an exam
- extend a slot for one batch or one student
- retry failed post-processing for submission or results

### Required support design rule

Every override should be:

- explicit
- scoped
- time-bounded where possible
- auditable
- reversible if safe

### Outcome

Support can solve real incidents quickly without engineering intervention.

## 5. Notification and Communication Layer

### Current gap

Users often only discover a problem when they open the product at the wrong moment.

### Required improvements

#### Student notifications

- exam slot reminder
- exam opening soon
- subscription quota low
- quota exhausted
- sponsored access granted
- attempt blocked with reason

#### Institute notifications

- slot nearing capacity
- high blocked-start rate
- exam not fully assigned
- payment or subscription action pending

#### Platform notifications

- incident warning
- traffic spike
- route degradation
- unusual failure rate

### Outcome

The system becomes proactive instead of reactive.

## 6. Workflow State Clarity

### Current gap

Complex products become hard to manage when object states are implicit or mixed together.

### Required improvements

Define clear states for:

#### Exams

- draft
- ready
- scheduled
- live
- paused
- completed
- archived

#### Slots

- draft
- scheduled
- open
- full
- closed
- cancelled

#### Subscription plans

- draft
- active
- hidden
- deprecated
- retired

#### Student access

- upcoming
- available
- locked
- sponsored
- quota_exhausted
- missed

### Outcome

Each role can understand current status without reading internal logic.

## 7. Commercial and Usage Reconciliation

### Current gap

As subscriptions, sponsored access, stars, and free exams mix together, the business needs trustworthy reconciliation.

### Required improvements

Track and reconcile:

- free exam starts
- star-unlocked starts
- subscription-covered starts
- institute-sponsored starts
- platform-sponsored starts
- blocked starts by reason
- refunded or restored allowance usage

### Required views

- usage by institute
- usage by plan
- usage by exam type
- quota exhaustion trends
- sponsored access trends

### Outcome

Commercial reporting and product behavior stay aligned.

## 8. Background Processing and Job Discipline

### Current gap

Some work should not happen inside interactive request-response flows, especially when the product is under peak traffic.

### Required improvements

Move these categories toward background processing where appropriate:

- notifications
- analytics aggregation
- dashboard summary materialization
- support export generation
- quota reconciliation tasks
- result post-processing
- periodic cleanup and archival

### Additional needs

- retry strategy
- dead-letter handling
- idempotent jobs
- queue observability

### Outcome

User-facing routes stay faster and operational tasks become safer.

## 9. Observability and Alerting

### Current gap

Without clear metrics and alerts, incidents are discovered late and diagnosed slowly.

### Required improvements

Track:

- API latency by route
- DB query time hotspots
- cache hit or miss quality
- attempt-start failure rate
- autosave error rate
- submit error rate
- payment order failures
- subscription activation failures
- queue backlog
- slot saturation events

### Minimum alert set

- high failed-start rate
- high autosave error rate
- high submission error rate
- slot saturation spike
- degraded exam list latency
- degraded attempt start latency

### Outcome

Engineering and operations know when the platform is drifting before users escalate heavily.

## 10. Role-Based Product Simplification

### Current gap

Manageability drops when each role sees too much flexibility without enough guidance.

### Required improvements

#### Platform admin

Needs breadth, but with grouped governance and ops surfaces.

#### Institute admin

Needs guided workflows, not raw low-level config everywhere.

#### Teacher

Needs exam readiness, assignment status, and result status, not platform complexity.

#### Student

Needs simple truth:

- when can I start
- why can I not start
- how much quota remains
- what should I do next

### Outcome

Each role gets only the depth they need.

## 11. Readiness Checklists and Guided Setup

### Current gap

As features expand, the chance of incomplete launch setup increases.

### Required improvements

Create checklist-driven setup for:

- exam launch readiness
- slot assignment readiness
- subscription launch readiness
- sponsored access readiness
- platform event readiness

### Example readiness checks

- exam has active questions
- access policy is valid
- slot assignments cover expected students
- capacity is configured
- support contact path is known
- metrics are enabled

### Outcome

Admins can self-serve more safely.

## 12. Data Lifecycle and Cleanup

### Current gap

Long-running systems become harder to manage when old live-looking data accumulates without archival rules.

### Required improvements

Define lifecycle and retention for:

- old slots
- finished attempts
- quota usage history
- temporary overrides
- stale pending orders
- expired sponsored access
- archived exams

### Outcome

Operational views stay useful and system complexity stays bounded.

## Prioritized Change List

## Priority 1: Must-have for strong operational manageability

- role-based operational dashboards
- audit trail for critical actions
- configuration guardrails
- support override tooling
- basic observability and alerting

## Priority 2: Strongly recommended before broader commercial scale

- notification system
- workflow state normalization
- commercial usage reconciliation
- background job discipline
- readiness checklists

## Priority 3: Ongoing maturity improvements

- deeper analytics
- automated anomaly detection
- archival automation
- richer support incident tooling

## Suggested Delivery Buckets

## Bucket A: Immediate operational safety

- audit trail
- config guardrails
- support tools
- minimum alerts

## Bucket B: Live operating confidence

- ops dashboards
- role-focused summary screens
- notification triggers

## Bucket C: Commercial and lifecycle maturity

- reconciliation reporting
- background jobs
- readiness checklists
- cleanup and archival policies

## Recommended Next Step

Before starting large implementation work, review this document together with:

- [EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_CONTROL_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_CONTROL_PLAN.md)
- [EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_EXECUTION_TRACKER.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/EXAM_ACCESS_CAPACITY_AND_SUBSCRIPTION_EXECUTION_TRACKER.md)

Then decide what belongs in:

1. pilot-safe immediate work
2. must-have before larger rollout
3. later operational maturity work
