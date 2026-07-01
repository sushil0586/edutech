# School, NEET, and JEE Device And Weak-Network Signoff Runbook

## Purpose

Use this runbook to execute the remaining manual signoff pass for:

- School
- NEET
- JEE

This runbook is for the student web and mobile-web experience on real browsers and small-phone viewports.

References:

- [SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md:1)
- [SCHOOL_NEET_JEE_ROLE_CONFIDENCE_SUMMARY.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SCHOOL_NEET_JEE_ROLE_CONFIDENCE_SUMMARY.md:1)
- [EXAM_FAMILY_OBSERVATIONS_AND_BUG_TRACKER.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/EXAM_FAMILY_OBSERVATIONS_AND_BUG_TRACKER.md:1)

## Session Info

- Date:
- Tester:
- Environment:
- Web commit or workspace snapshot:
- Browser:
- Device or viewport:
- Network condition:

## Seed Lanes To Use

### School

- use the standard student seeded flows already covered in the student workspace
- confirm at least one lane exists for:
  - available/startable exam
  - active attempt
  - submitted result
  - review-ready result where policy allows

### NEET

- student:
  - `demo-neet-student`
- seeded exams:
  - `DMO-NEET-FULL-01`
  - `DMO-NEET-RESULT-01`

### JEE

- student:
  - `demo-jee-student`
- seeded exams:
  - `DMO-JEE-FULL-01`
  - `DMO-JEE-RESULT-01`

## Devices And Viewports

Run at minimum on:

1. small Android viewport
2. iPhone-size viewport
3. desktop baseline

Suggested viewport targets:

- small Android:
  - `360 x 800`
- iPhone-size:
  - `390 x 844`
- desktop:
  - `1440 x 900`

## Current Automated Baseline

This does not replace manual signoff, but it reduces uncertainty before the real-device pass.

Primary replay command:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
npm run test:e2e:mobile-web
```

Combined baseline status:

- `2026-06-26`: `pass`
- suite result:
  - `7 passed`
  - includes generic student shell, NEET/JEE detail, NEET/JEE results, and fallback truthfulness routes on `390 x 844`

- `2026-06-26`:
  - `npx playwright test tests/e2e/workflow/student-mobile-sanity-workspace.spec.ts --project=chromium`
  - result: `pass`
  - coverage proven automatically at `390 x 844`:
    - mobile navigation shell
    - exams workspace reachability
    - exam detail reachability
    - attempts workspace reachability
    - results workspace reachability
- `2026-06-26`:
  - `npx playwright test tests/e2e/workflow/student-family-mobile-sanity.spec.ts --project=chromium`
  - result: `pass`
  - family-specific coverage proven automatically at `390 x 844`:
    - seeded NEET exam-detail reachability
    - seeded JEE exam-detail reachability
    - section overview visibility for NEET and JEE
    - family detail tags such as competitive timing and hybrid posture
- `2026-06-26`:
  - `npx playwright test tests/e2e/workflow/student-family-mobile-results-sanity.spec.ts --project=chromium`
  - result: `pass`
  - family-specific post-submit coverage proven automatically at `390 x 844`:
    - seeded NEET results reachability
    - seeded JEE results reachability
    - summary handoff from family result cards
    - truthful review-mode or review-unavailable handling on the review route
- `2026-06-26`:
  - `npx playwright test tests/e2e/workflow/student-mobile-state-panel-sanity.spec.ts --project=chromium`
  - result: `pass`
  - fallback truthfulness coverage proven automatically at `390 x 844`:
    - unavailable exam-detail route shows a truthful state panel
    - unavailable summary route shows a truthful load-failure state panel
    - unavailable review route shows a truthful review-unavailable state panel
    - all fallback routes keep a visible recovery CTA

Use that baseline as:

- a pre-flight check before manual QA
- a regression alarm for obvious small-screen route breakage

Do not use it as proof of:

- real-device touch comfort
- weak-network recovery quality
- long-attempt runtime comfort
- NEET or JEE family-specific trust signals

## Pass 1. School Core Signoff

### Routes To Validate

- login
- dashboard
- exams or mock-test discovery
- exam detail
- active attempt runtime
- summary
- results
- review when policy allows
- utility surfaces:
  - notifications
  - settings
  - wallet
  - subscriptions

### What To Confirm

- no hidden primary actions
- no clipped submit, continue, retry, or back CTAs
- empty states are truthful
- loading states are understandable
- error states expose a sensible retry or exit path
- active attempt remains readable on small screens
- summary, results, and review messaging matches backend policy

## Pass 2. NEET Seeded Full-Mock Signoff

### Core Flow

1. log in as `demo-neet-student`
2. open `DMO-NEET-FULL-01`
3. inspect exam detail, sections, and seriousness cues
4. enter the runtime
5. move through multiple questions and sections
6. verify progress, save-state, timer, and navigation comfort
7. inspect submit confirmation tone and clarity
8. inspect the published-result lane through `DMO-NEET-RESULT-01`

### NEET-Specific Checks

- Physics, Chemistry, and Biology structure feels believable
- section switching is clear and not cramped on small screens
- progress cues stay readable during a longer mock-style session
- result and leaderboard posture feels intentional rather than generic
- the mock flow still feels trustworthy under a high-stakes mindset

## Pass 3. JEE Seeded Full-Mock Signoff

### Core Flow

1. log in as `demo-jee-student`
2. open `DMO-JEE-FULL-01`
3. inspect exam detail and section structure
4. enter the runtime
5. move through both objective and numeric sections
6. validate timer, navigation, and save-state comfort
7. inspect submit confirmation and post-submit messaging
8. inspect the published-result lane through `DMO-JEE-RESULT-01`

### JEE-Specific Checks

- Physics, Chemistry, and Mathematics structure feels believable
- numeric-entry posture does not feel broken or misleading
- section and question density stay comfortable on small screens
- high-pressure pacing still feels understandable
- result and leaderboard posture matches the intended JEE lane promise

## Pass 4. Weak-Network Validation

Run this on School first, then repeat the same pattern on NEET and JEE.

### Conditions To Simulate

1. slow network
2. intermittent disconnect
3. full disconnect during non-runtime pages

### Routes To Validate Under Weak Network

- login
- dashboard load
- exams list
- exam detail
- attempts
- summary
- results
- review if accessible

### What To Confirm

- loading copy does not look frozen or falsely successful
- retry paths are visible
- student is not trapped in blank or looping states
- summary/results routes fail gracefully when data cannot load
- session loss or restore failure is understandable

Important note:

- do not intentionally destroy a real live attempt session unless the environment is safe for that validation
- for active runtime, prefer a controlled short disconnect check rather than risky destructive testing

## Pass 5. Long-Attempt Comfort Validation

Run this on the small Android and iPhone-size viewports.

### What To Validate

- timer remains readable
- previous and next actions stay easy to reach
- question switching remains comfortable over repeated use
- save-state confidence remains clear
- unsaved-draft or save-confirmation cues do not become noisy
- submit flow still feels calm and understandable after prolonged use

### Families To Cover

- School:
  - one representative runtime
- NEET:
  - seeded full mock
- JEE:
  - seeded full mock

## Result Recording Sheet

### School

- Desktop:
  - Pass / Fail
  - Notes:
- Small Android:
  - Pass / Fail
  - Notes:
- iPhone-size:
  - Pass / Fail
  - Notes:
- Weak network:
  - Pass / Fail
  - Notes:
- Long attempt:
  - Pass / Fail
  - Notes:

### NEET

- Desktop:
  - Pass / Fail
  - Notes:
- Small Android:
  - Pass / Fail
  - Notes:
- iPhone-size:
  - Pass / Fail
  - Notes:
- Weak network:
  - Pass / Fail
  - Notes:
- Long attempt:
  - Pass / Fail
  - Notes:

### JEE

- Desktop:
  - Pass / Fail
  - Notes:
- Small Android:
  - Pass / Fail
  - Notes:
- iPhone-size:
  - Pass / Fail
  - Notes:
- Weak network:
  - Pass / Fail
  - Notes:
- Long attempt:
  - Pass / Fail
  - Notes:

## Findings Template

### Blockers

1.
2.
3.

### High-Priority Hardening

1.
2.
3.

### Lower-Priority Polish

1.
2.
3.

## Signoff Rule

School, NEET, and JEE can move closer to `high confidence` only when:

- no major small-screen layout issue hides core actions
- weak-network behavior does not create misleading dead ends
- summary, result, and review policy remain truthful
- NEET and JEE seeded mocks feel comfortable enough for serious runtime use
