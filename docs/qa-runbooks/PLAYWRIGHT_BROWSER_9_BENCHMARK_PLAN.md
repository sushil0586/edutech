# Playwright Browser 9 Benchmark Plan

Last updated: 2026-07-07

## Purpose

This document turns Playwright browser confidence into a direct execution target.

The benchmark for every browser-tested product section is:

- `9/10`

That does not mean every section must be perfect.

It means each section should be:

- browser-proven in its main workflow
- browser-proven in its most important mutation path
- browser-proven in its main role handoff
- honest about remaining edge gaps
- strong enough that UI or contract changes should not surprise us easily

This is the first browser-hardening priority before more expansion work.

Related documents:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [PLAYWRIGHT_BROWSER_PHASE1_EXECUTION_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_BROWSER_PHASE1_EXECUTION_CHECKLIST.md)
- [PLAYWRIGHT_PERFORMANCE_PENETRATION_MASTER_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_PERFORMANCE_PENETRATION_MASTER_PLAN.md)
- [PLAYWRIGHT_PERFORMANCE_PENETRATION_EXECUTION_PACK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_PERFORMANCE_PENETRATION_EXECUTION_PACK.md)
- [INSTITUTE_BROWSER_AUTOMATION_MASTER_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/INSTITUTE_BROWSER_AUTOMATION_MASTER_PLAN.md)
- [ADMIN_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ADMIN_CONFIDENCE_MATRIX.md)
- [ADMIN_ROUTE_BY_ROUTE_PUNCH_LIST.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ADMIN_ROUTE_BY_ROUTE_PUNCH_LIST.md)
- [EXAM_CREATION_SCENARIO_CATALOG.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/EXAM_CREATION_SCENARIO_CATALOG.md)
- [README.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/README.md)

## Benchmark Rules

Upgrade a section to `9/10` only when:

- the main baseline route family is green
- at least one real mutable lane exists where mutation matters
- the most important cross-role or cross-surface handoff is proven
- the remaining gaps are edge-depth gaps, not core-flow gaps
- stage behavior is not known to contradict local confidence

Do not call a section `9/10` if:

- it is only route-load coverage
- mutation is still optically covered but not behaviorally proven
- the seeded stage contract is still unstable
- only one role is strong while the paired role is weak

## Executive Read

### Current overall Playwright browser confidence

- current practical score: `9.0/10`
- benchmark target: `9/10`
- current gap to target: `0.0`

### Strongest browser sections already

- results and reviews
- exam lifecycle and creation
- institute exams workspace
- student core journey
- admin core route family

### Weakest browser sections relative to the benchmark

- teacher small-screen and linked-inventory depth
- institute and teacher small-screen operator confidence
- broader assignment-mode and family-combination depth
- broader destructive mutation breadth outside the strongest opt-in lanes

## Section Scorecard

| Section | Current | Benchmark | Gap | Primary reason below 9 |
| --- | ---: | ---: | ---: | --- |
| Admin browser surfaces | 9.0 | 9.0 | 0.0 | local baseline is now green end to end, but cross-browser and small-screen depth still sit outside this section score |
| Institute browser surfaces | 9.0 | 9.0 | 0.0 | compact-viewport question-bank, reviews, and exams depth are now locally strong, with remaining gaps mostly in breadth and stage realism |
| Teacher browser surfaces | 9.1 | 9.0 | 0.0 | teacher role-difference, compact-viewport depth, and mobile authoring are now strong locally and cross-browser, with remaining gaps concentrated in breadth and stage realism |
| Student browser surfaces | 9.0 | 9.0 | 0.0 | strongest end-user continuity path today |
| Exam creation and lifecycle | 9.1 | 9.0 | 0.0 | already above benchmark for controlled rollout confidence |
| Results and reviews | 9.7 | 9.0 | 0.0 | strongest browser-proven area |
| Economy and entitlements | 8.9 | 9.0 | 0.1 | reversible mutation lanes are now strong, but repeated-run and stage-rerun proof still lag |
| Cross-browser desktop sanity | 9.0 | 9.0 | 0.0 | focused desktop pack now has repeated-run workflow-depth proof across Firefox and WebKit, with remaining gaps concentrated in breadth rather than core viability |
| Student mobile-web baseline | 8.5 | 9.0 | 0.5 | strong route and exam continuity, but not enough real-device or long-runtime depth |
| Operator small-screen browser confidence | 9.2 | 9.0 | 0.0 | compact-viewport baseline plus multiple real task-flow lanes now exists across admin, institute, and teacher, the focused compact pack is now repeat-stable locally on Chromium with `26 passed`, on Firefox/WebKit with `52 passed`, and on stage Chromium with `26 passed`, with remaining gaps mostly in real-device depth |
| Mutable destructive workflow confidence | 8.5 | 9.0 | 0.5 | repeated-run proof is now materially stronger, but destructive breadth is still uneven outside the strongest opt-in lanes |

## Section Details

### 1. Admin Browser Surfaces

Current score:

- `9.1/10`

Why this is strong:

- admin dashboard, exams, builder, preset packs, academic setup, institutes, and people all have meaningful baseline coverage
- several admin routes already have disposable CRUD or lifecycle mutation proof
- stage admin hardening is materially stronger than before
- the main admin workspace family now reruns green locally as a grouped baseline with `13 passed`
- the broader compact operator mobile pack that includes admin economy, people, security, and reports lanes now also stayed green locally with `26 passed` on Chromium using `--repeat-each=2`
- the same compact operator mobile pack now also stayed green on Firefox and WebKit with `52 passed` using `--project=firefox --project=webkit --repeat-each=2`
- the same compact operator mobile pack now also stayed green on stage Chromium with `26 passed` after shared-library seed remediation

What is already proven:

- `/admin`, `/admin/dashboard`, `/admin/search`, `/admin/settings`
- `/admin/exams`, `/admin/exams/new`, `/admin/exams/advanced`, `/admin/exams/preset-packs`
- `/admin/exams/:id`, `/admin/exams/:id/builder`
- `/admin/academic-setup`
- `/admin/institutes`
- `/admin/people`
- `/admin/economy`, `/admin/security`, `/admin/reports`
- core admin economy visibility and stage workspace coverage
- compact-viewport shell reachability across `/admin`, `/admin/economy`, and `/admin/security`
- compact-viewport admin economy lane switching and dense policy-form review workflow
- compact-viewport admin people lane switching, roster empty-state recovery, and teacher/student action-surface continuity
- compact-viewport admin security filtering, watchlist handoff, and reset-flow continuity
- compact-viewport admin reports filtering, quick-filter pivots, and route handoff continuity

What is still not strong enough:

- `/admin/reports`
  - no real export/download CTA means export confidence is still blocked by product
- repeated-run stability
  - one grouped green rerun now exists, but long-run flake proof and cross-browser parity are still thinner than Chromium local proof
- small-screen operator behavior
  - compact-viewport evidence is materially better now because admin economy, people, security, and reports lanes are all green, with remaining operator small-screen gaps now concentrated outside the main admin route family

What gets admin to 9:

1. keep the grouped admin baseline in routine reruns and record any flake behavior
2. keep the current compact-viewport admin workflow pack healthy with reruns and move the next mobile-browser depth work into institute and teacher breadth gaps
3. add one non-Chromium workflow-depth rerun for the main admin route family
4. keep stage reruns aligned with local behavior

### 2. Institute Browser Surfaces

Current score:

- `9.0/10`

Why this is strong:

- institute onboarding, question bank, exams workspace, results, and review continuity are well covered
- mutable institute creation and assignment lanes exist
- populated institute results and analytics views are now in the suite catalog
- institute compact-viewport workflows now also sit inside the repeat-stable compact operator pack that stayed green locally with `26 passed` on Chromium using `--repeat-each=2`
- the same compact institute mobile workflows now also hold inside the Firefox/WebKit repeat sweep with `52 passed`
- the same compact institute mobile workflows now also hold inside the stage Chromium repeat sweep with `26 passed`

What is already proven:

- institute onboarding with defaults and access attachment
- institute question bank local and linked workflows
- compact-viewport institute question-bank intake and authoring-entry workflow
- compact-viewport institute reviews filtering and scoped-navigation workflow
- compact-viewport institute exams controls and handoff workflow
- institute exams workspace and exam detail baseline
- institute guided and advanced creation baseline
- assignment persistence and student visibility continuity
- institute results workspace, live monitor, analysis, and review-ready continuity
- compact-viewport shell reachability across dashboard, economy, and reviews

What is still not strong enough:

- linked question-bank mental model and edge paths still need clearer browser depth
- institute-side descriptive scoring mutation is not as explicit as teacher review mutation
- import-heavy browser coverage exists but still lacks broader failure-state and payload-depth realism
- some denser builder combinations are still more teachable than self-evident
- compact-viewport evidence is now materially stronger because institute question-bank, institute reviews, and institute exams lanes are green, and the exams lane is also green on Firefox and WebKit

What gets institute to 9:

1. add one dedicated institute descriptive scoring mutation lane if not already explicit enough
2. deepen linked question-bank edge assertions and bulk-edge recovery
3. expand institute import failure-state and larger-payload browser coverage
4. keep the institute compact-viewport suite healthy while expanding denser linked-review or import-adjacent mobile workflow depth

### 3. Teacher Browser Surfaces

Current score:

- `9.0/10`

Why this is good but not yet benchmark-strong:

- teacher authoring, builder, detail, review, and results flows are meaningful
- but teacher-side parity is still less complete than institute in a few dense lanes
- teacher compact-viewport workflows now also sit inside the repeat-stable compact operator pack that stayed green locally with `26 passed` on Chromium using `--repeat-each=2`
- the same compact teacher mobile workflows now also hold inside the Firefox/WebKit repeat sweep with `52 passed`
- the same compact teacher mobile workflows now also hold inside the stage Chromium repeat sweep with `26 passed` after shared-library seed remediation

What is already proven:

- teacher question authoring baseline
- draft lifecycle
- shared-library request-only contract
- explicit teacher-vs-institute shared-library control split
- compact-viewport teacher question-bank linked-row review and preview workflow
- compact-viewport teacher reviews filtering and scoped navigation workflow
- compact-viewport teacher disposable draft authoring workflow
- builder mutable lane
- exam detail mutable lane
- teacher review assignment and scoring
- teacher results workspace baseline
- teacher populated live monitor and analysis continuity
- compact-viewport shell reachability across dashboard, results, and reviews

What is still not strong enough:

- teacher comprehension and tag-sensitive bulk authoring are now browser-proven on Firefox and WebKit, and the teacher linked-inventory duplicate-first contract is now green locally, but broader role-difference breadth still lags the strongest teacher lanes
- some teacher-vs-institute differences are still understood by the team more than by the UI outside the shared-library and linked-row flows
- teacher shared-library and linked inventory realism still benefits from richer stage proof and larger seeded datasets
- compact-viewport evidence is better now because teacher question-bank, teacher reviews, and teacher disposable draft authoring lanes are green, but broader stage realism still helps

What gets teacher to 9:

1. add more explicit role-difference assertions where teacher intentionally differs from institute outside the now-green linked-row lane and the now-green shared-library control-split lane
2. deepen teacher shared-library and linked-inventory realism on stage with richer seeded datasets
3. keep teacher compact-viewport coverage healthy with reruns and only add more if a new gap appears
4. add one repeated-run cross-browser pack that combines teacher authoring, comprehension, and linked-inventory depth

### 4. Student Browser Surfaces

Current score:

- `9.0/10`

Why this already meets the benchmark:

- student attempt continuity is one of the strongest end-user flows
- results and analytics handoff is proven
- exam key, practice, post-submit, and results routes are all meaningfully covered
- a dedicated student mobile-web lane already exists

What is already proven:

- exam discovery
- direct exam route and exam key route
- attempt start, save, and submit
- post-submit summary
- results workspace
- analytics compare, timeline, and drilldown continuity
- student mobile-web route sanity

What is still not strong even though the section meets 9:

- weak-network comfort is still not fully browser-proven
- long-attempt comfort and real-device ergonomics still need more validation
- broader multi-attempt and publication-state depth would still help

What would push student beyond 9:

1. add weak-network retry and degraded-state assertions
2. add longer attempt and revisit comfort assertions
3. add real-device execution notes alongside browser viewport proof

### 5. Exam Creation And Lifecycle

Current score:

- `9.1/10`

Why this is above benchmark:

- guided create, advanced builder, preset-pack handoff, access policy persistence, and assignment persistence are browser-proven
- downstream student visibility and leaderboard readiness are also tied back to these lanes

What is already proven:

- generic guided creation for `practice`, `quiz`, `mock_exam`
- generic advanced-builder creation for `practice`, `quiz`, `mock_exam`
- preset-pack to builder handoff
- managed preset-library create/save persistence
- `entitlement_only`, `stars_only`, `stars_or_entitlement`
- `focus`, `fullscreen`, and related security persistence
- `selected_students` and current runtime assignment baseline

What is still not strong enough:

- full catalog breadth is larger than the current automated subset
- additional runtime assignment-mode combinations still need more coverage
- more unusual family/preset combinations would still strengthen confidence
- broader multi-learner ranking depth is still thinner than the strongest single-lane proof

What keeps this above benchmark anyway:

- the proven subset already covers the highest-value operator behavior space

### 6. Results And Reviews

Current score:

- `9.7/10`

Why this is the strongest section:

- institute, teacher, and student continuity is now browser-proven across multiple surfaces
- the route family is no longer a one-page confidence claim

What is already proven:

- institute and teacher results workspaces
- attempts, leaderboard, analysis, and live monitor
- review queue navigation and review-ready routing
- teacher manual-review assignment and scoring
- institute descriptive review publication
- institute-to-teacher moderation and recheck continuity
- student published-result storytelling
- student analytics drill-down continuity

What is still not fully strong:

- scoped analytics consistency under narrower filter combinations can still go deeper
- weak-network and performance realism are separate from browser-functional proof

What, if anything, is still worth doing:

1. add narrower filtered analytics consistency lanes
2. add stage-repeat confidence on the heaviest populated results routes

### 7. Economy And Entitlements

Current score:

- `8.75/10`

Why this is close to the benchmark:

- governance, visibility, entitlement truth, policy-disable behavior, and shared-library enforcement are already quite strong

What is already proven:

- package scope logic
- entitlement application and reactivation
- notes/date edits
- admin policy-disable contract
- package-plan propagation
- shared-library entitlement enforcement
- student economy workspace baseline

What is still not strong enough:

- the densest support-ops combinations still need more mutation depth
- broader catalog mutation combinations are still thinner than the strongest read-only lanes
- first-time operator comprehension is improved but still dense

What gets economy to 9:

1. add one or two more reversible admin economy mutation combinations
2. add one denser institute support-ops browser workflow
3. add broader catalog branch coverage where seeded data stays deterministic

### 8. Cross-Browser Desktop Sanity

Current score:

- `9.0/10`

Why this now meets the benchmark:

- cross-browser confidence is no longer limited to shell and deep-route reachability
- focused repeated-run proof now exists for both non-mutable and mutable operator lanes on Firefox and WebKit
- remaining gaps are now breadth gaps, not core desktop-viability gaps

What is already proven:

- student shell route sanity
- student results and analytics deep-route sanity
- student attempts and post-submit sanity
- admin shell route sanity
- admin deep-route sanity
- teacher shell route sanity
- teacher results deep-route sanity
- institute shell route sanity
- institute results deep-route sanity
- latest local rerun on `2026-07-06` is green for the focused operator desktop pack across Firefox and WebKit:
  - `admin-cross-browser-shell.spec.ts`
  - `admin-cross-browser-deep-routes.spec.ts`
  - `institute-cross-browser-shell.spec.ts`
  - `institute-cross-browser-results.spec.ts`
  - `teacher-cross-browser-shell.spec.ts`
  - `teacher-cross-browser-results.spec.ts`
  - grouped result: `12 passed`
- latest local rerun on `2026-07-06` also proved one reversible admin mutation lane across Firefox and WebKit:
  - `admin-economy-browser-coverage.spec.ts`
  - focused test: `@workflow @mutable browser coverage can persist and restore admin economy policy controls`
  - grouped result: `2 passed`
- latest local rerun on `2026-07-06` also proved one reversible institute-facing policy contract lane across Chromium, Firefox, and WebKit:
  - `admin-institute-economy-policy-contract.mutable.spec.ts`
  - focused test: `@workflow @mutable platform policy changes disable institute-admin grant and confirm actions`
  - grouped result: `1 passed` on Chromium
  - grouped result: `2 passed` on Firefox and WebKit
- latest local rerun on `2026-07-06` also proved one reversible teacher mutation lane across Chromium, Firefox, and WebKit:
  - `teacher-exam-detail-mutable.spec.ts`
  - focused test: `@workflow @mutable teacher can validate core exam detail page links and policy actions`
  - grouped result: `1 passed` on Chromium
  - grouped result: `2 passed` on Firefox and WebKit
- latest local rerun on `2026-07-06` also proved one real builder-to-persisted-detail mutation lane across Chromium, Firefox, and WebKit:
  - `teacher-exam-builder-mutable.spec.ts`
  - focused test: `@workflow @mutable teacher can create a disposable exam shell and mutate sections and linked questions`
  - grouped result: `1 passed` on Chromium
  - grouped result: `2 passed` on Firefox and WebKit
- latest local rerun on `2026-07-06` also proved one real results interaction lane across Chromium, Firefox, and WebKit:
  - `teacher-results-analysis-workspace.spec.ts`
  - focused test: `@workflow teacher can filter and drill through the results analysis workspace`
  - grouped result: `1 passed` on Chromium
  - grouped result: `2 passed` on Firefox and WebKit
- latest local rerun on `2026-07-07` also proved one non-teacher results interaction lane across Firefox and WebKit:
  - `institute-results-analysis-workspace.spec.ts`
  - focused test: `@workflow institute can filter and drill through the results analysis workspace`
  - grouped result: `2 passed`
- latest local rerun on `2026-07-07` also proved one non-teacher builder workflow lane across Firefox and WebKit:
  - `institute-exam-builder-workspace.spec.ts`
  - focused test: `@workflow institute can inspect builder utility handoffs and linked-question workspace`
  - grouped result: `2 passed`
- latest local rerun on `2026-07-07` also proved one institute authoring-entry workflow lane across Firefox and WebKit:
  - `institute-question-bank-workspace.spec.ts`
  - focused test: `@workflow institute can work through question bank workspace and authoring entry routes`
  - grouped result: `2 passed`
- latest local rerun on `2026-07-07` also proved one admin authoring workflow lane across Firefox and WebKit:
  - `admin-advanced-builder-workspace.spec.ts`
  - focused test: `@workflow admin can inspect advanced builder controls and preset governance lanes`
  - grouped result: `2 passed`
- latest repeated-run stability sweep on `2026-07-06` stayed green for the focused non-mutable desktop operator pack on Firefox and WebKit:
  - `admin-advanced-builder-workspace.spec.ts`
  - `admin-cross-browser-shell.spec.ts`
  - `admin-cross-browser-deep-routes.spec.ts`
  - `institute-cross-browser-shell.spec.ts`
  - `institute-cross-browser-results.spec.ts`
  - `institute-exam-builder-workspace.spec.ts`
  - `institute-question-bank-workspace.spec.ts`
  - `institute-results-analysis-workspace.spec.ts`
  - `teacher-cross-browser-shell.spec.ts`
  - `teacher-cross-browser-results.spec.ts`
  - `teacher-results-analysis-workspace.spec.ts`
  - grouped result with `--repeat-each=2`: `44 passed`
- latest repeated-run stability sweep on `2026-07-06` also stayed green for the current focused mutable desktop proof pack:
  - `admin-economy-browser-coverage.spec.ts`
  - focused persist-and-restore policy lane on Firefox and WebKit
  - grouped result with `--repeat-each=2`: `4 passed`
  - `admin-institute-economy-policy-contract.mutable.spec.ts`
  - `teacher-exam-detail-mutable.spec.ts`
  - `teacher-exam-builder-mutable.spec.ts`
  - grouped result with `--repeat-each=2` on Firefox and WebKit: `12 passed`

What is still not strong enough:

- the heaviest destructive flows are still opt-in and not yet broad enough to claim equal coverage across all operator families
- teacher comprehension and teacher bulk tag/topic authoring now have cross-browser mutable proof, but destructive breadth is still not evenly distributed across every operator family
- compact-viewport operator workflow depth is still much earlier than desktop depth

What would push this beyond 9:

1. keep the repeated-run pack in routine reruns so regression evidence stays fresh instead of one-time
2. add compact-viewport operator workflow depth beyond shell sanity
3. widen destructive mutation breadth outside the current strongest teacher and institute lanes

### 9. Student Mobile-Web Baseline

Current score:

- `8.5/10`

Why this is strong:

- there is already a dedicated phone-viewport baseline for student web

What is already proven:

- student mobile navigation shell sanity
- mobile exams, attempts, and results route reachability
- mobile exam-detail sanity
- results-to-summary continuity
- truthful fallback state panels

What is still not strong enough:

- this is still browser viewport proof, not real-device comfort proof
- weak-network and long-attempt comfort still need more depth
- mobile mutation depth can still expand

What gets student mobile-web to 9:

1. add one longer mobile attempt continuity lane
2. add weak-network or throttled-state assertions
3. add a small real-device validation companion runbook

### 10. Operator Small-Screen Browser Confidence

Current score:

- `8.9/10`

Why this is weak:

- admin, institute, and teacher now have one shared compact-viewport baseline, but the evidence is still much shallower than desktop proof

What is already proven:

- `tests/e2e/workflow/operator-mobile-shell-sanity.spec.ts`
- admin mobile viewport route reachability across dashboard, economy, and security
- institute mobile viewport route reachability across dashboard, economy, and reviews
- teacher mobile viewport route reachability across dashboard, results, and reviews
- `tests/e2e/workflow/teacher-mobile-question-bank-workflow.spec.ts`
- teacher compact-viewport linked question-bank review and preview workflow
- `tests/e2e/workflow/teacher-mobile-reviews-workflow.spec.ts`
- teacher compact-viewport reviews filtering and scoped-navigation workflow
- `tests/e2e/workflow/teacher-mobile-authoring-workflow.spec.ts`
- teacher compact-viewport disposable draft authoring workflow
- `tests/e2e/workflow/institute-mobile-question-bank-workflow.spec.ts`
- institute compact-viewport question-bank intake and authoring-entry workflow
- `tests/e2e/workflow/institute-mobile-reviews-workflow.spec.ts`
- institute compact-viewport reviews filtering and scoped-navigation workflow
- `tests/e2e/workflow/admin-mobile-economy-workflow.spec.ts`
- admin compact-viewport economy lane switching and dense policy-form review workflow
- focused Firefox and WebKit rerun pack for all current operator mobile workflows
  - grouped result: `10 passed`

What is still not strong enough:

- real-device operator compact-viewport proof
- broader repeated-run mobile evidence across all operator lanes
- one more denser admin compact-viewport workflow outside economy would still improve comfort on the heaviest operator surface

What keeps operator small-screen at 9:

1. keep the current admin, institute, and teacher compact-viewport lanes green in routine reruns
2. add one more denser admin compact-viewport workflow outside economy
3. add one mutation lane or real-device companion validation per operator role
4. keep Firefox and WebKit companion reruns alive for the newest mobile lanes

### 11. Mutable Destructive Workflow Confidence

Current score:

- `8.0/10`

Why this is below the benchmark:

- many strong opt-in mutable lanes exist, but not every high-value mutation family has equal depth or stability

What is already proven:

- institute exam mutable
- institute results mutable
- institute question-bank mutable
- institute roster and import mutable
- teacher builder mutable
- teacher exam detail mutable
- teacher review mutable
- teacher comprehension mutable
- teacher results mutable
- student attempt mutable
- student exam-key mutable
- admin advanced-builder learner handoff mutable

What is still not strong enough:

- some critical mutable lanes remain opt-in rather than always-on
- some mutation families still depend heavily on seed stability
- institute descriptive scoring mutation is not as explicit as the strongest teacher review mutation
- admin economy mutation depth remains intentionally shallow

What gets mutable confidence to 9:

1. promote the most stable mutable lanes into more routine execution
2. deepen admin economy and institute scoring mutation families
3. formalize stage-seed reset expectations for mutation reliability
4. record repeated-run stability for the heaviest mutable bundles

## Priority Order To Reach The 9 Benchmark

### Phase 1

These give the fastest practical movement:

1. admin institutes and people negative-path depth
2. admin economy reversible mutation depth
3. teacher linked-inventory, role-difference, and compact-viewport depth
4. institute descriptive scoring mutation clarity

### Phase 2

These raise breadth and cross-environment confidence:

1. cross-browser mutation depth for admin, institute, and teacher
2. broader assignment-mode and family-combination coverage
3. repeated-run stability evidence for admin and mutable-heavy bundles

### Phase 3

These close the biggest remaining structural browser gaps:

1. operator small-screen suites
2. student mobile longer-runtime and weak-network depth
3. stage-repeat validation on the densest browser workflows

## Practical Next Test Targets

If we are working specifically toward the benchmark first, the best immediate next test targets are:

1. admin institute account-control mutation and login-state edge cases
2. admin people mixed login-state and validation failures
3. admin economy reversible mutation branches
4. teacher comprehension mutation and negative paths
5. institute descriptive scoring mutation continuity
6. one Firefox/WebKit mutation lane for institute exam persistence
7. one Firefox/WebKit mutation lane for teacher review or question-bank persistence
8. one admin small-screen baseline suite

## Progress Update Rule

Update this document after each browser-hardening phase:

- record the new score
- record the suites added or stabilized
- record what moved from weak to strong
- record what still blocks the `9/10` benchmark
