# Operator Release Regression Command Set - 2026-07-12

## Purpose

This command set turns the strong first-wave route coverage into repeatable release checks.

The goal is simple:

- one command for `admin`
- one command for `institute`
- one command for `teacher`
- one combined command for the full operator surface
- one opt-in mutable command for the new teacher comprehension finalize lane

These are release-regression commands, not exhaustive all-spec commands.

## Assumptions

- frontend is already running
- backend is already running
- `PLAYWRIGHT_BASE_URL` points to the active frontend
- `PLAYWRIGHT_API_BASE_URL` points to the active backend when needed
- role credentials are available through the existing Playwright auth defaults or env vars

Recommended local defaults:

```bash
export PLAYWRIGHT_BASE_URL=http://localhost:3006
export PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001
```

## Core Commands

### Admin core

```bash
npm run test:e2e:release:admin-core
```

What it covers:

- dashboard
- institutes
- people
- academic setup
- economy
- exams
- reports
- search
- security
- settings
- browser-truthfulness and API-audit depth where available

### Institute core

```bash
npm run test:e2e:release:institute-core
```

What it covers:

- dashboard
- people
- academic setup
- exams
- question bank
- question import
- comprehension import baseline
- reviews
- reports
- search
- security
- settings

### Teacher core

```bash
npm run test:e2e:release:teacher-core
```

What it covers:

- dashboard
- exams
- exam detail
- search
- question create
- question import
- comprehension import baseline
- reviews
- results

### Full operator core

```bash
npm run test:e2e:release:operator-core
```

Use this when we want one broader release-confidence run across all three operator roles.

## Opt-In Mutable Command

### Teacher mutable comprehension finalize lane

```bash
npm run test:e2e:release:teacher-mutable-core
```

What it proves:

- teacher comprehension CSV preview with valid academic codes
- finalize import
- imported detail visibility
- cleanup of the disposable imported passage

This command is intentionally separate because it performs real write operations.

## Suggested Release Order

### Fast signoff

```bash
npm run test:e2e:release:admin-core
npm run test:e2e:release:institute-core
npm run test:e2e:release:teacher-core
```

### Broader signoff

```bash
npm run test:e2e:release:operator-core
```

### Broader signoff with disposable write lane

```bash
npm run test:e2e:release:operator-core
npm run test:e2e:release:teacher-mutable-core
```

## Notes

- `admin` remains the densest governance and contract pack.
- `institute` is the broadest multi-surface operational pack.
- `teacher` is the best daily-role release pack for authoring and classroom-facing operations.
- the mutable teacher comprehension finalize lane is the only new first-wave write-path command added in this pass.

## Outcome

With these commands in place, release validation no longer depends on manually remembering dozens of spec files.

The operator surface now has:

- strong first-wave route coverage
- grouped role-based release commands
- one explicit opt-in mutable confirmation command for the newest finalize lane
