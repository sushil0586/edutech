# Institute Full Surface Browser Plan

Last updated: 2026-07-13

Latest baseline progress:

- direct browser proof added in `edutech_web/tests/e2e/workflow/institute-route-gap-baseline.spec.ts`
- verified green on `http://localhost:3006`
- latest targeted result: `3/3 passed`
- mutable institute comprehension proof added in `edutech_web/tests/e2e/workflow/institute-comprehension-mutable.spec.ts`
- latest targeted mutable result on `http://localhost:3006`: `1/1 passed`
- browser coverage added for `search`, `settings`, and question-create routes
- latest targeted browser-validation result on `http://localhost:3006`: `11/11 passed`
- browser coverage added for `preset-packs` and `security`
- latest targeted security result on `http://localhost:3006`: `5/5 passed`
- dedicated comprehension-import browser pack added in `institute-comprehension-import-browser-coverage.spec.ts`
- `QUESTION_BANK_BULK_IMPORT` enabled for demo institute `DLI001` through backend entitlement provisioning
- latest comprehension-import result on `http://localhost:3007`: `2/2 passed`
- grouped mutable rerun with flags enabled on the updated build at `http://localhost:3007`: roster import `passed`, roster CRUD `passed`, teacher assignments `passed`, academic setup `passed`
- grouped mutable advanced-builder rerun with flags enabled on `http://localhost:3006`: `practice` `passed`, `quiz` `passed`, `mock_exam` `passed`
- grouped institute onboarding/browser-only pack added in `institute-browser-onboarding-pack.spec.ts`
- latest onboarding-pack result on `http://localhost:3007`: `3/3 passed`
- consolidated institute confidence bundle on `http://localhost:3007`: `30/30 passed`

## Purpose

This is the institute-side equivalent of the admin hardening approach.

The goal is simple:

- test every institute route through the browser
- keep CRUD paths, validation, edge states, and navigation in scope
- leave no institute page unclassified
- make it obvious which areas are already strong, which are only partially proven, and which still need first-class Playwright proof

This plan is intentionally browser-first.
Where backend setup is needed, it should be used only to seed state or clean up state around browser scenarios.

## Scope

Covered route inventory from `edutech_web/src/app/(institute)/institute`:

1. `/institute/dashboard`
2. `/institute/people`
3. `/institute/academic-setup`
4. `/institute/teacher-assignments`
5. `/institute/exams`
6. `/institute/exams/new`
7. `/institute/exams/advanced`
8. `/institute/exams/preset-packs`
9. `/institute/exams/[examId]`
10. `/institute/exams/[examId]/builder`
11. `/institute/question-bank`
12. `/institute/question-bank/new`
13. `/institute/question-bank/import`
14. `/institute/question-bank/linked`
15. `/institute/question-bank/library-linker`
16. `/institute/question-bank/[questionId]`
17. `/institute/question-bank/comprehension/import`
18. `/institute/question-bank/comprehension/new`
19. `/institute/question-bank/comprehension/[passageId]`
20. `/institute/reports`
21. `/institute/results`
22. `/institute/results/attempts`
23. `/institute/results/leaderboard`
24. `/institute/results/analysis`
25. `/institute/results/live`
26. `/institute/reviews`
27. `/institute/economy`
28. `/institute/security`
29. `/institute/settings`
30. `/institute/search`

## Status Legend

- `Strong`: current browser proof exists and the route has meaningful workflow depth
- `Partial`: some proof exists, but it is thinner than we want for unsupported operator confidence
- `Gap`: route exists, but route-specific browser proof is still missing or too indirect

## Current Route Status

| Route | Current Status | Existing Proof | Main Residual |
| --- | --- | --- | --- |
| `/institute/dashboard` | Strong | `institute-dashboard-workspace.spec.ts`, shell timing, cross-browser shell | visual clarity and quick-action density still need periodic review |
| `/institute/people` | Strong | `institute-roster-mutable.spec.ts`, `institute-roster-import-mutable.spec.ts`, `institute-people-export.spec.ts`, shell timing, and latest grouped mutable rerun on `3007` | broader dataset variation is still useful, but CRUD confidence is strong |
| `/institute/academic-setup` | Strong | `institute-academic-setup-mutable.spec.ts`, dashboard handoff, and latest grouped mutable rerun on `3007` | dense form comprehension and archive/recovery clarity should still be watched as fields evolve |
| `/institute/teacher-assignments` | Strong | `institute-teacher-assignments-mutable.spec.ts` plus latest grouped mutable rerun on `3007` | broader dataset variation is still useful, but CRUD coverage is now freshly confirmed |
| `/institute/exams` | Strong | `institute-exams-workspace.spec.ts`, `institute-exams-filter-pagination.spec.ts`, mobile exams workflow | repeated list-state coverage under varied datasets |
| `/institute/exams/new` | Strong | `institute-exam-creation-wizard-matrix.mutable.spec.ts`, family guided create specs | wizard validation breadth should stay current as fields evolve |
| `/institute/exams/advanced` | Strong | `institute-exam-creation-advanced-matrix.mutable.spec.ts`, advanced template mutable specs, grouped mutable `practice` / `quiz` / `mock_exam` rerun on `3006` | advanced composition and template recovery need grouped maintenance |
| `/institute/exams/preset-packs` | Strong | family preset builder and persistence specs plus `institute-route-gap-baseline.spec.ts` and `institute-preset-pack-library.spec.ts` prove direct route open, search, family filtering, builder handoff, and empty-state behavior | dataset breadth and pagination depth are still useful to keep current |
| `/institute/exams/[examId]` | Strong | `institute-exam-detail-workspace.spec.ts`, `institute-exam-mutable.spec.ts`, release/runtime families | low-support operator readability around policy and readiness should stay reviewed |
| `/institute/exams/[examId]/builder` | Strong | `institute-exam-builder-workspace.spec.ts`, shared-library builder flows, family builder specs | grouped section-edit + save-state + release-prep pack should be rerun together |
| `/institute/question-bank` | Strong | workspace, browser coverage, timing, bulk workspace, bulk mutable | this is still the densest lane and needs ongoing UX hardening |
| `/institute/question-bank/new` | Strong | `institute-question-mutable.spec.ts` plus `institute-question-create-browser-coverage.spec.ts` prove validation, dependency hydration, and duplicate-mode prefill | cancel/recovery breadth can still grow |
| `/institute/question-bank/import` | Strong | `institute-question-import-export.spec.ts`, preview/finalize timing specs | invalid file and partial-failure messaging should remain under review |
| `/institute/question-bank/linked` | Strong | linked mental model, workspace, shared-library linked flows | maintain read-only clarity and copy/editable-clone expectations |
| `/institute/question-bank/library-linker` | Strong | linker workspace, mutable link flow, entitlement and quota specs | quota exhausted and no-entitlement UX should keep being rerun |
| `/institute/question-bank/[questionId]` | Strong | `institute-question-bank-detail-workspace.spec.ts` plus `institute-route-gap-baseline.spec.ts` prove direct detail route open and editor visibility | attachment/tag mutation depth should stay grouped with broader question CRUD |
| `/institute/question-bank/comprehension/import` | Strong | `institute-question-import-export.spec.ts` plus `institute-comprehension-import-browser-coverage.spec.ts` now cover route open, entitlement/load-state handling, preview, mixed-row guidance, finalize success, and preview reset on the live-enabled institute build at `3007` | broader dataset variation is still useful, but the core browser lane is now covered |
| `/institute/question-bank/comprehension/new` | Strong | `institute-question-bank-workspace.spec.ts`, `institute-route-gap-baseline.spec.ts`, and `institute-comprehension-mutable.spec.ts` now prove create-route open, validation, create, and linked-child flow | cancel and alternate academic-lane breadth can still grow |
| `/institute/question-bank/comprehension/[passageId]` | Strong | `institute-question-bank-detail-workspace.spec.ts`, `institute-route-gap-baseline.spec.ts`, and `institute-comprehension-mutable.spec.ts` now prove detail-route open, update, reopen, and linked-child visibility | more recovery/error-state breadth is still useful |
| `/institute/reports` | Strong | `institute-reports-workspace.spec.ts`, `institute-reports-browser-coverage.spec.ts` | interpretation polish and export/discoverability consistency |
| `/institute/results` | Strong | `institute-results-workspace.spec.ts`, mutable result families | grouped navigation and empty-state readability should stay current |
| `/institute/results/attempts` | Strong | `institute-results-attempts-workspace.spec.ts` | more dataset-aware edge-state depth is still useful |
| `/institute/results/leaderboard` | Strong | `institute-results-leaderboard-workspace.spec.ts` | ranking edge cases and no-data states should be periodically rerun |
| `/institute/results/analysis` | Strong | workspace + populated mutable + descriptive result specs | long-tail descriptive/manual evaluation depth should remain current |
| `/institute/results/live` | Strong | workspace + populated mutable specs | live refresh realism and active-session spikes should be monitored |
| `/institute/reviews` | Strong | `institute-reviews-workspace.spec.ts`, mobile reviews workflow | queue depth and weak-state UX need visual attention |
| `/institute/economy` | Strong | workspace, browser coverage, mutable specs | conceptual density and policy readability under real data |
| `/institute/security` | Strong | `institute-exam-policy-security-matrix.mutable.spec.ts`, `institute-route-gap-baseline.spec.ts`, and `institute-security-browser-coverage.spec.ts` prove direct route open, query-param hydration, quick filters, watch-state selection, empty states, and summary consistency | broader dataset variation is still useful |
| `/institute/settings` | Strong | `institute-route-gap-baseline.spec.ts` plus `institute-settings-browser-coverage.spec.ts` prove direct route open, summaries, handoffs, and count consistency | CRUD depth only applies if/when settings become editable |
| `/institute/search` | Strong | `institute-route-gap-baseline.spec.ts` plus `institute-search-browser-coverage.spec.ts` prove control hydration, apply/reset, quick filters, no-results state, and count consistency | broader live-record breadth is still useful but no longer a core confidence gap |

## Next Sweep Order

If we keep hardening institute from here, the most useful page-by-page sweep is:

1. `/institute/question-bank`
2. `/institute/academic-setup`
3. `/institute/people`
4. `/institute/exams`
5. `/institute/exams/[examId]`

Why this order:

- question bank is still the densest operator surface and most likely to hide support friction
- academic setup and people are the main institute CRUD/persistence lanes and should stay easy to trust
- exams list and detail are the shared handoff points for creation, publish, and lifecycle truth
- keeping the sweep in this order reduces the risk of polishing easy pages while the heavier ones drift

## What “No Area Untouched” Means In Practice

Every route above must eventually have all of the following, as applicable:

1. route open proof
2. heading and shell visibility proof
3. filter and query-param proof
4. create flow proof
5. edit flow proof
6. archive, deactivate, or delete proof where allowed
7. empty-state and no-result proof
8. validation error proof
9. cancel or back-navigation proof
10. deep-link proof where query params matter
11. mobile or narrow-width proof for operator-heavy pages
12. timing or API discipline proof for heavy routes

## Execution Phases

### Phase 1: Route Baseline

Goal:
Every institute route opens through browser automation and shows truthful shell state.

Routes to close in this phase:

- `/institute/exams/preset-packs`
- `/institute/question-bank/new`
- `/institute/question-bank/[questionId]`
- `/institute/question-bank/comprehension/import`
- `/institute/question-bank/comprehension/new`
- `/institute/question-bank/comprehension/[passageId]`
- `/institute/security`
- `/institute/settings`
- `/institute/search`

Definition of done:

- each route has at least one dedicated route-level Playwright spec
- each route can be opened directly from URL
- each route shows the correct heading or workspace identity
- route-specific empty or seed-light states are handled explicitly

### Phase 2: CRUD And Validation Closure

Goal:
Treat institute forms the same way we treated admin forms.

Surfaces:

- people
- academic setup
- teacher assignments
- exam wizard
- advanced builder
- exam detail settings
- question create
- question import
- comprehension create and edit
- institute settings

Definition of done:

- create, edit, and validation failures are covered
- cancel paths are safe
- changed data is visible after save
- duplicate, invalid, or blocked states are asserted

### Phase 3: Dense Workflow Hardening

Goal:
Lock down the routes that generate the most operator support load.

Priority lanes:

- question bank
- linked library linker
- exam builder
- advanced exam creation
- results analysis
- reviews
- economy
- security

Definition of done:

- multi-step flows pass in one grouped spec pack
- query-param persistence is truthful
- empty state, entitlement, quota, and recovery states are explicit
- no visually confusing dead ends remain untracked

### Phase 4: Browser-Only Onboarding Pack

Goal:
Support a full institute journey through the browser with minimal hidden setup.

Flow:

1. login as institute
2. verify dashboard context
3. create or verify academic setup
4. create or import teacher and student data
5. create teacher assignment
6. create question content
7. create exam
8. publish or configure exam
9. verify reports, results, reviews, economy, and security handoffs

Definition of done:

- one curated grouped Playwright pack proves the core institute journey
- cleanup is deterministic
- failure screenshots and logs are readable enough for fast triage

Current status:

- curated grouped pack now exists in `edutech_web/tests/e2e/workflow/institute-browser-onboarding-pack.spec.ts`
- latest run on `http://localhost:3007`: `3/3 passed`
- current pack proves setup, roster, authoring, exams, reviews, results, reports, economy, security, search, and settings handoffs in one browser session family

### Phase 5: Performance And API Discipline

Goal:
Add route-level performance awareness to the heaviest institute pages.

Priority routes:

- `/institute/question-bank`
- `/institute/exams`
- `/institute/exams/[examId]`
- `/institute/results`
- `/institute/results/analysis`
- `/institute/results/live`
- `/institute/economy`
- `/institute/security`

Definition of done:

- timing specs exist for heavy routes or interactions
- unexpected duplicate fetches are flagged
- filter changes pass the right parameters
- high-churn routes have baseline navigation timings recorded

## Recommended Playwright Pack Structure

### Pack A: Institute Shell And Route Smoke

- dashboard
- people
- academic setup
- teacher assignments
- exams
- question bank
- reports
- results
- reviews
- economy
- security
- settings
- search

### Pack B: Institute CRUD And Validation

- people create, edit, import, export
- academic setup create, edit, archive
- teacher assignment create, edit, archive
- question create and edit
- comprehension create and edit
- exam wizard create and validation
- settings update and validation

### Pack C: Institute Exams And Builder Depth

- exam list filters
- preset-packs route checks
- exam detail policy and readiness
- builder composition
- advanced builder templates
- slot and assignment mode matrix
- release happy path and release-state coverage

### Pack D: Question Bank And Shared Library Depth

- question-bank filters and pagination
- bulk actions
- linked mental model
- library linker quota and entitlement
- comprehension import
- question detail route

### Pack E: Results, Reports, Reviews, Economy

- results home
- attempts
- leaderboard
- analysis
- live
- reports
- reviews
- economy
- security

## Immediate Gaps To Close First

These are the highest-value untouched or under-touched institute areas right now:

1. `/institute/exams/preset-packs` broader dataset variation and pagination depth
2. `/institute/security` broader dataset variation and list-state breadth
3. final institute full-surface confidence rerun on a single fresh build after port consolidation
4. extend the onboarding pack with optional deeper mutable creation/release checkpoints if we want a release-gate variant

## Confidence Read Right Now

Current truthful read after the latest grouped route, CRUD, comprehension-import, onboarding-pack, and consolidated confidence reruns:

- institute overall browser confidence: `9.6/10`
- institute core guided workflow confidence: `9.7/10`
- institute full unsupported self-serve confidence: about `9.7/10`

Why it is not yet higher:

- some lanes still rely on current seeded data shape rather than purposely varied datasets
- we now have a strong grouped onboarding pack and a green consolidated confidence rerun, but not yet one all-packs cross-browser sweep
- preset-packs and security would still benefit from broader dataset variation beyond the current demo profile

## Exit Criteria For Institute Signoff

We should only mark institute coverage as fully aligned with admin-style confidence when:

1. all 30 routes above are classified as `Strong`
2. every mutable form surface has dedicated browser CRUD proof
3. the gap routes listed above are closed with direct Playwright specs
4. one grouped institute full-surface pack passes on a fresh environment
5. one final confidence snapshot document is written after reruns

## Related Documents

- [INSTITUTE_PAGE_WISE_BROWSER_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/INSTITUTE_PAGE_WISE_BROWSER_CHECKLIST.md)
- [INSTITUTE_9_5_CONFIDENCE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/INSTITUTE_9_5_CONFIDENCE_EXECUTION_BOARD.md)
- [INSTITUTE_PLAYWRIGHT_CASE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/INSTITUTE_PLAYWRIGHT_CASE_MATRIX.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
