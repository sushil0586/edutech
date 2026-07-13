# Admin 3002 Smoke Rerun Pack

Date: 2026-07-12

## Purpose

Use this pack after rebuilding and restarting the app that serves `http://localhost:3002`.

Goal:

- confirm that `3002` matches the already-verified `3104` behavior
- rerun only the highest-value admin routes first
- catch stale-build drift quickly

## Preconditions

- backend is reachable at `http://127.0.0.1:9001`
- frontend is rebuilt and restarted on `http://localhost:3002`
- admin Playwright auth is working

## Highest-Value Smoke Pack

Run this first:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3002 \
PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 \
npx playwright test \
tests/e2e/workflow/admin-institutes-workspace.spec.ts \
tests/e2e/workflow/admin-people-workspace.spec.ts \
tests/e2e/workflow/admin-academic-setup-workspace.spec.ts \
tests/e2e/workflow/admin-economy-workspace.spec.ts \
tests/e2e/workflow/admin-settings-workspace.spec.ts \
tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts \
--project=chromium
```

Shortcut:

```bash
npm run test:e2e:admin:3002:smoke
```

## Why These Specs

This set gives the fastest confidence on the most important admin surfaces:

- `admin-institutes-workspace.spec.ts`
  - catches institute selection, URL sync, detail panel, and edit entry issues
- `admin-people-workspace.spec.ts`
  - covers roster filtering, exports, and create/import entry points
- `admin-academic-setup-workspace.spec.ts`
  - checks section switching and setup visibility
- `admin-economy-workspace.spec.ts`
  - checks the densest admin route and current operator defaults
- `admin-settings-workspace.spec.ts`
  - confirms governance handoff and policy surface
- `admin-advanced-builder-workspace.spec.ts`
  - checks the most sensitive exams-side admin builder flow

## Next-Layer Validation

If the smoke pack is green, run this second:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3002 \
PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 \
npx playwright test \
tests/e2e/workflow/admin-form-validation-browser-coverage.spec.ts \
tests/e2e/workflow/admin-reports-workspace.spec.ts \
tests/e2e/workflow/admin-reports-browser-coverage.spec.ts \
tests/e2e/workflow/admin-search-workspace.spec.ts \
tests/e2e/workflow/admin-search-browser-coverage.spec.ts \
tests/e2e/workflow/admin-security-workspace.spec.ts \
tests/e2e/workflow/admin-security-browser-coverage.spec.ts \
--project=chromium
```

Shortcut:

```bash
npm run test:e2e:admin:3002:validation
```

## Full Admin Route Confirmation

If both packs pass, `3002` is close to parity with current `3104` admin confidence.

Optional final pass:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3002 \
PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 \
npx playwright test \
tests/e2e/workflow/admin-dashboard-workspace.spec.ts \
tests/e2e/workflow/admin-exams-workspace.spec.ts \
tests/e2e/workflow/admin-exams-browser-coverage.spec.ts \
tests/e2e/workflow/admin-exams-create-workspace.spec.ts \
tests/e2e/workflow/admin-exam-detail-workspace.spec.ts \
tests/e2e/workflow/admin-preset-pack-library.spec.ts \
tests/e2e/workflow/admin-family-preset-packs.spec.ts \
--project=chromium
```

Shortcut:

```bash
npm run test:e2e:admin:3002:exams-confirm
```

## Expected Outcome

If the first smoke pack passes:

- `3002` is no longer obviously stale on the highest-risk admin routes

If the first and second packs pass:

- `3002` is likely aligned with current admin route confidence

If failures appear:

- compare whether the same spec already passed on `3104`
- if yes, treat it first as stale-build or environment drift
- if no, treat it as a fresh product issue

## Honest Recommendation

Do not start with the full suite on `3002`.

Start with the highest-value smoke pack above, because it gives the fastest signal on:

- stale frontend build
- missing latest code
- admin route regressions on the routes that matter most
