# Master QA Coverage Matrix

This matrix separates source/test existence from execution evidence.

Current active certification scope: Next.js web, Django API/database, integrations, and Expo/React Native mobile. Flutter is legacy and out of scope; historical Flutter evidence below is retained for audit continuity but excluded from current coverage totals, recommendations, and readiness decisions.

## Evidence Summary

| Evidence type | Count/status | Notes |
| --- | --- | --- |
| Web page routes | 125 | From `edutech_web/src/app/**/page.tsx` |
| Next API routes | 93 | From `edutech_web/src/app/api/**/route.ts` |
| Playwright spec files | 440 | From `edutech_web/tests/e2e/**/*.spec.ts` |
| Backend model modules | 13 | From `edutech_backend/apps/*/models.py` |
| Backend app URL modules | 13+ | Phase 1A verified URL packages at `edutech_backend/apps/*/urls/__init__.py`; Phase 0 flat-file search was incomplete |
| Backend app view/serializer modules | 13+ | Phase 1A verified view/serializer packages at `edutech_backend/apps/*/views/__init__.py` and `serializers/__init__.py` |
| Current focused Playwright lifecycle run | Passed | Phase 1C trace-enabled run: 1 passed; exact score `2.00`, result publication and focused browser/API isolation verified |
| Backend P0 exam/access pack | Passed | Phase 1C focused Django test pack: 10 passed |
| Global TypeScript check | Passed | All 73 Playwright-source errors fixed without suppression; route type generation and `tsc --noEmit` pass |
| Next.js production build | Passed | Optimized build completed and generated 153 static pages |
| Backend route smoke | Passed with caveats | URL resolver imports and controlled requests passed; schema endpoint returns 200 with drf-spectacular warnings |
| Backend system check | Passed | `manage.py check`; route importability separately verified in Phase 1A |
| Full recursive repository audit | Completed | `docs/qa/08-full-repository-recursive-audit.md`; 5,785 audited source files, 125 Next pages, 93 API route handlers, 440 Playwright specs |
| Backend controlled recursive batches | Passed | Prior 171/162/63 batches retained; Phase 1C broad accounts/exams/attempts/results discovery now passes 266 tests |
| Operator P0 browser packs | Passed | Admin `56/56`, Institute Results `5/5`, and Institute Operations `65/65` unique cases pass; regression invocations are not double-counted |
| Phase 1F.3 backend/API support | Passed | Five focused batches `325/325`, post-fix auth/access `55/55`, direct live authorization probes passed |
| Active mobile static/device check | Android functional pass; release blocked | Seven frozen Maestro P1 flows retain Android 15/API 35 debug evidence. Phase 1H builds an unsigned HTTPS-configured release safely, but package identity, authorized signing, attached release device, iOS, accessibility, performance, and active-attempt restart remain open |

## Coverage Matrix

| Module | Source coverage | Test source coverage | Current execution evidence | Status | Priority |
| --- | --- | --- | --- | --- | --- |
| Auth/session/profile | Web/mobile/backend source present | registration/auth specs and backend tests present | Protected endpoint rejection, role logins, post-fix auth/access `55/55`, and operator role packs pass | Verified for selected P0 role/session contracts | P0 |
| Role access/data isolation | Permission/scope helpers present | `role-scope/access-control.spec.ts`, backend auth tests | Phase 1H HTTPS browser RBAC `8/8`, direct four-role API authorization, and distinct-tenant read concealment pass; prior lifecycle isolation and scoped packs retained | Verified for frozen P0 catalog and selected HTTPS stage boundaries | P0 |
| Platform admin dashboard | Pages/components present | admin workspace/API audit specs | Phase 1F.2 Admin unique pack `56/56`; Phase 1F.3 smoke `3/3` | Verified for frozen Admin P0 catalog | P1 |
| Institute onboarding | Pages/components/models present | many onboarding mutable specs | Full-access lifecycle creates/provisions/uses an isolated institute; Admin institute workflows pass | Partial: core lifecycle verified, broader onboarding variants remain | P0 |
| People/roster | Admin/institute pages and components present | roster/import mutable specs | Admin and Institute people workspaces, scoped APIs, and roster CSV exports pass | Verified for frozen operator P0 catalog | P1 |
| Academics setup | Models/pages/components present | academics API/workspace/mutable specs | Admin and Institute academic setup contracts pass; backend academics/bootstrap `21/21` | Verified for frozen operator P0 catalog | P1 |
| Teacher assignment | Components/routes present | teacher assignment specs | Backend identity/roster pack and lifecycle provisioning pass; dedicated mutable assignment pack was not rerun in Phase 1F.3 | Partial | P1 |
| Question bank CRUD | Models/pages/components present | question bank workspace/mutable/import specs | Institute core `13/13` executable question-bank cases and backend `93/93` pass, including import finalization | Verified for frozen Institute P0 catalog; broader mutable CRUD remains P1 | P0 |
| Shared/master library | Models/components/routes present | shared library entitlement/link specs | Not found current passing | Not Verified | P1 |
| Exam builder | Models/pages/components present | builder/workspace/mutable specs | Institute exam pack `4/4` plus full advanced-builder lifecycle pass | Verified for frozen P0 workflow | P0 |
| Exam assignment/publish/visibility | Models/pages/components present | lifecycle/policy/assignment specs | Frozen local composite and Institute packs pass, but Phase 1H deployed stage returns 200 for assigned draft detail because stage lacks the current status filter | Frozen P0 evidence retained; HTTPS release candidate failed | P0 |
| Student exam discovery/detail | Student pages and API clients present | student exam workspace/mutable specs | Student core `26/26`; assigned, draft, unassigned, inactive, window, and cross-institute paths pass | Focused web verified; broader release inventory remains | P0 |
| Attempt runtime | Models/pages/mobile screen present | attempt runtime/mutable specs | Browser lifecycle remains passed; Android Attempts lane, 325-row incremental history, results/summary/review navigation, and empty-active state pass | Partial: active mobile attempt restart/save/submit remains not verified | P0 |
| Integrity/artifacts | Models/proxy routes/components present | attempt security/artifact specs implied | Not found current passing | Not Verified | P1 |
| Manual review | Review models/pages present | review workspace/mutable specs | Institute review workspace and backend results/reports pack pass | Partial: read/navigation verified; broader mutation variants remain | P1 |
| Results | Models/pages/components present | result workspace/mutable/contract specs | Exact `2.00` score lifecycle, teacher results contract, and Institute Results `5/5` pack pass | Focused lifecycle and teacher/institute result packs verified; student `?exam=` filter remains P1 | P0 |
| Reports/analytics | Models/pages/components present | reports/analytics/timing/visual specs | Institute report hub/detail `24/24`, Admin reports, Institute Results `5/5`, and backend reports pass | Verified for frozen operator P0 catalog; performance remains separate | P1 |
| Notifications | Models/pages/components present | notification specs present | Not found current passing | Not Verified | P1 |
| Parent portal | Models/pages/components present | backend parent tests present | Phase 1D selected parent browser/mobile pack `3/3` | Partial: selected pack verified | P1 |
| Economy/wallet/subscriptions | Large model set/pages/components present | economy API/mutable specs present | Admin economy P0 batch passed and smoke remains green | Partial: Admin governance verified; student/mobile economy remains P1 | P1 |
| Search | Role search pages present | browser/API search specs present | Teacher, Admin, and Institute search packs pass; Institute bounded-search regression closes multi-megabyte timeout | Verified for frozen operator catalog; broader performance gate remains | P2 |
| Security/settings UI | Pages present | security/settings specs present | Admin and Institute security/settings browser and API contracts pass | Verified for frozen operator P0 catalog | P1 |
| Student mobile app | Expo source present | Maestro flows and stable `EXPO-P1-001..007` IDs present | Frozen Android pack `7/7` retained; Phase 1H typecheck, HTTPS release policy `5/5`, clean prebuild, unsigned assembly, manifest and endpoint inspection pass | Functional debug pack verified; signed HTTPS device, package identity, iOS, accessibility, performance, and active-attempt restart remain | P1 |
| Marketing/static pages | Source present | No current evidence | Not applicable for core launch | Placeholder/Mock | P2 |
| Backend API importability | Config references package-style includes | Some backend tests present | Phase 1A resolver/request smoke verified route modules import | False positive resolved; schema warnings remain P1 | P1 |
| Flutter frontend | Legacy tree retained | Historical tests exist | Historical Phase 1 static evidence retained only | Legacy / out of active scope | N/A |
| Expo student mobile | `nexora_student_mobile/app` and `src` with auth/student/attempt flows | Maestro scripts and release-policy tests present | Typecheck, frozen Android pack `7/7`, HTTPS-only config validation, unsigned release assembly, no app-owned local API endpoint, release cleartext denial, and backup/permission checks pass | Partial: authorized signing/package identity and release-device HTTPS are blocked; iOS remains unexecuted | P1 |
| Performance/load | k6 student session/discovery/runtime/results/analytics scripts | k6 scripts present | Not run | Not Verified | P2 |
| Nested mirrored repo | `edutech/` duplicate tree with own `.git` | N/A | Inventory only | Repository-shape risk | P2 |

## Phase 1A Verification Update

| P0 finding | Phase 1A classification | Evidence | Remaining priority |
| --- | --- | --- | --- |
| Django route/API-source mismatch | False positive for missing URL/view source | `config/urls.py` includes package modules under `edutech_backend/apps/*/urls/__init__.py`; resolver import and request smoke passed | P1 for OpenAPI schema warnings and test-client `ALLOWED_HOSTS` nuance |
| Institute selected-student exam not visible | Confirmed test fixture defect, fixed | Admin roster creation now carries `institute=<id>` for teacher/student provisioning | P0 regression covered by focused lifecycle |
| Published exam unavailable/start disabled | Confirmed test workflow defect, fixed | Advanced builder now sets start/end window; publish helper polls persisted `/api/institute/exams/:id` status | P0 regression covered by focused lifecycle |
| Disposable lifecycle data cleanup | Confirmed test hygiene defect, fixed | Focused spec restores admin session before cleanup; final warm run showed admin delete returning 200 | P1 hygiene gate now covered for this spec |
| Playwright trace artifact capture | Unresolved tooling/harness issue | `--trace on` run reached attempt/save state but failed with `file data stream has unexpected number of bytes`; `--trace off` passed | P1/P0-adjacent evidence capture blocker for certification packaging |

## Phase 1B Verification Update

| P0 finding | Phase 1B classification | Evidence | Remaining priority |
| --- | --- | --- | --- |
| Draft/unpublished student exam visibility | Confirmed product defect, fixed | `StudentAvailableExamView`, `StudentExamDetailView`, and access-key resolve now require status in `scheduled/live/completed`; backend regression added | Closed for backend P0 pack |
| Inactive selected-student assignment | Verified | Backend regression confirms inactive assignment hides list/detail and blocks start | Closed for backend P0 pack |
| Future/expired schedule enforcement | Verified | Existing backend access test passed in Phase 1B pack | Closed for backend P0 pack |
| Student/teacher data isolation | Verified at backend API layer | Backend tests passed for student attempt/result isolation and teacher institute scoping | Browser negative matrix still P0 |
| Browser evidence packaging | Fixed | Trace-enabled runs now produce `.last-run.json`, screenshots, `error-context.md`, CSV, and `trace.zip` under `edutech_web/test-results/phase1b-*` | Closed for focused runs |
| Browser exam lifecycle submit/results | Confirmed blocker | Latest trace-enabled run `phase1b-20261014182022` failed because published result score was `1` after two known-correct browser saves | P0 |
| Global TypeScript health | Confirmed harness blocker | `npm run typecheck -- --pretty false` reports 73 errors in existing specs | P1/P0-adjacent |

## Full Recursive Audit Update

| Area | Result | Evidence | Priority |
| --- | --- | --- | --- |
| Repository inventory | Completed | 5,785 source/config/doc files after excluding generated/dependency/VCS output | P0 |
| Backend app batches | Passed | 171 + 162 + 63 tests passed in controlled explicit-module batches | P0 |
| Backend broad app-label discovery | Resolved in Phase 1C | Historical collision reproduced; legacy module moved into package and broad 266-test rerun passes | Closed |
| Web static/type gate | Passed in Phase 1C | All 73 errors fixed; typecheck and optimized production build pass | P1 |
| Expo student mobile static gate | Passed | `npm run typecheck` | P1 |
| Flutter static gate | Historical only | Legacy/out of active scope; excluded from active totals | N/A |
| Browser certification | Focused path passed in Phase 1C | Exact score and selected isolation checks passed; three state-parity browser cases remain | P0 |

## Phase 1C Active-Stack Stabilization Update

| Finding | Classification | Current evidence | Remaining priority |
| --- | --- | --- | --- |
| Browser score mismatch | Test synchronization defect, fixed | Final attempt contains two distinct correct answers at `1.00` each; attempt/result score is `2.00` | Closed for focused path |
| Backend scoring defect | False positive | Persisted one-answer Phase 1B state correctly produced `1.00`; deterministic two-answer run correctly produced `2.00` | None |
| Cross-institute/cross-student access | Verified in focused API and browser paths | Exam/attempt return 404, target result absent, target UI content absent | Closed for focused path |
| Unauthorized teacher/anonymous access | Verified in focused API and browser paths | Teacher exam 404/UI absent; anonymous attempt detail 401 | Closed for focused path |
| Draft and unassigned exam access | Verified in API and browser | Detail/start denied before publication and for same-institute unassigned learner | Closed for focused path |
| Inactive/future/expired access | Backend verified; browser parity not run | Focused Django cases pass | P0 |
| Web TypeScript errors | Confirmed test-source defects, fixed | 73 to 0; no suppressions/exclusions | Closed |
| Django `apps.exams.tests` collision | Confirmed test architecture defect, fixed | Legacy module moved into tests package; 11 focused and 266 broad tests pass | Closed |
| Expo active mobile | Static-only verified | `tsc --noEmit` passes | P0 device-flow evidence remains |
| Student result `exam` filter | Confirmed API contract gap | Ownership isolation passes, but `?exam=` does not narrow the collection | P1 |
| Attempt hydration and builder key warnings | Confirmed runtime warnings | Captured during successful lifecycle | P1 |

Phase 1C final unique case counts: P0 `11 passed / 0 failed / 0 blocked / 0 skipped / 3 not run`; P1 `256 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`; P2 `0` selected. See `docs/qa/09-active-stack-p0-stabilization.md` for command history and evidence paths.

## Phase 1D Active-Stack Certification Update

| Finding | Classification | Current evidence | Remaining priority |
| --- | --- | --- | --- |
| Inactive selected-student assignment | Verified across persistence, API, and browser | Assignment persisted inactive; detail `404`; start `400/not_assigned`; browser cannot enter exam | Closed |
| Future exam window | Verified across persistence, API, and browser | Active assignment plus scheduled future window; detail/start `before_window`; disabled browser action | Closed |
| Expired exam window | Verified across persistence, API, and browser | Active assignment plus live elapsed window; detail/start `after_window`; disabled browser action | Closed |
| Student web core release pack | Failed | Production-server run: 20 passed, 6 failed of 26; traces retained | P0 |
| Expo Android device gate | Failed | Release APK built/installed; Maestro reached login, but release Android rejected the local cleartext HTTP API; dependent flows were not run | P0 |
| Cross-role browser smoke | Partial | Admin 2/2, institute 2/2, parent 3/3, and selected student smoke passed; teacher results refresh contract failed | P0 |
| Remaining operator core packs | Inventory verified, not executed | Admin 56, institute 65, institute results 5, teacher 45 cases remain | P0 |
| Score/result/duplicate submission | Prior passing evidence preserved | Phase 1C exact score `2.00`, published result, and duplicate rejection remain unchanged | Closed for focused path; final composite rerun remains |

Phase 1D cumulative unique case counts: P0 `41 passed / 8 failed / 0 blocked / 0 skipped / 171 not run`; P1 `256 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`; P2 `0` selected. Counts treat the three explicit state-parity scenarios as separate certification cases, count the retried Maestro login/exams flow once, and avoid recounting the three student smoke cases already present in student core. See `docs/qa/10-phase1d-active-stack-p0-certification.md` for classifications and evidence paths.

## Phase 1E Active-Stack Stabilization Update

| Finding | Classification | Current evidence | Remaining priority |
| --- | --- | --- | --- |
| Six student web failures | Environment/resource contention, closed | Isolated `6/6` and complete student core `26/26` pass with traces | Closed for Chromium role pack |
| Teacher results URL contract | Automation synchronization/contract defect, fixed | Focused pass plus pass inside teacher core; reset, refresh redirect, deep link, and reload verified | Closed |
| Android local API connectivity | Test-environment configuration plus product payload defect, fixed for debug | Debug-only `10.0.2.2` policy, clean prebuild/build, compact attempt endpoint, API 35 Maestro pass | P1 for remaining flows and live HTTPS/iOS |
| Mobile attempt-list payload | Confirmed backend/mobile contract defect, fixed | 474 scoped summaries: `141,783` bytes in `0.119s`; regression excludes nested detail data | Closed for list contract |
| Composite lifecycle start synchronization | Automation defect, fixed | Final `1/1` trace passes exact server-action redirect and complete lifecycle | Closed |
| Teacher search quick filters | Confirmed UI navigation defect, fixed | Native query anchors; focused `2/2` pass with URL/control assertions | P1 performance follow-up |
| Teacher core expansion | Passed after focused repair | Final unique `46/46`; 45 previously unexecuted cases added | Closed for Chromium role pack |
| Remaining operator packs | Not run | Admin `56`, institute `65`, institute-results `5` | P0 |

Phase 1E cumulative unique active-stack counts: P0 `95 passed / 0 failed / 0 blocked / 0 skipped / 126 not run`; P1 `256 passed / 0 failed / 0 blocked / 0 skipped / 7 not run`; P2 `0` selected. The new P0 catalog entry is the compact-attempt isolation regression. The seven P1 not-run cases are the dependent Expo flows that were previously described but not enumerated in the count table. See `docs/qa/11-phase1e-active-stack-stabilization.md` for root causes, execution logs, and exact evidence paths.

## Phase 1F.1 Institute Results Certification Update

| Case ID | Executable source | Result | Evidence focus |
| --- | --- | --- | --- |
| `IR-P0-001` | `institute-results-workspace.spec.ts` | Passed | Overview filters/grouping/reset, readiness, and workflow navigation |
| `IR-P0-002` | `institute-results-analysis-workspace.spec.ts` | Passed | Question-risk filters, learner evidence, question bank and builder handoffs |
| `IR-P0-003` | `institute-results-live-workspace.spec.ts` | Passed | Refresh controls and scoped attempt drill/empty state |
| `IR-P0-004` | `institute-results-leaderboard-workspace.spec.ts` | Passed | Rank/publication metrics, pagination, and cross-view navigation |
| `IR-P0-005` | `institute-results-attempts-workspace.spec.ts` | Passed | Attempt filters/grouping/reset and scoped detail/empty state |

Final Phase 1F.1 workstream count: P0 `5 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`. Cumulative active-stack counts: P0 `100 passed / 0 failed / 0 blocked / 0 skipped / 121 not run`; P1 `256 passed / 0 failed / 0 blocked / 0 skipped / 7 not run`; P2 `0` selected. The remaining P0 inventory is Admin `56` and Institute Operations `65`.

Supporting evidence, not additional unique catalog cases: focused Django/API/database `5/5`, browser role guards `7/7`, web typecheck passed, and Django system check passed. No product defect was reproduced and no application source changed. See `docs/qa/12-phase1f1-institute-results-certification.md`.

## Phase 1F.2 Admin P0 Certification Update

The frozen Admin release command contains `58` executable tests. `admin-dashboard-workspace` and `admin-economy-workspace` were already counted in Phase 1D, so the remaining unique Phase 1F.2 inventory is exactly `56`. All 58 executable invocations passed; the two prior cases remain regression evidence and are not counted twice.

| Case ID | Case | Result | Evidence batch |
| --- | --- | --- | --- |
| `ADM-P0-001` | Academic setup API parameter/traffic contract | Passed | `phase1f2-admin-core-directory` |
| `ADM-P0-002` | Academic setup section/default workflow | Passed | `phase1f2-admin-core-directory` |
| `ADM-P0-003` | Dashboard API/filter contract | Passed | `phase1f2-admin-core-directory` |
| `ADM-P0-004` | Institute selection/cache API contract | Passed | `phase1f2-admin-core-directory` |
| `ADM-P0-005` | Institute directory/detail/modal workflow | Passed | `phase1f2-admin-core-directory` |
| `ADM-P0-006` | People scoped-request contract | Passed | `phase1f2-admin-core-directory` |
| `ADM-P0-007` | Student/teacher roster and CSV export | Passed | `phase1f2-admin-core-directory` |
| `ADM-P0-008` | Economy support API/student scope | Passed | `phase1f2-admin-economy` |
| `ADM-P0-009` | Economy overview/operator framing | Passed | `phase1f2-admin-economy` |
| `ADM-P0-010` | Economy filter hydration across lanes | Passed | `phase1f2-admin-economy` |
| `ADM-P0-011` | Economy filter apply/reset | Passed | `phase1f2-admin-economy` |
| `ADM-P0-012` | Economy scope reload/revisit persistence | Passed | `phase1f2-admin-economy` |
| `ADM-P0-013` | Economy support/question-bank counts | Passed | `phase1f2-admin-economy` |
| `ADM-P0-014` | Economy catalog governance controls | Passed | `phase1f2-admin-economy` |
| `ADM-P0-015` | Access policy/unlock/policy controls | Passed | `phase1f2-admin-economy` |
| `ADM-P0-016` | Mutable policy persistence and restore | Passed | `phase1f2-admin-economy` |
| `ADM-P0-017` | Package/visibility/subscription operations | Passed | `phase1f2-admin-economy` |
| `ADM-P0-018` | Support queue/student support tools | Passed | `phase1f2-admin-economy` |
| `ADM-P0-019` | Economy bootstrap guidance | Passed | `phase1f2-admin-economy` |
| `ADM-P0-020` | Exam detail/non-mutating handoffs | Passed | `phase1f2-admin-exams` |
| `ADM-P0-021` | Exam control hydration | Passed | `phase1f2-admin-exams` |
| `ADM-P0-022` | Exam filter apply/reset | Passed | `phase1f2-admin-exams` |
| `ADM-P0-023` | Exam quick filters | Passed | `phase1f2-admin-exams` |
| `ADM-P0-024` | Exam empty-state distinction | Passed | `phase1f2-admin-exams` |
| `ADM-P0-025` | Exam summary-count consistency | Passed | `phase1f2-admin-exams` |
| `ADM-P0-026` | Create-exam wizard traversal | Passed | `phase1f2-admin-exams` |
| `ADM-P0-027` | Exam filters/detail/builder handoffs | Passed | `phase1f2-admin-exams` |
| `ADM-P0-028` | Reports API/filter contract | Passed | `phase1f2-admin-reports` |
| `ADM-P0-029` | Report control hydration | Passed | `phase1f2-admin-reports` |
| `ADM-P0-030` | Report filter apply/reset | Passed | `phase1f2-admin-reports` |
| `ADM-P0-031` | Report quick filters across lanes | Passed | `phase1f2-admin-reports` |
| `ADM-P0-032` | Weak-topic empty-state distinction | Passed | `phase1f2-admin-reports` |
| `ADM-P0-033` | Report summary-count consistency | Passed | `phase1f2-admin-reports` |
| `ADM-P0-034` | Runtime-scope statistic alignment | Passed | `phase1f2-admin-reports` |
| `ADM-P0-035` | Reports filtering/navigation | Passed | `phase1f2-admin-reports` |
| `ADM-P0-036` | Search API/query contract | Passed | `phase1f2-admin-search` |
| `ADM-P0-037` | Search control hydration | Passed | `phase1f2-admin-search` |
| `ADM-P0-038` | Search filter apply/reset | Passed | `phase1f2-admin-search` |
| `ADM-P0-039` | Search quick-filter truthfulness | Passed | `phase1f2-admin-search` |
| `ADM-P0-040` | Search no-result distinction | Passed | `phase1f2-admin-search` |
| `ADM-P0-041` | Search summary-count consistency | Passed | `phase1f2-admin-search` |
| `ADM-P0-042` | Search handoff workflow | Passed | `phase1f2-admin-search` |
| `ADM-P0-043` | Security API/filter/watch contract | Passed | `phase1f2-admin-security` |
| `ADM-P0-044` | Security control hydration | Passed | `phase1f2-admin-security` |
| `ADM-P0-045` | Security filter apply/reset | Passed | `phase1f2-admin-security` |
| `ADM-P0-046` | Security quick filters/watch context | Passed | `phase1f2-admin-security` |
| `ADM-P0-047` | Security empty-state distinctions | Passed | `phase1f2-admin-security` |
| `ADM-P0-048` | Security summary-count consistency | Passed | `phase1f2-admin-security` |
| `ADM-P0-049` | Security controls/watch workflow | Passed | `phase1f2-admin-security` |
| `ADM-P0-050` | Settings API/handoff contract | Passed | `phase1f2-admin-settings` |
| `ADM-P0-051` | Settings governance summary | Passed | `phase1f2-admin-settings` |
| `ADM-P0-052` | Settings economy policy visibility | Passed | `phase1f2-admin-settings` |
| `ADM-P0-053` | Settings route handoffs | Passed | `phase1f2-admin-settings` |
| `ADM-P0-054` | Settings institute footprint rows | Passed | `phase1f2-admin-settings` |
| `ADM-P0-055` | Settings institute-count consistency | Passed | `phase1f2-admin-settings` |
| `ADM-P0-056` | Settings summary/governance workflow | Passed | `phase1f2-admin-settings` |

Final Phase 1F.2 unique workstream count: P0 `56 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`. Cumulative active-stack counts: P0 `156 passed / 0 failed / 0 blocked / 0 skipped / 65 not run`; P1 `256 passed / 0 failed / 0 blocked / 0 skipped / 7 not run`; P2 `0` selected. The remaining P0 inventory is Institute Operations `65`.

Supporting evidence, not additional unique catalog cases: frozen Admin pack `58/58`, Django/API batches `347/347`, expanded browser role guards `8/8`, Institute Results regression `5/5`, web typecheck passed, and Django system check passed. No application defect was reproduced. See `docs/qa/13-phase1f2-admin-p0-certification.md` and `docs/qa/evidence/phase1f2/`.

## Phase 1F.3 Institute Operations P0 Certification Update

The frozen Institute core command contains `67` executable tests. `institute-dashboard-workspace` and `institute-question-bank-workspace` were already counted in Phase 1D, so the unique Phase 1F.3 inventory is exactly `65`. All 67 executable invocations passed after fixes; the two prior cases are regression evidence and are not counted twice.

| Case ID | Case | Result | Evidence batch |
| --- | --- | --- | --- |
| `INST-P0-001` | Academic setup parameter/traffic contract | Passed | `phase1f3-institute-core-people-academics` |
| `INST-P0-002` | Dashboard control hydration | Passed | `phase1f3-institute-core-people-academics` |
| `INST-P0-003` | Dashboard filter apply/reset | Passed | `phase1f3-institute-core-people-academics` |
| `INST-P0-004` | Dashboard quick-filter scope | Passed | `phase1f3-institute-core-people-academics` |
| `INST-P0-005` | Dashboard priority-lane truth | Passed | `phase1f3-institute-core-people-academics` |
| `INST-P0-006` | Dashboard summary-count consistency | Passed | `phase1f3-institute-core-people-academics` |
| `INST-P0-007` | Student/teacher roster CSV export | Passed | `phase1f3-institute-core-people-academics` |
| `INST-P0-008` | People roster/create/import handoffs | Passed | `phase1f3-institute-core-people-academics` |
| `INST-P0-009` | Exam-detail core panels | Passed | `phase1f3-institute-exams` |
| `INST-P0-010` | Exam-detail keyboard/delivery handoffs | Passed | `phase1f3-institute-exams` |
| `INST-P0-011` | Exam filter pagination persistence | Passed | `phase1f3-institute-exams` |
| `INST-P0-012` | Exam filters and workspace handoffs | Passed | `phase1f3-institute-exams` |
| `INST-P0-013` | Comprehension mixed-row preview | Passed | `phase1f3-institute-question-bank-final` |
| `INST-P0-014` | Comprehension finalization/preview cleanup | Passed | `phase1f3-institute-question-bank-final` |
| `INST-P0-015` | Question-bank filter hydration | Passed | `phase1f3-institute-question-bank-final` |
| `INST-P0-016` | Subject/topic dependency hydration | Passed | `phase1f3-institute-question-bank-final` |
| `INST-P0-017` | Academic dependency/reset truth | Passed | `phase1f3-institute-question-bank-final` |
| `INST-P0-018` | Question-bank empty-state distinction | Passed | `phase1f3-institute-question-bank-final` |
| `INST-P0-019` | Shared-library guidance under filters | Passed | `phase1f3-institute-question-bank-final` |
| `INST-P0-020` | Question-create validation | Passed | `phase1f3-institute-question-bank-final` |
| `INST-P0-021` | Question-create academic dependencies | Passed | `phase1f3-institute-question-bank-final` |
| `INST-P0-022` | Duplicate-question prefill | Passed | `phase1f3-institute-question-bank-final` |
| `INST-P0-023` | Import templates/sample downloads | Passed | `phase1f3-institute-question-bank-final` |
| `INST-P0-024` | Import guidance/preview guards | Passed | `phase1f3-institute-question-bank-final` |
| `INST-P0-025` | Review filters/navigation | Passed | `phase1f3-institute-reports-hub` |
| `INST-P0-026` | Reports parameter/traffic contract | Passed | `phase1f3-institute-reports-hub` |
| `INST-P0-027` | Reports control hydration | Passed | `phase1f3-institute-reports-hub` |
| `INST-P0-028` | Reports filter apply/reset | Passed | `phase1f3-institute-reports-hub` |
| `INST-P0-029` | Reports quick filters across lanes | Passed | `phase1f3-institute-reports-hub` |
| `INST-P0-030` | Weak-topic empty-state distinction | Passed | `phase1f3-institute-reports-hub` |
| `INST-P0-031` | Invalid-subject normalization | Passed | `phase1f3-institute-reports-hub` |
| `INST-P0-032` | Reports summary-count consistency | Passed | `phase1f3-institute-reports-hub` |
| `INST-P0-033` | Dedicated report route reachability | Passed | `phase1f3-institute-reports-hub` |
| `INST-P0-034` | Reports hub/first-wave report pages | Passed | `phase1f3-institute-reports-hub` |
| `INST-P0-035` | Learner drilldown context persistence | Passed | `phase1f3-institute-reports-hub` |
| `INST-P0-036` | Subject report count consistency | Passed | `phase1f3-institute-report-details` |
| `INST-P0-037` | Learner report handoff | Passed | `phase1f3-institute-report-details` |
| `INST-P0-038` | Topic-mastery handoffs | Passed | `phase1f3-institute-report-details` |
| `INST-P0-039` | Wrong-question counts/handoffs | Passed | `phase1f3-institute-report-details` |
| `INST-P0-040` | Time-management counts/handoffs | Passed | `phase1f3-institute-report-details` |
| `INST-P0-041` | Rank-history counts/leaderboard handoffs | Passed | `phase1f3-institute-report-details` |
| `INST-P0-042` | Study-recommendation rows/handoffs | Passed | `phase1f3-institute-report-details` |
| `INST-P0-043` | Subject report/support lanes | Passed | `phase1f3-institute-report-details` |
| `INST-P0-044` | Support-student learner drilldown | Passed | `phase1f3-institute-report-details` |
| `INST-P0-045` | Topic-mastery recovery lanes | Passed | `phase1f3-institute-report-details` |
| `INST-P0-046` | Wrong-question intervention lanes | Passed | `phase1f3-institute-report-details` |
| `INST-P0-047` | Time-management pacing lanes | Passed | `phase1f3-institute-report-details` |
| `INST-P0-048` | Rank-history leaderboard workflow | Passed | `phase1f3-institute-report-details` |
| `INST-P0-049` | Study-recommendation learner workflow | Passed | `phase1f3-institute-report-details` |
| `INST-P0-050` | Search parameter/traffic contract | Passed | `phase1f3-institute-search-final` |
| `INST-P0-051` | Search control hydration | Passed | `phase1f3-institute-search-final` |
| `INST-P0-052` | Search filter apply/reset | Passed | `phase1f3-institute-search-final` |
| `INST-P0-053` | Search quick-filter scope | Passed | `phase1f3-institute-search-final` |
| `INST-P0-054` | Search no-result distinction | Passed | `phase1f3-institute-search-final` |
| `INST-P0-055` | Search summary-count consistency | Passed | `phase1f3-institute-search-final` |
| `INST-P0-056` | Search grouped/scoped handoffs | Passed | `phase1f3-institute-search-final` |
| `INST-P0-057` | Security control hydration | Passed | `phase1f3-institute-security-settings` |
| `INST-P0-058` | Security filter apply/reset | Passed | `phase1f3-institute-security-settings` |
| `INST-P0-059` | Security quick-filter/watch truth | Passed | `phase1f3-institute-security-settings` |
| `INST-P0-060` | Security empty-state distinctions | Passed | `phase1f3-institute-security-settings` |
| `INST-P0-061` | Security summary-count consistency | Passed | `phase1f3-institute-security-settings` |
| `INST-P0-062` | Security controls/selected-exam watch | Passed | `phase1f3-institute-security-settings` |
| `INST-P0-063` | Settings summary truth | Passed | `phase1f3-institute-security-settings` |
| `INST-P0-064` | Settings route handoffs | Passed | `phase1f3-institute-security-settings` |
| `INST-P0-065` | Settings count consistency | Passed | `phase1f3-institute-security-settings` |

Final Phase 1F.3 unique workstream count: P0 `65 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`. Cumulative active-stack counts: P0 `221 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`; P1 `256 passed / 0 failed / 0 blocked / 0 skipped / 7 not run`; P2 `0` selected.

Supporting evidence, not additional unique catalog cases: frozen Institute executable pack `67/67`, focused Django/API batches `325/325`, post-fix auth/access `55/55`, browser role guards `8/8`, Institute Results `5/5`, Admin smoke `3/3`, full examination lifecycle `1/1`, web typecheck/build passed, and Django system checks passed. A confirmed unbounded institute-search defect and a question-bank automation fallback defect were fixed and covered by regressions. Current-run synthetic fixture cleanup reached zero residue. See `docs/qa/14-phase1f3-institute-operations-p0-certification.md` and `docs/qa/evidence/phase1f3/`.

P0 catalog completion does not authorize production release. Phase 1G closes the seven P1 Expo functional cases; live HTTPS staging, production signing, iOS compatibility, active-attempt restart, and final cross-browser/accessibility/performance gates remain open.

## Phase 1G Expo Mobile Certification Update

The prior matrix tracked seven dependent Expo flows as an aggregate without individual IDs. Phase 1G freezes the existing flow filenames as `EXPO-P1-001` through `EXPO-P1-007`; no case was added, removed, or split.

| Case ID | Flow | Result | Evidence |
| --- | --- | --- | --- |
| `EXPO-P1-001` | Exams filters, search, detail, and return | Passed | `phase1g/expo-p1-001-rerun-*` |
| `EXPO-P1-002` | Attempts, results, summary, and return | Passed | `phase1g/expo-p1-002-certified-*` |
| `EXPO-P1-003` | Results timeline, summary, analytics, repeat navigation | Passed | `phase1g/expo-p1-003-certified-*` |
| `EXPO-P1-004` | Published-result review journey | Passed | `phase1g/expo-p1-004-*` |
| `EXPO-P1-005` | Review filters and pagination | Passed | `phase1g/expo-p1-005-rerun-*` |
| `EXPO-P1-006` | Attempts lane and empty-active state | Passed | `phase1g/expo-p1-006-*` |
| `EXPO-P1-007` | Analytics, profile, logout, protected return | Passed | `phase1g/expo-p1-007-*` |

Phase 1G unique workstream count: P1 `7 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`. Cumulative active-stack counts: P0 `221 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`; P1 `263 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`; P2 `0` selected.

Supporting evidence, not additional unique catalog cases: login-to-exams smoke passed, offline login handling passed, focused Django security/regression `10/10` passed, Expo typecheck passed, Django system check passed, and Android `assembleRelease` passed. The release APK is not deployable: it is debug-signed and embeds `http://10.0.2.2:9001`, while release cleartext remains correctly denied. The mobile seed had zero active attempts, so active-attempt restart/save/submit is not certified by `EXPO-P1-006`.

Historical local fixture residue was also closed: 58 exact `PWFA*` automation institutes, 24 linked exams, and 85 linked synthetic users were inventoried and deleted; final selectors are zero and `a001` remains intact. See `docs/qa/15-phase1g-expo-mobile-certification.md` and `docs/qa/evidence/phase1g/`.

## Phase 1H HTTPS Staging and Release Security Update

The authorized stage `https://learn.accerio.in` was exercised directly. Certificate/hostname validation, TLS 1.2/1.3, HTTP-to-HTTPS redirects, security headers, restrictive CORS, secure UI session cookies, loopback-only application/database services, four-role direct API authorization, distinct-tenant read concealment, Django deployment checks, migration checks, and backup scheduling passed.

| Release gate | Result | Evidence / impact |
| --- | --- | --- |
| HTTPS browser role containment | Passed | Chromium `8/8` against stage with screenshots and JUnit |
| Direct API RBAC and tenant read isolation | Passed | Platform-admin endpoint 200 only for admin; other roles 403; cross-institute read 404 |
| Full HTTPS exam lifecycle | **Failed** | Assigned student draft detail returned 200 instead of 404; downstream publish/attempt/submit/score/result stages blocked |
| Deployed source parity | **Failed** | Stage commit `c60a5c...` lacks current draft status filter and diverges from local source |
| TLS default-host isolation | **Failed** | Unknown hostname reached another default Next.js vhost with 200 |
| Schema/docs/Django-admin routing | **Failed** | Deployed nginx/backend route contract is inconsistent |
| Build provenance | **Failed** | Stage health reports `build: local` |
| Next.js quality gates | Passed | Typecheck and 153-route optimized production build |
| Django focused security regression | Passed | `10/10`, plus deployment-route `1/1`, system and migration checks |
| Expo release policy | Passed statically | `5/5`, typecheck, HTTPS preview config, clean prebuild and unsigned release assembly |
| Android production artifact/device | **Blocked** | Anonymous package identity, no authorized signature, no attached release device |
| iOS/accessibility/performance/restore | Not run | Mandatory release gates remain |

Phase 1H adds release-gate evidence, not unique frozen catalog cases. Cumulative unique totals therefore remain P0 `221 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`; P1 `263 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`; P2 `0` selected. This accounting preserves case history while the separate candidate-level gate is **NO-GO**.

Prepared but not deployed fixes harden Jenkins secret/provenance handling, load production environment files safely, fail deployment on nginx/collectstatic errors, reject unknown nginx hosts, align Django-owned proxy routes, remove iOS arbitrary transport loads, remove Android release debug signing, and fail release builds on local HTTP endpoints, public secret-like variables, debug UI, or placeholder production identifiers. See `docs/qa/16-phase1h-https-staging-certification.md` and `docs/qa/evidence/phase1h/`.

## Phase 1H.1 Staging Parity and Security Remediation Update

Phase 1H.1 proved that staging is divergent rather than merely behind. The running source/current remote `main` is `c60a5c...`; the local candidate baseline is `ad3171c...`; their merge base is `34a2929...`, with 8 main-only and 2 candidate-only commits. The candidate also omits stage-applied `economy.0011_expand_operator_policy_scopes`, so it must not be promoted directly. The running Next build predates the stage checkout, and no release manifest or artifact digest exists.

| Release gate | Result | Evidence / impact |
| --- | --- | --- |
| Immutable release selection/promotion | Prepared, locally verified | Full SHA, approval reference, clean detached checkout, `origin/main` ancestry, deterministic archive, manifest and SHA-256 required |
| Release provenance unit/contract tests | Passed `6/6` | Manifest tamper rejection and Jenkins promotion constraints |
| Django provenance/security regression | Passed `8/8` | Health identity plus draft, unassigned, inactive, window, cross-student/role, and institute-boundary checks |
| Web typecheck/build/runtime identity | Passed locally | Typecheck, 153-page build, and Git/artifact/environment headers |
| nginx fail-closed template | Passed locally | nginx 1.28 syntax plus unknown HTTP `444` and unknown TLS handshake rejection; not deployed |
| Stage runtime provenance | **Failed** | New HTTPS Playwright gate expected deployed SHA and received `build: local` |
| Stage unknown-host/routes | **Failed** | Unknown TLS host still 200; schema/docs/admin still misrouted |
| Stage draft concealment rerun | **Blocked** | No authorized promoted candidate; prior synthetic fixture was cleaned |
| Stage deployment | **Blocked** | Explicit authorization was not provided |
| Mobile production configuration | **Blocked by design** | HTTPS policy passes; placeholder Android/iOS IDs are rejected; signing remains unavailable |

No frozen catalog case was added or reclassified. Cumulative unique totals remain P0 `221 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`; P1 `263 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`; P2 `0` selected. The separate release-candidate gate remains **NO-GO**, and those functional totals do not imply staging or production readiness. See `docs/qa/17-phase1h1-staging-parity-security-remediation.md` and `docs/qa/evidence/phase1h1/`.

## P0 Test Gates

Required before any production certification:

1. Backend URL import and schema generation.
2. Auth login/register/profile completion.
3. Role access negative tests.
4. Institute onboarding and roster provisioning.
5. Exam creation, assignment, publish, student visibility.
6. Student attempt start/save/submit/review.
7. Results generation and visibility by role.
8. Question bank CRUD/import/linking.
9. API proxy auth forwarding and error handling.
10. Regression for the failed full-access lifecycle spec.

## P1 Test Gates

1. Parent portal alerts/progress/preferences.
2. Economy wallet/subscription/referral/order flows.
3. Manual review and moderation.
4. Reports/analytics drilldowns.
5. Mobile student critical path.
6. Accessibility and keyboard workflows.
7. Responsive/mobile web route pack.
8. File upload/rich text/media artifact handling.

## P2 Test Gates

1. Search quality.
2. Marketing/static content sanity.
3. Non-critical empty states.
4. Visual polish snapshots after functional gates pass.

## Coverage Policy

A module can be marked Complete only when all are true:

- Source exists in the active tree.
- API route and backend endpoint contract are traceable.
- Role/data isolation is tested.
- Current execution evidence passes.
- Negative/error paths are covered.
- No P0/P1 defects remain open for that module.
