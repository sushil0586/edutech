# Operator 8 To 9 Confidence Execution Board

Last updated: 2026-07-08

## Purpose

This board turns the current `8 to 8.5/10` operator-confidence lanes into a concrete execution sequence.

Use it to answer:

1. which currently-working areas still sit below `9/10`
2. why those areas are not yet `9/10`
3. which UX, browser-proof, and seed-determinism tasks should land next
4. what must be true before we can honestly raise those operator lanes to `9/10`

Related documents:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)
- [FUNCTIONAL_P0_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_P0_EXECUTION_BOARD.md)
- [P1_HARDENING_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/P1_HARDENING_EXECUTION_BOARD.md)
- [INSTITUTE_TEACHER_9_TO_10_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/INSTITUTE_TEACHER_9_TO_10_CONFIDENCE_PLAN.md)
- [TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md)

---

## Current Read

### Target areas

The current matrix still keeps these lanes below `9/10`:

- Institute onboarding: `8.5/10`
- Teacher question bank: `8/10`
- Package access and entitlements: `8.5/10`
- Teacher / institute role consistency: `8/10`
- Registration / onboarding variations: `8/10`

### Why these are not yet `9/10`

The problem is no longer baseline correctness.

The remaining drag is concentrated in:

- lower-support operator teachability
- denser browser proof outside the happy path
- role-boundary explanation in-product rather than in team memory
- broader multi-institute and mixed-access setup realism
- narrower seed determinism in a few teacher and onboarding lanes

### Shared success bar

We should only move these lanes to `9/10` when all of the following are true:

- first-time operators can understand what is attached, missing, blocked, or role-limited from the UI alone
- the strongest remaining setup and entitlement mistakes have browser-proven recovery paths
- teacher and institute differences are visible as product rules, not hidden tribal knowledge
- the evidence does not depend on unusually lucky seeded subjects or one narrow institute setup
- repeated reruns of the highest-value suites stay green against the normal local seeded environment

---

## Status Legend

- `Open`: not started
- `In Progress`: currently being worked on
- `Ready for QA`: implementation complete, focused validation pending
- `Done`: verified and accepted
- `Blocked`: waiting on data, environment, or dependency repair

---

## Board Summary

| ID | Area | Title | Severity | Status | Owner |
| --- | --- | --- | --- | --- | --- |
| O89-01 | Onboarding | Make institute onboarding summary and recovery self-serve-safe | High | Done | Codex |
| O89-02 | Onboarding Variations | Prove broader multi-institute and mixed-access onboarding realism | High | Done | Codex |
| O89-03 | Role Clarity | Make teacher vs institute rules obvious in-product on dense authoring surfaces | High | Done | Codex |
| O89-04 | Teacher Question Bank | Raise teacher question-bank parity and seed determinism | High | Done | Codex |
| O89-05 | Economy | Reduce operator surprise in package and entitlement governance | High | Done | Codex |

---

## Recommended Execution Order

1. `O89-01` onboarding summary and recovery
2. `O89-02` onboarding variations and multi-institute realism
3. `O89-03` teacher vs institute rule clarity
4. `O89-04` teacher question-bank parity and determinism
5. `O89-05` economy/operator surprise reduction

Reason for this order:

- start with the first-run operator path that most affects self-serve confidence
- then widen setup realism so later browser proof is less assumption-driven
- then make role differences explicit before deepening teacher parity
- finish by reducing conceptual density in the heaviest governance surface

---

## Detailed Work Items

### O89-01 Institute Onboarding Summary And Recovery

Status: `Done`

Current rating:

- `8.5/10`

Problem:

- institute creation, presets, defaults, and access attachment already work
- the remaining gap is that first-time operators still need clearer final-state explanation and recovery guidance after apply

Primary user impact:

- unsupported operators may not know whether the institute is:
  - fully ready
  - created but under-configured
  - created with restricted package/access state

Acceptance criteria:

- one clear post-apply onboarding summary exposes:
  - what was created
  - what access was attached
  - which major academic or package choices were applied
  - what still needs operator action, if anything
- blocked or partial-setup paths expose:
  - what is missing
  - why it matters
  - which next route should fix it
- browser coverage proves:
  - successful setup summary
  - partial setup recovery
  - missing-access or missing-selection recovery

Likely implementation targets:

- `edutech_web/src/components/auth/registration-hub.tsx`
- `edutech_web/src/lib/auth/registration-state.ts`
- `edutech_web/src/app/api/admin/institutes/onboarding-profiles/route.ts`
- `edutech_web/src/app/api/admin/institutes/[id]/onboarding-runs/[runId]/tasks/route.ts`

Suggested spec targets:

- `tests/e2e/workflow/admin-onboarding-types.mutable.spec.ts`
- `tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts`

Signoff condition:

- a first-time operator can tell from the final onboarding screen whether the institute is truly ready and what to do next without support translation

Closure proof:

- `edutech_web/src/components/admin/academic-preset-apply-workspace.tsx`
  - onboarding result now includes a dedicated `Best next operator actions` recovery block
  - the summary now routes operators explicitly toward:
    - `Open Question Access`
    - `Open Academic Setup`
    - `Open Exams`
    - `Open People`
  - the completion state now distinguishes:
    - clean ready onboarding
    - access-only onboarding that still needs manual linking
    - revoked access follow-up
    - blocked or misaligned linking follow-up
    - audit-driven follow-up
- `tests/e2e/workflow/admin-onboarding-types.mutable.spec.ts`
  - `7 passed`
  - browser proof now covers both:
    - `Ready for guided use` when onboarding is structurally complete
    - `Needs operator follow-up` when package-enabled onboarding still requires manual shared-library linking before day-one builder usage

---

### O89-02 Broader Multi-Institute And Mixed-Access Onboarding Realism

Status: `Done`

Current rating:

- `8/10`

Problem:

- several onboarding combinations are browser-proven today
- broader multi-institute and lower-support rollout depth is still thinner than guided single-institute coverage

Primary user impact:

- rollout confidence drops when two institutes differ in presets, access, or allowed scopes and the product proof only reflects one clean guided setup

Acceptance criteria:

- browser coverage proves:
  - mixed access across more than one institute
  - no cross-institute leakage in onboarding or assignment state
  - different onboarding shapes remain understandable without hidden DB knowledge
- the final institute state remains easy to compare across variants

Likely implementation targets:

- `edutech_web/src/components/auth/registration-hub.tsx`
- `edutech_web/src/app/api/admin/institutes/onboarding-profiles/route.ts`
- `edutech_web/src/app/api/admin/institutes/[id]/onboarding-runs/[runId]/tasks/route.ts`

Suggested spec targets:

- `tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts`
- `tests/e2e/workflow/admin-multi-institute-pilot.mutable.spec.ts`
- `tests/e2e/workflow/admin-multi-institute-assignment-isolation.mutable.spec.ts`

Signoff condition:

- onboarding confidence no longer depends mostly on one supported single-institute setup shape

Closure proof:

- `edutech_web/tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts`
  - mutable browser flow now proves:
    - OPBMS package-scope recovery stays usable while a fresh mixed-preset institute is onboarded in the same run
    - onboarding summaries stay truthful across two different institute shapes:
      - `Ready for guided use`
      - `Needs operator follow-up`
    - package-enabled `access_only` onboarding explicitly routes operators toward manual shared-library linking instead of pretending the institute is day-one builder-ready
    - institute-side shared-library visibility remains isolated and usable after the mixed onboarding apply path
- verification:
  - `PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1 PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS=1 npx playwright test tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts --reporter=line`
  - result: `1 passed (58.1s)`

---

### O89-03 Teacher Vs Institute Rule Clarity On Dense Authoring Surfaces

Status: `Done`

Current rating:

- `8/10`

Problem:

- the role contracts work
- some intentional differences are still easier for us to explain than for operators to discover from the product itself

Primary user impact:

- teachers can still wonder why institute can link while they can only request
- institute admins can still misread linked/local/request-only boundaries during dense question-bank work

Acceptance criteria:

- shared-library and linked-library surfaces answer:
  - what this lane is for
  - why this action is available or unavailable for this role
  - who can complete the blocked action
- browser proof verifies visible explanation, not just visible or hidden buttons

Likely implementation targets:

- `edutech_web/src/components/ui/teacher-question-bank-workspace.tsx`
- `edutech_web/src/app/(teacher)/teacher/question-bank/page.tsx`
- `edutech_web/src/app/(institute)/institute/question-bank/page.tsx`
- `edutech_web/src/app/(institute)/institute/question-bank/library-linker/page.tsx`
- `edutech_web/src/app/(institute)/institute/question-bank/linked/page.tsx`

Suggested spec targets:

- `tests/e2e/workflow/teacher-institute-role-consistency.spec.ts`
- `tests/e2e/workflow/teacher-institute-shared-library-role-difference.spec.ts`
- `tests/e2e/workflow/teacher-question-bank-shared-library-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-workspace.spec.ts`

Signoff condition:

- teacher and institute operators can predict the next valid action from the UI alone on the densest question-bank surfaces

Closure proof:

- `edutech_web/src/components/ui/teacher-question-bank-workspace.tsx`
  - teacher shared-library lane now includes a dedicated `Teacher role in licensed intake` block
  - the workspace now states explicitly:
    - teachers can inspect and request
    - institute admins complete final linking in `Shared Library Linker`
    - post-link review should move to `Linked Questions`
- `edutech_web/src/app/(institute)/institute/question-bank/page.tsx`
  - institute question-bank workspace now includes a dedicated `Who completes licensed intake` explanation block
  - the workspace now makes the teacher vs institute handoff explicit on the intake boundary
- `edutech_web/src/components/ui/institute-shared-library-linker.tsx`
  - shared-library linker now includes a `Role boundary for this lane` explanation so operators do not confuse request visibility with final intake authority
- browser proof:
  - `npx playwright test tests/e2e/workflow/teacher-question-bank-shared-library-workspace.spec.ts --reporter=line`
    - result: `1 passed (5.3s)`
  - `npx playwright test tests/e2e/workflow/institute-question-bank-shared-library-workspace.spec.ts --reporter=line`
    - result: `1 passed (3.8s)`
  - `npx playwright test tests/e2e/workflow/teacher-institute-role-consistency.spec.ts --reporter=line`
    - result: `1 passed (11.4s)`

---

### O89-04 Teacher Question-Bank Parity And Seed Determinism

Status: `Done`

Current rating:

- `8/10`

Problem:

- local authoring, draft lifecycle, shared-library request-only contract, and bulk actions already work
- deeper parity with institute lanes and some dataset-sensitive cases remain thinner

Primary user impact:

- teachers are more likely than institute admins to feel that a lane is “sometimes there” rather than fully dependable when tag/topic or licensed-content state gets denser

Acceptance criteria:

- teacher browser coverage proves:
  - one dense local authoring/edit/reopen cycle
  - one dense shared-library request-to-reuse cycle
  - one deterministic mixed bulk lane with stable seed-backed expectations
- teacher proof no longer feels noticeably lighter than institute proof in the main question-bank surfaces

Likely implementation targets:

- `edutech_web/src/components/ui/teacher-question-bank-workspace.tsx`
- `edutech_web/src/lib/teacher/question-bank-form.ts`
- `edutech_web/src/lib/teacher/question-bank-validation.ts`
- `edutech_web/src/app/api/teacher/question-bank/create-lookups/route.ts`
- `edutech_web/src/app/api/teacher/question-bank/master-library/route.ts`
- `edutech_web/src/app/api/teacher/question-bank/master-library/[questionId]/request-access/route.ts`

Suggested spec targets:

- `tests/e2e/workflow/teacher-question-mutable.spec.ts`
- `tests/e2e/workflow/teacher-question-bank-linked-inventory.spec.ts`
- `tests/e2e/workflow/teacher-question-bank-shared-library-request.mutable.spec.ts`
- `tests/e2e/workflow/teacher-shared-library-builder-flow.mutable.spec.ts`

Signoff condition:

- teacher question-bank confidence feels comparable to institute baseline confidence rather than one step behind it

Closure proof:

- `edutech_web/tests/e2e/workflow/teacher-question-mutable.spec.ts`
  - mutable browser proof now covers:
    - create draft
    - save updated explanation
    - return to the main workspace
    - reopen the same draft from search
    - confirm saved state survives the reopen round-trip
    - deterministic bulk difficulty, availability, tag, and topic actions
  - verification:
    - `PLAYWRIGHT_ENABLE_MUTABLE_QUESTION_BANK_ACTIONS=1 npx playwright test tests/e2e/workflow/teacher-question-mutable.spec.ts --reporter=line`
    - result: `4 passed (33.9s)`
- `edutech_web/tests/e2e/workflow/teacher-question-bank-shared-library-request.mutable.spec.ts`
  - teacher request-only browser proof now covers:
    - request submission on a matching licensed source
    - request-pending state
    - blocked package state becoming requestable again after admin-side package recovery
  - verification:
    - `PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_REQUEST=1 npx playwright test tests/e2e/workflow/teacher-question-bank-shared-library-request.mutable.spec.ts --reporter=line`
    - result: `2 passed (32.7s)`
- `edutech_web/tests/e2e/workflow/teacher-shared-library-builder-flow.mutable.spec.ts`
  - builder proof no longer depends on ambient linked-inventory luck
  - the suite now resets and reseeds the demo shared-library workflow per run and aligns to the live teacher linked-row contract
  - browser proof now covers:
    - paused entitlement blocks attaching a linked shared row into builder
    - paused entitlement blocks updates to an already-attached linked shared row
  - verification:
    - `PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_BUILDER_FLOW=1 npx playwright test tests/e2e/workflow/teacher-shared-library-builder-flow.mutable.spec.ts --reporter=line`
    - result: `2 passed (17.6s)`

---

### O89-05 Package And Entitlement Governance Clarity

Status: `Done`

Current rating:

- `8.5/10`

Problem:

- package scope, propagation, revoke/reactivate, and recovery are already working
- the remaining risk is operator surprise caused by conceptual density in the economy model

Primary user impact:

- first-time operators can still misread:
  - package vs entitlement
  - current governing state vs historical/revoked state
  - which admin action will actually restore institute access

Acceptance criteria:

- the densest economy surfaces clearly separate:
  - current governing access
  - historical or revoked state
  - package scope
  - feature entitlement
  - institute-facing consequence
- browser coverage proves:
  - diagnosis from missing access to governing cause
  - correction
  - truthful institute-facing recovery
  - one wrong-choice recovery path that does not require backend inspection

Likely implementation targets:

- `edutech_web/src/components/admin/institute-economy-workspace.tsx`
- `edutech_web/src/components/admin/economy-question-bank-package-management-card.tsx`
- `edutech_web/src/components/admin/economy-question-bank-visibility-card.tsx`
- `edutech_web/src/components/admin/economy-content-access-policy-management-card.tsx`
- `edutech_web/src/components/admin/economy-subscription-plan-management-card.tsx`
- `edutech_web/src/app/(admin)/admin/economy/page.tsx`
- `edutech_web/src/app/(institute)/institute/economy/page.tsx`

Suggested spec targets:

- `tests/e2e/workflow/admin-economy-mutable.spec.ts`
- `tests/e2e/workflow/admin-economy-browser-coverage.spec.ts`
- `tests/e2e/workflow/admin-question-bank-package-editor.spec.ts`
- `tests/e2e/workflow/admin-economy-cross-role-package-propagation.mutable.spec.ts`
- `tests/e2e/workflow/admin-institute-question-bank-feature-recovery.mutable.spec.ts`
- `tests/e2e/workflow/institute-economy-mutable.spec.ts`

Signoff condition:

- an operator can diagnose and fix access-state problems from the economy UI alone with minimal ambiguity

Closure proof:

- `edutech_web/tests/e2e/workflow/admin-question-bank-package-visibility.spec.ts`
  - the admin visibility contract is now aligned to the current `Visibility` subsection rather than the older mixed subsection layout
  - browser proof verifies:
    - operator glossary
    - access-chain diagnosis order
    - entitlement-state controls
    - governing-row visibility on the densest question-bank governance surface
  - verification:
    - `npx playwright test tests/e2e/workflow/admin-question-bank-package-visibility.spec.ts --reporter=line`
    - result: `1 passed (13.8s)`
- `edutech_web/tests/e2e/workflow/admin-economy-mutable.spec.ts`
  - mutable governance proof verifies:
    - safe recovery after choosing the wrong subscription-plan apply target
    - revoked-history rows remain visibly separate from current governing access
    - feature-entitlement pause and reactivate actions stay truthful from the visibility surface
  - verification:
    - `PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS=1 npx playwright test tests/e2e/workflow/admin-economy-mutable.spec.ts --grep "wrong catalog apply target|revoked entitlement history from active governing access|pause and reactivate a feature entitlement from question-bank visibility" --reporter=line`
    - result: `3 passed (48.4s)`
- operator-confidence interpretation:
  - the remaining economy risk is no longer “which row is live?” or “which button really restores access?”
  - the residual work now sits mostly in support-ops breadth and routine maintenance for older institute-side enforcement specs that still assume the pre-split shared-library surface

---

## Exit Standard

We should consider this `8 to 9` operator-confidence plan complete when:

- institute onboarding ends in a truthful readiness summary with explicit recovery guidance
- mixed and multi-institute onboarding no longer feels narrower than guided single-institute proof
- teacher and institute role differences are visible as product rules on shared authoring surfaces
- teacher question-bank browser depth and seed stability no longer lag institute baseline depth materially
- package and entitlement governance remains understandable without support or backend inspection

At that point, the main remaining confidence gap should shift away from operator-teachability and toward broader rollout scale, network, and performance realism.
