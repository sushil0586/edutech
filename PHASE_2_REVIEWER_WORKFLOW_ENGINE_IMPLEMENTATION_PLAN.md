# Phase 2 Reviewer Workflow Engine Implementation Plan

## Purpose

This document converts Phase 2 of the roadmap into an implementation-ready plan.

It is designed for the current codebase, not for a hypothetical rewrite.

Related documents:

- [NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md](./NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md)
- [NEXT_IMPLEMENTATION_ROADMAP.md](./NEXT_IMPLEMENTATION_ROADMAP.md)
- [FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md](./FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md)

---

## Executive Goal

The platform already supports manual review in a narrow form:

- a student can submit an essay/manual-review response
- the answer becomes `manual_pending`
- an authorized user can submit marks and notes for one answer

That is a good baseline, but it is not yet a reviewer workflow.

This phase should turn manual review into a reusable engine that supports:

- school descriptive answers
- essay evaluation
- future IELTS/TOEFL/PTE writing flows
- later speaking-response review
- moderated or second-pass review for premium institutes

---

## Current Baseline in Code

## What exists already

- `StudentAnswer.evaluation_status` supports:
  - `auto_evaluated`
  - `manual_pending`
  - `manual_reviewed`
- `StudentAnswer` already stores:
  - `reviewed_by_teacher`
  - `reviewed_at`
  - `review_notes`
- answer save flow marks manual-review types as pending
- a single-answer manual review API already exists
- results pages already show pending vs reviewed manual items
- attempt/result services already know that pending manual review blocks final scoring completeness

## Current code touchpoints

The current baseline is centered in:

- `edutech_backend/apps/attempts/models.py`
- `edutech_backend/apps/attempts/services.py`
- `edutech_backend/apps/attempts/views/__init__.py`
- `edutech_backend/apps/results/services.py`
- `edutech_web/src/features/results-workspace/page.tsx`

## What is missing

- no queue
- no assignment
- no review lifecycle beyond pending/reviewed
- no moderation history
- no score revision trail
- no clear publication blocker dashboard
- no reviewer workload view
- no analytics for turnaround or unresolved review volume

---

## Product Decision

Manual review should be implemented as a separate workflow layer around `StudentAnswer`.

Do not overload `StudentAnswer` with the full operational history.

Recommended rule:

- `StudentAnswer` remains the latest scoring state used by attempts and results
- new review workflow models hold assignment, state, and history

This keeps scoring logic stable while making review auditable and extensible.

---

## Recommended Data Model

## 1. Add a review task model

Recommended model:

- `StudentAnswerReviewTask`

Purpose:

- represents the operational review state for one manually-reviewed answer

Suggested fields:

- `id`
- `institute`
- `answer` as `OneToOneField(StudentAnswer)`
- `attempt`
- `exam`
- `student`
- `question`
- `assigned_to_teacher` nullable
- `assigned_by_user` nullable
- `status`
- `priority`
- `opened_at`
- `assigned_at`
- `review_started_at`
- `resolved_at`
- `last_reviewed_at`
- `last_reviewed_by_teacher` nullable
- `latest_marks_awarded`
- `latest_review_summary`
- `metadata`
- timestamps

Suggested status choices:

- `pending`
- `assigned`
- `in_review`
- `reviewed`
- `recheck_requested`
- `moderated`
- `cancelled`

Suggested priority choices:

- `low`
- `normal`
- `high`
- `urgent`

Why this model is needed:

- gives the platform a queueable unit of work
- supports assignment and dashboards
- avoids repeatedly querying all answers with ad hoc filters

---

## 2. Add a review event/history model

Recommended model:

- `StudentAnswerReviewEvent`

Purpose:

- preserves the full audit trail of every review action

Suggested fields:

- `id`
- `review_task`
- `answer`
- `attempt`
- `exam`
- `student`
- `question`
- `actor_user`
- `actor_teacher` nullable
- `event_type`
- `from_status`
- `to_status`
- `marks_awarded` nullable
- `notes`
- `metadata`
- `created_at`

Suggested event types:

- `task_opened`
- `assigned`
- `unassigned`
- `review_started`
- `review_saved`
- `review_updated`
- `recheck_requested`
- `moderated`
- `published_blocked`
- `published_unblocked`

Why this model is needed:

- current `review_notes` only stores the latest note
- the platform needs to know who changed what and when
- later moderation and appeals depend on this

---

## 3. Keep `StudentAnswer` as the latest result snapshot

Do not remove the current fields:

- `evaluation_status`
- `reviewed_by_teacher`
- `reviewed_at`
- `review_notes`
- `marks_awarded`

Instead treat them as the latest resolved review snapshot for scoring and reporting.

This gives:

- backward compatibility
- simpler result generation
- less migration risk

---

## 4. Optional near-term additions on `StudentAnswer`

These can be added directly if helpful:

- `manual_review_state` nullable string if shortcut access is needed
- `manual_review_priority` nullable string
- `manual_review_due_at` nullable datetime

But this should stay denormalized.
The source of truth should still be `StudentAnswerReviewTask`.

---

## Workflow Design

## Review lifecycle

Recommended lifecycle:

1. student submits answer
2. answer becomes `manual_pending`
3. task is created as `pending`
4. task may be assigned to a teacher
5. reviewer starts work and task becomes `in_review`
6. reviewer saves marks and notes
7. task becomes `reviewed`
8. if another reviewer or admin disagrees, task can become `recheck_requested`
9. moderation can resolve it as `moderated`

Important distinction:

- `StudentAnswer.evaluation_status` should remain broad and scoring-oriented
- `StudentAnswerReviewTask.status` should be workflow-oriented

Recommended mapping:

- task `pending`, `assigned`, `in_review`, `recheck_requested` -> answer stays `manual_pending`
- task `reviewed`, `moderated` -> answer becomes `manual_reviewed`

---

## Assignment rules

Recommended initial version:

- institute admin or teacher can self-assign
- institute admin can assign any pending task to a teacher in the same institute
- platform admin can inspect everything but should not be required operationally

Future-ready rule:

- speaking/writing evaluators can be separate roles later without changing task architecture

---

## Publication rules

Results should not be considered fully publishable when:

- any answer in the chosen attempt is still in:
  - `pending`
  - `assigned`
  - `in_review`
  - `recheck_requested`

This should be exposed clearly in:

- exam result generation
- result publication checks
- dashboard blockers

---

## Backend API Plan

## 1. Review queue list endpoint

Recommended endpoint:

- `GET /api/v1/review-tasks/`

Suggested filters:

- `exam`
- `student`
- `question`
- `status`
- `assigned_to_teacher`
- `requires_attention`
- `priority`
- `review_family`
- `submitted_after`
- `submitted_before`

Suggested search fields:

- student name
- admission number
- exam title
- question text summary

Recommended ordering:

- newest pending
- oldest pending
- priority
- reviewed recently

---

## 2. Review task detail endpoint

Recommended endpoint:

- `GET /api/v1/review-tasks/{id}/`

Payload should include:

- answer detail
- question summary
- exam/question marks
- student response
- latest review snapshot
- event history
- assignment metadata
- comprehension passage details if linked
- attachments if present

This payload should be reusable for:

- reviewer queue detail drawer
- institute result drilldown
- future moderation screen

---

## 3. Task assignment action

Recommended endpoints:

- `POST /api/v1/review-tasks/{id}/assign/`
- `POST /api/v1/review-tasks/{id}/unassign/`

Assignment payload:

- `assigned_to_teacher`
- optional `priority`
- optional `note`

---

## 4. Review submit action

Recommended endpoint:

- `POST /api/v1/review-tasks/{id}/submit-review/`

Payload:

- `marks_awarded`
- `review_notes`
- optional `rubric_payload` later

Behavior:

- write review event
- update task state
- update `StudentAnswer`
- recalculate attempt score
- refresh result if already generated

This should call shared service logic, not duplicate the current single-answer review code.

---

## 5. Recheck request action

Recommended endpoint:

- `POST /api/v1/review-tasks/{id}/request-recheck/`

Payload:

- `reason`
- optional `assign_to_teacher`

Purpose:

- supports moderation and correction without destroying the latest review history

---

## 6. Moderation action

Recommended endpoint:

- `POST /api/v1/review-tasks/{id}/moderate/`

Payload:

- `marks_awarded`
- `review_notes`
- optional `override_reason`

Use case:

- institute admin or authorized moderator resolves disputed marks

---

## 7. Queue summary endpoint

Recommended endpoint:

- `GET /api/v1/review-tasks/summary/`

Suggested metrics:

- total pending
- assigned
- in review
- reviewed today
- recheck requested
- overdue
- average turnaround
- pending by exam
- pending by teacher

This will power dashboards without forcing the UI to aggregate large raw lists.

---

## Service Layer Plan

Recommended new service functions:

- `ensure_review_task_for_answer(answer)`
- `assign_review_task(...)`
- `start_review_task(...)`
- `submit_review_task(...)`
- `request_recheck(...)`
- `moderate_review_task(...)`
- `review_queue_summary(...)`
- `review_turnaround_metrics(...)`

Recommended file:

- `edutech_backend/apps/attempts/services.py`

If the service grows too large, split into:

- `edutech_backend/apps/attempts/review_services.py`

That would be cleaner long-term.

---

## UI Plan

## 1. Dedicated review queue page

Recommended initial surfaces:

- teacher review queue
- institute admin review queue

Suggested routes:

- `/teacher/reviews`
- `/institute/reviews`

Screen sections:

- queue summary cards
- filters
- pending task list
- right-side detail/review panel or detail page

Key filters:

- status
- assigned to me
- unassigned
- exam
- student
- question type
- comprehension only
- priority

---

## 2. Result page integration

Keep the current student-level manual review panel, but reposition it as:

- a detail shortcut
- not the primary workflow surface

Reason:

- review should be queue-first
- result drilldown should remain useful for spot-fixes and audits

---

## 3. Dashboard visibility

Teacher and institute dashboards should show:

- pending manual reviews
- overdue reviews
- reviewed today
- recheck requests
- blocked results because of pending review

This makes manual review operationally visible.

---

## 4. Review form behavior

The review form should support:

- max marks enforcement
- latest review history preview
- optional rubric notes
- clear review status chips
- assignment banner
- save and next behavior for queue workflows

---

## Permissions Plan

## Teacher

- can view tasks in own institute and permitted scope
- can self-assign
- can review tasks assigned to them
- can review unassigned tasks if the institute policy allows

## Institute admin

- can view all institute review tasks
- can assign and reassign
- can moderate
- can publish only when blockers are resolved

## Platform admin

- can inspect and support
- should not be the primary operational reviewer

## Student

- no access to review internals
- only sees final published result state as allowed by exam policy

---

## Analytics Plan

Phase 2 should add the minimum viable analytics needed for operations.

Recommended metrics:

- pending review count
- reviewed count by day
- average review turnaround
- pending by exam
- pending by question type
- pending by teacher
- recheck rate
- moderation rate

Later phases can add:

- rubric consistency
- reviewer variance
- skill-band quality metrics

---

## Migration Strategy

Use additive migrations only.

Recommended sequence:

1. add `StudentAnswerReviewTask`
2. add `StudentAnswerReviewEvent`
3. backfill tasks for existing `manual_pending` and `manual_reviewed` answers
4. backfill one history event for already-reviewed answers
5. update manual review service to write task and event records
6. add queue endpoints
7. add UI screens
8. add analytics summary endpoints

---

## Backfill Rules

For existing data:

- each `manual_pending` answer gets a `pending` task
- each `manual_reviewed` answer gets a `reviewed` task
- existing `reviewed_by_teacher`, `reviewed_at`, and `review_notes` should seed:
  - `last_reviewed_by_teacher`
  - `last_reviewed_at`
  - `latest_review_summary`
- a synthetic `review_saved` event can be created for historical reviewed answers

---

## Result and Attempt Integration

Current result generation already respects pending manual review broadly.

This phase should formalize that integration:

- review task state changes should trigger attempt score refresh when needed
- result generation should rely on answer scoring state, not duplicate queue rules
- result publication blockers should inspect queue states for unresolved manual-review tasks

This separation keeps:

- scoring logic in attempt/result services
- workflow logic in the review engine

---

## Testing Plan

## Backend tests

Add coverage for:

- task creation for manual-review answers
- assignment and reassignment rules
- review submission updates answer and task consistently
- recheck flow
- moderation flow
- publication blocked while review tasks unresolved
- queue list scoping by teacher and institute
- audit event creation

## Frontend tests

Add coverage for:

- review queue filters
- review detail rendering
- assignment action
- review submit validation
- unresolved blocker summaries

## End-to-end smoke tests

At minimum:

1. student submits essay response
2. task appears in teacher queue
3. teacher reviews it
4. result updates
5. institute admin sees blocker disappear

---

## Definition of Done

Phase 2 should be considered complete when:

1. manual-review answers automatically create queue tasks
2. teachers and institute admins can work from a dedicated review queue
3. review history is preserved as events
4. recheck or moderation can happen without overwriting history
5. result publication blockers clearly reflect unresolved review work
6. dashboards show review workload and turnaround basics

---

## Recommended Delivery Order Inside Phase 2

## Ticket Group A

Data model and backfill

## Ticket Group B

Review services and queue APIs

## Ticket Group C

Teacher and institute review queue UI

## Ticket Group D

Result blocker integration and dashboard summaries

## Ticket Group E

Moderation and recheck flow

---

## Immediate Recommended First Implementation Slice

Build this first:

1. `StudentAnswerReviewTask`
2. backfill migration
3. queue list endpoint
4. review submit endpoint refactored through task services
5. teacher review queue page

Why this slice first:

- highest operational value
- lowest disruption to current scoring flows
- immediately usable for school descriptive and essay-style questions
- creates the correct extension point for later rubric and speaking review workflows
