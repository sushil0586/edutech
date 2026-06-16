# Student Mobile QA Checklist

## Objective

This checklist is for validating the `nexora_student_mobile` app as a student-facing beta surface.

It should be executed on real devices whenever possible.

## Test Setup

Before starting:

1. confirm backend is reachable from the device
2. confirm `EXPO_PUBLIC_API_BASE_URL` points to the correct environment
3. confirm test student accounts are available
4. confirm at least one student has:
   - available exams
   - locked exams
   - result history
   - topic-performance data

## Environment Checks

- App launches successfully
- Session restore does not crash
- Role gate loads correctly
- Unsupported-role handling is controlled
- API misconfiguration message is understandable

## Auth Flow

### Registration

- Register screen opens successfully
- Registration options load
- Class level selection works
- Board selection works
- Exam interest selection works
- Required-field validation works
- Invalid email validation works
- Password mismatch validation works
- Registration success routes to role gate correctly
- Backend registration errors are understandable

### Login

- Login screen opens successfully
- Missing username validation works
- Missing password validation works
- Invalid-credential message is understandable
- Successful login routes to student dashboard

### Session Handling

- App reopen restores session correctly
- Expired session returns user to login path clearly
- Restore failure does not leave the user stuck
- Logout clears session and returns to auth flow

## Dashboard

- Dashboard loads without crashing
- Student greeting and context are visible
- Stars metric is visible
- Available exams list appears when data exists
- Locked exams list appears when data exists
- Recommended exam action works
- Subject lane switching works
- Analytics preview section is visible
- Empty-state behavior is understandable when no exams exist

## Exam Detail

- Exam detail opens from dashboard
- Resume flow works when active attempt exists
- Start flow works when no active attempt exists
- Section preview is visible
- Security guidance is visible
- Locked exam state is understandable

## Attempt Flow

### Runtime Basics

- Attempt screen loads successfully
- Question navigator works
- Section switching works
- Timer state is visible
- Integrity metrics are visible

### Answering

- Single-select response works
- Multi-select response works
- Written response works
- Mark-for-review toggle works
- Clear response works
- Save answer works
- Saved-state message updates clearly

### Safety Behaviors

- Unsaved draft indicator appears when expected
- Switching question with unsaved draft shows protection flow
- Switching section with unsaved draft shows protection flow
- Save-and-continue flow works
- Discard-draft flow works
- Submit confirmation screen appears
- Save-draft-and-submit flow works
- Direct submit flow works

### Error And Refresh

- Retry works after temporary attempt-load failure
- Background refetch does not break the current screen
- Attempt remains understandable after refresh

## Summary

- Summary screen loads after submit
- Result visibility state is understandable
- Review availability state is understandable
- Next-step guidance is understandable
- Review button works when review is available
- Analytics button works
- Dashboard button works

## Review

- Review screen loads when available
- Correct/incorrect/skipped labels are clear
- Selected answers are distinguishable
- Correct answers are distinguishable
- Marked-for-review question indicator is visible
- Explanation rendering works when allowed
- Hidden explanation state is still understandable

## Analytics

- Analytics screen loads successfully
- Average and accuracy metrics render
- Weak topics render correctly
- Strong topics render correctly
- Latest published result renders correctly
- Insight messages render correctly
- Next-action guidance feels sensible
- Subject filtering remains correct when subject lane changes

## Profile

- Profile screen loads successfully
- Student identity details render correctly
- Program context renders correctly
- Subject access chips render correctly
- Logout works cleanly

## Device Pass

Run the checklist on:

1. small Android screen
2. average Android screen
3. iPhone-size screen

Confirm:

- no critical overflow
- no hidden primary buttons
- no unreadable text blocks
- attempt flow remains usable on smaller screens

## Network Pass

Test under:

1. normal network
2. slow network
3. temporary network drop during attempt or analytics load

Confirm:

- loading states remain understandable
- retry paths are available
- student does not get trapped in dead-end states

## Exit Criteria

The student mobile app is ready for beta when:

1. all core flows pass
2. no critical blocker remains in auth, attempt, summary, review, or analytics
3. real-device usability is acceptable on small screens
4. failure states are recoverable without developer assistance
