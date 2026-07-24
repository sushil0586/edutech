# Playwright Role Module Coverage Map

## Current verified state

- Suite command: `npm run test:e2e:full-round`
- Operator confidence shortcut: `npm run test:e2e:release:operator-confidence`
- Latest targeted verification:
  - operator mobile dense browser coverage: `2 passed (7.5s)`
  - accessibility keyboard workflows baseline: `4 passed (7.8s)`
  - teacher + institute dense operator browser coverage: `6 passed (11.6s)`
    - teacher dense operator browser coverage: `3 passed (5.1s)`
    - institute dense operator browser coverage: `3 passed (6.5s)`
  - teacher + institute learner-detail visual coverage: `10 passed (10.5s)`
  - teacher + institute learner-drilldown browser coverage: `10 passed (11.7s)`
  - operator confidence packaged run:
    - broad pack: `104 passed (4.3m)`
    - report visuals: `14 passed (13.3s)`
  - teacher learner-drilldown report detail suite: `5 passed (9.0s)`
  - institute learner-drilldown report detail suite: `5 passed (8.5s)`
  - teacher + institute broad operator pack: `102 passed (4.6m)`
  - operator report visual pack: `14 passed (13.7s)`
  - institute report visual pack: `4 passed (4.9s)`
  - teacher report visual pack: `4 passed (5.3s)`
  - operator mobile report visual pack: `6 passed (6.1s)`
  - full authored round: `109 passed`, `1 skipped`
  - readiness-focused baseline subset: `5 passed`
  - teacher mutable results readiness lifecycle: `1 passed`
  - institute mutable results readiness lifecycle: `1 passed`
  - admin advanced-builder learner-handoff readiness lifecycle: `1 passed`
  - student published results grouped-outcome lifecycle: `1 passed`
  - student analytics source-to-compare scope continuity: `1 passed`
  - student analytics compare-to-timeline-to-actions scope continuity: `1 passed`
  - student mobile navigation and route sanity: `1 passed`
  - student cross-browser shell sanity: `3 passed`
    - chromium: `1 passed`
    - firefox: `1 passed`
    - webkit: `1 passed`
  - student cross-browser analytics and results sanity: `3 passed`
    - chromium: `1 passed`
    - firefox: `1 passed`
    - webkit: `1 passed`
  - student cross-browser attempts and post-submit summary sanity: `3 passed`
    - chromium: `1 passed`
    - firefox: `1 passed`
    - webkit: `1 passed`
  - student cross-browser exam detail and runtime sanity: `3 passed`
    - chromium: `1 passed`
    - firefox: `1 passed`
    - webkit: `1 passed`
  - admin cross-browser shell sanity: `3 passed`
    - chromium: `1 passed`
    - firefox: `1 passed`
    - webkit: `1 passed`
  - admin cross-browser deep-route sanity: `3 passed`
    - chromium: `1 passed`
    - firefox: `1 passed`
    - webkit: `1 passed`
  - teacher cross-browser shell sanity: `3 passed`
    - chromium: `1 passed`
    - firefox: `1 passed`
    - webkit: `1 passed`
  - teacher cross-browser results deep-route sanity: `3 passed`
    - chromium: `1 passed`
    - firefox: `1 passed`
    - webkit: `1 passed`
  - institute cross-browser shell sanity: `3 passed`
    - chromium: `1 passed`
    - firefox: `1 passed`
    - webkit: `1 passed`
  - institute cross-browser results deep-route sanity: `3 passed`
    - chromium: `1 passed`
    - firefox: `1 passed`
    - webkit: `1 passed`
  - post-fix targeted follow-up: `4 passed`
    - admin economy mutable: `1 passed`
    - admin exams workspace + admin roster mutable: `2 passed`
    - teacher results mutable: `1 passed`
- Browser lane: `chromium` baseline plus opt-in `firefox` and `webkit` student, teacher, institute, and admin sanity lanes
- Current device/form-factor note:
  - admin, institute, and teacher cross-browser sanity is desktop-focused today
  - student still has the deepest dedicated mobile-web baseline lane
  - operator smaller-screen confidence now includes mobile report-surface visuals for teacher and institute dense academic report routes
  - operator smaller-screen confidence now also includes mobile dense browser contracts for teacher and institute live-monitor, exam-detail, and question-detail routes
  - accessibility confidence is stronger across student reports hub plus teacher exam detail, teacher live monitor, teacher question editor, and institute live monitor; institute exam-detail tab-order still needs dedicated hardening
- Execution style: serial worker model using shared seeded demo accounts
- Coverage shape:
  - `107` spec files
  - `125` authored test cases
  - `77` baseline/non-mutable tests
  - `48` opt-in mutable tests
  - baseline coverage plus opt-in mutable real-data workflows

## Coverage summary by role

| Role | Coverage focus | Test cases |
| --- | --- | ---: |
| Anonymous | route protection and login redirects | 3 |
| Platform admin | dashboard, dashboard alias, search, settings, exams, advanced builder, desktop cross-browser shell sanity, desktop cross-browser deep-route sanity, mutable advanced builder templates, mutable advanced-builder exam creation, mutable advanced-builder learner attempt handoff, preset library, mutable preset library actions, mutable preset-library exam persistence, mutable assignment-mode persistence, exam creation, exam detail, mutable exam detail, exam builder, mutable exam builder, academic setup, mutable academic setup, institutes, institute CRUD, reports, people, mutable roster actions, mutable roster import, security, economy, and platform governance workspace navigation | 30 |
| Institute admin | control center, people, academic setup, exams, dedicated exam detail, results, reports, learner report drilldowns, report detail surfaces, desktop report visuals, mobile report visuals, mobile dense operator browser coverage, reviews, search, security, settings, desktop cross-browser shell sanity, desktop cross-browser results deep-route sanity, mutable admin actions, mutable preset-library exam persistence, mutable assignment-mode persistence, and mutable advanced-builder exam creation | 27 |
| Teacher | dashboard, exams, dedicated exam detail, builder, question bank, reports, learner report drilldowns, report detail surfaces, results, reviews, search, desktop report visuals, mobile report visuals, mobile dense operator browser coverage, desktop cross-browser shell sanity, desktop cross-browser results deep-route sanity, mutable authoring and delivery actions | 21 |
| Student | exams, exam detail, exam-key entry, dashboard, profile, settings, notifications, wallet, subscriptions, search, practice, analytics, analytics scope continuity across source, compare, timeline, and action-center drills, mobile navigation sanity, cross-browser shell sanity, cross-browser analytics/results sanity, cross-browser attempts/post-submit sanity, cross-browser exam/runtime sanity, attempts, attempt runtime, post-submit summary and review, results, result state matrix, mutable live attempt flow, mutable admin-created assigned exam attempt, mutable published-result visibility flow | 22 |
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
| Cross-browser shell sanity | desktop shell route sanity across dashboard, exams, institutes, reports, and people on Chromium, Firefox, and WebKit | Baseline | `tests/e2e/workflow/admin-cross-browser-shell.spec.ts` |
| Cross-browser deep-route sanity | desktop search, settings, and advanced-builder route sanity on Chromium, Firefox, and WebKit | Baseline | `tests/e2e/workflow/admin-cross-browser-deep-routes.spec.ts` |
| Dashboard legacy redirect | `/admin/dashboard` alias redirects into the main admin workspace | Baseline | `tests/e2e/workflow/admin-dashboard-redirect.spec.ts` |
| Search workspace | search controls, source/sort/group filters, quick-filter chips, reset flow, and back-to-workspace handoff | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| Settings workspace | governance summary cards, current live-control lanes, institute footprint, and people/academic handoffs | Baseline | `tests/e2e/workflow/admin-settings-workspace.spec.ts` |
| Exam management workspace | exam filters, quick-filter chips, zero-match handling, exam detail drills, builder handoff, and quick-create handoff | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| Advanced exam builder | stage rail visibility, builder/preset governance surfaces, stage switching, and preset-library handoff | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| Advanced builder family guidance | NEET, JEE, GRE, and AWS preset lanes surface family-aware authoring notes, execution checklists, composition guidance, and summary-rail recommendations | Baseline | `tests/e2e/workflow/family-advanced-builder-guidance.spec.ts` |
| Family preset builder handoff | preset-pack handoff seeds NEET, JEE, GRE, and AWS builder defaults including delivery and security fields | Baseline | `tests/e2e/workflow/admin-family-preset-builder-handoff.spec.ts` |
| Family preset persistence | create disposable exams from family presets and verify preset-driven metadata persists into saved admin exam records | Mutable | `tests/e2e/workflow/admin-family-preset-persistence.mutable.spec.ts` |
| Mutable advanced-builder platform exam creation matrix | create disposable platform-source `practice`, `quiz`, and `mock_exam` admin exams through advanced builder, verify resolved questions, and persist selected-student assignment in admin workspace/detail views; broader multi-learner distribution remains future expansion | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts` |
| Mutable advanced-builder learner attempt handoff | create a disposable platform-source `mock_exam` through advanced builder, align institute and academic scope to the seeded learner, assign the learner through `selected_students`, publish live, verify admin readiness transitions on the exam detail route, and verify start/save/submit from the student workspace; broader multi-learner distribution remains future expansion | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts` |
| Mutable assignment-mode matrix | create a disposable admin exam shell, enumerate every visible builder assignment-mode option, persist each one, and verify the direct-assignment panel contract for `scope` vs `selected_students` | Mutable | `tests/e2e/workflow/admin-exam-assignment-mode-matrix.mutable.spec.ts` |
| Mutable advanced builder templates | select institute scope, save template, export JSON bundle, import JSON bundle, and cleanup | Mutable | `tests/e2e/workflow/admin-advanced-builder-templates-mutable.spec.ts` |
| Preset pack library | library search, scope filters, exams handoff, and advanced-builder handoff | Baseline | `tests/e2e/workflow/admin-preset-pack-library.spec.ts` |
| Mutable preset pack library | create disposable managed preset pack, edit metadata in library, archive it, and verify cleanup | Mutable | `tests/e2e/workflow/admin-preset-pack-library-mutable.spec.ts` |
| Mutable preset-library exam persistence | save a disposable managed preset pack, reopen it from the library into advanced builder, create an exam from it, verify persisted runtime defaults, and cleanup both exam and pack | Mutable | `tests/e2e/workflow/admin-preset-library-persistence.mutable.spec.ts` |
| Create exam workspace | institute-scope switching, wizard step navigation, scope/source/economy controls, and submit-ready final step | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| Create exam family defaults | guided wizard applies seeded NEET, JEE, GRE, and AWS family defaults, checklist guidance, and runtime/learner posture changes across steps | Baseline | `tests/e2e/workflow/admin-family-guided-create-defaults.spec.ts` |
| Mutable guided family persistence | guided wizard persists JEE and GRE family-selected defaults into saved admin exam metadata | Mutable | `tests/e2e/workflow/admin-family-guided-persistence.mutable.spec.ts` |
| Mutable guided platform exam creation matrix | create disposable platform-source `practice`, `quiz`, and `mock_exam` admin exams through the guided wizard and verify admin workspace/detail assignment persistence; broader multi-learner distribution remains future expansion | Mutable | `tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts` |
| Exam detail workspace | visible lifecycle controls, result-status KPI, publish-readiness panels, access-policy form, assigned-student and publish-history panels, plus builder handoffs | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| Mutable exam detail | create disposable admin exam shell, validate builder handoffs, refresh/sync/key actions, and save access policy; `entitlement_only` persistence baseline is browser-proven while broader stars-policy breadth remains future expansion | Mutable | `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts` |
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
| Economy workspace | seed-governance overview, scenario planning sections, student support controls, wallet visibility, and safe grant validation; mutable support-ops now prove controlled star grant, entitlement lifecycle edits, and institute-admin policy-disable behavior while denser catalog combinations remain future expansion | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |

### Institute admin

| Module | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| Dashboard | dashboard entry, focus/sort filters, quick-filter chips, and handoffs into people, academic setup, exams, and reviews | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-dashboard-workspace.spec.ts` |
| Cross-browser shell sanity | desktop shell route sanity across dashboard, exams, results, reviews, question bank, and people on Chromium, Firefox, and WebKit | Baseline | `tests/e2e/workflow/institute-cross-browser-shell.spec.ts` |
| Cross-browser results deep-route sanity | desktop results, leaderboard, analysis, and live-monitor route sanity on Chromium, Firefox, and WebKit | Baseline | `tests/e2e/workflow/institute-cross-browser-results.spec.ts` |
| People / roster | students and teachers tabs, search, login status filter, export, create/import controls, reset/disable actions visible | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| People / roster exports | student and teacher roster CSV downloads | Baseline | `tests/e2e/workflow/institute-people-export.spec.ts` |
| Academic setup | academic setup sections, assignments, exam defaults, academic years navigation | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| Teacher assignments | open add/edit dialogs, validate required-field errors, validate prefilled edit state | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| Mutable teacher assignments | create, edit, archive, restore a disposable teacher assignment | Mutable | `tests/e2e/workflow/institute-teacher-assignments-mutable.spec.ts` |
| Exam management | exam list, teacher/status/sort/group/page-size filters, quick-filter chips, grouped-state assertions, title sort, and handoffs into detail, builder, preset library, advanced builder, create exam, question bank, plus detail refresh/sync actions | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| Exam detail workspace | dedicated exam detail route coverage for KPI panels, heuristic readiness board, publish-readiness panels, actions/configuration/access/history panels, and stable detail-route ownership | Baseline | `tests/e2e/workflow/institute-exam-detail-workspace.spec.ts` |
| Builder workflow | inspect builder shell, linked questions tab, and utility handoffs to delivery, results, reviews, and question bank | Baseline | `tests/e2e/workflow/institute-exam-builder-workspace.spec.ts` |
| Advanced builder family guidance | NEET, JEE, GRE, and AWS preset lanes surface family-aware authoring notes, execution checklists, composition guidance, and summary-rail recommendations | Baseline | `tests/e2e/workflow/family-advanced-builder-guidance.spec.ts` |
| Family preset builder handoff | preset-pack handoff seeds NEET, JEE, GRE, AWS, IELTS, and PTE builder defaults including delivery and security fields, with truthful advanced-builder entitlement messaging when blocked | Baseline | `tests/e2e/workflow/institute-family-preset-builder-handoff.spec.ts` |
| Family preset persistence | create disposable exams from family presets and verify preset-driven metadata persists into saved institute exam records | Mutable | `tests/e2e/workflow/institute-family-preset-persistence.mutable.spec.ts` |
| Mutable preset-library exam persistence | save a disposable managed preset pack, reopen it from the library into advanced builder, create an exam from it, verify persisted runtime defaults, and cleanup both exam and pack | Mutable | `tests/e2e/workflow/institute-preset-library-persistence.mutable.spec.ts` |
| Mutable advanced-builder exam creation matrix | create disposable `practice`, `quiz`, and `mock_exam` institute exams through advanced builder, verify resolved questions, assign a learner, and verify student visibility; selected-student baseline is proven while broader multi-learner distribution remains future expansion | Mutable | `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |
| Mutable assignment-mode matrix | create a disposable institute exam shell, enumerate every visible builder assignment-mode option, persist each one, and verify the direct-assignment panel contract for `scope` vs `selected_students` | Mutable | `tests/e2e/workflow/institute-exam-assignment-mode-matrix.mutable.spec.ts` |
| Institute advanced builder template library | save template, export selected JSON bundle, import JSON bundle, and cleanup | Mutable | `tests/e2e/workflow/institute-advanced-builder-templates-mutable.spec.ts` |
| Question bank workspace | question bank landing, search/filter workflow, detail preview expansion, route drills into import and authoring flows, baseline question/comprehension detail route coverage, bulk-action guard validation, and mutable bulk-action success paths for difficulty, availability, and tagging | Baseline + Mutable | `tests/e2e/workflow/institute-question-bank-workspace.spec.ts`, `tests/e2e/workflow/institute-question-bank-detail-workspace.spec.ts`, `tests/e2e/workflow/institute-question-bank-bulk-workspace.spec.ts`, `tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts` |
| Results workspace | results landing page, summary cards, exam/result publish-readiness cards, filter/reset flows, publication-group filtered-state validation, drills into exam, builder, reviews, question bank, leaderboard, leaderboard KPIs/checklist/pagination plus leaderboard utility handoffs and cross-view navigation, live monitor controls and attempt drillthrough, analysis, refresh-status/workflow-card utilities, and analysis-page student/question exploration | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-results-workspace.spec.ts`, `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts`, `tests/e2e/workflow/institute-results-live-workspace.spec.ts`, `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts` |
| Reports workspace | report controls, full quick-filter cycling, lane switching, reporting drill surfaces, direct handoffs into dedicated subject, topic-mastery, wrong-question, time-management, rank-history, and study-recommendation reports, plus hero handoff to results/exams | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts`, `tests/e2e/workflow/institute-reports-browser-coverage.spec.ts` |
| Learner report drilldowns | dedicated institute learner report detail route with report-lane handoffs from subject, study-recommendation, and timing surfaces, plus browser-truthful learner-link contracts | Baseline | `tests/e2e/workflow/institute-report-detail-workspace.spec.ts`, `tests/e2e/workflow/institute-report-detail-browser-coverage.spec.ts` |
| Report detail surfaces | dedicated institute subject performance, topic mastery, wrong questions, and time management reports with browser-truthful counts, empty states, learner drilldowns, and handoffs into analysis, attempts, and sibling report lanes | Baseline | `tests/e2e/workflow/institute-report-detail-workspace.spec.ts`, `tests/e2e/workflow/institute-report-detail-browser-coverage.spec.ts` |
| Desktop report visual contracts | dedicated institute subject performance, topic mastery, wrong questions, time management, and learner detail reports preserve hero, KPI strip, and dense support-card alignment under screenshot-based visual assertions | Baseline | `tests/e2e/workflow/institute-report-surfaces-visual.spec.ts` |
| Mobile report visual contracts | mobile teacher subject, topic-mastery, wrong-question, and time-management report surfaces plus institute wrong-question and time-management report surfaces preserve hero readability and dense row alignment under narrow-view screenshot assertions | Baseline | `tests/e2e/workflow/operator-mobile-report-surfaces-visual.spec.ts` |
| Dense operator browser contracts | live monitor, exam detail, and question detail keep dense cards, panels, and handoffs horizontally stable and browser-truthful | Baseline | `tests/e2e/workflow/institute-dense-operator-browser-coverage.spec.ts` |
| Mobile dense operator browser contracts | mobile live monitor, exam detail, and question detail keep dense cards, panels, and handoffs horizontally stable and browser-truthful | Baseline | `tests/e2e/workflow/operator-mobile-dense-browser-coverage.spec.ts` |
| Results attempts | attempt filters, grouping, pagination controls, inspect-attempt path or empty-state validation | Baseline | `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts` |
| Reviews workspace | results handoff, pending/reviewed filters, reset flow, filtered-empty recovery, exam-scoped queue actions, task-detail, and pagination checks | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |
| Mutable review decisions | create a disposable institute descriptive review task, assign it, request recheck, moderate it, and verify browser-truthful review state transitions | Mutable | `tests/e2e/workflow/institute-reviews-mutable.spec.ts` |
| Mutable academic setup | create/edit/archive/restore academic year, program, cohort, subject, topic records | Mutable | `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts` |
| Mutable guided exam creation matrix | create disposable `practice`, `quiz`, and `mock_exam` institute exams through the guided wizard, attach one section and question, assign a learner, and verify student visibility; selected-student baseline is proven while broader multi-learner distribution remains future expansion | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts` |
| Guided exam family defaults | guided wizard applies seeded NEET, JEE, GRE, and AWS family defaults, checklist guidance, and runtime/learner posture changes across steps | Baseline | `tests/e2e/workflow/institute-family-guided-create-defaults.spec.ts` |
| Mutable guided family persistence | guided wizard persists JEE and GRE family-selected defaults into saved institute exam metadata | Mutable | `tests/e2e/workflow/institute-family-guided-persistence.mutable.spec.ts` |
| Mutable exam shell | create disposable institute exam shell, validate detail handoffs, mutable detail actions, and verify builder PDF export popup; `entitlement_only` persistence baseline is browser-proven while broader stars-policy breadth remains future expansion | Mutable | `tests/e2e/workflow/institute-exam-mutable.spec.ts` |
| Mutable results workflow | create disposable institute exam shells, submit learner attempts, and prove publish-readiness, leaderboard state changes, populated live-monitor evidence, and populated analysis drilldowns through institute-side result publication; single-ranked, multi-learner, descriptive, live-monitor, and analysis-populated flows are browser-proven | Mutable | `tests/e2e/workflow/institute-results-mutable.spec.ts`, `tests/e2e/workflow/institute-results-multi-learner.mutable.spec.ts`, `tests/e2e/workflow/institute-results-descriptive-multi-role.mutable.spec.ts`, `tests/e2e/workflow/institute-results-analysis-populated.mutable.spec.ts`, `tests/e2e/workflow/institute-results-live-populated.mutable.spec.ts` |
| Mutable question bank | create, update, delete disposable institute question | Mutable | `tests/e2e/workflow/institute-question-mutable.spec.ts` |
| Mutable question import | preview and finalize disposable institute question-import CSV rows | Mutable | `tests/e2e/workflow/question-import-mutable.spec.ts` |
| Mutable roster | create disposable teacher and student records, create login, reset/disable/enable login, cleanup through admin APIs | Mutable | `tests/e2e/workflow/institute-roster-mutable.spec.ts` |
| Mutable roster import | preview/finalize disposable student and teacher CSV imports with scoped cleanup | Mutable | `tests/e2e/workflow/institute-roster-import-mutable.spec.ts` |

### Teacher

| Module | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| Dashboard | dashboard landing, focus filter, reset flow, quick links | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| Cross-browser shell sanity | desktop shell route sanity across dashboard, exams, question bank, results, and reviews on Chromium, Firefox, and WebKit | Baseline | `tests/e2e/workflow/teacher-cross-browser-shell.spec.ts` |
| Cross-browser results deep-route sanity | desktop results, leaderboard, analysis, and live-monitor route sanity on Chromium, Firefox, and WebKit | Baseline | `tests/e2e/workflow/teacher-cross-browser-results.spec.ts` |
| Exam management | exams list, group filter, quick create, advanced builder, exam open flow | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| Advanced builder template library | save template, export selected JSON bundle, import JSON bundle, and cleanup | Mutable | `tests/e2e/workflow/teacher-advanced-builder-templates-mutable.spec.ts` |
| Exam detail | dedicated teacher exam detail route coverage for readiness panels, lifecycle controls, access-policy forms, handoff links, and publish-history visibility | Baseline | `tests/e2e/workflow/teacher-exam-detail-workspace.spec.ts` |
| Question bank workspace | question bank landing, search/filter workflow, route drills into create and comprehension authoring | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts`, `tests/e2e/workflow/question-bank-deep.spec.ts` |
| Builder workflow | inspect builder sections, utility handoffs to delivery/results/reviews, linked questions tab, quick attach search/selection, and results-analysis handoff back to builder | Baseline | `tests/e2e/workflow/exam-builder.spec.ts` |
| Results workspace | filter, grouping, exam/result publish-readiness cards, drills into exam, builder, reviews, question bank, leaderboard, leaderboard KPIs/checklist/pagination plus leaderboard utility handoffs and cross-view navigation, live monitor controls and attempt drillthrough, analysis, refresh-status/workflow-card utilities, and analysis-page student/question exploration | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts`, `tests/e2e/workflow/teacher-results-leaderboard-workspace.spec.ts`, `tests/e2e/workflow/teacher-results-live-workspace.spec.ts`, `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts` |
| Results attempts | attempt review filters, grouping, page size, inspect-attempt path or empty-state validation | Baseline | `tests/e2e/workflow/teacher-results-attempts-workspace.spec.ts` |
| Reviews workspace | open results, open pending/reviewed slices, reset, filter, exam-scoped queue actions, task-detail, and paging controls | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| Mutable review decisions | create a disposable manual-review task, assign it, and submit awarded marks plus notes | Mutable | `tests/e2e/workflow/teacher-review-mutable.spec.ts` |
| Mutable question authoring | create, update, delete disposable teacher-authored question | Mutable | `tests/e2e/workflow/teacher-question-mutable.spec.ts` |
| Mutable comprehension authoring | create, format, update, and link child questions under a disposable comprehension set | Mutable | `tests/e2e/workflow/teacher-comprehension-mutable.spec.ts` |
| Mutable question import | preview and finalize disposable teacher question-import CSV rows | Mutable | `tests/e2e/workflow/question-import-mutable.spec.ts` |
| Mutable exam builder | create disposable exam, save settings, add/remove section, attach/update/remove linked question | Mutable | `tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts` |
| Mutable exam detail | create disposable exam shell, validate delivery page handoffs, access-key, policy, refresh, sync actions | Mutable | `tests/e2e/workflow/teacher-exam-detail-mutable.spec.ts` |
| Mutable results workflow | export builder paper popup, publish-ready teacher results workflow, ranked multi-learner distribution, partial publication distribution, populated live-monitor evidence, and populated analysis drilldowns are browser-proven across teacher-managed result publication flows | Mutable | `tests/e2e/workflow/teacher-results-mutable.spec.ts`, `tests/e2e/workflow/teacher-results-multi-learner.mutable.spec.ts`, `tests/e2e/workflow/teacher-results-partial-distribution.mutable.spec.ts`, `tests/e2e/workflow/teacher-results-analysis-populated.mutable.spec.ts`, `tests/e2e/workflow/teacher-results-live-populated.mutable.spec.ts` |
| Learner report drilldowns | dedicated teacher learner report detail route with report-lane handoffs from subject, weak-area, wrong-question, time-management, and study-recommendation surfaces, plus browser-truthful learner-link contracts | Baseline | `tests/e2e/workflow/teacher-report-detail-workspace.spec.ts`, `tests/e2e/workflow/teacher-report-detail-browser-coverage.spec.ts` |
| Report detail surfaces | dedicated teacher subject performance, topic mastery, wrong questions, and time management reports with browser-truthful counts, empty states, learner drilldowns, and handoffs into analysis, attempts, and sibling report lanes | Baseline | `tests/e2e/workflow/teacher-report-detail-workspace.spec.ts`, `tests/e2e/workflow/teacher-report-detail-browser-coverage.spec.ts` |
| Desktop report visual contracts | dedicated teacher subject performance, topic mastery, wrong questions, time management, and learner detail reports preserve hero, KPI strip, and dense support-card alignment under screenshot-based visual assertions | Baseline | `tests/e2e/workflow/teacher-report-surfaces-visual.spec.ts` |
| Dense operator browser contracts | live monitor, exam detail, and question detail keep dense cards, panels, editor surfaces, and handoffs horizontally stable and browser-truthful | Baseline | `tests/e2e/workflow/teacher-dense-operator-browser-coverage.spec.ts` |
| Mobile dense operator browser contracts | mobile live monitor, exam detail, and question detail keep dense cards, panels, editor surfaces, and handoffs horizontally stable and browser-truthful | Baseline | `tests/e2e/workflow/operator-mobile-dense-browser-coverage.spec.ts` |

### Student

| Module | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| Exams workspace | exams shell, availability/sort/group/page-size filters, quick-filter chips, pagination summary, primary action-branch coverage, enter-key route, detail handoff, and empty-state handling | Baseline | `tests/e2e/workflow/student-exams-workspace.spec.ts`, `tests/e2e/smoke/student-attempts.spec.ts` |
| Exam detail workspace | exam readiness, runtime and policy surfaces, section and blueprint visibility, plus safe non-mutating handoffs into attempts, review, summary, or wallet based on live backend state | Baseline | `tests/e2e/workflow/student-exam-detail-workspace.spec.ts` |
| Exam-key entry workspace | quick exam lookup guidance, required-field validation, and safe navigation back into the catalog or dashboard without depending on disposable access keys | Baseline | `tests/e2e/workflow/student-exam-key-workspace.spec.ts` |
| Dashboard workspace | dashboard recommendation cards, action queue, source/subject context controls, and major handoffs into attempts, wallet, exams, analytics, and results | Baseline | `tests/e2e/workflow/student-dashboard-workspace.spec.ts` |
| Mobile workspace sanity | phone-viewport drawer navigation and core route sanity across dashboard, tests, results, analytics, and profile; this is the current small-screen baseline while equivalent operator-screen lanes remain future expansion | Baseline | `tests/e2e/workflow/student-mobile-sanity-workspace.spec.ts` |
| Cross-browser shell sanity | desktop shell route sanity across dashboard, tests, analytics, results, and profile on Chromium, Firefox, and WebKit | Baseline | `tests/e2e/workflow/student-cross-browser-shell.spec.ts` |
| Cross-browser analytics and results sanity | desktop results plus analytics compare/timeline route sanity on Chromium, Firefox, and WebKit | Baseline | `tests/e2e/workflow/student-cross-browser-analytics-results.spec.ts` |
| Cross-browser attempts and post-submit sanity | desktop attempts plus post-submit summary/review route sanity on Chromium, Firefox, and WebKit | Baseline | `tests/e2e/workflow/student-cross-browser-attempts-summary.spec.ts` |
| Cross-browser exam detail and runtime sanity | desktop exam detail plus conditional runtime route sanity on Chromium, Firefox, and WebKit | Baseline | `tests/e2e/workflow/student-cross-browser-exam-runtime.spec.ts` |
| Utility and identity surfaces | dashboard and profile route coverage with truthful utility-state assertions | Baseline | `tests/e2e/workflow/student-utility-workspace.spec.ts` |
| Settings workspace | account-state visibility, support guidance, quick-access handoffs, notifications/help handoffs, and session-control visibility | Baseline | `tests/e2e/workflow/student-settings-workspace.spec.ts` |
| Search workspace | search query behavior, section/source/sort/group filters, quick-filter chip continuity, grouped handoff behavior, zero-state handling, reset behavior, and truthful shell handoffs into student routes | Baseline | `tests/e2e/workflow/student-search-workspace.spec.ts`, `tests/e2e/workflow/student-search-continuity.spec.ts` |
| Wallet workspace | balance and KPI visibility, rewards and referral visibility, ledger and unlock-history visibility, star-pack and subscription-plan visibility, request-state visibility, and premium-route handoffs | Baseline | `tests/e2e/workflow/student-wallet-workspace.spec.ts` |
| Subscriptions workspace | section filter behavior, rows/page-size behavior, plans/orders/subscriptions state branches, wallet handoff truthfulness, premium-route handoffs, and subscription-state messaging | Baseline | `tests/e2e/workflow/student-subscriptions-workspace.spec.ts` |
| Notifications workspace | inbox setup/load/empty-state truthfulness, mark-read actions, mark-all flow, filters, grouping, reset, learner-route handoffs, and filter-to-handoff continuity across category, object, page-size, and hero CTA navigation | Baseline | `tests/e2e/workflow/student-notifications-workspace.spec.ts`, `tests/e2e/workflow/student-notifications-continuity.spec.ts` |
| Practice workspace | practice filters, reset flow, weak-areas navigation, real-data empty-state handling | Baseline | `tests/e2e/smoke/student-attempts.spec.ts`, `tests/e2e/workflow/student-practice-workspace.spec.ts` |
| Mutable practice loop | start, resume, submit, and review a disposable practice set from the practice lane | Mutable | `tests/e2e/workflow/student-practice-mutable.spec.ts` |
| Weak areas | weak-areas entry path from practice workspace, ranked topic mastery validation, and recovery handoffs into topic drilldown, question evidence, practice, and exams | Baseline | `tests/e2e/smoke/student-attempts.spec.ts`, `tests/e2e/workflow/student-weak-areas-workspace.spec.ts`, `tests/e2e/workflow/student-weak-areas-recovery-workflow.spec.ts` |
| Analytics | analytics landing, action-center handoff, source and subject deep drills, compare route entry plus rendered source/subject context, timeline, and subject practice-link preservation | Baseline | `tests/e2e/smoke/student-attempts.spec.ts`, `tests/e2e/workflow/student-analytics-deep.spec.ts`, `tests/e2e/workflow/student-analytics-subject-report-workspace.spec.ts` |
| Analytics scope continuity | source drill preserves subject/teacher context, compare drill materializes source key into scoped query params, timeline/action-center handoffs preserve scoped filters, and subject drill keeps source-teacher scope alive | Baseline | `tests/e2e/workflow/student-analytics-scope-persistence-workspace.spec.ts` |
| Analytics timeline and compare | standalone timeline and comparison route coverage for trend snapshot, benchmark panels, subject momentum, result ledger, and the timeline/compare/results handoff loop | Baseline | `tests/e2e/workflow/student-analytics-timeline-compare-workspace.spec.ts` |
| Analytics action center and question evidence | action-center shortlist, question evidence route, guided drill-downs, and cross-route continuity through actions and questions | Baseline | `tests/e2e/workflow/student-analytics-actions-questions-workspace.spec.ts` |
| Dense academic reports | wrong questions, time management, study recommendations, rank history, and student reports hub surfaces with desktop workflow coverage; the reports hub now proves both `/app/analytics/downloads` compatibility and direct `/app/reports` entry plus scoped handoffs into linked student report routes | Baseline | `tests/e2e/workflow/student-wrong-questions-workspace.spec.ts`, `tests/e2e/workflow/student-time-management-workspace.spec.ts`, `tests/e2e/workflow/student-study-recommendations-workspace.spec.ts`, `tests/e2e/workflow/student-rank-history-workspace.spec.ts`, `tests/e2e/workflow/student-downloads-workspace.spec.ts`, `tests/e2e/workflow/student-downloads-report-handoffs.spec.ts` |
| Student academic continuity journey | end-to-end continuity across dashboard, analytics, practice, attempts, results, and academic report handoffs | Baseline | `tests/e2e/workflow/student-academic-continuity-journey.spec.ts` |
| Family fixture preflight | seeded NEET, JEE, GRE, AWS, and multi-subject student credentials and exam/result fixtures are validated up front with fixture-gap specific failures | Baseline | `tests/e2e/workflow/student-family-fixture-preflight.spec.ts` |
| Desktop report visual contracts | dashboard reports, dense academic reports, utility surfaces, analytics drill-downs, results compare, post-submit states, attempts, and report surfaces | Baseline | `tests/e2e/workflow/student-dashboard-report-visual.spec.ts`, `tests/e2e/workflow/student-dense-report-visual.spec.ts`, `tests/e2e/workflow/student-utility-visual.spec.ts`, `tests/e2e/workflow/student-analytics-drilldown-visual.spec.ts`, `tests/e2e/workflow/student-analytics-results-compare-visual.spec.ts`, `tests/e2e/workflow/student-analytics-actions-sources-visual.spec.ts`, `tests/e2e/workflow/student-report-surfaces-visual.spec.ts`, `tests/e2e/workflow/student-post-submit-visual.spec.ts`, `tests/e2e/workflow/student-attempt-visual.spec.ts` |
| Mobile report visual contracts | mobile dashboard reports, dense academic reports, analytics extensions, utility surfaces, report surfaces, post-submit states, attempt runtime visuals, and mobile continuity across notifications, search, and downloads-linked report routes | Baseline | `tests/e2e/workflow/student-mobile-dashboard-report-visual.spec.ts`, `tests/e2e/workflow/student-mobile-dense-report-visual.spec.ts`, `tests/e2e/workflow/student-mobile-utility-visual.spec.ts`, `tests/e2e/workflow/student-mobile-analytics-extended-visual.spec.ts`, `tests/e2e/workflow/student-mobile-report-surfaces-visual.spec.ts`, `tests/e2e/workflow/student-mobile-post-submit-visual.spec.ts`, `tests/e2e/workflow/student-mobile-attempt-visual.spec.ts`, `tests/e2e/workflow/student-mobile-academic-report-contracts.spec.ts`, `tests/e2e/workflow/student-mobile-report-continuity.spec.ts` |
| Attempts | attempts workspace shell, status/sort/group/page-size filters, quick-filter state, grouped ledger sections, pagination summary, and primary/secondary action branching | Baseline | `tests/e2e/workflow/student-attempts-workspace.spec.ts`, `tests/e2e/smoke/student-attempts.spec.ts` |
| Attempt runtime workspace | active attempt console coverage for progress, palette, save/submit controls, and truthful locked-state fallback when a previously active route has already expired or been submitted | Baseline | `tests/e2e/workflow/student-attempt-runtime-workspace.spec.ts` |
| Post-submit summary and review | post-submit state messaging, status and recommended-action surfaces, result handoff, and conditional review drillthrough when backend policy exposes learner review | Baseline | `tests/e2e/workflow/student-post-submit-workspace.spec.ts` |
| Results workspace | results landing, hero navigation, filters, quick-filter chips, grouped source/review assertions tied to live cards, summary/review drillthroughs, and empty/live state tolerance | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| Result state matrix | explicit learner-visible validation for pending release, published summary-only, and review-ready result states when those records exist in live student data | Baseline | `tests/e2e/workflow/student-result-state-matrix-workspace.spec.ts` |
| Mutable live attempt | start, save, and submit a disposable teacher-assigned exam | Mutable | `tests/e2e/workflow/student-attempt-mutable.spec.ts` |
| Mutable admin-created assigned exam attempt | start, save, and submit a disposable admin advanced-builder `mock_exam` assigned to the seeded learner | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts` |
| Mutable published student result visibility | create a disposable teacher-assigned exam, submit one learner attempt, publish results, and verify grouped outcome visibility plus summary handoff in the student results workspace; single-ranked learner leaderboard-ready outcome visibility is proven while wider distribution depth remains future expansion | Mutable | `tests/e2e/workflow/student-results-mutable.spec.ts` |
| Mutable student result storytelling continuity | follow a seeded review-ready student result across grouped results, summary, review, analytics, compare, and timeline storytelling surfaces | Mutable | `tests/e2e/workflow/student-results-storytelling.mutable.spec.ts` |
| Mutable student analytics drill-down continuity | follow a seeded published result through analytics compare, timeline, action center, subject deep dive, and results continuity with scoped filters preserved | Mutable | `tests/e2e/workflow/student-analytics-drilldown.mutable.spec.ts` |
| Mutable descriptive analytics continuity | create a disposable institute descriptive exam, submit a manual-review answer, publish the reviewed result, and verify results, review, compare, question-pattern analytics, and timeline continuity | Mutable | `tests/e2e/workflow/student-descriptive-analytics-continuity.mutable.spec.ts` |
| Mutable descriptive result storytelling | create a disposable institute descriptive exam, moderate it manually, and verify learner-visible continuity across results, summary, review, and analytics | Mutable | `tests/e2e/workflow/student-descriptive-result-storytelling.mutable.spec.ts` |
| Mutable mixed result history continuity | create pending, summary-only, review-ready, and descriptive-reviewed disposable result states for one learner and verify the results workspace and downstream handoffs stay coherent | Mutable | `tests/e2e/workflow/student-mixed-result-history.mutable.spec.ts` |
| Mutable multi-attempt history continuity | create three disposable attempts on one exam and verify latest, best, and lowest attempt ordering across attempts, results, compare, and timeline surfaces | Mutable | `tests/e2e/workflow/student-multi-attempt-history.mutable.spec.ts` |
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

### Student

| Area | Status | Notes |
| --- | --- | --- |
| Core desktop workflows | Covered | dashboard, exams, practice, attempts, analytics, results, and report handoffs all have baseline automation |
| Attempt runtime happy path | Covered | active attempt, save, submit, summary, and review flows are automated |
| Attempt runtime edge cases | Partial | resume-after-refresh, timer edge transitions, rapid-save races, and section-edge submit states still need deeper coverage |
| Dense desktop visual alignment | Partial | high-value report and attempt surfaces are stronger, but not every dense card, modal, drawer, or utility panel is under visual contract |
| Empty and low-data states | Partial | several report and workspace empty states are covered, but not systematically across every student lane |
| Long-content overflow hardening | Partial | recent UI hardening improved this area, but broad ellipsis and no-spill assertions are not yet enforced across every component |
| Mobile high-density workflows | Partial | mobile navigation sanity exists, but dense report, attempt, and review surfaces do not yet have equally deep mobile coverage |
| Cross-browser deep report behavior | Partial | shell, analytics, results, attempts, and exam/runtime sanity exist, but deep student report-lane parity across browsers is still lighter than Chromium desktop coverage |

### Teacher

| Area | Status | Notes |
| --- | --- | --- |
| Report drilldowns and learner detail | Covered | subject, weak-area, wrong-question, time-management, and study-recommendation lanes now drill into learner detail with browser-proofed contracts |
| Report visual contracts | Covered | teacher report surfaces and learner-detail hero/KPI/support-card alignment are under screenshot assertions |
| Results, leaderboard, live, and analysis workflows | Covered | dedicated teacher results workspace specs exist, including mutable publication coverage |
| Dense non-report operator pages | Covered | `teacher/results/live`, `teacher/exams/[id]`, and `teacher/question-bank/detail` now have dedicated browser-based dense-surface contracts |
| Extreme data states | Partial | long names, oversized cohorts, rank/tie edge cases, and heavy table stress states are not yet systematically exercised |
| Export/download verification | Missing by product | results and reports still lack broad dedicated export CTAs beyond current builder/import download surfaces |
| Cross-browser deep report-detail parity | Partial | targeted browser-truthful checks exist, but full deep route/filter/state parity across Chromium, Firefox, and WebKit is not yet complete |

### Institute

| Area | Status | Notes |
| --- | --- | --- |
| Report drilldowns and learner detail | Covered | institute subject, timing, and study-recommendation lanes now drill into learner detail with browser-proofed contracts |
| Report visual contracts | Covered | institute report surfaces and learner-detail hero/KPI/support-card alignment are under screenshot assertions |
| Results, leaderboard, live, and analysis workflows | Covered | dedicated institute results workspace specs exist, including mutable publication and analysis-populated coverage |
| Dense non-report operator pages | Covered | `institute/results/live`, `institute/exams/[id]`, and `institute/question-bank/detail` now have dedicated browser-based dense-surface contracts |
| Extreme data states | Partial | large rosters, long labels, single-row and zero-row reports, and pagination extremes are not yet systematically locked down |
| Export/download verification | Missing by product | report/results export assertions are blocked until those surfaces expose real export/download controls |
| Cross-browser deep report-detail parity | Partial | browser coverage exists for truthful handoffs, but not complete deep-state parity across all supported browsers |

### Cross-platform and quality

| Area | Status | Notes |
| --- | --- | --- |
| Cross-browser route sanity | Covered | student, teacher, admin, and institute each have at least baseline cross-browser shell or deep-route sanity lanes |
| Cross-browser depth for dense surfaces | Partial | current coverage is strong for sanity and selected deep routes, but not exhaustive for every dense operator and student report surface |
| Mobile operator visual contracts | Partial | mobile report visual checks exist, but not yet for all teacher/institute dense pages or all student high-density report states |
| Accessibility and keyboard behavior | Partial | keyboard-only traversal now has a baseline across student reports hub, teacher exam detail, and institute live monitor, but deeper focus-order, screen reader naming, and broad focus-visible assertions are still uncovered |
| Backend/UI reporting contract resilience | Partial | several reporting mismatches have been fixed, but schema/query drift remains a live risk area whenever analytics payloads change |
| Full-round blockers | Covered | current full authored round reports no active blockers to stabilize |

### Immediate next-priority gaps

1. Extreme and empty-state hardening across student, teacher, and institute reports.
2. Mobile visual contracts for high-density student, teacher, and institute pages.
3. Broader accessibility coverage beyond the current keyboard baseline.
4. Broader cross-browser deep-state parity for dense teacher and institute operator pages.
5. Export/download verification once teacher and institute results/report surfaces expose dedicated product CTAs.

## Recommended usage

- Use this document as the current automation map.
- Use [README.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/README.md) for run commands.
- Use [REAL_DATA_INCREMENTAL_SCENARIO_ROUND.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/REAL_DATA_INCREMENTAL_SCENARIO_ROUND.md) for full-round execution order.
