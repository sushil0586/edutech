# EduTech MVP Demo Guide

This guide is for showing the current Education Learning & Assessment MVP end to end.

## 1. Start the backend

```bash
cd edutech_backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo_academic_data
python manage.py runserver
```

Recommended backend validation:

```bash
python manage.py test
python manage.py check
python manage.py check --settings=config.settings.prod
```

## 2. Start the frontend

```bash
cd edutech_frontend
flutter pub get
flutter run --dart-define-from-file=env/dev.json
```

Recommended frontend validation:

```bash
flutter analyze
flutter test



cd /Users/ansh/Documents/Eductech/edutech_frontend
flutter clean
flutter pub get
flutter run -d chrome --dart-define-from-file=env/dev.json
```

## 3. Demo users

- `demo-platform-admin` / `Demo@12345`
- `demo-institute-admin` / `Demo@12345`
- `demo-teacher` / `Demo@12345`
- `demo-student` / `Demo@12345`
- `demo-parent` / `Demo@12345`

## 4. Recommended walkthrough

### Platform admin

1. Login as `demo-platform-admin`.
2. Open `Academic Setup`.
3. Review academic years, programs, cohorts, subjects, topics, students, teachers, and teacher assignments.

### Institute admin

1. Login as `demo-institute-admin`.
2. Open `Academic Setup`.
3. Show institute-scoped academic management and edit dialogs.

### Teacher

1. Login as `demo-teacher`.
2. Open `Question Bank` and review the seeded question.
3. Open `Exams` and review the seeded published exam.
4. Open `Results` and review summary, leaderboard, and topic performance.

### Student

1. Login as `demo-student`.
2. Open `Dashboard`.
3. Open `Exams` and review available exam details.
4. Open `Results` and review the published result summary and topic-wise breakdown.

## 5. Seeded demo data

The seed command prepares:

- Demo Learning Institute (`DLI001`)
- Academic year `2026-2027`
- Program `CLS10F`
- Cohort `CLS10A`
- Subject `MATH10`
- Topic `ALG-01`
- Teacher `Neha Kapoor`
- Student `Aarav Sharma`
- Question: `What is 2 + 2?`
- Published exam: `Mathematics Weekly Test`
- Submitted attempt with generated and published result

## 6. Notes

- This MVP is intentionally focused on academic learning and assessment only.
- Scores, ranks, result visibility, and analytics stay backend-owned.
- The current UI is functional and demo-ready, but not final visual polish.
