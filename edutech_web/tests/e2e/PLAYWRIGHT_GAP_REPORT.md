# Playwright Gap Report

Last updated: 2026-07-16

## Purpose

This document is the short answer to:

- what meaningful Playwright coverage gaps still remain
- which gaps are most worth automating next
- why those gaps matter more than simply adding more spec count

It is intentionally narrower than the broader coverage maps.

## Current suite shape

Current local inventory:

- `595` tests
- `369` spec files
- strong depth for admin, institute, student, and teacher desktop workflows
- meaningful mutable coverage for exam, question-bank, results, roster, and economy flows
- real mobile-web coverage, but concentrated more heavily on student and selected compact operator flows

This is already a large suite. The remaining work is mostly about risk concentration, not raw surface count.

## Top gaps to prioritize

## 1. Operator long-session and resume behavior

Current status:

- cross-role release-chain coverage now exists
- multi-role partial-distribution results coverage now exists for teacher, institute, and admin
- the highest remaining risk has shifted from basic lifecycle proof to state continuity on dense operator pages

Missing proof:

- tab-open drift
- stale filters after long idle periods
- edit dialogs surviving refresh or expired assumptions
- recovery after revisiting a previously active operator route

Why it matters:

- operator workspaces are dense and stateful
- a lot of recent coverage now proves the workflows themselves, but not their durability over longer sessions

Best next automation:

- admin economy session continuity
- institute results analysis continuity
- teacher question-bank and reviews continuity

## 2. Cross-browser mutation depth beyond a small proof pack

Missing proof:

- broader reversible write coverage in Firefox and WebKit
- not just shell sanity, route reachability, or a handful of mutation canaries

Why it matters:

- the suite already proves desktop reachability well across engines
- persistence bugs, focus bugs, and dialog issues often show up only on write flows

Best next automation:

- add a small per-role reversible mutation pack for Firefox and WebKit:
- admin exam-detail policy change
- institute teacher-assignment edit
- teacher draft-question edit
- student exam-key or practice preference persistence

## 3. Remaining backend-error negative-path depth outside admin economy

Current status:

- admin dense-form backend rejection coverage is materially stronger now
- current browser coverage includes admin people duplicate rejection, admin economy package and subscription-plan rejection, subscription-plan apply stale-target rejection, support grant and unlock stale-target rejection, and catalog-governance stale-item rejection

Missing proof:

- backend-error handling on institute-heavy dense forms
- teacher authoring/import failure surfaces
- order-confirmation and queue-review failure paths that do not depend on ambient seeded queue data

Why it matters:

- backend contract shifts still tend to fail first on mutation-heavy operator pages
- admin coverage is much better, but equivalent depth is still thinner elsewhere

Best next automation:

- institute exams negative-path pack
- teacher question create/import backend rejection pack
- admin support-ops order-confirmation rejection
- admin request-queue review rejection with deterministic disposable setup

## 4. Parent and operator role depth

Missing proof:

- meaningful role-specific workflows for parent and operator surfaces
- not just reachability or compact shell sanity

Why it matters:

- these roles currently have very light representation compared with admin, institute, teacher, and student
- low-spec-count roles are where hidden regressions can survive longest

Best next automation:

- parent progress/results review flow
- operator watchlist or support-task flow with one real action and one guarded action

## 5. Download and export contracts

Missing proof:

- stable assertions for downloaded files, filenames, content shape, and role-specific export correctness

Why it matters:

- several pages expose or imply export workflows
- route-level UI confidence is not the same as output correctness

Best next automation:

- roster export content smoke
- results export content smoke
- question import template/sample download assertions

## 6. Weak-network and recovery coverage outside student flows

Missing proof:

- retry, placeholder, partial-data, and recovery behavior on operator screens under degraded network conditions

Why it matters:

- student weak-network scenarios already exist in parts of the suite
- operator pages are often heavier and more failure-prone when multiple data panels race

Best next automation:

- admin reports degraded-load recovery
- institute question-bank slow/filter recovery
- teacher results analysis delayed-panel recovery

## 7. File import failure matrix

Missing proof:

- malformed CSV edge cases
- duplicate rows
- partial success summaries
- oversized payload or wrong-column mapping failures

Why it matters:

- import workflows are operationally risky
- current coverage proves useful happy paths and finalize flows, but failure matrices are thinner

Best next automation:

- one focused import error pack shared across admin, institute, and teacher import surfaces

## 8. Repeated-run stability evidence for broader packs

Missing proof:

- formal repeat stability on more than a few focused subsets
- especially for mutable and compact-viewport workflows

Why it matters:

- flake risk is a real coverage gap even when nominal assertions exist
- confidence should include stability, not just one-pass success

Best next automation:

- repeat the current smoke pack
- repeat one per-role mutable pack
- repeat one compact operator pack
- record pass counts and flake notes in the suite docs

## What not to prioritize first

Lower-value next work:

- adding more route-open-only specs for already well-covered pages
- adding more screenshot-only tests before error-path depth improves
- widening admin or institute page count without lifecycle chaining

These would increase spec count faster than confidence.

## Recommended next batch

If we want the highest confidence return for the next automation round, the best batch is:

1. one operator long-session continuity pack
2. one Firefox/WebKit reversible mutation pack
3. one backend-error pack outside admin economy
4. one import-failure matrix pack
5. one download/export contract pack

## Related docs

- [README.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/README.md)
- [ROLE_MODULE_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ROLE_MODULE_COVERAGE_MAP.md)
- [PAGE_ACTION_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/PAGE_ACTION_COVERAGE_MAP.md)
- [ADMIN_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ADMIN_CONFIDENCE_MATRIX.md)
