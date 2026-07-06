# P0 Hardening Execution Checklist

Last updated: 2026-07-04

## Purpose

This is the execution checklist for the current hardening cycle.

It converts the high-level platform hardening matrix into concrete P0 work items with:

- bug IDs
- problem statements
- acceptance criteria
- Playwright coverage targets
- signoff conditions

Use this document as the operational checklist before moving to P1.

---

## Current P0 Goal

Make the institute onboarding, package access, entitlement visibility, linked-question access, and exams workspace safe and understandable for real non-technical operators.

Primary operator audiences:

- institute admins
- coaching center operators
- academic coordinators
- teacher-support staff

---

## Status Legend

- `Open`: not started
- `In Progress`: currently being fixed
- `Ready for QA`: implementation done, browser/manual verification pending
- `Done`: verified through focused QA and accepted
- `Blocked`: cannot proceed without data, environment, or dependency repair

---

## P0 Board

| ID | Area | Title | Severity | Status | Owner |
| --- | --- | --- | --- | --- | --- |
| P0-01 | Onboarding | Make onboarding outcome and attached access easier to verify | High | Done | Codex |
| P0-02 | Question Bank | Clarify linked question access versus package coverage versus local inventory | High | Done | Codex |
| P0-03 | Economy | Reduce operator confusion between package, entitlement, feature access, and runtime availability | High | Done | Codex |
| P0-04 | Economy | Make revoked and active entitlement states unmistakably different | Medium | Done | Codex |
| P0-05 | Exams | Keep filtered state, no-result state, and recovery actions clearly visible | Medium | Done | Codex |
| P0-06 | Package Scope | Make scope editing safer and easier to understand for operators | High | Done | Codex |

## Latest Verification Snapshot

- Broad institute browser workspace rerun:
  - `14 passed`
- Focused institute mutable rerun:
  - `3 passed`
  - `1 skipped`
- Admin economy and package editor rerun after the latest operator-clarity fixes:
  - `9 passed`
- Focused mutable revoked-access regression:
  - `1 passed`
- Focused mutable package-scope rerun:
  - `2 passed`
- Current interpretation:
  - covered institute runtime is technically stable
  - the original P0 operator-facing package-scope and entitlement-recovery gaps are now materially reduced
  - latest mutable package widening and OPBMS science entitlement restoration are browser-proven
  - remaining risk has shifted from baseline clarity into operator-language polish, zero-state consistency, and deterministic shared-library mutation coverage

---

## Detailed Work Items

### P0-01 Onboarding Outcome Clarity

Status: `Done`

Problem:

- Operators can complete onboarding, but may still be unsure what exactly got created or attached.
- This is especially risky when academic presets, package access, and advanced builder access are combined in one flow.

Primary user impact:

- Users do not know whether onboarding succeeded fully or partially.
- Users do not know whether questions should already be visible after setup.

Acceptance criteria:

- After onboarding submit, the UI must show a clear summary of:
  - institute created or updated
  - academic preset applied or not
  - subjects/topics loaded or not
  - question-bank package access attached or not
  - advanced builder access attached or not
- Partial outcomes must be clearly marked.
- The user must have one-click follow-up actions:
  - open institute people
  - open academic setup
  - open question bank
  - open exams
- Failure messages must identify the failed section, not just generic failure.

Playwright coverage targets:

- create a fresh institute with preset only
- create a fresh institute with preset + package access
- create a fresh institute with preset + package access + advanced builder access
- re-run onboarding for an existing institute and verify summary remains truthful

Suggested spec targets:

- `tests/e2e/workflow/admin-institute-onboarding-summary.mutable.spec.ts`
- `tests/e2e/workflow/admin-institute-onboarding-access-combinations.mutable.spec.ts`

Signoff condition:

- Two different onboarding combinations succeed through UI only and produce truthful summaries.

Implemented in:

- `edutech_web/src/components/admin/academic-preset-apply-workspace.tsx`
- `edutech_web/src/app/globals.css`

Browser proof:

- `tests/e2e/workflow/admin-onboarding-types.mutable.spec.ts`

---

### P0-02 Linked Questions vs Coverage Clarity

Status: `Done`

Problem:

- Users still confuse:
  - local institute questions
  - linked platform questions
  - package scope
  - visible filtered rows
  - total available rows

Primary user impact:

- The system may be correct, but users think questions are missing or duplicated.

Acceptance criteria:

- Institute question-bank pages must clearly separate:
  - local questions
  - linked platform questions
  - current filtered result
  - total linked availability for current academic selection
- Linked question pages must always show a short summary of:
  - package-backed access exists
  - current academic selection
  - currently visible rows
  - how to widen or narrow the result
- Empty states must distinguish:
  - no linked access exists
  - linked access exists but current filters returned zero

Playwright coverage targets:

- institute with only math access
- institute with math + science access
- filter to a subject with access and verify counts
- filter to a subject without access and verify clear explanation
- switch between local and linked modes and verify summary changes

Suggested spec targets:

- `tests/e2e/workflow/institute-question-bank-access-summary.spec.ts`
- `tests/e2e/workflow/institute-question-bank-linked-vs-local.spec.ts`

Signoff condition:

- A new operator can tell why they see 650 math, 900 science, or zero rows without backend inspection.

Implemented in:

- `edutech_web/src/app/(institute)/institute/question-bank/page.tsx`

Browser proof:

- `tests/e2e/workflow/institute-linked-library-linker.spec.ts`
- `tests/e2e/workflow/institute-question-bank-opbms-linked-science.spec.ts`

---

### P0-03 Economy Access-Chain Clarity

Status: `Done`

Problem:

- Economy currently requires the operator to mentally connect:
  - content in master library
  - package scope
  - entitlement state
  - feature grant state
  - institute runtime availability

Primary user impact:

- Operators troubleshoot the wrong layer.

Acceptance criteria:

- Economy question-bank visibility must clearly explain the access chain in operator language.
- Each institute-facing package/entitlement row must make it easy to answer:
  - does the package include this subject/topic?
  - is the entitlement active?
  - is runtime feature access active?
  - what should I do next?
- Guidance must be visible without reading large blocks of text.
- The page must make “why no access?” diagnosable in one scan.

Playwright coverage targets:

- active package + active entitlement + active feature access
- active package + revoked entitlement
- package missing science scope
- feature access disabled while package exists

Suggested spec targets:

- `tests/e2e/workflow/admin-economy-access-chain-clarity.mutable.spec.ts`
- `tests/e2e/workflow/admin-economy-question-bank-diagnostics.spec.ts`

Signoff condition:

- From UI only, the operator can correctly diagnose four different access failure states.

Primary files to change:

- `edutech_web/src/app/(admin)/admin/economy/page.tsx`
- shared economy presentation helpers/components used by package visibility and entitlement cards

Expected UI changes:

- add one compact access-chain explainer near institute access rows
- make each row answer in one scan:
  - scope present or missing
  - entitlement active/paused/revoked
  - runtime feature access active/missing
  - next recovery action
- reduce dependency on long explanatory paragraphs

Implemented in:

- `edutech_web/src/components/admin/economy-question-bank-visibility-card.tsx`

Browser proof:

- `tests/e2e/workflow/admin-question-bank-package-visibility.spec.ts`
- `tests/e2e/workflow/admin-economy-browser-coverage.spec.ts`

Notes:

- The package visibility lane now exposes a compact access chain that answers package coverage, institute entitlement, shared-library runtime, and the operator verdict in one scan.

---

### P0-04 Revoked vs Active State Separation

Status: `Done`

Problem:

- Revoked entitlement rows are too easy to mentally mix with active access rows.

Primary user impact:

- Operators may assume access is broken when they are looking at historical state rather than current state.

Acceptance criteria:

- Revoked rows must be clearly marked as historical/non-governing.
- Active rows must be visually dominant.
- Recovery action must be obvious and safe.
- If restore/unrevoke exists, it must be clearly explained and tested.

Playwright coverage targets:

- active entitlement row visible
- revoke it
- verify row style and copy change
- restore it
- verify row returns to active governing state

Suggested spec targets:

- `tests/e2e/workflow/admin-economy-entitlement-revoke-restore.mutable.spec.ts`

Signoff condition:

- Revoked and active states are distinguishable in one glance during browser review.

Primary files to change:

- `edutech_web/src/app/(admin)/admin/economy/page.tsx`
- shared economy card/status styling in global styles or local admin styles

Expected UI changes:

- revoked rows look archival, not governing
- active rows look primary and current
- restore/unrevoke action remains obvious and safe
- lifecycle history does not visually compete with current truth

Implemented in:

- `edutech_web/src/components/admin/economy-question-bank-visibility-card.tsx`
- `edutech_web/src/app/globals.css`

Browser proof:

- `tests/e2e/workflow/admin-question-bank-package-visibility.spec.ts`
- `tests/e2e/workflow/admin-economy-mutable.spec.ts`

Notes:

- Governing rows now live in a dedicated current-access section and revoked rows in a dedicated historical section, with stronger archival styling and explicit non-governing copy.

---

### P0-05 Exams Filtered-State Clarity

Status: `Done`

Problem:

- Institute exams can still feel confusing when filters hide all rows.

Primary user impact:

- Users think exams disappeared or were never created.

Acceptance criteria:

- True empty state and filtered empty state must remain fully separate.
- Active filters must be visible when zero rows are returned.
- Clear recovery actions must be prominent:
  - reset filters
  - clear filters
  - open all exams
- The page must preserve the user’s context while making recovery easy.

Playwright coverage targets:

- page with exams loaded
- apply a no-result filter combination
- verify active filter summary is visible
- verify recovery action resets correctly
- verify pagination still works after filter recovery

Suggested spec targets:

- `tests/e2e/workflow/institute-exams-filter-empty-state.spec.ts`
- `tests/e2e/workflow/institute-exams-filter-recovery.spec.ts`

Signoff condition:

- A non-technical user can always tell whether there are no exams or the filters are hiding them.

Implemented in:

- `edutech_web/src/app/(institute)/institute/exams/page.tsx`
- `edutech_web/tests/e2e/page-objects/institute/institute-exams.po.ts`
- `edutech_web/tests/e2e/workflow/institute-exams-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-exams-filter-pagination.spec.ts`

Browser proof:

- `tests/e2e/workflow/institute-exams-workspace.spec.ts`
- `tests/e2e/workflow/institute-exams-filter-pagination.spec.ts`

---

### P0-06 Safe Package Scope Editing

Status: `Done`

Problem:

- Expanding package coverage from Math-only to Math+Science is still more complex than it should be.

Primary user impact:

- Operators may leave content inaccessible even though the data exists.

Acceptance criteria:

- Package editor must make academic coverage visible at a glance.
- Adding a new subject scope row must feel deliberate and safe.
- Validation must identify bad scope combinations close to the edited field.
- Save feedback must be operator-friendly, not just backend-friendly.

Playwright coverage targets:

- edit existing package from Math-only to Math+Science
- save and verify scope row count increases
- assign to institute and verify linked access changes
- test invalid/incomplete row save and verify inline validation

Suggested spec targets:

- `tests/e2e/workflow/admin-question-bank-package-scope-edit.mutable.spec.ts`
- `tests/e2e/workflow/admin-question-bank-package-validation.mutable.spec.ts`

Signoff condition:

- Operator can safely expand a package to include Science without ambiguity and verify access from UI only.

Primary files to change:

- `edutech_web/src/app/(admin)/admin/economy/page.tsx`
- package editor sections/components inside the same admin economy workspace

Expected UI changes:

- academic scope row intent is clearer before save
- live dependency impact is visible before editing a governing package
- added/removed subject or topic coverage is previewed before save
- operators can tell when a scope edit is expanding versus shrinking live institute access

Implemented in:

- `edutech_web/src/components/admin/economy-question-bank-package-management-card.tsx`

Browser proof:

- `tests/e2e/workflow/admin-question-bank-package-editor.spec.ts`
- `tests/e2e/workflow/admin-economy-browser-coverage.spec.ts`
- `tests/e2e/workflow/admin-package-scope-expansion-institute-linker.mutable.spec.ts`
- `tests/e2e/workflow/admin-question-bank-opbms-scope.mutable.spec.ts`

Notes:

- The package editor now shows live dependency impact, linked-plan pressure, and a pre-save subject/topic change summary so operators can tell whether they are expanding or removing institute-visible coverage before they save.
- add-subject/add-scope interaction feels deliberate and safe
- validation points at the exact bad row or missing field
- save feedback is operator-friendly

Browser proof required:

- expand Math-only package to Math+Science
- save successfully
- verify institute entitlement reflects wider scope
- verify institute linked question availability changes as expected
- run one invalid save and confirm inline/operator-friendly validation

Implementation order:

1. improve scope row labels and section hierarchy
2. improve validation messaging
3. improve save result feedback
4. run end-to-end package edit -> entitlement check -> institute visibility proof

---

## Cross-Cutting QA Checklist

These checks apply to every P0 item before it can move to `Done`.

### Functional

- Action works from UI only
- Success message is truthful
- Error message is actionable
- Saved state appears correctly after reload

### UX

- Labels are understandable by non-technical operators
- Recovery path is visible
- Next step is obvious
- Historical versus active state is clear

### Browser

- Page works on normal desktop width
- No overlap, clipping, or hidden controls
- Keyboard/tab flow is acceptable for main controls
- No hard refresh is required for user understanding

### Automation

- Stable selectors are used
- No hard-coded waits
- Failure screenshots are captured
- Tests are independent

---

## Execution Order

### Recommended order

1. `P0-03 Economy Access-Chain Clarity`
2. `P0-04 Revoked vs Active State Separation`
3. `P0-06 Safe Package Scope Editing`

Reason:

- The remaining open risk is almost entirely economy/operator clarity.
- Onboarding, linked-question clarity, and exams recovery are already implemented and browser-proven.

---

## Signoff Gate Before P1

Do not move to P1 until all of the following are true:

- one fresh institute can be onboarded from UI only
- package access can be attached and verified from UI only
- active versus revoked access can be diagnosed from UI only
- math and science linked access can be explained by the UI itself
- exams filtered-empty-state behavior is clear and recoverable
- focused Playwright specs for all P0 items pass consistently

Already satisfied:

- fresh institute onboarding through UI
- onboarding summary truthfulness
- linked-question clarity at institute side
- exams filtered-empty and pagination recovery clarity

---

## Suggested Deliverables For This Phase

- fixed product behavior
- updated Playwright workflows
- updated operator-facing copy
- short bug closure note per item
- updated `PLATFORM_HARDENING_MATRIX.md` statuses
