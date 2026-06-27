# Student Mobile Automation Seed Contract

This file is the minimum data contract for native student mobile automation in `nexora_student_mobile`.

## Purpose

The mobile Maestro flows are only reliable when the backing student account has predictable exam-state data.

Without that, automation fails for the wrong reason:

- no available exam
- no active attempt
- no visible result
- no review-ready attempt

That is a setup problem, not an app regression.

## Required Accounts

Use separate seeded student accounts when possible instead of trying to make one account satisfy every scenario.

### `student_exam_ready`

Use for:

- `student-login-and-exams.yaml`

Required state:

- can log in successfully
- sees the student dashboard
- has at least one exam visible in the exams lane
- ideally has at least one startable exam

### `student_result_ready`

Use for:

- `student-results-and-summary.yaml`

Required state:

- can log in successfully
- has at least one completed attempt
- that attempt exposes a summary route from the results lane
- result may be published or pending, but summary must open

### `student_review_ready`

Use for:

- `student-review-journey.yaml`

Required state:

- can log in successfully
- has at least one result with `review_available = true`
- the result appears in the mobile results lane
- the review route loads successfully

### `student_active_attempt`

Use for:

- `student-active-attempt.yaml`

Required state:

- can log in successfully
- exposes the mobile attempts lane
- may have `ACTIVE = 0` for the current smoke flow
- should expose completed-history CTAs such as `Open Results`

Future dedicated runtime state:

- has at least one in-progress attempt
- that attempt appears in the mobile attempts lane
- opening it lands in the live runtime screen

Current note:

- the default seeded `demo-student` account does not currently satisfy this contract on the Android QA environment
- it currently exposes completed history, but `ACTIVE` is `0`
- because of that, `student-active-attempt.yaml` currently validates the attempts lane and CTA navigation instead of resume-runtime behavior

## Data Rules

- Do not reuse a single destructive account for every flow if submit/review state can change between runs.
- Prefer seed refresh over manual patching when a flow stops being reproducible.
- Record which institute, class, subject, and exam created the expected mobile state.
- If a flow fails because the seeded state is missing, mark it as `setup gap`, not `product bug`.

## Suggested QA Naming

- username suffixes such as `student.exam.ready`, `student.result.ready`, `student.review.ready`, and `student.active.attempt`
- one source document that maps each account to institute code and expected mobile lane state

## Future Expansion

When we add submit-path automation, we should create a disposable runtime account specifically for:

- answer save/clear validation
- submit confirmation validation
- post-submit summary transition

That flow should not share the same account used for passive read-only regression coverage.
