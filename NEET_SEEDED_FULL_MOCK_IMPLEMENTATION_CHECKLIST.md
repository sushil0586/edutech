# NEET Seeded Full Mock Implementation Checklist

## Purpose

This checklist defines the next concrete confidence-upgrade lane for NEET:

- one dedicated seeded NEET full mock
- one reproducible student attempt path
- one cross-role verification path
- one focused manual QA pass for serious mock usage

This document assumes:

- family Phase 0-1 work is already complete
- mixed-subject exam support is already live
- cross-role generic and mixed-subject coverage already exists

The goal is not to prove “competitive exams in general”.
The goal is to prove one realistic NEET-style lane deeply enough that we can increase NEET production confidence.

References:

- [SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md:1)
- [SCHOOL_NEET_JEE_ROLE_CONFIDENCE_SUMMARY.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_ROLE_CONFIDENCE_SUMMARY.md:1)
- [NEET_JEE_GRE_AWS_EXAM_FAMILY_HARDENING_PLAN.md](/Users/ansh/Documents/Eductech/NEET_JEE_GRE_AWS_EXAM_FAMILY_HARDENING_PLAN.md:1)
- [EXAM_CREATION_SCENARIO_CATALOG.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/EXAM_CREATION_SCENARIO_CATALOG.md:1)

## Target Outcome

After this lane is complete, we should be able to say:

- NEET has one explicit full-mock seeded scenario
- NEET full-mock behavior is proven across admin, institute, teacher, and student
- student runtime, summary, results, and review posture are validated against a serious mixed-subject mock
- leaderboard and publication behavior are intentionally verified for the NEET lane

## Scope

### In scope

- seeded NEET full mock
- seeded NEET practice or companion revision scenario if needed
- cross-role Playwright coverage on seeded data
- manual QA for long-attempt and small-screen comfort
- result and leaderboard validation on the seeded NEET flow

### Out of scope

- full analytics redesign for NEET
- new question engine work unless required by the seed
- JEE-specific numeric-entry work
- GRE or AWS follow-up

## Section A. Seed Design

### A1. Create one canonical seeded NEET full mock

- `Done` final exam code: `DMO-NEET-FULL-01`
- `Done` final exam title: `Demo NEET Full Mock 01`
- `Done` source owner: teacher-owned with cross-role visibility
- `Done` lifecycle target:
  - one discoverable/live version
  - one attemptable student path
  - one published result path via `DMO-NEET-RESULT-01`

### A2. Lock section structure

- `Done` final section structure
- current shape:
  - Physics
  - Chemistry
  - Biology

If product wants stricter realism later, Biology can evolve into:

- Botany
- Zoology

But do not delay the seed on that split if it adds churn.

### A3. Lock baseline runtime posture

- `Done` exam type: `mock_exam`
- `Done` duration: `180 minutes`
- `Done` navigation posture: section-timed sequential full mock
- `Done` result policy:
  - live full mock uses controlled publish posture
  - result-ready mock uses published visibility for verification
- `Done` review policy:
  - controlled summary-first behavior is now explicitly validated

### A4. Seed minimum content set

- `Done` add clear questions per section
- current target:
  - 3 questions per section

That gives better runtime credibility than a one-question demo while still staying light enough for stable automation.

## Section B. Backend Seeding

### B1. Add or extend management command support

- `Done` added dedicated `seed_demo_neet_suite`

Recommended:

- dedicated seed helper if NEET-specific shape or reporting rules diverge
- extend existing suite only if the code stays clean and maintainable

### B2. Persist NEET family metadata cleanly

- `Done` seeded mock carries intended NEET metadata
- `Done` section subjects are stored at section level
- `Done` subject summary reads correctly across APIs used in automation

### B3. Seed learner-visible states

- `Done` one student-visible live exam
- `Done` one completed/published result for the same family lane
- `Partial` review-ready state if policy allows

## Section C. Cross-Role Automation

### C1. Student contract and lifecycle

- `Done` student seeded NEET contract spec
- `Done` student seeded NEET mutable lifecycle spec

Must validate:

- exam visible in catalog
- mixed-subject summary visible
- section cards visible
- start flow works
- save flow works
- submit flow works
- summary reflects intended release state
- results route reflects seeded NEET outcome correctly

### C2. Teacher oversight

- `Done` teacher seeded NEET oversight contract

Must validate:

- NEET exam visible in teacher scope
- mixed-subject label is correct
- readiness panels appear
- result status posture is correct
- section cards or section structure are visible
- leaderboard handoff works if expected

### C3. Institute oversight

- `Done` institute seeded NEET oversight contract

Must validate:

- exam visible in institute scope
- readiness and oversight surfaces are correct
- section and subject labeling are correct
- leaderboard handoff works if expected

### C4. Admin oversight

- `Done` admin seeded NEET oversight contract

Must validate:

- exam visible in admin oversight
- mixed-subject contract holds
- publish-readiness and result-readiness surfaces make sense
- section structure is visible

## Section D. Manual QA

### D1. Student exam-day comfort pass

- `Pending` test on small Android screen
- `Pending` test on iPhone-sized screen
- `Pending` verify long-attempt comfort
- `Pending` verify timer readability
- `Pending` verify section switching clarity
- `Pending` verify save confidence and submit confidence

### D2. Weak-network pass

- `Pending` verify login under weaker connectivity
- `Pending` verify exam detail load behavior
- `Pending` verify active attempt save behavior
- `Pending` verify post-submit summary/results loading behavior

### D3. Truthfulness pass

- `Pending` confirm no route promises result visibility too early
- `Pending` confirm no route promises answer review too early
- `Pending` confirm wording still feels like a serious mock, not a school drill

## Section E. Signoff Criteria

NEET seeded full-mock validation is complete when:

- one dedicated seeded NEET full mock exists
- admin, institute, teacher, and student routes all recognize it correctly
- student can complete a real attempt and land in the expected release state
- result and leaderboard posture are intentionally verified
- small-screen and weak-network manual QA does not surface major trust issues

## Recommended Execution Order

1. Run manual small-screen QA
2. Run weak-network QA
3. Validate NEET leaderboard/result posture more intentionally if needed for launch
4. Reassess NEET confidence

## Expected Confidence Shift

If this checklist is completed well:

- NEET should move from `moderate-high` toward `high`
- release confidence should stop relying mostly on generic mixed-subject proof
- we will have one explicit, product-real NEET lane instead of only adjacent evidence
