# Admin Page Status Board

Last updated: 2026-07-12

## Purpose

This board lists every admin page route from the app router and gives a current status based on:

- page implementation presence
- matching Playwright coverage
- whether the route was rerun and verified in the latest admin pass
- known open observations

## Status Legend

- `Verified now`: rerun in the latest browser pass and behaving as expected
- `Covered`: route has clear Playwright coverage, but was not rerun in the latest pass
- `Partial`: route has some proof, but confidence is still thinner than the main admin lanes
- `Needs refresh`: code is fixed, but an older local build may still be serving stale behavior
- `Gap`: route exists but current proof is weak or missing

## Admin Route Board

| Route | Page file | Current status | Main proof | Latest note |
| --- | --- | --- | --- | --- |
| `/admin` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/page.tsx) | `Verified now` | [admin-dashboard-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-dashboard-workspace.spec.ts), [admin-dashboard-redirect.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-dashboard-redirect.spec.ts) | Dashboard hub flow rerun on `3104` and passed |
| `/admin/dashboard` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/dashboard/page.tsx) | `Verified now` | [admin-dashboard-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-dashboard-workspace.spec.ts), [admin-dashboard-api-audit.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-dashboard-api-audit.spec.ts) | Verified dashboard focus and governance handoff flow on `3104` |
| `/admin/institutes` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/institutes/page.tsx) | `Verified now` | [admin-institutes-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institutes-workspace.spec.ts), [admin-institutes-crud-guardrails.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institutes-crud-guardrails.mutable.spec.ts), [admin-institutes-api-audit.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institutes-api-audit.spec.ts) | Verified on `http://localhost:3104`; fixed institute URL-sync bug and hardened location-catalog crash path. `3002` may still show stale behavior until rebuild/restart |
| `/admin/people` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/people/page.tsx) | `Verified now` | [admin-people-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-people-workspace.spec.ts), [admin-people-crud-guardrails.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-people-crud-guardrails.mutable.spec.ts), [admin-form-validation-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-form-validation-browser-coverage.spec.ts) | Verified workspace flow on `3104`; duplicate create/edit guardrails are green in browser coverage pack |
| `/admin/academic-setup` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/academic-setup/page.tsx) | `Verified now` | [admin-academic-setup-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-academic-setup-workspace.spec.ts), [admin-academic-setup-crud-guardrails.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-academic-setup-crud-guardrails.mutable.spec.ts), [admin-academic-setup-api-audit.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-academic-setup-api-audit.spec.ts) | Verified section switching and defaults inspection on `3104`; overlap validation already covered in browser validation pack |
| `/admin/economy` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/economy/page.tsx) | `Verified now` | [admin-economy-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-workspace.spec.ts), [admin-economy-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-browser-coverage.spec.ts), [admin-economy-api-audit.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-api-audit.spec.ts) | Rerun on `3104`; browser coverage passed and workspace spec was refreshed to match current package-lane and support-view behavior |
| `/admin/exams` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/page.tsx) | `Verified now` | [admin-exams-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exams-workspace.spec.ts), [admin-exams-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exams-browser-coverage.spec.ts), [admin-exams-api-audit.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exams-api-audit.spec.ts) | Rerun on `3104`; exams list/browser coverage and handoff flow both passed |
| `/admin/exams/new` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/new/page.tsx) | `Verified now` | [admin-exams-create-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exams-create-workspace.spec.ts), [admin-exams-create-guardrails.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exams-create-guardrails.mutable.spec.ts), [admin-exam-creation-wizard-matrix.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts) | Rerun on `3104`; create-exam wizard workspace flow passed |
| `/admin/exams/[examId]` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/[examId]/page.tsx) | `Verified now` | [admin-exam-detail-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-detail-workspace.spec.ts), [admin-exam-detail-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-detail-mutable.spec.ts), [admin-exam-slot-api-audit.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-slot-api-audit.spec.ts) | Rerun on `3104`; detail route passed after updating the access-policy selector to current `commercial_path` naming |
| `/admin/exams/[examId]/builder` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/[examId]/builder/page.tsx) | `Verified now` | [admin-exam-builder-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-builder-workspace.spec.ts), [admin-exam-builder-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-builder-mutable.spec.ts) | Rerun on `3104`; builder handoff flow passed via detail-route verification bundle |
| `/admin/exams/advanced` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/advanced/page.tsx) | `Verified now` | [admin-advanced-builder-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts), [admin-exam-creation-advanced-matrix.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts) | Rerun on `3104`; workspace inspection and preview-failure negative path both passed after making the setup discover live scope instead of assuming seeded labels |
| `/admin/exams/preset-packs` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/preset-packs/page.tsx) | `Verified now` | [admin-preset-pack-library.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-preset-pack-library.spec.ts), [admin-preset-pack-library-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-preset-pack-library-mutable.spec.ts) | Rerun on `3104`; preset-pack defaults and library handoff flows both passed |
| `/admin/reports` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/reports/page.tsx) | `Verified now` | [admin-reports-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-reports-workspace.spec.ts), [admin-reports-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-reports-browser-coverage.spec.ts), [admin-reports-api-audit.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-reports-api-audit.spec.ts) | Rerun on `3104`; reports browser coverage and workspace navigation/filter flow both passed |
| `/admin/search` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/search/page.tsx) | `Verified now` | [admin-search-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-search-workspace.spec.ts), [admin-search-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-search-browser-coverage.spec.ts), [admin-search-api-audit.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-search-api-audit.spec.ts) | Rerun on `3104`; search browser coverage and workspace handoff flow both passed |
| `/admin/security` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/security/page.tsx) | `Verified now` | [admin-security-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-security-workspace.spec.ts), [admin-security-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-security-browser-coverage.spec.ts), [admin-security-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-security-timing.spec.ts) | Rerun on `3104`; security browser coverage and workspace watch/filter flow both passed |
| `/admin/settings` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/settings/page.tsx) | `Verified now` | [admin-settings-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-settings-workspace.spec.ts), [admin-settings-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-settings-browser-coverage.spec.ts), [admin-settings-crud-guardrails.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-settings-crud-guardrails.mutable.spec.ts) | Verified workspace flow on `3104`; invalid numeric guardrails are green in browser validation pack |

## Cross-Page Admin Proof Added In The Latest Pass

These checks are not limited to one page, but materially improved admin confidence:

- [admin-form-validation-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-form-validation-browser-coverage.spec.ts)
  - `7 passed`
  - institute required fields
  - institute duplicate code rejection
  - academic year overlap rejection
  - settings invalid numeric limits rejection
  - teacher duplicate create/edit rejection
  - student duplicate create/edit rejection

## Current Honest Read

- Strongest currently verified admin lanes:
  - `dashboard`
  - `institutes`
  - `people`
  - `academic-setup`
  - `economy`
  - `exams`
  - `exam create`
  - `exam detail`
  - `exam builder`
  - `advanced builder`
  - `preset packs`
  - `reports`
  - `search`
  - `security`
  - `settings`
- Main operational note:
  - `http://localhost:3002` is likely serving an older build
  - `http://localhost:3104` reflects the latest source changes and is the right local route for validation until `3002` is rebuilt/restarted
