# Role Coverage Baseline - 2026-07-12

## Summary

This baseline separates two different kinds of coverage:

1. Browser surface coverage for the three operator roles in `edutech_web`
2. Python line coverage for the backend test suite in `edutech_backend`

These numbers should not be treated as the same thing.

- Browser surface coverage tells us how much of the user-facing route surface is exercised by Playwright.
- Backend line coverage tells us how much Python application code executed during backend tests.

## Browser Surface Coverage

These percentages are based on the currently implemented route-level release suites and cross-browser smoke coverage.

### Admin

- Routes inventoried: `16`
- Routes covered by current browser suites: `16`
- Surface coverage: `100.0%`

Covered route family:

- `/admin`
- `/admin/dashboard`
- `/admin/institutes`
- `/admin/people`
- `/admin/academic-setup`
- `/admin/economy`
- `/admin/exams`
- `/admin/exams/new`
- `/admin/exams/advanced`
- `/admin/exams/preset-packs`
- `/admin/exams/[examId]`
- `/admin/exams/[examId]/builder`
- `/admin/reports`
- `/admin/search`
- `/admin/security`
- `/admin/settings`

Validation signal:

- Fresh-build admin workflow bundle passed `43/43`
- Admin cross-browser/operator bundles were already green in prior verification

### Institute

- Routes inventoried: `30`
- Routes covered by current browser suites: `30`
- Surface coverage: `100.0%`

Covered route family:

- `/institute/dashboard`
- `/institute/academic-setup`
- `/institute/economy`
- `/institute/exams`
- `/institute/exams/new`
- `/institute/exams/advanced`
- `/institute/exams/preset-packs`
- `/institute/exams/[examId]`
- `/institute/exams/[examId]/builder`
- `/institute/people`
- `/institute/question-bank`
- `/institute/question-bank/import`
- `/institute/question-bank/linked`
- `/institute/question-bank/new`
- `/institute/question-bank/[questionId]`
- `/institute/question-bank/library-linker`
- `/institute/question-bank/comprehension/new`
- `/institute/question-bank/comprehension/import`
- `/institute/question-bank/comprehension/[passageId]`
- `/institute/results`
- `/institute/results/analysis`
- `/institute/results/attempts`
- `/institute/results/leaderboard`
- `/institute/results/live`
- `/institute/reviews`
- `/institute/reports`
- `/institute/search`
- `/institute/security`
- `/institute/settings`
- `/institute/teacher-assignments`

Validation signal:

- Operator/institute Chromium release gate passed `73/73`
- Operator cross-browser smoke passed `8/8`

### Teacher

- Routes inventoried: `20`
- Routes covered by current browser suites: `20`
- Surface coverage: `100.0%`

Covered route family:

- `/teacher/dashboard`
- `/teacher/exams`
- `/teacher/exams/new`
- `/teacher/exams/advanced`
- `/teacher/exams/[examId]`
- `/teacher/exams/[examId]/builder`
- `/teacher/question-bank`
- `/teacher/question-bank/import`
- `/teacher/question-bank/new`
- `/teacher/question-bank/[questionId]`
- `/teacher/question-bank/comprehension/new`
- `/teacher/question-bank/comprehension/import`
- `/teacher/question-bank/comprehension/[passageId]`
- `/teacher/results`
- `/teacher/results/analysis`
- `/teacher/results/attempts`
- `/teacher/results/leaderboard`
- `/teacher/results/live`
- `/teacher/reviews`
- `/teacher/search`

Validation signal:

- Teacher Chromium release gate passed `6/6`
- Teacher cross-browser smoke passed `4/4`

## Backend Line Coverage

Command used:

```bash
./.venv/bin/python -m coverage run --rcfile=.coveragerc manage.py test \
  apps.accounts.tests apps.academics.tests apps.attempts.tests apps.economy.tests \
  apps.exams.tests apps.institutes.tests apps.parents.tests apps.question_bank.tests \
  apps.reports.tests apps.results.tests apps.students.tests apps.teachers.tests \
  --keepdb --noinput -v 1
./.venv/bin/python -m coverage report --rcfile=.coveragerc
```

Result:

- Total statements: `17242`
- Missed statements: `5922`
- Backend line coverage: `65.7%`

Execution notes:

- Tests executed: `501`
- Final suite result: `501 passed`, `0 failures`, `0 errors`
- This is now a green backend baseline for the targeted multi-app suite

## Previous Failure Set Resolved

The earlier backend failures that were present during the first coverage run have now been fixed and rerun cleanly:

- `apps.accounts.tests.test_auth_access`
  - student assignment visibility / program-scope path
  - student availability resume metadata path
- `apps.accounts.tests.test_public_registration`
  - onboarding completion and referral reward flows
- `apps.academics.tests`
  - onboarding task count expectation
  - seeded topic count expectations (`102` vs expected `96`)
- `apps.attempts.tests.test_attempt_workspace_api`
  - question type definition contract path returns `None`
- `apps.exams.tests.test_assessment_family_contracts`
  - duplicate assessment family code setup issue
- `apps.question_bank.tests.test_assessment_family_contracts`
  - duplicate assessment family code setup issue

## How To Read This Baseline

Current practical interpretation:

- Admin browser coverage: very strong
- Institute browser coverage: very strong
- Teacher browser coverage: very strong
- Backend business logic coverage: moderate, with the targeted backend regression suite now green

This means UI workflow confidence is still the strongest signal for route behavior, while backend regression confidence is now materially stronger than the earlier failing baseline.

## Next Best Improvements

1. Raise backend line coverage beyond `65.7%`, especially in `apps.exams.services`, `apps.economy.services`, `apps.question_bank.filters`, and the profiling/management-command paths.
2. Add frontend unit or component coverage tooling if real line coverage is needed for `admin`, `institute`, and `teacher` React code.
3. Keep browser release gates as the main role-based confidence signal, and treat backend coverage as the deeper implementation signal.
