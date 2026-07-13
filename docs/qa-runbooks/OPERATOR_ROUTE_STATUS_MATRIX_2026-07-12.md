# Operator Route Status Matrix - 2026-07-12

## Purpose

This matrix answers one practical question:

- Which `admin`, `institute`, and `teacher` pages are covered only at route/smoke level?
- Which pages are covered with deeper workflow, CRUD, guardrail, API-audit, and timing validation?

This is a route-quality matrix, not React line coverage.

## Status Scale

- `Strong`: route is covered by dedicated workflow specs plus meaningful mutation, guardrail, or contract checks
- `Moderate`: route is covered by browser suites and some targeted assertions, but depth is narrower
- `Basic`: route is at least exercised and reachable, but deep behavior coverage is still thin

## Shared Validation Baseline

- Admin route surface: `16/16` covered
- Institute route surface: `30/30` covered
- Teacher route surface: `20/20` covered
- Backend targeted regression suite: `501/501` passed
- Backend line coverage: `65.7%`

## Admin

| Route | Current Depth | Evidence Packs | Main Remaining Gaps |
|---|---|---|---|
| `/admin` | Strong | dashboard redirect, shell, cross-browser shell | no separate gap beyond dashboard depth |
| `/admin/dashboard` | Strong | workspace, API audit, redirect, cross-browser deep routes | add more failure-state simulation if desired |
| `/admin/institutes` | Strong | workspace, API audit, CRUD guardrails, mutable edit paths, timing, onboarding bundles | keep sparse-edit and profile-edit regressions in release pack |
| `/admin/people` | Strong | workspace, API audit, CRUD guardrails, roster/import flows, timing, mobile people workflow | deepen large-volume pagination and bulk-archive cases |
| `/admin/academic-setup` | Strong | workspace, API audit, CRUD guardrails, mutable flows, master-dataset validation | add more negative preset collision coverage |
| `/admin/economy` | Strong | workspace, API audit, browser coverage, CRUD guardrails, mutable flows, timing, navigation, mobile economy workflow | performance remains the main operational risk area |
| `/admin/exams` | Strong | workspace, API audit, browser coverage, mutable policies, assignment-mode matrix, family release flows | broaden load-oriented exam-list pagination coverage |
| `/admin/exams/new` | Strong | create workspace, wizard matrix, guardrails, advanced student-attempt path | add more malformed payload coverage if needed |
| `/admin/exams/advanced` | Strong | advanced builder workspace, template mutable flows, family handoff specs | builder failure recovery can still grow deeper |
| `/admin/exams/preset-packs` | Strong | family preset packs, preset library specs, persistence mutable specs | add package-scale sorting/filter assertions |
| `/admin/exams/[examId]` | Strong | detail workspace, detail mutable, policy/security matrix, result-readiness contracts | add more archived or suspended exam-state checks |
| `/admin/exams/[examId]/builder` | Strong | builder workspace, builder mutable, family authoring contracts | expand long multi-section authoring stress cases |
| `/admin/reports` | Strong | workspace, API audit, browser coverage, timing, mobile reports workflow | mutation/admin actions are lighter than read coverage |
| `/admin/search` | Strong | workspace, API audit, browser coverage | add very large result-set and stale-index scenarios |
| `/admin/security` | Strong | workspace, browser coverage, timing, mobile security workflow, API audit | no material first-wave gap remains; only broader edge-data variants can grow later |
| `/admin/settings` | Strong | workspace, API audit, browser coverage, CRUD guardrails, timing | add concurrency/conflict update scenarios |

### Admin Read

- Best-covered admin areas: `institutes`, `people`, `economy`, `exams`
- Admin pages still a little lighter than the rest: `search`, then `reports`

## Institute

| Route | Current Depth | Evidence Packs | Main Remaining Gaps |
|---|---|---|---|
| `/institute/dashboard` | Strong | dashboard workspace, shell timing, cross-browser shell, end-user smoke, browser coverage | no material first-wave gap remains; optional degraded-data variants can still grow later |
| `/institute/academic-setup` | Strong | academic-setup mutable, browser onboarding pack, API audit | no material first-wave gap remains; only extra preset-conflict edge cases can grow later |
| `/institute/economy` | Strong | workspace, browser coverage, mutable economy flows | add timing/API-audit parity with admin if needed |
| `/institute/exams` | Strong | exams workspace, filter-pagination, mutable exam flows, mobile exams workflow | add heavier list-scale performance coverage |
| `/institute/exams/new` | Strong | wizard matrix, advanced matrix, mutable exam flows | more invalid-combination edge cases can be added |
| `/institute/exams/advanced` | Strong | advanced matrix, family builder/preset flows, release flows | deeper degraded-data recovery still possible |
| `/institute/exams/preset-packs` | Strong | preset-pack library, preset persistence, family preset flows | add larger library sorting/filter coverage |
| `/institute/exams/[examId]` | Strong | exam detail workspace, exam mutable, policy/security matrix | add archived/cancelled exam-state assertions |
| `/institute/exams/[examId]/builder` | Strong | builder workspace, family authoring/runtime flows | longer authoring stress coverage can grow |
| `/institute/people` | Strong | roster mutable, import mutable, student bootstrap, people export, people workspace | API-audit parity is still missing |
| `/institute/question-bank` | Strong | question-bank workspace, browser coverage, timing, mobile question-bank workflow | add huge inventory/pagination stress coverage |
| `/institute/question-bank/import` | Strong | import/export, preview timing, finalize timing | add malformed file recovery variants |
| `/institute/question-bank/linked` | Strong | linked mental-model, OPBMS linked science, shared-library link flows | add larger linked-inventory pagination cases |
| `/institute/question-bank/new` | Strong | question-create coverage, question mutable | add more field-level validation permutations |
| `/institute/question-bank/[questionId]` | Strong | detail workspace, question mutable | broaden cross-format media editing paths |
| `/institute/question-bank/library-linker` | Strong | linked-library linker, shared-library workspace, entitlement enforcement | quota and paused entitlement paths already good; scale cases can grow |
| `/institute/question-bank/comprehension/new` | Strong | comprehension mutable | add more validation/error-recovery variants |
| `/institute/question-bank/comprehension/import` | Strong | comprehension import browser coverage | add deeper finalize/cleanup mutation paths |
| `/institute/question-bank/comprehension/[passageId]` | Strong | comprehension mutable | add multi-editor collision scenarios |
| `/institute/results` | Strong | results workspace, results mutable, timing, cross-browser results, contract suites | load-scale result list behavior still deserves more depth |
| `/institute/results/analysis` | Strong | analysis workspace, populated analysis mutable | add more empty-versus-populated comparison cases |
| `/institute/results/attempts` | Strong | attempts workspace, descriptive multi-role/result mutables | add larger attempt-history pagination coverage |
| `/institute/results/leaderboard` | Strong | leaderboard workspace, populated result mutables | add tie-handling and massive cohort coverage |
| `/institute/results/live` | Strong | live workspace, live populated mutable | add burst refresh and polling pressure coverage |
| `/institute/reviews` | Strong | reviews workspace, mobile reviews workflow, descriptive mutable suites, institute-reviews mutable lifecycle | add bulk-only moderation edge cases if desired |
| `/institute/reports` | Strong | workspace, browser coverage, timing, API audit | no material first-wave gap remains; export-heavy variants can grow later if the route adds export controls |
| `/institute/search` | Strong | browser coverage, workspace, API audit | no material first-wave gap remains; only optional larger result-set edge cases can grow later |
| `/institute/security` | Strong | browser coverage, security workspace | deeper review/escalation mutations still missing |
| `/institute/settings` | Strong | browser coverage, settings CRUD guardrails | broader conflict/reload multi-operator cases still missing |
| `/institute/teacher-assignments` | Strong | teacher-assignments mutable | add broader bulk reassignment/import cases |

### Institute Read

- Best-covered institute areas: `exams`, `question-bank`, `results`
- Institute routes that are still comparatively lighter: none in the current first-wave route set

## Teacher

| Route | Current Depth | Evidence Packs | Main Remaining Gaps |
|---|---|---|---|
| `/teacher/dashboard` | Strong | cross-browser shell, dashboard workspace, browser coverage | no material first-wave gap remains; broader degraded-data variants can still grow later |
| `/teacher/exams` | Strong | cross-browser shell, role consistency, downstream exam-detail flows, exams workspace, browser coverage | no material first-wave gap remains; larger pagination/load-scale variants can grow later |
| `/teacher/exams/new` | Strong | mobile authoring workflow, family release flows, exams-create workspace | add more malformed payload coverage if desired |
| `/teacher/exams/advanced` | Strong | advanced template mutable, language family handoff, advanced-builder workspace | create-path and failure-recovery depth can still expand |
| `/teacher/exams/[examId]` | Strong | exam detail workspace, exam detail mutable, contract suites | add more archived/cancelled state assertions |
| `/teacher/exams/[examId]/builder` | Strong | exam builder mutable, family authoring/release flows | long authoring stress coverage can still expand |
| `/teacher/question-bank` | Strong | shared-library workspace, linked inventory, timing, mobile question-bank workflow | add dedicated plain workspace smoke if desired |
| `/teacher/question-bank/import` | Strong | question import/export | add malformed import recovery depth |
| `/teacher/question-bank/new` | Strong | question mutable, mobile authoring workflow, question-create browser coverage | add more field-level validation permutations if desired |
| `/teacher/question-bank/[questionId]` | Strong | question mutable | add more media/edit conflict coverage |
| `/teacher/question-bank/comprehension/new` | Strong | comprehension mutable | add more empty-submit and invalid-asset variants |
| `/teacher/question-bank/comprehension/import` | Strong | comprehension mutable indirectly, shell coverage, comprehension import browser coverage, comprehension import finalize mutable | no material first-wave gap remains; optional malformed-file edge cases can still grow later |
| `/teacher/question-bank/comprehension/[passageId]` | Strong | comprehension mutable | add conflict/revision-history cases |
| `/teacher/results` | Strong | results workspace, results mutable, timing, cross-browser results, contract suites | add very large cohort performance coverage |
| `/teacher/results/analysis` | Strong | analysis workspace, populated analysis mutable | deepen empty-versus-dense comparisons |
| `/teacher/results/attempts` | Strong | attempts workspace, results mutable | add large attempt-history pagination coverage |
| `/teacher/results/leaderboard` | Strong | leaderboard workspace, multi-learner mutable | add tie and huge-cohort assertions |
| `/teacher/results/live` | Strong | live workspace, live populated mutable | add polling/burst refresh coverage |
| `/teacher/reviews` | Strong | reviews workspace, review mutable, mobile reviews workflow | add escalation/reassignment and permission edge cases |
| `/teacher/search` | Strong | cross-browser shell, search workspace, browser coverage | no material first-wave gap remains; larger result-set edge cases can still grow later |

### Teacher Read

- Best-covered teacher areas: `results`, `reviews`, `question-bank detail/mutation`, `exam detail`
- Teacher routes that are still relatively light: none in the current first-wave route set

## Priority Gaps To Close Next

1. Add more scale-oriented list/pagination/performance assertions for large exam, result, and question-bank inventories.
2. Add more malformed-file and large-payload edge assertions where import lanes matter operationally.

## Practical Confidence Read

- `admin`: highest confidence because route coverage, CRUD depth, API audits, and timing coverage are the broadest
- `institute`: strong confidence across the full first-wave route set, with dashboard truthfulness now aligned to the rest of the operator surface
- `teacher`: strong confidence across the full first-wave route set, with comprehension import now covering blocked, preview, finalize, visibility, and cleanup depth
