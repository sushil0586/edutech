# Phase 4B Rubric Review Engine Implementation Plan

## Purpose

This document converts the next review-workflow expansion into an implementation-ready plan.

It is designed for the current codebase and extends the existing:

- manual review workflow
- media-backed response flow
- reviewer guidance flow

Related documents:

- [NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md](./NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md)
- [NEXT_IMPLEMENTATION_ROADMAP.md](./NEXT_IMPLEMENTATION_ROADMAP.md)
- [FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md](./FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md)
- [PHASE_2_REVIEWER_WORKFLOW_ENGINE_IMPLEMENTATION_PLAN.md](./PHASE_2_REVIEWER_WORKFLOW_ENGINE_IMPLEMENTATION_PLAN.md)

---

## Executive Goal

The platform already supports:

- manual review tasks
- teacher and institute review queues
- review notes and mark submission
- media-backed student responses
- reviewer guidance and checklist display

That is a strong baseline, but it still scores manual-review answers through a single total-marks box.

This phase should introduce a rubric-aware review engine so the platform can score:

- essay/manual-review answers
- speaking responses
- writing tasks
- long-form comprehension answers
- future IELTS, PTE, TOEFL, GRE writing, and interview-style assessments

without creating one-off review pages per exam family.

---

## Product Decision

Rubrics should be implemented as a structured extension of the current `manual_rubric_review` path.

Do not create a separate scoring subsystem.

Recommended rule:

- question metadata remains the source of truth for the rubric definition
- review tasks expose the rubric in reviewer-ready form
- review submissions persist criterion-level scoring snapshots
- `StudentAnswer.marks_awarded` remains the latest rolled-up total used by results

This preserves backward compatibility while adding richer grading behavior.

---

## Current Baseline in Code

## What exists already

- question types already declare `manual_rubric_review`
- authoring already supports `review_guidance`
- student answers already support:
  - `answer_text`
  - `answer_transcript`
  - `response_artifacts`
- teacher and institute reviewers already see:
  - student response content
  - media playback
  - review guidance
  - a parsed checklist
- review workflows already support:
  - assignment
  - review submission
  - recheck
  - moderation
  - audit history

## What is missing

- no structured rubric schema
- no criterion-level scores
- no criterion-level review notes
- no rubric score history in review events
- no moderation diff by criterion
- no band-descriptor support
- no rubric total calculation contract

---

## Implementation Strategy

Build this in two layers:

1. rubric definition layer
2. rubric scoring layer

The first layer defines how a question should be graded.

The second layer defines how a reviewer records that grading decision.

---

## Layer 1: Rubric Definition Contract

## Goal

Allow essay/manual-review questions to carry a structured rubric definition.

## Recommended storage

Store rubric definitions in question metadata first.

Suggested metadata shape:

```json
{
  "review_guidance": "Evaluate clarity, completeness, and accuracy.",
  "rubric": {
    "mode": "criterion_scores",
    "criteria": [
      {
        "key": "accuracy",
        "label": "Accuracy",
        "max_score": "2.00",
        "display_order": 1,
        "reviewer_hint": "Reward factually correct explanations.",
        "band_descriptors": []
      },
      {
        "key": "clarity",
        "label": "Clarity",
        "max_score": "2.00",
        "display_order": 2,
        "reviewer_hint": "Reward clear and well-structured expression.",
        "band_descriptors": []
      },
      {
        "key": "example_quality",
        "label": "Example Quality",
        "max_score": "1.00",
        "display_order": 3,
        "reviewer_hint": "Look for a relevant example.",
        "band_descriptors": []
      }
    ]
  }
}
```

## First supported rubric mode

Start with:

- `criterion_scores`

Meaning:

- each criterion has a numeric max score
- reviewer enters per-criterion awarded score
- total marks are derived from the criterion sum

## Later rubric modes

Design the schema so it can later support:

- `band_scale`
- `rating_scale`
- `binary_checklist`

But do not implement all of them in the first slice.

---

## Layer 2: Rubric Scoring Contract

## Goal

Persist criterion-level reviewer decisions per review submission.

## Recommended submission shape

When a reviewer submits a rubric-scored answer, send:

```json
{
  "marks_awarded": "4.00",
  "review_notes": "Strong explanation, but missed one supporting detail.",
  "rubric_scores": [
    {
      "criterion_key": "accuracy",
      "awarded_score": "1.50",
      "note": "Mostly correct but incomplete."
    },
    {
      "criterion_key": "clarity",
      "awarded_score": "1.50",
      "note": "Clear structure and readable language."
    },
    {
      "criterion_key": "example_quality",
      "awarded_score": "1.00",
      "note": "Relevant example included."
    }
  ]
}
```

## Source of truth rule

- criterion-level scores are the primary manual-review data
- `marks_awarded` should equal the sum of criterion scores
- if the rubric exists, backend should reject totals that do not match the derived sum

---

## Data Model Recommendation

## Keep the rubric definition on `Question`

Do not create a separate rubric-definition table in the first phase.

Reason:

- rubric definition is authored with the question
- versioning can be snapshot-based in review history
- metadata storage is already the platform pattern for question-specific structured extensions

## Persist scoring snapshot in review history

Add rubric scoring snapshots to:

- `StudentAnswerReviewEvent.metadata`

Recommended event metadata shape:

```json
{
  "rubric_scores": [
    {
      "criterion_key": "accuracy",
      "criterion_label": "Accuracy",
      "max_score": "2.00",
      "awarded_score": "1.50",
      "note": "Mostly correct but incomplete."
    }
  ],
  "rubric_total": "4.00"
}
```

## Keep latest snapshot on review task

Also keep a latest snapshot on:

- `StudentAnswerReviewTask.metadata`

Recommended fields:

- `rubric_scores`
- `rubric_total`
- `moderation_rubric_scores`
- `moderation_rubric_total`

This makes review-task detail rendering cheap and avoids rebuilding everything from history on every page load.

---

## Backend Validation Rules

## Question authoring validation

For questions that support rubric scoring:

- rubric criteria cannot be empty
- criterion keys must be unique
- criterion labels cannot be blank
- `max_score` must be positive
- criterion max scores must sum to the question mark value
- unsupported question types cannot accept rubric definitions

## Review submission validation

For rubric-scored reviews:

- every required criterion must be present
- unknown criterion keys must be rejected
- awarded score cannot be negative
- awarded score cannot exceed criterion max
- derived criterion total must equal `marks_awarded`
- moderation submissions must follow the same rules

## Compatibility rule

If a question has no rubric definition:

- keep the current single-score manual review flow working unchanged

---

## API Contract Changes

## Question authoring APIs

Extend question create/update serializers to support:

- `rubric_criteria`

Suggested frontend field shape:

```json
[
  {
    "key": "accuracy",
    "label": "Accuracy",
    "max_score": "2.00",
    "display_order": 1,
    "reviewer_hint": "Reward correctness.",
    "band_descriptors": []
  }
]
```

## Review-task detail APIs

Extend teacher and institute review-task detail payloads with:

- `question_text`
- `question_type_definition`
- `review_guidance`
- `rubric_checklist`
- `rubric`
- `rubric_scores`
- `rubric_total`
- `has_rubric`

Recommended detail payload fragment:

```json
{
  "has_rubric": true,
  "rubric": {
    "mode": "criterion_scores",
    "criteria": [
      {
        "key": "accuracy",
        "label": "Accuracy",
        "max_score": "2.00",
        "display_order": 1,
        "reviewer_hint": "Reward correctness."
      }
    ]
  },
  "rubric_scores": [
    {
      "criterion_key": "accuracy",
      "awarded_score": "1.50",
      "note": "Mostly correct but incomplete."
    }
  ],
  "rubric_total": "4.00"
}
```

## Review submit APIs

Extend:

- teacher review submit
- institute moderation submit

to accept:

- `rubric_scores`

while preserving the current:

- `marks_awarded`
- `review_notes`

contract.

---

## Frontend Authoring Plan

## Goal

Allow teachers to build rubric-backed manual-review questions cleanly.

## First UI version

On the teacher question editor for essay/manual-review types:

- keep `review_guidance`
- add a `Rubric criteria` section
- allow:
  - criterion label
  - key
  - max score
  - reviewer hint
  - remove / reorder rows

## UX rule

Do not start with a giant nested builder.

The first version should be simple and reliable:

- flat repeated criterion cards
- live total marks summary
- validation errors inline

---

## Frontend Reviewer Plan

## Teacher review page

Replace the “single marks box only” workflow with:

- rubric criteria cards when `has_rubric = true`
- score input per criterion
- optional note per criterion
- auto-calculated total summary
- keep overall review notes below the rubric

If `has_rubric = false`, keep the current review form.

## Institute moderation page

Show:

- original reviewer criterion scores
- moderation criterion inputs
- total before moderation
- moderated total

This gives institute admins real audit visibility instead of only one changed total.

## UI layout goals

Each criterion card should show:

- criterion name
- max marks
- reviewer hint
- awarded score input
- optional criterion note

Also include:

- sticky rubric total summary
- mismatch warning if total does not reconcile

---

## Review History and Audit Design

## Goal

Make rubric scoring auditable for recheck and moderation.

## Required event snapshots

Persist rubric scoring data in events for:

- `review_saved`
- `review_updated`
- `recheck_requested`
- `moderated`

## Required audit behavior

For every rubric-scored update, preserve:

- criterion labels at time of review
- criterion max scores at time of review
- criterion awarded scores
- criterion notes
- derived total

This protects the review trail even if the underlying question changes later.

---

## Result Integration Rules

## Goal

Keep the results engine stable while allowing rubric scoring.

## Rule

The results engine should still read final marks from:

- `StudentAnswer.marks_awarded`

But for rubric-backed answers:

- `marks_awarded` should be written from the rubric total
- reviewer-entered total should be treated as a validated mirror, not an independent source

## Publication blocker behavior

No change in the blocker rule:

- unresolved manual review still blocks result publication

Rubric support should strengthen scoring quality, not weaken publication safety.

---

## Rollout Order

## Slice 1

Backend rubric definition + review serializer contract

Includes:

- metadata schema
- serializer validation
- review-task detail payload
- tests

## Slice 2

Teacher review rubric scoring UI

Includes:

- criterion cards
- total calculation
- review submit payload

## Slice 3

Institute moderation rubric UI

Includes:

- criterion comparison
- moderation override flow
- event snapshot enrichment

## Slice 4

Teacher question authoring UI for rubric criteria

Includes:

- criterion builder
- validation
- live total display

## Slice 5

Band-descriptor expansion

Includes:

- IELTS / PTE style criterion descriptors
- future score-band presets

---

## Recommended File Touchpoints

Likely backend touchpoints:

- `edutech_backend/apps/question_bank/serializers/__init__.py`
- `edutech_backend/apps/question_bank/services.py`
- `edutech_backend/apps/question_bank/registry.py`
- `edutech_backend/apps/attempts/serializers/__init__.py`
- `edutech_backend/apps/attempts/services.py`
- `edutech_backend/apps/attempts/views/__init__.py`
- `edutech_backend/apps/attempts/tests/test_attempt_workspace_api.py`
- `edutech_backend/apps/question_bank/tests/test_bulk_workflows.py`

Likely frontend touchpoints:

- `edutech_web/src/components/ui/teacher-question-editor.tsx`
- `edutech_web/src/components/ui/review-guidance-panel.tsx`
- `edutech_web/src/app/(teacher)/teacher/reviews/page.tsx`
- `edutech_web/src/app/(institute)/institute/reviews/page.tsx`
- `edutech_web/src/lib/api/teacher.ts`
- `edutech_web/src/lib/api/portal.ts`
- `edutech_web/src/lib/teacher/question-bank-form.ts`
- `edutech_web/src/lib/teacher/question-bank-validation.ts`
- `edutech_web/src/app/globals.css`

---

## Exit Criteria

This phase is complete when:

- rubric definitions can be authored for manual-review questions
- rubric-backed review tasks expose structured scoring criteria
- teachers can submit criterion-level scores
- institute moderators can see and override criterion-level scores
- review history preserves rubric scoring snapshots
- final marks roll up cleanly from rubric totals
- non-rubric manual-review questions still work unchanged

---

## Recommended First Build

The best first implementation slice is:

`backend rubric contract + teacher review rubric UI`

Reason:

- it unlocks real scoring structure quickly
- it keeps the scope controlled
- it reuses the media-backed and reviewer-guidance work already completed
- it gives immediate value for speaking and writing workflows

