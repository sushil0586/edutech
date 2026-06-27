# Nexora Student Mobile

Role-scalable React Native mobile foundation for Nexora, with the first implementation limited to the student lane.

## Current Implementation Scope

1. Register
2. Login
3. Secure session restore
4. Role gate
5. Dashboard
6. Exams
7. Attempts
8. Results
9. Exam Detail
10. Live Attempt
11. Attempt Summary
12. Attempt Review
13. Analytics
14. Profile
15. Logout

## Current Product Status

The mobile app is now beyond scaffold stage.

It already supports the core student journey end to end:

1. register
2. log in
3. open dashboard
4. browse the exam lane
5. reopen active or completed attempts
6. open exam detail
7. start or resume attempt
8. answer and save questions
9. submit attempt
10. open results when publication allows
11. review summary
12. inspect answer review
13. open analytics

## Student-Focused Enhancements Completed

Recent enhancement work includes:

- guided registration choices for class level, board, and exam interest
- better login and registration validation
- clearer auth and restore error messaging
- safer attempt navigation with unsaved-draft protection
- submit confirmation flow for live attempts
- dedicated mobile exams lane with resume-ready, startable, and locked sections
- dedicated mobile attempts lane with runtime, summary, and review handoffs
- clearer post-exam summary, results, review, and analytics guidance

## Stack

- Expo
- React Native
- TypeScript
- Expo Router
- TanStack Query
- Zustand

## Run

```bash
npm install
npm run start
```

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Then set:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
EXPO_PUBLIC_API_REQUEST_TIMEOUT_MS=20000
```

If you run on:

- iOS simulator: `http://localhost:8000`
- Android emulator: `http://10.0.2.2:8000`
- Physical device: use your machine LAN IP, for example `http://192.168.1.20:8000`

`EXPO_PUBLIC_API_REQUEST_TIMEOUT_MS` is optional in normal development, but useful for QA.
For example, setting it to `3000` makes timeout and retry states easier to validate on slow or offline networks.

## Helpful Commands

```bash
npm run start
npm run ios
npm run android
npm run web
npm run typecheck
```

## Notes

- Architecture is role-ready.
- Only the student lane is implemented in first-release scope.
- Core student flows are wired to live backend APIs.
- This app should be treated as an active student beta surface, not just a mobile prototype.
- For weak-network QA, use the timeout override plus the Android emulator commands documented in [STUDENT_MOBILE_WEAK_NETWORK_RUNBOOK.md](/Users/ansh/Documents/Eductech/STUDENT_MOBILE_WEAK_NETWORK_RUNBOOK.md:1).
