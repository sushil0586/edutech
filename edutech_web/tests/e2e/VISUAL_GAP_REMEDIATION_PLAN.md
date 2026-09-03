# Visual Gap Remediation Plan

This document tracks the current browser-verified visual drift in `edutech_web` and lays out a phase-wise plan to close it.

Reference date: Monday, July 27, 2026.

## Scope Snapshot

Current visual-suite inventory on Monday, July 27, 2026:

- total visual workflow specs in repo: `30`
- desktop-first priority: institute, teacher, student, release alignment
- mobile follow-up priority: student mobile, operator mobile, release mobile

This document is intentionally phase-driven so we can improve confidence without mixing:

- functional breakage
- real visual regressions
- acceptable design evolution with stale snapshots

## Current Position

Functional confidence improved materially on Monday, July 27, 2026:

- frontend build: passed
- frontend lint: passed
- Phase 1 functional Chromium batch: `75 passed, 14 skipped, 4 failed`
- targeted rerun of those `4` functional failures: `4 passed`

That means the main remaining confidence drag is now visual stability rather than core workflow breakage.

Most recent focused teacher remediation on Monday, July 27, 2026:

- targeted teacher desktop batch:
  - `tests/e2e/workflow/teacher-advanced-builder-visual.spec.ts`
  - `tests/e2e/workflow/teacher-institute-visual-contract.spec.ts`
  - `tests/e2e/workflow/teacher-report-surfaces-visual.spec.ts`
- refresh result: `16 passed`
- verification result: `16 passed`

Observed outcome:

- the only non-snapshot issue in the residual teacher wave was a timeout in the teacher advanced-builder visual flow
- the failure was caused by the spec waiting for builder controls during the current entitlement-gated teacher state
- the visual spec was hardened to accept the entitlement gate as a valid current surface for the seeded teacher account instead of timing out on missing academic controls
- the rest of the residual teacher failures were coherent snapshot drift across KPI strips, question-bank surfaces, report rows, and report hero/cards rather than broken layout

Working decision:

- classify the resolved teacher advanced-builder timeout as `Category A test-contract drift`, not a product-layout regression
- classify the teacher/institute contract and teacher report surfaces refresh as `Category B coherent UI evolution`
- treat the teacher desktop family as closed after the immediate no-update verification rerun passed

## Latest Cluster Result

Most recent focused visual rerun on Monday, July 27, 2026:

- institute report cluster:
  - `tests/e2e/workflow/institute-report-surfaces-visual.spec.ts`
  - `tests/e2e/workflow/institute-results-live-visual.spec.ts`
- result: `5 failed, 1 passed`

Observed breakdown:

- passed:
  - `institute-results-live-visual.spec.ts`
- failed:
  - subject report KPI strip
  - topic mastery first table row
  - wrong questions KPI strip
  - time management KPI strip
  - learner report KPI strip

Current interpretation:

- this cluster does not presently look like a broken-layout regression
- the KPI failures are visually coherent and repeat across the same summary-grid family
- the weak-area row failure appears to be content-width expansion under the current seeded data, not a collapsed table

Working decision:

- classify the institute KPI-strip failures as `Category B`
- classify the weak-area first-row width change as `Category C`
- do not spend time on CSS surgery here unless another desktop cluster shows obvious layout breakage in the same selectors
- use this cluster as a likely first controlled snapshot-refresh candidate after we verify at least one more desktop cluster behaves the same way

Second focused desktop probe on Monday, July 27, 2026:

- student analytics and dense-report cluster:
  - `tests/e2e/workflow/student-analytics-actions-sources-visual.spec.ts`
  - `tests/e2e/workflow/student-analytics-drilldown-visual.spec.ts`
  - `tests/e2e/workflow/student-analytics-results-compare-visual.spec.ts`
  - `tests/e2e/workflow/student-dashboard-report-visual.spec.ts`
  - `tests/e2e/workflow/student-dense-report-visual.spec.ts`
- partial result before intentional stop: `3 failed, 1 interrupted, 1 passed, 11 did not run`

Confirmed failures from that probe:

- `student-actions-hero.png`
- `student-source-drilldown-hero.png`
- `student-timeline-drilldown-hero.png`

Observed pattern:

- all confirmed failures are on `.analyticsDetailHero`
- pixel drift is modest and repeatable
- screenshots remain visually coherent rather than broken, clipped, or collapsed
- no evidence yet that this family needs emergency CSS repair before more desktop classification work

Working decision:

- classify the confirmed student analytics hero failures as `Category B`
- treat `.analyticsDetailHero` as the second confirmed shared desktop drift family
- finish full student analytics classification before refreshing baselines, but do not assume a code regression just because the snapshots are red

Third focused desktop probe on Monday, July 27, 2026:

- student post-submit and report-surfaces cluster:
  - `tests/e2e/workflow/student-post-submit-visual.spec.ts`
  - `tests/e2e/workflow/student-report-surfaces-visual.spec.ts`
  - `tests/e2e/workflow/student-utility-visual.spec.ts`
- partial result before intentional stop: `4 failed, 1 interrupted, 8 did not run`

Confirmed failures from that probe:

- `student-summary-pending-actions.png`
- `student-summary-review-ready-actions.png`
- `student-attempts-card.png`
- `student-results-card.png`

Observed pattern:

- `.studentInsightsTwoColumn` snapshots are consistently taller than baseline
- student attempts and results cards/rows show stable height and density changes
- no confirmed evidence yet of clipping, overlap, broken controls, or collapsed hierarchy
- the interrupted practice workspace case is not a product failure signal because the run was intentionally stopped mid-cluster

Working decision:

- classify the confirmed post-submit panel drift as `Category B`
- classify the student attempts/results card and row shifts as `Category B`
- treat student post-submit plus report card density as the third confirmed shared desktop drift family
- defer no longer: utility now has its own completed classification below

Fourth focused desktop probe on Monday, July 27, 2026:

- utility-specific student cluster:
  - `tests/e2e/workflow/student-utility-visual.spec.ts`
- result: `5 failed, 1 passed`

Confirmed failures from that probe:

- `student-profile-primary-grid.png`
- `student-notifications-hero.png`
- `student-wallet-hero.png`
- `student-subscriptions-hero.png`
- `student-search-guide-card.png`

Observed pattern:

- `.studentInsightsTwoColumn` continues to show small, stable drift in account/profile surfaces
- `.studentInsightHeroCard.studentInsightHeroCardCompact` is a repeated utility drift family across notifications, wallet, and subscriptions
- the search guide card shows a small stable card-content diff
- the cluster stayed operational and visually coherent; no clipping, overlap, collapsed controls, or broken hierarchy was observed

Working decision:

- classify profile, notifications, wallet, subscriptions, and search as `Category B`
- treat compact student utility hero drift as the fourth confirmed shared desktop drift family
- treat the profile two-column summary drift as part of the same broader student surface refresh wave already seen in post-submit screens

Fifth focused desktop probe on Monday, July 27, 2026:

- teacher and release alignment cluster:
  - `tests/e2e/workflow/teacher-report-surfaces-visual.spec.ts`
  - `tests/e2e/workflow/teacher-institute-visual-contract.spec.ts`
  - `tests/e2e/workflow/teacher-advanced-builder-visual.spec.ts`
  - `tests/e2e/workflow/institute-advanced-builder-visual.spec.ts`
  - `tests/e2e/workflow/release-ui-alignment-visual.spec.ts`
- partial result before intentional stop: `2 failed, 1 interrupted, 3 passed, 15 did not run`

Confirmed failures from that probe:

- `release-student-practice-filters-card.png`
- `release-teacher-reviews-filters.png`

Observed pattern:

- the student practice filters card is materially shorter than the old baseline but still visually coherent
- the teacher reviews filter form shows a small, stable diff rather than a broken control stack
- admin and institute release alignment cases had already advanced past their turn in the run without surfacing a failure before the stop
- the teacher advanced-builder interruption is not evidence of a product issue because the batch was intentionally stopped while scope setup was still running

Working decision:

- classify the two confirmed release alignment diffs as `Category B`
- treat release filter-card and teacher filter-form drift as the fifth confirmed desktop drift family
- schedule teacher report and advanced-builder visuals for a clean dedicated follow-up pass only if we still need more confidence before snapshot refresh

## First Controlled Refresh Outcome

First controlled desktop snapshot-refresh batch completed on Monday, July 27, 2026:

- cluster:
  - `tests/e2e/workflow/institute-report-surfaces-visual.spec.ts`
  - `tests/e2e/workflow/institute-results-live-visual.spec.ts`
- refresh command outcome: `6 passed`
- immediate verification rerun outcome: `6 passed`

What was refreshed:

- institute KPI-strip snapshots in subject, wrong-questions, time-management, and learner detail reports
- institute report row/card snapshots where coherent seeded-density changes were confirmed

Decision:

- the institute report family is now accepted as intentionally stable under the current desktop UI
- this cluster no longer blocks desktop visual confidence
- the next controlled refresh batch should move to the student analytics hero family

Second controlled desktop snapshot-refresh batch completed on Monday, July 27, 2026:

- cluster:
  - `tests/e2e/workflow/student-analytics-actions-sources-visual.spec.ts`
  - `tests/e2e/workflow/student-analytics-drilldown-visual.spec.ts`
- refresh command outcome: `6 passed`
- immediate verification rerun outcome: `6 passed`

What was refreshed:

- student analytics hero snapshots across action-center, source drilldown, timeline drilldown, subject drilldown, and question-type drilldown surfaces
- related KPI-strip and primary-grid snapshots that changed coherently with the same analytics hero family

Decision:

- the student analytics hero family is now accepted as intentionally stable under the current desktop UI
- this cluster no longer blocks desktop visual confidence
- the next controlled refresh batch should move to the student post-submit and report-card density family

Third controlled desktop snapshot-refresh batch completed on Monday, July 27, 2026:

- cluster:
  - `tests/e2e/workflow/student-post-submit-visual.spec.ts`
  - `tests/e2e/workflow/student-report-surfaces-visual.spec.ts`
- refresh command outcome: `7 passed`
- immediate verification rerun outcome: `7 passed`

What was refreshed:

- student post-submit summary, review-state, and review-ready result-card snapshots
- student report surface snapshots across attempts, results, practice, exams, and weak-areas views where coherent card-density changes were confirmed

Additional contract repair completed during the refresh:

- the review-ready results snapshot lane in `student-post-submit-visual.spec.ts` was hardened to target the current first visible review-ready result row instead of relying on a stale exact exam-title match that no longer exists in the live seeded results table

Decision:

- the student post-submit and report-card density family is now accepted as intentionally stable under the current desktop UI
- this cluster no longer blocks desktop visual confidence
- the next controlled refresh batch should move to the student utility hero and two-column family

Fourth controlled desktop snapshot-refresh batch completed on Monday, July 27, 2026:

- cluster:
  - `tests/e2e/workflow/student-utility-visual.spec.ts`
- refresh command outcome: `6 passed`
- immediate verification rerun outcome: `6 passed`

What was refreshed:

- profile two-column summary snapshot
- notifications, wallet, and subscriptions hero and KPI-strip snapshots
- search guide card snapshot

Decision:

- the student utility hero and two-column family is now accepted as intentionally stable under the current desktop UI
- this cluster no longer blocks desktop visual confidence
- the next controlled refresh batch should move to the release filter-card and teacher-filter family

Fifth controlled desktop snapshot-refresh batch completed on Monday, July 27, 2026:

- cluster:
  - `tests/e2e/workflow/release-ui-alignment-visual.spec.ts`
- refresh command outcome: `4 passed`
- immediate verification rerun outcome: `4 passed`

What was refreshed:

- student practice filters card snapshot
- teacher reviews filter form snapshot
- admin and institute release-alignment control snapshots

Decision:

- the release filter-card and teacher-filter family is now accepted as intentionally stable under the current desktop UI
- this cluster no longer blocks desktop visual confidence
- the next desktop task should be a broad non-mobile verification rerun, plus any still-unverified teacher-only outliers if they remain important

## Residual Desktop Outlier Repair

Follow-up residual desktop refresh completed on Monday, July 27, 2026:

- spec:
  - `tests/e2e/workflow/student-analytics-results-compare-visual.spec.ts`
- refresh command outcome: `1 passed`
- immediate verification rerun outcome: `1 passed`

Why this follow-up was needed:

- the first broad non-mobile desktop verification rerun surfaced `student-results-compare-hero.png` as the remaining confirmed red case inside the broader student analytics hero family
- that surface had not yet been refreshed with the rest of the accepted analytics hero family

Decision:

- the student analytics results-compare surface now matches the rest of the accepted analytics hero family
- the next confidence move should be another broad non-mobile desktop verification rerun to measure what remains after all controlled desktop refreshes completed on Monday, July 27, 2026

## Broad Desktop Verification Snapshot

Second broad non-mobile desktop verification rerun on Monday, July 27, 2026:

- command scope: non-mobile Chromium visual suite
- progress before intentional stop: `19 passed, 1 failed, 1 interrupted, 5 skipped, 40 did not run`

What this proved:

- refreshed institute report family held cleanly in the broad suite
- refreshed release-alignment family held cleanly in the broad suite
- refreshed student analytics hero family held cleanly in the broad suite
- refreshed student analytics results-compare follow-up also held cleanly before the later stop

New residual desktop findings from that rerun:

1. `tests/e2e/workflow/student-attempt-visual.spec.ts`
   - failure type: missing `.attemptLiveCheckpoint` locator at screenshot time
   - interpretation: this looks like a real contract/runtime timing issue, not snapshot drift

2. `tests/e2e/workflow/student-dashboard-analytics-visual.spec.ts`
   - `student-dashboard-recommendation-card.png`
   - `student-analytics-hero.png`
   - interpretation: this looks like a new coherent student dashboard/analytics surface family that has not yet been refreshed

Working decision:

- treat `student-attempt-visual.spec.ts` as a functional visual-contract repair candidate
- treat `student-dashboard-analytics-visual.spec.ts` as the next controlled snapshot-refresh family candidate after its surfaces are confirmed coherent
- do not resume another full desktop rerun until these two residual buckets are handled

## Release Teacher-Filter Residual Refresh

Follow-up release teacher-filter refresh completed on Monday, July 27, 2026:

- spec:
  - `tests/e2e/workflow/release-ui-alignment-visual.spec.ts`
  - lane: `teacher reviews controls and queue header stay aligned for release`
- refresh command outcome: `1 passed`
- immediate verification rerun outcome: `1 passed`

Why this follow-up was needed:

- the next broad non-mobile desktop verification rerun still showed a tiny residual diff on `release-teacher-reviews-filters.png`
- this was a very small, coherent drift and not a broken layout

Decision:

- the release teacher-filter surface now matches the accepted release alignment family
- the next confidence move should be another broad non-mobile desktop verification rerun, with special attention on whether any non-refreshed teacher-only or student analytics subject-drilldown flow still surfaces

## Student Attempt Residual Repair

Follow-up student attempt visual repair completed on Monday, July 27, 2026:

- spec:
  - `tests/e2e/workflow/student-attempt-visual.spec.ts`
- refresh command outcome: `1 passed`
- immediate verification rerun outcome: `1 passed`

What changed:

- the visual spec was aligned from the removed `.attemptLiveCheckpoint` block to the current `.attemptQuestionStateInline` live runtime strip
- the refreshed baselines now reflect the current compact live-checkpoint surface and the current attempt rail contract

Decision:

- `student-attempt-visual.spec.ts` is now accepted as stable under the current student runtime UI
- the next desktop target is the newly surfaced student dashboard analytics/report family from the broad rerun

## Student Dashboard Residual Refresh

Follow-up student dashboard analytics/report refresh completed on Monday, July 27, 2026:

- cluster:
  - `tests/e2e/workflow/student-dashboard-analytics-visual.spec.ts`
  - `tests/e2e/workflow/student-dashboard-report-visual.spec.ts`
- refresh command outcome: `6 passed`
- immediate verification rerun outcome: `6 passed`

What was refreshed:

- dashboard recommendation and premium summary surfaces
- analytics landing hero and topic panel surfaces
- dashboard report KPI strip, summary band, spotlight/action queue, premium lane, bottom summary, and performance summary card surfaces

Decision:

- the student dashboard analytics/report family is now accepted as intentionally stable under the current desktop UI
- this cluster no longer blocks desktop visual confidence
- the next confidence move should be another broad non-mobile desktop verification rerun to measure what remains after the full desktop refresh wave

## Student Dense Report Residual Refresh

Follow-up student dense-report refresh completed on Monday, July 27, 2026:

- spec:
  - `tests/e2e/workflow/student-dense-report-visual.spec.ts`
- refresh command outcome: `5 passed`
- immediate verification rerun outcome: `5 passed`

What was refreshed:

- wrong-questions KPI strip and primary table row
- time-management KPI strip and primary row
- study-recommendations hero, KPI strip, and primary row
- reports hub hero, KPI strip, and manifest table surfaces

Decision:

- the student dense-report family is now accepted as intentionally stable under the current desktop UI
- this cluster no longer blocks desktop visual confidence
- the next confidence move should be another broad non-mobile desktop verification rerun to measure the true remaining desktop count after the expanded refresh wave

## Confidence Summary

Current confidence by layer on Monday, July 27, 2026:

- backend/frontend compile health: strong
- frontend lint health: strong
- core functional Playwright recovery: materially improved
- full desktop visual confidence: moderate to low until the repeated drift families are closed
- mobile visual confidence: not yet ready to call clean until desktop shared layout drift is resolved first

## What The Current Visual Evidence Shows

The active non-mobile Chromium visual batch surfaced a broad desktop drift wave rather than one isolated failing page.

Confirmed failure clusters from Monday, July 27, 2026:

- institute report surfaces
  - KPI strip drift across multiple report pages
  - weak-areas row width/shape drift
  - wrong-questions and time-management summary drift
  - learner report KPI/support-card drift
- release alignment surfaces
  - student practice filters card height changed substantially
  - teacher reviews filters drift
- student analytics surfaces
  - action-center hero drift
  - source drilldown hero drift
  - timeline drilldown hero drift
- student dashboard and report surfaces
  - premium/report summary card height drift
  - performance summary card height drift
  - attempts/results/practice/exams cards drift
  - weak-areas hero drift
- student post-submit surfaces
  - pending summary action block drift
  - review-ready action block drift
- student utility surfaces
  - profile primary grid drift
  - notifications hero drift
  - wallet hero drift
  - subscriptions hero drift
  - search guide card drift

## Visual Inventory By Cluster

This is the execution grouping we should use instead of attacking one failing file at a time.

### Desktop Core

- `institute-report-surfaces-visual.spec.ts`
- `institute-results-live-visual.spec.ts`
- `teacher-report-surfaces-visual.spec.ts`
- `teacher-institute-visual-contract.spec.ts`
- `teacher-advanced-builder-visual.spec.ts`
- `institute-advanced-builder-visual.spec.ts`
- `release-ui-alignment-visual.spec.ts`
- `route-visual-pass.spec.ts`
- `exam-detail-draft-visual.spec.ts`

### Student Desktop

- `student-report-surfaces-visual.spec.ts`
- `student-dashboard-report-visual.spec.ts`
- `student-dense-report-visual.spec.ts`
- `student-post-submit-visual.spec.ts`
- `student-utility-visual.spec.ts`
- `student-dashboard-analytics-visual.spec.ts`
- `student-analytics-actions-sources-visual.spec.ts`
- `student-analytics-drilldown-visual.spec.ts`
- `student-analytics-results-compare-visual.spec.ts`
- `student-attempt-visual.spec.ts`

### Mobile Visual

- `student-mobile-report-surfaces-visual.spec.ts`
- `student-mobile-dashboard-report-visual.spec.ts`
- `student-mobile-dense-report-visual.spec.ts`
- `student-mobile-dashboard-analytics-visual.spec.ts`
- `student-mobile-analytics-extended-visual.spec.ts`
- `student-mobile-post-submit-visual.spec.ts`
- `student-mobile-utility-visual.spec.ts`
- `student-mobile-attempt-visual.spec.ts`
- `operator-mobile-report-surfaces-visual.spec.ts`
- `operator-mobile-dense-visual.spec.ts`
- `release-ui-mobile-visual.spec.ts`

## Working Interpretation

This does not look like random snapshot churn.

The pattern suggests one or more shared visual changes across:

- report hero sections
- KPI strip/card spacing
- card heights and content density
- filter card composition
- student utility hero blocks

So the next work should start with layout-system investigation before mass snapshot updates.

## Likely Root-Cause Areas

These are the first places to inspect before refreshing baselines:

1. Shared layout and spacing tokens
   - `src/app/globals.css`
   - shared report hero classes
   - KPI strip/grid classes
   - student hero card variants

2. Report/card component structure changes
   - student report cards
   - institute report summary grids
   - analytics hero sections
   - post-submit summary/action panels

3. Copy/content expansion
   - extra helper text
   - added metadata lines
   - CTA or status rows increasing card height

4. Data-shape-driven visual growth
   - longer seeded labels
   - different metrics text
   - larger table-row content than prior baselines

## Visual Gap Categories

Use these categories during triage so we do not mix real regressions with expected baseline churn.

### Category A: Shared Layout Regression

Signals:

- same hero/KPI drift across many pages
- same height changes across related views
- same spacing issue in student and institute surfaces

Action:

- fix CSS/layout/component code first
- do not refresh baselines until the shared issue is understood

### Category B: Intentional UI Improvement With Stale Snapshots

Signals:

- layout still looks coherent
- dimension changed, but hierarchy and alignment remain good
- multiple surfaces changed consistently after a recent design improvement

Action:

- verify visually
- refresh snapshots in a controlled group

### Category C: Seed/Data Expansion Drift

Signals:

- only one row/card grows
- long labels or extra seeded content push height/width
- rest of the page remains visually stable

Action:

- decide whether data should be normalized in fixtures
- or accept the new stable visual and update snapshots

### Category D: Real Per-Surface Visual Bug

Signals:

- broken wrapping
- clipped text
- collapsed controls
- uneven columns
- CTA overlap or missing spacing

Action:

- fix page/component code
- rerun that surface before any snapshot refresh

## Phase-Wise Plan

### Phase 1: Capture And Cluster

Goal:

- lock the current desktop visual truth into named drift families
- group failures by shared component pattern instead of by file only

Deliverables:

- current failure list by surface family
- grouped list by:
  - institute report
  - release alignment
  - student analytics
  - student report/post-submit
  - student utility
  - teacher/institute contract
  - advanced-builder visuals

Exit criteria:

- every current visual failure assigned to one of the categories above

### Phase 2: Shared Layout Investigation

Goal:

- inspect shared CSS and component building blocks before page-specific edits

Focus areas:

- `resultsSummaryGrid`
- `analyticsDetailHero`
- `studentInsightHeroCard`
- `studentInsightsTwoColumn`
- `metricCard`
- report summary strip wrappers
- filter-card container classes
- student report card/table row components
- teacher review filter form
- student practice filter card

Deliverables:

- short root-cause note per shared layout family
- decision: code fix or snapshot refresh candidate

Exit criteria:

- known shared drift families identified with named owner files/components

### Phase 3: Institute Report Repair

Goal:

- stabilize the institute report visual family first because it is a compact, clearly repeated cluster

Targets:

- subject report
- topic mastery report
- wrong questions report
- time management report
- learner detail report

Approach:

- prefer fixing shared KPI strip and report-row layout if the same issue repeats
- refresh institute report snapshots only after shared report visuals are stable
- if the visuals remain coherent and only text wrapping, badge width, or value density changed, treat the cluster as a controlled snapshot-refresh candidate instead of forcing CSS back to the older baseline

Exit criteria:

- institute report visual spec group reruns cleanly on Chromium

Suggested command:

```bash
cd edutech_web
npx playwright test \
  tests/e2e/workflow/institute-report-surfaces-visual.spec.ts \
  tests/e2e/workflow/institute-results-live-visual.spec.ts \
  --project=chromium --reporter=line
```

### Phase 4: Student Analytics And Dense Reports

Goal:

- repair the broad student analytics/report hero and KPI cluster

Targets:

- analytics actions/sources
- analytics drilldown
- dense report surfaces
- dashboard report surfaces

Approach:

- inspect shared analytics hero/card classes first
- check whether increased content density is intentional
- only then update snapshots in grouped batches

Exit criteria:

- student analytics + dense report visual groups rerun cleanly on Chromium

Suggested command:

```bash
cd edutech_web
npx playwright test \
  tests/e2e/workflow/student-analytics-actions-sources-visual.spec.ts \
  tests/e2e/workflow/student-analytics-drilldown-visual.spec.ts \
  tests/e2e/workflow/student-analytics-results-compare-visual.spec.ts \
  tests/e2e/workflow/student-dashboard-report-visual.spec.ts \
  tests/e2e/workflow/student-dense-report-visual.spec.ts \
  --project=chromium --reporter=line
```

### Phase 5: Student Post-Submit And Utility Surfaces

Goal:

- stabilize the student account, wallet, notifications, subscriptions, search, and post-submit summary views

Targets:

- post-submit summary states
- profile
- notifications
- wallet
- subscriptions
- search guide

Approach:

- treat these as a second shared student-hero family
- inspect whether compact hero and two-column summary components changed globally

Exit criteria:

- student utility + post-submit visual groups rerun cleanly on Chromium

Suggested command:

```bash
cd edutech_web
npx playwright test \
  tests/e2e/workflow/student-post-submit-visual.spec.ts \
  tests/e2e/workflow/student-report-surfaces-visual.spec.ts \
  tests/e2e/workflow/student-utility-visual.spec.ts \
  --project=chromium --reporter=line
```

### Phase 6: Release Alignment Surfaces

Goal:

- close the smaller but high-signal release alignment set

Targets:

- student practice filters card
- teacher reviews filters
- admin/institute report control alignment cases in the same spec

Approach:

- confirm whether these are real layout regressions or stale snapshots after filter-card redesign

Exit criteria:

- `release-ui-alignment-visual.spec.ts` reruns cleanly on Chromium

Suggested command:

```bash
cd edutech_web
npx playwright test \
  tests/e2e/workflow/release-ui-alignment-visual.spec.ts \
  tests/e2e/workflow/teacher-report-surfaces-visual.spec.ts \
  tests/e2e/workflow/teacher-institute-visual-contract.spec.ts \
  --project=chromium --reporter=line
```

### Phase 7: Snapshot Refresh Pass

Goal:

- refresh only the visual baselines that are confirmed intentional and stable

Rules:

- do not bulk refresh all snapshots blindly
- refresh by cluster after visual review
- capture notes explaining why each refresh was accepted

Suggested cluster order:

1. institute reports
2. student analytics + dense reports
3. student utility + post-submit
4. release alignment

Exit criteria:

- updated baselines correspond only to reviewed, accepted UI states

### Phase 8: Desktop Visual Confirmation

Goal:

- rerun the full non-mobile visual Chromium batch after fixes and controlled snapshot refreshes

Success target:

- clean Chromium desktop visual pass
- or a very small explicitly understood residual set

Exit criteria:

- documented final desktop visual result

### Phase 9: Mobile Visual Wave

Goal:

- once desktop is stable, move to mobile visual repair with the same discipline

Targets:

- student mobile report surfaces
- student mobile dashboard/report/analytics
- operator mobile report surfaces
- release mobile visual surfaces

Reason for sequence:

- desktop is already showing shared drift patterns that likely influence mobile too
- fixing shared tokens/components first should reduce mobile churn later

## Execution Order Recommendation

Recommended order for actual work:

1. freeze and classify desktop failures
2. investigate shared layout families
3. repair institute report cluster
4. classify and rerun student analytics/report cluster
5. classify utility-specific student surfaces
6. refresh approved desktop snapshots by family
7. rerun desktop visual suite
8. move to mobile visual suite
9. handle any residual desktop outliers individually

## Desktop Refresh Candidate Order

Based on Monday, July 27, 2026 evidence so far, the most likely first controlled desktop refresh order is:

1. institute report KPI and report-row family
2. student analytics hero family
3. student post-submit and report-card density family
4. student utility hero and two-column family
5. release filter-card and teacher-filter family

Reason for this order:

- the first four families are already strongly supported by repeated, coherent drift
- release alignment is smaller and can be refreshed after the broader student families settle
- advanced-builder and teacher-only visuals have not yet shown enough confirmed red evidence to justify bulk snapshot refresh in the same pass

## Phase Ownership Model

Use this ownership model so each phase ends with a measurable outcome.

### Phase A: Diagnose

- inspect screenshots and snapshot diffs
- map each failure to shared selector families
- decide: code fix, fixture normalization, or snapshot refresh candidate

### Phase B: Repair

- change shared CSS/component structure first
- avoid per-spec snapshot churn while the same visual family is still unstable

### Phase C: Validate

- rerun the exact cluster that was touched
- inspect fresh diffs manually before accepting any snapshot update

### Phase D: Baseline

- update snapshots only when the UI is visually coherent
- annotate the reason in this plan or the full runbook

## Decision Rules

Use these rules while working:

- If a diff repeats across multiple pages with the same selector family, prefer code investigation first.
- If a diff is visually coherent and repeated intentionally after a design shift, prefer grouped snapshot refresh.
- If a diff is caused by unstable or unusually long seeded content, decide whether fixture normalization is better than snapshot churn.
- Do not refresh snapshots for a page with obvious broken spacing, clipping, or collapsed hierarchy.

## Definition Of Done

The visual wave is only complete when all of the following are true:

- desktop visual failure clusters are classified and resolved
- updated snapshots are intentional and documented
- desktop Chromium visual batch reruns cleanly
- mobile visual batch is rerun after desktop stabilization
- the runbook is updated with final visual results and any accepted baseline refresh notes

## Immediate Next Step

The cleanest next execution move is still the institute report cluster first.

Reason:

- it has the most obviously repeated KPI-strip and summary-layout drift
- it is small enough to inspect deeply
- it is likely to expose the shared CSS/component issue that also affects student report surfaces later
