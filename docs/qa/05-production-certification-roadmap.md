# Production Certification Roadmap

## Certification Principle

Do not certify by source presence. Certify only by current, reproducible execution evidence against the exact production candidate.

## Phase 0: Source Truth And Environment Freeze

Priority: P0

Actions:

1. Declare the active app roots: likely `edutech_backend`, `edutech_web`, and `nexora_student_mobile`.
2. Decide whether nested `edutech/` copies are archival, generated, or active.
3. Freeze dependency versions and environment files for certification.
4. Produce a clean build/test database reset process.
5. Confirm production API base URLs and deployment service targets.

Exit evidence:

- Active source manifest.
- Environment manifest with secrets redacted.
- Clean install/build commands.

## Phase 1: Backend Import And API Contract Baseline

Priority: P0

Actions:

1. Force import `edutech_backend/config/urls.py` and every included route.
2. Generate OpenAPI schema.
3. Run migrations on a clean database.
4. Run backend unit/API tests.
5. Confirm all `/api/v1/...` endpoints consumed by Next API routes exist.

Exit evidence:

- Passing backend import/schema run.
- Passing migration run.
- Backend test report.
- API route contract map.

Current blocker:

- Top-level `edutech_backend/apps/**/urls.py`, views, and serializers were not found during discovery.

## Phase 2: P0 Functional Smoke

Priority: P0

Actions:

1. Auth: login, logout, token refresh, profile completion.
2. Role routing: platform admin, institute admin, teacher, student, parent.
3. Institute onboarding and roster provisioning.
4. Question bank create/import/select.
5. Exam create/assign/publish.
6. Student exam discovery/detail/start.
7. Attempt answer save/submit.
8. Result generation and role visibility.

Exit evidence:

- Passing Playwright smoke report.
- Passing backend API report.
- Screenshots/traces retained for failures only.

Immediate regression:

- Re-run and fix `tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts`.

## Phase 3: Data Isolation And Security Certification

Priority: P0/P1

Actions:

1. Cross-institute access denial tests.
2. Cross-student attempt/result denial tests.
3. Teacher scope tests by assignment.
4. Parent-child relationship access tests.
5. Admin-only economy/security/settings mutation tests.
6. File upload validation tests.
7. CORS/CSRF/cookie/HSTS/header verification.
8. Mobile log/privacy review.

Exit evidence:

- Security matrix with pass/fail by role and resource.
- Config validation report.
- No P0 authz or data isolation defects.

## Phase 4: Module Regression

Priority: P1

Actions:

1. Admin: institutes, people, academics, economy, exams, reports, security, settings.
2. Institute: people, teacher assignment, question bank, exams, results, reviews, reports.
3. Teacher: question bank, exams, reviews, reports/results.
4. Student: dashboard, exams, attempts, results, practice, analytics, reports, notifications, wallet/subscriptions.
5. Parent: children, progress, alerts, preferences.
6. Mobile: login, exams, detail, attempt, summary/review, results, analytics, logout.

Exit evidence:

- Passing module-level Playwright and Maestro reports.
- Known issue list triaged P0/P1/P2.

## Phase 5: UX, Accessibility, And Responsive Verification

Priority: P1/P2

Actions:

1. Route crawl all 125 web pages by role.
2. Capture network, console, 404, 500, and hydration errors.
3. Run accessibility/keyboard workflows.
4. Run desktop/tablet/mobile visual checks.
5. Review static/placeholder states against accepted product requirements.

Exit evidence:

- Accessibility report.
- Responsive visual report.
- Placeholder disposition list: accepted empty state vs unfinished content.

## Phase 6: Performance And Reliability

Priority: P1

Actions:

1. Run route timing specs.
2. Run k6 student session, exam discovery, results, and analytics scenarios.
3. Test long attempt session resilience.
4. Validate retry/error UX for backend outages.
5. Validate database query performance on seeded realistic data.

Exit evidence:

- Performance report with thresholds.
- Long-session pass evidence.
- Capacity recommendation.

## Phase 7: Release Certification

Priority: P0

Actions:

1. Re-run P0 smoke.
2. Re-run security isolation pack.
3. Re-run failed-defect regression pack.
4. Build web/mobile/backend artifacts.
5. Validate deployment services and nginx config.
6. Produce signed release readiness report.

Exit criteria:

- Zero open P0.
- No unresolved P1 affecting core learning, assessment, payment/economy, auth, or data privacy.
- Current passing execution evidence attached.
- Rollback plan documented.

## Recommended Immediate Sequence

1. Resolve backend route-source mismatch.
2. Reproduce the failed full-access lifecycle.
3. Fix exam assignment/visibility for newly provisioned students.
4. Run P0 smoke only.
5. Expand to role-scope and API contract tests.
6. Then run broad module/visual/performance certification.
