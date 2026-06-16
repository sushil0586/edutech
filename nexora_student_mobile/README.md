# Nexora Student Mobile

Role-scalable React Native mobile foundation for Nexora, with the first implementation limited to the student lane.

## Current Implementation Scope

1. Register
2. Login
3. Dashboard
4. Exam Detail
5. Live Attempt
6. Analytics

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
- Screens currently use honest implementation placeholders rather than fake product data.
