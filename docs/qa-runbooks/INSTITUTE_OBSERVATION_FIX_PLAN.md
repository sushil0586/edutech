# Institute Observation Fix Plan

## Goal

Fix the currently observed institute-side functional, UI, and UX issues in a practical order so the product becomes easier to operate, easier to test, and safer to roll forward into P2.

## Current Status Snapshot

Last updated: `2026-07-02`

### Fixed in the current pass

- admin economy question-bank visibility now explains package scope, entitlement state, and next action more clearly
- revoked question-bank entitlements now use clearer recovery language: `Restore entitlement`
- institute linked question-bank page now explains filtered counts vs total linked counts
- institute linked question-bank page now hides low-value filters in linked mode and shows scope summary chips
- institute shared-library linker now explains how linking works and shows compact topic/linking summaries
- institute question-bank browser regression now passes end to end for `opbms` using the current live UI contract
- institute exams page now preserves teacher filter during pagination and no longer uses fake `"#"` boundary pagination links
- shared results workspace now uses disabled pagination controls instead of misleading `"#"` links
- institute reviews queue now has a clearer operator guidance panel, truthful filter summaries, safer reset behavior, and disabled pagination controls

### Open issues still worth tracking

- local institute Playwright login is currently failing before route-level verification, so browser execution is blocked by auth/test-data rather than page behavior
- institute package-to-question linking is still conceptually heavy for operators when they need to understand `package scope` vs `entitlement state` vs `linked rows`
- package scope editing is still powerful but easy to misuse; operators need more confidence when expanding package coverage from Math-only to Math+Science
- the institute reviews queue is functionally richer now, but still needs a full end-user browser pass with valid credentials to surface remaining usability issues in live task-detail actions

### Known blocker for browser QA

- institute credentials used in local Playwright runs are not reaching the institute workspace and stop on `Invalid credentials`
- until this is repaired, browser automation can still validate static contracts and test registration, but not full institute journey execution

## Current Browser Findings

### Run date

`2026-07-02`

### Local institute account used for the current successful browser pass

- username: `opbms`
- password: `Demo@12345`

### Local institute credential mismatch also observed

- username: `opbms`
- password: `Ansh@1789`
- result: login rejected with `Invalid credentials`
- category: `Auth / Test-data`
- severity: `Medium`
- conclusion:
  - not confirmed as a product auth defect yet
  - but it is a real QA blocker if teammates still believe this is the valid local institute password

### Verified local data state

- OPBMS exam count: `0`
- OPBMS question rows visible in institute scope: `1550`

### Findings

#### 1. Institute exams pagination workflow test is failing on empty-state contract

- page: `/institute/exams`
- category: `Data / Automation`
- severity: `Medium`
- actual behavior:
  - page loads successfully
  - empty state is truthful and usable
  - no exam filters or pagination journey is available because the institute has no exams
- expected by current test:
  - a richer workspace shell including `How to use this workspace`
  - filter/pagination workflow availability
- conclusion:
  - not a route crash
  - this is primarily a seed/precondition gap or stale automation contract for the current zero-exam state

#### 1a. Institute exams empty state is functionally healthy, but operationally light

- page: `/institute/exams`
- category: `UX`
- severity: `Low`
- actual behavior:
  - page title and primary actions are clear
  - empty-state message is truthful
  - `Preset Library`, `Quick Create`, and `Advanced Builder` are still reachable
- observation:
  - the state is clean, but it gives no secondary guidance about the fastest next step for a first-time institute operator
- suggested improvement:
  - add one small operator hint row:
    - `Start with Quick Create for a manual test exam`
    - `Open Academic Setup if your scope is not ready`
    - `Use Advanced Builder for shared-library assembly`

#### 2. Institute results workspace tests are failing because the institute has no exams

- pages:
  - `/institute/results`
  - `/institute/results/analysis`
- category: `Data / Automation`
- severity: `Medium`
- actual behavior:
  - results zero-state is truthful
  - user is clearly told to create/publish exams first
- expected by current tests:
  - exam filters, analytics cards, and question-risk sections
- conclusion:
  - not evidence of a frontend runtime failure
  - this is a results-seed precondition gap for OPBMS

#### 2a. Results zero state is truthful but currently collapses multiple result lanes into the same blank outcome

- pages:
  - `/institute/results`
  - `/institute/results/analysis`
  - `/institute/results/attempts`
  - `/institute/results/leaderboard`
  - `/institute/results/live`
- category: `UX`
- severity: `Medium`
- actual behavior:
  - zero-state redirect/content consistently tells the operator that exams do not yet exist in institute scope
- problem:
  - analysis, attempts, leaderboard, and live-monitor routes do not currently surface enough route-specific explanation before falling back to the generic no-exams state
- user impact:
  - a real institute operator may not understand what each route is supposed to do once data exists
- suggested improvement:
  - keep the truthful no-exams state
  - add route-specific support copy:
    - `Analysis appears after published attempts exist`
    - `Leaderboard appears after scored submissions exist`
    - `Live monitor appears while active attempts are in progress`
    - `Attempts view appears once students begin submissions`

#### 3. Shared-library linker deeper sections only appear after scope is loaded

- page: `/institute/question-bank/library-linker`
- category: `UX / Automation`
- severity: `Medium`
- actual behavior:
  - page opens correctly
  - scope selectors are visible
  - `Topic coverage` was not visible immediately in the tested state
- likely explanation:
  - the page is waiting for the user to choose subject/topic scope and click `Load Topic`
- user impact:
  - not broken, but the page should better signal that deeper coverage/review panels appear only after loading a topic
- conclusion:
  - real usability gap, even if not a functional bug

#### 4. Institute reviews workspace is currently the healthiest validated institute lane

- page: `/institute/reviews`
- category: `Validation`
- severity: `Low`
- result:
  - browser workflow passed with the repaired institute login
  - recent guidance/filter/pagination improvements are behaving as expected

#### 5. Institute question-bank main workspace is currently the strongest browser-validated institute module

- pages:
  - `/institute/question-bank`
  - `/institute/question-bank/linked`
  - `/institute/question-bank/library-linker`
- category: `Validation`
- severity: `Low`
- result:
  - local browser suite passes for:
    - workspace shell
    - authoring entry routes
    - detail route access
    - bulk-action guard rails
    - linked science filtering for OPBMS
    - shared-library linker handoff and topic inventory review
- note:
  - the only failure encountered during this pass was stale automation expecting the retired `Shared Platform Library` embedded section, which has now been aligned to the current `Shared library intake` UI

This plan focuses on:

- institute user clarity
- platform-admin operator clarity where institute access is controlled
- linked-question workflow usability
- economy/package/entitlement transparency
- predictable page behavior for automation and manual QA

## Fixing Principles

- fix user understanding first, then polish visuals
- do not redesign the product model unless necessary
- prefer clearer labels, summaries, and state framing over adding more controls
- keep filters and workflows task-first
- make active vs paused vs revoked state impossible to misunderstand
- make automation more robust by aligning to stable user-visible behavior

## Priority Model

### P0

Must fix before broader institute rollout.

### P1

Should fix before deeper optimization and P2 expansion.

### P2

Polish and enhancement work after core clarity is restored.

## P0 Fix Plan

### P0-1. Clarify question-bank access model

## Problem

Users and operators do not clearly understand why an institute can see some linked questions but not others.

Main confusion:

- package scope
- entitlement lifecycle
- feature access
- linked rows vs available rows

## Fix

Add a small “How access works” summary in the relevant surfaces:

- `/admin/economy` question-bank visibility section
- `/institute/question-bank/linked`
- `/institute/question-bank/library-linker`

The summary should explain:

1. package scope decides which academic slices are eligible
2. active entitlement decides whether the institute can use that package
3. linked page shows rows already linked into the institute
4. shared library linker is where more rows are added

## Acceptance criteria

- an operator can explain why OPBMS sees Math and/or Science without checking the database
- a revoked row is visibly understood as unusable access
- a user can distinguish “available in package” from “already linked”

## Owner areas

- admin economy UI
- institute question-bank linked page
- institute shared-library linker page

---

### P0-2. Make entitlement state unmistakable

## Problem

`Active`, `Paused`, and `Revoked` states are too easy to misread in the economy screens.

## Fix

Improve entitlement cards and package visibility rows:

- stronger state badge styling
- dedicated status line near top of card
- short explanatory sentence per state
- row-level action language that matches state

Examples:

- `Active`: “Institute can currently use this package.”
- `Paused`: “Package scope remains configured, but institute use is temporarily blocked.”
- `Revoked`: “Institute access has been withdrawn. Existing linked rows may remain visible locally, but new package use is blocked.”

Also add:

- `Restore entitlement` or `Re-activate entitlement` for revoked rows
- hide or de-emphasize actions that do not make sense for revoked rows

## Acceptance criteria

- revoked row cannot be mistaken for active
- paused row cannot be mistaken for revoked
- operator immediately knows what action to take next

## Owner areas

- `/admin/economy` question-bank visibility and entitlement cards

---

### P0-3. Simplify institute linked-question page

## Problem

The linked-question view is better now, but still carries heavy visual density.

## Fix

Refine `/institute/question-bank/linked`:

- reduce non-essential chips
- keep only the highest-value review filters visible by default
- move secondary filters into a “More filters” section later if needed
- compress question card metadata into clearer blocks:
  - academic identity
  - ownership/source state
  - quality state
  - usage stats
- add a compact subject/topic summary strip

## Acceptance criteria

- a user can scan 10 linked rows quickly
- users understand which rows are read-only linked rows
- users understand when they should create an editable copy

## Owner areas

- institute linked question UI
- shared question row rendering

---

### P0-4. Explain totals vs filtered counts

## Problem

Users can misread total linked count, subject count, and filtered result count.

## Fix

Where counts are shown, use explicit labels:

- `Total linked in institute bank`
- `Visible after current filters`
- `Subject-specific linked rows`

If Science filter is active, show:

- `900 visible in current Science scope`
- `1550 total linked across all subjects`

## Acceptance criteria

- no confusion between total linked rows and filtered visible rows
- counts remain understandable without backend knowledge

## Owner areas

- institute linked question page
- linker page
- economy visibility summary if needed

---

### P0-5. Standardize institute exams page state handling

## Problem

The exams page can appear with different visible filter/control sets depending on account/data state, which feels inconsistent.

## Fix

Audit `/institute/exams` and standardize:

- which controls are always present
- which controls are conditionally hidden
- what explanatory text appears when controls are unavailable

If a filter rail is conditionally unavailable, show a truthful explanation instead of just omitting it silently.

## Acceptance criteria

- institute exams page behavior feels stable
- users know why a control is absent if it is intentionally unavailable
- automation can rely on stable page contracts

## Owner areas

- institute exams workspace

## P1 Fix Plan

### P1-1. Improve economy terminology

## Problem

Business-technical language is too hard for operators.

## Fix

Introduce user-facing language support:

- `Package`: “Question-bank offering”
- `Entitlement`: “Institute access record”
- `Feature access`: “Extra capability access”
- `Materialize on entitlement`: rename or explain more clearly

Keep backend naming intact, but improve displayed descriptions and help copy.

## Acceptance criteria

- non-technical operator can manage package access more confidently
- fewer support questions around package/entitlement distinction

---

### P1-2. Improve master-defaults onboarding clarity

## Problem

Master defaults suggest that package access is fully granted, but real access still depends on package scope and entitlement state.

## Fix

In admin academic setup master defaults:

- add pre-apply explanation:
  - “This writes institute academic defaults and access seeds. Actual question visibility depends on active package scope and entitlement state.”
- show selected package summary
- show whether advanced builder access is being granted

## Acceptance criteria

- onboarding operator understands what this page does and does not do
- fewer cases where onboarding is assumed complete but package state is still wrong

---

### P1-3. Improve question-bank row readability

## Problem

Question cards are information-rich but visually dense.

## Fix

Reorganize question cards across local and linked pages:

- consistent hierarchy
- fewer repeating labels
- more deliberate grouping
- better spacing between title, topic, status, and usage signals

## Acceptance criteria

- question rows are easier to scan
- high-signal states stand out first

---

### P1-4. Add user-facing recovery actions

## Problem

When access is missing, users do not always know where to go next.

## Fix

Add contextual CTA patterns:

- on linked page: `Open Shared Library`
- on no-access state: `Ask platform admin to restore package access`
- on revoked state in admin: `Restore entitlement`

## Acceptance criteria

- every blocked state has a next action

## P2 Fix Plan

### P2-1. Responsive and small-width refinement

- improve dense filter rows on laptop widths
- ensure no label clipping
- ensure cards stack cleanly

### P2-2. Progressive disclosure for secondary filters

- hide low-frequency filters behind secondary panels
- keep primary workflow filters visible

### P2-3. Advanced analytics and support copy polish

- better inline help
- cleaner empty states
- cleaner success messaging

## Implementation Order

### Phase 1

- P0-1 clarify access model
- P0-2 entitlement state clarity
- P0-3 linked page simplification

### Phase 2

- P0-4 totals/count explanation
- P0-5 exams page consistency
- P1-2 master-defaults onboarding clarity

### Phase 3

- P1-1 economy terminology
- P1-3 question-row readability
- P1-4 recovery actions

### Phase 4

- P2 responsive refinement
- P2 progressive disclosure
- P2 polish

## Suggested Execution Tickets

### Ticket A

`Admin Economy: entitlement state clarity + restore flow`

### Ticket B

`Institute Linked Questions: simplify page and explain linked access model`

### Ticket C

`Institute Question Counts: total vs filtered count clarity`

### Ticket D

`Institute Exams: standardize filter/control visibility contract`

### Ticket E

`Admin Academic Setup: master-defaults access explanation`

### Ticket F

`Question Bank Cards: institute/local/linked readability pass`

## QA Verification After Fixes

After implementation, verify:

- OPBMS can clearly distinguish Math-only vs Math+Science access
- revoked entitlement is obvious
- restoring entitlement is intuitive
- linked page is easier to scan than current version
- count summaries are unambiguous
- exams page control set feels stable

## Definition Of Done

We can move to P2 when:

- no major institute-side access confusion remains
- linked question flow is understandable without verbal explanation
- economy state management is operator-safe
- institute exams and question-bank workflows are easier to scan and operate
