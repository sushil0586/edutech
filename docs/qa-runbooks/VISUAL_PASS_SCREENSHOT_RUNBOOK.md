# Visual Pass Screenshot Runbook

Last updated: 2026-07-09

## Purpose

Run a repeatable visual pass across the main role-based screen inventory and save full-page screenshots for review.

This is for:

- layout sanity review
- copy and hierarchy review
- visual regression baselining
- stakeholder screen review without manual clicking through every route

## Current harness

Playwright spec:

- [route-visual-pass.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/route-visual-pass.spec.ts)

Manifest:

- [visual-pass-manifest.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/helpers/visual-pass-manifest.ts)

Output folder:

- `edutech_web/artifacts/visual-pass/<role>/<screen>.png`
- mobile mode writes to:
  - `edutech_web/artifacts/visual-pass-mobile/<role>/<screen>.png`

## Default route coverage

Current first-pass inventory covers the main screen routes for:

- anonymous
- admin
- teacher
- institute
- student

This is intentionally the screen-level pass first, not every dynamic entity-detail route yet.

## Run commands

Full visual pass:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_ENABLE_VISUAL_PASS=1 npx playwright test tests/e2e/workflow/route-visual-pass.spec.ts --project=chromium
```

Single-role visual pass:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_ENABLE_VISUAL_PASS=1 PLAYWRIGHT_VISUAL_PASS_ROLE=admin npx playwright test tests/e2e/workflow/route-visual-pass.spec.ts --project=chromium
```

Mobile visual pass:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_ENABLE_VISUAL_PASS=1 PLAYWRIGHT_VISUAL_PASS_MOBILE=1 npx playwright test tests/e2e/workflow/route-visual-pass.spec.ts --project=chromium
```

## Notes

- the harness uses the normal Playwright role credentials and login helpers
- screenshots are full-page captures
- the run waits for the main route shell plus route-specific headings or text before capture
- mobile mode currently uses a phone-sized viewport of `390x844`
- if you want deeper device realism later, add a dedicated Playwright mobile project with mobile user agent and touch emulation

## Recommended next expansion

After the first screen-level pass is stable, expand into:

1. detail routes with seeded ids
2. modal/dialog states
3. mobile viewport captures
4. cross-browser visual samples
