# Operator Release Baseline Status - 2026-07-13

## Summary

The current core operator release bundles are green on the local stack.

Observed result set:

- `admin-core`: `55 passed`, `1 skipped`
- `institute-core`: `47 passed`
- `teacher-core`: `31 passed`

Total core operator result:

- `133 passed`
- `1 skipped`
- `0 failed`

This is a strong browser-automation baseline for the three main operator roles:

- platform admin
- institute admin
- teacher

## Commands Used

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:admin-core
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:institute-core
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:teacher-core
```

Reference command pack:

- [OPERATOR_RELEASE_REGRESSION_COMMAND_SET_2026-07-12](./OPERATOR_RELEASE_REGRESSION_COMMAND_SET_2026-07-12.md)

## What This Covers

### Admin core

- dashboard
- institutes
- people
- academic setup
- economy
- exams
- exam detail
- reports
- search
- security
- settings
- browser-truthfulness and API-audit depth where bundled

### Institute core

- dashboard
- people
- academic setup
- exams
- exam detail
- question bank
- question authoring entry
- question import
- comprehension import baseline
- reviews
- reports
- search
- security
- settings

### Teacher core

- dashboard
- exams
- exam detail
- search
- question authoring entry
- question import
- comprehension import baseline
- reviews
- results
- results analysis
- live results

## Important Fixes Included In This Baseline

These green runs include the recent regression fixes from this pass:

- institute question-bank reset and filter state now update truthfully in the shared workspace
- institute question-bank browser coverage assertions were aligned to the current UI copy and route behavior
- teacher exams workspace coverage no longer assumes the `Live` quick filter should always produce an empty state

## Confidence

Practical release confidence for the covered operator flows is high.

Recommended working view:

- `admin`: high confidence
- `institute`: high confidence
- `teacher`: high confidence
- combined operator-core confidence: roughly `85% to 90%` for the areas directly covered by these bundles

This is not the same as total product coverage. It is strong release confidence for the current automated operator baseline.

## About The One Skipped Test

The current admin core bundle reported `1 skipped`.

Treat that as non-blocking only if it is one of the following:

- role or environment gating
- intentionally conditional data-shape coverage
- a known non-critical branch that does not affect the release decision

Before final signoff on a release candidate, the skipped test should still be identified from the HTML report and recorded in the release notes so the skip reason is explicit.

## What Is Still Outside This Baseline

The following are not fully proven by these three green core bundles alone:

- mutable write-heavy flows outside the core packs
- student role full release confidence
- mobile coverage packs
- cross-browser packs
- stage timing and performance benchmarks
- load and concurrency behavior
- infrastructure scaling assumptions
- unusual data-shape edge cases
- long-running lifecycle scenarios such as repeated edits, archival churn, or recovery after partial setup mistakes

## Release Recommendation

Current recommendation:

- safe for operator-focused pilot progression
- safe for continued onboarding, governance, and daily workspace validation on the covered roles
- not yet a complete substitute for student release validation, mutable regression, mobile, or load validation

## Suggested Next Checks

For broader signoff, run these after the current green baseline:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:operator-core
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:teacher-mutable-core
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:operator-mobile-pack
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:stage-performance
```

If release scope includes student readiness or peak exam windows, also pair this baseline with:

- student release bundle validation
- load-test execution from `performance/k6`
- a short staged UAT pass on fresh seeded data

## Bottom Line

As of `2026-07-13`, the core operator browser release baseline is green and dependable for the covered `admin`, `institute`, and `teacher` surfaces.

This is a good point to freeze a baseline, continue pilot operations, and expand confidence outward with mutable, student, mobile, and load-focused validation.
