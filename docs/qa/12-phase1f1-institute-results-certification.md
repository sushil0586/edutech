# Phase 1F.1 Institute Results P0 Certification

Date: 2026-10-15  
Baseline: `docs/qa/11-phase1e-active-stack-stabilization.md` and `docs/qa/04-master-qa-coverage-matrix.md`  
Active scope: Next.js, Django, database, APIs, and Expo. Flutter remained untouched and is excluded.

## Certification Decision

**Institute Results P0 workstream certified: 5/5 passed.** Each catalogued case passed in Chromium against the production Next runtime with a dedicated trace and full-page screenshot. Supporting isolated Django tests passed for scoring, persistence, publication, analytics, ownership, student isolation, cross-tenant denial, and unauthenticated rejection.

**The active stack is not production-ready.** Admin `56` and Institute Operations `65` P0 cases remain not run. Seven Expo flows, live HTTPS staging verification, and iOS device verification also remain open.

## Exact P0 Cases

The Phase 1E matrix identified the five-file Institute Results pack but did not assign stable case IDs. Phase 1F.1 records executable IDs in the existing tests without changing assertions.

| ID | Executable source | Expected outcome | Final outcome |
| --- | --- | --- | --- |
| `IR-P0-001` | `institute-results-workspace.spec.ts` | Institute-scoped overview loads; filters, grouping, reset, readiness, exam/builder/review/live/analysis navigation remain truthful | Passed |
| `IR-P0-002` | `institute-results-analysis-workspace.spec.ts` | Question-risk filters, student evidence, question-bank handoff, results return, and builder navigation work | Passed |
| `IR-P0-003` | `institute-results-live-workspace.spec.ts` | Live refresh controls and scoped attempt drill/empty state work | Passed |
| `IR-P0-004` | `institute-results-leaderboard-workspace.spec.ts` | Ranking, publication metrics, pagination, and cross-view navigation remain consistent | Passed |
| `IR-P0-005` | `institute-results-attempts-workspace.spec.ts` | Attempt filters, grouping, reset, and scoped attempt detail/empty state work | Passed |

Final Phase 1F.1 P0 count: **5 passed / 0 failed / 0 blocked / 0 skipped / 0 not run**.

## Architecture Trace

The five Next routes under `edutech_web/src/app/(institute)/institute/results/` delegate to `ResultsWorkspacePage` in `edutech_web/src/features/results-workspace/page.tsx`. The institute layout requires an active institute-admin session before rendering.

The workspace uses these Django APIs through `edutech_web/src/lib/api/teacher.ts`:

- `GET /api/v1/teacher/results/summary/`
- `GET /api/v1/results/exam/<exam_id>/publish-readiness/`
- `GET /api/v1/results/exam/<exam_id>/leaderboard/`
- `GET /api/v1/results/exam/<exam_id>/attempts/`
- `GET /api/v1/results/exam/<exam_id>/live-monitor/`
- `GET /api/v1/results/exam/<exam_id>/question-analysis/`
- `GET /api/v1/results/exam/<exam_id>/attempt-question-analysis/`
- `GET /api/v1/results/topic-performance/`

`ExamResult`, `StudentTopicPerformance`, and `ExamPerformanceSummary` persist institute, exam, student, attempt, score, rank, and publication state in `edutech_backend/apps/results/models.py`. Model validation rejects cross-exam, cross-student, and cross-institute result relationships. API querysets use `scope_result_queryset`, `scope_teacher_queryset`, and `scope_exam_queryset`; result actions require `CanViewAnalytics` or `CanPublishResults`.

No export behavior is part of these five executable P0 definitions, and the results workspace exposes no export command. Institute roster export remains part of the separate Institute Operations pack and is not claimed here.

## Execution Evidence

| Batch | Result | What it proves |
| --- | --- | --- |
| Final Institute Results Playwright pack | `5/5` passed in `58.4s` | Five routes, filters, deep links, refresh, detail views, and navigation; five traces and five PNGs |
| Focused Django certification batch | `5/5` passed in `16.477s` | Deterministic `2.00` scoring, rank/publication persistence, analytics APIs, ownership, student isolation, cross-tenant action denial, and anonymous rejection |
| Browser role-guard pack | `7/7` passed in `30.8s` | Anonymous, teacher, and student sessions cannot enter institute results; role switching remains isolated |
| Live sanitized API snapshot | Passed | Institute login plus summary, readiness, leaderboard, attempts, live monitor, and question analysis returned `200`; anonymous live monitor returned `401` |
| Read-only database snapshot | Passed | Exam total marks `2.00`; 51 submitted attempts and 51 published results; ownership consistency true; rank 1 score `2.00`/`100.00` |
| Web typecheck | Passed | `next typegen` and `tsc --noEmit` |
| Django system check | Passed | No issues |

The focused Django tests use transactional synthetic fixtures and preserve the isolated test database with `--keepdb`; `TestCase` rollback supplies cleanup. The browser pack is read-focused and uses the seeded demo institute. It creates no disposable institute or result records.

## Security And Consistency

- Direct Django API tests confirm a student cannot read another student's attempts, result collection, or performance endpoint.
- Institute and teacher access tests confirm own-institute result/attempt/analysis visibility and reject cross-institute mutation and live-monitor access.
- Unauthenticated protected API access returns `401`.
- Browser route guards redirect anonymous, teacher, and student sessions away from institute-only results routes.
- The deterministic flow preserved score `2.00`, percentage `100.00`, rank generation, result publication, leaderboard visibility, and persisted institute ownership.
- The live snapshot reported all 51 selected-exam results ranked and published; database ownership checks agreed with the API state.

## Findings And Changes

No reproducible product defect was found, so no application source was changed.

Automation/evidence changes:

- Added stable IDs and final screenshot capture to the five existing Institute Results Playwright specs.
- Updated `docs/qa/04-master-qa-coverage-matrix.md`.
- Created this report.

Two diagnostic failures are excluded from case counts:

1. The first Django command encountered an existing `test_edutech_db` before test execution. The supported `--keepdb` rerun passed.
2. One command referenced the unauthenticated test under the wrong class. The corrected five-test invocation passed.

Neither diagnostic reached application assertions or represents a product defect.

## Evidence Paths

- Final traces/screenshots: `edutech_web/test-results/phase1f1-institute-results-final-20261015/`
- Final browser log: `docs/qa/evidence/phase1f/playwright-institute-results-final.log`
- Browser role-guard evidence: `edutech_web/test-results/phase1f1-institute-results-role-guard-20261015/` and `docs/qa/evidence/phase1f/playwright-institute-results-role-guard.log`
- Focused Django log: `docs/qa/evidence/phase1f/django-institute-results-certification.log`
- Sanitized live API evidence: `docs/qa/evidence/phase1f/institute-results-api-evidence.json`
- Read-only database evidence: `docs/qa/evidence/phase1f/institute-results-database-evidence.json`
- Type/system checks: `docs/qa/evidence/phase1f/web-typecheck.log` and `docs/qa/evidence/phase1f/django-system-check.log`
- Non-product diagnostics: `docs/qa/evidence/phase1f/django-institute-results-stale-db-diagnostic.log` and `django-institute-results-label-diagnostic.log`

The report and sanitized JSON do not contain credentials or access tokens. Playwright traces may contain ephemeral synthetic-session cookies and must remain access-controlled.

## Updated Counts

| Priority | Passed | Failed | Blocked | Skipped | Not run |
| --- | ---: | ---: | ---: | ---: | ---: |
| P0 | 100 | 0 | 0 | 0 | 121 |
| P1 | 256 | 0 | 0 | 0 | 7 |
| P2 | 0 | 0 | 0 | 0 | 0 |

Supporting Django and role-guard reruns are evidence for the same five certification cases and are not added as new unique P0 catalog entries.

## Remaining Blockers And Phase 1F.2

1. Execute all `56` Admin P0 cases in controlled functional slices with trace evidence.
2. Execute all `65` Institute Operations P0 cases after Admin stabilizes.
3. Preserve the five certified Institute Results cases when either operator workstream changes shared results, exam, auth, or navigation code.
4. Complete the seven remaining Expo flows, HTTPS staging verification, and iOS device verification before any active-stack production claim.

Recommended Phase 1F.2: run the Admin P0 pack in dashboard/institutes/people/academics, economy, exams, reports/search, and security/settings slices. Resolve and rerun each slice before advancing, then perform a five-case Institute Results smoke only if shared code changes.
