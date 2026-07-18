# Release UI Checklist

Use this checklist before shipping a frontend-heavy release candidate.

## Core release pass

- Start the backend and frontend with the same seeded data used for Playwright.
- Run the combined release UI gate:

```bash
cd edutech_web
npm run test:e2e:release-ui
```

- Run the repeat stability proof when shared layout or continuity-sensitive workflow code changed:

```bash
cd edutech_web
npm run test:e2e:release-ui:repeat
```

- If you need to update only the desktop release baselines:

```bash
cd edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3001 \
PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 \
npx playwright test tests/e2e/workflow/release-ui-alignment-visual.spec.ts --project=chromium
```

- If you need to update only the mobile release baselines:

```bash
cd edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3001 \
PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 \
npx playwright test tests/e2e/workflow/release-ui-mobile-visual.spec.ts --project=chromium
```

- Run the broader screenshot inventory when layout changes touched shared surfaces:

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_VISUAL_PASS=1 \
PLAYWRIGHT_BASE_URL=http://localhost:3001 \
PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 \
npx playwright test tests/e2e/workflow/route-visual-pass.spec.ts --project=chromium
```

- Run the mobile screenshot inventory when shared shell, filters, or card layouts changed:

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_VISUAL_PASS=1 \
PLAYWRIGHT_VISUAL_PASS_MOBILE=1 \
PLAYWRIGHT_BASE_URL=http://localhost:3001 \
PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 \
npx playwright test tests/e2e/workflow/route-visual-pass.spec.ts --project=chromium
```

- Run the focused mobile release visual suite when the change touched responsive layouts or shared controls:

```bash
cd edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3001 \
PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 \
npx playwright test tests/e2e/workflow/release-ui-mobile-visual.spec.ts --project=chromium
```

## What to inspect manually

- Student:
  - `/app/practice`
  - `/app/attempts`
  - `/app/results`
  - live attempt runtime and review pages
- Teacher:
  - `/teacher/reviews`
  - `/teacher/results`
  - `/teacher/question-bank`
- Institute:
  - `/institute/reports`
  - `/institute/results`
  - `/institute/question-bank`
- Admin:
  - `/admin/reports`
  - `/admin/security`
  - `/admin/economy`

## Visual failure signals

- Filter controls and action buttons no longer share the same row rhythm.
- Primary and secondary buttons look oversized, stretched, or detached from their cards.
- Cards clip their copy, badges, or footer actions.
- Mobile stacks leave buttons wider than their container or push chips off-screen.
- Shared shell spacing changes across unrelated roles after one page-level CSS edit.

## Release decision rule

- Ship only when `npm run test:e2e:release-ui` is green and the manual scan shows no shared-layout drift on the core routes above.
- For shared layout or responsive CSS changes, require both focused suites:
  - `release-ui-alignment-visual.spec.ts`
  - `release-ui-mobile-visual.spec.ts`
