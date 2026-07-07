# File Import And Upload Performance Runbook

Last updated: 2026-07-06

## Purpose

Use this runbook to measure the performance of the file-import and upload family instead of treating it as one vague backlog item.

This module currently includes three different performance shapes:

1. roster CSV preview/finalize
2. question-bank CSV preview/finalize
3. attachment and response-artifact uploads

These need different treatment because:

- roster and question imports are preview/finalize mutation flows
- uploads are file-size and storage-path flows
- comprehension import has a different payload shape from question import

Related documents:

- [PERFORMANCE_MODULE_COVERAGE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PERFORMANCE_MODULE_COVERAGE_MATRIX.md)
- [FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)

## Current Coverage Status

### Covered now

- roster import finalize profiling
- question import preview/finalize profiling
- comprehension passage import preview/finalize profiling
- teacher and institute import route local frontend timing exists at a route-open level

### Still pending

- stage timing for real import preview/finalize on stage data
- controlled load tests against import endpoints
- attachment upload timing
- student response-artifact upload timing
- rich-text image upload timing

## Commands

### Roster import finalize profiler

```bash
cd /Users/ansh/Documents/Eductech/edutech_backend
./.venv/bin/python manage.py profile_roster_import_write_path --repeat 1 --rows 5
```

This covers:

- student roster finalize without login creation
- student roster finalize with login creation
- teacher roster finalize with login creation

### Question import profiler

```bash
cd /Users/ansh/Documents/Eductech/edutech_backend
./.venv/bin/python manage.py profile_question_import_write_path --repeat 1 --rows 5
```

This covers:

- comprehension import preview
- comprehension import finalize
- question import preview
- question import finalize

## First Local Baseline

On `2026-07-06`, with:

```bash
./.venv/bin/python manage.py profile_question_import_write_path --repeat 1 --rows 3
```

the first disposable local baseline was:

- `preview_passage_import`
  - `14.18ms`
  - `9` queries
- `finalize_passage_import`
  - `12.98ms`
  - `26` queries
  - `3` created rows
- `preview_question_import`
  - `12.31ms`
  - `12` queries
- `finalize_question_import`
  - `101.54ms`
  - `129` queries
  - `3` created rows

## Initial Read

### Healthy enough for now

- passage import preview
- passage import finalize
- question import preview

### Clearest hotspot

- question import finalize

The current signal says the expensive part of this family is not preview parsing but per-row finalize behavior for question creation.

That makes the next backend investigation likely focus on:

- repeated program/subject/topic resolution during finalize
- duplicate detection cost per row
- per-question tag creation and tag mapping
- master sync and notification side effects during import finalize

## First Optimization Pass

On `2026-07-06`, a local backend reduction pass was applied to `import_bulk_questions(...)`:

- program, subject, topic, and passage resolution now reuse finalize-scope caches
- question tags are prefetched and missing tags are bulk-created once per import
- institute questions are batch-inserted instead of saved one-by-one
- option rows and tag-map rows are batch-inserted
- master sync now reuses the preview option payload instead of re-querying question options
- explanation notification checks now short-circuit before resolving extra profile relations when explanation text already exists

With the same command:

```bash
./.venv/bin/python manage.py profile_question_import_write_path --repeat 1 --rows 3
```

the updated local measurement became:

- `preview_passage_import`
  - `7.71ms`
  - `9` queries
- `finalize_passage_import`
  - `8.07ms`
  - `26` queries
  - `3` created rows
- `preview_question_import`
  - `7.71ms`
  - `12` queries
- `finalize_question_import`
  - `54.17ms`
  - `71` queries
  - `3` created rows

### Improvement summary

- `finalize_question_import` query count dropped from `129` to `71`
- `finalize_question_import` elapsed time dropped from `101.54ms` to `54.17ms`
- passage import paths stayed stable

## Larger Local Scaling Baseline

On `2026-07-06`, the same disposable profiler was also run at higher row counts:

```bash
./.venv/bin/python manage.py profile_question_import_write_path --repeat 1 --rows 25
./.venv/bin/python manage.py profile_question_import_write_path --repeat 1 --rows 100
./.venv/bin/python manage.py profile_question_import_write_path --repeat 1 --rows 250
```

### `25` rows

- `preview_passage_import`
  - `27.02ms`
  - `53` queries
- `finalize_passage_import`
  - `46.38ms`
  - `202` queries
- `preview_question_import`
  - `23.70ms`
  - `78` queries
- `finalize_question_import`
  - `177.88ms`
  - `533` queries

### `100` rows

- `preview_passage_import`
  - `74.08ms`
  - `203` queries
- `finalize_passage_import`
  - `137.78ms`
  - `802` queries
- `preview_question_import`
  - `85.91ms`
  - `303` queries
- `finalize_question_import`
  - `523.53ms`
  - `2108` queries

### `250` rows

- `preview_passage_import`
  - `149.94ms`
  - `503` queries
- `finalize_passage_import`
  - `354.06ms`
  - `2002` queries
- `preview_question_import`
  - `200.73ms`
  - `753` queries
- `finalize_question_import`
  - `1042.01ms`
  - `5258` queries

## Scaling Read

### What looks good

- raw elapsed time is still under control for disposable local runs even at `250` rows
- the first finalize optimization materially reduced the small-batch baseline
- no correctness failures showed up in the disposable runs

### What is still weak

- preview and finalize paths are still strongly query-linear
- question import finalize is still the dominant hotspot
- passage finalize is also query-heavy at larger row counts

### Main conclusion

The system is now fast enough to proceed with stage timing, but not yet efficient enough to claim that large imports are architecturally optimized.

The bigger remaining cost drivers likely include:

- per-row duplicate checks
- per-row preview academic resolution
- per-row passage existence checks
- post-insert master sync and notification side effects

This means stage timing is the right next validation step, but another backend reduction pass is still likely before concurrency testing.

## Suggested Next Workflow

1. Save the current reduced local baseline and larger-row scaling numbers.
2. Run stage timing for teacher and institute question import preview/finalize with realistic seeded data.
3. Compare stage results against the local `25`, `100`, and `250` row baselines.
4. Make one more backend reduction pass if stage latency or DB load is clearly high.
5. Add upload-specific measurement for attachments, inline rich-text images, and response artifacts.
6. Only after stage timing is stable, add controlled concurrency against import endpoints.

## Stage Timing Checklist

Use the next stage pass to measure:

- teacher question import preview at `25`, `100`, and `250` rows
- teacher question import finalize at `25`, `100`, and `250` rows
- institute question import preview at `25`, `100`, and `250` rows
- institute question import finalize at `25`, `100`, and `250` rows
- teacher comprehension import preview/finalize at `25` and `100` rows
- institute comprehension import preview/finalize at `25` and `100` rows

Capture for each run:

- browser-visible time
- backend route time if available
- database CPU / load if observable
- whether the user-facing flow stays responsive

## Stage Follow-Up

After local backend cleanup, revalidate:

- `/teacher/question-bank/import`
- `/institute/question-bank/import`
- `/teacher/question-bank/comprehension/import`
- `/institute/question-bank/comprehension/import`
- admin roster import preview/finalize

## Open Gaps

The following import/upload lanes still need dedicated performance instrumentation:

- question attachment upload
- rich-text inline image upload
- student response-artifact upload
- larger CSV payload stage timing
- concurrency safety for repeated import preview/finalize under throttle windows
