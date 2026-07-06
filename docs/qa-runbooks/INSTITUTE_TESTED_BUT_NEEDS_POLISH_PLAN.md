# Institute Tested-But-Needs-Polish Plan

Last updated: `2026-07-03`

## Goal

Take the institute module areas that are already functionally working and make them easier to operate for school admins, teachers, and office staff who are not highly technical.

This phase is not about redesigning the product model.
It is about reducing confusion, improving recovery paths, and making the UI tell the truth more clearly.

## Scope

This plan focuses on institute-side surfaces that have already been browser-tested and are broadly functional, but still show UX friction:

- `Institute > Exams`
- `Institute > Question Bank`
- `Institute > Linked Questions`
- `Institute > Shared Library Linker`
- `Institute > Results` zero-data guidance
- onboarding-adjacent institute flows where package access, linked counts, and next steps are still easy to misunderstand

## What “Polish” Means Here

For this pass, polish means:

- clearer labels
- clearer empty and no-result states
- safer recovery actions
- visible explanation of current scope and active filters
- fewer places where the user has to mentally infer system state
- better alignment between UI wording and actual backend behavior

It does **not** mean:

- changing the business model
- rebuilding the economy model
- replacing working flows with a new architecture

## Current Ground Truth

These areas are already technically working enough to polish instead of rebuild:

- institute login and shell navigation
- institute exams workspace route loading
- institute question-bank route loading
- linked questions route loading
- shared library linker route loading
- package-based question visibility
- active vs revoked entitlement behavior
- OPBMS linked inventory visibility for Math and Science
- browser automation around the core institute question-bank lanes

## Priority Order

## P0

Must improve now because they affect end-user trust and operator success.

### P0-1. Institute Exams filtered-empty-state clarity

## Problem

The exams page can be technically correct while still feeling broken.

Users can land in:

- a true empty state
- a filtered no-results state
- a pagination overflow state

These states are different, but if the UI feels too similar, users assume exams disappeared.

## Fix goals

- clearly separate:
  - `no exams exist yet`
  - `filters are hiding all exams`
  - `current page is beyond the filtered result set`
- make the reset and recovery actions stronger
- keep active control context visible near the recovery action

## Implementation tasks

- review the current exams state panels and normalize the language
- keep one strong primary recovery CTA per state
- keep one secondary “preserve scope” CTA where helpful
- ensure active filters are summarized in a compact, always-readable way
- make sure no onboarding message appears during filtered-empty states

## Acceptance criteria

- a school admin can immediately tell whether there are zero exams or just zero visible exams
- the user can recover to a full list in one click
- the user can also recover to page 1 without losing filter context

## P0-2. Institute Exams control bar clarity

## Problem

The exams control bar is functional but still dense.
For non-technical users, the difference between:

- status filter
- sort
- group
- page size

is not always obvious.

## Fix goals

- make the control area feel task-first, not system-first
- show what changes listing behavior vs what changes data
- make quick-filter chips and manual controls feel consistent

## Implementation tasks

- tighten guidance copy above controls
- improve labels where needed
- ensure reset behavior is clearly visible
- verify grouped-state headings stay understandable after filtering

## Acceptance criteria

- users can filter without feeling they changed exam data
- users can explain what each control is doing
- grouped views remain easy to scan

## P0-3. Institute linked-question lane separation

## Problem

`Local Question Bank`, `Linked Questions`, and `Shared Library Linker` are now much better than before, but the mental model still needs to stay consistently visible.

## Fix goals

- keep the lane purpose obvious at the top of each page
- keep cross-navigation labels explicit
- make it impossible to confuse:
  - editable local questions
  - already linked licensed questions
  - source inventory available to link

## Implementation tasks

- keep lane orientation panels consistent across the three routes
- remove any leftover ambiguous button wording
- verify route handoffs preserve user confidence

## Acceptance criteria

- a school admin can describe each lane after one pass through the UI
- no route suggests the user is editing licensed source rows directly

## P0-4. Shared Library Linker topic and inventory truthfulness

## Problem

The linker can be technically truthful but still cognitively heavy.
Users may confuse:

- platform source count
- already linked count
- still linkable count

They may also treat a topic with zero source rows as a broken topic instead of an empty licensed source.

## Fix goals

- keep platform-source vs institute-linked counts clearly separated
- explain empty topic inventory without sounding like a backend failure
- make the next action obvious when no linkable rows are available

## Implementation tasks

- strengthen zero-state copy for topic inventory
- keep count labels explicit
- make per-topic review feel smaller and calmer

## Acceptance criteria

- users understand why a topic can show zero linkable rows
- users understand that platform source inventory is not the same as local linked inventory

## P1

Should improve next after the highest-friction issues are reduced.

### P1-1. Results zero-state route specificity

## Problem

Results-related routes may truthfully show no data, but still fail to explain what each route is for.

Examples:

- analysis
- leaderboard
- live monitor
- attempts

## Fix goals

- keep truthful no-data behavior
- add route-specific explanation of what data is required for that lane

## Acceptance criteria

- operators understand why the page is empty
- operators understand what action will eventually populate it

### P1-2. Onboarding and access-chain explanation

## Problem

Question-bank access still has a learning curve:

- package scope
- entitlement lifecycle
- linked visibility
- feature access

Even when it works, the chain is not simple.

## Fix goals

- keep the access chain short and visible
- reduce reliance on operator memory
- make the current blocker obvious

## Acceptance criteria

- an operator can tell whether the issue is scope, lifecycle state, or lack of linked rows

### P1-3. Non-technical operator copy pass

## Problem

Some copy still sounds internal or system-oriented instead of school-oriented.

## Fix goals

- simplify labels
- simplify helper text
- reduce “platform jargon” where possible

## Acceptance criteria

- copy feels understandable to admin staff without product training

## P2

Good enhancements after the highest-value polish is complete.

### P2-1. Deeper responsive pass on institute workspaces

- validate smaller laptop widths
- reduce crowded action rows
- tighten spacing around filter panels

### P2-2. More browser coverage for negative and recovery paths

- expired state
- revoked access state
- zero-topic-source state
- filtered no-results state
- pagination overflow state

### P2-3. Cross-module consistency pass

- align button hierarchy
- align empty-state phrasing
- align reset/clear language
- align filter-summary presentation

## Delivery Sequence

### Phase 1

1. Institute exams empty/filter/pagination recovery polish
2. Institute exams control bar clarity
3. Re-run institute exams browser suite

### Phase 2

1. Linked questions and shared library linker clarity pass
2. Topic zero-state and inventory truthfulness pass
3. Re-run institute question-bank browser suite

### Phase 3

1. Results zero-state specificity pass
2. Onboarding/access-chain copy pass
3. Re-run broader institute browser pass

## Browser Automation Follow-Up

After each phase:

- update Playwright assertions to match user-visible truth, not legacy copy
- add at least one regression for each repaired empty/recovery state
- keep tests independent and data-tolerant where realistic

Recommended suites to keep re-running:

- `tests/e2e/workflow/institute-exams-workspace.spec.ts`
- `tests/e2e/workflow/institute-exams-filter-pagination.spec.ts`
- `tests/e2e/workflow/institute-question-bank-workspace.spec.ts`
- `tests/e2e/workflow/institute-linked-library-linker.spec.ts`
- `tests/e2e/workflow/institute-question-bank-opbms-linked-science.spec.ts`
- `tests/e2e/workflow/institute-end-user-browser-smoke.spec.ts`

## Definition of Done

This polish phase is complete when:

- institute users can recover from filtered or empty states without confusion
- linked-question and shared-library pages feel intentionally different in purpose
- topic inventory counts are understandable without backend knowledge
- empty-state copy is truthful and route-specific
- browser tests reflect the real user contract instead of stale wording

## Practical Outcome We Want

By the end of this phase, the institute module should feel:

- trustworthy
- recoverable
- understandable without technical guidance
- ready for broader manual UAT before moving deeper into P2 features
