# Next Target: 8.5 To 9 Readiness Plan

Last updated: 2026-07-05

## Purpose

This plan defines the next hardening target after the current `8/10` controlled-pilot confidence state.

The goal is not new product expansion.

The goal is to make onboarding, question-bank access, and dense operational workflows safe enough for non-technical operators to use with minimal rescue.

Target outcome:

- current controlled pilot confidence: `8/10`
- next target confidence: `8.5 to 9/10`

Related documents:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [PLATFORM_HARDENING_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLATFORM_HARDENING_MATRIX.md)
- [P1_HARDENING_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/P1_HARDENING_EXECUTION_BOARD.md)
- [TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md)

---

## Target Statement

The next target is:

`Operator-safe onboarding + question-bank access clarity`

Plain-English meaning:

- a school admin or coaching-center operator should be able to create an institute
- apply academic defaults
- attach the correct content/package access
- understand exactly what got enabled
- recover from common mistakes without developer help

---

## Why This Is The Right Next Target

The product is already functionally strong in core lanes:

- institute onboarding works
- question-bank access logic works
- linked-question access works
- teacher and institute mutable baselines are browser-proven
- exam and results core workflows are stable

The biggest remaining risk is not missing functionality.

It is:

- operator confusion
- dense terminology
- hidden onboarding consequences
- insufficient explanation after access assignment

So the best next target is the shortest path to:

- lower support burden
- safer pilot rollout
- fewer entitlement/setup misunderstandings

---

## Scope

This target includes:

1. onboarding confirmation hardening
2. package / entitlement / access clarity hardening
3. comprehension authoring parity
4. broader onboarding variation testing
5. review and results realism follow-up

This target does not include:

- deep performance engineering
- new feature families
- major UI redesign outside clarity and usability improvements
- advanced analytics expansion

---

## Workstreams

## W1. Onboarding Confirmation Hardening

Status: `Done`

### Goal

Make onboarding outcomes explicit and easy to verify.

### Problems to solve

- operator may not fully understand what the preset just added
- operator may not know whether package access was attached
- operator may not know whether advanced builder access is active
- operator may not know whether content is linked-access only or materialized

### Deliverables

- a clear onboarding completion summary
- a visible “what was applied” breakdown
- a visible “what still needs attention” section when setup is partial

### Summary should show

- academic preset applied
- academic year values applied
- programs added
- subjects added
- topics added
- question-bank package attached
- access mode meaning
- advanced builder status
- any skipped or failed setup step

### Likely files

- `edutech_web/src/app/(admin)/admin/academic-setup/...`
- `edutech_web/src/app/(admin)/admin/institutes/...`
- institute onboarding or academic-default-related UI components
- supporting server actions for onboarding apply flows

### Acceptance criteria

- after onboarding, operator can explain what was added without checking the database
- partial setup always shows what succeeded and what still needs action
- no ambiguous success message like “defaults applied” without specifics

### Progress update

- added a stronger apply-success message that now includes academic structure and linked-question readiness context
- added a dedicated onboarding completion summary block in the admin academic setup flow
- split post-apply truth into:
  - completion status
  - what is ready now
  - still needs attention
- promoted revoked access, blocked linking, missing academic mapping, and audit findings into the top operator summary instead of leaving them buried in lower metrics

### Playwright coverage to add

- create institute + apply preset + verify summary
- apply preset with package access + verify summary
- apply preset with advanced builder enabled + verify summary
- partial / no-op setup path + verify warning copy

### Browser verification status

- onboarding summary contract is now covered in:
  - `edutech_web/tests/e2e/workflow/admin-onboarding-types.mutable.spec.ts`
- verified passing locally on 2026-07-05 for:
  - fresh full-preset onboarding
  - selected-subject onboarding
  - selected-topic-group onboarding
  - Class 8 math onboarding
  - package + advanced-builder onboarding
  - incomplete setup warning-path onboarding

---

## W2. Package And Entitlement Clarity Hardening

Status: `Done`

### Goal

Reduce confusion between package definition, entitlement record, feature access, and visible linked content.

### Problems to solve

- operators still mix up:
  - package
  - entitlement
  - feature grant
  - linked availability
- revoke/reactivate effects are not always obvious enough
- scope widening is correct technically, but can still feel mentally heavy

### Deliverables

- stronger explanation copy in economy and related onboarding flows
- safer lifecycle action labels
- clearer “why access is / is not available” diagnosis

### Minimum explanation model

- package:
  - defines coverage
- entitlement:
  - grants institute access to the package
- feature grant:
  - enables a gated capability
- linked availability:
  - shows what questions are actually visible/usable in the institute lane

### Likely files

- `edutech_web/src/components/admin/economy-question-bank-visibility-card.tsx`
- `edutech_web/src/components/admin/economy-*`
- `edutech_web/src/app/(admin)/admin/economy/page.tsx`
- institute economy views

### Acceptance criteria

- first-time operator can diagnose the most common access issue in under 2 minutes
- revoke vs reactivate vs restore wording is unambiguous
- package scope changes and entitlement changes feel clearly different

### Playwright coverage to add

- edit package scope and verify visible explanation updates
- revoke entitlement and verify truth message
- reactivate entitlement and verify recovery message
- feature grant missing vs entitlement missing diagnosis

### Progress update

- added a plain-language operator glossary in the question-bank visibility lane for:
  - package
  - institute access row
  - shared-library switch
  - linked or visible questions
- strengthened operator diagnosis copy for:
  - package coverage gap
  - institute access gap
  - shared-library switch gap
  - linked-question visibility gap
- changed feature recovery wording from generic `Unrevoke Feature` language to clearer shared-library switch recovery language
- the package editor now exposes live dependency impact and pre-save coverage-change summaries so operators can tell whether a save expands or shrinks institute-visible access
- governing rows and historical/revoked rows are now visually and operationally separated, with clearer restore and recovery language

### Browser verification status

- verified passing locally on 2026-07-05 for:
  - `edutech_web/tests/e2e/workflow/admin-economy-browser-coverage.spec.ts`
  - `edutech_web/tests/e2e/workflow/admin-question-bank-package-visibility.spec.ts`

### Current read

- the first-time-operator baseline for economy/package visibility is now strong enough to treat this workstream as complete for guided pilot usage
- controlled support-ops and policy-disable baselines are also browser-proven through mutable star-grant, entitlement lifecycle, and institute-admin policy-contract lanes
- remaining economy risk is now concentrated in denser catalog mutation paths and broader policy-surface combinations rather than basic package/access diagnosis

---

## W3. Comprehension Authoring Parity

### Goal

Bring teacher and institute comprehension authoring to the same confidence level as standard question authoring.

### Problems to solve

- baseline question authoring parity is now strong
- comprehension authoring parity is still not proven deeply enough

### Deliverables

- browser-proven teacher comprehension create/edit path
- browser-proven institute comprehension create/edit path
- parity note for any intentional differences

### Likely files

- teacher comprehension create/edit pages
- institute comprehension create/edit pages
- related Playwright workflow specs

### Acceptance criteria

- both roles can create and edit a comprehension set cleanly
- routes show truthful empty, success, and validation states
- both roles can understand when the passage is reusable and when it is role-scoped

### Playwright coverage to add

- teacher comprehension create/edit mutable spec
- institute comprehension create/edit mutable spec
- shared parity guardrail additions if needed

---

## W4. Broader Onboarding Variation Coverage

Status: `Done`

### Goal

Prove onboarding is reliable across real sales scenarios, not just one happy path.

### Variations to cover

1. blank onboarding
2. preset-only onboarding
3. access-only onboarding
4. preset plus package onboarding
5. preset plus package plus advanced builder onboarding
6. mixed-subject onboarding
7. existing institute update / reapply path

### Deliverables

- browser-tested scenario matrix
- explicit pass/fail notes by onboarding type
- deterministic data expectations for each variation

### Likely files

- onboarding Playwright specs
- onboarding test helpers
- current multi-institute onboarding plan docs

### Acceptance criteria

- every supported onboarding type has one browser-proven flow
- no onboarding mode relies on operator memory alone
- setup outcomes are visible and verifiable

### Playwright coverage to add

- one spec per onboarding type, or one matrix spec with isolated cases

### Progress update

- the onboarding matrix now browser-proves:
  - fresh full-preset onboarding
  - selected-subject onboarding
  - selected-topic-group onboarding
  - Class 8 math onboarding
  - package plus advanced-builder onboarding
  - existing institute reapply onboarding without duplicating academic structure
  - incomplete / blocked access setup warning-path onboarding with truthful validation feedback

---

## W5. Review And Results Realism Follow-Up

### Goal

Increase confidence after exam creation, not just before it.

### Problems to solve

- results and review shells are stable
- deeper manual-evaluation and reviewer realism still needs more proof

### Progress update

- teacher-side descriptive/manual-review mutation is now browser-proven through a disposable end-to-end lane that covers:
  - manual-review question authoring
  - disposable exam setup and assignment
  - student descriptive-answer submission
  - `manual_pending` review-task creation
  - teacher queue assignment
  - marks and review-notes save
- institute-side review workspace filtering, scoped queue handoff, filtered-empty recovery, and review-ready route reachability are browser-proven
- institute-side descriptive scoring mutation depth is still the main remaining gap in this workstream, alongside broader multi-reviewer realism

### Deliverables

- stronger review/result scenario coverage
- more truthful low-data and partially-ready state behavior
- clearer blocked vs pending vs ready explanations

### Likely files

- results workspace pages
- reviews workspace pages
- related route-level specs

### Acceptance criteria

- operators can understand why a page is empty, blocked, pending, or partially ready
- at least one descriptive/manual-review realistic lane is browser-proven

### Playwright coverage to add

- manual-review queue lifecycle
- unpublished vs published result states
- descriptive-answer result readiness

---

## Priority Order

### Phase A

1. W1 onboarding confirmation hardening
2. W2 package and entitlement clarity hardening

### Phase B

3. W3 comprehension authoring parity
4. W4 broader onboarding variation coverage
   - completed on 2026-07-05 for the supported single-institute onboarding matrix

### Phase C

5. W5 review and results realism follow-up

## Immediate execution sequence

If we want the highest-confidence next push with the least ambiguity, execute in this order:

1. Multi-learner results distribution
   - prove more than one assigned learner through publication and leaderboard posture
2. Institute-side descriptive review mutation
   - add one institute scoring lane to mirror the existing teacher mutation proof
3. Advanced economy catalog/policy combinations
   - extend beyond the already-proven support-ops and policy-disable baseline
4. Small-screen operator sanity
   - add one compact responsive baseline for dense admin, institute, and teacher shells

Why this order:

- it converts the most visible remaining yellow product lanes into concrete browser work
- it stays close to already-proven baselines instead of opening new risky surface area
- it gives us stronger rollout confidence before we spend time on broader performance or weaker-network work

---

## Success Criteria For This Target

We can call this target complete when:

- onboarding outcomes are explicit and operator-readable
- package and entitlement diagnosis is fast and reliable
- question-bank authoring parity includes comprehension flows
- major onboarding variations are browser-proven
- post-exam review/result states are clearer and more realistic

Remaining note:

- multi-institute onboarding and lower-support rollout depth should still be treated as the next follow-up, not as already-complete self-serve readiness

Expected confidence after completion:

- controlled pilot: `8.5 to 9/10`
- guided rollout: `8.5/10`
- open unmanaged production: still below `9/10` until performance validation is completed

---

## What Comes After This

Once this target is complete, the next major target should be:

`Performance, weak-network, and long-attempt confidence hardening`

That is the step that moves:

- guided rollout confidence upward
- open-production confidence upward
- exam-day operational trust upward

---

## Bottom Line

The product does not need more breadth first.

It needs:

- safer onboarding interpretation
- clearer access truth
- stronger parity on the last authoring gaps
- broader scenario proof

That is the shortest path from:

- “strong pilot-ready product”

to

- “high-confidence guided production product”
