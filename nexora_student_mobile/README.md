# Nexora Student Mobile

Role-scalable React Native mobile foundation for Nexora, with the first implementation limited to the student lane.

## Current Implementation Scope

1. Register
2. Login
3. Secure session restore
4. Role gate
5. Dashboard
6. Exam Detail
7. Live Attempt
8. Attempt Summary
9. Attempt Review
10. Analytics
11. Profile
12. Logout

## Current Product Status

The mobile app is now beyond scaffold stage.

It already supports the core student journey end to end:

1. register
2. log in
3. open dashboard
4. open exam detail
5. start or resume attempt
6. answer and save questions
7. submit attempt
8. review summary
9. inspect answer review
10. open analytics

## Student-Focused Enhancements Completed

Recent enhancement work includes:

- guided registration choices for class level, board, and exam interest
- better login and registration validation
- clearer auth and restore error messaging
- safer attempt navigation with unsaved-draft protection
- submit confirmation flow for live attempts
- clearer post-exam summary, review, and analytics guidance

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
```

If you run on:

- iOS simulator: `http://localhost:8000`
- Android emulator: `http://10.0.2.2:8000`
- Physical device: use your machine LAN IP, for example `http://192.168.1.20:8000`

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
