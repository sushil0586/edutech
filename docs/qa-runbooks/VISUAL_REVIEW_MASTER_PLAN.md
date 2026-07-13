# Visual Review Master Plan

Last updated: 2026-07-09

## Purpose

This plan defines how we will visually review the full application across desktop and mobile before making UI cleanup changes.

We will use it to:

- review every major page family systematically
- capture screenshots in a repeatable order
- separate capture from judgment
- log issues consistently
- prioritize cleanup after the review is complete

Related documents:

- [VISUAL_PASS_SCREENSHOT_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/VISUAL_PASS_SCREENSHOT_RUNBOOK.md)
- [VISUAL_PASS_FINDINGS_2026-07-09.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/VISUAL_PASS_FINDINGS_2026-07-09.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)

---

## Review Strategy

We will review in three layers:

1. Screen-level baseline review
2. Dynamic state review
3. Fix validation review

Meaning:

- first, check the main route for each screen family
- then check important variants like empty, filtered, blocked, detail, modal, and success/error states
- only after that start UI cleanup work

---

## Review Dimensions

Every page should be reviewed against the same high-level questions:

1. Is the page readable at first glance?
2. Is the main action obvious?
3. Is the information hierarchy clear?
4. Is the page too dense for its role?
5. Does the layout hold on mobile?
6. Are filters, tabs, cards, and tables visually understandable?
7. Do empty, blocked, and recovery states feel distinct?
8. Does the page look like part of the same product family?

---

## Review Levels

### Level 1: Desktop baseline

Check:

- page shell
- heading clarity
- top summary zone
- main action visibility
- information density
- section rhythm
- card/table balance

### Level 2: Mobile baseline

Check:

- horizontal overflow
- content clipping
- menu behavior
- stacked hierarchy
- action visibility
- filter usability
- table/card collapse behavior

### Level 3: Dynamic states

Check:

- empty state
- filtered-empty state
- blocked or access-denied state
- detail state
- modal/dialog state
- success state
- validation or error state

---

## Review Order

We should review in this order:

1. Anonymous and auth pages
2. Student pages
3. Teacher pages
4. Institute pages
5. Admin pages
6. Dynamic detail and modal states
7. Cross-role comparison screens

Reason:

- student is the strongest visual lane and gives us the baseline of what “good” looks like
- teacher and institute expose the densest operator learning flows
- admin has the heaviest governance density and should be judged after we calibrate on the other lanes

---

## Page Review Plan

### 1. Anonymous + auth

Pages:

- marketing home
- login
- signup
- register

What to review:

- clarity of first impression
- trust and brand consistency
- form simplicity
- mobile readability
- duplicate route/alias consistency

### 2. Student pages

Pages:

- dashboard
- exams
- attempts
- results
- analytics
- practice
- profile
- settings
- notifications
- wallet
- subscriptions
- search
- weak areas

What to review:

- strongest visual hierarchy candidate
- chart and KPI readability
- study workflow clarity
- long-scroll fatigue
- mobile adaptation quality

Dynamic states to add later:

- exam detail
- attempt runtime
- post-submit summary
- review view
- compare and timeline analytics routes

### 3. Teacher pages

Pages:

- dashboard
- exams
- question bank
- results
- reviews
- search

What to review:

- density of workspace controls
- question-bank prioritization
- teacher-read-only or request-only visual explanation
- results and reviews scanability
- mobile collapse quality

Dynamic states to add later:

- question create
- question detail
- comprehension flows
- builder
- exam detail
- results analysis and leaderboard

### 4. Institute pages

Pages:

- dashboard
- exams
- question bank
- linked questions
- shared library linker
- results
- reviews
- people
- academic setup
- reports
- economy
- security
- settings
- teacher assignments
- search

What to review:

- operator task clarity
- dense question-bank diagnostics
- linker usability
- result and review readability
- heavy workflow responsiveness on mobile

Dynamic states to add later:

- question detail
- import flows
- builder
- exam detail
- leaderboard
- analysis
- live monitor
- blocked entitlement states

### 5. Admin pages

Pages:

- dashboard
- exams
- people
- institutes
- academic setup
- economy
- reports
- security
- settings
- search

What to review:

- governance density
- “where do I start” clarity
- visual prioritization of summary versus controls
- filter and subsection scanability
- economy page hierarchy
- mobile survivability

Dynamic states to add later:

- institute detail
- roster dialogs
- import dialogs
- economy editor states
- exam detail
- advanced builder surfaces

### 6. Cross-role comparison screens

Compare visually:

- teacher question bank vs institute question bank
- institute linked questions vs shared library linker
- teacher results vs institute results
- admin economy vs institute economy

What to review:

- whether intentional role differences are visually obvious
- whether control ownership is clear without reading deep copy
- whether the heavier screen still feels navigable

---

## Screenshot Capture Plan

### Phase A: Baseline capture

Already done:

- desktop screen-level pass
- mobile screen-level pass

Artifacts:

- `edutech_web/artifacts/visual-pass/`
- `edutech_web/artifacts/visual-pass-mobile/`

### Phase B: Dynamic state capture

Next screenshot wave should capture:

1. Detail routes
2. Empty states
3. Filtered-empty states
4. Blocked/access-denied states
5. Validation/error states
6. Success states
7. Dialog/modal states

### Phase C: Post-fix recapture

After cleanup work:

- rerun desktop baseline
- rerun mobile baseline
- rerun only affected dynamic states

---

## Review Output Format

For each page, log:

- page name
- desktop status: good / needs work / critical
- mobile status: good / needs work / critical
- main issue
- secondary issues
- recommended fix direction
- fix priority: P0 / P1 / P2

Severity guide:

- `P0`: layout broken, clipped, unusable, or misleading
- `P1`: usable but too dense, too hard to scan, or visually confusing
- `P2`: polish issue, hierarchy improvement, or consistency cleanup

---

## Recommended Working Sequence

1. Review all baseline screenshots first
2. Produce a page-by-page findings ledger
3. Group issues into:
   - responsive failures
   - hierarchy failures
   - copy/visual explanation failures
   - polish/consistency gaps
4. Fix highest-severity shared patterns first
5. Re-capture affected pages
6. Only then move into second-order polish

---

## Immediate Next Step

Use this plan to run the full page-by-page screenshot review against the current baseline captures.

Start with:

1. student pages
2. teacher and institute question-bank families
3. admin economy and institutes
4. remaining operator pages

That order will surface the biggest visual quality and responsive issues fastest.
