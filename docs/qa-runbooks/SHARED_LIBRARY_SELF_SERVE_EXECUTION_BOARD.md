# Shared-Library Self-Serve Execution Board

Last updated: 2026-07-07

## Purpose

This board converts the shared-library self-serve confidence gap into a concrete execution list.

Use it when the goal is not just to prove that shared-library flows work, but to prove that they stay understandable and recoverable for unsupported operators.

This board is for work that is:

- high-value for broader rollout confidence
- concentrated in dense access-state combinations
- best validated through browser-driven role, entitlement, quota, and recovery proof

Related documents:

- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [FUNCTIONAL_END_TO_END_HARDENING_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_END_TO_END_HARDENING_PLAN.md)
- [FUNCTIONAL_P0_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_P0_EXECUTION_BOARD.md)
- [TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md)

---

## Current Board Goal

Raise shared-library confidence from “strong in guided flows” to “materially stronger for unsupported self-serve usage.”

Primary operator audiences:

- institute admins
- teachers
- platform admins
- support and onboarding operators

Current read:

- core shared-library behavior is now functionally strong
- the main remaining risk is not whether the flows exist, but whether dense access-state combinations remain teachable and stable without support help
- the next confidence gains will come from deeper entitlement-state proof, broader seeded realism, and stronger recovery evidence

---

## Status Legend

- `Open`: not started
- `In Progress`: currently being worked on
- `Ready for QA`: implementation complete, focused verification pending
- `Done`: verified and accepted
- `Blocked`: waiting on data, environment, or dependency repair

---

## Board Summary

| ID | Area | Title | Severity | Status | Owner |
| --- | --- | --- | --- | --- | --- |
| SL-01 | Role Split | Prove request-only versus link-capable behavior across deeper scoped lanes | High | Done | Codex |
| SL-02 | Access States | Cover package mismatch, quota exhausted, paused entitlement, and already-linked truth end to end | High | Open | Codex |
| SL-03 | Recovery | Prove self-serve recovery after wrong scope, wrong package state, and filtered-empty narrowing | High | Open | Codex |
| SL-04 | Seed Realism | Broaden deterministic shared-library seed breadth across cross-institute academic lanes | Medium | In Progress | Codex |
| SL-05 | Stability | Re-run the highest-value shared-library packs with reduced skip sensitivity and updated signoff notes | Medium | Open | Codex |

---

## Recommended Run Order

1. `SL-01` Prove request-only versus link-capable behavior across deeper scoped lanes
2. `SL-02` Cover package mismatch, quota exhausted, paused entitlement, and already-linked truth end to end
3. `SL-03` Prove self-serve recovery after wrong scope, wrong package state, and filtered-empty narrowing
4. `SL-04` Broaden deterministic shared-library seed breadth across cross-institute academic lanes
5. `SL-05` Re-run the highest-value shared-library packs with reduced skip sensitivity and updated signoff notes

Reason for this order:

- first lock the role contract in the densest lanes
- then deepen the entitlement-state truth that users actually experience
- then prove unsupported recovery behavior
- then remove seed fragility that can distort confidence
- then close with repeated-run stability and rollout-grade evidence

---

## Detailed Work Items

### SL-01 Request-Only Vs Link-Capable Depth

Status: `Done`

Problem:

- the main role split is now proven, but mostly in the strongest seeded lane rather than across a broader scoped surface

Primary user impact:

- teachers can still form the wrong expectation that matching package coverage implies direct linking power
- institute admins can still see scoped shared-library behavior that is technically correct but not yet deeply parity-tested against the teacher lane

Acceptance criteria:

- teacher browser proof shows request-only behavior in multiple scoped situations, not just one happy-path lane
- institute browser proof shows direct link capability only where the scope truly resolves and access is available
- the absence of wrong-role controls is asserted as strongly as the presence of the correct controls

Playwright coverage targets:

- teacher sees `Request Access` with no direct linking control in an entitled shared-library lane
- teacher still remains request-only when quota is tracked but not exhausted
- institute sees `Add to Institute Bank` only in truly linkable scoped lanes
- role split remains truthful after search narrowing and scope re-selection

Suggested spec targets:

- `tests/e2e/workflow/teacher-institute-shared-library-role-difference.spec.ts`
- `tests/e2e/workflow/teacher-question-bank-shared-library-request.mutable.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-link.mutable.spec.ts`

Signoff condition:

- shared-library role ownership is browser-proven deeply enough that a first-time teacher cannot reasonably infer institute-only linking power from the UI

Progress update:

- `edutech_web/src/components/ui/teacher-question-bank-workspace.tsx` now only offers teacher shared-library request actions when a compatible local subject can actually be resolved
- `edutech_backend/apps/question_bank/views/__init__.py` now respects explicit blank local scope values instead of always falling back to the source topic code, which removed a false teacher request failure path
- the default shared-library Playwright seed helper now prefers `DLI001` before `OPBMS`, which aligns seeded lanes with the default `demo-teacher` and `demo-institute-admin` credentials
- mutable and role-difference specs now select rows that resolve through the live academics APIs instead of assuming the first package-matching API row is locally actionable
- search probes in the shared-library mutable specs now use fuller question text and card-state assertions, which removed repeated collisions across near-duplicate seeded rows
- focused local rerun with mutable flags enabled now shows:
  - `teacher-institute-shared-library-role-difference.spec.ts` passed
  - `teacher-question-bank-shared-library-request.mutable.spec.ts` passed
  - `institute-question-bank-shared-library-link.mutable.spec.ts` now passes both mutable lanes
  - grouped result: `5 passed`
- closure read:
  - the teacher request-only versus institute link-capable contract is now browser-proven strongly enough to close `SL-01`
  - the earlier focused-pack skip is now closed as well, so the shared-library role-split pack is fully green in a clean isolated rerun

### SL-02 Access-State Depth

Status: `Open`

Problem:

- the product now expresses several entitlement and package states truthfully, but the deeper combinations are still spread across separate targeted specs rather than a more complete access-state matrix

Primary user impact:

- unsupported users may not distinguish:
  - no package coverage
  - scope mismatch
  - quota exhausted
  - paused entitlement
  - already-linked state

Acceptance criteria:

- each major shared-library access state is browser-proven with truthful user-facing explanation
- the same state should be understandable on both teacher and institute surfaces where applicable
- blocked states must not feel like missing data or broken UI

Playwright coverage targets:

- no matching package
- matching package but request-only teacher state
- quota exhausted teacher and institute state
- paused entitlement visibility and downstream blocker truth
- already-linked state with no duplicate link control

Suggested spec targets:

- `tests/e2e/workflow/teacher-question-bank-shared-library-no-entitlement.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-no-entitlement.spec.ts`
- `tests/e2e/workflow/teacher-question-bank-shared-library-quota-exhausted.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-quota-exhausted.spec.ts`
- `tests/e2e/workflow/teacher-shared-library-entitlement-enforcement.mutable.spec.ts`
- `tests/e2e/workflow/institute-shared-library-entitlement-enforcement.mutable.spec.ts`
- `tests/e2e/workflow/teacher-shared-library-publish-readiness.mutable.spec.ts`
- `tests/e2e/workflow/institute-shared-library-publish-readiness.mutable.spec.ts`

Signoff condition:

- the main shared-library blocked and allowed states are browser-proven and clearly distinguishable without backend inspection

### SL-03 Self-Serve Recovery Proof

Status: `Open`

Problem:

- many shared-library states are now correct, but unsupported-user confidence depends on whether people can recover after choosing the wrong scope or narrowing too far

Primary user impact:

- first-time operators may interpret filtered-empty or mis-scoped states as hard product failure

Acceptance criteria:

- at least three recovery paths are browser-proven from a realistically confusing starting point
- recovery should not require hidden team knowledge
- filters, scope pickers, and explanation copy should point to the recovery action directly

Playwright coverage targets:

- recover from wrong subject or topic narrowing
- recover from filtered-empty shared-library search
- recover from blocked matchable state after admin applies the matching package
- recover from linked-only state back into actionable local or builder flow

Suggested spec targets:

- `tests/e2e/workflow/institute-question-bank-bulk-eligibility-recovery.spec.ts`
- `tests/e2e/workflow/institute-shared-library-builder-flow.mutable.spec.ts`
- `tests/e2e/workflow/institute-linked-library-linker.spec.ts`
- `tests/e2e/workflow/teacher-question-bank-shared-library-request.mutable.spec.ts`

Signoff condition:

- shared-library recovery feels product-led instead of support-led

### SL-04 Deterministic Seed Breadth

Status: `In Progress`

Problem:

- current local proof is stronger than before, but seed breadth still depends on relatively narrow donor and target overlap

Primary user impact:

- confidence can be overstated if shared-library proof only stays green because a small number of seeded subjects happen to line up

Acceptance criteria:

- shared-library seed setup supports distinct proof for:
  - request-only teacher lane
  - linkable institute lane
  - quota exhausted lane
  - paused visibility lane
  - unentitled lane
- seed behavior stays deterministic even when donor overlap is imperfect

Implementation targets:

- expand donor and target academic overlap where practical
- keep subject assignment deterministic in helper and backend command logic
- reduce skips caused by lane-shape ambiguity rather than real regressions

Suggested implementation areas:

- `edutech_backend/apps/question_bank/management/commands/seed_demo_shared_library_access.py`
- `edutech_web/tests/e2e/helpers/demo-shared-library.ts`

Signoff condition:

- shared-library suites no longer rely on fragile subject luck or stale seeded assumptions to prove the main role and access states

Progress update:

- the shared-library seed helper now prefers `DLI001`, which aligns browser seeding with the default `demo-teacher` and `demo-institute-admin` credentials
- lane subject selection is now more deterministic and favors compatible donor-target overlap before falling back
- the master-library API now exposes matching platform packages even before entitlement is active, which allows blocked-but-matchable shared-library lanes to stay visible instead of collapsing into generic no-package state
- teacher shared-library request controls now stay gated to rows with active institute package coverage, so package-discoverable but unsubscribed rows no longer surface a false request action
- clean grouped rerun of:
  - `teacher-institute-shared-library-role-difference.spec.ts`
  - `teacher-question-bank-shared-library-request.mutable.spec.ts`
  - `institute-question-bank-shared-library-link.mutable.spec.ts`
  now lands at `5 passed`
- current residual has moved off this focused shared-library pack and back to separate backend paused-entitlement truth gaps, not browser proof for the main role/access contract

### SL-05 Stability Pack And Signoff

Status: `Open`

Problem:

- one-off green runs are useful, but broader rollout confidence needs stronger rerun stability and clearer signoff language

Primary user impact:

- rollout confidence stays artificially capped when the highest-value evidence is not grouped and repeated cleanly

Acceptance criteria:

- a focused shared-library rerun pack executes without skip-prone ambiguity in the main local environment
- residual risks are documented honestly after the rerun
- signoff language distinguishes:
  - guided rollout strength
  - unsupported self-serve strength

Suggested rerun pack:

- `tests/e2e/workflow/teacher-institute-shared-library-role-difference.spec.ts`
- `tests/e2e/workflow/teacher-question-bank-shared-library-request.mutable.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-link.mutable.spec.ts`
- `tests/e2e/workflow/teacher-question-bank-shared-library-quota-exhausted.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-quota-exhausted.spec.ts`
- `tests/e2e/workflow/teacher-shared-library-entitlement-enforcement.mutable.spec.ts`
- `tests/e2e/workflow/institute-shared-library-entitlement-enforcement.mutable.spec.ts`

Signoff condition:

- shared-library confidence can be described as a broad rollout-strength lane rather than a narrow guided-operator lane
