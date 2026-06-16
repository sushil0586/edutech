# Student Module QA Checklist

## Purpose

This checklist is for validating the completed student-side Next.js experience in `edutech_web` against real backend states.

Use it for:

- route-by-route QA
- founder or product walkthroughs
- backend/frontend integration validation
- final student module sign-off

## Scope

This checklist covers the student routes in [edutech_web](/Users/ansh/Documents/Eductech/edutech_web):

- `/login`
- `/app/dashboard`
- `/app/exams`
- `/app/exams/[examId]`
- `/app/exams/enter-key`
- `/app/practice`
- `/app/attempts`
- `/app/attempts/[attemptId]`
- `/app/attempts/[attemptId]/summary`
- `/app/attempts/[attemptId]/review`
- `/app/results`
- `/app/analytics`
- `/app/weak-areas`
- `/app/wallet`
- `/app/subscriptions`
- `/app/notifications`
- `/app/profile`
- `/app/settings`

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

Full student verification:

```bash
npm run verify:student
```

## Suggested Accounts

Use the seeded student account when available:

- `demo-student` / `Demo@12345`

Also keep a teacher account available so you can move exam lifecycle states when needed:

- `demo-teacher` / `Demo@12345`

## Preconditions

Before starting the student QA pass, make sure:

- at least one exam is assigned to the student
- at least one exam is startable
- at least one exam or practice set is locked by a real economy policy
- at least one locked item is unlockable by stars
- at least one exam supports a submitted attempt
- at least one attempt is still in progress
- at least one result is published
- at least one result is hidden or pending
- at least one review is allowed
- at least one review is blocked by policy
- at least one star pack exists
- at least one subscription plan with at least one cycle exists
- at least one pending order exists
- at least one completed or credited order exists
- at least one reward event exists

If all of these states do not already exist, create them from the teacher side first.

## Exit Criteria

The student module can be considered QA-complete when:

- all critical routes load without blocker errors
- the attempt lifecycle works from start to submit
- summary, results, and review states match backend policy
- economy screens reflect wallet, reward, unlock, order, and subscription truth correctly
- locked content never silently behaves like free content
- purchase requests, processed orders, and credited outcomes are visually distinct
- no page overpromises visibility or review access
- empty, error, and blocked states remain understandable
- `npm run verify:student` passes successfully in `edutech_web`

## Test Matrix

Validate these state combinations during QA:

| State | Expected student behavior |
| --- | --- |
| Backend unavailable | Friendly error or fallback, not a broken blank page |
| Expired session | Redirect to login or protected-route handling |
| No assigned exams | Empty-state guidance on exam-facing screens |
| Active attempt exists | Resume flow is shown clearly |
| Locked content exists | UI shows lock reason and truthful CTA |
| Unlockable premium item exists | Unlock with stars CTA works and changes availability |
| Pending order exists | Student sees request as pending, not credited |
| Credited order exists | Student sees processed and credited state distinctly |
| Active subscription exists | Billing period and credit history are understandable |
| Submitted, result hidden | Summary and results explain pending visibility |
| Result published, review locked | Score visible, review messaging blocked clearly |
| Result published, review available | Review CTA visible and works |
| Empty notifications | Empty-state message appears |
| Sparse analytics data | Page still renders with fallback guidance |

## Route Checklist

### 1. Login And Session

1. Open `/login`.
2. Log in with `demo-student`.
3. Confirm the student lands on `/app/dashboard`.
4. Refresh the page.
5. Open a few protected student routes directly in the URL bar.
6. Log out from `/app/settings`.
7. Re-open a protected route after logout.

Expected result:

- login succeeds
- protected routes use the active student session
- refresh does not break the session
- logout clears access to protected routes

### 2. Dashboard

1. Open `/app/dashboard`.
2. Confirm the KPI cards load.
3. Confirm the current exam card is meaningful when data exists.
4. Confirm locked premium items appear in the premium section only when backend access policy says so.
5. If a locked item is unlockable with stars, confirm the CTA and price are visible.
6. Unlock one locked dashboard item if available.
7. Confirm wallet and catalog state change after unlock.
8. Confirm strong and weak topic panels render.
9. Confirm action buttons point to valid student routes.
10. Repeat with low-data or empty-data conditions if available.

Expected result:

- dashboard loads without console-breaking errors
- cards and charts do not rely on duplicate keys or unstable rendering
- action prompts feel consistent with actual backend state
- empty states remain helpful

### 3. Mock Tests List

1. Open `/app/exams`.
2. Confirm the page shows available mock tests.
3. Check one exam that can be started now.
4. Check one exam that is blocked or unavailable if present.
5. Check one exam that is locked by stars if present.
6. Validate CTA labels such as start, resume, unlock, summary, or review.
7. Unlock one locked exam if available.
8. Confirm the exam moves into the unlocked/startable flow without manual refresh confusion.

Expected result:

- exam cards reflect real availability
- blocked states are explained
- CTA priority matches the real next action

### 4. Exam Detail

1. Open `/app/exams/[examId]` for a startable exam.
2. Confirm the hero section explains the exam, policy, and next step.
3. Confirm section list, question count, and attempt information are visible.
4. Start the attempt from this page.
5. Re-open for an exam with an active attempt and confirm resume behavior.
6. Re-open for an exam with no attempts left if available.
7. Re-open for an exam locked by stars if available.
8. Confirm lock reason, unlock CTA, and wallet path are clear.

Expected result:

- the page answers “can I start, why, and what happens next?”
- start, resume, summary, and review CTAs are accurate
- blocked states are explained, not silent

### 5. Attempt History

1. Open `/app/attempts`.
2. Confirm in-progress attempts are separated from submitted attempts.
3. Resume an in-progress attempt.
4. Open summary from a submitted attempt.
5. Open results from a submitted attempt.
6. Confirm the page does not promise review access unless backend state allows it elsewhere.

Expected result:

- attempt history is easy to scan
- in-progress and completed flows are distinct
- post-submit CTAs guide the user to the right status page
- practice follow-up guidance does not bypass real access policy

### 6. Practice Workspace

1. Open `/app/practice`.
2. Confirm practice sets are filtered by subject mode when selected.
3. Check one practice set that can start immediately.
4. Check one practice set that is resumable.
5. Check one practice set locked by stars if available.
6. Confirm the CTA becomes `Unlock with stars` instead of generic start text.
7. Unlock one locked practice set if available.
8. Confirm the detail page and start flow become available after unlock.

Expected result:

- practice uses the same access truth as the exam workspace
- locked practice does not appear as silently available
- unlock, resume, and start behavior all stay consistent with backend state

### 7. Active Attempt Workspace

1. Open `/app/attempts/[attemptId]`.
2. Confirm the attempt shell shows timer, section, progress, and submission context.
3. Answer one question.
4. Change the answer and confirm the latest answer persists.
5. Clear one answer if supported.
6. Mark a question for review if supported.
7. Use previous and next navigation.
8. Use the question palette.
9. Switch sections if allowed by policy.
10. Refresh the browser and confirm attempt state persists.

Expected result:

- the attempt page feels stable and trustworthy
- saved answers persist after refresh
- section and question navigation stay in sync
- there are no confusing dead ends before submission

### 8. Submit Flow

1. From an active attempt, submit the exam.
2. Confirm the submission action completes successfully.
3. Confirm the user is redirected to `/app/attempts/[attemptId]/summary`.
4. Confirm the attempt no longer appears as active.

Expected result:

- submission is deliberate and clear
- post-submit navigation lands on summary
- the active attempt state is closed correctly

### 9. Attempt Summary

1. Open `/app/attempts/[attemptId]/summary`.
2. Validate a state where result is still hidden.
3. Validate a state where result is visible but review is locked.
4. Validate a state where review is available.
5. Confirm the CTA wording changes with the state.
6. Confirm the follow-up practice CTA is access-aware and does not bypass locks.

Expected result:

- summary explains whether scoring is pending, published, or reviewable
- summary never implies review access too early
- next-step guidance is clear for each policy state

### 10. Results Workspace

1. Open `/app/results`.
2. Confirm published results show score-oriented data.
3. Confirm unpublished or pending results are visually distinct.
4. Open result-linked summary where applicable.
5. Open review only when policy allows it.
6. Confirm practice follow-up CTA respects live practice availability and lock state.

Expected result:

- results separate published and pending states cleanly
- result cards are readable and truthful
- score visibility follows backend rules exactly

### 11. Review Workspace

1. Open `/app/attempts/[attemptId]/review` for an allowed review.
2. Confirm question text and options render correctly.
3. Confirm selected answers and correctness state are visible.
4. Confirm explanations only appear when allowed.
5. Validate a blocked review case and confirm guidance is shown instead of a confusing failure.
6. Confirm the follow-up practice CTA uses live access-aware behavior, not a hardcoded link.

Expected result:

- review is understandable and policy-aware
- correctness and explanation visibility are not overexposed
- blocked review states still help the student understand what to do next

### 12. Analytics

1. Open `/app/analytics`.
2. Confirm KPI cards, trend view, and subject/topic insights render.
3. Confirm action suggestions point to valid next steps.
4. Validate behavior with weak or sparse data.
5. If the recommended practice set is locked, confirm the hero CTA becomes an unlock flow rather than a misleading start flow.

Expected result:

- analytics remains useful even with limited history
- action prompts connect to exams, results, or weak areas logically

### 13. Weak Areas

1. Open `/app/weak-areas`.
2. Confirm weak topics are ranked clearly.
3. Confirm the page gives practical follow-up actions.
4. Open linked routes such as analytics, exams, or result status from this page.
5. If the recommended practice set is locked, confirm the hero CTA becomes an unlock flow rather than a misleading start flow.

Expected result:

- the page turns weak signals into clear next actions
- topic rows remain stable and render without duplicate-key issues

### 14. Wallet

1. Open `/app/wallet`.
2. Confirm wallet summary loads with real available stars.
3. Confirm reward history appears when reward events exist.
4. Confirm referral code is visible only when issued by backend.
5. Confirm unlock history reflects real content access states.
6. Create a star-pack order.
7. Confirm it appears as pending, not credited.
8. After manual backend confirmation, reload and confirm:
   - order status is updated
   - transaction state is visible
   - wallet credit is reflected
9. Confirm order lifecycle detail distinguishes:
   - request created
   - processed
   - credited

Expected result:

- wallet acts as the trust screen for the star economy
- reward, unlock, and order states all reflect real backend records
- pending and credited states are clearly different

### 15. Subscriptions

1. Open `/app/subscriptions`.
2. Confirm available plans and cycles load from backend.
3. Create a subscription order.
4. Confirm it appears as pending and not yet credited.
5. After manual backend confirmation, reload and confirm:
   - student subscription appears or updates
   - activation timing is visible
   - billing events render
   - credited state is visible when ledger credit exists
6. Confirm subscription messaging does not imply automatic access without settlement.

Expected result:

- subscriptions are understandable even before payment-provider automation exists
- order state, activation, and credit state are visible separately

### 16. Notifications

1. Open `/app/notifications`.
2. Confirm notifications load.
3. Mark one notification as read.
4. Mark all notifications as read.
5. Validate the empty state when all notifications are cleared or none exist.

Expected result:

- notification actions complete successfully
- read state updates are reflected in the UI
- empty state remains polished

### 17. Profile And Settings

1. Open `/app/settings`.
2. Confirm account overview renders active student data.
3. Confirm workspace and help guidance sections are visible.
4. Confirm no fake control appears to save something unsupported.
5. Use logout from this page.

Expected result:

- settings feels intentional, not stub-like
- only truthful controls and guidance are shown
- logout works from the student workspace

### 18. Exam Key Flow

1. Open `/app/exams/enter-key`.
2. Enter a valid exam key for an exam the student can access.
3. Confirm the student lands on:
   - the active attempt if one exists, or
   - the exam detail page if no attempt exists
4. Repeat for a key tied to a locked-by-stars exam if available.
5. Confirm the student still lands on truthful detail state rather than bypassing access rules.

Expected result:

- exam-key flow respects the same access and unlock rules as the catalog
- no key path silently bypasses star gating

### 19. Production Build Validation

Run from [edutech_web](/Users/ansh/Documents/Eductech/edutech_web):

```bash
npm run typecheck
npm run build
```

Expected result:

- build passes successfully
- no route-level compile failure appears
- no environment-variable assumption breaks the build
- `npm run verify:student` can be used as the standard student launch verification command

## Cross-Route Consistency Checks

Validate these across the whole student module:

- status pills use consistent language
- CTA labels are consistent between exams, attempts, summary, results, and review
- practice follow-up actions are consistent between weak areas, analytics, summary, review, and results
- result visibility wording does not conflict between pages
- review availability wording does not conflict between pages
- locked-content messaging does not conflict between dashboard, exams, detail, and practice
- wallet and subscriptions do not imply credit before settlement occurs
- empty states do not look like failures
- navigation labels match the current product language such as `Mock Tests`

## Regression Watchlist

Pay extra attention to:

- duplicate React key warnings in mapped student lists
- stale attempt state after refresh
- review links shown before review is actually allowed
- results pages showing score placeholders as if they were final scores
- mismatched CTA paths between summary and results
- attempt history overpromising available actions
- locked premium content appearing as startable in any student surface
- pending order or subscription states being shown as credited too early
- hidden backend errors that only appear in the browser console

## Final Sign-Off Template

Use this after the pass:

- Build status: `pass` / `fail`
- Login/session: `pass` / `fail`
- Dashboard: `pass` / `fail`
- Mock tests: `pass` / `fail`
- Exam detail: `pass` / `fail`
- Active attempt: `pass` / `fail`
- Submit and summary: `pass` / `fail`
- Results: `pass` / `fail`
- Review: `pass` / `fail`
- Analytics: `pass` / `fail`
- Weak areas: `pass` / `fail`
- Wallet: `pass` / `fail`
- Subscriptions: `pass` / `fail`
- Exam key flow: `pass` / `fail`
- Notifications: `pass` / `fail`
- Settings/logout: `pass` / `fail`
- Blocking bugs:
- Minor issues:
- Ready for student sign-off: `yes` / `no`
