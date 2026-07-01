# Registration And Access Control Functionality And Playwright Map

This document covers non-role-specific entry flows: anonymous access control, login protection, and self-registration journeys.

## Purpose

These flows make sure the right user lands in the right workspace and that unauthorized users cannot directly browse protected routes.

## End-to-end functionality

### 1. Anonymous protected-route blocking

Anonymous users should:

- be redirected to login when opening protected institute routes
- be redirected to login when opening protected teacher routes
- be redirected to login when opening protected student routes

Associated Playwright:

- Baseline: `tests/e2e/role-scope/access-control.spec.ts`

### 2. Wrong-role workspace blocking

Authenticated users should:

- be prevented from entering workspaces that belong to another role
- remain scoped to their own role shell and permissions

Associated Playwright:

- Baseline: `tests/e2e/role-scope/access-control.spec.ts`

### 3. Student self-registration

Prospective student should be able to:

- open student registration
- submit registration details
- complete profile handoff

Associated Playwright:

- Baseline: `tests/e2e/smoke/registration.spec.ts`

### 4. Teacher self-registration

Prospective teacher should be able to:

- open teacher registration
- submit registration details
- complete profile handoff

Associated Playwright:

- Baseline: `tests/e2e/smoke/registration.spec.ts`

## Practical system contract

1. Anonymous user cannot directly enter protected product areas.
2. Login acts as the common gate for protected routes.
3. Registered user completes onboarding into the correct next step.
4. Authenticated user remains limited to the correct workspace based on role.

## Automation status

- Core access-control and registration contract is already covered.
- These specs should remain part of every release-readiness sanity pass because they protect the entire role model.

## What is not covered

- Full identity-proofing, KYC-style verification, or enterprise SSO integrations are not covered here.
- Email delivery, OTP delivery, resend throttling, and external notification-provider behavior are not fully covered here.
- Malicious-user security testing such as rate-limit abuse, brute-force resistance, and penetration-style checks are not covered here.
- Password policy variants, recovery flows, and account-lockout operations are only partially represented unless separately tested elsewhere.
