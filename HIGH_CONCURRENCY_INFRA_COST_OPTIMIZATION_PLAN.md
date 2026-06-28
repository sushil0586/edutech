# High Concurrency Infra Cost Optimization Plan

This document defines a practical plan to reduce infrastructure cost for Nexora Learn under high exam concurrency, without damaging exam reliability.

## Objective

Reduce infrastructure expense during high concurrent exam usage by:

- reducing peak simultaneous load
- reducing database pressure per learner
- moving non-critical work out of the live exam path
- scaling only where the product actually needs it

## Product context

Current product shape:

- `edutech_web`: Next.js web frontend
- `edutech_backend`: Django monolith backend
- `nginx`: reverse proxy
- relational database
- static/media storage
- live exam workflow with student attempts, autosave, submit, results, analytics, and reporting

The main cost driver is not total registered students. The real cost driver is:

- peak concurrent attempt users

## Core principle

For this product, cost should be optimized in this order:

1. reduce concurrency spikes operationally
2. reduce write pressure during attempts
3. cache repeated read traffic
4. offload heavy post-submit work
5. optimize the database
6. scale horizontally only after the above

## Target outcomes

If this plan is executed well, the platform should be able to:

- support larger exam windows without linear cost increase
- keep student attempt flows stable during peaks
- defer non-urgent work outside the critical exam path
- avoid premature over-engineering

## Optimization levers

### Lever 1: Stagger exam concurrency

Impact:

- highest cost reduction potential

Approach:

- avoid starting all institutes or cohorts at the same minute
- support configurable exam windows by institute, cohort, or batch
- operationally spread start times across the day

Expected benefit:

- reduces peak load on app servers and database
- may reduce required infra tier significantly without code-heavy changes

### Lever 2: Reduce attempt-path write frequency

Impact:

- very high

Approach:

- review autosave frequency
- save on meaningful user actions instead of overly aggressive polling
- keep periodic heartbeat modest
- avoid expensive writes for every minor interaction

Expected benefit:

- lowers database write amplification
- improves throughput for live attempt traffic

### Lever 3: Cache hot read paths

Impact:

- very high

Approach:

- cache exam metadata
- cache question payload bundles
- cache entitlement and scope lookup results where safe
- cache repeated dashboard and summary reads outside the live attempt path

Expected benefit:

- lowers repeated DB reads
- reduces API latency during load spikes

### Lever 4: Move heavy work to async/background execution

Impact:

- high

Approach:

- keep submit path minimal
- defer ranking, leaderboard recomputation, analytics aggregation, and recommendation refresh
- move publish-side recalculations into background jobs

Expected benefit:

- protects exam submission path
- prevents result and analytics generation from blocking live traffic

### Lever 5: Optimize storage and static delivery

Impact:

- medium to high

Approach:

- serve static assets from CDN or object storage
- store uploaded response artifacts in scalable object storage
- avoid serving heavy assets from application processes

Expected benefit:

- lowers app server bandwidth and CPU usage
- improves asset delivery under load

### Lever 6: Optimize the database before scaling app nodes

Impact:

- high

Approach:

- identify slow queries in attempt, exam-detail, question resolution, result, and analytics flows
- add missing indexes
- reduce N+1 queries
- separate heavy reporting reads from critical attempt traffic where possible

Expected benefit:

- database remains usable longer before upgrade
- avoids false scaling where more app servers do not help

### Lever 7: Burst scaling only during exam windows

Impact:

- medium to high

Approach:

- keep normal baseline infra lean
- temporarily scale app capacity during known exam windows
- do not pay full-scale cost all month if peaks happen only during certain hours

Expected benefit:

- improves cost efficiency
- aligns infra spend to actual demand

## P0: Immediate actions

These are the first steps because they provide the fastest value with the lowest product risk.

### P0.1 Concurrency operations policy

Action:

- define scheduling guidance for institute-level exam launches
- discourage same-minute starts for large batches
- create recommended batch-window rules

Acceptance criteria:

- documented scheduling guidance exists
- product/business team can plan staggered exam windows

### P0.2 Attempt write-path audit

Action:

- map all student attempt write events
- identify autosave cadence
- identify synchronous side effects in save and submit flows

Acceptance criteria:

- clear list of every write triggered during live attempt
- known target candidates for reduction

### P0.3 Critical-query profiling

Action:

- profile attempt start, autosave, submit, exam detail, and result fetch queries
- identify top slow or repeated DB operations

Acceptance criteria:

- top expensive query list exists
- indexes/query fixes are prioritized

### P0.4 Non-critical workload separation

Action:

- identify work that does not need to happen inside live request cycle
- especially analytics, ranking, report refresh, and downstream recomputations

Acceptance criteria:

- list of candidate async jobs created

## P1: Near-term implementation

These are the first engineering changes that should be implemented after the audit.

### P1.1 Autosave hardening

Action:

- reduce autosave frequency where safe
- prefer action-based save plus periodic checkpoint
- ensure no loss of attempt confidence for learners

Acceptance criteria:

- live write volume per student is measurably lower
- attempt correctness remains intact

### P1.2 Redis/cache introduction

Action:

- introduce cache for hot read paths
- start with exam metadata, question resolution helpers, and entitlement/scope lookups

Acceptance criteria:

- measurable reduction in repeated DB reads
- no stale-data regressions in critical paths

### P1.3 Async result and analytics job lane

Action:

- move post-submit heavy calculations out of request path
- define queue/worker for leaderboard, analytics, and reporting updates

Acceptance criteria:

- submit endpoint does less synchronous work
- result/analytics freshness remains acceptable

### P1.4 Static/media offload

Action:

- move static/media heavy delivery away from app servers
- use object storage and CDN where appropriate

Acceptance criteria:

- app nodes are not primary heavy-asset delivery path

## P2: Scale-safe architecture improvements

These are important once the first optimizations are stable.

### P2.1 Exam-window burst scaling model

Action:

- define low baseline capacity
- define exam-window scale-up procedure
- define scale-down procedure after peak

Acceptance criteria:

- infra profile differs between normal hours and exam hours

### P2.2 Read/write workload isolation strategy

Action:

- isolate reporting/analytics pressure from critical attempt pressure
- apply queue separation, caching, or read-optimized access patterns

Acceptance criteria:

- heavy reporting usage does not degrade active attempts

### P2.3 Observability and load testing

Action:

- add metrics for request rate, DB latency, autosave throughput, submit latency, and queue lag
- run controlled load tests for realistic exam peaks

Acceptance criteria:

- concurrency limits are evidence-based, not guessed

## P3: Advanced cost controls

These are useful later, but not required immediately.

### P3.1 Tenant-aware scheduling intelligence

Action:

- use historical usage to recommend better exam windows

### P3.2 Adaptive autosave strategy

Action:

- tune autosave cadence based on network quality, activity, or attempt state

### P3.3 Tiered infrastructure policy

Action:

- create formal infra modes such as pilot, balanced, and peak-event

## Recommended execution order

1. define concurrency operations policy
2. audit attempt write path
3. profile critical queries
4. identify async candidates
5. reduce autosave pressure
6. add caching
7. move heavy post-submit work to background jobs
8. offload static/media delivery
9. add burst-scaling playbook
10. validate through load tests

## Expected cost impact by phase

### P0

- low engineering effort
- high clarity
- moderate immediate cost avoidance

### P1

- moderate engineering effort
- highest practical cost reduction
- highest stability improvement under load

### P2

- moderate to high engineering effort
- strong scaling safety
- better production confidence

### P3

- optional optimization
- useful after commercial scale starts growing

## What not to do first

To avoid over-engineering, do not start with:

- microservices split
- Kubernetes migration
- many app nodes without DB and write-path optimization
- deep infra complexity before measuring live bottlenecks
- advanced autoscaling before reducing avoidable load

## Practical recommendation for Nexora Learn

For this product, the best business-safe path is:

- keep baseline infra lean
- aggressively optimize live exam path
- stagger institutional concurrency where possible
- use cache plus background jobs before scaling out app infrastructure

## Success metrics

This plan is successful if:

- submit latency stays stable during exam peaks
- autosave error rate stays low
- DB CPU and connection pressure reduce during attempt traffic
- same infra supports more concurrent learners than before
- monthly infra cost grows slower than active exam concurrency
