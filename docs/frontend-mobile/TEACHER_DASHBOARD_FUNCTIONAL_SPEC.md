# Teacher Dashboard Functional Spec

## Objective

The teacher dashboard is the operational home screen for teaching staff.

It should help a teacher answer:

- what exams are active
- what learner activity needs attention
- what outcomes are weak
- where to go next

## Current Implemented Surface

Current route:

- `/teacher/dashboard`

Current live data sources:

- teacher insight summary
- teacher exams list

Current visible blocks:

- tracked exams
- total attempts
- average score
- exam delivery snapshot
- weak topics across learners
- top performing students
- most wrong questions

## Final Dashboard Zones

### 1. Header Zone

Purpose:

- orient the teacher inside the workspace
- show whether data is live or unavailable

Must show:

- page title
- short operational description
- backend/live status pill

### 2. KPI Zone

Purpose:

- summarize overall teaching activity at a glance

Cards:

- tracked exams
- total attempts
- average score
- optionally live exams later

Behavior:

- values must come from backend summary only
- never infer hidden values on frontend

### 3. Delivery Snapshot Zone

Purpose:

- show exam-level delivery visibility

Each row should show:

- exam title
- exam code
- average performance
- total attempts

Teacher actions from this zone:

- open exams workspace
- later optional quick jump to exam detail

### 4. Weak Topics Zone

Purpose:

- surface instructional intervention signals

Each row should show:

- topic name
- subject name
- average percentage
- attempted question count

Teacher action expectation:

- identify whether remediation content or follow-up tests are needed

### 5. Top Students Zone

Purpose:

- show high performers based on available result summaries

Each row should show:

- student name
- admission number
- average percentage

### 6. Most Wrong Questions Zone

Purpose:

- identify poor-performing items or concepts

Each row should show:

- question summary
- subject and topic
- wrong count
- total attempts

## Empty And Error States

### Unconfigured

Show when:

- API base URL is missing
- teacher session is unavailable

Message should say:

- dashboard needs live teacher endpoints
- teacher must sign in with active scoped account

### Error

Show when:

- request fails
- teacher summary cannot be loaded

Message should say:

- backend connectivity or teacher scope request failed

### Live But Sparse

Show partial empty messages inside sections when:

- no weak topics yet
- no high-performing students yet
- no question analysis yet

This is not an error.

It is a valid “not enough activity yet” state.

## Future Dashboard Enhancements

These should be documented as planned, not assumed active:

- class/cohort filter
- subject filter
- intervention queue
- pending result publication reminders
- draft exams needing completion
- direct actions into live monitoring

## Definition Of Done

Dashboard is complete when:

- all panels use live teacher data
- no summary card is hardcoded
- sparse-state messaging is truthful
- teacher can move from dashboard into exams and results confidently
- same visual language as student dashboard is preserved
