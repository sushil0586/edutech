# Operator Release-Gate Runbook

Last updated: 2026-07-12

## Purpose

This runbook defines the current high-signal browser release gate for operator-facing surfaces.

Right now that means:

- platform admin
- institute admin

The goal is to make pre-release verification repeatable with two commands:

1. a Chromium release-gate bundle
2. a Firefox/WebKit smoke bundle

## Current Commands

### 1. Operator Chromium Release Gate

Run this against the latest built app:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3007 \
PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 \
PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS=1 \
PLAYWRIGHT_ENABLE_MUTABLE_ACADEMIC_SETUP_ACTIONS=1 \
PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_ASSIGNMENT_ACTIONS=1 \
PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_COMPREHENSION_ACTIONS=1 \
npm run test:e2e:operator-release-gate
```

What it covers:

- admin workspace, forms, search, reports, security, exams, preset packs
- institute onboarding pack
- institute route-gap checks
- institute settings, search, security
- institute question-create and comprehension-import lanes
- institute mutable people, academic setup, teacher assignments, comprehension

Latest result on fresh build:

- `73/73 passed` on `http://localhost:3007`

### 2. Operator Cross-Browser Smoke

Run this after the Chromium gate passes:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3007 \
PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 \
npm run test:e2e:operator-cross-browser-smoke
```

What it covers:

- admin cross-browser shell sanity
- admin cross-browser deep routes
- institute cross-browser shell sanity
- institute cross-browser results routes

Projects:

- `firefox`
- `webkit`

Latest result on fresh build:

- `8/8 passed`

## Recommended Execution Order

1. Build the web app from latest code.
2. Start the built app on a clean port such as `3007`.
3. Run the Chromium operator release gate.
4. If green, run the cross-browser smoke.
5. Only treat operator surfaces as release-ready when both commands pass.

## Build And Start Reference

```bash
cd edutech_web
npm run build
PORT=3007 npm run start
```

## Pass Criteria

The operator release gate is considered healthy when:

- `test:e2e:operator-release-gate` passes fully
- `test:e2e:operator-cross-browser-smoke` passes fully
- no route regressions appear in admin or institute shell flows
- no mutable cleanup failures leave the demo environment dirty

## Failure Triage Order

If the Chromium gate fails:

1. check whether the running port is using the latest build
2. confirm required mutable flags were present
3. confirm demo institute entitlement state still includes `QUESTION_BANK_BULK_IMPORT`
4. rerun the single failing spec first
5. rerun the full gate after the fix

If the cross-browser smoke fails:

1. isolate whether the issue is Firefox-only or WebKit-only
2. check for selector timing or engine-specific navigation behavior
3. prefer fixing the product or selectors in the dedicated cross-browser spec
4. rerun the smoke before re-running the full Chromium gate

## Current Confidence Read

Based on the latest fresh-build runs:

- admin confidence: about `9.7/10`
- institute confidence: about `9.6/10`
- operator surface release readiness: strong

## Not Covered By This Gate

This runbook does not yet cover:

- teacher-side release gate
- student-side release gate
- full cross-browser deep bundles beyond the current smoke scope
- performance budgets and API-audit gates

Those should remain separate execution tracks.
