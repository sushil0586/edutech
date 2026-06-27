# Teacher Module QA Checklist

## Purpose

This checklist is for validating the completed teacher-side Next.js experience in `edutech_web` against real backend states.

Use it for:

- route-by-route teacher QA
- founder or product walkthroughs
- backend/frontend workflow validation
- final teacher module sign-off

## Scope

This checklist covers the teacher routes in [edutech_web](/Users/ansh/Documents/Eductech/edutech_web):

- `/login`
- `/teacher/dashboard`
- `/teacher/exams`
- `/teacher/exams/new`
- `/teacher/exams/[examId]`
- `/teacher/exams/[examId]/builder`
- `/teacher/question-bank`
- `/teacher/question-bank/new`
- `/teacher/question-bank/[questionId]`
- `/teacher/question-bank/import`
- `/teacher/results`

## Environment Setup

### Backend

Run from [edutech_backend](/Users/ansh/Documents/Eductech/edutech_backend):

```bash
source .venv/bin/activate
DB_USER=ansh DB_NAME=edutech_db python manage.py runserver
```

Optional validation:

```bash
DB_USER=ansh DB_NAME=edutech_db python manage.py check
DB_USER=ansh DB_NAME=edutech_db python manage.py test
```

### Frontend

Run from [edutech_web](/Users/ansh/Documents/Eductech/edutech_web):

```bash
npm install
npm run dev
```

Production validation:

```bash
npm run typecheck
npm run build
npm run start
```

Full web verification:

```bash
npm run verify:student
```

## Suggested Accounts

Use the seeded teacher account when available:

- `demo-teacher` / `Demo@12345`

Keep one student account available too so you can validate downstream assignment and result behavior:

- `demo-student` / `Demo@12345`

## Preconditions

Before starting the teacher QA pass, make sure:

- at least one active academic year exists
- at least one active program exists
- at least one cohort exists
- at least one subject exists
- at least one topic exists
- at least a few students exist in teacher scope
- at least a few reusable questions exist
- at least one exam is in draft state
- at least one exam is in scheduled or live state
- at least one exam has assigned students
- at least one exam has no linked questions
- at least one exam has linked questions
- at least one exam has attempts
- at least one exam has no summary yet
- at least one exam has a generated result summary
- at least one exam has published results if that lifecycle has been exercised
- at least one attempt has live or historical integrity warnings if monitoring is being validated deeply

If all of these states do not already exist, create them before the final teacher QA pass.

## Exit Criteria

The teacher module can be considered QA-complete when:

- all teacher routes load without blocker errors
- exam creation and builder flows persist correctly
- linked question management works without duplicate or soft-delete confusion
- assignment and accommodation support persist correctly
- question bank CRUD, tags, attachments, and import behave predictably
- results lifecycle states are understandable from the UI alone
- live monitoring and intervention flows work without misleading cues
- no page overpromises data or actions that the backend does not support
- `npm run verify:student` passes successfully in `edutech_web`

## Phase 2 Release Gate Alignment

This checklist is the execution artifact for the teacher and pilot hardening wave in [PHASE_2_TEACHER_PILOT_HARDENING_BACKLOG.md](/Users/ansh/Documents/Eductech/PHASE_2_TEACHER_PILOT_HARDENING_BACKLOG.md:1).

The manual sign-off is only complete when these five release-gate statements are true:

- teacher exam creation and builder flows feel reliable in live usage
- result readiness and publication states are understandable from the UI alone
- assignment, accommodation, and monitoring flows remain truthful
- role boundaries do not leak across teacher-facing workflows
- manual and automated evidence both exist for pilot-critical paths

## Test Matrix

Validate these state combinations during QA:

| State | Expected teacher behavior |
| --- | --- |
| Backend unavailable | Friendly error or fallback, not a broken blank page |
| Expired session | Redirect to login or protected-route handling |
| No exams in scope | Empty-state guidance on dashboard, exams, and results |
| Draft exam with no questions | Builder clearly guides linking before publish |
| Exam with linked questions | Builder shows editable linked-question controls |
| Exam with no assigned students | Assignment area explains empty scope clearly |
| Exam with summary but not completed | Results page explains why publish is blocked |
| Exam completed but not published | Results page shows ready-to-publish state |
| Published results | Results page clearly shows published state |
| No question bank data | Empty-state guidance instead of broken filters |
| Import template unavailable | Import route explains dependency failure |
| Live monitor unavailable | Results page still renders partial analytics truthfully |

## Execution Notes

Use these rules while running the browser pass:

- mark a route `pass` only when both the normal flow and the relevant empty, blocked, or partial-data state were exercised
- mark a route `partial` when the UI is acceptable but one required backend state could not be created or verified
- mark a route `fail` when the state is broken, misleading, or blocked by a product defect
- capture exact exam, route, and backend state in notes whenever a route is `partial` or `fail`
- when required seeded data is missing, record that as a setup gap instead of silently skipping the route

## Route Sign-Off Tracker

Fill this table during the pass:

| Route area | Primary route(s) | Required state coverage | Status | Notes / evidence |
| --- | --- | --- | --- | --- |
| Login and session | `/login`, protected teacher routes | login, refresh persistence, logout, expired session redirect | `not run` | |
| Dashboard | `/teacher/dashboard` | loaded KPIs, hero actions, sparse data state, empty data state | `not run` | |
| Exams list | `/teacher/exams` | draft exam, scheduled or live exam, lifecycle CTAs, empty state | `not run` | |
| Create exam | `/teacher/exams/new` | live scope lookups, save, redirect to builder | `not run` | |
| Exam detail | `/teacher/exams/[examId]` | lifecycle actions, access key controls, history updates | `not run` | |
| Exam builder | `/teacher/exams/[examId]/builder` | settings save, section add/remove, attach, bulk attach, inline link edits | `not run` | |
| Assignment and accommodation | builder assignment area | assignment mode, persistence, accommodation save, empty student scope | `not run` | |
| Question bank | `/teacher/question-bank` | filters, bulk action, stable list behavior, empty state | `not run` | |
| Question create and edit | `/teacher/question-bank/new`, detail route | create, edit, save, duplicate behavior | `not run` | |
| Tags and attachments | question detail route | tag add/remove, upload, preview, remove | `not run` | |
| Import questions | `/teacher/question-bank/import` | valid CSV, preview, finalize, invalid CSV behavior | `not run` | |
| Results workspace | `/teacher/results` | no summary, awaiting completion, ready to publish, published | `not run` | |
| Monitoring and intervention | `/teacher/results` | monitor KPIs, attempt detail, intervention note, force-submit truth | `not run` | |

## Route Checklist

### 1. Login And Session

1. Open `/login`.
2. Log in with `demo-teacher`.
3. Confirm the teacher lands on `/teacher/dashboard`.
4. Refresh the page.
5. Open a few protected teacher routes directly in the URL bar.
6. Log out.
7. Re-open a protected route after logout.

Expected result:

- login succeeds
- protected routes use the active teacher session
- refresh does not break the session
- logout clears access to protected routes

### 2. Dashboard

1. Open `/teacher/dashboard`.
2. Confirm KPI cards load.
3. Confirm the hero and action links point to valid teacher routes.
4. Review exam delivery snapshot.
5. Review weak topics.
6. Review top-performing students.
7. Review most wrong questions.
8. Repeat with low-data or empty-data conditions if available.

Expected result:

- dashboard loads without console-breaking errors
- all panels reflect live teacher summary data
- sparse data states remain understandable

### 3. Exams List

1. Open `/teacher/exams`.
2. Confirm the page shows exams in scope.
3. Validate one draft exam card.
4. Validate one scheduled or live exam card if present.
5. Use `Create Exam`.
6. Use `Link Questions`.
7. Use `Setup`.
8. Use `Open Exam`.

Expected result:

- exam cards reflect real counts and lifecycle states
- CTA labels match the real teacher next action
- no card silently hides missing setup work

### 4. Create Exam

1. Open `/teacher/exams/new`.
2. Confirm academic year, program, cohort, and subject lookups load.
3. Fill in title, code, exam type, timing, and policy fields.
4. Save the exam.
5. Confirm redirect into builder.

Expected result:

- create form uses live scope data
- no hardcoded fallback values are required
- successful save redirects to builder with clear feedback

### 5. Exam Detail

1. Open `/teacher/exams/[examId]`.
2. Confirm code, subject, active question count, assigned learners, and access key are visible.
3. Run `Refresh Status`.
4. Run `Sync Marks`.
5. Toggle access key.
6. Regenerate access key.
7. If the lifecycle state allows it, run:
   - `Publish Exam`
   - `Mark Live`
   - `Mark Completed`
   - `Cancel`
8. Confirm lifecycle history updates.

Expected result:

- exam detail is the operational lifecycle screen
- actions only make sense relative to backend state
- feedback messages are clear after actions

### 6. Exam Builder

1. Open `/teacher/exams/[examId]/builder`.
2. Confirm summary cards and builder hero load.
3. Update exam settings and save.
4. Confirm values persist after reload.
5. Add sections.
6. Remove a section.
7. Attach a question manually.
8. Bulk attach multiple questions.
9. Edit a linked question inline:
   - section
   - order
   - marks
   - negative marks
   - mandatory flag
10. Remove a linked question.
11. Re-attach a previously removed question if possible.

Expected result:

- builder feels like one coherent workflow
- linked-question edits persist correctly
- no duplicate-pair or soft-delete confusion leaks into UX

### 7. Assignment And Accommodation

1. In the builder, open `Student Assignment`.
2. Switch assignment mode.
3. Select and save students.
4. Refresh and confirm assignment persists.
5. Configure accommodation values for one student:
   - extra time minutes
   - extra time percentage
   - warning allowance
   - simplified warning copy
   - alternative instructions
   - notes
6. Save accommodation support.
7. Refresh and confirm values persist.

Expected result:

- student assignment persists correctly
- accommodation support persists correctly
- empty student scope is explained clearly when no learners are available

### 8. Question Bank

1. Open `/teacher/question-bank`.
2. Confirm summary cards load.
3. Search by text.
4. Filter by program, subject, topic, tag, type, and difficulty.
5. Toggle missing explanation filter.
6. Run one bulk action.
7. Confirm success or failure feedback is specific.

Expected result:

- filters behave predictably
- question list remains stable across filter changes
- bulk actions do not silently fail

### 9. Create And Edit Question

1. Open `/teacher/question-bank/new`.
2. Create at least one question.
3. Re-open it in `/teacher/question-bank/[questionId]`.
4. Update wording, explanation, or answer structure.
5. Save and refresh.
6. Duplicate a question if that flow is available.

Expected result:

- create and update flows work cleanly
- question editor keeps academic mapping and answer structure coherent
- duplicate flow behaves like a real authoring shortcut, not a broken clone

### 10. Tags And Attachments

1. On question detail, add a tag.
2. Remove a tag.
3. Upload an attachment.
4. Preview the attachment.
5. Remove the attachment.

Expected result:

- tag operations persist correctly
- attachment upload and preview work
- remove actions update the page truthfully

### 11. Import Questions

1. Open `/teacher/question-bank/import`.
2. Confirm the template renders.
3. Upload a valid CSV.
4. Review preview output.
5. Finalize import.
6. Re-open question bank and confirm imported questions appear.
7. Repeat with an invalid CSV if available.

Expected result:

- import is preview-first
- valid rows finalize cleanly
- invalid rows are explained clearly

### 12. Results Workspace

1. Open `/teacher/results`.
2. Confirm all teacher exams appear, including ones with no summary.
3. Select an exam with no summary.
4. Select an exam with a summary.
5. Validate result readiness states:
   - no summary
   - awaiting exam completion
   - ready to publish
   - published
6. Run:
   - `Generate Results`
   - `Calculate Ranks`
   - `Publish Results` when allowed
7. Confirm lifecycle messaging stays clear before and after each action.

Expected result:

- teacher does not need to infer lifecycle state from hidden logic
- actions stay truthful to backend readiness
- published and unpublished outcomes are clearly distinct

### 13. Live Monitoring And Attempt Intervention

1. In `/teacher/results`, open an exam with attempts.
2. Confirm live monitor KPIs load if monitor data exists.
3. Review intervention queue.
4. Open one attempt detail.
5. Review:
   - health status
   - latest integrity signal
   - accommodation state
   - timeline
6. Add an intervention note.
7. Force submit an attempt if that state is available.

Expected result:

- monitoring remains truthful even when some analytics are partial
- intervention note flow persists correctly
- force-submit availability is not misrepresented

## Cross-Route Consistency Checks

Confirm these behaviors remain consistent across teacher routes:

- exam lifecycle state looks coherent between exams list, exam detail, and results
- linked-question counts match between builder and exam detail
- assigned student counts match between exams list, detail, and builder
- question edits are visible when reused in builder flows
- result publication state does not contradict lifecycle state messaging

## Regression Watchlist

Pay extra attention to these known-risk areas:

- linked questions requiring remove-and-readd because inline update failed
- soft-deleted question links reappearing incorrectly
- publish buttons looking available when lifecycle is not ready
- results screens hiding exams that have no summary yet
- question import preview and finalize disagreeing on payload validity
- teacher pages reverting to inconsistent pre-student-style layout patterns
- assignment or accommodation counts drifting between exams list, detail, and builder
- monitoring views sounding definitive when the backend only has partial attempt telemetry

## Sign-Off Template

Use this format when signing off:

- QA date:
- Environment tested:
- Backend branch or commit:
- Frontend branch or commit:
- Verification run:
- Login/session: `pass` / `partial` / `fail`
- Dashboard: `pass` / `partial` / `fail`
- Exams list: `pass` / `partial` / `fail`
- Create exam: `pass` / `partial` / `fail`
- Exam detail: `pass` / `partial` / `fail`
- Exam builder: `pass` / `partial` / `fail`
- Assignment and accommodation: `pass` / `partial` / `fail`
- Question bank: `pass` / `partial` / `fail`
- Question create and edit: `pass` / `partial` / `fail`
- Tags and attachments: `pass` / `partial` / `fail`
- Question import: `pass` / `partial` / `fail`
- Results workspace: `pass` / `partial` / `fail`
- Monitoring and intervention: `pass` / `partial` / `fail`
- Release-gate check, builder flows feel reliable: `yes` / `no`
- Release-gate check, result readiness is understandable: `yes` / `no`
- Release-gate check, assignment and monitoring remain truthful: `yes` / `no`
- Release-gate check, role boundaries hold: `yes` / `no`
- Release-gate check, manual and automated evidence both exist: `yes` / `no`
- Blocking issues:
- Follow-up fixes needed:
- Final recommendation:
