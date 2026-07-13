# Self-Serve Rollout Confidence Plan

Last updated: 2026-07-08

## Purpose

This plan turns the current confidence gap into a practical hardening sequence.

Use it to answer:

1. why guided rollout confidence is already strong
2. why unsupported self-serve confidence is not yet at the same level
3. which areas still need denser end-to-end proof
4. what must be true before we can raise broad self-serve confidence materially

Related documents:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [FUNCTIONAL_END_TO_END_HARDENING_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_END_TO_END_HARDENING_PLAN.md)
- [FUNCTIONAL_P0_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_P0_EXECUTION_BOARD.md)
- [P1_HARDENING_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/P1_HARDENING_EXECUTION_BOARD.md)
- [STUDENT_9_5_CONFIDENCE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_9_5_CONFIDENCE_EXECUTION_BOARD.md)
- [OPERATOR_8_TO_9_CONFIDENCE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OPERATOR_8_TO_9_CONFIDENCE_EXECUTION_BOARD.md)
- [SHARED_LIBRARY_SELF_SERVE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SHARED_LIBRARY_SELF_SERVE_EXECUTION_BOARD.md)
- [SELF_SERVE_FIRST_TIME_OPERATOR_PACK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_FIRST_TIME_OPERATOR_PACK.md)
- [TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md)

---

## Current Read

### Confidence posture

- controlled pilot with monitored onboarding: strong
- guided paid rollout with operator support: strong
- broader unsupported self-serve rollout: improved, but not yet broad-rollout strong

### Plain-English summary

The product is no longer blocked by core baseline uncertainty.

The main remaining gap is now this:

- core flows are mostly correct and browser-proven
- but some dense operator combinations still need more blanket-proof than scenario-proof
- support-backed rollout can absorb those gaps more safely than unsupported first-time usage

### What currently keeps self-serve confidence below maximum

- shared-library and package-scope edge combinations are still deeper than the current blanket proof
- seeded data realism is better, but still narrower than ideal in some cross-institute academic lanes
- mutation and recovery confidence is now stronger than before, but still not fully matrixed across all dense operator combinations
- unsupported users can still hit scope-empty, partially entitled, or role-misaligned states that are correct but not always fully effortless without prior product knowledge
- real browser/runtime issues are still occasionally discovered after backend correctness already looks healthy

Latest shared-library read:

- the core teacher-versus-institute shared-library control split is now browser-proven across the focused mutable pack
- current grouped local result for the highest-value shared-library role/access pack is `5 passed`
- the earlier shared-library pack skip is now closed
- the paused-entitlement backend truth gap is also now closed on targeted backend rerun
- the main remaining residuals now sit outside the focused shared-library pack and are more about broader unsupported-usage depth than this specific role/access surface

Latest operator-readiness read:

- the focused operator `8 to 9` confidence board is now fully complete
- onboarding summary and mixed onboarding realism are now materially stronger
- teacher versus institute role boundaries are now more explicit on dense authoring surfaces
- teacher question-bank parity and package/entitlement diagnosis are now stronger than this plan originally assumed
- the main remaining residual is now less about isolated operator-lane correctness and more about first-time self-serve teachability, repeated-run breadth, and performance realism
- the first grouped unsupported self-serve operator pack is now also green at `8 passed`
- that grouped pack proved:
  - mixed onboarding summary truth
  - package mismatch and partial-entitlement diagnosis
  - teacher request-only versus institute link-capable role recovery
  - empty-state versus no-entitlement and quota-blocked differentiation
- this materially improves confidence that first-time operators can recover from the densest access-state combinations without hidden backend inspection
- the optional strengthening wave is now also effectively closed:
  - grouped strengthening result: `3 passed`, `1 expected skip`
  - quota-lane follow-up rerun with its dedicated mutable flag: `1 passed`
  - combined strengthening read: `4/4 proven`
- this means self-serve residual risk is now less about whether the core access-state model teaches itself and more about broader rerun breadth, seed breadth, and unsupported rollout scale

Recommended immediate execution artifact:

- [SELF_SERVE_FIRST_TIME_OPERATOR_PACK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_FIRST_TIME_OPERATOR_PACK.md)
  - the core grouped pack is now green at `8 passed`
  - the optional strengthening lanes are now also effectively closed at `4/4 proven`
  - it centers on mixed onboarding, package mismatch, request-only versus link-capable recovery, and empty-state versus true no-access differentiation
  - the next lift should come from its optional strengthening lanes plus broader rerun breadth rather than reopening the same core proof set

---

## Confidence Bar

We should treat the product as materially stronger for unsupported self-serve rollout only when all of the following are true:

- first-time operators can understand unavailable states without support intervention
- dense economy and question-bank mutations have browser-proven reversal and recovery paths
- teacher, institute, and admin role boundaries are visible in-product and remain stable across scoped lanes
- seeded and stage data are broad enough that role/access proof does not rely on narrow lane luck
- repeated browser reruns cover the highest-value operator paths without fragile skips or special-case assumptions

---

## Main Workstreams

### 1. Shared-Library And Access-State Depth

Why it matters:

- this is one of the densest operator surfaces
- self-serve confidence drops quickly when scope, quota, paused state, and role ownership interact in surprising ways

What to harden:

- scope mismatch vs true no-access behavior
- quota-available vs quota-exhausted behavior
- paused entitlement vs active entitlement behavior
- teacher request-only vs institute link-capable behavior
- already-linked recovery and duplicate-first reuse behavior

Evidence target:

- shared-library behavior feels deterministic even when the user starts from the wrong scope or a partially entitled lane

Suggested spec areas:

- `tests/e2e/workflow/teacher-institute-shared-library-role-difference.spec.ts`
- `tests/e2e/workflow/teacher-question-bank-shared-library-request.mutable.spec.ts`
- `tests/e2e/workflow/institute-shared-library-builder-flow.mutable.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-link.mutable.spec.ts`

Execution board:

- [SHARED_LIBRARY_SELF_SERVE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SHARED_LIBRARY_SELF_SERVE_EXECUTION_BOARD.md)

### 2. Seeded Data Realism And Cross-Institute Breadth

Why it matters:

- browser proof is less trustworthy when meaningful lanes only exist because a narrow seed happened to line up

What to harden:

- expand donor and target academic overlap for shared-library scenarios
- reduce dependence on one or two special subjects for package-scope proof
- keep seeded role-difference lanes distinct enough to prove:
  - linked present
  - linked absent
  - request-only
  - quota exhausted
  - paused visibility

Evidence target:

- seeded browser proof remains stable without relying on brittle subject selection or hidden environment overrides

Current status:

- partially improved
- helper defaults now align shared-library seeding to `DLI001`, which matches the default Playwright teacher and institute roles
- the blocked-matchable institute bridge lane is now browser-proven in the focused shared-library pack
- the next remaining lift is broader seeded realism outside this focused pack rather than the original institute bridge skip

Suggested implementation areas:

- `edutech_backend/apps/question_bank/management/commands/seed_demo_shared_library_access.py`
- `edutech_web/tests/e2e/helpers/demo-shared-library.ts`

### 3. Mutation And Recovery Matrix

Why it matters:

- guided rollout tolerates operator mistakes better because support can interpret the state
- self-serve readiness needs stronger proof that users can recover on their own

What to harden:

- admin changes scope, user sees impact, admin restores state, user sees recovery
- feature pause/resume and entitlement deactivate/restore in denser combinations
- retry behavior after wrong initial choice
- truthfulness after reversal, not just success of the first mutation

Evidence target:

- dense operator flows no longer feel safe only when handled by experienced support staff

Suggested spec areas:

- `tests/e2e/workflow/admin-economy-mutable.spec.ts`
- `tests/e2e/workflow/admin-package-scope.mutable.spec.ts`
- `tests/e2e/workflow/admin-institute-question-bank-feature-recovery.mutable.spec.ts`
- `tests/e2e/workflow/institute-question-bank-access-summary.spec.ts`

### 4. Unsupported Operator Journey Hardening

Why it matters:

- self-serve confidence depends less on raw correctness and more on whether users can recover from misunderstanding the model

What to harden:

- wrong scope chosen
- empty state caused by active filters
- partial entitlement mistaken for missing data
- teacher expectation mismatch around institute-owned linking
- operator confusion between local, linked, and licensed states

Evidence target:

- the product teaches the user what went wrong and what to do next without support translation

Suggested surfaces:

- teacher question bank
- institute question bank and library linker
- admin economy access control
- onboarding and first-run configuration paths

Recommended grouped execution pack:

- [SELF_SERVE_FIRST_TIME_OPERATOR_PACK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_FIRST_TIME_OPERATOR_PACK.md)

### 5. Repeated-Run And Final Confidence Sweep

Why it matters:

- one green run is good evidence
- self-serve confidence needs stronger rerun stability in the highest-value flows

What to harden:

- rerun the strongest operator packs with the current healthy app runtime
- prefer grouped suites that reflect realistic role transitions rather than isolated route proof
- update rollout guidance only after residual-risk language matches the real evidence

Evidence target:

- the final limiting factor becomes business rollout choice, not product-function uncertainty

Current status:

- improved
- the focused shared-library rerun pack is now clean at `5 passed`
- the next rerun/signoff work should widen back out to broader operator packs rather than repeating the same formerly unstable shared-library subset

---

## Recommended Execution Order

1. Shared-library and package-scope depth
2. Seeded data realism and cross-institute breadth
3. Mutation and recovery matrix
4. Unsupported operator journey hardening
5. Repeated-run confidence sweep and rollout-signoff update

Why this order:

- it starts with the densest remaining operator-risk surface
- then removes fixture fragility that can hide or distort real behavior
- then proves users can recover from mistakes
- then focuses on unsupported-user teachability
- then converts the updated evidence into rollout posture

---

## Exit Standard

We should consider unsupported self-serve confidence materially improved when:

- the highest-risk shared-library and access-state combinations are browser-proven end to end
- seeded role/access proof no longer depends on narrow academic overlap
- dense admin and institute recovery flows are reversible and truthful in-browser
- first-time operator confusion states are clearly differentiated from true product failure
- the confidence matrix can honestly upgrade broad self-serve confidence without leaning on support assumptions

At that point, remaining rollout caution should be mostly about scale choice and commercial readiness, not uncertainty in the product model.
