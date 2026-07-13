# Institute 9.5 Confidence Execution Board

Last updated: 2026-07-13

## Purpose

This board gives the institute section the same execution parity we now have for admin.

Use it to answer:

1. why institute confidence is already strong
2. why it is still not honestly `9.5/10`
3. which institute pages still need denser live browser proof
4. what must be true before we can call the institute module broadly self-serve-safe

Related documents:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [INSTITUTE_PAGE_WISE_BROWSER_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/INSTITUTE_PAGE_WISE_BROWSER_CHECKLIST.md)
- [INSTITUTE_PLAYWRIGHT_CASE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/INSTITUTE_PLAYWRIGHT_CASE_MATRIX.md)
- [VISUAL_PASS_SCREENSHOT_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/VISUAL_PASS_SCREENSHOT_RUNBOOK.md)
- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)

---

## Current Read

### Current confidence

- Institute core guided workflows: `9/10`
- Institute page-to-page desktop confidence: `8.75 to 9/10`
- Institute broad unsupported self-serve confidence: below `9.5/10`

### Why institute is strong already

- institute dashboard, exams, question-bank, results, reports, reviews, economy, and setup lanes all have current browser proof
- institute people, academic setup, and teacher assignment lanes also have current browser proof on the live institute build
- institute exams list, detail, and builder workspaces are green on the live institute build at `http://localhost:3006`
- institute exam creation and release paths now have deeper mutable coverage
- institute exam policy/security matrix, slot management, and advanced-builder matrix are green on the live institute build at `http://localhost:3006`
- current grouped mutable browser proof on `http://localhost:3006` is green for exam control:
  - exam policy/security matrix
  - slot management
  - advanced-builder matrix
- shared-library and linked-question-bank recovery is materially stronger than earlier passes
- results, leaderboard, attempts, analysis, and live views now have both workspace and deeper scenario proof
- institute results workspace, attempts workspace, leaderboard workspace, and analysis workspace are green on the live institute build at `http://localhost:3006`
- current grouped browser proof on `http://localhost:3006` is green for the institute results family:
  - results workspace
  - attempts workspace
  - leaderboard workspace
  - analysis workspace
  - live monitor workspace
- institute reviews, reports, economy, security, settings, and search workspaces are also green on the live institute build
- current visual sweep did not surface a new institute-specific desktop defect outside the already-known question-bank density area
- recent desktop visual capture exists for the major institute routes, and the visual harness now completes for the institute route set
- institute cross-browser shell and results routes are green in Chromium, Firefox, and WebKit on the live institute build

### Why institute is not yet `9.5/10`

- proof is still uneven across pages rather than equally deep on every major institute surface
- the main question-bank lane is functional but visually dense enough to create operator friction
- some setup, roster, and onboarding recovery lanes are proven but still thinner for first-time unsupported operators
- visual and UX consistency review is not yet burned down page-by-page the way admin now is
- long-tail institute scenarios still trail the mainline flows in repetition and breadth

---

## 9.5 Success Bar

We should only raise institute confidence to `9.5/10` when all of the following are true:

- every major institute page has at least one current browser-proof pack aligned to the live UI contract
- the highest-risk mutable institute lanes have deterministic grouped proof rather than isolated one-off wins
- dense institute workflows are understandable from the UI alone without needing operator memory of hidden rules
- desktop visual review has been completed across the major institute pages and resulting friction bugs are burned down
- at least one final grouped institute sweep passes against current labels, current layout, and current seed assumptions

---

## Status Legend

- `Open`: not started
- `In Progress`: currently being worked on
- `Ready for QA`: implementation complete, focused validation pending
- `Done`: verified and accepted
- `Blocked`: waiting on environment, seed, or dependency repair

---

## Page Matrix

| Area | Current Read | Main Residual | Primary Proof Type Needed |
| --- | --- | --- | --- |
| Institute dashboard | Strong | quick-action density and lower-page interpretation clarity | visual review + workspace assertions |
| Institute people | Medium-high | roster mutation depth, export/import edge cases, empty-state clarity | mutable + browser review |
| Institute academic setup | Medium-high | dense setup comprehension and operator-safe recovery | mutable + visual review |
| Institute teacher assignments | Medium-high | write-path confidence and preloaded-edit truth | mutable + browser review |
| Institute exams list/detail | Strong | dataset-aware status truth and low-support operator polish | grouped browser + mutable |
| Institute exam builder | Strong | broader grouped release, assignment, and policy depth | grouped mutable |
| Institute advanced builder | Strong | grouped mutable `practice` / `quiz` / `mock_exam` matrix is now green; keep deterministic proof current as UI evolves | grouped mutable reruns |
| Institute question bank | Medium-high | highest density lane, filter mental model, bulk/action clarity | grouped browser + mutable + visual review |
| Institute linked questions | Strong | keep role boundary and read-only expectations obvious | browser review + targeted mutable |
| Institute shared library linker | Strong | entitlement/quota/exhaustion clarity under current UI | grouped mutable + browser review |
| Institute imports | Medium-high | preview/finalize realism and lower-support recovery copy | timing + mutable + browser review |
| Institute results | Strong | descriptive/manual-evaluation depth and long-tail result states | grouped mutable + dataset-aware browser proof |
| Institute reviews | Medium-high | queue depth, action clarity, and weak-state polish | workspace + visual review |
| Institute reports | Strong | interpretation polish and grouped discoverability proof | browser review |
| Institute economy | Strong | conceptual density and layout clarity under real data | browser review + visual cleanup |
| Institute security | Medium-high | dense selector interpretation and grouped layout clarity | browser review + visual cleanup |
| Institute settings | Medium-high | low-frequency but support-critical edit confidence | browser review + visual review |
| Institute search | Strong | currently cleaner, but still needs grouped parity checks | browser review |

---

## Board Summary

| ID | Area | Title | Severity | Status | Owner |
| --- | --- | --- | --- | --- | --- |
| I95-01 | Coverage | Build page-by-page institute proof map with live spec anchors | High | Done | Codex |
| I95-02 | Visual Review | Complete desktop institute visual and UX pass across all major pages | High | In Progress | Codex |
| I95-03 | Question Bank | Harden institute question-bank density, clarity, and recovery states | High | In Progress | Codex |
| I95-04 | Builder And Exams | Keep grouped institute exam creation, builder, release, and policy proof green | High | Open | Codex |
| I95-05 | Setup And Roster | Raise academic setup, people, onboarding, and assignment lanes to low-support-safe | High | Open | Codex |
| I95-06 | Results Long Tail | Expand descriptive, manual-evaluation, and multi-result realism breadth | High | Open | Codex |
| I95-07 | Signoff | Run final grouped institute confidence pack and update confidence docs | High | Open | Codex |

---

## Recommended Execution Order

1. `I95-01` page-by-page institute proof map
2. `I95-02` desktop institute visual review
3. `I95-03` institute question-bank hardening
4. `I95-04` grouped exam and builder proof maintenance
5. `I95-05` setup, roster, onboarding, and assignment lift
6. `I95-06` results long-tail breadth
7. `I95-07` final grouped signoff

Why this order:

- first remove ambiguity about what the institute module actually covers today
- then finish the visual and operator-friction pass while the screenshots are fresh
- then harden the densest institute lane before widening into the rest of the module
- after that, preserve grouped mutable exam confidence and fill lower-support operational gaps
- finish with one grouped institute signoff instead of raising confidence from scattered wins

---

## Detailed Work Items

### I95-01 Page-By-Page Institute Proof Map

Status: `Done`

Problem:

- institute has broad browser coverage, but remaining confidence drag is mostly uneven proof density
- without one page-wise truth source, it is too easy to assume a route is fully hardened because adjacent routes are strong

Acceptance criteria:

- one page-by-page map exists for all major institute routes
- each page lists:
  - current browser specs
  - mutable specs
  - visual review status
  - main residual gaps
  - likely next hardening move

Initial route list:

- `/institute/dashboard`
- `/institute/people`
- `/institute/academic-setup`
- `/institute/teacher-assignments`
- `/institute/exams`
- `/institute/exams/[examId]`
- `/institute/exams/[examId]/builder`
- `/institute/exams/advanced`
- `/institute/question-bank`
- `/institute/question-bank/linked`
- `/institute/question-bank/library-linker`
- `/institute/question-bank/new`
- `/institute/question-bank/import`
- `/institute/question-bank/[questionId]`
- `/institute/results`
- `/institute/results/attempts`
- `/institute/results/leaderboard`
- `/institute/results/analysis`
- `/institute/results/live`
- `/institute/reviews`
- `/institute/reports`
- `/institute/economy`
- `/institute/security`
- `/institute/settings`
- `/institute/search`

Primary proof anchors already available:

- `tests/e2e/workflow/institute-dashboard-workspace.spec.ts`
- `tests/e2e/workflow/institute-exams-workspace.spec.ts`
- `tests/e2e/workflow/institute-exam-detail-workspace.spec.ts`
- `tests/e2e/workflow/institute-exam-builder-workspace.spec.ts`
- `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-assignment-mode-matrix.mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-policy-security-matrix.mutable.spec.ts`
- `tests/e2e/workflow/institute-question-bank-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-browser-coverage.spec.ts`
- `tests/e2e/workflow/institute-question-bank-bulk-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts`
- `tests/e2e/workflow/institute-question-bank-detail-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-linked-mental-model.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-workspace.spec.ts`
- `tests/e2e/workflow/institute-linked-library-linker.spec.ts`
- `tests/e2e/workflow/institute-economy-workspace.spec.ts`
- `tests/e2e/workflow/institute-economy-mutable.spec.ts`
- `tests/e2e/workflow/institute-results-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-live-workspace.spec.ts`
- `tests/e2e/workflow/institute-reviews-workspace.spec.ts`
- `tests/e2e/workflow/institute-reports-workspace.spec.ts`
- `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts`
- `tests/e2e/workflow/institute-roster-mutable.spec.ts`
- `tests/e2e/workflow/institute-teacher-assignments-mutable.spec.ts`

Signoff condition:

- we can answer “what exactly is proven on this institute page?” without guessing from memory

### I95-02 Desktop Institute Visual Review

Status: `In Progress`

Problem:

- desktop screenshots expose density, padding, and operator-friction bugs that functional assertions miss
- the current institute screenshot pack shows several pages are strong, but the main question-bank lane still carries excess vertical and conceptual weight

Acceptance criteria:

- desktop screenshots are captured and reviewed for all major institute pages
- each page gets a short review note:
  - visually clean
  - needs minor polish
  - dense enough to justify hardening
- resulting layout and spacing bugs are either fixed or explicitly tracked

Current screenshot baseline:

- `artifacts/visual-pass/institute/institute-dashboard.png`
- `artifacts/visual-pass/institute/institute-question-bank.png`
- `artifacts/visual-pass/institute/institute-linked-questions.png`
- `artifacts/visual-pass/institute/institute-library-linker.png`
- `artifacts/visual-pass/institute/institute-exams.png`
- `artifacts/visual-pass/institute/institute-people.png`
- `artifacts/visual-pass/institute/institute-academic-setup.png`
- `artifacts/visual-pass/institute/institute-results.png`
- `artifacts/visual-pass/institute/institute-reports.png`
- `artifacts/visual-pass/institute/institute-economy.png`
- `artifacts/visual-pass/institute/institute-security.png`
- `artifacts/visual-pass/institute/institute-settings.png`
- `artifacts/visual-pass/institute/institute-search.png`

Immediate priority pages:

- `institute-question-bank`
- `institute-exams`
- `institute-people`
- `institute-academic-setup`
- `institute-economy`
- `institute-security`

Signoff condition:

- no major desktop institute page still feels “functionally correct but operator-heavy”

### I95-03 Institute Question-Bank Density And Recovery Hardening

Status: `In Progress`

Problem:

- the institute question-bank lane is now one of the highest-value remaining institute surfaces
- it is functionally strong, but still the most visually dense institute page and therefore the most likely to create low-support operator confusion

Acceptance criteria:

- the main local question-bank page has a clearer top-of-page mental model
- filters, bulk actions, and inventory feel grouped rather than stacked
- linked-vs-local behavior stays obvious
- shared-library handoff remains clear without drowning the page in explanation copy
- the lane remains browser-proven after layout changes
- current browser proof on `http://localhost:3006` is green for the main institute question-bank workspace pack:
  - filter controls hydrate correctly
  - academic dependency reset logic is truthful
  - empty-state guidance stays distinct from loaded state
  - filtered shared-library intake guidance remains visible
- current browser proof on `http://localhost:3006` is green for the institute question-bank shared-library lane pack:
  - local-versus-linked lane recovery stays truthful
  - shared-library guidance and linker handoff stay visible
  - current shared-library page copy matches the browser contract
- current workspace proof on `http://localhost:3006` is green for the main question-bank entry routes:
  - question bank list
  - create question
  - create comprehension set
  - import questions CSV
  - import comprehension CSV
- current browser proof on `http://localhost:3006` is green for the institute people workspace:
  - roster switching works
  - search, login filter, and sort controls behave truthfully
  - create/import handoffs open safely
  - academic setup handoff is reachable
- current mutable proof on `http://localhost:3006` is green for institute academic setup:
  - create, edit, archive, and restore work across academic year, program, cohort, subject, and topic sections

Primary routes:

- `/institute/question-bank`
- `/institute/question-bank/linked`
- `/institute/question-bank/library-linker`
- `/institute/question-bank/new`
- `/institute/question-bank/import`

Primary proof anchors:

- `tests/e2e/workflow/institute-question-bank-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-browser-coverage.spec.ts`
- `tests/e2e/workflow/institute-question-bank-bulk-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts`
- `tests/e2e/workflow/institute-question-bank-linked-mental-model.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-workspace.spec.ts`
- `tests/e2e/workflow/institute-linked-library-linker.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-link.mutable.spec.ts`
- `tests/e2e/workflow/institute-question-bank-opbms-linked-science.spec.ts`

Visual focus:

- compress guidance density at the top of the page
- tighten filter and bulk-action grouping
- reduce repeated chip and note sprawl
- keep question cards readable without feeling oversized

Signoff condition:

- institute question-bank moves from “strong but heavy” to “strong and low-support-safe”

### I95-04 Grouped Institute Exam And Builder Proof

Status: `Open`

Problem:

- institute exam confidence is strong, but the `9.5` bar requires grouped proof to keep pace with current UI and seed contracts

Acceptance criteria:

- grouped mutable exam creation, builder, release, assignment, and policy packs pass repeatably
- current labels, save bars, and advanced-builder states remain aligned with the tests, including the grouped institute advanced-builder matrix for `practice`, `quiz`, and `mock_exam`
- institute release and runtime proof stays connected to creation proof

Primary proof anchors:

- `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-assignment-mode-matrix.mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-policy-security-matrix.mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-mutable.spec.ts`
- `tests/e2e/workflow/institute-family-release-happy-path.mutable.spec.ts`
- `tests/e2e/workflow/institute-family-release-state.mutable.spec.ts`
- `tests/e2e/workflow/institute-family-runtime-depth.mutable.spec.ts`

Signoff condition:

- institute exam confidence no longer depends on scattered isolated greens

### I95-05 Setup, Roster, Onboarding, And Assignment Lift

Status: `Open`

Problem:

- these pages broadly work, but still carry more first-time operator surprise risk than the strongest institute lanes

Acceptance criteria:

- academic setup, roster, teacher assignments, and onboarding states are understandable without support memory
- empty-state, recovery-state, and preloaded-edit truth is browser-proven
- key mutations remain stable under current UI contracts

Primary proof anchors:

- `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts`
- `tests/e2e/workflow/institute-roster-mutable.spec.ts`
- `tests/e2e/workflow/institute-roster-import-mutable.spec.ts`
- `tests/e2e/workflow/institute-teacher-assignments-mutable.spec.ts`
- `tests/e2e/workflow/institute-onboarding-dataset-bootstrap.mutable.spec.ts`
- `tests/e2e/workflow/institute-family-guided-create-defaults.spec.ts`
- `tests/e2e/workflow/institute-family-guided-persistence.mutable.spec.ts`

Signoff condition:

- institute setup and people lanes feel self-serve-safe, not only support-guided-safe

### I95-06 Results Long-Tail Breadth

Status: `Open`

Problem:

- institute results are already strong, but remaining confidence upside now sits in descriptive, manual-evaluation, and broader long-tail realism

Acceptance criteria:

- descriptive and manual-evaluation flows remain grouped with results analytics proof
- multi-learner and multi-exam states keep passing under current datasets
- long-tail result interpretation stays truthful across attempts, leaderboard, analysis, and live views

Primary proof anchors:

- `tests/e2e/workflow/institute-results-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-live-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-mutable.spec.ts`
- `tests/e2e/workflow/institute-results-analysis-populated.mutable.spec.ts`
- `tests/e2e/workflow/institute-results-live-populated.mutable.spec.ts`
- `tests/e2e/workflow/institute-results-multi-learner.mutable.spec.ts`
- `tests/e2e/workflow/institute-results-descriptive.mutable.spec.ts`
- `tests/e2e/workflow/institute-results-descriptive-multi-role.mutable.spec.ts`

Signoff condition:

- institute results confidence is broad, not just deep in the mainline path

### I95-07 Final Grouped Institute Signoff

Status: `Open`

Problem:

- institute confidence should not be raised to `9.5/10` from partial wins and memory

Acceptance criteria:

- one grouped institute pack is defined and run after page, visual, and long-tail work is complete
- the grouped pack includes:
  - question-bank
  - exams
  - one setup/roster lane
  - one results long-tail lane
  - one browser visual or route sweep
- confidence documents are updated only after that grouped pass is green

Proposed grouped signoff pack:

- `tests/e2e/workflow/institute-question-bank-browser-coverage.spec.ts`
- `tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts`
- `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts`
- `tests/e2e/workflow/institute-results-descriptive-multi-role.mutable.spec.ts`
- `tests/e2e/workflow/route-visual-pass.spec.ts` with institute desktop role

Signoff condition:

- institute `9.5/10` can be defended from current grouped evidence, not inferred from older progress

---

## Immediate Next Moves

If we continue from the current state, the most useful next sequence is:

1. keep `I95-02` moving by completing institute desktop review notes page by page, starting with `question-bank`, `academic-setup`, `people`, and `exams`
2. use the page-wise matrix to tighten `I95-03` on `/institute/question-bank`, because it is still the clearest remaining institute density hotspot
3. carry the same evidence style into `/institute/people`, `/institute/academic-setup`, and `/institute/exams/[examId]` so the institute surface reads consistently from the browser alone

That order keeps documentation, visual review, and code hardening aligned instead of letting them drift apart.
