# Nexora UI UAT Checklist

Use this pass after the current frontend build is running locally.

## How To Run

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
npm run dev
```

Open `http://localhost:3000`.

## What To Check On Every Screen

1. Header area does not feel too tall.
2. Sidebar, topbar, and content area feel aligned.
3. Primary action is obvious within 3 seconds.
4. No duplicate summary cards or duplicate guidance blocks.
5. Filters and forms align properly on desktop.
6. Mobile and narrow-width layout does not break wrapping.
7. Empty-state, error-state, and success-state messages are understandable.
8. Buttons explain next step clearly.
9. Popup or modal opens centered, closes correctly, and page scroll behaves correctly.
10. Data shown is live/dynamic and not fake placeholder business data.

## Priority Routes

### Student

- `/app/dashboard`
- `/app/exams`
- `/app/exams/[examId]`
- `/app/results`
- `/app/wallet`
- `/app/profile`
- `/app/settings`

Check:
- Welcome area feels compact and balanced.
- Recommended test and wallet cards feel actionable.
- Subject chips do not look oversized.
- Locked content and star-related messaging is understandable.

### Teacher

- `/teacher/dashboard`
- `/teacher/exams`
- `/teacher/exams/new`
- `/teacher/exams/[examId]`
- `/teacher/exams/[examId]/builder`
- `/teacher/question-bank`
- `/teacher/question-bank/import`
- `/teacher/question-bank/[questionId]`
- `/teacher/results`

Check:
- Page header plus hero block no longer feels repetitive.
- Exam lifecycle actions are understandable.
- Question preview modal opens and closes cleanly.
- Import flow gives clear file, preview, and finalize guidance.
- Results page buttons match real readiness state.

### Institute

- `/institute/dashboard`
- `/institute/people`
- `/institute/academic-setup`
- `/institute/teacher-assignments`
- `/institute/exams`
- `/institute/exams/new`
- `/institute/exams/[examId]`
- `/institute/question-bank`
- `/institute/question-bank/import`
- `/institute/question-bank/[questionId]`
- `/institute/results`
- `/institute/settings`
- `/institute/economy`
- `/institute/security`
- `/institute/reports`

Check:
- Hero sections feel compact like teacher/student screens.
- Institute setup forms show field-level errors properly.
- Exam defaults form errors are understandable.
- Import and popup flows behave correctly.

### Admin

- `/admin/dashboard`
- `/admin/institutes`
- `/admin/people`
- `/admin/academic-setup`
- `/admin/economy`
- `/admin/security`
- `/admin/reports`
- `/admin/settings`

Check:
- Onboarding tools feel aligned and compact.
- Student create, teacher create, and roster import dialogs guide clearly.
- Institute selector and people tools are not visually crowded.
- No misleading fake operational wording remains.

### Parent

- `/parent/dashboard`
- `/parent/children`
- `/parent/progress`
- `/parent/alerts`
- `/parent/settings`

Check:
- Same visual language as student/teacher/institute.
- Header and hero spacing remain compact.
- Child switching and family status are understandable.

## Capture Issues Like This

For each issue, note:

```text
Route:
Role:
Problem:
Expected:
Screenshot:
Priority: High / Medium / Low
```

## Recommended UAT Order

1. Student
2. Teacher
3. Institute
4. Admin
5. Parent

## What I Can Still Do Without Waiting

1. Continue code-level QA for remaining repeated layout patterns.
2. Tighten any route you identify from screenshots.
3. Create role-wise issue lists from your UAT notes.
4. Fix responsiveness issues after your first visual pass.
