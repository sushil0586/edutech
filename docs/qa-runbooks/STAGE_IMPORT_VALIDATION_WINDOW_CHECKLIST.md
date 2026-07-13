# Stage Import Validation Window Checklist

Last updated: 2026-07-07

## Purpose

Use this checklist during one controlled stage window for question-bank import validation.

This is intentionally narrower than the broader performance and browser checklists. It exists so an operator can run import validation without rediscovering:

- teacher import entitlement gaps
- institute import availability differences
- bulk-import preview/finalize cooldown behavior
- cleanup expectations for disposable finalize runs

Related documents:

- [BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md)
- [FILE_IMPORT_UPLOAD_PERFORMANCE_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FILE_IMPORT_UPLOAD_PERFORMANCE_RUNBOOK.md)
- [STAGE_BROWSER_PERFORMANCE_SECURITY_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_BROWSER_PERFORMANCE_SECURITY_CHECKLIST.md)

## Pre-Window Checks

- [ ] stage URL is confirmed
- [ ] stage deployment includes the latest import-path backend optimization
- [ ] one institute role account is working on stage
- [ ] one teacher role account is working on stage if teacher import will be validated
- [ ] institute import page is reachable on stage
- [ ] teacher import entitlement is confirmed if teacher mutable import is part of the window
- [ ] one operator is assigned to record timings and outcomes
- [ ] worker count stays at `1`
- [ ] no roster-import validation is running in the same short window

Recommended environment:

```bash
export PLAYWRIGHT_BASE_URL=https://learn.accerio.in
```

## Current Stage Constraints

Use these assumptions unless the stage environment has changed:

- institute import is currently available on stage
- teacher import is currently available on stage
- repeated import preview/finalize runs can skip because of `BulkImportRateThrottle`

## Latest Stage Snapshot

Observed on `2026-07-07`:

- institute import template/sample spec: `pass with live availability`
- teacher import template/sample spec: `pass with live availability`
- institute larger-row preview timing: `pass`
  - `25` rows: `874ms`
  - `100` rows: `1883ms`
  - `250` rows: `2379ms`
  - expanded follow-up sweep:
    - `25` rows: `942ms`
    - `100` rows: `1366ms`
    - `250` rows: `2384ms`
    - `500` rows: `3405ms`
  - repeatability sweep `A`:
    - `25` rows: `937ms`
    - `100` rows: `2355ms`
    - `250` rows: `2425ms`
    - `500` rows: `3511ms`
  - repeatability sweep `B`:
    - `25` rows: `938ms`
    - `100` rows: `1346ms`
    - `250` rows: `2363ms`
    - `500` rows: `3430ms`
- institute disposable finalize flow: `pass`
- teacher disposable finalize flow: `pass`
- institute dedicated `500`-row finalize timing: `pass`
  - preview `500`: `3946ms`
  - finalize `500`: `8750ms`
  - full run including cleanup: about `3.0m`
- first small two-user concurrency wave: `pass`
  - institute preview sweep in parallel:
    - `25` rows: `878ms`
    - `100` rows: `1855ms`
    - `250` rows: `2902ms`
    - `500` rows: `3900ms`
  - teacher disposable finalize in parallel:
    - about `9.6s`

Current best read:

- import availability is confirmed for both teacher and institute lanes
- current stage import performance is measurable and healthy through `500` preview rows
- short-window repeat sweeps stayed in the same broad range, so repeatability looks acceptable
- dedicated `500`-row finalize timing is also now available, so the lane is covered for both preview and finalize at larger batch size
- the first small two-user parallel wave also succeeded, so the next concurrency step can be bolder than a single extra smoke check
- the next remaining question is repeatability under more rows or denser repeated waves, not entitlement setup

## Execution Order

Run the steps in this exact order.

### 1. Institute Availability Check

```bash
cd edutech_web
PLAYWRIGHT_BASE_URL=https://learn.accerio.in \
./node_modules/.bin/playwright test tests/e2e/workflow/institute-question-import-export.spec.ts --project=chromium
```

Success means:

- institute import page is enabled
- template/sample downloads work
- preview guard UI is reachable

If this passes with logged `blocked-state` output:

- stop the window
- fix entitlement or stage seed configuration first

### 2. Institute Larger-Row Preview Timing

```bash
cd edutech_web
PLAYWRIGHT_BASE_URL=https://learn.accerio.in \
./node_modules/.bin/playwright test tests/e2e/workflow/institute-question-import-preview-timing.spec.ts --project=chromium
```

Success means:

- the stage window is open enough to measure preview at `25`, `100`, `250`, and `500` rows
- timing JSON attachment is produced by the spec

If this skips because of throttling:

- do not immediately rerun
- wait for cooldown
- rerun only this spec

### 3. Institute Disposable Finalize Flow

```bash
cd edutech_web
PLAYWRIGHT_BASE_URL=https://learn.accerio.in \
PLAYWRIGHT_ENABLE_MUTABLE_IMPORT_ACTIONS=1 \
./node_modules/.bin/playwright test tests/e2e/workflow/question-import-mutable.spec.ts --project=chromium --grep "institute can preview and finalize a disposable question import"
```

Success means:

- preview worked
- finalize worked
- disposable cleanup path worked

If this skips because of throttling:

- record that finalize is blocked by cooldown, not necessarily by product failure
- wait for cooldown before retrying

### 4. Teacher Disposable Finalize Flow

Only run this after the institute lane has been checked and there is enough cooldown spacing left in the window.

```bash
cd edutech_web
PLAYWRIGHT_BASE_URL=https://learn.accerio.in \
PLAYWRIGHT_ENABLE_MUTABLE_IMPORT_ACTIONS=1 \
./node_modules/.bin/playwright test tests/e2e/workflow/question-import-mutable.spec.ts --project=chromium --grep "teacher can preview and finalize a disposable question import"
```

If this skips:

- first assume cooldown unless the page clearly shows a blocked entitlement card
- do not treat cooldown classification as a product regression

## Cooldown Rule

If any run shows:

- `request was throttled`
- `expected available in N seconds`
- spec skip caused by import cooldown

then:

1. stop the next import run
2. wait for the reported cooldown plus a small safety buffer
3. rerun only the blocked import spec

Default fallback when no exact seconds are shown:

- wait `2` minutes before the next import preview/finalize run on the same role

## What To Record

For each run, record:

- [ ] date and time
- [ ] role used
- [ ] spec name
- [ ] result: pass / fail / skip
- [ ] row count if applicable
- [ ] preview time if available
- [ ] finalize time if available
- [ ] whether cooldown/throttle appeared
- [ ] whether cleanup succeeded

## Run Notes Template

Use this structure:

```text
Date:
Stage URL:
Commit/Build:

Run 1:
- Role:
- Spec:
- Result:
- Row count:
- Preview timing:
- Finalize timing:
- Throttle seen:
- Cleanup result:
- Notes:
```

## Decision Guide

- If institute preview timing succeeds at `25`, `100`, `250`, and `500` rows, move to finalize and compare browser-visible behavior with the local backend gains.
- If preview repeatedly skips because of cooldown, reschedule the window instead of concluding the product is slow.
- If institute finalize passes but teacher import is blocked, the remaining work is stage entitlement setup, not import-path correctness.
- If both teacher and institute finalize keep skipping after download coverage passes, schedule a cleaner throttle-spaced window instead of making more code changes first.
- If both preview and finalize are available and still feel slow, the next step is endpoint-level response timing on stage, not another blind frontend pass.
