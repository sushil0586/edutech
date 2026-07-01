# Phase 1 Student Execution Backlog

## Purpose

This backlog turns the current student review, route coverage, and QA notes into an execution-ready Phase 1 plan.

Use this document to decide:

- what to build first
- what can be done in parallel
- what depends on backend or teacher-side state
- what must be proven in Playwright or manual QA before Phase 1 is complete

References:

- [CURRENT_MVP_SCOPE.md](/Users/ansh/Documents/Eductech/docs/architecture-product/CURRENT_MVP_SCOPE.md:1)
- [NEXORA_GAP_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/NEXORA_GAP_IMPLEMENTATION_PLAN.md:1)
- [PENDING_WORK_AND_AUTOMATION_STRATEGY.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PENDING_WORK_AND_AUTOMATION_STRATEGY.md:1)
- [STUDENT_MODULE_REVIEW.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_MODULE_REVIEW.md:1)
- [STUDENT_MODULE_NEXTJS_PLAN.md](/Users/ansh/Documents/Eductech/docs/frontend-mobile/STUDENT_MODULE_NEXTJS_PLAN.md:1)
- [STUDENT_MODULE_QA_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_MODULE_QA_CHECKLIST.md:1)
- [PHASE_1_STUDENT_PORTAL_PUNCHLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PHASE_1_STUDENT_PORTAL_PUNCHLIST.md:1)

## Phase 1 Goal

Finish the student portal as a production-ready assessment and analytics experience for the current institute-first MVP.

This backlog intentionally sits before the larger automation tracks in
[PENDING_WORK_AND_AUTOMATION_STRATEGY.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PENDING_WORK_AND_AUTOMATION_STRATEGY.md:1).
In practice:

- this document is the product-completion lane
- the automation strategy is the scale-and-hardening lane that should build on top of a stable student lifecycle

This phase is complete when:

- the main student lifecycle feels coherent and trustworthy
- settings, notifications, and utility pages no longer feel like placeholders
- student CTAs never overpromise backend access
- QA covers the real state combinations that matter for pilot use

## Current Reality

Playwright baseline coverage is no longer the main student bottleneck.
The student lane now has dedicated coverage across:

- dashboard
- exams and exam detail
- exam-key entry
- attempts list
- attempt runtime
- post-submit summary and review
- results
- practice
- analytics
- analytics timeline and compare
- analytics, practice, attempts, results, summary, and review scope persistence
- profile, settings, notifications, wallet, subscriptions, and search

What is still missing is mostly product polish, deeper backend-state matrix QA, and a final truthfulness pass on utility surfaces.

For the native mobile student app, the equivalent gap is no longer basic route scaffolding.
The current remaining work is:

- real-device Android and iPhone execution of the seeded Maestro flows
- weak-network validation of login, results, and active-attempt behavior
- long-attempt runtime comfort validation on smaller screens
- cleanup of any remaining visual or navigation polish found during device QA

The strongest student routes are already real:

- `/app/exams`
- `/app/exams/[examId]`
- `/app/attempts/[attemptId]`
- `/app/attempts/[attemptId]/summary`
- `/app/attempts/[attemptId]/review`
- `/app/results`
- `/app/analytics`
- `/app/weak-areas`

The weakest areas today are no longer simple route gaps. They are:

- attempt confidence and runtime polish
- exam-start clarity and blocked-state guidance
- post-submit state language and route continuity
- source/teacher scoped manual QA across seeded and mutable datasets
- utility-page credibility and scope discipline
- final manual QA against truthful backend lifecycle states

## Execution Order

1. Attempt and exam-start confidence
2. Post-submit flow unification
3. Student actionability and dashboard continuity
4. Utility-page completion
5. QA and coverage closeout

## Workstream A. Attempt And Exam-Start Confidence

### Why this comes first

This is the most important product moment in the student experience.
If attempt UX feels uncertain, the rest of the portal does not matter as much.

### Ticket A1. Elevate exam-state clarity on exam detail

Problem:

- exam detail is informative but not decisive
- students need instant clarity on whether they can start, resume, unlock, or wait

Primary routes:

- [exam detail](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/exams/[examId]/page.tsx:1)
- [exams list](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/exams/page.tsx:1)

Deliverables:

- move primary availability state higher in the page
- explain blocked states in plain language
- make CTA priority deterministic:
  - `Resume`
  - `Start`
  - `Unlock with stars`
  - `Open summary`
  - `Open review`
- add a short “what happens after start” guidance block

Acceptance:

- student can tell the next valid action within a few seconds
- blocked states feel explained, not broken
- exam list and exam detail use matching action language

### Ticket A2. Polish attempt runtime confidence

Problem:

- attempt flow works, but save-state, progress, and submit confidence still feel too mechanical

Primary routes and components:

- [attempt workspace](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/page.tsx:1)
- [action-submit-button.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/action-submit-button.tsx:1)
- [globals.css](/Users/ansh/Documents/Eductech/edutech_web/src/app/globals.css:1)

Deliverables:

- improve timer visibility
- make save feedback local to the active question or section
- strengthen section and palette progress cues
- clarify section-switch implications
- make submit confirmation stronger and calmer
- improve the handoff from submit to summary

Acceptance:

- current section, progress, and save state are obvious without scanning
- submit feels deliberate and low-risk
- no key attempt action depends only on a distant banner

### Ticket A3. Close attempt-route QA for real state transitions

Problem:

- core flows are covered, but state-transition confidence still depends too much on manual memory

Deliverables:

- verify start, resume, save, section switch, and submit with real backend state
- confirm behavior under:
  - active attempt exists
  - no attempts left
  - result hidden after submit

Acceptance:

- attempt route behavior is consistent with backend policy
- no route promises a summary or review state too early

## Workstream B. Summary, Results, And Review Unification

### Why this comes second

The core student learning loop after submission still feels split across technical routes instead of one outcome journey.

### Ticket B1. Standardize post-submit state language

Problem:

- “submitted”, “evaluated”, “published”, and “review available” are not explained consistently

Primary routes:

- [summary](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/summary/page.tsx:1)
- [review](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/review/page.tsx:1)
- [results](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/results/page.tsx:1)
- [attempt history](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/page.tsx:1)

Deliverables:

- one shared state vocabulary for:
  - submitted
  - evaluation pending
  - published
  - review locked
  - review available
- one shared status/banner pattern
- clearer explanation text for score visibility and review eligibility

Acceptance:

- students can understand why a score is hidden or visible
- students can understand why review is blocked or available

### Ticket B2. Improve route-to-route continuity

Problem:

- summary, results, review, and attempts are connected, but the flow still feels route-centric instead of journey-centric

Deliverables:

- strengthen summary to results handoff
- strengthen summary to review handoff
- strengthen results to summary handoff
- make attempts history use truthful post-submit labels

Acceptance:

- post-submit routes feel like one coherent student journey
- CTA labels stay policy-aware and state-aware

### Ticket B3. Expand state-based QA coverage

Must validate:

- submitted + result hidden
- published + review locked
- published + review available

Acceptance:

- no student route overpromises future visibility
- review links never appear optimistically when backend policy blocks them

## Workstream C. Student Actionability And Daily-Use Continuity

### Why this matters

The student portal is already informative.
It now needs to feel more actionable.

### Ticket C1. Improve dashboard next-step behavior

Primary route:

- [dashboard](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/dashboard/page.tsx:1)

Deliverables:

- make the strongest next action clearer
- ensure locked items are truthfully separated from immediately available actions
- reduce dead-end cards or weak “so what?” moments

Acceptance:

- dashboard helps the student decide what to do next
- premium or locked states remain truthful

### Ticket C2. Turn weak areas and analytics into better action paths

Primary routes:

- [analytics](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/analytics/page.tsx:1)
- [weak areas](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/weak-areas/page.tsx:1)
- [practice](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/practice/page.tsx:1)

Deliverables:

- stronger targeted-practice prompts from weak areas
- clearer “next best move” continuity from analytics
- better movement from insight to practice, exams, or review

Acceptance:

- insight pages consistently point to a meaningful next action
- students can move from weak signal to follow-up action without confusion

Progress note:

- core continuity is now implemented across analytics, weak areas, practice, results, attempts, summary, and review
- dedicated Playwright now covers:
  - analytics deep and scoped drill chains
  - practice continuity
  - results recovery loops
  - attempts continuity
  - review recovery loops
  - subject and source persistence through practice, results, attempts, summary, and review
- the remaining C2 risk is less about missing routes and more about verifying truthfulness against real backend combinations

### Ticket C3. Define what is intentionally not in Phase 1

Out of scope for this phase unless backend support already exists:

- bookmarks
- revision plans
- new recommendation engines
- fake study preferences

Acceptance:

- no placeholder controls that imply nonexistent capability
- phase-1 planning docs use the same boundary language for student productivity features
- later-phase ideas remain documented as future expansion, not silent backlog drift

## Workstream D. Student Utility Pages

### Why this matters

These pages currently weaken overall product confidence even though the core exam flow is stronger.

### Ticket D1. Make settings a truthful utility page

Primary route:

- [settings](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/settings/page.tsx:1)

Deliverables:

- improve account overview clarity
- add session/help/account-management guidance
- add only real controls or clearly informational sections

Acceptance:

- settings no longer feels like a stub
- every control shown is either functional or explicitly informational

### Ticket D2. Strengthen notifications and profile

Primary routes:

- [notifications](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/notifications/page.tsx:1)
- [profile](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/profile/page.tsx:1)

Deliverables:

- improve empty-state clarity
- improve action confirmation for mark-read flows
- make profile feel like a real student identity page rather than a thin info card

Acceptance:

- notifications actions feel complete
- profile supports trust and orientation

### Ticket D3. Decide the Phase 1 stance for wallet, subscriptions, and search

Primary routes:

- [wallet](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/wallet/page.tsx:1)
- [subscriptions](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/subscriptions/page.tsx:1)
- [search](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/search/page.tsx:1)

Decision options:

- complete them as truthful MVP utility pages
- reduce them if they overstate current capability
- defer deeper product work until post-Phase 1

Acceptance:

- these routes either become credible MVP pages or are clearly scoped down
- no “fake product surface” remains in the student shell

## Workstream E. QA And Coverage Closeout

### Ticket E1. Manual route-by-route sign-off

Run the student browser pass from:

- [STUDENT_MODULE_QA_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_MODULE_QA_CHECKLIST.md:1)

Required route focus:

- `/app/dashboard`
- `/app/exams`
- `/app/exams/[examId]`
- `/app/practice`
- `/app/attempts`
- `/app/attempts/[attemptId]`
- `/app/attempts/[attemptId]/summary`
- `/app/attempts/[attemptId]/review`
- `/app/results`
- `/app/analytics`
- `/app/weak-areas`
- `/app/notifications`
- `/app/profile`
- `/app/settings`
- `/app/wallet`
- `/app/subscriptions`

Acceptance:

- all critical states are manually exercised against truthful backend state

### Ticket E2. Expand Playwright on the thinner student surfaces

Current gap areas to deepen further beyond the new baseline coverage:

- analytics topic detail and subject drill state assertions
- attempt-runtime branch assertions across more backend states
- result-state matrix coverage for:
  - submitted + result hidden
  - published + review locked
  - published + review available
- teacher/source scoped student flows under more real datasets, not just happy-path seeded context
- summary/review practice follow-up under locked, startable, and resume states across more subject combinations
- utility-surface truthfulness checks when wallet/subscription data is sparse or policy-limited

Acceptance:

- Playwright covers the key student state matrix, not just route presence
- student route/workflow confidence moves from “covered” to “release-trustworthy”

### Ticket E3. Phase 1 release gate

Phase 1 should only close when:

- attempt flow feels trustworthy
- summary/results/review are consistent
- utility pages no longer feel placeholder-grade
- no blocker student route issue remains open
- student CTAs remain truthful to backend policy

Validated release command bundle:

- use [family_release_validation_bundle.sh](/Users/ansh/Documents/Eductech/scripts/family_release_validation_bundle.sh) for the currently hardened family-release signoff path
- default run executes:
  - backend immediate-release regressions
  - AWS immediate-release Playwright validation
  - competitive delayed-release Playwright validation
- useful entrypoints:
  - `scripts/family_release_validation_bundle.sh`
  - `scripts/family_release_validation_bundle.sh --backend-only`
  - `scripts/family_release_validation_bundle.sh --playwright-only`

Current note:

- run the script sequentially, not in parallel with other heavy local validation, because the longer mutable Playwright flows can timeout under resource contention even when product behavior is correct

## Suggested Sprint Grouping

### Sprint 1

- A1 exam-state clarity
- A2 attempt runtime confidence
- B1 post-submit state language

### Sprint 2

- B2 route continuity
- C1 dashboard next-step behavior
- C2 weak-area and analytics actionability

### Sprint 3

- D1 settings
- D2 notifications and profile
- D3 wallet, subscriptions, and search stance

### Sprint 4

- E1 manual QA closeout
- E2 Playwright expansion
- E3 release gate review

## Parallelization Notes

Can run in parallel:

- A1 and A2
- B1 and D1
- C1 and C2
- D2 and D3

Should stay sequenced:

- B2 after B1
- E1 after A through D are mostly complete
- E3 only after E1 and E2 evidence exists

## Definition Of Done

Phase 1 is complete when:

- the student lifecycle from discovery to post-result review feels coherent
- student utility routes are credible and truthful
- policy-driven visibility states are clearly explained
- the student module is no longer best described as a working beta

After that point, the next leverage should come from the Wave 1 automation priorities in
[PENDING_WORK_AND_AUTOMATION_STRATEGY.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PENDING_WORK_AND_AUTOMATION_STRATEGY.md:1):

- CI quality gates
- regression automation
- content integrity automation
- publish blocker automation
