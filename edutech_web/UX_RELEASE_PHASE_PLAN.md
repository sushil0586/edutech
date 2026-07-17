# Nexora UX Release Phase Plan

Last updated: 2026-07-17

This file turns the current UX release review into a practical execution tracker.

## How To Use

- mark each task when completed
- keep blockers and decisions directly under the relevant phase
- treat `Critical` items as pre-release work
- treat `High` items as near-release work unless explicitly deferred

## Release Standard

The product is ready for broader release when:

- core student routes feel immediately understandable
- dense operator routes feel manageable instead of crowded
- major layouts hold together across desktop, laptop, tablet, and narrow mobile widths
- empty, loading, success, and error states are understandable
- no open UX issues remain that would materially reduce trust in the product

## Phase 1. Student Core Flow Polish

Priority: `Critical`

Goal:
Make the student experience clear within the first few seconds on the highest-traffic routes.

Routes:

- `/app/dashboard`
- `/app/exams`
- `/app/results`
- `/app/attempts`
- attempt summary and answer review flows

Tasks:

- [ ] tighten layout hierarchy on dashboard, tests, and results
- [ ] reduce repeated helper text on student summary cards
- [ ] make one primary CTA clearly dominant on each page
- [ ] compress long attempt summary and answer-review pages
- [ ] improve scan rhythm between KPI cards, filters, and content lists
- [ ] verify that “what do I do next?” is obvious without reading every panel

Reference artifacts:

- [dashboard.png](/Users/ansh/Documents/Eductech/edutech_web/tmp-ui-review/dashboard.png)
- [exams.png](/Users/ansh/Documents/Eductech/edutech_web/tmp-ui-review/exams.png)
- [results.png](/Users/ansh/Documents/Eductech/edutech_web/tmp-ui-review/results.png)
- [attempt-summary.png](/Users/ansh/Documents/Eductech/edutech_web/tmp-ui-review/attempt-summary.png)
- [attempt-review-top.png](/Users/ansh/Documents/Eductech/edutech_web/tmp-ui-review/attempt-review-top.png)
- [attempt-review-middle.png](/Users/ansh/Documents/Eductech/edutech_web/tmp-ui-review/attempt-review-middle.png)
- [attempt-review-bottom.png](/Users/ansh/Documents/Eductech/edutech_web/tmp-ui-review/attempt-review-bottom.png)

Done criteria:

- primary action is obvious within 3 seconds
- no route feels over-explained or visually top-heavy
- student review flows feel guided instead of long

Notes:

- none yet

## Phase 2. Visual System Hardening

Priority: `Critical`

Goal:
Raise the perceived quality from “usable and solid” to “confident and product-grade.”

Tasks:

- [ ] strengthen contrast on low-emphasis surfaces
- [ ] refine typography hierarchy for titles, labels, helper text, and metadata
- [ ] reduce overuse of pale gradients where they weaken separation
- [ ] standardize button sizing, emphasis, and spacing
- [ ] standardize chips, pills, badges, and filter tokens
- [ ] normalize card borders, shadows, and padding across routes

Done criteria:

- shared components feel like one cohesive system
- pages look crisp rather than washed out
- priority is communicated visually, not only through text

Notes:

- none yet

## Phase 3. Dense Operator Workflow Cleanup

Priority: `High`

Goal:
Make admin, institute, and teacher workspaces easier to operate under real workload.

Candidate routes:

- `/admin/economy`
- `/admin/people`
- `/institute/results`
- `/teacher/question-bank`
- `/teacher/reviews`

Tasks:

- [ ] reduce equal-weight panels on dense workspaces
- [ ] simplify filter bars and grouped controls
- [ ] improve field alignment on long forms
- [ ] make validation and backend error messages easier to notice
- [ ] reduce unnecessary explanatory duplication on operator pages
- [ ] re-check modal and dialog clarity on create/edit workflows

Done criteria:

- dense pages are scannable without fatigue
- forms communicate the next safe action clearly
- the main operator action is still obvious on data-heavy screens

Notes:

- none yet

## Phase 4. Responsive And State-Quality Pass

Priority: `High`

Goal:
Verify that the product behaves cleanly in real browsing conditions, not just ideal desktop states.

Tasks:

- [ ] verify key routes on desktop, laptop, tablet, and narrow mobile widths
- [ ] fix wrapping and overflow issues in topbars, filters, and card actions
- [ ] review empty states for clarity and usefulness
- [ ] review loading states for clarity and calmness
- [ ] review error and success states for trust and readability
- [ ] verify reload, revisit, and back-navigation continuity on critical routes

Done criteria:

- no visible layout breakage on priority flows
- state transitions do not confuse the user
- critical pages remain stable after revisit and reload

Notes:

- none yet

## Phase 5. Pre-Release UAT And Sign-Off

Priority: `Critical`

Goal:
Turn the cleanup work into an explicit launch decision.

Tasks:

- [ ] run route-by-route UAT for Student
- [ ] run route-by-route UAT for Teacher
- [ ] run route-by-route UAT for Institute
- [ ] run route-by-route UAT for Admin
- [ ] run route-by-route UAT for Parent
- [ ] classify issues as `release blocker`, `polish`, or `later`
- [ ] close all release blockers
- [ ] recheck the highest-visibility routes after fixes
- [ ] record final launch recommendation

Done criteria:

- no open release blockers remain
- highest-traffic routes feel trustworthy and coherent
- launch recommendation is documented explicitly

Notes:

- none yet

## Suggested Execution Order

1. student dashboard, tests, results, attempts
2. attempt summary and answer review flows
3. teacher and institute dense workflows
4. admin dense workflows
5. responsive/state pass
6. final UAT sign-off

## Launch Recommendation Template

Status:

- `Ready`
- `Ready with caveats`
- `Not ready`

Reasons:

- none yet

Blocking issues:

- none yet
