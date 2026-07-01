# ECON-P0-01 Canonical Student Onboarding Hook Note

## Purpose

This note resolves `ECON-P0-01` from:

- [REFERRAL_WALLET_SUBSCRIPTION_PHASE_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/REFERRAL_WALLET_SUBSCRIPTION_PHASE_1_IMPLEMENTATION_TICKETS.md:1)

It identifies the exact lifecycle hook that should own:

- signup reward processing
- referral reward processing
- student economy initialization for public self-serve onboarding

## Decision

The canonical hook for public self-serve student economy onboarding is:

- `complete_public_onboarding(account_profile, validated_data)`

Location:

- [edutech_backend/apps/accounts/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/services.py:582)

## Why this is the correct hook

This is the first place in the public registration lifecycle where all required conditions are true:

1. a real `AccountProfile` already exists
2. role-specific validation is complete
3. institute context is available
4. location and school context are normalized
5. for students, a real `StudentProfile` is created or updated
6. onboarding is about to transition to `completed`

That makes it the earliest safe place to apply economy side effects without attaching rewards to an incomplete shell account.

## What happens earlier

Raw public registration happens before this in the account registration flow.

At that earlier stage:

- `referral_code` is captured
- registration context is stored
- acquisition context is stored
- `profile_completion_required` remains `true`
- `student_profile_id` is still `null`

This means raw registration is not the correct place to issue:

- signup rewards
- referral rewards

Why:

- there is no real student profile yet
- class, board, and academic placement are not finalized
- referral should reward real learner onboarding, not shell account creation

## What happens inside the canonical hook

Inside `complete_public_onboarding()` for `student` role:

1. public academic year is resolved
2. public program is resolved from `class_level` and `board`
3. `accommodation_profile` is assembled
4. `StudentProfile` is created if it does not exist yet
5. `AccountProfile.student_profile` is linked
6. onboarding status is marked complete

This means the most stable insertion point is:

- after `student_profile` is guaranteed to exist
- before `account_profile.save()` finalizes onboarding completion

## Recommended orchestration point

For student role only, economy onboarding should run in `complete_public_onboarding()` after:

- `student_profile` creation or update
- `account_profile.student_profile = student_profile`

and before:

- `account_profile.onboarding_status = completed`
- `account_profile.save()`

## Recommended responsibilities of this hook

This hook should orchestrate:

1. `process_signup_rewards(student=student_profile, ...)`
2. referral resolution from registration context
3. `apply_referral_code_for_student_signup(student=student_profile, referral_code=...)`
4. referral code generation for the onboarded student where needed

## Idempotency rule

The canonical hook must remain safe if onboarding completion is retried.

That means:

- signup reward logic must stay idempotent
- referral application must stay idempotent
- rerunning the hook must not create duplicate ledger credits

Existing service-layer support already helps here:

- reward events are event-key based
- referral event creation is protected against duplicate referee usage per program

## Scope boundary

This decision is specifically for:

- public self-serve student onboarding

It does not automatically decide the economy hook for:

- admin-provisioned student creation
- institute roster import
- legacy student account linking

Those flows may need separate economy policy decisions later.

## Supporting evidence

### Public onboarding entry point

- [edutech_backend/apps/accounts/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/views/__init__.py:224)

The authenticated onboarding patch endpoint calls the onboarding serializer and then `complete_public_onboarding()`.

### Student profile creation

- [edutech_backend/apps/accounts/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/services.py:638)

This is where `StudentProfile.objects.create(...)` is called for public onboarding.

### Registration still lacks a real student profile

- [edutech_backend/apps/accounts/tests/test_public_registration.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/tests/test_public_registration.py:159)

The registration test confirms referral code is stored but `student_profile_id` is still null and no `ReferralEvent` is created yet.

### Onboarding completion creates the real student profile

- [edutech_backend/apps/accounts/tests/test_public_registration.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/tests/test_public_registration.py:358)

The onboarding completion test confirms student profile creation and onboarding completion.

## Decision summary

For the current public self-serve learner flow:

- `register` is the capture stage
- `complete_public_onboarding()` is the real economy trigger stage

So:

- do not issue signup or referral rewards at raw registration time
- do issue them from the student branch of `complete_public_onboarding()` once `StudentProfile` exists
