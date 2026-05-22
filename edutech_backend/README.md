# EduTech Backend

Scalable Django REST backend foundation for the EduTech education portal.

## Stack

- Django
- Django REST Framework
- PostgreSQL
- JWT authentication
- drf-spectacular for OpenAPI/Swagger docs
- `python-decouple` for environment-based settings

## Setup

```bash
cd edutech_backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

## Settings modules

- Development: `config.settings.dev`
- Production: `config.settings.prod`

Use a different settings module when needed:

```bash
export DJANGO_SETTINGS_MODULE=config.settings.prod
python manage.py check
```

## API docs

- Swagger UI: `/api/docs/swagger/`
- ReDoc: `/api/docs/redoc/`
- OpenAPI schema: `/api/schema/`

## Demo Readiness

Seed the MVP demo data:

```bash
cd edutech_backend
python manage.py seed_demo_academic_data
```

Run the backend validation suite:

```bash
python manage.py test
python manage.py check
python manage.py check --settings=config.settings.prod
```

The seed command creates a complete demo flow:

- institute
- academic year
- program
- cohort
- subject and topic
- teacher
- student
- question with options
- published exam
- submitted attempt
- generated and published result

Demo users created by the seed command:

- `demo-platform-admin` / `Demo@12345`
- `demo-institute-admin` / `Demo@12345`
- `demo-teacher` / `Demo@12345`
- `demo-student` / `Demo@12345`
- `demo-parent` / `Demo@12345`

Recommended backend demo order:

1. Run migrations.
2. Run `python manage.py seed_demo_academic_data`.
3. Start the backend server.
4. Use the seeded users from Flutter to walk the role-based demo.

## Phase 1 academic foundation endpoints

- `/api/v1/institutes/`
- `/api/v1/academics/academic-years/`
- `/api/v1/academics/programs/`
- `/api/v1/academics/cohorts/`
- `/api/v1/academics/subjects/`
- `/api/v1/academics/topics/`
- `/api/v1/students/`
- `/api/v1/teachers/`
- `/api/v1/teachers/assignments/`

## Phase 2 question bank endpoints

- `/api/v1/question-bank/questions/`
- `/api/v1/question-bank/options/`
- `/api/v1/question-bank/tags/`
- `/api/v1/question-bank/tag-maps/`
- `/api/v1/question-bank/attachments/`

## Phase 3 exam builder endpoints

- `/api/v1/exams/`
- `/api/v1/exams/sections/`
- `/api/v1/exams/questions/`
- `/api/v1/exams/publish-logs/`
- `POST /api/v1/exams/{id}/sync-marks/`
- `POST /api/v1/exams/{id}/publish/`
- `POST /api/v1/exams/{id}/cancel/`

## Phase 4 attempt engine endpoints

- `POST /api/v1/attempts/start/`
- `POST /api/v1/attempts/{id}/save-answer/`
- `POST /api/v1/attempts/{id}/submit/`
- `GET /api/v1/attempts/{id}/summary/`
- `/api/v1/attempts/`
- `/api/v1/attempts/answers/`

## Phase 5 results and analytics endpoints

- `/api/v1/results/`
- `/api/v1/results/topic-performance/`
- `/api/v1/results/exam-summary/`
- `POST /api/v1/results/generate-from-attempt/`
- `POST /api/v1/results/generate-for-exam/`
- `POST /api/v1/results/calculate-ranks/`
- `POST /api/v1/results/publish-exam-results/`
- `GET /api/v1/results/exam/{exam_id}/leaderboard/`
- `GET /api/v1/results/student/{student_id}/performance/`

## App structure

The domain apps live under `apps/`:

- `accounts`
- `institutes`
- `academics`
- `students`
- `teachers`
- `question_bank`
- `exams`
- `attempts`
- `results`
- `reports`

Each app is scaffolded with `admin/`, `serializers/`, `urls/`, and `views/` packages so feature code can be added without revisiting the project layout.
