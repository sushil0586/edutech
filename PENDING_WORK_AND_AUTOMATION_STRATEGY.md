# Pending Work And Automation Strategy

## Purpose

This document turns the current roadmap state into two practical views:

1. what is still genuinely pending
2. what should be automated next for the highest platform leverage

It is meant to reduce drift between:

- architecture plans
- implementation trackers
- day-to-day execution decisions

Related documents:

- [NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md](./NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md)
- [FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md](./FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md)
- [PHASE_6_ANALYTICS_MATURITY_IMPLEMENTATION_PLAN.md](./PHASE_6_ANALYTICS_MATURITY_IMPLEMENTATION_PLAN.md)
- [FUTURE_PROOF_ASSESSMENT_PLATFORM_ARCHITECTURE_MAP.md](./FUTURE_PROOF_ASSESSMENT_PLATFORM_ARCHITECTURE_MAP.md)

---

## Current Position

The platform is no longer blocked by the original P0 safety layer.

The current state is:

- core assessment workflows are usable
- review operations are functional
- analytics foundations are live
- comprehension and rich-content flows exist
- family-aware analytics direction is established

The main remaining work has shifted from:

`platform safety`

to:

`scale, product maturity, expansion, and operational automation`

---

## What Is Still Pending

## 1. Question-Type Capability Engine

This is still one of the most important unfinished architecture layers.

Pending work:

- harden the question-type registry into a true capability engine
- move authoring rules behind registry-driven helpers
- move answer validation behind registry-driven helpers
- move evaluation and scoring dispatch behind registry-driven handlers
- reduce hard-coded type branches in serializers, services, and UI
- make future item families cheaper to add

Why it matters:

- NEET, JEE, UPSC, banking, certification, IELTS, TOEFL, GRE, and GMAT expansion all depend on this

---

## 2. Media-First Assessment Engine

Media-heavy exams are not yet first-class enough.

Pending work:

- stronger response artifact workflows for audio, video, and files
- speaking/listening delivery behavior
- transcript-assisted review flow
- richer media review tooling
- delivery policy integration for media-first item types

Why it matters:

- required for IELTS, TOEFL, PTE, and future speaking/listening products

---

## 3. Review Workflow Maturity

The core queue exists, but product maturity is still incomplete.

Pending work:

- advanced reviewer ergonomics for higher-volume teams
- reviewer drilldowns by question type and assessment family
- stronger moderation presets
- broader release-risk actions from review analytics
- tighter review-to-results operational workflows

Why it matters:

- manual evaluation quality becomes a bottleneck at institute scale before code does

---

## 4. Analytics Maturity

Phase 6 is strong, but not complete.

Pending work:

- expand shared analytics lens across more surfaces
- deepen review-operations analytics with richer historical comparisons
- push question-quality trends into more than the main results workspace
- connect question-quality signals to bank-review workflows
- deepen family-specific analytics beyond the current first-pass workspace implementation
- add more cross-exam and family-level drilldowns

Why it matters:

- this is the layer that turns reporting into decision support

---

## 5. SaaS Governance And Operations

This is the biggest commercial readiness gap.

Pending work:

- audit trails for bulk and operational actions
- feature flags by tenant and assessment family
- usage quotas and storage quotas
- background job visibility
- export and reporting governance
- institute onboarding templates
- observability and operational dashboards
- retention and archival policy

Why it matters:

- this is what makes multi-institute scale safe and supportable

---

## 6. Advanced Assessment Modes

This is intentionally later, but still pending.

Pending work:

- scaled score normalization
- sectional cutoff logic
- hybrid scoring modes
- adaptive or semi-adaptive behaviors
- external evaluator hooks if needed

Why it matters:

- required for GRE/GMAT-style and advanced high-stakes workflows

---

## Best Automation Strategy

The best strategy is:

`automate enforcement, not just convenience`

This means the first automation wave should prevent bad states, preserve consistency, and reduce manual coordination overhead.

Automation should be introduced in this order:

1. quality gates
2. operational workflows
3. product configuration
4. analytics and reporting
5. support and governance

---

## Automation Tracks

## Track A: Developer Quality Automation

This should be the first automation priority.

Automate:

- backend test runs by changed app area
- frontend typecheck and build on every major merge path
- targeted regression suites for results, attempts, question bank, and reviews
- migration validation
- route and API contract checks
- lint and type safety gates

Why first:

- this reduces breakage immediately
- this protects the expanding architecture while item types and analytics grow

Recommended implementation:

- CI pipeline by change scope
- smoke suite for all PRs
- heavier matrix suite on main or nightly
- contract snapshots for critical payloads

---

## Track B: Content Integrity Automation

This should be the first product-facing automation priority.

Automate:

- bulk-upload validation pipelines
- academic mapping checks
- duplicate-question detection
- invalid question-type metadata checks
- broken rich-content or attachment checks
- publish-time exam integrity checks

Why second:

- bad content is the earliest corruption point
- it creates downstream support burden in builder, attempts, results, and analytics

Recommended implementation:

- asynchronous preview/finalize validators
- structured row-level diagnostics
- rule packs by question family
- publish blocker engine driven by explicit validation codes

---

## Track C: Review Operations Automation

This is the highest-value operations automation track.

Automate:

- auto-assignment suggestions by reviewer load
- recheck routing rules
- SLA breach detection
- release-risk escalation alerts
- stale-task reminders
- moderation sampling rules

Why third:

- institute growth will create operational review pressure quickly
- manual review bottlenecks directly delay results and reduce trust

Recommended implementation:

- event-driven review workflow automation
- scheduled jobs for queue sweeps
- rule-based assignment and escalation policies
- notification hooks for reviewer and institute dashboards

---

## Track D: Analytics Automation

This should focus on insight generation, not only charts.

Automate:

- periodic analytics summaries
- family-aware alert generation
- question-quality drift detection
- revision candidate queue generation
- weak-topic clustering
- release-risk summaries by exam and institute

Why fourth:

- analytics become much more valuable once they trigger action without requiring manual inspection first

Recommended implementation:

- scheduled summary builders
- cached analytics snapshots only where query cost justifies them
- rule-driven action queues for bank, review, and intervention workflows

---

## Track E: SaaS Operations Automation

This is the long-term scale automation track.

Automate:

- institute onboarding templates
- tenant defaults bootstrap
- plan and feature entitlement application
- quota tracking and alerts
- audit event recording
- backup, archive, and retention workflows

Why fifth:

- not the first user-visible win
- but critical for safe multi-tenant commercialization

Recommended implementation:

- background jobs
- operational admin dashboards
- event logging standards
- tenant lifecycle automation

---

## What To Automate First

If only one automation wave should start now, it should be:

### Wave 1

- CI quality gates
- regression automation
- content integrity automation
- publish blocker automation

Reason:

- these give the fastest reduction in breakage and support load

### Wave 2

- review queue automation
- release-risk alerts
- stale review reminders
- reviewer load balancing suggestions

Reason:

- this is where institute-scale operations start hurting manually

### Wave 3

- analytics-generated action queues
- question-bank revision automation
- family portfolio summaries
- institute and teacher intervention recommendations

Reason:

- this converts analytics into workflow leverage

### Wave 4

- tenant governance
- quotas
- audit pipelines
- onboarding automation

Reason:

- this is required for SaaS maturity, not just product completeness

---

## Recommended Automation Architecture

Do not automate through page-specific hacks.

Use these layers:

### 1. Domain events

Examples:

- question_created
- bulk_import_finalized
- exam_published
- attempt_submitted
- review_task_stale
- results_published

Use them to trigger:

- validation
- notifications
- analytics refresh
- audit trails

### 2. Rule engines

Use explicit rule evaluators for:

- publish blockers
- review escalation
- question-quality revision candidates
- release-risk classification
- tenant quota warnings

This is better than scattering conditions across views and forms.

### 3. Scheduled jobs

Use jobs for:

- nightly analytics refresh
- stale review detection
- quota sweeps
- cleanup and archival checks
- summary cache refresh

### 4. Action queues

Create queue-style outputs instead of passive metrics.

Examples:

- bank revision queue
- review intervention queue
- release-risk queue
- onboarding follow-up queue

This is where automation becomes operationally useful.

---

## Recommended Next 30 Days

The best near-term automation plan is:

1. add CI and scoped regression automation
2. automate content and publish integrity checks more aggressively
3. automate review queue escalations and stale-task detection
4. create analytics-generated action queues for question revision and release risk

This order gives:

- immediate stability
- lower support burden
- faster institute operations
- better leverage from the analytics work already completed

---

## What Not To Automate First

Avoid starting with:

- adaptive testing logic
- AI-heavy scoring shortcuts for core result flows
- complex snapshot systems before performance requires them
- deep psychometric automation
- large multi-service decomposition

Reason:

- these increase complexity before the current workflow engines are fully hardened and operationalized

---

## High-Level Recommendation

The best automation strategy for this platform is:

`quality-gated modular automation inside the monolith`

In plain terms:

- automate correctness first
- automate workflow pressure second
- automate insight-to-action third
- automate SaaS governance fourth

That path matches the architecture already in place and gives the highest return without forcing a platform rewrite.
