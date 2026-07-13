# Student And Mobile Release Baseline Plan - 2026-07-13

## Purpose

This plan extends the green operator baseline into the learner surface in the right order:

1. student desktop and tablet web first
2. student mobile-web next
3. native mobile validation after that

This order keeps the student release story honest. We should first prove the main learner workflows on the primary web product, then widen confidence to compact/mobile layouts, and only then classify the separate React Native app surface.

## Important Surface Split

There are two different student mobile surfaces in this repo family:

- `edutech_web`
  - browser-based student UI
  - mobile viewport coverage is handled by Playwright specs
- `nexora_student_mobile`
  - native React Native app
  - automation uses Maestro, not Playwright

Do not mix these into one pass/fail claim.

## Execution Order

### Phase 1: Student web core

Run:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:student-core
```

What it covers:

- dashboard
- exam discovery and exam detail
- exam-key access
- runtime attempt flow
- post-submit flow
- attempts history
- results
- result-state matrix
- review
- practice
- practice scope continuity
- analytics deep flow
- analytics scope continuity
- analytics timeline and compare continuity
- summary and review scope persistence
- utility and notifications surfaces
- family learner contract lanes

### Phase 2: Student mobile-web core

Run:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:student-mobile-core
```

What it covers:

- student mobile shell sanity
- family mobile sanity
- family mobile results sanity
- mobile state panel continuity
- mobile results and review workflow

### Phase 3: Native mobile app validation

Run from the native app project when that surface is in scope:

- `npm run maestro:student:exams`
- `npm run maestro:student:results`
- `npm run maestro:student:review`
- `npm run maestro:student:attempt`
- `npm run maestro:student:analytics`

Use these companion docs:

- [STUDENT_MOBILE_QA_CHECKLIST](./STUDENT_MOBILE_QA_CHECKLIST.md)
- [STUDENT_MOBILE_WEAK_NETWORK_RUNBOOK](./STUDENT_MOBILE_WEAK_NETWORK_RUNBOOK.md)

## New Release Commands

Added in `edutech_web/package.json`:

- `test:e2e:release:student-core`
- `test:e2e:release:student-mobile-core`

These are meant to do for the student surface what `admin-core`, `institute-core`, and `teacher-core` already do for operator roles.

## Recommended Interpretation

### If student-core passes

You can say:

- the main learner web surface is green on the covered desktop/browser flows
- student confidence is strong for the primary assessment lifecycle

### If student-mobile-core also passes

You can additionally say:

- mobile viewport behavior is green for the covered student web lanes
- compact-layout regressions are less likely on the browser-based student surface

### If native Maestro passes too

You can say:

- both browser-based mobile layouts and the native student app have current automation proof

## What Student-Core Does Not Replace

Even if `student-core` is green, it does not replace:

- mutable student write-path proof
- weak-network student realism
- long-session runtime stress
- timing and performance benchmarks
- load and concurrency proof
- native app validation

Those remain separate confidence layers.

## Best Next Commands

For the immediate next step, run in this order:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:student-core
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:student-mobile-core
```

If both pass, record:

- student web baseline status
- student mobile-web baseline status
- then decide whether native Maestro should be part of the current release gate or a separate mobile certification pass

## Bottom Line

Student should be expanded before general mobile claims.

The right progression is:

1. student web core
2. student mobile-web
3. native mobile app

That gives the cleanest and most defensible release narrative.
