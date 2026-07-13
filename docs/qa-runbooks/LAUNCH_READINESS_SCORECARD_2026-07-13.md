# Launch Readiness Scorecard

## Date

2026-07-13

## Overall View

Current state is strong for a controlled pilot launch and not yet fully relaxed for a broad public launch.

- Pilot launch confidence: **80-85%**
- Broad launch confidence: **65-70%**

## Scoring Scale

- 90-100%: very strong, low launch risk
- 80-89%: pilot-ready, manageable risk
- 70-79%: usable with guardrails
- below 70%: still needs hardening

## Role Scorecard

| Role | Confidence | Status | Notes |
| --- | --- | --- | --- |
| Platform admin | 85% | Pilot-ready | Strong workspace coverage and control surfaces; still needs final regression sanity after recent changes. |
| Institute admin | 82% | Pilot-ready | Broad CRUD and onboarding coverage is in good shape; some flows still need more end-to-end sweep under real data. |
| Teacher | 83% | Pilot-ready | Exam creation, builder, question bank, and results are well covered; live lifecycle and edge paths should still be rechecked. |
| Student | 76% | Guarded | Core flows are functional, but mobile, long-session, and attempt resilience still carry meaningful risk. |
| Parent | 78% | Guarded | Good visibility and settings flow, but this is still a smaller surface and should be kept in a limited rollout. |

## Surface Scorecard

| Surface | Confidence | Status | Notes |
| --- | --- | --- | --- |
| Admin shell and CRUD | 85% | Strong | Good browser coverage and workspace structure. |
| Institute onboarding and management | 82% | Strong | CRUD and onboarding paths are broad, but should still be validated with fresh real-data runs. |
| Teacher authoring and builder | 84% | Strong | Builder, question bank, and exam lifecycle are the most mature authoring areas. |
| Student attempt runtime | 76% | Needs care | Core path is there, but long-session, interruption, and mobile cases remain the main risk. |
| Student results and analytics | 78% | Good | Result visibility is solid; some review/pending transitions should remain under test. |
| Mobile student experience | 72% | Needs care | Mobile coverage exists, but it is the most likely area to reveal layout and timing issues. |
| Load and scale behavior | 70% | Needs care | Slot and capacity controls help, but real high-concurrency validation is still important. |

## What Looks Ready

- role shells and navigation
- admin/institute/teacher CRUD fundamentals
- exam creation and builder flow
- question bank browsing and import paths
- results and analytics workspaces
- shared auth/session handling

## What Still Needs Hardening

- student mobile attempt flow
- long session persistence and resume behavior
- full broad regression after the latest product changes
- production-like scale tests for slot-based exam access
- final cleanup of intermittent or skipped browser cases

## Launch Recommendation

Recommended next step:

1. run a focused pilot with controlled institutes and limited student load
2. keep guardrails on mobile, high-concurrency, and long-session exam windows
3. continue hardening the student surface before broad rollout

## Decision Summary

- Pilot launch: yes, with guardrails
- Broad launch: not yet

