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

## Economy Seed Runbook

Use this runbook when preparing platform-controlled economy defaults.

Important operating rule:

- economy import is platform-level only for now
- institute admins can review and support economy state, but should not import economy defaults directly

Recommended platform seed order:

1. Run migrations.
2. Seed geography masters.
3. Seed academic option catalog.
4. Run the master economy seed for the target institute scope.

Commands:

```bash
cd edutech_backend
source .venv/bin/activate
python manage.py migrate
python manage.py seed_default_geography
python manage.py seed_option_catalog
python manage.py seed_master_economy DLI001
```

Seed all active institutes:

```bash
python manage.py seed_master_economy --all-active
```

Skip option catalog refresh when it was already run:

```bash
python manage.py seed_master_economy DLI001 --skip-option-catalog
```

What the master command does:

- refreshes option catalog prerequisites unless skipped
- seeds reward rules
- seeds referral program defaults
- seeds star packs
- seeds subscription plans, cycles, and star-credit rules
- seeds content access policy templates across `free`, `stars_only`, `entitlement_only`, and `stars_or_entitlement`
- seeds unlock rule templates

Lower-level economy command:

```bash
python manage.py seed_economy_defaults DLI001
```

Optional advanced template mode:

```bash
python manage.py seed_economy_defaults DLI001 --include-future-templates
python manage.py seed_master_economy DLI001 --include-future-templates
```

Use the lower-level command only when you intentionally want to run economy seeding without the master bootstrap wrapper.

## Public Institute Bootstrap

Use this command to create or update the single shared public institute that owns platform exams:

```bash
python manage.py seed_public_institute_bootstrap
```

Common variants:

```bash
python manage.py seed_public_institute_bootstrap --code NEXORA-PUBLIC --name "Nexora Shared Public Hub"
python manage.py seed_public_institute_bootstrap --skip-economy-seed
python manage.py seed_public_institute_bootstrap --include-future-economy-templates
```

What it does:

- creates or updates one shared public institute
- stamps metadata so the institute is treated as the platform public content hub
- keeps student home-institute ownership unchanged
- optionally runs the economy seed so the public institute is immediately ready for exam pricing, entitlement, and unlock policies

## Public Academics Seed

Use this command to seed the public institute with the baseline Class 7 academic structure:

```bash
python manage.py seed_public_academics
```

Common variants:

```bash
python manage.py seed_public_academics --institute-code DLI001
python manage.py seed_public_academics --preset class_7_cbse_core
python manage.py seed_public_academics --academic-year-name 2027-2028 --academic-year-start 2027-04-01 --academic-year-end 2028-03-31
```

What it does:

- finds the one public institute
- creates or updates the public academic year
- seeds the `Class 7` program
- seeds `Math`, `Science`, `Social Science`, `Computer`, and `General Knowledge`
- seeds a full topic tree under each subject for later question-bank and exam mapping

## Regular Institute Bootstrap

Use this command to create or update a normal institute and optionally seed economy and academics:

```bash
python manage.py seed_institute_bootstrap SCH001 --name "Springfield School"
```

Common variants:

```bash
python manage.py seed_institute_bootstrap SCH001 --name "Springfield School" --seed-academics
python manage.py seed_institute_bootstrap SCH001 --name "Springfield School" --skip-economy-seed
python manage.py seed_institute_bootstrap SCH001 --name "Springfield School" --seed-academics --include-future-economy-templates
```

What it does:

- creates or updates a regular tenant institute
- marks it as non-public in metadata
- optionally seeds institute-owned economy defaults
- optionally seeds the same Class 7 academic preset used for public onboarding

## Regular Institute Academics Seed

Use this command when the institute already exists and you only want the academic structure:

```bash
python manage.py seed_institute_academics SCH001
```

What it does:

- seeds the selected institute with the Class 7 academic year, program, subjects, and topic tree
- rejects the public institute so the public and tenant flows stay clearly separated

## Question Ownership Model

Question sharing now follows a controlled two-layer model:

- `MasterQuestion` is the canonical source record
- `Question` remains the institute-operational record used by exams and attempts
- `InstituteQuestionAccess` is the permissioned bridge between a master question and a target institute

Practical rules:

- public/platform questions are not linked to private institutes by default
- private institutes can create their own institute-owned questions
- an institute must explicitly request public questions
- only after approval should those questions be linked into the institute working set
- exams continue to use institute `Question` rows, but those rows can now point back to a canonical `master_question`

Practical flow:

1. platform or institute creates a canonical master question through normal authoring flow
2. public questions stay in `shared_by_request` mode unless intentionally made fully public later
3. a private institute requests access
4. approval creates an `InstituteQuestionAccess` row
5. linking creates the institute-operational `Question` row for that institute
6. teachers in that institute can then use the linked question in exams

## Curated Question Authoring

For Class 7 Math and Science curated content, markdown authoring is now the preferred workflow over direct JSON editing.

Flow:

1. generate markdown authoring files from topic templates
2. author and review content in markdown
3. lint markdown for placeholders and duplicates
4. compile markdown into final curated JSON packs
5. seed the compiled packs into the DB

Generate markdown authoring file(s):

```bash
python manage.py generate_curated_topic_authoring_markdown \
  --topic-codes MATH-NUMBERS-LARGE MATH-NUMBERS-PLACE
```

Lint markdown authoring file(s):

```bash
python manage.py lint_curated_topic_authoring_markdown \
  --files \
  question_blueprints/class_7/curated_authoring/math_science_v2/MATH-NUMBERS-LARGE.md \
  question_blueprints/class_7/curated_authoring/math_science_v2/MATH-NUMBERS-PLACE.md \
  --expected-count 25
```

Compile markdown into final curated JSON:

```bash
python manage.py compile_curated_topic_authoring_markdown \
  --files \
  question_blueprints/class_7/curated_authoring/math_science_v2/MATH-NUMBERS-LARGE.md \
  question_blueprints/class_7/curated_authoring/math_science_v2/MATH-NUMBERS-PLACE.md \
  --expected-count 25
```

Seed the compiled packs:

```bash
python manage.py seed_curated_math_science_questions DLI001 \
  --subjects math \
  --topic-codes MATH-NUMBERS-LARGE MATH-NUMBERS-PLACE \
  --questions-per-topic 25 \
  --replace-existing
```

## Master Question Library Seed

Question design reference for future content and seed quality:

- see [QUESTION_CONTENT_PLAYBOOK.md](./QUESTION_CONTENT_PLAYBOOK.md)
- see [QUESTION_GENERATION_PROMPTS.md](./QUESTION_GENERATION_PROMPTS.md)
- see [Question blueprint root](./question_blueprints/README.md)
- see [Class 7 blueprint index](./question_blueprints/class_7/README.md)
- see [SCI_HEALTH_ADOLESCENCE_IMPLEMENTATION_BLUEPRINT.md](./question_blueprints/class_7/SCI_HEALTH_ADOLESCENCE_IMPLEMENTATION_BLUEPRINT.md)
- see [SCI_MATTER_IMPLEMENTATION_BLUEPRINT.md](./question_blueprints/class_7/SCI_MATTER_IMPLEMENTATION_BLUEPRINT.md)
- see [SCI_PHYSICS_IMPLEMENTATION_BLUEPRINT.md](./question_blueprints/class_7/SCI_PHYSICS_IMPLEMENTATION_BLUEPRINT.md)
- see [SCI_MOTION_IMPLEMENTATION_BLUEPRINT.md](./question_blueprints/class_7/SCI_MOTION_IMPLEMENTATION_BLUEPRINT.md)
- see [MATH_FRACTIONS_IMPLEMENTATION_BLUEPRINT.md](./question_blueprints/class_7/MATH_FRACTIONS_IMPLEMENTATION_BLUEPRINT.md)
- see [MATH_LOGIC_IMPLEMENTATION_BLUEPRINT.md](./question_blueprints/class_7/MATH_LOGIC_IMPLEMENTATION_BLUEPRINT.md)

## Curated Math/Science Seed Path

Use this new command when you want a reviewed, topic-pack-based Class 7 Math and Science seed flow that is fully separate from the older generator script:

```bash
python manage.py seed_curated_math_science_questions DLI001 --subjects math science --questions-per-topic 50
```

Notes:

- this command reads topic JSON packs from [question_blueprints/class_7/curated_seed_packs/math_science_v2/README.md](./question_blueprints/class_7/curated_seed_packs/math_science_v2/README.md)
- it uses its own batch name: `curated_math_science_v2`
- it does not reuse the old `seed_curriculum_questions` path
- it will fail fast for any topic that does not yet have an explicit curated JSON pack

Use this command for the public institute when you want to seed canonical shared questions:

```bash
python manage.py seed_master_question_library DLI001 --subjects math science --questions-per-topic 100
```

What it does:

- creates `MasterQuestion` rows only
- creates master options under those canonical questions
- does not create private institute question copies
- does not auto-link those questions to any private institute
- defaults visibility to `shared_by_request`

## Institute Question Seed

Use this command only for normal institutes when you want institute-operational working questions:

```bash
python manage.py seed_curriculum_questions SCH001 --subjects math science --questions-per-topic 100
```

What it does:

- creates institute `Question` rows
- automatically syncs a canonical `MasterQuestion` for each institute-authored question
- rejects the public content hub so the public and private question flows stay separate

## Link Master Questions To Institute

Use this command from the platform/public admin side to request or approve question links for private institutes:

```bash
python manage.py link_master_questions_to_institute SCH001 --mode request --source-institute DLI001 --subject-code CLS7-MATH
python manage.py link_master_questions_to_institute SCH001 --mode approve --source-institute DLI001 --subject-code CLS7-MATH --approved-by-username platform-admin --only-requested
```

What it does:

- `request` mode creates `InstituteQuestionAccess` rows only
- `approve` mode creates linked institute `Question` rows from the selected master questions
- supports filtering by source institute, subject, topic, or explicit master question ids
- rejects the public content hub as a target institute
- is suitable for UI buttons on the public admin side

## Advanced Exam Builder

Use these endpoints when institute admins or teachers need to create custom multi-topic exams from their institute-usable question pool:

- `POST /api/v1/exams/advanced-builder/preview/`
- `POST /api/v1/exams/advanced-builder/create/`

Practical rules:

- the builder works on institute `Question` rows only
- that means private institute questions and already linked public questions are usable
- `end_at` defaults to the selected academic year end date when omitted
- `end_at` cannot go beyond the academic year end date
- section topic counts must add up exactly
- strict mode fails if the requested topic+difficulty pool is not available
- teacher users can only build inside their own institute and assigned academic scope

Payload shape:

```json
{
  "scope": {
    "institute_code": "SCH001",
    "academic_year_name": "2026-2027",
    "program_code": "CLS7",
    "cohort_code": "CLS7-A",
    "subject_code": "CLS7-MATH"
  },
  "exam": {
    "title": "Class 7 Math Custom Test",
    "code": "CLS7-MATH-CUSTOM-01",
    "exam_type": "test",
    "delivery_mode": "online",
    "status": "draft",
    "duration_minutes": 60
  },
  "composition": {
    "selection_mode": "strict",
    "sections": [
      {
        "name": "Section A",
        "order": 1,
        "question_count": 20,
        "marks_per_question": "2.00",
        "difficulty_mix": {
          "foundation": 40,
          "intermediate": 40,
          "advanced": 20
        },
        "topics": [
          {"topic_code": "ALGEBRA", "count": 10},
          {"topic_code": "NUMBER-SYSTEM", "count": 10}
        ]
      }
    ]
  },
  "delivery": {
    "timer_mode": "global",
    "navigation_mode": "free_exam",
    "attempt_policy": "single",
    "assignment_mode": "scope",
    "randomize_questions": true,
    "randomize_options": true
  },
  "economy": {
    "policy_type": "stars_or_entitlement",
    "star_cost": 120,
    "entitlement_code": "bundle:math-premium"
  }
}
```

What preview returns:

- resolved question counts
- section-wise topic breakup
- actual difficulty breakup
- computed total marks
- final `end_at` value after academic-year defaulting
- warnings when fallback selection modes are used

What create does:

- revalidates the blueprint
- creates the `Exam`
- creates `ExamSection` rows
- creates `ExamQuestion` rows in final order
- synchronizes total marks
- attaches optional economy access policy
- attaches optional unlock rule

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
- `POST /api/v1/exams/advanced-builder/preview/`
- `POST /api/v1/exams/advanced-builder/create/`
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
