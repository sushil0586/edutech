# Institute Exam UAT Observations

Browser-based walkthrough completed on the institute exam lifecycle using the local frontend and backend stack.

Primary flow exercised:

1. Create exam shell
2. Open exam detail
3. Open builder
4. Edit settings
5. Add/remove section
6. Attach and edit question
7. Save assignment
8. Create/update slot
9. Save slot override
10. Save accommodation
11. Return to detail
12. Save access policy
13. Refresh status
14. Sync marks
15. Publish / mark live where available

Playwright coverage used:

- `tests/e2e/workflow/institute-exam-lifecycle-browser-buttons.mutable.spec.ts`

## What Worked

- Exam shell creation worked end-to-end.
- Builder settings save worked.
- Section add and remove worked.
- Manual question attach worked.
- Linked-question edit worked.
- PDF export popup worked.
- Assignment save worked.
- Slot create and update worked.
- Slot override save worked.
- Accommodation save worked.
- Access policy save worked.
- Refresh status and sync marks worked.
- Publish and mark-live actions were reachable in the tested lifecycle.

## User-Facing Observations And Bugs

### 1. Primary next-step actions are not obvious immediately after exam creation

Route:
- `/institute/exams/[examId]`

Priority:
- High

Problem:
- After creating a draft exam, the first viewport is dominated by large summary cards and readiness blocks.
- The most important next step, opening the builder and continuing setup, is not the first thing the eye lands on.
- The success banner says to continue with builder, questions, and assignments, but the page does not strongly pull the user to that next action.

Expected:
- A newly created draft exam should show one unmistakable primary CTA near the top, such as `Continue Setup` or `Open Builder`.

User impact:
- New users may pause, scroll, or wonder what to do next even though the product already knows the exam is incomplete.

### 2. Detail page feels vertically heavy before the user reaches actionable controls

Route:
- `/institute/exams/[examId]`

Priority:
- High

Problem:
- Large metric cards, readiness cards, runtime cards, publish-readiness cards, access forms, slot forms, student forms, and publish history all live on one long page.
- Important actions and editable controls are pushed deep into the page.

Expected:
- The page should feel like a workflow, not a dashboard plus forms plus audit logs all stacked together.

User impact:
- Creates scroll fatigue and makes it harder to understand where “edit”, “publish”, and “student delivery” belong.

### 3. Builder assignment tab is overloaded

Route:
- `/institute/exams/[examId]/builder?tab=assignment`

Priority:
- High

Problem:
- One tab contains assignment mode, student checkboxes, slot creation, slot editing, preview, auto-distribution, bulk assignment, per-student override, audit logs, and accommodation support.
- It behaves more like several pages packed into one screen.

Expected:
- Split this into smaller sub-steps or collapsible sections such as `Assignment`, `Slots`, `Overrides`, `Accommodation`, and `Audit`.

User impact:
- Users can easily lose context and miss critical actions, especially when configuring a live exam quickly.

### 4. Student assignment does not feel scalable for real rosters

Route:
- `/institute/exams/[examId]/builder?tab=assignment`

Priority:
- High

Problem:
- Selected-student mode relies on a plain checkbox list.
- In larger institutes this will become hard to scan, search, and confirm.

Expected:
- Search, filter, select-all-in-current-view, and clearer grouping by cohort or section.

User impact:
- High chance of assigning the wrong students or missing intended learners.

### 5. Publish terminology is easy to misread

Routes:
- `/institute/exams/[examId]`
- `/institute/results`

Priority:
- High

Problem:
- The product uses nearby terms such as `Publish Exam`, `Mark Live`, `Exam Publish Readiness`, `Result Publish Readiness`, and `Results published`.
- For a real user, “publish” can mean either making the exam available to students or making results visible after completion.

Expected:
- Delivery and results language should be separated more clearly, for example:
  - `Make Exam Available`
  - `Start Delivery`
  - `Results Ready To Publish`
  - `Publish Results To Students`

User impact:
- Users can take the wrong action or hesitate because the consequence of each button is not instantly clear.

### 6. Save flows depend on full-page refreshes and flash messages

Routes:
- Builder and exam detail forms across the lifecycle

Priority:
- Medium

Problem:
- Many edits redirect with `?message=...` and reload the whole page.
- This works technically, but feels heavier than necessary for high-frequency operations.

Expected:
- Inline save confirmation near the edited form or section, with less context loss after each action.

User impact:
- Repeated reloads slow down confident editing and make users rescan the page to confirm what changed.

### 7. Question attach flow is functional but not friendly for large banks

Route:
- `/institute/exams/[examId]/builder?tab=questions`

Priority:
- Medium

Problem:
- Manual question attach depends on dropdown selection.
- This is manageable for small scoped lists but becomes hard when the question pool grows.

Expected:
- Search-first attach, filters, preview-before-attach, and better prominence for recommended questions.

User impact:
- Slow mapping flow and higher risk of attaching the wrong question.

### 8. PDF export relies on popup behavior

Route:
- `/institute/exams/[examId]/builder?tab=questions`

Priority:
- Medium

Problem:
- `Export as PDF` opens a popup/print window.
- Some users may have popup blockers or may not realize a new window appeared.

Expected:
- Clearer “opens print preview” wording or a downloadable export option.

User impact:
- Can feel broken even when it technically works.

### 9. Draft-to-live lifecycle is visible, but not guided enough

Routes:
- `/institute/exams`
- `/institute/exams/[examId]`
- `/institute/exams/[examId]/builder`

Priority:
- Medium

Problem:
- The system exposes readiness signals and status pills, but the user still has to mentally assemble the lifecycle.
- There is no single compact progress view that says: `1. Setup`, `2. Questions`, `3. Assignment`, `4. Schedule`, `5. Publish`, `6. Review`, `7. Results`.

Expected:
- A compact lifecycle stepper with current state and blocking reasons.

User impact:
- Good backend readiness information exists, but the user experience still feels more diagnostic than guided.

### 10. Detail page mixes operations, policy, scheduling, and audit too closely

Route:
- `/institute/exams/[examId]`

Priority:
- Medium

Problem:
- Access policy, slot management, student overrides, publish history, and section summaries share the same page without strong separation.

Expected:
- Distinct lanes or tabs such as `Overview`, `Delivery`, `Students`, `Access Policy`, `History`.

User impact:
- Increases cognitive load and makes the page feel “busy” even when the data is correct.

### 11. Builder title/header area is still visually loud on long exam names

Route:
- `/institute/exams/[examId]/builder`

Priority:
- Low

Problem:
- Long exam names create a very dominant heading block.
- On setup-heavy screens this can make the content below feel pushed down.

Expected:
- Slightly more compact heading treatment for long titles.

User impact:
- Mostly visual polish, but it contributes to the overall feeling that the screen is taller than necessary.

## Recommended Frontend Improvements

### Highest-value improvements

1. Make the post-create exam detail page strongly action-led with one clear primary CTA.
2. Break assignment/slots/overrides/accommodation into smaller sub-sections or nested tabs.
3. Clarify lifecycle terminology around exam delivery vs result publication.
4. Add searchable, scalable student selection and searchable question attach.
5. Replace full-page success redirects with more local save feedback where practical.

### Nice polish after that

1. Add a sticky lifecycle progress stepper.
2. Reduce vertical bloat in detail and builder headers.
3. Make export behavior more explicit for non-technical users.

## Summary

The institute exam lifecycle is functionally strong in the tested path. The main issues are not “buttons are broken” issues; they are user-flow issues:

- too much content on single pages,
- unclear next action after creation,
- overloaded assignment workflow,
- and terminology that can confuse exam delivery with result publication.

That means the product is close from a workflow engine perspective, but still needs UX tightening to feel faster and safer for real institute operators.
