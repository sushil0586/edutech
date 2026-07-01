# EduTech MVP Demo Guide

This guide is for showing the current Education Learning & Assessment MVP end to end using:

- `edutech_backend`
- `edutech_web`

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

## 2. Start the web app

```bash
cd edutech_web
npm install
npm run dev
```

Recommended web validation:

```bash
npm run build
```

If you want a local production-style run:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
npm run build
npm run start
```

## 3. Demo users

- `demo-platform-admin` / `Demo@12345`
- `demo-institute-admin` / `Demo@12345`
- `demo-teacher` / `Demo@12345`
- `class7-student-1` / `Demo@12345`
- `demo-parent` / `Demo@12345`

Important note:

- the currently verified local student login for the seeded Class 7 demo dataset is `class7-student-1`
- if `demo-student` exists in another seed set, do not assume it is the active local student credential for this environment

## 4. Recommended walkthrough

### Platform admin

1. Sign in with `demo-platform-admin`.
2. Open `/admin`.
3. Review institute ownership, seeded structure, and platform-level setup surfaces.
4. Show that teacher and student credentials are admin-managed.

### Institute admin

1. Sign in with `demo-institute-admin`.
2. Open `/institute/dashboard`.
3. Review institute-scoped academic structure, user management, exams, and results surfaces.
4. Highlight that this pilot is institute-first, not public self-signup-first.

### Teacher

1. Sign in with `demo-teacher`.
2. Open `/teacher/dashboard`.
3. Open `/teacher/question-bank` and review the seeded question.
4. Open `/teacher/exams` and review the seeded published exam.
5. Open `/teacher/results` and review summary and performance surfaces.

### Student

1. Sign in with `class7-student-1`.
2. Open `/app/dashboard`.
3. Open `/app/exams` and review available exam details.
4. Open `/app/attempts` and walk through current and submitted states.
5. Open `/app/results` and review the published result summary and topic-wise breakdown.
6. Open `/app/analytics` and `/app/weak-areas`.

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
- The current web app is the Next.js portal in `edutech_web`.
- The primary demo path should stay inside the Next.js role workspaces unless you explicitly need Django admin for operator-only checks.
- Public self-signup is not part of the current MVP.
- Parent role data may exist in the backend, but a dedicated parent product surface is not yet the main demo path.

## 7. Current MVP Boundaries

For the current pilot product definition, use:

- [CURRENT_MVP_SCOPE.md](/Users/ansh/Documents/Eductech/docs/architecture-product/CURRENT_MVP_SCOPE.md:1)
- [NEXORA_GAP_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/NEXORA_GAP_IMPLEMENTATION_PLAN.md:1)

## 8. QA And Status References

For the completed student work and testing checklists, use:

- [STUDENT_MODULE_REVIEW.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_MODULE_REVIEW.md:1)
- [STUDENT_MODULE_QA_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_MODULE_QA_CHECKLIST.md:1)
- [QA_UAT_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/QA_UAT_CHECKLIST.md:1)
