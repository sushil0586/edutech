# Full Repository Recursive Audit

Date: 2026-10-14  
Scope: Entire workspace under `/Users/ansh/Documents/Eductech`, excluding generated/build/dependency/VCS directories from source-code review while inspecting security-sensitive config and runnable test surfaces.

## Repository Inventory

| Area | Evidence count | Notes |
| --- | ---: | --- |
| Audited source files | 5,785 | From `rg --files` excluding `.git`, `.next`, `node_modules`, virtualenv, caches, and Playwright result output |
| Root/source directories | 24,434 raw dirs | Raw count includes generated/mobile dependency directories; source audit excluded dependency/build/VCS trees |
| Django backend apps | 14 app dirs | `academics`, `accounts`, `attempts`, `economy`, `exams`, `geography`, `institutes`, `parents`, `question_bank`, `reports`, `results`, `students`, `teachers`, plus generated `__pycache__` ignored |
| Django migrations | 87 | Across backend app modules |
| Django tests | 71 files | Includes package-style tests and legacy `tests.py` files |
| Next.js pages | 125 | App Router pages under `edutech_web/src/app/**/page.tsx` |
| Next.js API route handlers | 93 | Proxy/API handlers under `edutech_web/src/app/api/**/route.ts` |
| Next.js components | 114 | Components under `edutech_web/src/components` |
| Playwright specs | 440 | `edutech_web/tests/e2e/**/*.spec.ts` |
| Flutter Dart files | 125 | `edutech_frontend/lib` and `test` |
| Expo student mobile TS/TSX files | 38 | `nexora_student_mobile/app` and `src` |
| k6 performance scripts | 9 | `performance/k6/*.js` and helpers |

Also found a nested mirrored repository at `edutech/` containing backend, web, Flutter, Expo, docs, and performance folders. It appears to be a duplicate/archive tree with its own `.git`; it was noted for repository-shape risk and excluded from active source certification unless explicitly promoted.

## Implemented Modules Found

| Module | Backend evidence | Web/mobile evidence | Status |
| --- | --- | --- | --- |
| Authentication/profile | `apps.accounts`, JWT, profile/location/acquisition models, public registration tests | Next auth pages, Expo login/register, Flutter auth shell | Partial: backend tests pass; web global TS blocks certification |
| Platform admin | accounts, institutes, academics, economy, reports APIs | `/admin/*` pages for dashboard, institutes, people, academics, economy, exams, reports, search, security, settings | Partial: broad source exists; browser suite not currently executable due TS blocker |
| Institute admin | institutes, teachers/students/accounts, question bank, exams, results, reports | `/institute/*` pages and API proxies | Partial: backend batches pass; browser result-score blocker remains |
| Teacher | teacher profiles/assignments, question bank, exams, attempts/results/reviews | `/teacher/*` pages, question authoring/import/review/result surfaces | Partial: backend and source coverage present; browser TS blocker |
| Student web | attempts, results, reports, economy, notifications | `/app/*` pages: exams, attempts, results, analytics, practice, wallet, subscriptions, notifications | Partial/Broken for exam certification because browser score evidence fails |
| Parent | `apps.parents` models/services/API tests | `/parent/*` pages and preferences API proxy | Partial: backend parent API included in passing broad pack; browser not run |
| Academics/curriculum | academic years, programs, cohorts, subjects, topics, option catalog | admin/institute academic setup workspaces | Partial: backend broad pack passes; UI not fully certified |
| Question bank/master library | question/passages/options/tags/access models, rich content/import services | teacher/institute question bank/import/comprehension/shared library pages | Partial: backend broad pack passes; TS blocks broad Playwright |
| Examinations | exam, section, question, slots, assignments, presets/templates | admin/institute/teacher exam builders/detail pages | Partial: 63 exam backend tests pass; browser lifecycle scoring blocker |
| Attempts/runtime | attempts, answers, selected options, integrity events, review tasks | student attempt runtime, Expo attempt page, Flutter attempt page | Partial: backend pass; browser save/submit works but score evidence fails |
| Results/reporting | result, topic performance, summary models; report/audit/notification models | result workspaces, analytics/report pages | Broken/Blocked for browser certification; backend smoke passes |
| Economy/subscriptions | star ledger, wallets, rewards, referrals, subscriptions, unlocks, entitlements, packages | admin/institute/student economy/wallet/subscription pages | Partial: backend broad pack passes; browser not certified |
| Notifications | report notification model/API | student notification inbox, parent alerts | Partial: backend reports/parent tests pass; browser not certified |
| Mobile student apps | Backend APIs shared | Expo app passes typecheck; Flutter app passes analyze | Partial: static checks pass; Maestro/device flows not run |
| Performance/load | Backend and student APIs | k6 scripts for student session, discovery, runtime, results, analytics | Not run in this audit |

## Model Inventory

| Backend app | Model/text-choice classes found |
| --- | ---: |
| academics | 8 |
| accounts | 5 |
| attempts | 12 |
| economy | 54 |
| exams | 23 |
| geography | 4 |
| institutes | 7 |
| parents | 8 |
| question_bank | 16 |
| reports | 3 |
| results | 4 |
| students | 3 |
| teachers | 3 |

## Verification Executed

| Test/check | Result | Evidence |
| --- | --- | --- |
| Django system check | Passed | `../edutech_backend/.venv/bin/python manage.py check` |
| Backend P0 auth/attempt/results pack | Passed | 171 tests passed in 612.218s |
| Backend broad academics/institutes/question-bank/economy/parent/reports pack | Passed | 162 tests passed in 577.577s |
| Backend exam contracts/builder pack | Passed | 63 tests passed in 387.889s |
| Backend broad app-label discovery | Failed | `manage.py test apps.accounts apps.exams apps.attempts apps.results --keepdb` hit unittest import collision for `apps.exams.tests` |
| Web TypeScript | Failed | `npm run typecheck -- --pretty false`; route types generated, then 73 existing spec TS errors |
| Expo student mobile TypeScript | Passed | `npm run typecheck` in `nexora_student_mobile` |
| Flutter frontend static analysis | Passed | `flutter analyze` in `edutech_frontend` |
| Phase 1B browser lifecycle | Failed | Latest trace `phase1b-20261014182022` failed score assertion after submit/results |

## Functional Completeness Classification

| Module | Complete | Partial | Broken | Placeholder/static | Not verified |
| --- | ---: | ---: | ---: | ---: | ---: |
| Auth/profile | 0 | 1 | 0 | 0 | 0 |
| Admin/institute/teacher/student/parent shells | 0 | 5 | 0 | 0 | 0 |
| Academics | 0 | 1 | 0 | 0 | 0 |
| Question bank | 0 | 1 | 0 | 0 | 0 |
| Exams/attempts/results | 0 | 2 | 1 | 0 | 0 |
| Reporting/analytics | 0 | 1 | 0 | 1 | 0 |
| Economy | 0 | 1 | 0 | 1 | 0 |
| Mobile apps | 0 | 2 | 0 | 1 | 0 |
| Performance/load | 0 | 0 | 0 | 0 | 1 |

No module is classified Complete because completeness requires passing current browser/API/database evidence, role isolation, negative paths, and no open P0/P1 blockers.

## Key Defects/Risks

| Priority | Finding | Evidence |
| --- | --- | --- |
| P0 | Browser examination lifecycle not certified: published result score was `1` after two distinct known-correct saves | `edutech_web/test-results/phase1b-20261014182022/.../trace.zip` |
| P0 | Browser negative access-isolation matrix not yet executed after score blocker | Phase 1B stopped before negative matrix expansion |
| P1 | Global web TypeScript fails in existing Playwright specs | 73 `error TS` entries after successful route type generation |
| P1 | Django broad app-label test discovery collision | `apps.exams.tests` import collision; explicit modules pass |
| P1 | Browser/React reliability warnings during attempt and builder flows | Hydration mismatch in `AttemptResiliencePanel`; duplicate React keys in advanced-builder topic rows |
| P1 | Placeholder/static reporting cards exist in admin/teacher report pages | `.placeholderDot` report surfaces in admin/teacher report routes |
| P1 | Admin economy seed screen includes “Processor not implemented” statuses | `edutech_web/src/components/admin/economy-seed-screen.tsx` |
| P2 | Legacy Flutter attempt page includes formula sheet/scratchpad placeholders | `edutech_frontend/lib/features/exams/presentation/pages/student_attempt_page.dart` |
| P2 | Nested mirrored repository may confuse audits and tooling | Root-level `edutech/` contains duplicated project tree and its own `.git` |

## Security/Architecture Review

Positive evidence:

- Backend secrets are environment-backed; production raises if the default secret is used.
- `DEBUG=False` production settings enforce secure cookies and CSRF cookie security.
- CORS does not default to wildcard, even in dev.
- JWT auth and default authenticated DRF permissions are configured.
- Nested package modules such as `urls/__init__.py`, `views/__init__.py`, and `serializers/__init__.py` are active and covered by imports/tests.

Risks:

- Dev settings include MD5 hasher as a fallback; acceptable only for dev/load-test contexts and must not leak into production.
- Local media/static files and generated artifacts exist in the repository tree; ensure deployment excludes private runtime uploads.
- Browser evidence remains necessary for authorization parity because backend API tests alone do not prove UI/API agreement.

## QA Certification Tracker

| Priority | Passed | Failed | Blocked | Not run | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| P0 | 3 | 1 | 2 | 2 | Backend P0/auth/exam/result batches passed; browser exam scoring failed; negative browser isolation blocked |
| P1 | 3 | 2 | 1 | 4 | Mobile static checks passed; web TS and broad Django discovery failed |
| P2 | 0 | 0 | 0 | 3 | Load/performance, visual polish, nested mirror cleanup not executed |

## Recommended Next Execution Sequence

1. Preserve a failed browser exam run without cleanup and inspect `StudentAnswer`, selected option, `ExamResult`, and result-generation inputs.
2. Fix the confirmed score/save/calculation defect or test harness defect, then rerun the single Phase 1B browser lifecycle.
3. Repair global Playwright TypeScript errors so release packs can compile.
4. Run browser negative isolation matrix for assigned/unassigned/cross-institute/draft/future/expired/unauthorized access.
5. Run role release packs in controlled batches: student core, admin core, institute core, teacher core, parent core.
6. Run mobile device/Emulator Maestro flows for Expo student app.
7. Run k6 smoke load tests after functional P0 stability.
