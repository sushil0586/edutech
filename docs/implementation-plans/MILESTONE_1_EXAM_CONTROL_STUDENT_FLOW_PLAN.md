# Milestone 1 Exam Control Student Flow Plan

## Goal

Define the learner-visible behavior for slot-managed and attempt-timed exams.

## Core student rule

The timer starts when the student starts the attempt, not when the exam window opens.

## Student flow by mode

### 1. `global_window_legacy`

Behavior:

- current fallback behavior remains for backward compatibility

Use:

- old exams during migration only

### 2. `slot_managed`

Behavior:

- student sees assigned slot
- student sees whether start is open now
- student can start only inside the allowed slot window
- timer starts at attempt start
- exam ends at `expires_at`
- optional hard-close can clip the attempt if policy requires it

Student messaging must show:

- assigned slot start
- assigned slot end
- grace period
- exam duration
- start blocked reason if blocked

### 3. `long_window_attempt_managed`

Behavior:

- student sees broad availability window
- student can start anytime within the window
- timer starts only when the attempt starts

Student messaging must show:

- access window
- duration
- whether current demand caps are blocking new starts

## Required student states

### Start allowed

Show:

- `Start now`
- duration
- end time estimate after start if possible

### Resume allowed

Show:

- active attempt
- remaining time
- clear resume path

### Blocked by slot timing

Show:

- “Your assigned slot is not open yet” or equivalent
- next allowed start time

### Blocked by capacity

Show:

- slot/event is temporarily full
- retry guidance

### Blocked by commercial rule

Show:

- subscription exhausted
- stars required
- sponsored access not present

## Student pages affected

- dashboard
- exams list
- exam detail
- attempt workspace header and timers

## Runtime truth requirements

The student should always see:

- why access is blocked
- whether the block is time, capacity, or commerce
- whether retry is possible
- whether support action is needed

## Pilot-first scope

Must-have:

- slot timing truth
- attempt-start timer truth
- blocked reason truth
- resume without re-consuming subscription allowance

Can wait:

- queueing experience
- predictive “best start time” suggestions
- rich event status banners for platform-wide events
