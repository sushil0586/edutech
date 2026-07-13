# Admin Confidence Snapshot

Date: 2026-07-12

## Current Confidence

- Admin-side route confidence on current verified build (`http://localhost:3104`): `8.8/10` to `9.2/10`
- Confidence that core admin flows work as intended in browser: `High`
- Confidence that every edge case is closed: `Medium-high`

## What Is Verified

The following admin route families are currently verified through browser automation on the latest dev build:

- `/admin`
- `/admin/dashboard`
- `/admin/institutes`
- `/admin/people`
- `/admin/academic-setup`
- `/admin/economy`
- `/admin/reports`
- `/admin/search`
- `/admin/security`
- `/admin/settings`
- `/admin/exams`
- `/admin/exams/new`
- `/admin/exams/[examId]`
- `/admin/exams/[examId]/builder`
- `/admin/exams/advanced`
- `/admin/exams/preset-packs`

## Why Confidence Is High

- Full admin route family was rerun or directly verified through browser coverage and workspace flows.
- Real issues were found and fixed during validation, not just test drift.
- Heavier admin surfaces such as institutes, people, economy, academic setup, and exams now have current proof on the live dev server.
- Negative-path validation was added for key CRUD guardrails:
  - institute duplicate code
  - academic year overlap
  - invalid numeric settings policy
  - teacher duplicate identity create/edit
  - student duplicate identity create/edit

## What Was Fixed During This Pass

- Institute workspace location-catalog crash hardening
- Institute `View` URL sync behavior when the selected row was already active
- Economy workspace stale assertions aligned to current operator defaults
- Exam detail access-policy test aligned to current `commercial_path` naming
- Advanced builder negative-path test stabilized against live scope data instead of brittle seeded labels

## What Still Keeps This Below 10/10

- Verified confidence currently applies to `http://localhost:3104`, not the older `3002` app instance.
- Some deep mutable flows still depend on data shape and environment state.
- Browser coverage is strong, but production-scale state combinations can still reveal issues outside current fixtures.
- Admin confidence is high for normal usage, but not yet a claim that no important edge case remains.

## Operational Warning

- `http://localhost:3104` reflects the latest source and current verified behavior.
- `http://localhost:3002` appears to be serving an older build.
- Do not treat `3002` as equally verified until it is rebuilt and restarted.

## Recommended Next Step

Before calling admin confidence fully environment-ready:

1. Rebuild and restart the app instance serving `3002`.
2. Rerun the highest-value admin smoke pack against `3002`.
3. Confirm that `3002` matches `3104` on:
   - institutes
   - people
   - economy
   - advanced builder
   - settings

## Honest Summary

- Admin browser confidence on latest dev build: `High`
- Admin pilot/UAT readiness: `Yes`
- Admin absolute edge-case completeness: `Not yet guaranteed`
