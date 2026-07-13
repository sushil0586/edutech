# Phase-Wise Execution Plan

Last updated: 2026-07-09

## Purpose

This document defines the execution order we should follow from the current functionally mature state to stronger rollout readiness.

It exists to answer one practical question:

What exactly do we do next, in order, without mixing functional hardening, stage-capacity work, and rollout claims?

Use this as the single sequencing document when deciding:

1. what to do before the stage upgrade
2. what to do immediately after the stage upgrade
3. what must be true before supported rollout signoff
4. what must be true before broader self-serve confidence can move materially higher

Related documents:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [FUNCTIONAL_END_TO_END_HARDENING_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_END_TO_END_HARDENING_PLAN.md)
- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)
- [SELF_SERVE_FIRST_TIME_OPERATOR_PACK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_FIRST_TIME_OPERATOR_PACK.md)
- [STUDENT_9_5_CONFIDENCE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_9_5_CONFIDENCE_EXECUTION_BOARD.md)
- [STAGE_SCALE_UP_VALIDATION_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_VALIDATION_RUNBOOK.md)
- [STAGE_SCALE_UP_RESULTS_TEMPLATE.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_RESULTS_TEMPLATE.md)

---

## Current Read

### What is already true

- core feature development is largely complete
- critical student, teacher, institute, and admin flows are browser-proven
- operator confidence is much stronger than it was a few days ago
- the current main residuals are now:
  - performance and scale proof
  - broader unsupported self-serve proof
  - wider long-tail scenario breadth

### What is not yet true

- stage capacity is not yet strong enough for honest load signoff
- unsupported first-time operator rollout is not yet blanket-proven
- broader scale claims are not yet justified by current stage evidence

---

## Phase Model

### Phase 1

Goal:

- finish the highest-value functional work that does not require a stage upgrade

Theme:

- pre-upgrade hardening

### Phase 2

Goal:

- upgrade stage capacity and capture a clean before/after validation baseline

Theme:

- infrastructure confirmation

### Phase 3

Goal:

- use the upgraded stage to prove load behavior, rerun stability, and denser realism

Theme:

- post-upgrade validation

### Phase 4

Goal:

- sign off supported rollout readiness with evidence aligned across docs

Theme:

- controlled rollout signoff

### Phase 5

Goal:

- close the remaining unsupported self-serve and long-tail breadth gaps

Theme:

- broader self-serve and blanket confidence

---

## Phase 1: Pre-Upgrade Functional Hardening

Status: `Next`

This phase should consume the remaining time before the stage resize.

We should treat the current stage and local environment as functional-proof environments, not scale-signoff environments.

### Priority 1. Unsupported self-serve rerun breadth

What to do:

1. rerun the first-time operator pack multiple times, not just once
2. widen variants around:
   - wrong scope selected
   - active filter creating a false-empty impression
   - partial entitlement vs true no-access
   - teacher request-only vs institute link-capable recovery
   - onboarding ready vs follow-up-needed interpretation
3. capture any copy or recovery gaps found during reruns

Primary artifacts:

- [SELF_SERVE_FIRST_TIME_OPERATOR_PACK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_FIRST_TIME_OPERATOR_PACK.md)
- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)

Done means:

- the strongest unsupported operator pack is not just green once
- it is repeatably green and still understandable without support translation

### Priority 2. Student long-tail realism

What to do:

1. deepen reruns of the strongest student confidence lanes
2. add or extend any remaining learner-first realism around:
   - descriptive and manual-review continuity
   - mixed published and unpublished result states
   - repeat-attempt ordering
   - analytics continuity after manual evaluation
3. capture any remaining gaps that still keep student confidence below `9.5/10`

Primary artifacts:

- [STUDENT_9_5_CONFIDENCE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_9_5_CONFIDENCE_EXECUTION_BOARD.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)

Done means:

- student confidence is limited mostly by scale realism and not by missing functional scenario depth

### Priority 3. Operator repeatability sweep

What to do:

1. rerun the strongest operator grouped suites with the current healthy runtime
2. focus on:
   - onboarding
   - package scope
   - shared-library access
   - mutation and recovery after admin changes
3. sync any residual wording updates discovered during reruns

Primary artifacts:

- [OPERATOR_8_TO_9_CONFIDENCE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OPERATOR_8_TO_9_CONFIDENCE_EXECUTION_BOARD.md)
- [FUNCTIONAL_P0_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_P0_EXECUTION_BOARD.md)

Done means:

- the strongest operator confidence claims are based on stable reruns, not one-off green runs

### Priority 4. Seed breadth and determinism

What to do:

1. reduce dependence on narrow subject or institute-shape luck
2. expand seeded overlap where cross-institute and package-scope proof is still too concentrated
3. keep the seeded role/access states distinct enough to prove:
   - linked present
   - linked absent
   - request-only
   - quota exhausted
   - paused or narrowed visibility

Primary artifacts:

- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)

Done means:

- browser proof no longer depends heavily on one narrow seeded lane

### Priority 5. Freeze the post-upgrade validation pack

What to do:

1. confirm the exact scripts, credentials, and order for the stage validation wave
2. keep the comparison clean by avoiding app-config changes before the resize
3. record the final pre-upgrade baseline numbers in the stage results template

Primary artifacts:

- [STAGE_SCALE_UP_VALIDATION_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_VALIDATION_RUNBOOK.md)
- [STAGE_SCALE_UP_RESULTS_TEMPLATE.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_RESULTS_TEMPLATE.md)

Done means:

- the moment stage is upgraded, we can run the exact same validation pack without redesigning the experiment

### Phase 1 exit criteria

- first-time operator pack remains repeatably green
- strongest student lanes are rerun and any residual long-tail gaps are explicitly named
- strongest operator packs are rerun and stable
- seeded-data assumptions are narrower and clearer
- the stage scale-up validation wave is frozen and ready

---

## Phase 2: Stage Upgrade And Baseline Confirmation

Status: `Blocked on infrastructure change`

This phase begins only after the instance type is upgraded.

### Scope

1. resize the stage instance to the chosen `4 vCPU` target
2. confirm SSH, services, disk, and login health
3. rerun the direct auth timing baseline
4. rerun the exact same smoke pack captured in Phase 1
5. compare before/after in one results sheet

Primary artifact:

- [STAGE_SCALE_UP_VALIDATION_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_VALIDATION_RUNBOOK.md)

Done means:

- we know whether the old p95 tail was mainly capacity-driven or still hiding a route-level bottleneck

### Phase 2 exit criteria

- upgraded instance shape is confirmed
- backend and frontend remain healthy after restart
- baseline auth timings are improved or at least explained
- smoke load is rerun with the same scripts and credentials
- before/after evidence is captured in the results template

---

## Phase 3: Post-Upgrade Scale And Realism Validation

Status: `After phase 2`

This phase uses the stronger stage to answer the questions the current small box cannot answer honestly.

### Priority 1. Auth and exam-discovery load validation

What to do:

1. rerun auth-heavy and session-reuse `k6` packs
2. inspect p95 improvement and request-failure behavior
3. verify the load improvement is not dependent on a narrow happy path

### Priority 2. Results and analytics load validation

What to do:

1. rerun the student results-history pack
2. validate that the corrected insights routes stay healthy under load
3. inspect whether results and analytics latency now falls into a healthier range

### Priority 3. Route-level profiling only if still needed

What to do:

1. revisit dense authenticated student reads only if the upgraded stage still shows unhealthy tail latency
2. profile serializers, permission-heavy routes, and cached vs cold responses

### Priority 4. Stage realism sweep

What to do:

1. widen stage reruns beyond one or two student accounts
2. prefer more realistic multi-user seeded scenarios where possible
3. confirm stage behavior on denser seeded data, not just the smallest smoke slice

Done means:

- stage performance questions are answered by upgraded-stage evidence rather than inference from an undersized box

### Phase 3 exit criteria

- auth-heavy paths are remeasured under load
- results and analytics chains are remeasured under load
- any remaining hot routes are explicitly identified
- scale limitations, if any remain, are now precise rather than generic

---

## Phase 4: Supported Rollout Signoff

Status: `After phase 3`

This phase is where we align evidence and messaging for controlled or support-backed rollout.

### Scope

1. update confidence docs to reflect post-upgrade truth
2. confirm supported rollout claims are aligned across:
   - overall matrix
   - self-serve plan
   - student confidence board
   - stage validation notes
3. state clearly what is:
   - ready for controlled pilot
   - ready for supported paid rollout
   - still not ready for unsupported broad self-serve

Done means:

- we can make a clean supported-rollout statement without hand-waving around performance or major functional unknowns

### Phase 4 exit criteria

- documentation agrees on supported rollout posture
- the remaining risks are framed as bounded residuals, not unresolved uncertainty
- rollout messaging is ready for internal and operator-facing use

---

## Phase 5: Broad Self-Serve And Blanket Confidence

Status: `After supported rollout signoff`

This phase is about moving from strong guided usage to broader unsupported usage confidence.

### Scope

1. widen unsupported operator journey breadth further
2. deepen broader onboarding variation proof
3. extend long-tail question-bank, entitlement, and role-boundary realism
4. widen broader device, viewport, and repeated-run coverage where still thin
5. keep tightening any copy or recovery surfaces that still rely on insider understanding

Primary artifacts:

- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)

Done means:

- the product is not just correct
- it is broadly teachable and recoverable for first-time users without high-touch support

### Phase 5 exit criteria

- unsupported self-serve proof is broad, not just scenario-dense
- operator ambiguity is the exception, not the norm
- the remaining caution is commercial or scale-choice related, not product-model uncertainty

---

## Non-Negotiable Sequencing Rules

1. Do not use the current undersized stage box to make final scale claims.
2. Do not reopen already-green high-signal packs unless rerun instability appears.
3. Do not mix app-code tuning with the first stage resize comparison wave.
4. Do not raise unsupported self-serve confidence based on one narrow green pack alone.
5. Do not call production-scale readiness complete until upgraded-stage load evidence is captured.

---

## Immediate Next Actions

If we are following this plan strictly, the next work should be:

1. Phase 1 priority 1: unsupported self-serve rerun breadth
2. Phase 1 priority 2: student long-tail realism reruns
3. Phase 1 priority 3: operator repeatability sweep
4. Phase 1 priority 5: freeze the exact post-upgrade validation pack

That is the highest-signal work we can do before the stage upgrade.
