# School, NEET, and JEE Role Confidence Summary

## Purpose

This note summarizes current confidence for the three most important launch lanes:

- School
- NEET
- JEE

It is based on the current web platform behavior, seeded mixed-subject support, family-aware authoring defaults, and Playwright coverage already in the repo.

Use this document to answer:

- how confident we are by family
- how confident we are by role
- what is already proven
- what still blocks stronger release confidence

References:

- [NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md:1)
- [NEET_JEE_GRE_AWS_EXAM_FAMILY_HARDENING_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/NEET_JEE_GRE_AWS_EXAM_FAMILY_HARDENING_PLAN.md:1)
- [ROLE_MODULE_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ROLE_MODULE_COVERAGE_MAP.md:1)
- [EXAM_CREATION_SCENARIO_CATALOG.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/EXAM_CREATION_SCENARIO_CATALOG.md:1)

## Confidence Scale

- High:
  - major role flows are implemented
  - role surfaces are automated
  - lifecycle assumptions are mostly already proven with real seeded or mutable data
- Moderate-high:
  - the family is product-real and role-usable
  - important routes are covered
  - some family-specific depth is still inferred from generic or adjacent coverage
- Moderate:
  - authoring and base delivery are credible
  - the lane is not yet proven deeply enough for family-specific edge cases

## Overall Family Confidence

| Family | Overall confidence | Why |
| --- | --- | --- |
| School | High | This is still the strongest and most mature product lane. It has the broadest route depth, role depth, and real mutable lifecycle coverage. |
| NEET | Moderate-high | Family-aware authoring defaults exist, mixed-subject support is now real, and a dedicated seeded NEET full-mock lane is proven across student, teacher, institute, and admin. Remaining gap is final device/network QA plus deeper NEET-specific reporting confidence. |
| JEE | Moderate-high | JEE now has a dedicated seeded full-mock lane, hybrid runtime proof, numeric-section posture, and cross-role verification across student, teacher, institute, and admin. Remaining gap is deeper product confidence around broader JEE authoring/release expectations, not basic end-to-end viability. |

## Role-by-Role Confidence

| Family | Platform admin | Institute admin | Teacher | Student |
| --- | --- | --- | --- | --- |
| School | High | High | High | High |
| NEET | Moderate-high | Moderate-high | Moderate-high | Moderate-high |
| JEE | Moderate-high | Moderate-high | Moderate-high | Moderate-high |

## What Is Already Proven

### School

- Admin:
  - exam management, advanced builder, guided create, preset packs, academic setup, people, reports, security, economy
  - mutable exam creation, exam detail, builder, roster, templates, and learner handoff flows
- Institute:
  - exams, detail, builder, results, leaderboard, analysis, live monitor, reviews, reports, question bank, roster
  - mutable exam creation, result publication, leaderboard readiness, academic setup, and roster flows
- Teacher:
  - exams, detail, builder, question bank, results, leaderboard, analysis, reviews
  - mutable question authoring, exam lifecycle, review actions, and results publication flows
- Student:
  - dashboard, exams, exam detail, attempts, runtime, summary, review, results, practice, analytics, utility pages
  - mutable live attempt and published-result flows
  - cross-browser sanity and mobile web sanity

### NEET

- Family-aware defaults and guidance:
  - guided create and advanced builder surface family-specific defaults and authoring notes
- Mixed-subject capability:
  - one exam can now hold multiple subjects with subject ownership at section level
  - this is important for realistic NEET-style structure
- Dedicated seeded NEET full-mock lane:
  - backend seed command exists
  - backend seed test exists
  - one live full mock exists: `DMO-NEET-FULL-01`
  - one published result-ready mock exists: `DMO-NEET-RESULT-01`
  - dedicated NEET learner exists: `demo-neet-student`
- Cross-role seeded coverage:
  - student NEET full-mock contract
  - student NEET full-mock mutable lifecycle
  - teacher NEET oversight contract
  - institute NEET oversight contract
  - admin NEET oversight contract
- Delivery shape:
  - NEET now has explicit Physics/Chemistry/Biology full-mock proof instead of relying only on generic mixed-subject evidence

### JEE

- Family-aware defaults and guidance:
  - guided create and advanced builder family lanes are present
- Family persistence:
  - JEE family defaults are already persisted in guided authoring flows
- Dedicated seeded JEE full-mock lane:
  - backend seed command exists
  - backend seed test exists
  - one live full mock exists: `DMO-JEE-FULL-01`
  - one published result-ready mock exists: `DMO-JEE-RESULT-01`
  - dedicated JEE learner exists: `demo-jee-student`
- Cross-role seeded coverage:
  - student JEE full-mock contract
  - student JEE full-mock mutable lifecycle
  - teacher JEE oversight contract
  - institute JEE oversight contract
  - admin JEE oversight contract
- Delivery shape:
  - JEE now has explicit Physics/Chemistry/Mathematics proof
  - each subject has objective and numeric sections
  - hybrid timer/navigation and fullscreen posture are now validated intentionally

## Main Gaps Still Open

### School

School is the strongest lane, but not fully perfect.
Remaining gaps are mostly hardening and polish:

- more real-device mobile QA
- weak-network and long-attempt validation
- final empty/loading/error-state consistency pass
- additional visual and navigation polish from device testing

### NEET

NEET is now materially stronger, but these gaps still matter:

- deeper result/reporting proof:
  - rank, leaderboard, and review posture for NEET-specific expectations should be validated intentionally, not only through generic result flows
- stronger student-side exam-day QA:
  - long timed attempt comfort
  - section switching posture
  - calmer runtime behavior under mock-exam conditions

### JEE

JEE is no longer only generic or inferred, but a few meaningful gaps remain:

- broader authoring and release proof:
  - the seeded runtime lane is proven, but wider JEE-specific create-to-publish scenarios can still be hardened further
- numeric-entry policy depth:
  - current seeded proof covers numeric-answer sections, but richer JEE pattern expectations may still need additional scenario depth
- reporting and leaderboard expectations:
  - if the customer expects stronger JEE-specific interpretation or release nuance, that still needs a more explicit pass

## Honest Read On Production Confidence

### School

High confidence for web production use across roles.
This is the closest lane to “release with normal caution”.

### NEET

Moderate-high confidence.
If needed, this lane can move forward for controlled production or pilot use, especially if the current expectation is:

- full-length mock behavior
- multi-subject sections
- standard MCQ-heavy delivery

Confidence drops if the customer expects richer NEET-specific reporting or very exam-day-specific operational polish that has not been manually validated yet.
This confidence is now backed by a real seeded NEET mock and cross-role automation, not only adjacent competitive-exam coverage.

### JEE

Moderate-high confidence.
This lane is now product-real and cross-role proven for a seeded full-mock flow.
If the customer expects:

- multi-subject structure
- family-aware defaults
- hybrid timed exam delivery
- objective plus numeric section posture

then we are in decent shape.

If the customer expects:

- broader JEE authoring/release combinations
- exact institution-specific JEE pattern variants
- family-specific reporting nuance

then more product and QA work is still needed before calling it production-confident.

## Recommended Next Steps

### If the goal is safest launch ordering

1. School
2. NEET
3. JEE

### If the next execution sprint should focus on confidence gains

1. Run small-screen and weak-network manual QA on the seeded NEET full-mock flow
2. Validate NEET leaderboard/result posture more intentionally if ranking/review depth matters for launch
3. Expand JEE from the seeded runtime lane into broader authoring and release scenarios if launch scope needs that depth
4. Decide whether any additional JEE pattern variants are required beyond the current objective-plus-numeric seeded contract

## Bottom Line

- School: strong and release-ready with normal QA caution
- NEET: close, and now supported by a dedicated full-mock seeded lane plus cross-role automation
- JEE: now materially stronger and cross-role proven for the seeded lane, but still one step below School for total depth
