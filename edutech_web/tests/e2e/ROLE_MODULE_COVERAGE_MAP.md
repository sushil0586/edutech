# Playwright Role Module Coverage Map

## Current verified state

- Suite command: `npm run test:e2e:full-round`
- Last verified full-round result: `40 passed`
- Latest targeted verification: `1 passed` for institute exam detail route panel coverage
- Browser lane: `chromium`
- Execution style: serial worker model using shared seeded demo accounts
- Coverage shape:
  - `82` spec files
  - `96` authored test cases
  - baseline coverage plus opt-in mutable real-data workflows

## Coverage summary by role

| Role | Coverage focus | Test cases |
| --- | --- | ---: |
| Anonymous | route protection and login redirects | 3 |
| Platform admin | dashboard, dashboard alias, search, settings, exams, advanced builder, mutable advanced builder templates, mutable advanced-builder exam creation, mutable advanced-builder learner attempt handoff, preset library, mutable preset library actions, exam creation, exam detail, mutable exam detail, exam builder, mutable exam builder, academic setup, mutable academic setup, institutes, institute CRUD, reports, people, mutable roster actions, mutable roster import, security, economy, and platform governance workspace navigation | 26 |
| Institute admin | control center, people, academic setup, exams, dedicated exam detail, results, reports, reviews, mutable admin actions, and mutable advanced-builder exam creation | 15 |
| Teacher | dashboard, exams, builder, question bank, results, reviews, mutable authoring and delivery actions | 13 |
| Student | exams, practice, analytics, attempts, results, mutable live attempt flow, mutable admin-created assigned exam attempt | 7 |
| Registration journeys | new teacher and student signup flows | 2 |
| Cross-role access control | wrong-role redirects and workspace blocking | 3 |

## Role to module map

### Anonymous + access control

| Module | Coverage | Spec |
| --- | --- | --- |
| Institute protected routes | anonymous redirect to login from institute results | `tests/e2e/role-scope/access-control.spec.ts` |
| Teacher protected routes | anonymous redirect to login from teacher question bank | `tests/e2e/role-scope/access-control.spec.ts` |
| Student protected routes | anonymous redirect to login from student exams | `tests/e2e/role-scope/access-control.spec.ts` |
| Wrong-role blocking | teacher, student, and institute sessions blocked from disallowed workspaces | `tests/e2e/role-scope/access-control.spec.ts` |

### Platform admin

| Module | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| Dashboard workspace | focus/sort filters, quick-filter chips, and high-value handoffs into institutes, people, academic setup, and reports | Baseline | `tests/e2e/workflow/admin-dashboard-workspace.spec.ts` |
| Dashboard legacy redirect | `/admin/dashboard` alias redirects into the main admin workspace | Baseline | `tests/e2e/workflow/admin-dashboard-redirect.spec.ts` |
| Search workspace | search controls, source/sort/group filters, quick-filter chips, reset flow, and back-to-workspace handoff | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| Settings workspace | governance summary cards, current live-control lanes, institute footprint, and people/academic handoffs | Baseline | `tests/e2e/workflow/admin-settings-workspace.spec.ts` |
| Exam management workspace | exam filters, quick-filter chips, zero-match handling, exam detail drills, builder handoff, and quick-create handoff | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| Advanced exam builder | stage rail visibility, builder/preset governance surfaces, stage switching, and preset-library handoff | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| Mutable advanced-builder platform exam creation matrix | create disposable platform-source `practice`, `quiz`, and `mock_exam` admin exams through advanced builder, verify resolved questions, and persist selected-student assignment in admin workspace/detail views | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts` |
| Mutable advanced-builder learner attempt handoff | create a disposable platform-source `mock_exam` through advanced builder, align institute and academic scope to the seeded learner, assign the learner, publish live, and verify start/save/submit from the student workspace | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts` |
| Mutable advanced builder templates | select institute scope, save template, export JSON bundle, import JSON bundle, and cleanup | Mutable | `tests/e2e/workflow/admin-advanced-builder-templates-mutable.spec.ts` |
| Preset pack library | library search, scope filters, exams handoff, and advanced-builder handoff | Baseline | `tests/e2e/workflow/admin-preset-pack-library.spec.ts` |
| Mutable preset pack library | create disposable managed preset pack, edit metadata in library, archive it, and verify cleanup | Mutable | `tests/e2e/workflow/admin-preset-pack-library-mutable.spec.ts` |
| Create exam workspace | institute-scope switching, wizard step navigation, scope/source/economy controls, and submit-ready final step | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| Mutable guided platform exam creation matrix | create disposable platform-source `practice`, `quiz`, and `mock_exam` admin exams through the guided wizard and verify admin workspace/detail assignment persistence | Mutable | `tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts` |
| Exam detail workspace | visible lifecycle controls, access-policy form, assigned-student and publish-history panels, plus builder handoffs | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| Mutable exam detail | create disposable admin exam shell, validate builder handoffs, refresh/sync/key actions, and save access policy | Mutable | `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts` |
| Exam builder workspace | admin-specific step rail, linked-questions tab, academic-setup handoff, and delivery-view handoff | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| Mutable exam builder | create disposable admin exam shell, save settings, add/remove section, and attach/update/remove linked question | Mutable | `tests/e2e/workflow/admin-exam-builder-mutable.spec.ts` |
| Academic setup workspace | section switching, institute scope switching, record-workspace controls, and exam-default policy field visibility | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| Mutable academic setup | create/edit/archive/restore academic year, program, cohort, subject, and topic records under admin institute scope | Mutable | `tests/e2e/workflow/admin-academic-setup-mutable.spec.ts` |
| Institutes workspace | institute directory search/filtering, selected detail panel, login-control visibility, and add/edit modal entry points | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| Mutable institutes workflow | create, edit, and delete a disposable institute through admin institute management and cleanup proxy routes | Mutable | `tests/e2e/workflow/admin-institutes-mutable.spec.ts` |
| Reports workspace | report controls, quick-filter cycling, lane switching, and hero handoffs to security and economy | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| People workspace | student/teacher roster tabs, institute scoping, roster filters, and CSV exports | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| Mutable roster actions | create/edit disposable teacher and student records plus login creation, reset, disable, and enable actions | Mutable | `tests/e2e/workflow/admin-roster-mutable.spec.ts` |
| Mutable roster import | preview/finalize disposable student and teacher CSV imports through admin-scoped roster import endpoints | Mutable | `tests/e2e/workflow/admin-roster-import-mutable.spec.ts` |
| Security workspace | search/filter controls, quick-filter chips, exam watch switching, selected exam posture, and watchlist panels | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| Economy workspace | seed-governance overview, scenario planning sections, student support controls, wallet visibility, and safe grant validation | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |

### Institute admin

| Module | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| Dashboard | dashboard entry, focus/sort filters, quick-filter chips, and handoffs into people, academic setup, exams, and reviews | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-dashboard-workspace.spec.ts` |
| People / roster | students and teachers tabs, search, login status filter, export, create/import controls, reset/disable actions visible | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| People / roster exports | student and teacher roster CSV downloads | Baseline | `tests/e2e/workflow/institute-people-export.spec.ts` |
| Academic setup | academic setup sections, assignments, exam defaults, academic years navigation | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| Teacher assignments | open add/edit dialogs, validate required-field errors, validate prefilled edit state | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| Mutable teacher assignments | create, edit, archive, restore a disposable teacher assignment | Mutable | `tests/e2e/workflow/institute-teacher-assignments-mutable.spec.ts` |
| Exam management | exam list, teacher/status/sort/group/page-size filters, quick-filter chips, grouped-state assertions, title sort, and handoffs into detail, builder, preset library, advanced builder, create exam, question bank, plus detail refresh/sync actions | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| Exam detail workspace | dedicated exam detail route coverage for KPI panels, readiness board, actions/configuration/access/history panels, and stable detail-route ownership | Baseline | `tests/e2e/workflow/institute-exam-detail-workspace.spec.ts` |
| Builder workflow | inspect builder shell, linked questions tab, and utility handoffs to delivery, results, reviews, and question bank | Baseline | `tests/e2e/workflow/institute-exam-builder-workspace.spec.ts` |
| Mutable advanced-builder exam creation matrix | create disposable `practice`, `quiz`, and `mock_exam` institute exams through advanced builder, verify resolved questions, assign a learner, and verify student visibility | Mutable | `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |
| Institute advanced builder template library | save template, export selected JSON bundle, import JSON bundle, and cleanup | Mutable | `tests/e2e/workflow/institute-advanced-builder-templates-mutable.spec.ts` |
| Question bank workspace | question bank landing, search/filter workflow, detail preview expansion, route drills into import and authoring flows, baseline question/comprehension detail route coverage, bulk-action guard validation, and mutable bulk-action success paths for difficulty, availability, and tagging | Baseline + Mutable | `tests/e2e/workflow/institute-question-bank-workspace.spec.ts`, `tests/e2e/workflow/institute-question-bank-detail-workspace.spec.ts`, `tests/e2e/workflow/institute-question-bank-bulk-workspace.spec.ts`, `tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts` |
| Results workspace | results landing page, summary cards, filter/reset flows, publication-group filtered-state validation, drills into exam, builder, reviews, question bank, leaderboard, leaderboard KPIs/checklist/pagination plus leaderboard utility handoffs and cross-view navigation, live monitor controls and attempt drillthrough, analysis, refresh-status/workflow-card utilities, and analysis-page student/question exploration | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-results-workspace.spec.ts`, `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts`, `tests/e2e/workflow/institute-results-live-workspace.spec.ts`, `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts` |
| Reports workspace | report controls, full quick-filter cycling, lane switching, reporting drill surfaces, and hero handoff to results/exams | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| Results attempts | attempt filters, grouping, pagination controls, inspect-attempt path or empty-state validation | Baseline | `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts` |
| Reviews workspace | results handoff, pending/reviewed filters, reset flow, exam-scoped queue actions, task-detail, and pagination checks | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |
| Mutable academic setup | create/edit/archive/restore academic year, program, cohort, subject, topic records | Mutable | `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts` |
| Mutable guided exam creation matrix | create disposable `practice`, `quiz`, and `mock_exam` institute exams through the guided wizard, attach one section and question, assign a learner, and verify student visibility | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts` |
| Mutable exam shell | create disposable institute exam shell, validate detail handoffs, mutable detail actions, and verify builder PDF export popup | Mutable | `tests/e2e/workflow/institute-exam-mutable.spec.ts` |
| Mutable question bank | create, update, delete disposable institute question | Mutable | `tests/e2e/workflow/institute-question-mutable.spec.ts` |
| Mutable question import | preview and finalize disposable institute question-import CSV rows | Mutable | `tests/e2e/workflow/question-import-mutable.spec.ts` |
| Mutable roster | create disposable teacher and student records, create login, reset/disable/enable login, cleanup through admin APIs | Mutable | `tests/e2e/workflow/institute-roster-mutable.spec.ts` |
| Mutable roster import | preview/finalize disposable student and teacher CSV imports with scoped cleanup | Mutable | `tests/e2e/workflow/institute-roster-import-mutable.spec.ts` |

### Teacher

| Module | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| Dashboard | dashboard landing, focus filter, reset flow, quick links | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| Exam management | exams list, group filter, quick create, advanced builder, exam open flow | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| Advanced builder template library | save template, export selected JSON bundle, import JSON bundle, and cleanup | Mutable | `tests/e2e/workflow/teacher-advanced-builder-templates-mutable.spec.ts` |
| Exam detail | detail page links and utility actions exposed from live exam | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| Question bank workspace | question bank landing, search/filter workflow, route drills into create and comprehension authoring | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts`, `tests/e2e/workflow/question-bank-deep.spec.ts` |
| Builder workflow | inspect builder sections, utility handoffs to delivery/results/reviews, linked questions tab, quick attach search/selection, and results-analysis handoff back to builder | Baseline | `tests/e2e/workflow/exam-builder.spec.ts` |
| Results workspace | filter, grouping, drills into exam, builder, reviews, question bank, leaderboard, leaderboard KPIs/checklist/pagination plus leaderboard utility handoffs and cross-view navigation, live monitor controls and attempt drillthrough, analysis, refresh-status/workflow-card utilities, and analysis-page student/question exploration | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts`, `tests/e2e/workflow/teacher-results-leaderboard-workspace.spec.ts`, `tests/e2e/workflow/teacher-results-live-workspace.spec.ts`, `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts` |
| Results attempts | attempt review filters, grouping, page size, inspect-attempt path or empty-state validation | Baseline | `tests/e2e/workflow/teacher-results-attempts-workspace.spec.ts` |
| Reviews workspace | open results, open pending/reviewed slices, reset, filter, exam-scoped queue actions, task-detail, and paging controls | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| Mutable review decisions | create a disposable manual-review task, assign it, and submit awarded marks plus notes | Mutable | `tests/e2e/workflow/teacher-review-mutable.spec.ts` |
| Mutable question authoring | create, update, delete disposable teacher-authored question | Mutable | `tests/e2e/workflow/teacher-question-mutable.spec.ts` |
| Mutable comprehension authoring | create, format, update, and link child questions under a disposable comprehension set | Mutable | `tests/e2e/workflow/teacher-comprehension-mutable.spec.ts` |
| Mutable question import | preview and finalize disposable teacher question-import CSV rows | Mutable | `tests/e2e/workflow/question-import-mutable.spec.ts` |
| Mutable exam builder | create disposable exam, save settings, add/remove section, attach/update/remove linked question | Mutable | `tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts` |
| Mutable exam detail | create disposable exam shell, validate delivery page handoffs, access-key, policy, refresh, sync actions | Mutable | `tests/e2e/workflow/teacher-exam-detail-mutable.spec.ts` |
| Mutable results workflow | export builder paper popup, publish-ready results workflow, and leaderboard assertions | Mutable | `tests/e2e/workflow/teacher-results-mutable.spec.ts` |

### Student

| Module | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| Exams workspace | exams shell, filter variations, enter-key route, empty-state handling | Baseline | `tests/e2e/smoke/student-attempts.spec.ts` |
| Practice workspace | practice filters, reset flow, weak-areas navigation, real-data empty-state handling | Baseline | `tests/e2e/smoke/student-attempts.spec.ts`, `tests/e2e/workflow/student-practice-workspace.spec.ts` |
| Mutable practice loop | start, resume, submit, and review a disposable practice set from the practice lane | Mutable | `tests/e2e/workflow/student-practice-mutable.spec.ts` |
| Weak areas | weak-areas entry path from practice workspace | Baseline | `tests/e2e/smoke/student-attempts.spec.ts` |
| Analytics | analytics landing, action-center handoff, source and subject deep drills, compare route entry plus rendered source/subject context, timeline, and subject practice-link preservation | Baseline | `tests/e2e/smoke/student-attempts.spec.ts`, `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| Attempts | attempts workspace shell and drillthrough | Baseline | `tests/e2e/smoke/student-attempts.spec.ts` |
| Results workspace | results landing, hero navigation, filters, quick-filter chips, grouped source/review assertions tied to live cards, summary/review drillthroughs, and empty/live state tolerance | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| Mutable live attempt | start, save, and submit a disposable teacher-assigned exam | Mutable | `tests/e2e/workflow/student-attempt-mutable.spec.ts` |
| Mutable admin-created assigned exam attempt | start, save, and submit a disposable admin advanced-builder `mock_exam` assigned to the seeded learner | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts` |
| Mutable exam-key flow | submit a live exam access key and open the assigned exam | Mutable | `tests/e2e/workflow/student-exam-key-mutable.spec.ts` |

### Registration journeys

| Module | Coverage | Spec |
| --- | --- | --- |
| Student signup | registration through complete-profile handoff | `tests/e2e/smoke/registration.spec.ts` |
| Teacher signup | registration through complete-profile handoff | `tests/e2e/smoke/registration.spec.ts` |

## Module view across the product

### Identity and access

- Login enforcement
- Role isolation
- New student registration
- New teacher registration

Covered by:

- `tests/e2e/role-scope/access-control.spec.ts`
- `tests/e2e/smoke/registration.spec.ts`

### Institute control plane

- Dashboard
- People
- Academic setup
- Teacher assignments
- Exams
- Question bank
- Results
- Reports
- Reviews

Covered by:

- `tests/e2e/smoke/institute-results.spec.ts`
- `tests/e2e/workflow/institute-question-bank-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-detail-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-bulk-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts`
- `tests/e2e/workflow/institute-results-workspace.spec.ts`
- `tests/e2e/workflow/institute-reports-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts`
- `tests/e2e/workflow/institute-reviews-workspace.spec.ts`
- mutable institute specs

### Teacher delivery plane

- Dashboard
- Exams
- Builder
- Question bank
- Results
- Reviews

Covered by:

- `tests/e2e/smoke/teacher-workflows.spec.ts`
- `tests/e2e/workflow/exam-builder.spec.ts`
- `tests/e2e/workflow/question-bank-deep.spec.ts`
- `tests/e2e/workflow/teacher-results-workspace.spec.ts`
- `tests/e2e/workflow/teacher-results-attempts-workspace.spec.ts`
- `tests/e2e/workflow/teacher-reviews-workspace.spec.ts`
- mutable teacher specs

### Student learning plane

- Exams
- Practice
- Weak areas
- Analytics
- Attempts
- Results

Covered by:

- `tests/e2e/smoke/student-attempts.spec.ts`
- `tests/e2e/workflow/student-practice-workspace.spec.ts`
- `tests/e2e/workflow/student-results-workspace.spec.ts`
- `tests/e2e/workflow/student-attempt-mutable.spec.ts`

## Real-data mutable lane inventory

These specs intentionally create or change disposable records and therefore run only in real-data mode.

| Mutable lane | Scope |
| --- | --- |
| `institute-academic-setup-mutable.spec.ts` | create/edit/archive/restore academic records |
| `admin-academic-setup-mutable.spec.ts` | disposable admin academic setup create/edit/archive/restore workflow |
| `admin-advanced-builder-templates-mutable.spec.ts` | disposable admin advanced builder template save/export/import workflow |
| `admin-exam-creation-advanced-matrix.mutable.spec.ts` | disposable admin advanced-builder platform-source practice, quiz, and mock exam creation plus resolved-question and assignment persistence workflow |
| `admin-exam-creation-advanced-student-attempt.mutable.spec.ts` | disposable admin advanced-builder platform mock exam creation plus seeded learner visibility, start, save, and submit workflow |
| `admin-exam-creation-wizard-matrix.mutable.spec.ts` | disposable admin guided-wizard platform-source practice, quiz, and mock exam creation plus assignment persistence workflow |
| `admin-exam-builder-mutable.spec.ts` | disposable admin exam builder settings, section, and linked-question workflow |
| `admin-exam-detail-mutable.spec.ts` | disposable admin exam detail lifecycle and access-policy workflow |
| `admin-preset-pack-library-mutable.spec.ts` | disposable admin managed preset pack create/edit/archive workflow |
| `admin-roster-import-mutable.spec.ts` | disposable admin roster import preview/finalize workflow |
| `admin-roster-mutable.spec.ts` | disposable admin roster create/edit/login lifecycle workflow |
| `admin-institutes-mutable.spec.ts` | disposable admin institute create/edit/delete workflow |
| `institute-advanced-builder-templates-mutable.spec.ts` | disposable advanced builder template save/export/import workflow |
| `institute-exam-creation-advanced-matrix.mutable.spec.ts` | disposable institute advanced-builder practice, quiz, and mock exam creation plus assignment and student visibility workflow |
| `institute-exam-creation-wizard-matrix.mutable.spec.ts` | disposable institute guided-wizard practice, quiz, and mock exam creation plus assignment and student visibility workflow |
| `institute-exam-mutable.spec.ts` | disposable institute exam shell and detail actions |
| `institute-question-mutable.spec.ts` | disposable institute question CRUD |
| `institute-roster-mutable.spec.ts` | disposable roster CRUD and scoped cleanup |
| `institute-roster-import-mutable.spec.ts` | disposable student and teacher roster CSV preview/finalize |
| `institute-teacher-assignments-mutable.spec.ts` | disposable teacher-assignment create/edit/archive/restore |
| `institute-question-import-export.spec.ts` | institute question and comprehension import template/sample download assertions |
| `question-import-mutable.spec.ts` | disposable teacher and institute question-import preview/finalize |
| `student-attempt-mutable.spec.ts` | real student attempt submission flow |
| `student-exam-key-mutable.spec.ts` | real student exam-key entry flow |
| `student-practice-mutable.spec.ts` | real student practice start/resume/review loop |
| `teacher-comprehension-mutable.spec.ts` | disposable comprehension authoring, formatting, update, and linked child question workflow |
| `teacher-advanced-builder-templates-mutable.spec.ts` | disposable advanced builder template save/export/import workflow |
| `teacher-exam-builder-mutable.spec.ts` | disposable builder section and linked-question mutations |
| `teacher-exam-detail-mutable.spec.ts` | disposable teacher exam detail policy and access actions |
| `teacher-question-import-export.spec.ts` | teacher question and comprehension import template/sample download assertions |
| `teacher-question-mutable.spec.ts` | disposable teacher question CRUD |
| `teacher-results-mutable.spec.ts` | disposable results workflow, publish-state checks, leaderboard verification, and PDF popup export |
| `teacher-review-mutable.spec.ts` | disposable manual-review queue assignment and scoring |

## Current strength areas

- Role isolation is automated and stable.
- Institute, teacher, and student all have at least one end-to-end workspace lane.
- Real-data mutable coverage now exists for the highest-risk CRUD surfaces.
- Results and reviews surfaces are covered at both institute and teacher levels.
- Student practice now has a real mutable start/resume/review loop.
- Institute people CSV exports are validated as real downloads.
- Institute question-bank workspace, detail routes, bulk-action guards, and mutable bulk-action success paths now have dedicated lanes instead of only indirect coverage through builder and mutable specs.
- Institute question-import and comprehension-import template/sample downloads are now validated as real files.
- Teacher question-import and comprehension-import template/sample downloads are now validated as real files.

## Current gaps to expand next

### Teacher

- Product gap: results and reports surfaces do not yet expose dedicated export/download CTAs beyond the builder popup and existing import-template downloads

### Student

- results grouped outcome lane
- compare, timeline, analytics filter persistence

### Cross-platform

- Product gap: file downloads and export verification across report/results surfaces are blocked until those surfaces expose real export/download controls
- Mobile viewport sanity checks
- Multi-browser expansion after stable account isolation
- Local debug bulk-import workflows now run without throttle-based skips, so roster and question-import lanes are part of the clean full-round pass.
- Current full-round blockers to stabilize: none

## Recommended usage

- Use this document as the current automation map.
- Use [README.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/README.md) for run commands.
- Use [REAL_DATA_INCREMENTAL_SCENARIO_ROUND.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/REAL_DATA_INCREMENTAL_SCENARIO_ROUND.md) for full-round execution order.
