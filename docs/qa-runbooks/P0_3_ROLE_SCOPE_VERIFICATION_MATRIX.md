# P0.3 Role and Scope Verification Matrix

## Purpose

This document converts P0.3 into an explicit access-control checkpoint.

P0.3 goal:

- verify role capabilities are intentional
- verify tenant scoping is enforced consistently
- verify managed resources do not leak across institutes
- verify self-service student surfaces remain self-scoped

Related documents:

- [NEXT_P0_CLOSEOUT_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/NEXT_P0_CLOSEOUT_IMPLEMENTATION_PLAN.md)
- [P0_2_CRITICAL_WORKFLOW_REGRESSION_MATRIX.md](./P0_2_CRITICAL_WORKFLOW_REGRESSION_MATRIX.md)

---

## High-Level Read

P0.3 is not about adding new permissions.

It is about proving that the current platform contract is coherent:

- `platform_admin` can govern globally
- `institute_admin` can manage only institute-scoped resources
- `teacher` can build and review within institute scope but cannot cross into admin governance
- `student` can only access self-scoped runtime and analytics data

The output is a durable verification map for future expansion.

---

## Capability Baseline

Current capability helpers define this role contract:

- `can_manage_academics`: `platform_admin`, `institute_admin`
- `can_view_academics`: `platform_admin`, `institute_admin`, `teacher`
- `can_manage_students`: `platform_admin`, `institute_admin`
- `can_build_exams`: `platform_admin`, `institute_admin`, `teacher`
- `can_publish_results`: `platform_admin`, `institute_admin`, `teacher`
- `can_manage_question_bank`: `platform_admin`, `institute_admin`, `teacher`
- `can_view_analytics`: `platform_admin`, `institute_admin`, `teacher`, `student`

This means role control is a combination of:

- coarse capability permission classes
- institute and self scoping helpers
- resource-specific guardrails in individual viewsets

---

## Verification Matrix

## Stream A: Tenant Scope Baseline

### Expected rules

1. `platform_admin` can see all institutes and cross-tenant governed resources
2. `institute_admin` is limited to records in their own institute
3. `teacher` is limited to records in their own institute
4. `student` is limited to their own attempts, results, and student-resolved exam access

### Source of truth

- `edutech_backend/apps/accounts/scopes.py`
- `edutech_backend/apps/accounts/permissions.py`
- `edutech_backend/apps/accounts/capabilities.py`

### Current code read

- institute scoping is centralized through `scope_queryset_for_institute`
- teacher and institute admin academic lookup scope is institute-wide and read-only for teachers
- exam, question, attempt, result, and student-profile scoping all apply institute or self filtering

---

## Stream B: Academic Setup Governance

### Expected rules

1. institute admins can manage academic setup inside their institute
2. teachers can read academic setup lookups but cannot create or edit them
3. students cannot access academic management APIs

### Current automated coverage

- `edutech_backend/apps/accounts/tests/test_auth_access.py`

### Verified scenarios

1. teacher can list subjects and topics in institute scope
2. teacher cannot create subjects
3. teacher can still consume result-analysis endpoints that depend on academic lookups

### Remaining manual sanity check

- route-level teacher portal visibility for academic setup shortcuts

---

## Stream C: Question Bank Governance

### Expected rules

1. platform admin, institute admin, and teacher can manage question-bank resources
2. all question-bank access is institute-scoped except platform-admin global access
3. students cannot access teacher or institute authoring APIs

### Source of truth

- `CanManageQuestionBank`
- `scope_question_queryset`

### Current automated coverage

- `edutech_backend/apps/accounts/tests/test_auth_access.py`
- broader content workflow suites in P0.2

### Verified scenarios

1. teacher question listings return only institute questions
2. question-bank authoring capability excludes student role by permission class

### Remaining useful addition later

- a direct cross-institute authoring API rejection test for question edit/delete by foreign institute actor

---

## Stream D: Exam Builder and Publish Governance

### Expected rules

1. platform admin, institute admin, and teacher can build exams
2. teacher and institute admin are limited to institute-scoped exam records
3. student exam visibility is filtered by institute, program, cohort, and active status
4. teacher publish and result workflows cannot target foreign institute records

### Current automated coverage

- `edutech_backend/apps/accounts/tests/test_auth_access.py`
- `edutech_backend/apps/exams/test_advanced_builder_api.py`

### Verified scenarios

1. teacher exam list is institute-scoped
2. teacher summary and publish surfaces resolve only institute data
3. student available exam APIs are scoped to allowed institute/program/cohort combinations
4. student cannot resolve foreign exam details
5. cross-tenant `changed_by` usage is rejected in exam publish and refresh flows

---

## Stream E: Advanced Template Governance

### Expected rules

1. platform admin can govern all templates
2. institute admin can read institute templates in their institute and manage institute templates only
3. teacher can read institute templates plus their own personal templates
4. teacher cannot create institute templates
5. teacher cannot delete institute templates
6. institute admin cannot delete teacher personal templates

### Source of truth

- `AdvancedExamTemplateViewSet` in `edutech_backend/apps/exams/views/__init__.py`

### Current automated coverage

- `edutech_backend/apps/exams/test_advanced_templates_api.py`

### Verified scenarios

1. teacher can upsert personal template
2. teacher sees own personal templates plus institute templates only
3. teacher cannot create institute template
4. teacher cannot delete institute template
5. institute admin can list institute templates
6. institute admin cannot delete teacher personal template

---

## Stream F: Preset Pack Governance

### Expected rules

1. platform admin can manage platform and institute preset packs
2. institute admin can manage only institute preset packs in their own institute
3. teacher can read platform preset packs and institute preset packs in their own institute
4. teacher cannot create preset packs
5. institute admin cannot manage platform preset packs

### Source of truth

- `ExamPresetPackViewSet` in `edutech_backend/apps/exams/views/__init__.py`

### Current automated coverage

- `edutech_backend/apps/exams/test_preset_packs_api.py`

### Verified scenarios

1. institute admin can create institute preset pack
2. teacher can list platform plus own-institute preset packs
3. teacher cannot create preset pack
4. institute admin cannot delete platform preset pack

### Remaining useful addition later

- explicit cross-institute institute-admin visibility test for preset-pack listing

---

## Stream G: Attempt, Review, and Result Isolation

### Expected rules

1. students can access only their own attempts and results
2. teachers and institute admins can view institute-scoped results and review queues
3. students cannot query another student’s performance or topic rows
4. analytics endpoints should respect institute or self scoping

### Current automated coverage

- `edutech_backend/apps/accounts/tests/test_auth_access.py`
- `edutech_backend/apps/attempts/tests/test_attempt_workspace_api.py`
- `edutech_backend/apps/results/tests/test_smoke_flow.py`

### Verified scenarios

1. student attempts list returns only own attempts
2. student results list returns only own results
3. student performance endpoint rejects access to another student
4. teacher result summaries and exam attempt analytics are institute-scoped
5. student topic-performance queries are self-scoped

---

## Recommended Automated Verification Set

This is the recommended backend suite for P0.3:

1. `apps.accounts.tests.test_auth_access`
2. `apps.exams.test_advanced_templates_api`
3. `apps.exams.test_preset_packs_api`

These are the highest-signal suites for role, scope, and governed-resource safety.

---

## Current Checkpoint Result

P0.3 should be considered complete only when:

1. the role-and-scope suites pass sequentially
2. no cross-tenant visibility leak is found
3. no false-positive manage permission is found
4. any remaining manual route checks are recorded explicitly

Status for this document:

- matrix documented
- focused verification completed
- no code change was required during this P0.3 verification pass

Verified sequential passes:

1. `./.venv/bin/python manage.py test --noinput apps.accounts.tests.test_auth_access`
2. `./.venv/bin/python manage.py test --noinput apps.exams.test_advanced_templates_api apps.exams.test_preset_packs_api`

Observed during execution:

- sequential execution remains the correct local verification method for this PostgreSQL-backed test setup
- no role leak or false-positive manage permission was surfaced in the focused P0.3 suite

Manual verification still useful:

- browser-level route visibility sanity check across admin, institute, teacher, and student portals
- confirm navigation does not expose dead-end links to roles that fail capability checks by design
