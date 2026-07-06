# Teacher And Institute Role Consistency Matrix

Last updated: 2026-07-05

## Purpose

This document tracks where `Teacher` and `Institute` workspaces are expected to feel the same, where they are intentionally different, and what browser evidence currently proves that contract.

Use this document when:

- reviewing cross-role regressions
- hardening onboarding and question-bank behavior
- checking whether a wording or action difference is intentional

Related documents:

- [PLATFORM_HARDENING_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLATFORM_HARDENING_MATRIX.md)
- [P1_HARDENING_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/P1_HARDENING_EXECUTION_BOARD.md)
- [INSTITUTE_BUG_AND_UX_TRACKER.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/INSTITUTE_BUG_AND_UX_TRACKER.md)

## Status Legend

- `Aligned`: browser-proven and intentionally similar
- `Intentional Difference`: different by product rule, but the difference is truthful
- `Needs Hardening`: usable, but still vulnerable to copy drift or confusing behavior
- `Not Proven`: not yet sufficiently covered

## Summary

| Area | Status | Notes |
| --- | --- | --- |
| Results overview and route family | Aligned | Institute and teacher now share the same readiness model, empty-state logic, and route-level navigation shape. |
| Exam detail workspace | Aligned | Core panels and handoff actions are consistent across roles. |
| Question-bank local authoring shell | Aligned | Search, filters, import, and create-entry patterns are similar enough for shared operator training. |
| Review queue filter recovery and paging honesty | Aligned | Both roles now explain filtered-empty states clearly and avoid fake disabled pager links. |
| Shared-library / linked-library lane | Intentional Difference | Institute can intake/link scoped content; teacher is request-only and should never suggest direct linking. |
| Question-bank resilience under slow shared-library calls | Needs Hardening | Teacher-side route resilience is improved, but deeper shared-library behavior still needs broader parity coverage. |
| Bulk mutable question-bank and role-specific authoring workflows | Needs Hardening | Both roles now have browser-proven single-item and bulk mutable coverage; remaining gap is mostly around deeper role-specific authoring extras rather than core bulk workflows. |

## Shared Contract

These behaviors should stay aligned unless product policy changes:

### Question Bank

- Both roles should have:
  - `Question Bank` heading
  - search field
  - `Apply filters`
  - import entry points
  - authoring entry points
- Both roles should keep local inventory usable even if shared-library information is partially unavailable.
- Both roles should explain filtering truthfully when no rows match.

Current browser evidence:

- institute:
  - `institute-question-bank-workspace.spec.ts`
  - `institute-question-bank-opbms-linked-science.spec.ts`
  - `institute-question-bank-shared-library-workspace.spec.ts`
- teacher:
  - `question-bank-deep.spec.ts`
  - `teacher-question-bank-shared-library-workspace.spec.ts`
  - `teacher-question-bank-shared-library-no-entitlement.spec.ts`

### Results

- Both roles should have:
  - `Results` heading
  - exam sidebar filters
  - exam publish readiness
  - result publish readiness
  - route handoff to:
    - exam
    - builder
    - reviews
    - question bank
    - leaderboard
    - analysis
    - live monitor
- Both roles should distinguish:
  - true empty state
  - filtered zero-result state
  - low-data but healthy state

Current browser evidence:

- institute:
  - `institute-results-workspace.spec.ts`
  - `institute-results-attempts-workspace.spec.ts`
  - `institute-results-leaderboard-workspace.spec.ts`
  - `institute-results-analysis-workspace.spec.ts`
  - `institute-results-live-workspace.spec.ts`
- teacher:
  - `teacher-results-workspace.spec.ts`
  - `teacher-results-attempts-workspace.spec.ts`
  - `teacher-results-leaderboard-workspace.spec.ts`
  - `teacher-results-analysis-workspace.spec.ts`
  - `teacher-results-live-workspace.spec.ts`

### Exam Detail

- Both roles should expose:
  - exam code
  - questions
  - assigned students
  - exam access key
  - result status
  - exam publish readiness
  - result publish readiness
  - exam actions
  - exam configuration
  - student access and stars
  - publish history
- Both roles should let users move back to the builder and core exam shell without confusing detours.

Current browser evidence:

- institute:
  - `institute-exam-detail-workspace.spec.ts`
  - `institute-exam-mutable.spec.ts`
- teacher:
  - `teacher-exam-detail-workspace.spec.ts`
  - `teacher-exam-detail-mutable.spec.ts`

### Reviews

- Both roles should have:
  - `Review Queue` heading
  - quick triage entry points
  - filter controls
  - truthful queue-empty vs filtered-empty behavior
  - visible recovery actions
- Both roles should avoid fake pager links when no previous or next page exists.

Current browser evidence:

- institute:
  - `institute-reviews-workspace.spec.ts`
- teacher:
  - `teacher-reviews-workspace.spec.ts`
- parity guardrail:
  - `teacher-institute-role-consistency.spec.ts`

## Intentional Differences

These differences are acceptable and should remain explicit in the UI:

### Shared Library Intake Authority

- `Institute`
  - can open shared-library linker
  - can review topic-wise intake
  - can link scoped platform questions into institute inventory
- `Teacher`
  - should not directly link licensed shared-library questions
  - should only see request-oriented or visibility-oriented states

Expected wording direction:

- Institute copy should use action language like:
  - `Open shared library linker`
  - `Review source coverage`
  - `Add licensed platform questions`
- Teacher copy should use request or visibility language like:
  - `Shared platform library`
  - `Access available`
  - `Subscription required`
  - `Request pending`

### Role Framing

- `Institute` copy may refer to institution-wide inventory and operational oversight.
- `Teacher` copy may refer to teacher-scoped authoring and review flow.
- Both should still avoid unnecessary jargon and keep the action path obvious.

## Mutable Parity Snapshot

### Question Bank Mutable Actions

Status: `Needs Hardening`

Current browser evidence:

- institute:
  - `institute-question-bank-bulk-mutable.spec.ts`
- teacher:
  - `teacher-question-mutable.spec.ts`

What is already browser-proven:

- `Institute`
  - create disposable draft question
  - update draft explanation
  - delete disposable draft question
  - create disposable local question
  - bulk set difficulty
  - bulk activate/deactivate
  - bulk attach/remove tag
- `Teacher`
  - create disposable draft question
  - update draft explanation
  - delete disposable draft question
  - bulk set difficulty
  - bulk activate/deactivate
  - bulk attach/remove tag

What is not yet parity-aligned:

- Teacher suite still has fewer mutable scenarios than institute because it does not yet cover the institute-side bulk topic reassignment path.

Current result snapshot:

- teacher mutable question-bank suite:
  - `4 passed` when the configured institute-admin credential is the same institute as the teacher credential
- institute mutable question-bank suite:
  - `4 passed`

Latest note:

- Teacher bulk tag attachment and removal are now browser-proven with deterministic disposable-tag setup and cleanup, so the teacher mutable suite no longer depends on pre-seeded active tags.
- Teacher bulk topic reassignment is now browser-proven too. The coverage uses truthful disposable academic-topic provisioning through the paired institute-admin role, so the teacher and institute credentials must point to the same institute for this lane.
- Institute bulk topic reassignment is now browser-proven after aligning the test with the current workspace contract: the bulk `Topic target` dropdown is populated only when the matching program and subject filters are active.
- Institute bulk tag attachment and removal are now browser-proven with deterministic disposable-tag setup and cleanup, so the institute mutable suite no longer depends on pre-seeded active tags.

### Exam Detail Mutable Actions

Status: `Aligned with browser-proven builder depth`

Current browser evidence:

- institute:
  - `institute-exam-mutable.spec.ts`
- teacher:
  - `teacher-exam-detail-mutable.spec.ts`

Shared mutable contract already proven in browser:

- create disposable exam shell
- open builder and return to detail
- navigate to question-mapping lane
- refresh status
- sync marks
- toggle key-entry mode
- regenerate access key
- save entitlement-only access policy
- return to exams workspace

Institute-only browser-proven additions in the current suite:

- add builder section from the sections tab
- manually attach a question to a section
- export exam as PDF and verify rendered content

Interpretation:

- The exam-detail core contract is aligned.
- Teacher builder-depth mutation is already browser-proven in its dedicated builder suite.
- Institute detail mutation remains richer in one combined flow, but the difference is now mostly packaging of evidence rather than a missing teacher-side builder proof.
- The institute mutable flow now explicitly selects an exam subject before section creation when the shell starts with `Subject pending`, matching the current live builder rule.

## Current Open Hardening Items

### 1. Shared-library parity explanation

Status: `Resolved in this pass`

- Institute-side explanation stays operational and linker-oriented.
- Teacher-side explanation now has a matching in-product guidance card, adapted for request-only behavior.
- Focused browser evidence now covers:
  - `teacher-question-bank-shared-library-workspace.spec.ts`
  - `institute-question-bank-shared-library-workspace.spec.ts`
  - `teacher-institute-role-consistency.spec.ts`

### 2. Mutable parity matrix is partially finished
Status: `Needs Hardening`

- We still need a deeper map for:
  - comprehension authoring
  - whether teacher should mirror institute builder-depth checks or intentionally stay lighter

### 3. Browser guardrail for shared parity was missing

Status: `Resolved in this pass`

- A focused role-consistency Playwright spec is now part of the hardening direction so copy drift is easier to catch.

## Recommended Next Steps

1. Keep results and exam-detail parity green as a baseline.
2. Expand mutable parity coverage for question-bank and exam-detail workflows.
3. Decide whether teacher builder-depth parity should stay intentionally lighter or gain one or two mirrored checks.
