# Functional End-To-End Hardening Plan

Last updated: 2026-07-07

## Purpose

This plan turns the current functional confidence review into a practical execution sequence.

It focuses on end-to-end product confidence, not raw performance.

Use it to answer:

1. what is already strong enough for controlled rollout
2. what is still risky for broader usage
3. what should be hardened first
4. what can wait until after a controlled pilot

Related documents:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [PHASE_WISE_EXECUTION_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PHASE_WISE_EXECUTION_PLAN.md)
- [PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md)
- [FUNCTIONAL_P0_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_P0_EXECUTION_BOARD.md)
- [STUDENT_9_5_CONFIDENCE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_9_5_CONFIDENCE_EXECUTION_BOARD.md)
- [EXAM_CREATION_SCENARIO_CATALOG.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/EXAM_CREATION_SCENARIO_CATALOG.md)
- [P1_HARDENING_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/P1_HARDENING_EXECUTION_BOARD.md)
- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)
- [TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md)

---

## Current Read

### Overall functional confidence

- controlled pilot with operator support: strong
- broader low-support rollout: not ready yet

The concrete path from current guided-rollout strength to stronger unsupported self-serve confidence is now tracked in:

- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)

### Strongest end-to-end sections

- results and reviews
- exam creation and lifecycle
- student core journey
- admin core route family

### Main remaining functional risks

- economy and entitlement operator density
- teacher vs institute role-difference clarity
- breadth gaps in exam creation combinations
- question-bank edge behavior under linked and bulk workflows
- student weak-network and long-session realism
- student descriptive/manual-evaluation realism and dense result-history realism

---

## Phase Model

### Phase 0

Goal:

- remove the remaining confusing or surprise-prone end-to-end operator behaviors before wider rollout

Execution board:

- [FUNCTIONAL_P0_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_P0_EXECUTION_BOARD.md)

Exit standard:

- no important workflow requires hidden team knowledge to operate correctly
- major role differences are visible in product and browser-proven
- dense operator lanes have at least one clear, truthful recovery path

### Phase 1

Goal:

- deepen scenario breadth in the already-strong workflow families

Exit standard:

- highest-value combinations are browser-proven, not just the main happy path
- broader rollout risk shifts from “unknown behavior” to “known edge limits”

### Phase 2

Goal:

- add realism and operational confidence beyond normal browser happy-path proof

Exit standard:

- weak-network, repeat-run, denser seeded-data, and longer-session behavior are sampled enough to trust the product under real pilot usage

---

## Phase 0 Plan

### P0-A Economy Operator Safety

Why now:

- this is one of the densest operator sections and still the easiest place for human misconfiguration

What is already strong:

- package scope logic
- entitlement truth
- restore/reactivate flows
- admin policy-disable behavior

What is still risky:

- support-ops branch complexity
- catalog mutation breadth
- first-time operator comprehension

Tasks:

1. add two more reversible admin economy mutation scenarios
2. add one denser institute support-ops browser workflow
3. add a browser-proven “safe recovery after wrong configuration choice” lane
4. tighten labels and help text in the densest question-bank access control surfaces

Progress since this checklist was written:

- one additional reversible admin economy mutation lane now proves subscription-plan cycle, pricing, grant-mode, and star-credit-rule edits through the dense governance editor
- the “safe recovery after wrong configuration choice” lane is now browser-proven through subscription-plan catalog recovery:
  - choose the wrong `Apply to institute` target
  - inspect the remediation warning for the mismatched target
  - switch back to the intended institute
  - apply access
  - reload and verify the entitlement reconciliation gap clears

Done means:

- operators can safely inspect, mutate, and recover core economy access state without relying on tribal knowledge

### P0-B Teacher vs Institute Role Clarity

Why now:

- functionality is strong, but some role differences are still clearer to us than to operators

What is already strong:

- shared-library control split
- linked-row read-only teacher behavior
- teacher and institute baseline parity in several core routes

What is still risky:

- broader role-difference behavior outside the strongest proven lanes
- teacher-side expectations around institute-owned linking capabilities

Tasks:

1. add explicit browser assertions for role-difference behavior in:
   - linked inventory
   - shared-library intake
   - question-bank bulk actions
   - exam-detail control surfaces where parity is intentionally different
2. add inline UI explanation where a teacher sees a read-only or request-only path
3. extend stage-seeded datasets so role-difference proof is less fragile

Done means:

- a new operator can understand what teacher can and cannot do compared with institute admin without asking the team

### P0-C Question-Bank Edge Confidence

Why now:

- authoring is already good, but linked/bulk/import edge behavior is still one of the most likely surprise zones

What is already strong:

- local authoring
- linked inventory baseline
- import preview/finalize
- draft lifecycle

What is still risky:

- linked-question mental model
- deterministic bulk edge cases
- broader import failure-state realism

Tasks:

1. deepen linked-question browser assertions:
   - local vs linked distinction
   - duplicate-first reuse
   - recovery after no-result or narrowed filters
2. add more bulk-edge flows:
   - mixed eligible/ineligible visible rows
   - filter narrowing before a bulk action
   - recovery after tag/topic mismatch conditions
3. expand import failure-state browser coverage:
   - malformed file
   - mixed valid/invalid rows
   - duplicate-content row handling
   - comprehension-linked edge conditions

Done means:

- question bank no longer feels “strong in happy path, uncertain in dense operator use”

---

## Phase 1 Plan

### P1-A Exam Creation Scenario Breadth

Why next:

- the highest-value subset is already proven, but the scenario catalog is still larger than the automated proof

Primary gap:

- browser coverage is strongest in the baseline combinations, weaker in uncommon but still real combinations

Tasks:

1. expand assignment-mode runtime enumeration coverage
2. add more preset and family combination cases
3. deepen multi-learner ranking and publication realism
4. cover more source-ownership combinations where admin can create both platform and institute source exams

Done means:

- the remaining exam creation risk is truly edge-only, not “combination breadth uncertainty”

### P1-B Destructive Workflow Breadth

Why next:

- current destructive confidence is good in strongest opt-in lanes, but still uneven overall

Tasks:

1. broaden reversible deletion/deactivation coverage in:
   - question bank
   - economy support flows
   - roster/admin operator actions
2. keep disposable cleanup deterministic
3. add repeated-run proof for the strongest destructive lanes

Done means:

- destructive confidence is no longer concentrated in only a few carefully chosen specs

### P1-C Institute and Teacher Browser Breadth

Why next:

- both sections are strong, but still have breadth gaps more than core-flow gaps

Tasks:

1. add denser institute descriptive scoring mutation depth if any remaining ambiguity exists
2. expand teacher comprehension and linked-inventory stage realism
3. keep compact-viewport task flows healthy with reruns while adding only the missing breadth

Done means:

- both operator roles feel equally deliberate, even where their permissions differ

---

## Phase 2 Plan

### P2-A Student Realism

Why later:

- student core journey is already strong enough for controlled rollout

Remaining gap:

- realism, not basic correctness

Tasks:

1. add weak-network retry and degraded-state assertions
2. add longer-attempt and revisit comfort coverage
3. add broader publication-state and multi-attempt depth
4. capture real-device notes alongside browser viewport proof

Done means:

- student confidence reflects actual learning-session realism, not just route continuity

### P2-B Stage Realism And Repeatability

Why later:

- local and stage browser proof is already meaningful, but some sections still rely more on local certainty than stage breadth

Tasks:

1. add stage reruns for the heaviest browser-functional sections:
   - economy
   - teacher linked inventory
   - institute linked workflows
   - selected dense exam creation combinations
2. preserve seed-contract stability for those lanes
3. record any stage-only UX or contract differences explicitly

Done means:

- stage no longer acts as a second-class confidence signal for functional behavior

---

## Recommended Order

1. `P0-A Economy Operator Safety`
2. `P0-B Teacher vs Institute Role Clarity`
3. `P0-C Question-Bank Edge Confidence`
4. `P1-A Exam Creation Scenario Breadth`
5. `P1-B Destructive Workflow Breadth`
6. `P1-C Institute and Teacher Browser Breadth`
7. `P2-A Student Realism`
8. `P2-B Stage Realism And Repeatability`

---

## Success Criteria

We should consider end-to-end functionality “broad-rollout strong” when:

- controlled rollout confidence stays at or above current levels
- the main operator-dense sections no longer depend on hidden expert knowledge
- role-difference behavior is obvious and browser-proven
- exam creation breadth covers the highest-risk combinations, not just baseline ones
- student realism includes more than direct happy-path continuity

At that point, the next limiting factor should be business rollout choice, not product-function uncertainty.
