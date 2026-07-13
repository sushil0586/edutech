# Visual Pass Findings 2026-07-09

## Scope

Visual pass sources reviewed:

- desktop artifact pack: `edutech_web/artifacts/visual-pass/`
- mobile artifact pack: `edutech_web/artifacts/visual-pass-mobile/`

Captured screen inventory:

- `48` desktop screenshots
- `48` mobile screenshots

Representative screens reviewed closely:

- [admin economy desktop](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass/admin/admin-economy.png>)
- [teacher question bank desktop](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass/teacher/teacher-question-bank.png>)
- [institute question bank desktop](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass/institute/institute-question-bank.png>)
- [student analytics desktop](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass/student/student-analytics.png>)
- [admin economy mobile](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass-mobile/admin/admin-economy.png>)
- [teacher question bank mobile](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass-mobile/teacher/teacher-question-bank.png>)
- [institute question bank mobile](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass-mobile/institute/institute-question-bank.png>)
- [student analytics mobile](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass-mobile/student/student-analytics.png>)

## Executive read

The product has a consistent visual language on desktop and feels materially more coherent than a prototype.

The strongest visual lane is student, especially analytics, where the screen hierarchy is clear and the mobile behavior is substantially better than the operator surfaces.

The main visual risk is not branding or polish. It is responsive behavior and density management on operator-heavy screens:

- admin dense surfaces
- teacher dense question-bank surfaces
- institute dense question-bank and linker surfaces

These mobile operator screens are still busy, but after the shared shell fix they are no longer broadly failing as narrow off-canvas layouts. The main risk has shifted from structural responsiveness to density and scan fatigue.

## What is working well

### 1. Desktop visual language is consistent

Across admin, teacher, institute, and student:

- cards, pills, borders, and panel shapes are consistent
- navigation shell looks like one product family
- surface spacing is generally calm and readable
- call-to-action buttons are visually clear

### 2. Student analytics is the strongest visual screen family

The student analytics screen works well because:

- top KPIs are easy to scan
- charts are visually separated from text-heavy sections
- performance summaries remain understandable despite depth
- the mobile version still preserves readable card structure instead of collapsing into a horizontal-overflow failure

### 3. Desktop operator screens are visually professional enough for guided rollout

Even very dense screens like admin economy and institute question bank are:

- visually stable
- not chaotic
- structurally understandable for trained users

The problem is not “bad looking desktop UI.”

The problem is “too much density without enough responsive simplification.”

## Critical findings

### C1. Operator mobile layouts were structurally broken before the shell fix, and are now broadly recovered

Affected examples:

- [admin economy mobile](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass-mobile/admin/admin-economy.png>)
- [teacher question bank mobile](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass-mobile/teacher/teacher-question-bank.png>)
- [institute question bank mobile](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass-mobile/institute/institute-question-bank.png>)

Previous behavior:

- content rendered as a narrow vertical slice
- large sections appeared off-canvas to the right
- the left shell visually consumed space while core content felt clipped

Current behavior after the shared shell/mobile-grid fix:

- admin economy now renders as a real single-column mobile page
- teacher question bank, institute question bank, institute linked questions, institute shared-library linker, and institute results now render at full mobile width
- the main remaining issue is long-scroll density, not horizontal collapse

Meaning:

- operator mobile is no longer broadly broken at the shell/layout level
- operator mobile is still not polished enough for fast low-support use on the densest lanes

Priority:

- high, but no longer a blanket structural P0 across the reviewed operator routes

### C2. Dense question-bank screens are too long and too uniform

Affected examples:

- [teacher question bank desktop](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass/teacher/teacher-question-bank.png>)
- [institute question bank desktop](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass/institute/institute-question-bank.png>)

Observed behavior:

- screen length is extreme
- repeated cards have very similar visual weight
- the “most important next action” is not always obvious at a glance
- diagnosis blocks, metrics, filters, and row cards compete for attention

Meaning:

- the UI is informative
- but it asks too much visual processing from first-time operators

Priority:

- high

### C3. Admin economy is visually stable but too dense for first-pass comprehension

Affected example:

- [admin economy desktop](</Users/ansh/Documents/Eductech/edutech_web/artifacts/visual-pass/admin/admin-economy.png>)

Observed behavior:

- many lane tabs and cards share similar emphasis
- the page explains a lot, but not enough is visually prioritized
- the upper filter region, lane navigation, KPI cards, operator intent card, and policy block all land with similar weight

Meaning:

- trained operators can work with it
- first-time users may not immediately understand where to start

Priority:

- high

## Medium findings

### M1. Pill labels and helper chips are visually too faint

Observed on several desktop screens:

- “workspace filters”
- “current workspace lane”
- small meta chips above sections

Issue:

- low visual contrast
- they read like decorative tags instead of useful structure markers

### M2. Long-form pages need stronger sectional rhythm

Across admin economy and question-bank-heavy pages:

- many cards use similar border, background, and spacing treatment
- sections blend together during scroll

Improvement direction:

- stronger section breaks
- occasional contrast bands
- clearer “summary first, detail second” grouping

### M3. Dense mobile pages remain usable but visually exhausting

Observed on mobile after the shell fix:

- full-width rendering is back
- pages are still extremely tall
- repeated cards often share very similar emphasis
- the most important action is not always obvious without substantial scrolling

This is no longer a responsiveness bug. It is a prioritization and pacing problem.

### M4. Student screens are much stronger visually than operator screens

This is good for student quality, but it creates uneven product maturity perception:

- student surfaces feel more intentionally composed
- operator surfaces feel more like comprehensive control consoles

This is not a bug, but it is a visual maturity imbalance worth addressing over time.

## Role-by-role read

### Admin

Desktop:

- stable
- professional
- slightly over-dense

Mobile:

- structurally recovered after shell fix
- still too dense on economy and institutes for easy first-time scanning

### Teacher

Desktop:

- functional and coherent
- question-bank-heavy surfaces need stronger prioritization and shorter visual scan paths

Mobile:

- structurally full-width in the refreshed pass
- still visually dense and long on question-bank and results lanes

### Institute

Desktop:

- strong information coverage
- still very long on question-bank lanes

Mobile:
- structurally recovered on question bank, linked questions, shared-library linker, results, and economy
- still too long and visually heavy on dense workflow pages
- dense question-bank and linker lanes are not yet acceptable for real operator use

### Student

Desktop:

- strongest overall hierarchy

Mobile:

- clearly better adapted than operator surfaces
- still long, but fundamentally readable

## Recommended fix order

### 1. Fix operator mobile overflow first

Target first:

- admin economy
- teacher question bank
- institute question bank
- institute library linker

Definition of done:

- no clipped horizontal layout
- content stacks vertically
- primary actions remain visible without desktop-style compression

### 2. Simplify dense question-bank visual hierarchy

Target first:

- teacher question bank
- institute question bank

Needed:

- stronger summary/action separation
- fewer equally loud cards
- clearer “diagnosis”, “filters”, “inventory”, and “next action” zones

### 3. Rebalance admin economy page emphasis

Needed:

- clearer hero summary
- stronger “where to start” emphasis
- quieter secondary metrics

### 4. Add second-pass visual capture for dynamic detail states

After layout fixes:

- dialog states
- detail pages with seeded ids
- filtered states
- empty states
- blocked states

## Suggested execution board to create next

Create a dedicated visual cleanup board with:

1. Operator mobile overflow fixes
2. Dense question-bank hierarchy cleanup
3. Admin economy visual prioritization cleanup
4. Second-pass visual capture after fixes

## Bottom line

The product is visually credible on desktop.

The student experience is visually ahead of the operator experience.

The biggest weakness is not color or component quality. It is responsive behavior and information density on operator-heavy screens.

If we fix operator mobile overflow and simplify the densest question-bank and economy layouts, the perceived maturity of the product will jump noticeably.
