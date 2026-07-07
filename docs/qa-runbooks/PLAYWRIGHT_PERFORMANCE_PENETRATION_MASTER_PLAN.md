# Playwright, Performance, And Penetration Testing Master Plan

Last updated: 2026-07-06

## Purpose

This document combines three parallel quality tracks into one execution plan:

- Playwright browser confidence
- performance and load validation
- penetration and security validation

Use this plan to answer:

1. what is already covered?
2. what is still pending?
3. what should run first?
4. how do we mark each wave complete?

Related documents:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md)
- [PLAYWRIGHT_TEST_BOUNDARY_AND_ENGINEERING_RULES.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_TEST_BOUNDARY_AND_ENGINEERING_RULES.md)
- [PERFORMANCE_TEST_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PERFORMANCE_TEST_PLAN.md)
- [PLAYWRIGHT_PERFORMANCE_PENETRATION_EXECUTION_PACK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_PERFORMANCE_PENETRATION_EXECUTION_PACK.md)
- [STAGE_BROWSER_PERFORMANCE_SECURITY_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_BROWSER_PERFORMANCE_SECURITY_CHECKLIST.md)
- [PENETRATION_FINDINGS_TRACKER_TEMPLATE.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PENETRATION_FINDINGS_TRACKER_TEMPLATE.md)
- [STAGE_PERFORMANCE_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md)
- [STAGE_SCALE_UP_VALIDATION_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_VALIDATION_RUNBOOK.md)

---

## Current Summary

### Playwright

- broad local browser coverage already exists across student, teacher, institute, and admin flows
- route-level timing probes now exist for many high-value pages
- mutable workflow coverage exists for important exam, results, onboarding, and economy lanes
- main remaining gap is stage validation plus a tighter release-grade smoke subset

### Performance

- local backend profiling exists for read and write hotspots
- frontend route timing baselines exist for many critical role surfaces
- early stage `k6` and auth/discovery validation exists
- main remaining gap is a full stage rerun after the latest hardening plus larger controlled concurrency proof

### Penetration testing

- there is no comparable mature runbook yet
- security confidence currently comes mostly from product behavior, role checks, and bug fixing, not from a dedicated structured penetration program
- this is the clearest planning gap among the three tracks

---

## Guiding Rules

- Playwright proves user-visible truth in the browser.
- Performance testing proves latency, concurrency, and infrastructure behavior.
- Penetration testing proves security posture against realistic misuse and attack patterns.
- Do not let one track substitute for another.
- Prefer stage-first validation before any production-facing security or load exercise.
- Record evidence for every completed wave:
  - test command
  - environment
  - artifact location
  - pass/fail summary
  - follow-up actions

---

## Status Model

Use these states:

- `pending`
- `in progress`
- `partially complete`
- `complete`
- `validated on stage`

Use these evidence tags:

- `browser test`
- `local benchmark`
- `stage benchmark`
- `load test`
- `security scan`
- `manual verification`

---

## Phase Plan

## Phase 0. Inventory And Scope Freeze

Status: `partially complete`

Goal:

- freeze what each testing track owns
- prevent duplicate or vague work

Already done:

- major Playwright coverage maps and scenario catalogs exist
- performance route inventories and command maps exist

Pending:

- create a penetration test inventory by surface:
  - auth
  - role boundaries
  - exam runtime
  - file upload
  - admin economy
  - question-bank import and linking
  - report and analytics exports

Exit criteria:

- one agreed inventory exists for all three tracks

## Phase 1. Playwright Confidence Baseline

Status: `partially complete`

Goal:

- prove core browser journeys locally and define the release-grade subset

Already done:

- local browser suites cover many key teacher, institute, student, and admin workflows
- route timing probes exist for many critical pages

Pending:

- define a stable `release browser smoke` subset
- define a stable `stage browser performance` subset
- define a stable `dense operator workflow` subset

Recommended Playwright subsets:

- `release-smoke`
  - role logins
  - dashboard load
  - exam list visibility
  - student results open
  - teacher results open
  - institute question-bank open
  - admin economy open
- `stage-performance`
  - existing timing specs for student, teacher, institute, and admin
- `deep-workflow`
  - exam creation
  - publish and results continuity
  - question-bank import/create/edit flows
  - admin economy entitlement and package flows

Exit criteria:

- local release-grade Playwright subset is green and documented

## Phase 2. Playwright Stage Validation

Status: `pending`

Goal:

- rerun browser confidence on stage with real seeded data and real latency

Scope:

- stage login validation for all automation roles
- stage timing rerun for critical route probes
- stage workflow rerun for the highest-value journeys

Execution order:

1. role-login smoke
2. route timing probes
3. top business workflows
4. failure triage

Priority journeys:

- student login -> available exams -> exam detail -> results
- teacher exams -> results -> analysis
- institute exams -> question bank -> results
- admin economy -> institutes -> reports

Artifacts:

- Playwright traces
- screenshots on failure
- timing JSON attachments
- stage pass/fail sheet

Exit criteria:

- critical stage browser subset is green
- timing regressions are either fixed or explicitly accepted

## Phase 3. Performance Revalidation

Status: `in progress`

Goal:

- prove that recent code hardening holds under browser timing and backend measurement

Already done:

- strong local profiling exists
- several route families have measured improvements

Pending:

- rerun high-value local timing probes after each major optimization wave
- convert remaining local-only wins into stage-validated evidence

Core metrics:

- route open timing
- filter/apply/reset timing
- create/import/open timing
- backend route p95 on stage-like data

Exit criteria:

- high-value local baselines are current
- no major hotspot remains unmeasured

## Phase 4. Controlled Load And Concurrency

Status: `pending`

Goal:

- prove exam-day and operator-load behavior under controlled concurrency

Tool split:

- Playwright:
  - browser correctness under light concurrency
  - small parallel smoke only
- `k6`:
  - API concurrency
  - latency and failure-rate measurement
  - auth, discovery, runtime, save, and submit traffic

Execution order:

1. login and discovery smoke
2. session-reuse discovery ramp
3. exam runtime save pressure
4. submission spike
5. operator-side route observation during student load

Priority scenarios:

- student login rush
- exam discovery rush
- attempt runtime save pressure
- near-end submission spike
- optional teacher/institute observation during live event traffic

Required monitoring:

- app CPU
- app memory
- DB CPU
- DB connections
- error rate
- p95 latency
- slow queries

Exit criteria:

- at least one clean stage load run per critical journey
- first saturation point is known
- infra bottleneck vs code bottleneck is explicit

## Phase 5. Penetration Testing Preparation

Status: `pending`

Goal:

- make security testing structured, safe, and repeatable before active probing starts

Preparation tasks:

- define allowed target environments
- define approved testing window
- define data sensitivity rules
- define credentials and role accounts for testing
- define severity rubric:
  - critical
  - high
  - medium
  - low
- define reporting template

Security surface inventory:

- authentication
- authorization and role isolation
- IDOR and object access
- file upload and import endpoints
- rich text and image upload
- question-bank linking and package assignment
- exam publish/review/result routes
- wallet and economy admin actions
- rate limiting and brute-force protection
- session and token handling
- CSRF and CORS posture
- export and reporting endpoints

Exit criteria:

- penetration scope, rules, and severity model are documented

## Phase 6. Penetration Testing Execution

Status: `pending`

Goal:

- test the platform against realistic misuse and attack patterns

Testing layers:

- automated baseline scanning
  - dependency audit
  - secret leakage check
  - HTTP header and TLS review
  - authenticated DAST on stage if approved
- manual abuse testing
  - role-boundary crossing
  - insecure direct object reference
  - forced browsing
  - parameter tampering
  - mass-assignment attempts
  - rate-limit bypass attempts
  - file-upload abuse
  - import payload abuse
  - stored and reflected XSS checks
  - privilege escalation attempts

Suggested execution order:

1. unauthenticated surface review
2. authenticated student checks
3. authenticated teacher checks
4. authenticated institute checks
5. authenticated admin checks
6. file upload and import abuse checks
7. export/report and data-exposure checks

Evidence to capture:

- request and response samples
- reproduction steps
- affected roles
- business impact
- fix recommendation
- retest status

Exit criteria:

- all critical and high findings are fixed or explicitly risk-accepted
- medium findings are triaged with owners

## Phase 7. Unified Release Gate

Status: `pending`

Goal:

- create one go/no-go testing gate before wider rollout

Required green gates:

- release-grade Playwright smoke passes
- stage timing subset passes within agreed budget
- controlled `k6` runs pass within agreed error and latency thresholds
- no open critical security finding
- no open unresolved auth or role-isolation issue

Release package should include:

- browser summary
- performance summary
- security summary
- known accepted risks
- rollback and monitoring notes

Exit criteria:

- testing evidence is sufficient to move confidence upward in the matrix

---

## Recommended Immediate Order

1. formalize the Playwright release and stage subsets
2. rerun those subsets on stage
3. execute the next controlled `k6` validation wave
4. create the penetration scope and target checklist
5. run the first authenticated penetration sweep on stage
6. update the confidence matrix with measured evidence

---

## What Counts As Done

Playwright is not done when local tests merely exist.
It is done when:

- critical local subset is stable
- critical stage subset is green
- failures are actionable, not flaky

Performance is not done when local route timings look good.
It is done when:

- stage timings are captured
- load behavior is measured
- bottlenecks are understood

Penetration testing is not done when a scanner is run once.
It is done when:

- key abuse cases were attempted
- findings were triaged
- fixes were retested

---

## Practical Ownership Split

- QA / browser automation:
  - Playwright subsets
  - browser artifacts
  - workflow correctness
- backend / infra:
  - route profiling
  - `k6` runs
  - host and DB monitoring
- security owner or engineering lead:
  - penetration scope
  - severity triage
  - remediation tracking
- release owner:
  - unified signoff
  - confidence-matrix update
