# EduTech Frontend

Flutter client foundation for the EduTech education portal with a single codebase for web, Android, and iOS.

## Stack

- Flutter
- Riverpod
- GoRouter
- Dio

## Setup

```bash
cd edutech_frontend
flutter pub get
flutter run --dart-define-from-file=env/dev.json
```

## Architecture

```text
lib/
  app/
  core/
  shared/
  features/
```

Each feature uses the same slice layout:

- `data`
- `domain`
- `presentation`

## Included routes

- `/login`
- `/dashboard`
- `/exams`
- `/question-bank`
- `/results`
- `/academic-setup`

## Environment configuration

API configuration is compile-time driven with Flutter defines.

Development:

```bash
flutter run --dart-define-from-file=env/dev.json
```

Production:

```bash
flutter build web --dart-define-from-file=env/prod.json
```

## Demo Readiness

Recommended validation:

```bash
flutter analyze
flutter test
```

Recommended demo flow after backend seed data is ready:

1. Login as `demo-platform-admin` and open `Academic Setup`.
2. Login as `demo-institute-admin` and review institute-scoped setup records.
3. Login as `demo-teacher` and walk:
   - `Question Bank`
   - `Exams`
   - `Results`
4. Login as `demo-student` and walk:
   - `Dashboard`
   - `Exams`
   - `Results`

The seeded credentials are:

- `demo-platform-admin` / `Demo@12345`
- `   ` / `Demo@12345`
- `demo-teacher` / `Demo@12345`
- `demo-student` / `Demo@12345`
- `demo-parent` / `Demo@12345`

Make sure the backend is running first and that `env/dev.json` points to the correct API base URL.
