# Visual Review Baseline Ledger 2026-07-09

Last updated: 2026-07-09

## Purpose

This ledger records the first-pass baseline review of the captured desktop and mobile screen inventory.

It is based on:

- desktop baseline screenshots in `edutech_web/artifacts/visual-pass/`
- mobile baseline screenshots in `edutech_web/artifacts/visual-pass-mobile/`

This is not yet the full dynamic-state review.

It is the page-level baseline pass that tells us:

- which screens already look solid
- which screens need visual cleanup
- which screens are critically broken on mobile

Related documents:

- [VISUAL_REVIEW_MASTER_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/VISUAL_REVIEW_MASTER_PLAN.md)
- [VISUAL_PASS_FINDINGS_2026-07-09.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/VISUAL_PASS_FINDINGS_2026-07-09.md)
- [VISUAL_PASS_SCREENSHOT_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/VISUAL_PASS_SCREENSHOT_RUNBOOK.md)

---

## Status key

- `Good`: visually solid enough for now
- `Needs work`: usable, but hierarchy/density/responsiveness should improve
- `Critical`: visual or responsive behavior is not acceptable in the current form

Priority key:

- `P0`: layout or responsiveness is effectively broken
- `P1`: usable but confusing, too dense, or not visually prioritized enough
- `P2`: polish and consistency improvements

---

## Anonymous + Auth

| Page | Desktop | Mobile | Main read | Priority |
| --- | --- | --- | --- | --- |
| Marketing home | Good | Good | calm shell, readable, low-density landing | P2 |
| Login | Good | Good | strongest auth screen; clear split between value framing and action | P2 |
| Signup | Good | Good | likely consistent with auth family; needs later dynamic-state check | P2 |
| Register | Good | Good | alias route behavior is acceptable visually; routed to signup shape | P2 |

Notes:

- auth is one of the stronger responsive areas
- mobile auth is clearly stacked and readable, unlike dense operator mobile screens

---

## Student

| Page | Desktop | Mobile | Main read | Priority |
| --- | --- | --- | --- | --- |
| Dashboard | Good | Needs work | desktop is strong and task-prioritized; mobile keeps content readable but becomes very long | P1 |
| Exams | Good | Needs work | baseline likely solid, but needs dynamic-state review for card density and empty-state behavior | P1 |
| Attempts | Good | Needs work | useful baseline route coverage; dynamic runtime states still need later review | P1 |
| Results | Good | Needs work | likely aligned to student visual family; dynamic score/release variants still need review | P1 |
| Analytics | Good | Good | strongest visual family overall; charts and KPI hierarchy work on desktop and mobile | P2 |
| Practice | Good | Needs work | likely acceptable baseline; needs second-pass density review | P2 |
| Profile | Good | Good | utility-style surface should be easy to keep stable | P2 |
| Settings | Good | Good | low-density utility surface | P2 |
| Notifications | Good | Needs work | likely readable baseline, but later state-specific review needed | P2 |
| Wallet | Good | Good | utility and summary treatment should be easy to maintain | P2 |
| Subscriptions | Good | Good | likely low-risk utility screen | P2 |
| Search | Good | Needs work | likely usable but should be reviewed again with active filters/results | P2 |
| Weak Areas | Good | Needs work | probably acceptable baseline but depends on populated state quality | P2 |

Notes:

- student is visually the strongest role
- mobile is meaningfully better adapted than teacher/institute/admin dense screens
- the main issue is long-scroll length, not broken responsiveness

---

## Teacher

| Page | Desktop | Mobile | Main read | Priority |
| --- | --- | --- | --- | --- |
| Dashboard | Good | Needs work | baseline shell is coherent, but mobile operator density still needs review | P1 |
| Exams | Good | Needs work | probably usable baseline, but dense exam lists need mobile simplification | P1 |
| Question Bank | Needs work | Needs work | desktop is too long and too visually uniform; mobile is structurally recovered but still extremely long and dense | P1 |
| Results | Needs work | Needs work | desktop is information-rich but over-dense; mobile is full-width now but still visually heavy | P1 |
| Reviews | Good | Needs work | likely manageable baseline but needs later queue-state review | P1 |
| Search | Good | Needs work | baseline likely okay; should be rechecked with real populated results | P2 |

Notes:

- teacher dense workflow pages are still one of the main cleanup targets
- question bank and results now need hierarchy cleanup and mobile pacing improvement more than structural responsive repair

---

## Institute

| Page | Desktop | Mobile | Main read | Priority |
| --- | --- | --- | --- | --- |
| Dashboard | Good | Needs work | stable baseline shell; likely manageable but long on smaller view | P1 |
| Exams | Good | Needs work | probably usable baseline; dense table/list behavior still needs second pass | P1 |
| Question Bank | Needs work | Needs work | desktop is extremely long and cognitively heavy; mobile is structurally recovered but still dense | P1 |
| Linked Questions | Needs work | Needs work | same dense lane family as question bank; mobile now stacks correctly but remains visually heavy | P1 |
| Shared Library Linker | Needs work | Needs work | important intake surface; mobile is readable now but still long and text-heavy | P1 |
| Results | Needs work | Needs work | desktop is usable but very dense; mobile is full-width now but still exhausting to scan | P1 |
| Reviews | Good | Needs work | likely okay as a baseline, but needs queue-state/mobile validation | P1 |
| People | Good | Needs work | likely long-list behavior on mobile needs follow-up | P1 |
| Academic Setup | Good | Needs work | baseline acceptable, but dense forms likely need mobile simplification | P1 |
| Reports | Good | Needs work | likely acceptable baseline; needs later chart/filter review | P2 |
| Economy | Needs work | Needs work | dense control surface; mobile is no longer collapsed but still very tall and detail-heavy | P1 |
| Security | Good | Needs work | probably usable but should be checked with populated dense states | P2 |
| Settings | Good | Good | low-density utility surface | P2 |
| Teacher Assignments | Good | Needs work | likely manageable baseline, but mobile list/detail compression may need work | P2 |
| Search | Good | Needs work | baseline okay; active result state should be reviewed later | P2 |

Notes:

- institute still has one of the heaviest concentrations of dense mobile work
- the current problem is no longer shell-level breakage; it is long-scroll readability on question bank, linked questions, linker, results, and economy

---

## Admin

| Page | Desktop | Mobile | Main read | Priority |
| --- | --- | --- | --- | --- |
| Dashboard | Good | Needs work | desktop command deck and governance hierarchy are now restored; mobile still stacks correctly but remains long and tight | P1 |
| Exams | Good | Needs work | baseline likely okay, but dense workflow drill states still need review | P1 |
| People | Good | Needs work | likely fine on desktop; mobile list/detail density should be checked later | P1 |
| Institutes | Needs work | Needs work | desktop is usable but very long; mobile now renders correctly but still compresses a lot of list/detail information | P1 |
| Academic Setup | Good | Needs work | baseline likely usable, but mobile form density still needs attention | P1 |
| Economy | Needs work | Needs work | desktop is stable but too dense; mobile shell/layout is fixed but lane hierarchy still needs simplification | P1 |
| Reports | Good | Needs work | baseline likely fine; later data-state review needed | P2 |
| Security | Good | Needs work | likely acceptable baseline; populated dense state should be reviewed later | P2 |
| Settings | Good | Good | lower-density administrative utility lane | P2 |
| Search | Good | Needs work | baseline okay, but dense result-state review still needed | P2 |

Notes:

- admin economy is still the clearest desktop hierarchy cleanup target
- admin institutes is still a long-list/detail cleanup target
- admin mobile dense governance surfaces are structurally recovered, but not yet low-friction

---

## Cross-role comparison summary

### Strongest current visual family

Student.

Why:

- clearer primary actions
- stronger card hierarchy
- better mobile stacking
- less visually punishing density

### Weakest current visual family

Dense operator screens:

- admin economy
- admin institutes
- teacher question bank
- teacher results
- institute question bank
- institute linked questions
- institute shared library linker
- institute results

### Core pattern

Desktop problems:

- too much uniform card weight
- very long pages
- not enough “start here” emphasis

Mobile problems:

- dense operator screens now mostly stack correctly
- but they are still too long, too uniform, and too effortful to scan quickly

---

## Priority fix shortlist

### P0

1. No blanket shell-level mobile collapse remains in the refreshed pass
2. Reserve P0 only if a page-specific overflow/regression is found during deeper screen-by-screen review

### P1

1. Teacher question bank desktop hierarchy and mobile pacing
2. Teacher results desktop hierarchy and mobile pacing
3. Institute question bank desktop hierarchy and mobile pacing
4. Institute linked questions mobile pacing
5. Institute shared library linker mobile pacing
6. Institute results desktop hierarchy and mobile pacing
7. Admin economy desktop prioritization and mobile lane simplification
8. Admin dashboard and admin institutes long-scroll rhythm

### P2

1. Auth and utility page polish
2. Student long-scroll trimming where useful
3. Secondary chip contrast and section rhythm across the product

---

## Immediate next execution order

1. Continue page-level mobile density cleanup on dense operator lanes
2. Simplify dense desktop hierarchy on question-bank and economy lanes
3. Run dynamic-state screenshot capture for the heaviest pages
4. Produce second-pass ledger after additional page-level polish

---

## Honest limitation of this ledger

This ledger is a baseline screen review, not a final exhaustive visual certification.

Still pending for full review depth:

- seeded detail routes
- modal/dialog states
- empty versus blocked versus error state review on every dense page
- cross-browser visual comparison
- dynamic table/filter/result states across all workflows
