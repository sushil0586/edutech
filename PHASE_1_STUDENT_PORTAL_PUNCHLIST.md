# Phase 1 Student Portal Punch-List

## Purpose

This document tracks the practical hardening work for:

- Phase 1 `Student Portal Completion`

Reference:

- [NEXORA_GAP_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/NEXORA_GAP_IMPLEMENTATION_PLAN.md:248)
- [STUDENT_MODULE_QA_CHECKLIST.md](/Users/ansh/Documents/Eductech/STUDENT_MODULE_QA_CHECKLIST.md:1)

## Current Status

Phase 1 is in `hardening / validation` status.

The student portal is already functionally complete enough to build successfully, but it still needs final QA sign-off across real backend states.

## Validation Completed

### Web Validation

- `edutech_web` build passes with `npm run build`
- `edutech_web` lint passes with `npm run lint`

### Backend Validation

Targeted backend tests passed for:

- `apps.attempts.tests.test_attempt_workspace_api`
- `apps.results.tests.test_smoke_flow`

These were run successfully with the backend virtualenv and `--keepdb --noinput`.

## Fixes Completed In This Pass

### 1. Results Page No Longer Overpromises Review

Problem:

- the results workspace showed `Review Attempt` for any published result
- published result does not always mean review is available

Fix:

- added backend-computed `review_available` to the result serializer
- updated the student results page to show review only when the backend explicitly allows it
- published-but-review-locked states now stay truthful

Files:

- [apps/results/serializers/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/serializers/__init__.py:1)
- [results page](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/results/page.tsx:1)
- [student types](/Users/ansh/Documents/Eductech/edutech_web/src/features/dashboard/types.ts:1)

### 2. In-Progress Attempts No Longer Route Toward Post-Submit Summary

Problem:

- the attempt history page showed an `Attempt Summary` secondary action for in-progress attempts
- that wording is confusing because summary is a post-submit concept

Fix:

- changed the secondary action for active attempts to `Exam Detail`
- this keeps the student inside the active-exam workflow instead of nudging toward a post-submit route

Files:

- [attempts page](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/page.tsx:1)

### 3. Topbar No Longer Presents a Fake Search Input

Problem:

- the student workspace topbar showed a search input
- there is no real search implementation behind that control in the current MVP

Fix:

- replaced the fake input with a truthful workspace-shortcuts panel
- kept the topbar useful without implying a missing feature exists

Files:

- [app topbar](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/app-topbar.tsx:1)
- [global styles](/Users/ansh/Documents/Eductech/edutech_web/src/app/globals.css:1029)

## Remaining Phase 1 Checks

These still need real browser QA against live backend states:

- login/session expiry behavior
- no-assigned-exam state
- active attempt resume behavior
- result hidden vs published states
- review locked vs review available states
- notifications read actions
- analytics and weak-areas behavior with sparse or empty live data

## Remaining Phase 1 Risks

### 1. Manual Policy-State QA Still Pending

The portal is heavily policy-driven:

- result publication
- review availability
- attempt lifecycle

That means code-level review is not enough. We still need a browser pass with controlled backend states.

### 2. Teacher-Side Lifecycle Can Still Affect Student Perception

Student pages may look incomplete even when the frontend is correct if:

- the exam is not published
- no attempt exists
- result generation has not happened
- result publication has not happened
- review policy is restrictive

This is expected, but it means Phase 1 sign-off depends on realistic teacher-side state setup.

### 3. Full Backend Test Sweep Was Not Completed In This Pass

One targeted backend test slice passed cleanly.

An additional backend test run for `apps.accounts.tests.test_auth_access` was blocked by local test-database state reuse issues in the developer environment, not by a confirmed application failure.

## Recommended Next Steps

1. Run the route-by-route browser pass from [STUDENT_MODULE_QA_CHECKLIST.md](/Users/ansh/Documents/Eductech/STUDENT_MODULE_QA_CHECKLIST.md:118).
2. Validate at least these state combinations:
   - submitted + result hidden
   - published + review locked
   - published + review available
   - active attempt exists
3. Log any remaining Phase 1 blockers here before marking student sign-off complete.

## Exit Signal For Phase 1

Phase 1 can be marked complete when:

- browser QA passes for the student lifecycle
- no student route overpromises unavailable actions
- summary, results, and review stay consistent with backend policy
- no blocker-grade student issue remains open
