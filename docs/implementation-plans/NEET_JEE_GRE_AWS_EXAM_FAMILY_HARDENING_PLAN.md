# NEET JEE GRE AWS Exam Family Hardening Plan

## Purpose

This document turns four currently moderate-confidence exam families into an execution-ready hardening plan:

- NEET
- JEE
- GRE
- AWS certification

The goal is not to redesign the assessment engine from scratch.
The goal is to make these families explicitly productionized through:

- clearer product positioning
- family-aware authoring rules
- stronger runtime confidence
- better review and analytics fit
- concrete QA and automation coverage

## Why These Four

These four families are the best next expansion step because they already fit the current engine better than speaking-first or highly custom manual-evaluation products.

They are already partially represented in the product direction:

- preset-pack direction exists for NEET, JEE, GRE, and AWS
- timed objective-style delivery is already strong
- review, summary, results, and analytics foundations already exist
- mock, quiz, and practice structures are already real

Compared with IELTS, PTE, or TOEFL, these four do not depend first on:

- audio capture
- listening playback workflows
- speaking response artifacts
- transcript-assisted review

That makes them the highest-leverage non-school families to mature next.

## Current Honest Status

The family-definition and first-pass productization work is no longer only planned.
Across all four families we now have:

- canonical family metadata and preset-pack ownership
- guided-create and advanced-builder defaults
- family-aware authoring hints and validation posture
- one dedicated seeded runtime lane per family
- backend seed verification per family
- student, teacher, institute, and admin automation proof per family

## NEET

- strong conceptual fit
- objective/timed/mock delivery fits well
- section and high-stakes discipline fit well
- explicit seeded lifecycle proof now exists across student, teacher, institute, and admin
- still needs stronger NEET-shaped analytics and final device/runtime hardening

## JEE

- strong conceptual fit
- objective and numeric-style direction is partially acknowledged in preset messaging
- timing and mock discipline fit well
- explicit seeded lifecycle proof now exists across student, teacher, institute, and admin
- still needs broader numeric-entry and analytics depth beyond the current seeded contract

## GRE

- moderate conceptual fit
- timed multi-section exam structure fits the engine direction
- explicit seeded lifecycle proof now exists across student, teacher, institute, and admin
- still needs stronger score-storytelling, sectional reporting depth, and family-specific analytics

## AWS Certification

- moderate conceptual fit
- certification practice and objective reasoning fit the current engine well
- explicit seeded lifecycle proof now exists across student, teacher, institute, and admin
- still needs richer certification-domain reporting, review depth, and device-level hardening

## Phase 0. Family Definition Alignment

### Objective

Define the exact product contract for each family before expanding automation.

### Deliverables

- one canonical family metadata model for:
  - NEET
  - JEE
  - GRE
  - AWS certification
- per-family defaults for:
  - exam type
  - timing model
  - review policy
  - result visibility
  - security mode
  - recommended question mix
- one family-to-preset-pack mapping source of truth

### Key Questions To Lock

- is NEET primarily mock plus practice, or also sectional quiz
- is JEE expected to support numeric-entry behavior in Phase 1 of this family rollout
- does GRE require sectional score display or only total-score readiness first
- is AWS positioned as certification practice only, or also readiness assessment

### Exit Criteria

- no ambiguity remains about the intended learner journey for each family
- authoring, delivery, and analytics teams share the same family contract

## Phase 1. Authoring And Template Hardening

### Objective

Make family-specific exam creation feel intentional instead of generic.

### Deliverables

- family-aware preset packs with explicit defaults
- guided-wizard defaults per family
- advanced-builder presets per family
- authoring hints for:
  - recommended section structure
  - timing expectations
  - question-count ranges
  - security mode suggestions

### NEET / JEE Focus

- stronger mock-exam templates
- clearer section pacing defaults
- stricter exam-day style setup suggestions

### GRE Focus

- timed sectional templates
- more formal review and publish defaults

### AWS Focus

- single-section and domain-cluster certification templates
- clearer practice-first authoring path

### Exit Criteria

- admin and institute users can create a meaningful first draft for each family without guessing core settings

## Phase 2. Question-Type And Scoring Fit

### Objective

Close the biggest family-specific engine gaps without overextending into media-heavy products.

### Deliverables

- explicit coverage matrix for question types used by these four families
- registry-driven support review for:
  - single-correct objective
  - multi-correct objective
  - true/false
  - short-answer or numeric-entry variants
- scoring-rule review for:
  - full-mark only objective scoring
  - optional negative marking support
  - family-level attempt policy defaults

### Priority Notes

- NEET and JEE need the strongest review here because they are the most scoring-sensitive
- GRE needs stronger advanced-score roadmap definition even if scaled scoring is later-phase
- AWS can likely ship earlier with simpler objective scoring

### Exit Criteria

- each family has a documented allowed question-type profile
- no family depends on undocumented scoring assumptions

## Phase 3. Student Delivery Hardening

### Objective

Make the student-facing runtime and post-submit journey feel family-aware and trustworthy.

### Deliverables

- family-aware exam detail guidance
- family-aware start/resume messaging
- stronger attempt confidence for high-stakes mock flows
- family-aware summary messaging
- family-aware review availability messaging

### NEET / JEE Focus

- exam-day seriousness and timing clarity
- stronger confidence around submit and remaining-time cues

### GRE Focus

- section-completion and pacing clarity
- stronger post-submit status language

### AWS Focus

- certification-style readiness framing
- clearer recommendation handoff into review and weak-area follow-up

### Exit Criteria

- learners can tell what kind of assessment they are taking and what the expected flow is without backend knowledge

## Phase 4. Analytics And Reporting Fit

### Objective

Make outcomes meaningful for each family instead of reusing school-first language everywhere.

### Deliverables

- family-aware result copy
- family-aware dashboard and analytics terminology
- family-level weak-area framing
- stronger comparison lanes for mock-style and certification-style performance

### NEET / JEE Focus

- mock trend and topic pressure visibility
- stronger readiness framing

### GRE Focus

- sectional and pacing-oriented analytics roadmap

### AWS Focus

- domain-cluster readiness and concept-gap framing

### Exit Criteria

- analytics language no longer feels school-only when used for these families

## Phase 5. Seed Data And Content Readiness

### Objective

Create reproducible seeded states so QA and automation prove the right thing.

### Deliverables

- one seeded admin/institute family scenario per exam family
- one seeded student path per family for:
  - discoverable exam
  - live or startable attempt
  - completed result
  - review-ready result where policy allows
- tagged question-bank samples for:
  - NEET
  - JEE
  - GRE
  - AWS

### Exit Criteria

- automation does not rely on generic school-only seed assumptions for these families

## Phase 6. Automation And QA Expansion

### Objective

Turn family confidence from narrative into evidence.

### Web Automation Deliverables

- mutable creation matrix for family-tagged preset or builder flows
- student discovery and attempt validation for one seeded scenario per family
- result and review validation for one seeded scenario per family

### Mobile QA Deliverables

- Android verification for:
  - discover family exam
  - open detail
  - complete or inspect result path
- later iPhone parity once iOS build path is unblocked

### Manual QA Deliverables

- per-family launch checklist
- copy review for terminology mismatches
- review-policy truthfulness check

### Exit Criteria

- each family has at least one full create-to-student-to-results proof path

### Current Progress

- `Done` NEET seeded create-to-student-to-results proof path
- `Done` JEE seeded create-to-student-to-results proof path
- `Done` GRE seeded create-to-student-to-results proof path
- `Done` AWS certification seeded create-to-student-to-results proof path
- `Partial` manual device, weak-network, and broader content-variation proof still remain

## Recommended Build Order

1. AWS certification
2. NEET
3. JEE
4. GRE

## Why This Order

### AWS first

- lowest domain complexity among the four
- objective-heavy fit
- easiest path to a clean family-specific pilot

### NEET second

- strong engine fit
- high commercial value
- easier than GRE for scoring-model maturity

### JEE third

- close to NEET in structure
- likely needs slightly more care around numeric-style and difficulty expectations

### GRE fourth

- valuable, but more likely to expose advanced scoring and family-specific reporting gaps

## Risks

## Product Risks

- family branding becomes stronger than actual lifecycle readiness
- school-first terminology leaks into competitive or certification experiences

## Engine Risks

- question-type capability rules stay too generic
- scoring assumptions remain implicit

## QA Risks

- family coverage gets claimed through preset presence rather than end-to-end proof
- seeded data remains too school-centric

## Success Metrics

- each family has a stable create-to-attempt-to-result demo path
- learner-facing copy no longer feels generic across these families
- admins can create a family-aligned assessment with low setup ambiguity
- Playwright and manual QA can prove one real student lifecycle per family

## Immediate Next Tickets

1. Run manual small-screen and weak-network QA against the seeded NEET, JEE, GRE, and AWS lanes.
2. Build the question-type and scoring-fit matrix for the four families.
3. Harden family-aware analytics and result/reporting language.
4. Decide whether any broader family variants are required beyond the current seeded lanes.
5. Record a formal signoff note per family before broader rollout claims.
