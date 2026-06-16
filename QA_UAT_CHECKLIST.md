# Nexora Learn QA And UAT Checklist

## Purpose

This checklist is for validating the completed Phase 1 exam engine and teacher/student workflows in a real browser session.

Use it for:

- internal QA
- founder walkthroughs
- teacher pilot validation
- institute admin UAT

## Environment Setup

### Backend

Run from [edutech_backend](/Users/ansh/Documents/Eductech/edutech_backend):

```bash
source .venv/bin/activate
DB_USER=ansh DB_NAME=edutech_db python manage.py runserver
```

Optional validation before starting:

```bash
DB_USER=ansh DB_NAME=edutech_db python manage.py check
DB_USER=ansh DB_NAME=edutech_db python manage.py test
```

### Frontend

Run from [edutech_frontend](/Users/ansh/Documents/Eductech/edutech_frontend):

```bash
flutter pub get
flutter run -d chrome --dart-define-from-file=env/dev.json
```

## Suggested Test Accounts

Use the seeded/demo accounts if available:

- `demo-platform-admin` / `Demo@12345`
- `demo-institute-admin` / `Demo@12345`
- `demo-teacher` / `Demo@12345`
- `demo-student` / `Demo@12345`

If the seed data is not present, create one institute admin, one teacher, and two students so you can test assignment behavior.

## Exit Criteria

Phase 1 UAT should be considered successful if:

- all critical teacher flows pass
- all critical student attempt flows pass
- assignment restrictions behave correctly
- preview and runtime behavior match
- result visibility rules behave as configured
- no blocker-grade bug appears in section runtime, exam submission, or result access

## QA Checklist

### A. Smoke Checks

1. Open the app and confirm login screen loads.
2. Confirm backend health is available at `/api/v1/health/`.
3. Confirm teacher login works.
4. Confirm student login works.
5. Confirm no obvious console-breaking error appears during login and dashboard load.

### B. Teacher Exam Builder

Test as teacher or institute admin.

1. Open `Exams`.
2. Create a new exam.
3. Confirm the runtime configuration fields are visible:
   - timer mode
   - navigation mode
   - attempt policy
   - result publish mode
   - review mode
   - security mode
4. Save the exam successfully.
5. Re-open the exam and confirm values persist.

Expected result:

- exam saves without validation errors
- runtime summary reflects the chosen configuration

### C. Section Management

1. Add at least two sections to the exam.
2. Give one section a timer and leave one untimed if you want to test mixed section behavior.
3. Confirm section cards appear in the exam workspace.
4. Add questions to different sections.
5. Confirm linked questions show the correct section grouping.

Expected result:

- sections are saved
- questions remain visible under the correct section
- exam detail shows section structure clearly

### D. Question Bank Objective Types

1. Open `Question Bank`.
2. Create:
   - one `MCQ single`
   - one `MCQ multiple`
   - one `True / False`
3. For `MCQ multiple`, mark more than one option as correct.
4. Save each question.

Expected result:

- question creation succeeds
- multiple-correct configuration is accepted for `MCQ multiple`
- the question appears in the list with the correct type

### E. Preview / Simulation

1. In the teacher exam workspace, click `Preview`.
2. Review the preview surface.
3. Check:
   - exam title/code
   - duration
   - question count
   - section list
   - runtime behavior summary
   - sample question delivery

Expected result:

- preview opens successfully
- preview resembles the student readiness flow
- section/question ordering matches the intended build

### F. Assignment And Targeting

1. Set assignment mode to `selected_students`.
2. Assign the exam to only one student.
3. Save assignments.
4. Log in as the assigned student.
5. Confirm the exam is visible.
6. Log in as a non-assigned student from the same scope.
7. Confirm the exam is not visible or not startable.

Expected result:

- assigned student can access the exam
- non-assigned student cannot start the exam

### G. Student Readiness Screen

1. Log in as the assigned student.
2. Open the assigned exam.
3. Confirm the readiness page shows:
   - exam details
   - section structure
   - timing/runtime cues
4. Start the attempt.

Expected result:

- readiness page reflects the current exam configuration
- student can start the attempt normally

### H. Student Attempt Runtime

Test each question type:

1. Answer the `MCQ single` question.
2. Answer the `MCQ multiple` question by selecting all correct options.
3. Answer the `True / False` question.
4. Mark one question for review.
5. Clear one response.
6. Skip one question.
7. Navigate between questions.
8. If the exam has multiple sections, switch sections if policy allows.

Expected result:

- answers save successfully
- multi-select state persists
- marked-for-review state persists
- clear and skip work correctly
- no question disappears or resets unexpectedly

### I. Resume Behavior

1. Start an exam attempt.
2. Answer at least one question.
3. Refresh the browser or reopen the exam.
4. Resume the attempt.

Expected result:

- active attempt is detected
- student lands back in the same attempt
- saved answers remain intact
- current section context is preserved

### J. Section Runtime

1. Use an exam with at least two sections.
2. If section timing is enabled, stay in the attempt long enough to validate timer behavior.
3. If hybrid or sequential navigation is configured, attempt restricted moves between sections.

Expected result:

- current section label updates correctly
- section timer displays when expected
- disallowed section moves are blocked with a clear message

### K. Submit And Result Visibility

1. Submit the attempt.
2. Confirm the summary screen loads.
3. Validate summary behavior based on configuration:
   - score hidden before publish
   - score visible immediately when configured
4. Check whether review is blocked or allowed based on review settings.

Expected result:

- summary behavior matches exam policy
- no accidental early score leak occurs
- review availability matches configuration

### L. Review Experience

1. Open review when the exam policy allows it.
2. Check:
   - attempted-only review behavior
   - section labels in review
   - correct-answer visibility
   - explanation visibility

Expected result:

- review mode matches policy
- explanations appear only when allowed
- question state is accurate

### M. Teacher Operations

1. Open the exam after students start attempts.
2. Review `Live exam monitor`.
3. Validate:
   - recent attempts
   - alert counts
   - high-priority queue
   - force-submit eligibility
4. Use `Preview`, `Manage assignments`, and status controls.
5. Test:
   - `Refresh status`
   - `Mark live`
   - `Mark completed`

Expected result:

- teacher actions work without crashing
- alert queue is readable and actionable
- status changes behave consistently

### N. Result Operations

1. Generate results for an exam.
2. Calculate ranks.
3. Publish results.
4. Re-open student results.

Expected result:

- result generation succeeds
- rank calculation succeeds
- published results become visible to students according to policy

### O. Regression Checks

1. Confirm older `MCQ single` flow still works.
2. Confirm `True / False` still works.
3. Confirm one unassigned student cannot access selected-student exams.
4. Confirm one teacher cannot operate foreign-scope exams.
5. Confirm no section data disappears from readiness, attempt, or review screens.

## UAT Sign-Off Template

Use this simple template after the run:

```text
Environment:
Tester:
Date:

Passed:
- Smoke
- Teacher builder
- Sections
- Preview
- Assignment
- Student attempt
- Resume
- Review
- Teacher operations
- Result operations

Blocked / Failed:
- 

Notes:
- 

Decision:
- Ready for pilot
- Ready with minor fixes
- Not ready
```

## Recommended Testing Order

Run the checklist in this order:

1. smoke
2. teacher builder
3. question bank
4. sections
5. preview
6. assignment
7. student runtime
8. submit / review / results
9. teacher live operations
10. regression sweep

