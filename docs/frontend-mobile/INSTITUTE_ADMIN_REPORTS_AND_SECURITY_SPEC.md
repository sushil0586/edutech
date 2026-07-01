# Institute Admin Reports And Security Spec

## Purpose

This document defines the remaining institute oversight routes:

- `/institute/reports`
- `/institute/security`

These routes must stay aligned with:

- `NEXORA_INSTITUTE_ADMIN_MODULE_SOURCE_OF_TRUTH.md`
- `NEXORA_INSTITUTE_ADMIN_FRONTEND_FOUNDATION.md`
- `NEXORA_FINAL_IMPLEMENTATION_SOURCE_OF_TRUTH.md`

## Core Rule

These pages must use real backend capabilities that already exist.

Do not invent a second analytics backend or a fake security control plane in the frontend.

## `/institute/reports`

### Purpose

Give institute admins a consolidated operational reporting view across:

- exam volume
- attempt volume
- result readiness
- publishing backlog
- weak academic areas
- high and low performing students

### Backend Inputs

Use existing institute-safe summary APIs already used by teacher and institute result workspaces:

- teacher insight summary
- teacher result summary
- institute-scoped exam list

### What the page should answer

- how many exams are being tracked
- how many attempts exist across scoped exams
- what the average performance looks like
- which exams still have pending result publication
- which topics look weak at institute level
- which students are currently strongest and weakest

### UI contract

The page should contain:

- page header
- hero summary
- top KPI cards
- result publication backlog block
- exam performance block
- weak topic block
- student performance block

### Non-goals

Do not pretend this page supports:

- downloadable BI exports
- custom date-range analytics
- institute-authored reporting formulas

Those can come later when backend support exists.

## `/institute/security`

### Purpose

Give institute admins visibility into live and configured assessment security posture.

This is an oversight page, not a replacement for future security policy administration.

### Backend Inputs

Use existing exam and live-monitoring endpoints:

- institute-scoped exam list
- live monitor for a selected exam
- exam attempt monitoring data for a selected exam

### What the page should answer

- how many exams use each security mode
- how many exams currently rely on access keys
- which exam should be watched now
- how many attempts are currently in alert state
- which attempts have integrity pressure or auto-submit outcomes
- whether the current exam appears stable, watch-level, or intervention-heavy

### UI contract

The page should contain:

- page header
- security posture summary cards
- selected-exam watchlist with shared refresh bar
- recent integrity risk cards
- configuration overview for all scoped exams

### Non-goals

Do not pretend this page supports:

- policy editing outside exam configuration
- security event export
- audit log search
- device-control management

Those need separate backend contracts.

## Shared UI Rules

Both pages must:

- use the same institute shell
- use the same global CSS language as student and teacher
- stay sober and operational
- avoid placeholder copy once data is live
- link users back into exams and results for action
