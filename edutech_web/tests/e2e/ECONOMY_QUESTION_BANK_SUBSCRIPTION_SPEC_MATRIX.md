# Economy, Subscription, and Question-Bank Spec Matrix

## Purpose

This document defines the spec set we want in place before pushing deeper into:

- subscription expansion
- question-bank entitlement rollout
- shared library adoption flows
- package-scoped exam visibility and access behavior

This is not just a product plan.
It is an executable automation/specification map intended to answer:

1. what is already implemented and covered
2. what is implemented but not yet confidently specified
3. what is still blocked by product/runtime gaps

## Current Position

As of `2026-06-27`, the repo already has meaningful runtime support in this area:

- student wallet and subscriptions surfaces
- referral onboarding and referral-code capture
- admin economy governance and mutable catalog actions
- institute-admin economy support controls
- platform-admin economy support policy controls
- backend entitlement and shared-library support for master questions
- shared-library UI now visible in teacher and institute question-bank screens

That means the next confidence step is not broad implementation-first work.
It is spec-first hardening.

## Core Confidence Goal

Before we expand more subscription and question-bank behavior, we want confidence in four layers:

1. economy requests are truthful
2. admin and institute support actions are policy-bounded
3. shared question-bank access behaves correctly by entitlement and role
4. exam and student visibility behavior stays correct when economy or library gating applies

## Spec Categories

## A. Student Economy Runtime

### A1. Wallet request truthfulness

#### Expected behavior

- student can request a star pack
- request does not instantly increase wallet balance
- request appears as pending or requested state
- copy does not promise instant settlement

#### Current status

- implemented
- partially covered

#### Existing specs

- `tests/e2e/workflow/student-economy-mutable.spec.ts`
- `tests/e2e/workflow/student-utility-workspace.spec.ts`

#### Confidence note

This lane is already decent for basic truthfulness, but it still leans on runtime availability of request buttons.

### A2. Subscription request truthfulness

#### Expected behavior

- student can request a subscription plan cycle
- request does not instantly activate subscription
- request does not instantly credit stars unless already operator-confirmed
- subscription page explains pending vs active vs credited states clearly

#### Current status

- implemented
- partially covered

#### Existing specs

- `tests/e2e/workflow/student-economy-mutable.spec.ts`
- `tests/e2e/workflow/student-utility-workspace.spec.ts`

### A3. Settled-state visibility after operator confirmation

#### Expected behavior

- after admin confirms a pending order:
  - wallet balance increases when the order credits stars
  - or active subscription becomes visible when the order activates a plan
- student sees the settled state in the correct surface

#### Current status

- implemented
- covered in mutable lane

#### Existing specs

- `tests/e2e/workflow/student-economy-mutable.spec.ts`

### A4. Referral onboarding to reward visibility

#### Expected behavior

- student can register with a referral code
- valid referral path creates reward effects according to program rules
- wallet and profile expose referral identity and reward visibility truthfully

#### Current status

- implemented
- partially covered

#### Existing specs

- `tests/e2e/workflow/student-referral-onboarding.mutable.spec.ts`

#### Additional spec still useful

- explicit wallet-ledger assertion for referral reward entry after onboarding

## B. Admin Economy Governance

### B1. Workspace contract

#### Expected behavior

- `/admin/economy` loads
- governance cards for packs, plans, referral programs, reward rules, content access, unlock rules, and policy settings are visible
- support workspace is visible

#### Current status

- implemented
- covered

#### Existing specs

- `tests/e2e/workflow/admin-economy-workspace.spec.ts`

### B2. Mutable catalog CRUD

#### Expected behavior

- platform admin can create or update:
  - star packs
  - referral programs
  - reward rules
  - content access policies
  - unlock rules
  - subscription plans

#### Current status

- implemented
- covered in mutable lane

#### Existing specs

- `tests/e2e/workflow/admin-economy-mutable.spec.ts`

### B3. Controlled support actions

#### Expected behavior

- platform admin can:
  - inspect wallet state
  - grant stars
  - confirm pending orders
  - refresh unlock state

#### Current status

- implemented
- covered

#### Existing specs

- `tests/e2e/workflow/admin-economy-workspace.spec.ts`
- `tests/e2e/workflow/admin-economy-mutable.spec.ts`

### B4. Economy operator policy control

#### Expected behavior

- platform admin can update institute-admin support policy
- update persists through API
- audit trail becomes visible
- institute mutable behavior obeys the policy

#### Current status

- implemented
- covered

#### Existing specs

- `tests/e2e/workflow/admin-economy-mutable.spec.ts`
- `tests/e2e/workflow/admin-settings-workspace.spec.ts`
- `tests/e2e/workflow/admin-institute-economy-policy-contract.mutable.spec.ts`

## C. Institute Economy Runtime

### C1. Workspace contract

#### Expected behavior

- `/institute/economy` loads
- institute sees exam-economy visibility plus support controls
- copy truthfully states platform-owned governance boundaries

#### Current status

- implemented

### C2. Institute subscription request to activation workflow

#### Expected behavior

- institute admin can submit a package-bearing subscription request
- platform admin can reject or approve it
- rejection leaves the package inactive
- approval materializes real institute package entitlements

#### Current status

- implemented
- strongly covered in mutable lane

#### Existing specs

- `tests/e2e/workflow/admin-institute-subscription-request.mutable.spec.ts`

#### Recommended execution

- `npm run test:e2e:mutable:subscription-request`

### C3. Shared-library entitlement enforcement after activation

#### Expected behavior

- when an institute or teacher has an active matching package, shared-library content is available
- when the entitlement is paused, the same content becomes truthfully blocked
- buttons and copy reflect the blocked state without ambiguity
- entitlement is restored after the test

#### Current status

- implemented
- covered in mutable enforcement lanes

#### Existing specs

- `tests/e2e/workflow/institute-shared-library-entitlement-enforcement.mutable.spec.ts`
- `tests/e2e/workflow/teacher-shared-library-entitlement-enforcement.mutable.spec.ts`

#### Recommended execution

- `npm run test:e2e:mutable:shared-library-enforcement`
- covered

#### Existing specs

- `tests/e2e/workflow/institute-economy-workspace.spec.ts`

### C2. Policy-bounded star grants

#### Expected behavior

- institute admin can grant stars only when current economy policy allows it
- if disabled by platform policy, mutable lane skips or blocks appropriately
- if enabled, wallet increases correctly

#### Current status

- implemented
- covered

#### Existing specs

- `tests/e2e/workflow/institute-economy-mutable.spec.ts`

### C3. Policy-bounded order confirmation

#### Expected behavior

- institute admin can confirm pending orders only when policy allows it
- student settled state updates correctly after confirmation

#### Current status

- implemented
- covered

#### Existing specs

- `tests/e2e/workflow/institute-economy-mutable.spec.ts`

## D. Teacher and Institute Question-Bank Shared Library

This is the most important next spec lane before further question-bank subscription development.

### D1. Shared-library workspace visibility

#### Expected behavior

- teacher question-bank page shows shared platform library section
- institute question-bank page shows shared platform library section
- empty state and load-error state are truthful
- scoped items reflect active subject/topic filters when present

#### Current status

- implemented
- covered

#### Existing specs

- `tests/e2e/workflow/teacher-question-bank-shared-library-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-workspace.spec.ts`

### D2. Teacher request-access flow

#### Expected behavior

- teacher can see access state for shared questions
- teacher can request access when entitlement is not yet linked
- request action returns success state or pending state visibly
- teacher cannot directly perform institute-admin-only link action

#### Current status

- implemented
- covered

#### Existing specs

- `tests/e2e/workflow/teacher-question-bank-shared-library-request.mutable.spec.ts`

### D3. Institute-admin link flow

#### Expected behavior

- institute admin can link shared question into local bank when entitlement allows it
- linked question appears materialized in local question inventory
- linked question is treated as read-only library-derived content
- duplicate/edit behavior follows current linked-question rules

#### Current status

- implemented
- covered

#### Existing specs

- `tests/e2e/workflow/institute-question-bank-shared-library-link.mutable.spec.ts`

### D4. No-entitlement / mismatch behavior

#### Expected behavior

- when no matching package exists:
  - request-access should fail cleanly or remain unavailable
  - link action should not appear for institute admin
- workspace must not imply access exists when it does not

#### Current status

- implemented in backend rules
- covered in E2E

#### Existing specs

- `tests/e2e/workflow/teacher-question-bank-shared-library-no-entitlement.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-no-entitlement.spec.ts`

## E. Exam and Student Visibility Behavior

This category is where subscription and question-bank entitlement work eventually converges.

### E1. Economy-gated exam visibility

#### Expected behavior

- `open access` exams appear normally
- `stars_only` exams show wallet handoff
- `entitlement_only` exams show the correct access explanation
- `stars_or_entitlement` exams show either path truthfully

#### Current status

- implemented
- partially covered across student exam-detail mutable and admin/institute exam creation matrices

#### Existing specs

- `tests/e2e/workflow/student-exam-detail-mutable.spec.ts`
- exam creation matrix specs

### E2. Shared-question-linked exam authoring

#### Expected behavior

- a linked shared-library question can be used in an exam builder flow
- question remains correctly scoped and visible
- student runtime is unaffected by the question’s source-materialization origin

#### Current status

- covered by a dedicated mutable institute authoring lane
- shared-library linkage is now traced into disposable exam-builder attachment

#### Implemented spec

- `tests/e2e/workflow/institute-shared-library-builder-flow.mutable.spec.ts`

### E3. Package-scoped visibility behavior

#### Expected behavior

- platform-created public exams remain visible to all eligible students
- institute-created exams remain institute-scoped
- question-bank package access controls only what should be visible in authoring and linkage, not unrelated public discovery

#### Current status

- runtime behavior is implemented and now explicitly contract-covered in backend access tests
- operator visibility is covered for read-only inspection

#### Implemented coverage

- backend student-availability contract coverage in `apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase`
- mutable student discovery contract in `tests/e2e/workflow/student-question-bank-entitlement-visibility-contract.mutable.spec.ts`
- package and entitlement operator visibility in `tests/e2e/workflow/admin-question-bank-package-visibility.spec.ts`

#### Confidence note

- current product contract is that question-bank packages and institute entitlements influence authoring/linkage rights
- they do not currently drive student exam discovery filters directly
- student discovery remains governed by assignment, source, institute scope, and exam availability rules

### E4. Subscription-to-package mapping visibility

#### Expected behavior

- platform admin can inspect which question-bank packages are attached to each subscription plan
- plan cards show mapping truth without needing mutable controls first
- existing package visibility and entitlement views stay consistent with plan-link summaries

#### Current status

- covered for read-only and mutable admin subscription-plan mapping
- attach and detach controls now exist in the admin subscription governance lane

#### Implemented coverage

- backend subscription-plan admin API now includes `question_bank_package_links`
- admin economy subscription card renders question-bank package link summaries
- admin economy subscription card can attach and detach same-institute question-bank packages
- API regression coverage is included in `apps.economy.tests.test_api.EconomyApiTestCase`
- workspace surface coverage remains in `tests/e2e/workflow/admin-economy-workspace.spec.ts`
- mutable E2E coverage is included in `tests/e2e/workflow/admin-economy-mutable.spec.ts`

## Spec Execution Order

To build confidence with the least waste, the recommended order is:

1. deeper unlock-refresh spec if reversible runtime setup exists
2. package-scoped exam visibility specs
3. unlock-refresh deep mutable coverage when a reversible fixture exists

## Immediate Spec Backlog

These are the next files we should create before expanding subscription/question-bank behavior further:

1. `tests/e2e/workflow/teacher-question-bank-shared-library-no-entitlement.spec.ts`
2. `tests/e2e/workflow/institute-question-bank-shared-library-no-entitlement.spec.ts`
3. package-scoped exam visibility specs
4. unlock-refresh deep mutable coverage when a reversible fixture exists

## Definition Of Confidence Before Next Implementation Round

We can say we are ready to move deeper into subscription/question-bank gaps when:

- student economy truthfulness is still passing
- admin economy mutable governance is still passing
- institute economy mutable support is still passing
- teacher and institute shared-library screens are covered
- request-access and link flows are covered
- at least one negative entitlement mismatch path is covered
- admin package and entitlement operator visibility is covered

Current result as of `2026-06-27`:

- satisfied

New operator-visibility coverage added:

- `tests/e2e/workflow/admin-question-bank-package-visibility.spec.ts`
- backend read APIs:
  - `/api/v1/economy/admin/question-bank-packages/`
  - `/api/v1/economy/admin/question-bank-entitlements/`

## What This Document Does Not Claim Yet

This document does not claim confident coverage for:

- full subscription-entitlement packaging logic by family
- package-driven exam discovery restrictions
- end-to-end paid settlement automation with real payment providers
- full linked-question exam-builder delivery lifecycle from shared library to student attempt

Those are the next implementation and spec waves after this confidence layer.
