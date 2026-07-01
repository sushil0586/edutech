# Student Mobile Pre-Device QA Status

## Objective

This note separates:

1. what is already evidenced in code and local validation
2. what still requires real-device execution
3. where the highest remaining student-mobile risk lives

Scope: `nexora_student_mobile` exam-first student lane.

## Local Validation Already Completed

- `npm run typecheck` passes
- exam-first student tabs exist:
  - dashboard
  - exams
  - attempts
  - results
  - analytics
  - profile
- attempt flow routes exist:
  - runtime
  - summary
  - review
- results and attempts lanes are wired to summary/review handoffs
- dashboard subject lane now truthfully scopes exam cards and recommendations
- exam detail has truthful blocked-state handling for:
  - locked
  - upcoming
  - attempt-exhausted
- weak-network messaging is stronger:
  - request timeout handling
  - clearer auth/bootstrap copy
  - clearer registration retry handling
- empty/loading/error states are now present across the major exam surfaces with retry or redirect CTAs

## Ready In Code

These are not a substitute for device testing, but the app shape is already present and coherent:

### Auth

- login validation exists
- registration validation exists
- role gate exists
- session restore exists
- bootstrap failure messaging exists

### Exam Journey

- exam browsing lane exists
- exam filters/search exist
- attempts lane exists
- results lane exists
- exam detail lane exists
- runtime exists
- summary exists
- review exists
- analytics exists

### Truthfulness

- locked exams are called locked
- pending publication is called pending
- review-ready results are called review-ready
- attempt exhaustion is called exhausted
- empty states usually point to the next sensible lane instead of dead-ending

## Still Requires Real Devices

These cannot be honestly signed off from code inspection alone:

### Small Android

- button crowding in hero action rows
- question runtime density
- long text wrapping in result/review cards
- tab bar comfort with exams, attempts, results, analytics, profile

### iPhone-Size Screen

- safe-area comfort at the bottom of long screens
- keyboard overlap on auth and written-answer fields
- runtime navigation comfort for previous/next/save controls

### Weak Network

- timeout copy appears at the right moments
- retries feel sufficient rather than repetitive
- student can recover cleanly after a failed exam/results/attempt load
- session restore under flaky connectivity does not create confusing loops
- offline cold-boot restore needs to be interpreted carefully because the current Expo Android dev build can fail at the bundle-loading layer before app UI boot

### Long Attempt

- timer remains readable after prolonged use
- question switching remains comfortable
- save-answer confidence remains high
- unsaved-draft protection does not feel overly heavy during repeated navigation

## Highest Remaining Risks

1. Small-screen density in the live attempt runtime.
2. Hero/action rows becoming crowded on smaller phones.
3. Real network behavior under intermittent connectivity, especially during restore and post-submit transitions.
4. Registration first-run experience when backend option loading is slow.
5. Distinguishing true restore UX issues from Expo dev-build boot limitations during offline cold starts.

## Current Honest Status

From a student-mobile product point of view:

- functionally strong
- exam journey broadly covered
- much more truthful than earlier iterations
- not yet fully beta-signed-off until device and network passes are executed

## Recommended Immediate Manual Order

1. Small Android pass on:
   - login
   - dashboard
   - exams
   - attempt runtime
   - summary
   - review
2. iPhone-size pass on the same flow
3. Weak-network pass on:
   - role gate
   - login
   - registration option loading
   - exams
   - results
   - attempt summary/review
   - session restore as a manual-only cold-boot check
4. Long-attempt pass on runtime only
