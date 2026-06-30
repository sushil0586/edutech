# Stage Pilot Fix Plan - 2026-06-28

This note converts the latest stage validation into a concrete fix and rollout plan for the next 2-3 institute pilot wave.

## Current Stage Status

- `platform admin` stage login and shell: working
- `teacher` stage login and shell: working
- `student` stage login and shell: working
- `institute admin` stage login: failing for the demo credential currently used by automation
- teacher shared-library publish-readiness stage proof: not established because required seeded inventory is not visible on stage
- mutable student attempt stage proof: partially established, but failed on exam availability state before the start CTA appeared

## Confirmed Working On Stage

- Admin login succeeds through `/api/v1/auth/login/`
- Teacher login succeeds through `/api/v1/auth/login/`
- Student login succeeds through `/api/v1/auth/login/`
- Admin smoke shell passed
- Teacher smoke shell passed
- Student smoke shell passed

## Confirmed Failures

### 1. Institute Demo Login Failure

- `demo-institute-admin / Demo@12345` is rejected on stage
- Direct backend response:
  - `400 {"detail":["Invalid credentials."]}`
- Effect:
  - institute smoke automation cannot proceed on stage with the current demo account

### 2. Student Exam Start CTA Missing For Mutable Teacher-Created Exam

- Teacher-created mutable exam reached student detail successfully
- Student detail page showed:
  - `This practice set has been assigned, but the window is not open yet`
  - disabled `Not Available Yet` button
- Effect:
  - full student start/resume/submit mutable flow is not yet proven on stage

### 3. Teacher Shared-Library Publish-Readiness Stage Preconditions Missing

- Both teacher shared-library mutable tests skipped on stage
- Skip reason:
  - `No teacher-visible linked shared-library question is available in local inventory.`
- Effect:
  - shared-library publish-readiness is not yet stage-proven

## Likely Root Causes

### 1. Institute Credential Drift

Most likely one of:
- the stage password for `demo-institute-admin` changed
- the account is inactive or locked
- the stage seed/bootstrap no longer guarantees that credential
- the demo institute user was manually modified

### 2. Student Start-Window Mismatch

Most likely one of:
- the mutable exam schedule saved in teacher builder is slightly ahead of current time on stage
- timezone conversion in builder `datetime-local` submission is pushing `start_at` into the future
- publish/schedule flow leaves the exam in a not-yet-open student availability state even though the test expects immediate start
- stage latency makes the student land on detail before backend lifecycle refresh catches up

### 3. Shared-Library Seed Incompleteness On Stage

Most likely one of:
- stage has not run the latest deterministic shared-library reset/seed workflow
- the teacher-visible linked paused-only inventory row exists locally but not on stage
- the required entitlement or linked local copy is absent for the teacher institute on stage

## Priority Fix Order

1. Restore institute-admin stage login
2. Fix or explain teacher-created exam start-window behavior on stage
3. Seed one deterministic teacher-visible shared-library linked question on stage
4. Re-run focused stage regression
5. Only then open wider institute pilot UAT

## Exact Fix Plan

### P0-1 Restore Institute Admin Stage Access

Actions:
- verify whether `demo-institute-admin` exists on stage
- confirm `is_active`, institute mapping, and password
- if needed, reset password back to `Demo@12345`
- if the account is stale, reseed or recreate the canonical demo institute admin

Validation:
- direct POST to `/api/v1/auth/login/` returns `200`
- institute smoke Playwright test passes

Acceptance criteria:
- institute dashboard opens
- institute smoke shell passes without credential overrides

### P0-2 Fix Student Start-CTA Availability Mismatch

Actions:
- inspect the teacher mutable test scheduling values written into `start_at` and `end_at`
- compare saved stage exam timestamps against current stage time and timezone
- confirm whether the student detail page is correctly reflecting backend state or whether the builder saved the wrong schedule
- if timing drift is the issue, make mutable test schedules explicitly open in the past by a safe margin and end in the future
- if backend lifecycle is the issue, inspect the student availability-state calculation and teacher publish path

Validation:
- create a fresh teacher exam on stage
- assign it to the demo student
- student detail page must show `Start` when the intended window is already open
- after start, attempt page must open and support resume/save/submit

Acceptance criteria:
- student mutable attempt stage test passes
- no disabled `Not Available Yet` CTA for an intentionally live teacher exam

### P0-3 Seed Shared-Library Teacher Stage Preconditions

Actions:
- run the deterministic shared-library reset/seed flow on stage
- verify at least one teacher-visible linked shared-library row exists in teacher question bank inventory
- verify its local linked copy, package, and entitlement all match

Validation:
- teacher shared-library publish-readiness spec no longer skips at inventory precondition
- stage teacher question bank shows one linked licensed copy in the relevant lane

Acceptance criteria:
- both teacher shared-library publish-readiness cases execute
- failures, if any, are runtime/product failures rather than skip/precondition gaps

## Recommended Regression After Fixes

Run these on stage:
- admin cross-browser shell sanity
- institute smoke shell
- teacher smoke shell
- student smoke shell
- student mutable attempt flow
- teacher shared-library publish-readiness mutable flow

## Pilot-Safe Scope Right Now

- Keep the first external pilot on known-good platform-created exams
- Do not rely on the stage demo institute admin account until it is repaired
- Treat teacher shared-library UAT as blocked until the deterministic seed state exists on stage
- Use one dry run per institute before student batches are invited

## Manual Checks Still Required After Fixes

- start exam
- resume exam
- submit exam
- summary visibility
- review visibility
- result visibility
- institute exam creation
- teacher exam creation
- package/entitlement-sensitive question-bank visibility

## Current Confidence Snapshot

- Platform admin on stage: `8.5/10`
- Teacher shell on stage: `8/10`
- Student shell on stage: `8/10`
- Institute admin on stage: `4/10` until demo login is repaired
- Student start/attempt lifecycle on stage: `6.5/10`
- Shared-library stage proof: `not yet established`
