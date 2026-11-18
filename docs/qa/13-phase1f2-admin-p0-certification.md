# Phase 1F.2 Admin P0 Certification

Date: 2026-10-15  
Baseline: `docs/qa/12-phase1f1-institute-results-certification.md` and `docs/qa/04-master-qa-coverage-matrix.md`  
Active scope: Next.js, Django, database, APIs, and Expo. Flutter remained untouched and is excluded from all counts.

## Certification Decision

The Admin Operations P0 workstream passed: **56 passed / 0 failed / 0 blocked / 0 skipped / 0 not run**. The complete frozen Admin pack executed 58/58 because it also contains the two Admin workspace cases already counted in Phase 1D. Those two were rerun as regressions and were not counted again.

The active stack is **not production-ready**. Institute Operations still has 65 unexecuted P0 cases, and the previously documented Expo HTTPS staging and iOS device gates remain open.

## Frozen Baseline Reconciliation

`npm run test:e2e:release:admin-core -- --list` discovers 58 tests in 27 files. Phase 1D had already counted these two cases:

- `admin-dashboard-workspace.spec.ts`: admin dashboard filters and governance handoffs.
- `admin-economy-workspace.spec.ts`: economy governance and safe support controls.

Removing those two prior unique passes leaves the exact **56 currently unexecuted** cases requested for Phase 1F.2. Both prior cases passed again in this run. The inventory output is preserved at `docs/qa/evidence/phase1f2/playwright-admin-core-inventory.log`.

## Exact Case Results

Every row below has priority P0 and outcome **Passed**. Dependencies name the minimum runtime/data contract exercised; source line numbers are frozen to this execution.

| ID | Executable source | Description and expected outcome | Dependencies |
| --- | --- | --- | --- |
| `ADM-P0-001` | `admin-academic-setup-api-audit.spec.ts:19` | Preserve section/scope params with no duplicate browser API traffic. | Admin auth; institute; academics APIs |
| `ADM-P0-002` | `admin-academic-setup-workspace.spec.ts:34` | Switch academic sections and inspect defaults without mutation. | `/admin/academic-setup`; academic masters |
| `ADM-P0-003` | `admin-dashboard-api-audit.spec.ts:15` | Preserve dashboard filters and server-render contract without duplicate client calls. | `/admin/dashboard`; count APIs |
| `ADM-P0-004` | `admin-institutes-api-audit.spec.ts:19` | Keep institute selection cache-aware and scoped. | Institute workspace proxy/API |
| `ADM-P0-005` | `admin-institutes-workspace.spec.ts:13` | Inspect institute directory, details, and modal entry points. | `/admin/institutes`; onboarding models |
| `ADM-P0-006` | `admin-people-api-audit.spec.ts:19` | Send correct institute/resource params for roster requests. | People proxy; student/teacher APIs |
| `ADM-P0-007` | `admin-people-workspace.spec.ts:206` | Switch student/teacher rosters and export both CSVs. | `/admin/people`; deterministic roster |
| `ADM-P0-008` | `admin-economy-api-audit.spec.ts:15` | Avoid duplicate support calls and retain selected-student scope. | Economy APIs; student fixture |
| `ADM-P0-009` | `admin-economy-browser-coverage.spec.ts:111` | Render overview scope and platform-operator framing. | `/admin/economy`; catalog overview |
| `ADM-P0-010` | `admin-economy-browser-coverage.spec.ts:136` | Keep institute/student/focus filters hydrated across lanes. | Economy server loaders |
| `ADM-P0-011` | `admin-economy-browser-coverage.spec.ts:171` | Apply and reset overview filters truthfully. | URL filter contract |
| `ADM-P0-012` | `admin-economy-browser-coverage.spec.ts:211` | Preserve economy scope/focus after reload and revisit. | Session; URL persistence |
| `ADM-P0-013` | `admin-economy-browser-coverage.spec.ts:300` | Keep support and question-bank summary counts internally consistent. | Economy aggregate APIs |
| `ADM-P0-014` | `admin-economy-browser-coverage.spec.ts:369` | Expose catalog governance cards and validated controls. | Catalog models/APIs |
| `ADM-P0-015` | `admin-economy-browser-coverage.spec.ts:418` | Expose access policies, unlocks, and policy settings correctly. | Policy/entitlement APIs |
| `ADM-P0-016` | `admin-economy-browser-coverage.spec.ts:470` | Persist economy policy changes, verify API state, and restore the original values. | Mutable flag; policy singleton/audit |
| `ADM-P0-017` | `admin-economy-browser-coverage.spec.ts:573` | Operate package, visibility, and subscription-plan controls. | Question-bank/economy APIs |
| `ADM-P0-018` | `admin-economy-browser-coverage.spec.ts:727` | Render support queue and student support tools in selected scope. | Requests; wallet/rewards/orders |
| `ADM-P0-019` | `admin-economy-browser-coverage.spec.ts:761` | Show bootstrap guidance and truthful command paths. | Seed metadata |
| `ADM-P0-020` | `admin-exam-detail-workspace.spec.ts:28` | Inspect exam controls and non-mutating handoffs. | Admin exam detail; exam fixture |
| `ADM-P0-021` | `admin-exams-browser-coverage.spec.ts:72` | Hydrate admin exam filter controls. | `/admin/exams`; exam list API |
| `ADM-P0-022` | `admin-exams-browser-coverage.spec.ts:87` | Apply and reset exam filters truthfully. | Exam URL contract |
| `ADM-P0-023` | `admin-exams-browser-coverage.spec.ts:157` | Keep quick filters aligned with visible exams. | Seeded status/source variants |
| `ADM-P0-024` | `admin-exams-browser-coverage.spec.ts:185` | Distinguish loaded and empty exam states. | No-match synthetic filter |
| `ADM-P0-025` | `admin-exams-browser-coverage.spec.ts:206` | Keep exam summary counts internally consistent. | Exam aggregates |
| `ADM-P0-026` | `admin-exams-create-workspace.spec.ts:23` | Traverse the create-exam wizard safely without persisting a draft. | `/admin/exams/new`; form validation |
| `ADM-P0-027` | `admin-exams-workspace.spec.ts:12` | Filter exams and use detail/builder handoffs. | Exam list/detail/builder routes |
| `ADM-P0-028` | `admin-reports-api-audit.spec.ts:15` | Preserve report params without duplicate browser API calls. | Reporting summary APIs |
| `ADM-P0-029` | `admin-reports-browser-coverage.spec.ts:53` | Hydrate report filter controls. | `/admin/reports` |
| `ADM-P0-030` | `admin-reports-browser-coverage.spec.ts:83` | Apply and reset reporting filters truthfully. | Report URL contract |
| `ADM-P0-031` | `admin-reports-browser-coverage.spec.ts:131` | Keep quick filters truthful across report lanes. | Results/insights fixtures |
| `ADM-P0-032` | `admin-reports-browser-coverage.spec.ts:167` | Distinguish weak-topic empty and loaded states. | Analytics summaries |
| `ADM-P0-033` | `admin-reports-browser-coverage.spec.ts:180` | Keep report summary counts internally consistent. | Results aggregates |
| `ADM-P0-034` | `admin-reports-browser-coverage.spec.ts:224` | Align runtime statistics with selected status. | Runtime ops API |
| `ADM-P0-035` | `admin-reports-workspace.spec.ts:24` | Filter and navigate reporting workflows. | Reports and drill-down routes |
| `ADM-P0-036` | `admin-search-api-audit.spec.ts:15` | Preserve query params without duplicate browser calls. | Search server loaders |
| `ADM-P0-037` | `admin-search-browser-coverage.spec.ts:51` | Hydrate search controls. | `/admin/search`; live sources |
| `ADM-P0-038` | `admin-search-browser-coverage.spec.ts:66` | Apply and reset search filters. | Search URL contract |
| `ADM-P0-039` | `admin-search-browser-coverage.spec.ts:107` | Keep search quick filters truthful. | Workspace/live result sources |
| `ADM-P0-040` | `admin-search-browser-coverage.spec.ts:128` | Distinguish no-result and normal-result states. | Deterministic no-match query |
| `ADM-P0-041` | `admin-search-browser-coverage.spec.ts:142` | Keep search summary counts internally consistent. | Search aggregation |
| `ADM-P0-042` | `admin-search-workspace.spec.ts:16` | Filter search and use result handoffs. | Search routes and targets |
| `ADM-P0-043` | `admin-security-api-audit.spec.ts:222` | Keep security filters/watch state URL-driven and browser-quiet. | Runtime monitor APIs |
| `ADM-P0-044` | `admin-security-browser-coverage.spec.ts:63` | Hydrate security filter controls. | `/admin/security`; exam runtime |
| `ADM-P0-045` | `admin-security-browser-coverage.spec.ts:84` | Apply and reset security filters. | Security URL contract |
| `ADM-P0-046` | `admin-security-browser-coverage.spec.ts:145` | Preserve quick filters and watched-exam context. | Selected exam runtime |
| `ADM-P0-047` | `admin-security-browser-coverage.spec.ts:179` | Distinguish exam-empty and watchlist-empty states. | No-match synthetic filters |
| `ADM-P0-048` | `admin-security-browser-coverage.spec.ts:200` | Keep security summary counts internally consistent. | Live monitor/attempt aggregates |
| `ADM-P0-049` | `admin-security-workspace.spec.ts:8` | Inspect security controls, quick filters, and watch state. | Security workspace |
| `ADM-P0-050` | `admin-settings-api-audit.spec.ts:15` | Keep settings server-rendered and handoffs free of duplicate calls. | Settings summary APIs |
| `ADM-P0-051` | `admin-settings-browser-coverage.spec.ts:23` | Keep governance summary values truthful. | `/admin/settings`; institute counts |
| `ADM-P0-052` | `admin-settings-browser-coverage.spec.ts:40` | Surface economy policy governance from settings. | Policy singleton/audit |
| `ADM-P0-053` | `admin-settings-browser-coverage.spec.ts:51` | Keep people and academic handoff routes truthful. | Admin route contracts |
| `ADM-P0-054` | `admin-settings-browser-coverage.spec.ts:74` | Show institute footprint rows when data exists. | Institute list API |
| `ADM-P0-055` | `admin-settings-browser-coverage.spec.ts:89` | Keep institute counts internally consistent. | Institute aggregates |
| `ADM-P0-056` | `admin-settings-workspace.spec.ts:8` | Inspect settings summary and governance handoffs. | Settings workspace |

## Architecture Mapping

| Module | Next.js route/proxy | Django API and primary persistence |
| --- | --- | --- |
| Dashboard | `src/app/(admin)/admin/dashboard/page.tsx` | `/api/v1/institutes/`, academics, students, teachers, exams, results |
| Institutes | `src/app/(admin)/admin/institutes/page.tsx`; `src/app/api/admin/institutes/**` | `/api/v1/institutes/**`; `Institute`, onboarding profile/run/task models |
| People | `src/app/(admin)/admin/people/page.tsx`; `src/app/api/admin/people/**` | `/api/v1/students/`, `/api/v1/teachers/`; account/student/teacher models |
| Academics | `src/app/(admin)/admin/academic-setup/page.tsx`; `src/app/api/admin/academics/**` | `/api/v1/academics/**`; academic year/program/cohort/subject/topic models |
| Economy | `src/app/(admin)/admin/economy/page.tsx`; `src/app/api/admin/economy/**` | `/api/v1/economy/**`; policy, package, entitlement, subscription, reward, order models |
| Exams | `src/app/(admin)/admin/exams/**` | `/api/v1/exams/**`, question bank and results APIs; exam/section/question/assignment models |
| Reports/security | `src/app/(admin)/admin/reports/page.tsx`; `security/page.tsx` | `/api/v1/reports/**`, teacher summaries, live monitor and attempt APIs |
| Search/settings | `src/app/(admin)/admin/search/page.tsx`; `settings/page.tsx` | Server-composed institute, people, academic, exam, economy, and result endpoints |

Authorization is enforced by Django permissions such as `IsPlatformAdmin` and tenant-scoping helpers in `apps/accounts/scopes.py`; Next.js route guards and API proxies provide an additional browser boundary but are not treated as the primary authorization control.

## Execution Results

| Batch | Result | Evidence |
| --- | --- | --- |
| Django system check | Passed, no issues | `django-system-check-final.log` |
| Identity, auth, institute APIs | 65/65 passed | `django-admin-identity-institute.log` |
| Academics and economy APIs/services | 117/117 passed | `django-admin-academics-economy.log` |
| Exams and question bank contracts | 132/132 passed | `django-admin-exams-question-bank.log` |
| Reports, notifications, runtime, result smoke | 33/33 passed | `django-admin-reports-results.log` |
| Admin dashboard/institutes/people/academics | 8/8 passed | `playwright-admin-core-directory.log` |
| Admin economy | 13/13 passed; mutable policy case executed | `playwright-admin-economy.log` |
| Admin exams | 8/8 passed | `playwright-admin-exams.log` |
| Admin reports | 8/8 passed | `playwright-admin-reports.log` |
| Admin search | 7/7 passed | `playwright-admin-search.log` |
| Admin security | 7/7 passed | `playwright-admin-security.log` |
| Admin settings | 7/7 passed | `playwright-admin-settings.log` |
| Expanded cross-role browser guard | 8/8 passed | `playwright-admin-role-guard.log` |
| Phase 1F.1 Institute Results regression | 5/5 passed | `playwright-institute-results-regression.log` |
| Final web typecheck | Passed | `web-typecheck-final.log` |

The four Django batches total **347/347** supporting checks. The seven Admin browser slices total **58/58 invocations**, comprising 56 new unique P0 cases and two prior-case regressions.

## Security And Persistence Evidence

- Anonymous and invalid bearer requests to `/api/v1/economy/admin/policy-config/` returned `401`.
- Invalid synthetic credentials were rejected with `400`; no session was issued.
- Teacher, student, and institute-admin tokens each returned `403` for the platform-admin policy endpoint; platform admin returned `200`.
- A teacher request carrying a foreign institute filter returned 100 own-institute exam rows and **zero** foreign/non-owned rows. The filter could not widen tenant scope.
- Two repeated read-only platform policy requests returned identical SHA-256 hashes, showing no read-side mutation.
- The mutable policy test changed four fields, verified browser/API persistence, and restored all original values in `finally`. Database evidence shows one singleton row and paired update/restore audit records.
- Browser guards redirect anonymous users from `/admin/dashboard`; teacher, student, and institute roles also cannot enter that route.

Sanitized API evidence is in `docs/qa/evidence/phase1f2/live-api-authorization-evidence.json`. Read-only database evidence is in `docs/qa/evidence/phase1f2/admin-database-evidence.json`.

## Defects And Changes

No reproducible application defect was found in the 56-case Admin P0 scope, so no production application source was changed.

| Finding | Classification | Resolution |
| --- | --- | --- |
| Baseline says 56 while frozen pack lists 58 | Accounting discrepancy, resolved | Two pack cases were already unique passes in Phase 1D; rerun as regressions and excluded from new-case count. |
| Passing tests retained screenshots only on failure | Evidence-harness gap, fixed | Added opt-in `PLAYWRIGHT_SCREENSHOT=1`; all Admin cases ran with screenshots and forced traces. |
| Admin route absent from browser role-guard suite | Automation coverage gap, fixed | Added anonymous and non-platform-role `/admin/dashboard` checks; 8/8 passed. |
| Mutable economy policy case historically skipped | Environment gate, resolved | Enabled the existing scoped mutable flag; persistence and restoration passed. |

Files modified in Phase 1F.2:

- `edutech_web/playwright.config.ts`
- `edutech_web/tests/e2e/role-scope/access-control.spec.ts`
- `docs/qa/04-master-qa-coverage-matrix.md`
- `docs/qa/13-phase1f2-admin-p0-certification.md`

Flutter files were not inspected or modified.

## Evidence Paths

- Browser result roots: `edutech_web/test-results/phase1f2-admin-core-directory/`, `phase1f2-admin-economy/`, `phase1f2-admin-exams/`, `phase1f2-admin-reports/`, `phase1f2-admin-search/`, `phase1f2-admin-security/`, and `phase1f2-admin-settings/`.
- Authorization regression: `edutech_web/test-results/phase1f2-admin-role-guard/`.
- Institute Results regression: `edutech_web/test-results/phase1f2-institute-results-regression/`.
- Logs and sanitized API/database evidence: `docs/qa/evidence/phase1f2/`.
- Artifact checksum manifest: `docs/qa/evidence/phase1f2/playwright-artifact-manifest.sha256` (71 traces and 76 screenshots across Admin, role-guard, and Institute Results runs).

Playwright traces contain synthetic-session cookies and should remain access-controlled. The fixture log has passwords redacted; the JSON evidence contains no tokens or credentials.

## Counts And Remaining Gates

### Phase 1F.2 unique workstream

| Priority | Passed | Failed | Blocked | Skipped | Not run |
| --- | ---: | ---: | ---: | ---: | ---: |
| P0 | 56 | 0 | 0 | 0 | 0 |
| P1 | 0 | 0 | 0 | 0 | 0 |
| P2 | 0 | 0 | 0 | 0 | 0 |

### Cumulative active-stack catalog

| Priority | Passed | Failed | Blocked | Skipped | Not run |
| --- | ---: | ---: | ---: | ---: | ---: |
| P0 | 156 | 0 | 0 | 0 | 65 |
| P1 | 256 | 0 | 0 | 0 | 7 |
| P2 | 0 | 0 | 0 | 0 | 0 |

Supporting Django, role-guard, prior Admin, and Institute Results reruns are not added as new catalog cases.

## Phase 1F.3 Recommendation

Execute the remaining 65 Institute Operations P0 cases in the same controlled sequence: backend tenant/RBAC contracts first, then browser slices for dashboard, roster, academics, question bank, exams, economy, settings/search/security, with mutable cases enabled only against deterministic synthetic fixtures and mandatory restoration evidence. Preserve a narrow Admin and Institute Results smoke if shared auth, tenant scope, exam, economy, or reporting code changes.

Production readiness must remain withheld until the 65 Institute P0 cases and the outstanding Expo HTTPS staging/iOS device gates are verified.
