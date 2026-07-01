# Nexora Learn Phase 1 Completion Report

## Scope

This document captures what has been completed for `Phase 1: pilot-safe core` of the exam-centric Nexora Learn platform.

Phase 1 focused on making the current product usable, testable, and operationally safer for real school pilots without rebuilding the exam module.

## Phase 1 Goals

The intended outcomes for Phase 1 were:

- make `ExamSection` operational in teacher and student flows
- normalize the exam runtime configuration contract
- support real runtime behavior for navigation, timing, review, and result visibility
- introduce deterministic delivery for resume-safe exam attempts
- add explicit exam assignment and targeting
- add teacher preview / simulation
- complete objective runtime support for modeled objective types
- harden the backend with real migration and test execution

## Completed Work

### 1. Section Runtime Foundation

Completed:

- `ExamQuestion` is now structurally linked to `ExamSection`
- sections are visible in teacher exam management
- sections are visible in student readiness, runtime, and review flows
- section-aware navigation and section-switch behavior exist in the attempt engine
- section timer state is tracked in attempt metadata and reflected in the student runtime

Key files:

- [edutech_backend/apps/exams/models.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/models.py)
- [edutech_backend/apps/exams/serializers/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py)
- [edutech_backend/apps/attempts/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/attempts/services.py)
- [edutech_frontend/lib/features/exams/presentation/pages/exams_page.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/features/exams/presentation/pages/exams_page.dart)
- [edutech_frontend/lib/features/exams/presentation/pages/student_attempt_page.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/features/exams/presentation/pages/student_attempt_page.dart)

### 2. Runtime Configuration Contract

Completed:

- exam-level config contract now covers:
  - `timer_mode`
  - `navigation_mode`
  - `attempt_policy`
  - `result_publish_mode`
  - `review_mode`
  - `security_mode`
  - `allow_resume`
  - `allow_section_switching`
  - `allow_return_to_previous_section`
- section-level config now supports:
  - `timer_enabled`
  - `duration_minutes`
  - `allow_skip_section`
  - `lock_after_submit`
- attempt-time runtime snapshots are stored in metadata for stable evaluation and resume behavior

Key files:

- [edutech_backend/apps/exams/models.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/models.py)
- [edutech_backend/apps/exams/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/services.py)
- [edutech_backend/apps/attempts/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/attempts/services.py)

### 3. Runtime Enforcement

Completed:

- section-aware navigation rules
- section switching API and student runtime integration
- section timer progression and refresh behavior
- deterministic per-attempt question and option ordering
- policy-aware result visibility
- policy-aware review availability and review-detail visibility

Key files:

- [edutech_backend/apps/attempts/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/attempts/services.py)
- [edutech_backend/apps/attempts/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/attempts/views/__init__.py)
- [edutech_backend/apps/results/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/services.py)
- [edutech_backend/apps/exams/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/services.py)

### 4. Explicit Assignment And Targeting

Completed:

- exams can now stay scope-based or switch to `selected_students`
- selected-student assignments are persisted
- teacher assignment API is available
- student availability list respects explicit assignment
- attempt start is blocked if the student is outside selected assignment
- teacher exam workspace now supports assignment management

Key files:

- [edutech_backend/apps/exams/models.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/models.py)
- [edutech_backend/apps/exams/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/views/__init__.py)
- [edutech_backend/apps/accounts/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/views/__init__.py)
- [edutech_backend/apps/attempts/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/attempts/services.py)
- [edutech_frontend/lib/features/exams/presentation/pages/exams_page.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/features/exams/presentation/pages/exams_page.dart)

### 5. Teacher Preview / Simulation

Completed:

- teacher-side preview endpoint exists
- preview returns student-style exam readiness payload
- exam builder has a `Preview` action
- teachers can validate runtime configuration, section structure, and question delivery before releasing the exam

Key files:

- [edutech_backend/apps/exams/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/views/__init__.py)
- [edutech_backend/apps/exams/serializers/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py)
- [edutech_frontend/lib/features/exams/presentation/pages/exams_page.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/features/exams/presentation/pages/exams_page.dart)

### 6. Objective Runtime Completeness

Completed:

- existing single-choice and true/false flows remain intact
- `mcq_multiple` is now supported end to end
- student attempt save/score/review paths understand multi-select answers
- teacher question authoring now supports `MCQ multiple`

Key files:

- [edutech_backend/apps/attempts/models.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/attempts/models.py)
- [edutech_backend/apps/attempts/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/attempts/services.py)
- [edutech_backend/apps/attempts/serializers/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/attempts/serializers/__init__.py)
- [edutech_frontend/lib/features/exams/presentation/pages/student_attempt_page.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/features/exams/presentation/pages/student_attempt_page.dart)
- [edutech_frontend/lib/features/question_bank/presentation/pages/question_bank_page.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/features/question_bank/presentation/pages/question_bank_page.dart)

### 7. Teacher Operations And Live Monitoring

Completed:

- live exam monitor endpoint and teacher UI
- auto-refreshing monitor
- priority-based alerting
- force-submit controls
- bulk high-priority review queue
- teacher status controls for `refresh-status`, `mark-live`, `mark-completed`, and `cancel`
- result operations from the exam workspace

Key files:

- [edutech_backend/apps/results/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/views/__init__.py)
- [edutech_backend/apps/results/serializers/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/serializers/__init__.py)
- [edutech_backend/apps/results/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/services.py)
- [edutech_frontend/lib/features/exams/presentation/pages/exams_page.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/features/exams/presentation/pages/exams_page.dart)

### 8. Institute Exam Defaults

Completed:

- institute-level exam defaults are stored in metadata
- exam creation can inherit defaults
- admins can manage defaults in the academic setup UI

Key files:

- [edutech_backend/apps/institutes/models.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/institutes/models.py)
- [edutech_backend/apps/institutes/serializers/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/institutes/serializers/__init__.py)
- [edutech_frontend/lib/features/academics/presentation/pages/academic_setup_page.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/features/academics/presentation/pages/academic_setup_page.dart)

## Validation Completed

The following validation has been completed:

- backend syntax checks passed
- frontend tests passed
- full Django backend suite passed
- local development database was created and migrated successfully
- `manage.py check` is clean

Verification commands run successfully:

```bash
cd /Users/ansh/Documents/Eductech/edutech_frontend
flutter test
```

```bash
cd /Users/ansh/Documents/Eductech/edutech_backend
./.venv/bin/python manage.py test
DB_USER=ansh DB_NAME=edutech_db ./.venv/bin/python manage.py migrate --noinput
DB_USER=ansh DB_NAME=edutech_db ./.venv/bin/python manage.py check
```

## Remaining Known Gaps After Phase 1

Phase 1 is now strong, but these are intentionally still outside its completion line:

- subjective / manual evaluation workflow
- richer result override and re-evaluation workflow
- deeper invigilation / proctoring signals
- parent-facing feature completion
- advanced cross-institute governance and reporting

## Recommended Next Step

Treat Phase 1 as complete and move into the next product phase with:

1. subjective evaluation workflow
2. advanced result-management workflow
3. deeper monitoring / invigilation signals
4. analytics expansion

