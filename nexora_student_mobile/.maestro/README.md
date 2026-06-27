# Mobile Automation

This folder contains native mobile automation flows for `nexora_student_mobile`.

## Why not Playwright here?

Playwright is the right primary tool for the Next.js web app.

For the React Native mobile app, native-focused tools are a better fit because they validate:

- real app navigation
- real device rendering
- native input handling
- secure session restore behavior
- runtime interaction on Android and iPhone form factors

For this app, the recommended starting point is **Maestro** because it is lightweight and good for end-to-end student-journey coverage.

## Prerequisites

1. Install Maestro CLI
2. Build and launch the Expo native app on a simulator or device
3. Make sure `EXPO_PUBLIC_API_BASE_URL` points to a reachable backend
4. Use a seeded student account with:
   - at least one available exam
   - at least one completed attempt with a visible summary for results/summary flows
   - optional active attempt
   - optional published result or review-ready result

## Flows

- `student-login-and-exams.yaml`
  - login
  - open exams lane
  - use search/filter controls
  - open the top exam
- `student-results-and-summary.yaml`
  - login
  - open results lane
  - open attempt summary
  - return to dashboard
  - verify attempts-to-results navigation
- `student-review-journey.yaml`
  - login
  - open results lane
  - open a review-ready result
  - return to summary
  - return to results
- `student-active-attempt.yaml`
  - login
  - open attempts lane
  - validate attempts-lane hero and metrics
  - validate empty-active-state messaging for current QA seed data
  - open results from attempts and return safely
- `student-analytics-and-logout.yaml`
  - login
  - open analytics lane
  - validate analytics hero and next-action surface
  - open results
  - open profile
  - logout back to the unauthenticated role gate
- `student-login-offline-error.yaml`
  - warm app already on login screen
  - login attempt while offline
  - validate friendly connection failure copy
  - confirm the student remains on the login path
- `student-register-offline-setup-error.yaml`
  - warm app already on login screen
  - enter register while offline
  - validate friendly registration-setup failure copy while offline
  - confirm retry guidance is visible

## Run

```bash
cd nexora_student_mobile
maestro test .maestro/student-login-and-exams.yaml
maestro test .maestro/student-results-and-summary.yaml
maestro test .maestro/student-review-journey.yaml
maestro test .maestro/student-active-attempt.yaml
maestro test .maestro/student-analytics-and-logout.yaml
maestro test .maestro/student-login-offline-error.yaml
maestro test .maestro/student-register-offline-setup-error.yaml
```

## Notes

- The app now includes `testID` hooks for key auth and exam-lane controls.
- The app now also exposes `testID` hooks across attempts, results, summary, review, and runtime actions.
- We should keep expanding flows one journey at a time instead of trying to automate every data-dependent branch in one script.
- Review automation depends on seeded accounts that actually have a review-ready result. Keep that data contract explicit in QA setup.
- The current `student-active-attempt.yaml` is intentionally a non-destructive attempts-lane smoke flow because the default Android QA seed currently exposes completed history but no active attempt.
- A true resume-runtime flow still depends on a dedicated seeded account with an in-progress attempt. See [STUDENT_SEED_CONTRACT.md](./STUDENT_SEED_CONTRACT.md).
