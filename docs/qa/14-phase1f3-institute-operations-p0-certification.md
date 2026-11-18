# Phase 1F.3 Institute Operations P0 Certification

Date: 2026-10-15  
Active scope: Next.js web, Django backend/database/APIs, and Expo/React Native.  
Excluded scope: Flutter is legacy and was not inspected, executed, or modified.

## Certification Decision

**Institute Operations P0 is certified for the frozen 65-case catalog.** All 65 unique cases passed with current browser evidence. The executable Institute core pack contains 67 tests; `institute-dashboard-workspace` and `institute-question-bank-workspace` were already counted in Phase 1D, passed again, and are not double-counted.

**The active stack is not production-ready.** P0 is now `221 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`, but seven catalogued P1 Expo flows, live HTTPS staging evidence, and iOS device/simulator compatibility remain open. P0 matrix completion alone is not a release authorization.

## Frozen Inventory

Inventory source: `npm run test:e2e:release:institute-core -- --list`.

| Priority | Passed | Failed | Blocked | Skipped | Not run |
| --- | ---: | ---: | ---: | ---: | ---: |
| P0 Phase 1F.3 unique | 65 | 0 | 0 | 0 | 0 |
| P0 cumulative active stack | 221 | 0 | 0 | 0 | 0 |
| P1 cumulative active stack | 256 | 0 | 0 | 0 | 7 |
| P2 selected | 0 | 0 | 0 | 0 | 0 |

Supporting reruns are excluded from unique catalog totals: two prior Institute cases, five Institute Results cases, three Admin smoke cases, eight browser RBAC cases, and one full mutable examination lifecycle.

## Traceability

| Workstream | Web routes | Primary Django/API surfaces | Persisted models | Browser cases |
| --- | --- | --- | --- | ---: |
| Dashboard, people, academics | `/institute/dashboard`, `/institute/people`, `/institute/academic-setup`, `/institute/teacher-assignments` | `/api/v1/institute/dashboard/summary/`, `/api/v1/students/`, `/api/v1/teachers/`, `/api/v1/teachers/assignments/`, `/api/v1/academics/*` | `Institute`, `StudentProfile`, `TeacherProfile`, `TeacherAssignment`, `AcademicYear`, `Program`, `Cohort`, `Subject`, `Topic` | 8 new + 1 prior |
| Examinations | `/institute/exams`, `/institute/exams/[examId]` | `/api/v1/teacher/exams/`, `/api/v1/exams/*`, Next institute exam proxies | `Exam`, `ExamSection`, `ExamQuestion`, `ExamStudentAssignment` | 4 |
| Question bank | `/institute/question-bank/**` | `/api/v1/question-bank/*`, Next question-bank proxies | `Question`, `QuestionOption`, `QuestionTag`, passage/import records | 12 new + 1 prior |
| Reviews and reports | `/institute/reviews`, `/institute/reports/**` | `/api/v1/results/*`, `/api/v1/reports/*`, teacher analytics summaries | `StudentAnswerReviewTask`, `ExamResult`, `ExamPerformanceSummary`, `StudentTopicPerformance` | 25 |
| Search | `/institute/search` | paged `/api/v1/teacher/exams/`, paged `/api/v1/teacher/results/summary/`, compact question search | Read-only projections of scoped exam/result/question data | 7 |
| Security and settings | `/institute/security`, `/institute/settings` | exam security/runtime summaries, scoped institute and policy reads | `Exam`, access/security policy records, `Institute` | 9 |

The runtime API log and direct authorization probes confirm that the browser and API use institute-scoped data. Anonymous and invalid-token calls returned `401`; student-to-teacher and teacher-create calls returned `403`; an institute administrator received `200` for its own institute and `404` for a foreign institute and foreign student; the institute list contained only its own tenant.

## Individual P0 Outcomes

| Case ID | Frozen expected outcome | Result | Evidence batch |
| --- | --- | --- | --- |
| `INST-P0-001` | Academic setup keeps URL parameters and causes no duplicate browser API traffic | Passed | `institute-core-people-academics` |
| `INST-P0-002` | Dashboard controls hydrate from persisted data | Passed | `institute-core-people-academics` |
| `INST-P0-003` | Dashboard filters apply and reset truthfully | Passed | `institute-core-people-academics` |
| `INST-P0-004` | Dashboard quick filters retain correct scope | Passed | `institute-core-people-academics` |
| `INST-P0-005` | Dashboard priority lanes reflect visible data | Passed | `institute-core-people-academics` |
| `INST-P0-006` | Dashboard summary counts remain internally consistent | Passed | `institute-core-people-academics` |
| `INST-P0-007` | Student and teacher roster exports download as CSV | Passed | `institute-core-people-academics` |
| `INST-P0-008` | People workspace switches rosters and opens create/import handoffs | Passed | `institute-core-people-academics` |
| `INST-P0-009` | Exam detail exposes the scoped core panels | Passed | `institute-exams` |
| `INST-P0-010` | Exam-detail keyboard handoffs reach delivery actions | Passed | `institute-exams` |
| `INST-P0-011` | Exam filters persist through pagination | Passed | `institute-exams` |
| `INST-P0-012` | Exam workspace filters and handoffs remain scoped | Passed | `institute-exams` |
| `INST-P0-013` | Mixed comprehension rows preview with truthful validation | Passed | `institute-question-bank-final` |
| `INST-P0-014` | Comprehension import finalizes and clears preview state | Passed | `institute-question-bank-final` |
| `INST-P0-015` | Question-bank filter controls hydrate | Passed | `institute-question-bank-final` |
| `INST-P0-016` | Program changes hydrate valid subjects and topics | Passed | `institute-question-bank-final` |
| `INST-P0-017` | Academic filter dependencies and reset are truthful | Passed | `institute-question-bank-final` |
| `INST-P0-018` | Empty-state diagnosis is distinct from loaded state | Passed | `institute-question-bank-final` |
| `INST-P0-019` | Shared-library guidance survives filtered views | Passed | `institute-question-bank-final` |
| `INST-P0-020` | Question-create validation remains visible | Passed | `institute-question-bank-final` |
| `INST-P0-021` | Question-create academic dependencies remain valid | Passed | `institute-question-bank-final` |
| `INST-P0-022` | Duplicate-question prefill remains truthful | Passed | `institute-question-bank-final` |
| `INST-P0-023` | Import templates and samples download | Passed | `institute-question-bank-final` |
| `INST-P0-024` | Import guidance and preview guards are enforced | Passed | `institute-question-bank-final` |
| `INST-P0-025` | Review filters and navigation remain institute-scoped | Passed | `institute-reports-hub` |
| `INST-P0-026` | Reports filters preserve parameters without duplicate browser API traffic | Passed | `institute-reports-hub` |
| `INST-P0-027` | Reports filter controls hydrate | Passed | `institute-reports-hub` |
| `INST-P0-028` | Reports filters apply and reset truthfully | Passed | `institute-reports-hub` |
| `INST-P0-029` | Report quick filters remain truthful across lanes | Passed | `institute-reports-hub` |
| `INST-P0-030` | Weak-topic empty state differs from loaded state | Passed | `institute-reports-hub` |
| `INST-P0-031` | Invalid subject filters normalize without breaking report lanes | Passed | `institute-reports-hub` |
| `INST-P0-032` | Report summary counts remain internally consistent | Passed | `institute-reports-hub` |
| `INST-P0-033` | Dedicated report routes are reachable from the hub | Passed | `institute-reports-hub` |
| `INST-P0-034` | Reports hub opens first-wave academic reports | Passed | `institute-reports-hub` |
| `INST-P0-035` | Learner drilldown preserves report-directory context | Passed | `institute-reports-hub` |
| `INST-P0-036` | Subject report counts remain internally consistent | Passed | `institute-report-details` |
| `INST-P0-037` | Learner drilldown handoff is valid from report lanes | Passed | `institute-report-details` |
| `INST-P0-038` | Topic mastery handoffs remain truthful | Passed | `institute-report-details` |
| `INST-P0-039` | Wrong-question counts and handoffs remain truthful | Passed | `institute-report-details` |
| `INST-P0-040` | Time-management counts and handoffs remain truthful | Passed | `institute-report-details` |
| `INST-P0-041` | Rank-history counts and leaderboard handoffs remain truthful | Passed | `institute-report-details` |
| `INST-P0-042` | Study-recommendation rows and learner handoffs remain truthful | Passed | `institute-report-details` |
| `INST-P0-043` | Subject performance report and support lanes validate | Passed | `institute-report-details` |
| `INST-P0-044` | Support-student lane reaches scoped learner detail | Passed | `institute-report-details` |
| `INST-P0-045` | Topic mastery report and recovery lanes validate | Passed | `institute-report-details` |
| `INST-P0-046` | Wrong-questions report and intervention lanes validate | Passed | `institute-report-details` |
| `INST-P0-047` | Time-management report and pacing lanes validate | Passed | `institute-report-details` |
| `INST-P0-048` | Rank-history report and leaderboard handoffs validate | Passed | `institute-report-details` |
| `INST-P0-049` | Study-recommendations report and learner handoffs validate | Passed | `institute-report-details` |
| `INST-P0-050` | Search URL parameters persist without duplicate browser API traffic | Passed | `institute-search-final` |
| `INST-P0-051` | Search controls hydrate | Passed | `institute-search-final` |
| `INST-P0-052` | Search filters apply and reset truthfully | Passed | `institute-search-final` |
| `INST-P0-053` | Search quick filters retain scope | Passed | `institute-search-final` |
| `INST-P0-054` | Search no-results state differs from normal results | Passed | `institute-search-final` |
| `INST-P0-055` | Search summary counts remain internally consistent | Passed | `institute-search-final` |
| `INST-P0-056` | Search handoffs remain safe and scoped | Passed | `institute-search-final` |
| `INST-P0-057` | Security filter controls hydrate | Passed | `institute-security-settings` |
| `INST-P0-058` | Security filters apply and reset truthfully | Passed | `institute-security-settings` |
| `INST-P0-059` | Security quick filters and watch state remain truthful | Passed | `institute-security-settings` |
| `INST-P0-060` | Security exam-empty and watchlist-empty states differ | Passed | `institute-security-settings` |
| `INST-P0-061` | Security summary counts remain internally consistent | Passed | `institute-security-settings` |
| `INST-P0-062` | Security controls and selected-exam watch state remain scoped | Passed | `institute-security-settings` |
| `INST-P0-063` | Settings summary is truthful | Passed | `institute-security-settings` |
| `INST-P0-064` | Settings handoff routes remain valid | Passed | `institute-security-settings` |
| `INST-P0-065` | Settings counts remain internally consistent | Passed | `institute-security-settings` |

## Defects and Resolutions

### IF3-PROD-001: unbounded institute search reads

Classification: confirmed product performance defect, fixed.

The institute search server render called legacy unpaginated `/api/v1/teacher/exams/` and `/api/v1/teacher/results/summary/` endpoints and filtered multi-megabyte payloads in Next.js. Runtime evidence showed approximately `2.52 MB` of exams and `2.93 MB` of summaries on each navigation. The multi-navigation P0 case timed out at 60 seconds.

Resolution:

- search now uses `page_size=8&search=<query>` for exams and result summaries;
- `TeacherResultSummaryView` supports optional scoped search and pagination while preserving the legacy array response when no paging/search parameters are supplied;
- a Django regression proves scoped result-summary paging and no-match behavior;
- the API audit freezes the paginated server-render contract.

Result: focused search passed in `5.3s`; the final seven-case search batch passed in `13.3s`, with recorded transitions of `157-572ms`.

### IF3-AUTO-001: academic fallback helper stopped on an empty valid program

Classification: automation defect, fixed.

Two question-bank cases selected a valid `Class 7 CBSE` program with no subjects. The helper asserted a non-empty subject list before continuing through fallback candidates and repeatedly reselected the same preferred program. The helper now evaluates the API payload, advances through unique candidates when a valid response is empty, and returns the actual selected academic hierarchy. The focused rerun passed `2/2`; the complete question-bank batch passed `13/13`.

### IF3-ENV-001: stale Django test database

Classification: environment artifact, resolved.

The first focused regression invocation stopped before test execution because `test_edutech_db` already existed and the non-interactive runner could not answer the deletion prompt. The supported `--keepdb` rerun passed, followed by the complete post-fix auth/access module at `55/55`.

### IF3-DATA-001: mutable cleanup uses soft deletion

Classification: test-environment hygiene gap; current run cleaned and verified.

The lifecycle helper deactivated the disposable institute but retained child records and orphaned synthetic auth users. A narrowly keyed hard cleanup removed only the current run's `PWFA607781` fixture and four identified synthetic users. Final evidence is zero institute, exam, and user rows for this run. Historical development data still contains `59` `PWFA*` institute rows and `25` `PW-FA-*` exam rows from prior executions; that residue predates this run and should be purged in a dedicated non-production maintenance batch.

## Execution Results

| Batch | Result |
| --- | --- |
| Institute inventory | 67 executable tests in 25 files; 65 new unique cases |
| Dashboard/people/academics | `9/9` passed; 8 new + 1 prior |
| Examinations | `4/4` passed |
| Question bank final | `13/13` passed; 12 new + 1 prior |
| Reviews/reports hub | `11/11` passed |
| Report detail routes | `14/14` passed |
| Search final | `7/7` passed |
| Security/settings | `9/9` passed |
| Backend institute identity/roster | `66/66` passed |
| Backend academics/bootstrap | `21/21` passed |
| Backend exams/attempts | `120/120` passed |
| Backend question bank | `93/93` passed |
| Backend results/reports | `25/25` passed |
| Post-fix auth/access regression | `55/55` passed |
| Direct live API authorization probes | All expected status/scope checks passed |
| Admin regression smoke | `3/3` passed |
| Institute Results regression | `5/5` passed |
| Cross-role browser RBAC | `8/8` passed |
| Mutable exam lifecycle | `1/1` passed |
| Web typecheck | Passed |
| Web production build | Passed; 153 static pages generated |
| Django system check | Passed; no issues |

The mutable lifecycle reconfirmed draft, unassigned, inactive-assignment, future-window, and expired-window denial; valid start; question loading; answer persistence; navigation; refresh/relogin recovery; final submission; duplicate-submit rejection; exact score `2.00`; result generation/ranking/publication; student result visibility; unauthorized teacher, cross-student, cross-institute, and anonymous denial.

## Files Changed

Product and API:

- `edutech_backend/apps/accounts/views/__init__.py`
- `edutech_web/src/lib/api/teacher.ts`
- `edutech_web/src/lib/workspace/live-search.ts`

Regression and automation:

- `edutech_backend/apps/accounts/tests/test_auth_access.py`
- `edutech_web/tests/e2e/helpers/question-bank-academics.ts`
- `edutech_web/tests/e2e/workflow/institute-question-bank-browser-coverage.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-search-api-audit.spec.ts`

Certification documentation:

- `docs/qa/04-master-qa-coverage-matrix.md`
- `docs/qa/14-phase1f3-institute-operations-p0-certification.md`

No Flutter file was touched.

## Evidence

Logs and structured evidence:

- `docs/qa/evidence/phase1f3/playwright-institute-core-inventory.log`
- `docs/qa/evidence/phase1f3/playwright-institute-core-people-academics.log`
- `docs/qa/evidence/phase1f3/playwright-institute-exams.log`
- `docs/qa/evidence/phase1f3/playwright-institute-question-bank-final.log`
- `docs/qa/evidence/phase1f3/playwright-institute-reports-hub.log`
- `docs/qa/evidence/phase1f3/playwright-institute-report-details.log`
- `docs/qa/evidence/phase1f3/playwright-institute-search-final.log`
- `docs/qa/evidence/phase1f3/playwright-institute-security-settings.log`
- `docs/qa/evidence/phase1f3/live-api-authorization-evidence.json`
- `docs/qa/evidence/phase1f3/live-api-foreign-student-evidence.json`
- `docs/qa/evidence/phase1f3/database-integrity-cleanup-evidence.json`
- `docs/qa/evidence/phase1f3/current-run-final-zero-residue.json`
- `docs/qa/evidence/phase1f3/artifact-sha256.txt`

Browser screenshots, JSON attachments, and traces:

- `edutech_web/test-results/phase1f3-institute-core-people-academics/`
- `edutech_web/test-results/phase1f3-institute-exams/`
- `edutech_web/test-results/phase1f3-institute-question-bank-final/`
- `edutech_web/test-results/phase1f3-institute-reports-hub/`
- `edutech_web/test-results/phase1f3-institute-report-details/`
- `edutech_web/test-results/phase1f3-institute-search-final/`
- `edutech_web/test-results/phase1f3-institute-security-settings/`
- `edutech_web/test-results/phase1f3-exam-lifecycle-regression/`
- `edutech_web/test-results/phase1f3-cross-role-rbac/`
- `edutech_web/test-results/phase1f3-institute-results-regression/`
- `edutech_web/test-results/phase1f3-admin-regression-smoke/`

Credentials and access tokens are excluded from report text and summary JSON. Demo passwords were redacted from the setup log. Playwright traces contain ephemeral synthetic-session state and must remain access-controlled.

## Remaining Risks and Next Phase

1. Execute the seven remaining Expo Maestro flows: exam detail, results, result timeline, review, review pagination, active attempt, and analytics/logout.
2. Execute the mobile release build against an isolated HTTPS staging API and retain TLS/request evidence.
3. Execute iOS simulator/device compatibility for the claimed mobile release scope.
4. Purge historical `PWFA*` development fixtures through a reviewed non-production maintenance procedure, then add deterministic fixture cleanup around future mutable packs.
5. Run final cross-browser, accessibility, and performance certification after the mobile release gates close.

Recommended next phase: **Phase 1G active-stack release-gate closure**, led by Expo device flows, HTTPS staging, iOS compatibility, then final cross-browser/accessibility/performance regression. Production readiness remains withheld.
