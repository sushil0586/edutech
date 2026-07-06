# Backend Analytics Performance Runbook

Last updated: 2026-07-05

## Purpose

Use this runbook to measure backend analytics performance changes as we harden:

- student question analytics
- student insight summary
- teacher insight summary

This runbook is for backend service-level profiling.

Use it together with:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [STAGE_PERFORMANCE_MONITORING_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_MONITORING_CHECKLIST.md)
- [BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md)

## What We Measure

For each analytics lane, measure:

- cold-cache elapsed time
- warm-cache elapsed time
- SQL query count
- payload size hint

Current supported lanes:

- `student_question_analytics`
- `student_insight_summary`
- `teacher_insight_summary`

## Prerequisites

1. Backend virtualenv is ready.
2. Demo or profiling users exist.
3. Seed data is loaded.

Recommended setup:

```bash
cd /Users/ansh/Documents/Eductech/edutech_backend
source .venv/bin/activate
python manage.py seed_demo_academic_data
```

Default demo users used by the profiler:

- `demo-student`
- `demo-teacher`

## Profiler Command

Run the analytics profiler:

```bash
./.venv/bin/python manage.py profile_analytics_services
```

Example with more repetitions:

```bash
./.venv/bin/python manage.py profile_analytics_services --repeat 5
```

Example with explicit usernames:

```bash
./.venv/bin/python manage.py profile_analytics_services \
  --student-username demo-student \
  --teacher-username demo-teacher \
  --repeat 5
```

Example with question-analytics filters:

```bash
./.venv/bin/python manage.py profile_analytics_services \
  --student-username demo-student \
  --teacher-username demo-teacher \
  --subject Mathematics \
  --source institute \
  --repeat 5
```

## How To Read Output

The command prints JSON with:

- `cold_runs`
- `warm_runs`
- `cold_summary`
- `warm_summary`

Focus on:

- `avg_elapsed_ms`
- `max_elapsed_ms`
- `avg_query_count`

Expected direction after a good hardening change:

- warm-cache elapsed time drops
- warm-cache query count becomes very low or zero
- cold-cache query count does not regress materially

## Suggested Baseline Workflow

1. Seed demo data.
2. Run the profiler and save the output as a baseline.
3. Make one hardening change.
4. Run the profiler again with the same usernames and repeat count.
5. Compare:
   - cold average
   - warm average
   - query count
6. If service-level improvement looks real, move to browser or stage validation.

Example:

```bash
./.venv/bin/python manage.py profile_analytics_services --repeat 5 \
  > /tmp/analytics-profile-before.json

# apply hardening change

./.venv/bin/python manage.py profile_analytics_services --repeat 5 \
  > /tmp/analytics-profile-after.json
```

## When To Escalate To Stage

Use stage or `k6` checks when:

- service-level profiling improves but UI still feels slow
- result dashboards are still inconsistent under populated data
- cache wins are not enough under real concurrency
- a route depends on more than one heavy backend call

Move to:

- [STAGE_PERFORMANCE_MONITORING_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_MONITORING_CHECKLIST.md)

## Current Priority Endpoints

These backend routes are the best next browser-level targets after service profiling:

- `GET /api/v1/student/analytics/questions/`
- `GET /api/v1/student/analytics/insight-summary/`
- `GET /api/v1/teacher/results/insight-summary/`
- `POST /api/v1/attempts/{id}/submit/`
- `POST /api/v1/results/generate-for-exam/`
- `POST /api/v1/results/publish-exam-results/`

## Good Review Questions

Ask these after each run:

- Did cold performance improve, or only warm-cache performance?
- Did query count go down for the intended lane?
- Did one lane improve while another regressed?
- Is the remaining bottleneck DB work, serialization, or cache miss cost?
- Do we now need indexing, precomputation, or async processing?

## Minimum Evidence For Confidence Upgrade

Before increasing confidence on the performance lane, we should have:

- service-level before/after profiler output saved
- no regression in the targeted smoke tests
- at least one stage or browser-level validation pass for the hottest route family
