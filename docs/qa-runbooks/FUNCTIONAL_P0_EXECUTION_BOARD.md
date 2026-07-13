# Functional P0 Execution Board

Last updated: 2026-07-09

## Purpose

This board converts the functional Phase 0 hardening plan into a concrete execution list.

Use it for the next end-to-end hardening cycle before broader low-support rollout.

This board is for work that is:

- functionally important for real operators
- still somewhat confusion-prone even when the system is technically correct
- best validated through browser-driven proof, truthful UX, and dense recovery checks

Related documents:

- [FUNCTIONAL_END_TO_END_HARDENING_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_END_TO_END_HARDENING_PLAN.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md)
- [TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md)
- [EXAM_CREATION_SCENARIO_CATALOG.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/EXAM_CREATION_SCENARIO_CATALOG.md)

---

## Current P0 Goal

Remove the remaining end-to-end operator-surprise zones before wider rollout.

Primary operator audiences:

- platform admins
- institute admins
- teacher-support staff
- academic coordinators
- question-bank operators

Current read:

- the platform is already strong enough for a controlled pilot with support
- the remaining P0 risk is concentrated in dense operator lanes, not in core baseline reachability
- the next confidence gains will come from clearer role truth, safer recovery paths, and denser browser proof

---

## Status Legend

- `Open`: not started
- `In Progress`: currently being worked on
- `Ready for QA`: implementation complete, focused browser/manual validation pending
- `Done`: verified and accepted
- `Blocked`: waiting on data, environment, or dependency repair

---

## Board Summary

| ID | Area | Title | Severity | Status | Owner |
| --- | --- | --- | --- | --- | --- |
| FP0-01 | Economy | Add reversible admin economy mutation coverage | High | Done | Codex |
| FP0-02 | Economy | Prove institute support-ops recovery under wrong access configuration | High | Done | Codex |
| FP0-03 | Economy | Tighten question-bank access language in dense control surfaces | Medium | Done | Codex |
| FP0-04 | Role Clarity | Expand teacher vs institute linked/shared-library role assertions | High | Done | Codex |
| FP0-05 | Role Clarity | Explain read-only and request-only teacher paths inline | High | Done | Codex |
| FP0-06 | Role Clarity | Strengthen seeded role-difference data realism | Medium | Done | Codex |
| FP0-07 | Question Bank | Deepen linked-question mental-model browser coverage | High | Done | Codex |
| FP0-08 | Question Bank | Add mixed bulk eligibility and recovery coverage | High | Done | Codex |
| FP0-09 | Question Bank | Expand import failure-state and duplicate-row realism | High | Done | Codex |

---

## Recommended Run Order

1. `FP0-05` Explain read-only and request-only teacher paths inline
2. `FP0-04` Expand teacher vs institute linked/shared-library role assertions
3. `FP0-07` Deepen linked-question mental-model browser coverage
4. `FP0-08` Add mixed bulk eligibility and recovery coverage
5. `FP0-01` Add reversible admin economy mutation coverage
6. `FP0-02` Prove institute support-ops recovery under wrong access configuration
7. `FP0-03` Tighten question-bank access language in dense control surfaces
8. `FP0-09` Expand import failure-state and duplicate-row realism
9. `FP0-06` Strengthen seeded role-difference data realism

Reason for this order:

- start with operator truthfulness and role clarity
- then harden dense question-bank behavior
- then close economy recovery confusion
- finish with data realism so the browser proof becomes more durable

---

## Detailed Work Items

### FP0-01 Reversible Admin Economy Mutation Coverage

Status: `Done`

Problem:

- economy logic is functionally strong, but mutation confidence is still narrower than operator risk
- admins can make correct changes today, but we still need stronger proof that they can safely reverse them without side effects

Primary user impact:

- support staff may hesitate before changing package scope or entitlement state
- rollback confidence depends too much on team familiarity

Acceptance criteria:

- at least two additional reversible economy mutation flows are browser-proven
- each flow verifies:
  - before state
  - mutation result
  - institute-facing runtime effect
  - successful reversal
- post-reversal state must be truthful in both admin and institute surfaces

Playwright coverage targets:

- package scope narrow then widen for the same institute
- entitlement deactivate then restore for a seeded academic lane
- feature grant disable then re-enable where the UX currently exposes that contract

Suggested spec targets:

- `tests/e2e/workflow/admin-economy-mutable.spec.ts`
- `tests/e2e/workflow/admin-package-scope.mutable.spec.ts`
- `tests/e2e/workflow/institute-question-bank-access-summary.spec.ts`

Signoff condition:

- one package-scope reversal and one entitlement/feature reversal are browser-proven end to end with truthful institute runtime visibility

---

### FP0-02 Institute Support-Ops Recovery After Wrong Access Configuration

Status: `Done`

Problem:

- when an institute is misconfigured, the product is often still correct, but the recovery sequence is not yet strongly proven

Primary user impact:

- support operators may troubleshoot the wrong layer or lose confidence in where to recover

Acceptance criteria:

- one dense browser workflow proves wrong configuration diagnosis and recovery
- the lane must cover:
  - missing or narrowed subject availability
  - operator-visible explanation of the problem
  - correction from admin side
  - institute-side confirmation after correction

Playwright coverage targets:

- institute linked library shows reduced availability
- admin widens scope or restores entitlement
- institute refresh confirms expected rows and explanation changes
- institute bulk-import workspace shows blocked state after feature pause and restored state after feature reactivation

Suggested spec targets:

- `tests/e2e/workflow/admin-economy-mutable.spec.ts`
- `tests/e2e/workflow/admin-institute-question-bank-feature-recovery.mutable.spec.ts`
- `tests/e2e/workflow/institute-question-bank-opbms-linked-science.spec.ts`
- `tests/e2e/workflow/teacher-institute-role-consistency.spec.ts`

Signoff condition:

- a support-style recovery lane is browser-proven without backend inspection or hidden manual knowledge
- current proof landed:
  - `admin-institute-question-bank-feature-recovery.mutable.spec.ts`
  - admin can pause `QUESTION_BANK_BULK_IMPORT`
  - institute sees the blocked import lane with truthful guidance
  - admin can reactivate the feature
  - institute regains the usable import workspace
- additional closure proof landed on `2026-07-07`:
  - `admin-package-scope-expansion-institute-linker.mutable.spec.ts`
  - `admin-package-scope-recovery-institute-linked.mutable.spec.ts`
  - admin can widen a math-only package to include Science
  - institute linked and shared-library lanes immediately recover Science source visibility after the admin fix
  - recovery now survives the real package-detail edit path instead of relying on stale editor state
- grouped closure proof landed on `2026-07-09`:
  - grouped operator rerun result: `16 passed`
  - grouped proof set included:
    - `admin-mixed-institute-onboarding.mutable.spec.ts`
    - `admin-package-scope-expansion-institute-linker.mutable.spec.ts`
    - `admin-package-scope-recovery-institute-linked.mutable.spec.ts`
    - `teacher-institute-shared-library-role-difference.spec.ts`
    - `teacher-question-bank-shared-library-workspace.spec.ts`
    - `institute-question-bank-shared-library-workspace.spec.ts`
    - `institute-question-bank-shared-library-no-entitlement.spec.ts`
    - `institute-question-bank-shared-library-quota-exhausted.spec.ts`
  - the final grouped proof no longer depends on flaky linker CTA routing or debug-only provisioning throttles
  - first-time operator recovery is now browser-proven across onboarding readiness, package-scope widening, blocked-state diagnosis, and institute-side confirmation
- post-submit continuity closure landed on `2026-07-08`:
  - seeded `NEET`, `JEE`, and `GRE` student family lifecycle rerun is green again after a clean suite reseed and runtime restart
  - grouped result: `3 passed`
  - backend now creates unpublished student result records on submit for non-immediate release modes, so the summary-side `Check result status` path is truthful
  - the student results workspace can now surface the pending-publication lane instead of silently omitting the just-submitted attempt

---

### FP0-03 Dense Question-Bank Access Language Polish

Status: `Done`

Problem:

- the densest access-control surfaces are now more correct than before, but some copy still assumes operator familiarity

Primary user impact:

- users can read the state but may still not immediately know what action to take next

Acceptance criteria:

- dense access surfaces use short, operator-facing language
- question-bank access panels answer:
  - what am I looking at
  - why is this available or unavailable
  - what should I do next
- zero-state and filtered-empty language remain distinct

Suggested implementation targets:

- `edutech_web/src/app/(institute)/institute/question-bank/page.tsx`
- `edutech_web/src/app/(teacher)/teacher/question-bank/page.tsx`
- related shared-library workspace components

Signoff condition:

- at least three dense access surfaces are reviewed and tightened so a first-time operator can act without external guidance
- closure proof landed on `2026-07-07`:
  - institute question-bank access chain now explains switch status, package coverage, linked stock, and next-step recovery in operator language
  - teacher question-bank access chain now explains visibility, package dependency, and request-only teacher role without assuming hidden product knowledge
  - teacher shared-library workspace now distinguishes package mismatch, quota exhaustion, and request-led review more directly
  - institute shared-library linker now separates missing package access, unseeded topic inventory, filtered-empty states, and real link-ready intake work

---

### FP0-04 Teacher Vs Institute Linked And Shared-Library Role Assertions

Status: `Done`

Problem:

- the broad role split is understood by us, but some role-difference proof is still concentrated in only the strongest existing lanes

Primary user impact:

- teachers may expect institute-owned actions to be editable from their side
- institute admins may assume teacher controls are broader than they actually are

Acceptance criteria:

- browser assertions explicitly prove role differences in:
  - linked inventory
  - shared-library intake
  - question-bank bulk actions
  - exam detail controls where parity is intentionally different
- assertions must validate both presence and absence of controls

Playwright coverage targets:

- teacher sees request-only or read-only contract where institute has mutate/link capability
- institute sees active linking/bulk controls for the same seeded academic lane
- exam-detail parity differences are asserted intentionally, not inferred

Suggested spec targets:

- `tests/e2e/workflow/teacher-institute-role-consistency.spec.ts`
- `tests/e2e/workflow/teacher-question-bank-shared-library-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-workspace.spec.ts`

Signoff condition:

- a new operator can infer the teacher vs institute control split directly from product behavior and browser evidence

Progress update:

- the central role-consistency browser lane now explicitly proves:
  - local question-bank bulk tooling is available to both teacher and institute in their normal local lane
  - institute linked-review mode intentionally hides bulk mutation controls
  - institute linked-review mode exposes linker and editable-copy recovery paths
  - teacher shared-library lane remains request-only with no direct linking controls
  - institute exam-detail route includes the richer readiness board that is intentionally absent from the teacher route
- focused browser coverage now passes for:
  - `tests/e2e/workflow/teacher-institute-role-consistency.spec.ts`
  - `tests/e2e/workflow/teacher-institute-shared-library-role-difference.spec.ts`

---

### FP0-05 Inline Teacher Read-Only And Request-Only Explanations

Status: `Done`

Problem:

- some teacher limitations are correct, but the reason still lives more clearly in team understanding than in the product

Primary user impact:

- correct restrictions can feel like bugs when explanation is weak or missing

Acceptance criteria:

- every intentional teacher read-only or request-only path in the targeted question-bank surfaces has concise inline explanation
- explanation must identify whether the reason is:
  - institute-owned content
  - package/licensing scope
  - role-restricted mutation

Suggested implementation targets:

- `edutech_web/src/app/(teacher)/teacher/question-bank/page.tsx`
- shared-library and linked-workspace UI components

Suggested spec targets:

- `tests/e2e/workflow/teacher-question-bank-shared-library-workspace.spec.ts`
- `tests/e2e/workflow/teacher-institute-role-consistency.spec.ts`

Signoff condition:

- teacher-side restricted paths no longer look silently broken or mysteriously disabled

Progress update:

- teacher question-bank top-of-page guidance now explains that the lane outcome is shaped by institute-owned licensing and role rules, not just the teacher workspace
- the shared-library readiness cards now distinguish:
  - institute-level visibility switch
  - institute package coverage
  - request-only teacher action path
- shared-library guidance now states directly that teachers cannot perform final linking from this lane
- focused browser coverage now passes for:
  - `tests/e2e/workflow/teacher-question-bank-shared-library-workspace.spec.ts`
  - `tests/e2e/workflow/teacher-question-bank-linked-inventory.spec.ts`
  - `tests/e2e/workflow/teacher-institute-role-consistency.spec.ts`

---

### FP0-06 Seeded Role-Difference Data Realism

Status: `Done`

Problem:

- several role-difference tests are valid, but some remain more fragile than ideal because seeded data breadth is narrow

Primary user impact:

- browser proof can become harder to trust when it depends on minimal or overly specific fixtures

Acceptance criteria:

- stage and local seeded datasets include enough variation to prove:
  - linked access present
  - linked access absent
  - institute-owned mutable rows
  - teacher-visible read-only rows
  - request-only shared-library lanes

Suggested targets:

- relevant backend seed/fixture paths for institute and teacher demo users
- stage validation notes in QA runbooks after data extension

Signoff condition:

- role-difference suites no longer rely on overly narrow seed assumptions to pass

Progress update:

- `edutech_web/tests/e2e/helpers/demo-shared-library.ts` now prefers distinct subject codes per seeded lane instead of silently reusing the same donor subject for every shared-library role-difference scenario
- the helper also supports per-lane subject overrides through environment variables when stage needs explicit pinning:
  - `PLAYWRIGHT_DEMO_SHARED_LIBRARY_BASE_SUBJECT_CODE`
  - `PLAYWRIGHT_DEMO_SHARED_LIBRARY_UNENTITLED_SUBJECT_CODE`
  - `PLAYWRIGHT_DEMO_SHARED_LIBRARY_QUOTA_SUBJECT_CODE`
  - `PLAYWRIGHT_DEMO_SHARED_LIBRARY_BLOCKED_SUBJECT_CODE`
  - `PLAYWRIGHT_DEMO_SHARED_LIBRARY_PAUSED_SUBJECT_CODE`
- `edutech_backend/apps/question_bank/management/commands/seed_demo_shared_library_access.py` now materializes missing target program/subject/topic rows when a quota or paused shared-library lane needs to link into a sparse demo institute
- the same seed command now tolerates intentionally disabled optional lanes during summary reporting instead of crashing on missing package objects
- `edutech_web/src/components/ui/teacher-question-bank-workspace.tsx` now preserves deferred shared-library bootstrap results instead of immediately resetting them back to the default empty prop state on teacher rerenders
- `edutech_web/tests/e2e/workflow/teacher-institute-shared-library-role-difference.spec.ts` now aligns with the real teacher request model:
  - teacher rows are requestable when matching package coverage exists and the institute still controls final linking
  - institute rows are chosen only from academic scopes that actually resolve through the live institute lookup APIs
- backend regression proof now passes for:
  - `./.venv/bin/python manage.py test --keepdb apps.question_bank.tests.test_master_sharing.MasterQuestionSharingTestCase.test_seed_demo_shared_library_access_creates_missing_target_scope_for_quota_lane`
- browser proof now passes for:
  - `tests/e2e/workflow/teacher-institute-shared-library-role-difference.spec.ts`
- current local audit on `2026-07-07` still shows the default donor institute `PUB001` only overlaps with `OPBMS` on three subject codes:
  - `CLS7-MATH`
  - `CLS7-SCI`
  - `CLS8-MATH`
- that means full five-lane academic separation still depends on expanding the donor or target seeded academic overlap in backend demo data, but the seeded role-difference proof no longer depends on fragile stale-runtime assumptions or a teacher-side deferred-render reset bug

---

### FP0-07 Linked-Question Mental-Model Coverage

Status: `Done`

Problem:

- question bank is strong in baseline use, but linked-question reasoning is still a likely surprise zone under dense filtering

Primary user impact:

- operators may confuse local drafts, linked masters, duplicate-first reuse behavior, or filtered-empty states

Acceptance criteria:

- linked-question coverage proves:
  - local vs linked distinction
  - duplicate-first reuse behavior
  - recovery after no-result filtering
  - recovery after narrowed academic selection

Playwright coverage targets:

- switch between local and linked modes with truthful summary changes
- prove linked selection can reuse existing content when expected
- prove the operator can recover from zero-result filtering without confusion

Suggested spec targets:

- `tests/e2e/workflow/institute-linked-library-linker.spec.ts`
- `tests/e2e/workflow/institute-question-bank-linked-vs-local.spec.ts`
- `tests/e2e/workflow/institute-question-bank-access-summary.spec.ts`

Signoff condition:

- linked behavior feels explicit and teachable rather than “works if you already know the model”

Progress update:

- added a focused browser lane that now proves:
  - local lane vs linked lane distinction
  - linked-review mode hides bulk mutation
  - duplicate-first editing from linked rows
  - filtered-zero linked recovery with reset path
  - recovery back to the full linked view
- the institute linked-question evidence now also remains supported by the broader linked-science and linker journey specs
- focused browser coverage now passes for:
  - `tests/e2e/workflow/institute-question-bank-linked-mental-model.spec.ts`
  - `tests/e2e/workflow/institute-question-bank-opbms-linked-science.spec.ts`
  - `tests/e2e/workflow/institute-linked-library-linker.spec.ts`

---

### FP0-08 Mixed Bulk Eligibility And Recovery Coverage

Status: `Done`

Problem:

- bulk actions are already partly proven, but mixed eligibility cases remain one of the highest operator-density risk zones

Primary user impact:

- users may not understand why some selected rows are mutable and others are not
- a failed or partial bulk attempt may feel nondeterministic

Acceptance criteria:

- institute linker coverage proves:
  - ready-to-add rows are visibly actionable before filtering
  - a seeded linked-only slice is visibly non-mutable
  - narrowing filters to a zero-result search keeps recovery guidance truthful
  - clearing the narrowing filter restores the actionable lane cleanly

Playwright coverage targets:

- institute shared-library linker ready-state browser proof
- institute shared-library linked-only seeded-state browser proof
- institute shared-library filtered-empty recovery browser proof

Suggested spec targets:

- `tests/e2e/workflow/institute-question-bank-bulk-eligibility-recovery.spec.ts`

Signoff condition:

- institute intake remains understandable when a topic shifts between ready rows, already-linked seeded rows, and zero-result recovery states

Closure proof:

- `tests/e2e/workflow/institute-question-bank-bulk-eligibility-recovery.spec.ts`
  - `1 passed`
  - institute shared-library linker now browser-proves:
    - visible ready-to-add rows before narrowing
    - visible row-level non-mutability for already-linked seeded rows
    - truthful empty/recovery guidance after an over-narrow search
    - clean return to the actionable lane after clearing the search

---

### FP0-09 Import Failure-State And Duplicate-Row Realism

Status: `Done`

Problem:

- import preview/finalize is now strong operationally, but failure-state and duplicate-content realism still needs broader browser proof

Primary user impact:

- import users may understand the happy path but not trust validation feedback in messy files

Acceptance criteria:

- browser coverage proves:
  - malformed file rejection
  - mixed valid/invalid rows
  - duplicate-content row handling
  - comprehension-linked edge behavior where relevant
- preview and finalize messaging must distinguish:
  - what is blocked
  - what can still proceed
  - what the operator should fix first

Playwright coverage targets:

- invalid column structure
- partial row validation failure
- duplicate-content rows inside the same import set
- duplicate-content rows against existing library state where supported

Suggested spec targets:

- `tests/e2e/workflow/institute-question-import-export.spec.ts`
- `tests/e2e/workflow/teacher-question-import-export.spec.ts`
- `tests/e2e/workflow/question-import-mutable.spec.ts`

Signoff condition:

- import no longer feels strong only for clean files; messy operator input also produces truthful, actionable outcomes
- closure proof landed on `2026-07-07`:
  - `edutech_web/src/components/ui/teacher-question-import-workspace.tsx` now separates mixed preview states from blocked finalize recovery and preserves row-level failure guidance after partial final import
  - `tests/e2e/workflow/question-import-mutable.spec.ts` now browser-proves:
    - malformed CSV rejection with truthful required-column messaging
    - mixed valid/invalid preview handling with duplicate-content rows in the same file
    - valid-row proceedability while duplicate rows stay blocked
    - finalize-time recovery guidance when a blocked row survives preview and fails on the final backend pass
  - browser verification passed with `PLAYWRIGHT_ENABLE_MUTABLE_IMPORT_ACTIONS=1 npm exec playwright test tests/e2e/workflow/question-import-mutable.spec.ts`

---

## Post-P0 Next Focus

FP0 functional hardening is now effectively closed.

Recommended next execution order from here:

1. Student `9.5` confidence finish
2. Unsupported self-serve breadth
3. Performance and scale hardening
4. Stage upgrade and higher-volume validation

What this means in practice:

- first, close the remaining student confidence gaps:
  - deeper descriptive and manual-evaluation realism
  - broader long-tail results and history combinations
  - repeated-run proof in the densest student lifecycle lanes
- second, widen unsupported self-serve proof beyond the now-green first-time operator pack:
  - more seed shapes
  - more multi-institute variations
  - more lower-support onboarding and recovery reruns
- third, return to performance and capacity validation before broad rollout claims:
  - route-level hot paths
  - browser-heavy operator flows
  - stage-scale validation against larger seeded volumes

Primary handoff documents:

- [STUDENT_9_5_CONFIDENCE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_9_5_CONFIDENCE_EXECUTION_BOARD.md)
- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)
- [STAGE_SCALE_UP_VALIDATION_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_VALIDATION_RUNBOOK.md)

---

## Exit Standard For Functional P0

Functional P0 is complete when:

- major teacher vs institute differences are visible in-product and browser-proven
- dense question-bank behavior is understandable under linked, filtered, mixed-bulk, and import-recovery conditions
- economy recovery no longer depends on hidden operator knowledge
- the remaining unknowns are breadth and realism questions for later phases, not core operator-surprise risks
