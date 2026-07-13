# Teacher And Institute CRUD Branch Gap Checklist

This checklist captures the remaining frontend e2e gaps after the current admin, institute, teacher, and student browser coverage review.

## What Already Looks Strong

- Teacher exam creation, detail, builder, advanced builder, slot management, results, reviews, search, and question-bank coverage.
- Institute onboarding, roster, exams, exam detail, question bank, shared-library linking, results, reviews, economy, settings, and search coverage.
- Shared-library and entitlement behavior is already tested from both teacher and institute perspectives.
- Mutable CRUD coverage exists for exams, questions, roster, assignments, imports, templates, and several result workflows.

## Highest-Value Remaining Gaps

### 1. Teacher And Institute Mobile CRUD Parity

Current mobile tests are mostly smoke or navigation oriented.

Add cases that confirm:

- Create flows still work on small viewports.
- Edit and save actions still render validation and success states.
- Archive and restore flows still behave correctly on mobile layouts.
- Question-bank, exam, and roster dialogs stay usable when the viewport is narrow.

Suggested tests:

- Teacher mobile authoring create/edit/remove coverage.
- Institute mobile question-bank and exam mutation coverage.
- Mobile parity for shared-library request/link actions.

### 2. Cross-Role Shared-Library Branches

The shared-library flows are covered, but the branch matrix can still drift when entitlements or publish readiness change.

Add cases that confirm:

- A teacher-visible row does not incorrectly appear institute-linkable.
- An institute-linked row does not remain requestable for teachers after entitlement state changes.
- Paused or exhausted entitlements surface the same blocker text across teacher and institute views.
- Revisit flows preserve the same shared-library state after a role switch.

Suggested tests:

- Teacher/institute shared-library role-difference regression.
- Shared-library entitlement pause and restore round-trip.
- Shared-library publish-readiness after entitlement change.

### 3. Slot And Capacity Branches

Slot-based exam behavior is one of the most important scale-control paths.

Add cases that confirm:

- Creating a slot shows the expected capacity fields and grace-period behavior.
- Capacity full states block starts consistently.
- Assignment override states still honor slot restrictions.
- Student-facing detail copy stays truthful when slot state changes.

Suggested tests:

- Teacher slot management with create, update, and delete coverage.
- Institute slot management with browser validation.
- Student detail regression for slot-capacity and missing-slot branches.

### 4. Settings And Preset Persistence

Settings and presets already have coverage, but the save/revisit/restore path is still a common place for regressions.

Add cases that confirm:

- Changing defaults persists after navigation away and back.
- Restoring defaults returns the visible UI and backend state to the same baseline.
- Preset pack edits remain stable after refresh.

Suggested tests:

- Institute settings save/revisit/restore round-trip.
- Teacher and institute preset persistence round-trip.
- Admin preset pack baseline and mutation check.

### 5. Sparse Data And Recovery States

The hardest bugs usually appear when seed data is incomplete or partially missing.

Add cases that confirm:

- Empty or sparse rosters still show guided setup copy.
- Question-bank pages stay usable when a subject/topic mapping is incomplete.
- Onboarding recovery pages keep the same next-step guidance after partial progress.
- The UI still loads when a relevant linked resource is not present yet.

Suggested tests:

- Institute onboarding recovery and blank-onboarding follow-up.
- Question-bank sparse edit and linked-library recovery.
- Roster bootstrap with minimal academic context.

## Recommended Order

1. Mobile CRUD parity.
2. Shared-library branch differences.
3. Slot and capacity branches.
4. Settings and preset persistence.
5. Sparse data and recovery states.

## Definition Of Done

- Every flow above has at least one browser test that mutates state and verifies the restored state.
- Every role-specific branch that changes copy or available actions has at least one regression test.
- Each high-risk area has both a happy path and one blocked or alternate-state path.

