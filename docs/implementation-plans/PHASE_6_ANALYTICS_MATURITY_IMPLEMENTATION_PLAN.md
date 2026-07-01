# Phase 6 Analytics Maturity Implementation Plan

## Purpose

This document turns Phase 6 from a high-level roadmap item into an execution-ready analytics plan.

It defines:

- what Phase 6 should cover
- which analytics engines belong in this phase
- how the backend and frontend should evolve
- what order reduces rework
- what "done" should mean before moving to later platform phases

Related documents:

- [FUTURE_PROOF_ASSESSMENT_PLATFORM_ARCHITECTURE_MAP.md](/Users/ansh/Documents/Eductech/docs/architecture-product/FUTURE_PROOF_ASSESSMENT_PLATFORM_ARCHITECTURE_MAP.md)
- [FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md](/Users/ansh/Documents/Eductech/docs/architecture-product/FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md)
- [NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md](./NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md)
- [NEXT_IMPLEMENTATION_ROADMAP.md](./NEXT_IMPLEMENTATION_ROADMAP.md)

---

## Phase 6 Goal

Move the platform from summary-style reporting into a multi-lens decision-support engine.

The outcome should be:

- teachers can intervene faster
- institutes can detect quality and review bottlenecks
- question banks improve from outcome evidence
- every assessment family gets a meaningful analytics lens

The execution principle is:

`analytics should drive action, not just display numbers`

---

## High-Level Coverage

Phase 6 will cover five analytics layers.

### 1. Cohort Performance Analytics

This layer answers:

- how an exam performed overall
- which sections or topics are weak
- how learners are distributed by score, pass state, and completion behavior

Core outputs:

- score distribution
- pass/fail spread
- section performance
- topic performance
- cohort outlier detection

### 2. Review Operations Analytics

This layer answers:

- how much manual-review workload exists
- which reviewers are overloaded
- how long review is taking
- where publication is blocked by review backlog

Core outputs:

- pending review volume
- assigned vs unclaimed work
- reviewer turnaround time
- recheck and moderation rate
- blocked-results pressure

### 3. Question Quality Analytics

This layer answers:

- which questions are too easy, too hard, or too often skipped
- which distractors are weak
- which questions trigger confusion or quality concerns
- where question-bank revision should happen next

Core outputs:

- hardness and skip analysis
- distractor quality signals
- low-discrimination or low-value question flags
- question revision backlog candidates

### 4. Family-Specific Analytics

This layer answers different things depending on assessment family.

Examples:

- `school`: chapter mastery, teaching intervention groups, curriculum coverage
- `competitive`: speed vs accuracy, skip pressure, rank readiness, negative-marking behavior
- `certification`: domain readiness, scenario accuracy, skill coverage by domain
- `language_proficiency`: skill-band progression, rubric criterion weakness, media-backed response quality

### 5. Executive and Operational Analytics

This layer answers:

- which institutes are healthy
- where setup, review, or exam quality is weak
- how usage changes over time
- which premium analytics are worth productizing later

Core outputs:

- readiness summary
- institute-wide exam family mix
- review bottleneck summary
- question-bank quality trend
- usage and cohort growth trend

---

## What Phase 6 Will Not Cover

To keep scope controlled, this phase should not absorb later platform concerns.

Out of scope:

- adaptive testing logic
- scaled-score normalization engines
- deep psychometrics
- external BI pipeline work
- feature-flag or quota governance
- separate reporting microservices

Those belong to later phases.

---

## Architecture Position

Phase 6 should stay inside the modular monolith.

### Primary backend owners

`apps/results`

- analytics aggregations
- score distributions
- question quality builders
- family-aware analytics adapters

`apps/attempts`

- attempt timing and completion behavior
- integrity and stall patterns
- response-activity signals

`apps/exams`

- section structure
- exam context
- exam experience profile

`apps/question_bank`

- question metadata
- topic, subject, type, difficulty, passage grouping
- revision-target linkage later

`apps/accounts`

- reviewer and teacher scope
- dashboard-level summary endpoints

### Frontend owners

`src/features/results-workspace`

- main multi-lens analytics workspace
- family-aware drilldowns

`src/app/(teacher)/teacher/dashboard`

- teacher intervention snapshot

`src/app/(institute)/institute/dashboard`

- institute readiness and operational analytics

`src/app/(teacher)/teacher/results/*`
`src/app/(institute)/institute/results/*`

- deeper view-by-view analytics surfaces

---

## Required Analytics Contracts

Phase 6 should standardize analytics around explicit contracts instead of page-specific ad hoc payloads.

### 1. Exam Analytics Summary

Should include:

- exam identity
- experience profile
- attempts total
- evaluated total
- pass/fail counts
- average score
- score distribution buckets
- section summary
- topic summary
- review blocker summary

### 2. Review Operations Summary

Should include:

- pending tasks
- assigned tasks
- in-review tasks
- recheck tasks
- moderated tasks
- blocked exams
- reviewer throughput
- median turnaround

### 3. Question Quality Summary

Should include:

- attempts
- correct/wrong/skipped counts
- marked-for-review count
- optional distractor breakdown
- hardness status
- revision recommendation flags
- topic and subject mapping

### 4. Family Lens Summary

Should include:

- assessment family code and label
- primary lenses
- recommended dashboard emphasis
- interpretation helpers
- family-specific metric highlights

### 5. Student Intervention Summary

Should include:

- low-performing students
- skipped-heavy students
- slow-but-accurate students
- fast-but-error-prone students
- manual-review-heavy learners

---

## Frontend Experience Plan

Phase 6 should organize analytics in a way that mirrors how users actually investigate problems.

### Teacher flow

1. Which exam needs attention?
2. Which section/topic is weak?
3. Which learners are affected?
4. Which questions caused the issue?
5. What action should I take now?

### Institute flow

1. Which institute area is unhealthy?
2. Is the problem setup, review, question quality, or delivery?
3. Is it isolated or repeated across exams/programs?
4. Which team should act?

### Required UX principles

- every analytics block should suggest an action
- family-aware language should change how data is interpreted
- avoid one giant page of cards with no narrative
- let users move from summary to evidence without losing context

---

## Implementation Streams

## Stream A: Shared Analytics Lens Layer

### Goal

Create reusable analytics interpretation helpers for each assessment family.

### Includes

- family lens summary resolver
- family-to-primary-metrics mapping
- family-specific recommendation copy
- analytics preset fallback strategy

### Why first

This avoids duplicating family-specific copy and logic across dashboards and results pages.

---

## Stream B: Score and Cohort Distribution Engine

### Goal

Add true performance distribution views instead of only averages.

### Includes

- score buckets
- pass/fail band counts
- section score comparison
- topic strength ranking
- cohort outlier markers

### Primary value

Averages hide spread. Distribution surfaces make intervention real.

---

## Stream C: Review Operations Analytics

### Goal

Turn review from queue presence into measurable workflow health.

### Includes

- pending by exam
- pending by reviewer
- unclaimed vs claimed
- recheck rate
- moderation rate
- turnaround timing

### Primary value

Institutes can see when review operations threaten result timelines.

---

## Stream D: Question Quality Feedback Loop

### Goal

Convert analytics into question-bank improvement actions.

### Includes

- hard question flags
- skipped-often flags
- weak distractor indicators
- question revision queue candidates
- family-aware bank guidance

### Primary value

The bank improves from real evidence, not just editorial intuition.

---

## Stream E: Family-Specific Deep Dives

### Goal

Give each assessment family at least one specialized analytics view.

### Includes

`school`

- chapter mastery
- intervention grouping
- curriculum balance

`competitive`

- speed vs accuracy
- skip pressure
- rank readiness

`certification`

- domain readiness
- scenario performance
- objective coverage

`language_proficiency`

- skill bands
- rubric weakness
- media response patterns

---

## Recommended Delivery Order

Phase 6 should be delivered in four slices.

### Slice 1: Shared Lens + Distribution Foundation

Build first:

- family analytics lens resolver
- score distribution buckets
- section/topic summary normalization
- shared frontend cards for distribution and lens guidance

Reason:

This gives immediate value and becomes the base layer for all later analytics views.

### Slice 2: Review Operations Analytics

Build next:

- reviewer workload cards
- turnaround timing
- blocked-result pressure
- review backlog drilldowns

Reason:

This is the biggest operational analytics gap after the current results workspace.

### Slice 3: Question Quality Engine

Build next:

- question quality scoring
- distractor signals
- revision candidate tagging
- family-aware bank recommendations

Reason:

This closes the loop between outcomes and content quality.

### Slice 4: Family-Specific Deep Dives

Build last in Phase 6:

- competitive lens enhancements
- certification domain views
- language skill-band/rubric summaries
- school mastery/intervention views

Reason:

These views become more stable once the shared contracts are already in place.

---

## Recommended First Build

The best first implementation slice for Phase 6 is:

`Shared Lens + Distribution Foundation`

### Why this should go first

- it benefits every exam family
- it improves both teacher and institute analytics immediately
- it is lower risk than jumping directly into specialized charts
- it creates reusable contracts for later review and bank-quality analytics

### Concrete first deliverables

- add score distribution buckets to exam analytics responses
- add section summary blocks where missing
- normalize topic-strength response shapes
- add reusable family-lens cards for teacher and institute analytics pages
- expose one distribution visualization in the results workspace

### Current progress

Slice 1 is complete and Slice 2 has started on the live review-workflow surfaces.

Completed in Slice 1:

- exam performance summaries now store score-distribution buckets in summary metadata
- exam performance summaries now store section-level performance rollups in summary metadata
- teacher result summary payloads now expose score distribution, section performance, and experience profile together
- teacher and institute results workspaces now render the first distribution and section-performance views from this shared contract
- teacher insight summaries now also reuse the shared distribution and section contract for dashboard analytics
- teacher dashboard now surfaces cohort score bands, weakest-section signals, and section-pressure highlights from the shared analytics foundation
- institute dashboard summary payloads now expose recent exam analytics, aggregate score bands, and section watchlist inputs
- institute dashboard now surfaces score distribution, weak-section watchlist, and recent exam analytics from the same shared summary contract

Remaining after Slice 1:

- normalize section/topic summary payloads across more analytics endpoints
- introduce one reusable distribution component instead of page-local rendering
- deepen institute and teacher drill-down analytics in later Phase 6 slices

Completed in the first Slice 2 pass:

- review queue summary payloads now expose recheck pressure, blocked-exam counts, average turnaround, slowest turnaround, oldest-open age, and backlog aging buckets
- reviewer workload rows now include unresolved counts, recheck counts, oldest open age, and average turnaround
- exam hotspot rows now include recheck counts and oldest-open age
- institute review workspace now surfaces turnaround, backlog aging, blocked exam pressure, reviewer load, and exam hotspot analytics
- teacher review workspace now surfaces personal queue aging, recheck pressure, and exam hotspot analytics from the same summary contract
- review queue summaries now also expose 24-hour throughput trend comparisons and release-risk rollups by exam
- institute and teacher review workspaces now surface queue trend and release-risk visibility from that same review summary layer
- exam performance summary payloads now expose release-risk metadata derived from review backlog age and recheck pressure
- teacher and institute results workspaces now surface release-risk cues directly inside the publication workflow and result readiness lanes

Completed in Slice 3:

- question-analysis payloads now expose question quality signals, revision priority, and action-oriented editorial notes
- question-analysis summaries now expose revision-candidate totals, urgent-fix counts, top revision topics, and top revision questions
- question-analysis payloads now expose distractor-level signals such as untested, weak, strong, and keyed-answer review states
- question-analysis payloads now expose revision reasons per question so bank editors can move directly from evidence to action
- teacher and institute results workspaces now surface bank action queues, distractor quality boards, and per-question distractor evidence cards

Completed in the first Slice 4 pass:

- results workspace analysis now renders family-specific deep-dive panels for school, competitive, certification, and language-proficiency families
- the deep-dive layer now interprets the same analytics contract differently by family instead of relying only on generic summary cards
- each family now gets tailored intervention cues and next-step action guidance directly inside the analysis workspace
- the overview workspace now adds a cross-exam family portfolio summary so institutes and teachers can compare family pressure, readiness, and review risk across multiple exams

Still remaining inside Slice 2:

- deepen trend comparison beyond the current 24-hour window and move toward multi-window history
- expand release-risk signals into more result summary actions and list-level triage views
- add reviewer performance drilldowns by question type or assessment family

Still remaining after Slice 3:

- expand question-quality trends across more analytics surfaces instead of keeping them only in the main results workspace
- connect question-quality recommendations to future bank-review workflow actions and assignment queues
- deepen family-specific interpretation of distractor and revision signals further, especially through dedicated family dashboards and cross-exam comparisons

---

## Data Additions Likely Needed

These additions are reasonable for Phase 6 and should stay evolutionary.

### Backend payload additions

- score bucket arrays on exam summary payloads
- section performance arrays
- reviewer throughput summary
- question quality flags
- optional family-preset interpretation metadata

### Possible later model additions

- cached analytics snapshot tables if performance becomes an issue
- question quality status fields
- review throughput aggregates

Do not add snapshot tables unless query cost actually justifies them.

---

## Testing Plan

Phase 6 must be treated as logic-heavy, not cosmetic.

### Backend tests

- analytics payload contract tests
- family-lens resolver tests
- score bucket calculation tests
- review turnaround aggregation tests
- question quality classification tests

### Frontend tests

- rendering tests for family-lens cards
- filters and drilldown behavior
- empty-state coverage
- cross-role scope visibility checks

### Regression risks to watch

- teacher scope leaking cross-institute data
- analytics views timing out with larger cohorts
- family-specific copy diverging from actual payloads
- results pages becoming unreadable due to card sprawl

---

## Exit Criteria

Phase 6 should be considered complete when all of the following are true:

- teacher and institute analytics both use explicit family lenses
- score distributions are visible, not just averages
- review operations are measurable and drillable
- question quality signals feed actionable bank-improvement recommendations
- at least one deep-dive analytics path exists for each major assessment family

---

## High-Level Summary For Stakeholders

At a high level, Phase 6 will cover:

- performance distribution instead of only averages
- review workload and turnaround visibility
- section/topic/skill drilldowns
- question-bank quality feedback loops
- analytics that feel different for school, competitive, certification, and language exams

In plain terms:

Phase 6 is where the platform stops being only an exam delivery system with reports and becomes a true decision-support product.
