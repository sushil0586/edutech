# Configurable Institute Onboarding And Seeding Plan

## Goal

Make new institute onboarding work from the platform-admin institute create flow with:

- minimum hardcoding
- maximum configuration
- repeatable seed behavior
- easy future updates
- safe partial rollout

The create page should stay simple for operators, but it should be able to trigger configurable onboarding packages such as:

- economy defaults
- academic presets
- question-bank access/bootstrap
- feature entitlements
- demo login creation
- future onboarding modules

## Current State

Today the system is split into two separate paths.

### 1. Institute Create UI

Current create flow lives in:

- [edutech_web/src/components/admin/institute-management-workspace.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/admin/institute-management-workspace.tsx)

Current behavior:

- modal only captures institute identity/contact fields
- frontend POSTs to `/api/admin/institutes`
- backend creates a normal `Institute` row through the default serializer/viewset path
- no onboarding profile is selected
- no seed orchestration is triggered

### 2. Seed / Bootstrap Logic

Existing onboarding logic already exists, but outside the UI, mostly as management commands:

- [edutech_backend/apps/institutes/management/commands/seed_institute_bootstrap.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/institutes/management/commands/seed_institute_bootstrap.py)
- [edutech_backend/README.md](/Users/ansh/Documents/Eductech/edutech_backend/README.md)

Available building blocks already include:

- `seed_institute_bootstrap`
- `seed_institute_academics`
- `seed_economy_defaults`
- `seed_master_economy`
- question-bank seed commands
- public/private institute bootstrap variants

### Main Gap

The system already knows how to seed, but onboarding is not yet:

- operator-driven from the UI
- profile-based
- auditable
- reusable by non-technical admins
- configurable per institute type

## Current Implementation Progress

These pieces are now live in the `Master defaults` lane under platform-admin academic setup:

- backend-managed academic preset registry
- preview-before-apply flow
- one-click apply for:
  - academic year
  - program
  - subjects
  - topics
- selective apply modes:
  - full preset
  - selected subjects
  - selected topic groups
- common onboarding access controls that still write through economy authority:
  - `Question-bank package access` enabled/disabled
  - `Advanced builder access` enabled/disabled
- DB-backed onboarding profile registry:
  - `Blank institute`
  - `School starter`
  - `Trial full access`
- profile defaults can now be loaded into the `Master defaults` workspace from database configuration

Important rule:

- `Master defaults` is now an onboarding orchestrator
- `Economy` remains the authority for entitlement persistence and runtime checks
- no duplicate access table should be introduced in academics

What is intentionally not done yet:

- the institute create modal does not yet execute onboarding profiles directly
- profiles currently prefill `Master defaults`, but do not yet run as post-create jobs
- package selection remains live-catalog driven so unsafe hardcoded package bindings are avoided

What is now improved in the create flow:

- institute create modal now captures the onboarding profile choice
- institute create API now accepts the onboarding profile code directly
- institute creation now opens a real onboarding run immediately when a profile is selected
- after institute creation, platform admin is routed directly to:
  - `Academic Setup -> Master defaults`
  - newly created institute preselected
  - chosen onboarding profile preselected
- created onboarding run id passed through the route so the same tracked run is completed by `Master defaults`
- this keeps institute CRUD simple while still making onboarding operationally guided

What is now improved in execution visibility:

- every `Master defaults` apply now creates an auditable onboarding run
- each run stores:
  - institute
  - selected onboarding profile code
  - requested config
  - resolved config
  - run status
  - start/completion timestamps
- each run records task-level execution rows for:
  - academic preset apply
  - question-bank package access
  - advanced builder access
  - academic catalog audit
- platform operators can inspect these rows from Django admin
- the `Master defaults` result panel now shows onboarding run status, profile, and task count after apply

What the current implementation uses:

- academic preset data from backend preset registry
- question-bank package options from live economy package catalog
- advanced builder enablement through live feature entitlement rows
- question-bank package access through live package entitlement rows

This keeps onboarding configurable while avoiding hardcoded institute-specific rules.

## Design Principle

Do not hardcode:

- specific institutes
- fixed seed combinations inside the create page
- fixed academic presets inside the UI
- fixed economy/package behavior in frontend conditionals

Instead, drive onboarding through configuration records and backend orchestration.

## Target Product Shape

When platform admin creates a new institute, they should see:

- basic institute fields
- onboarding profile selector
- optional advanced toggles
- preview of what will be seeded
- post-create onboarding status

Example operator flow:

1. Open `Add Institute`
2. Fill name, code, contact details
3. Choose onboarding profile:
   - `Blank institute`
   - `School starter`
   - `School full access`
   - `Competitive exam institute`
   - `Demo/trial institute`
4. Optionally override modules:
   - seed academics
   - apply economy defaults
   - attach question-bank package
   - enable advanced exam builder
   - create demo users
5. Click `Create Institute`
6. System creates institute immediately
7. Backend runs onboarding job
8. Admin sees onboarding status and can retry failed modules

## Recommended Architecture

## A. Add Configurable Onboarding Profiles

Create a new backend configuration model family.

### Core model

`InstituteOnboardingProfile`

Suggested fields:

- `name`
- `code`
- `description`
- `is_active`
- `is_default`
- `institute_type`
- `visibility`
- `sort_order`
- `config_json`

Purpose:

- defines a reusable onboarding preset
- lives in DB, not in UI code
- can be edited later from admin economy/settings/onboarding lane

### Config payload shape

Example:

```json
{
  "create_institute_login": true,
  "seed_academics": true,
  "academic_preset_code": "class_7_cbse_core",
  "seed_economy_defaults": true,
  "economy_seed_mode": "master",
  "include_future_economy_templates": false,
  "grant_feature_codes": [
    "advanced_exam_builder"
  ],
  "attach_question_bank_package_codes": [
    "SCHOOL_STARTER_LIBRARY"
  ],
  "create_demo_users": false,
  "seed_private_content_scaffolding": true,
  "post_create_tasks": [
    "audit_catalog",
    "ensure_defaults"
  ]
}
```

This keeps the UI generic and the behavior configurable.

## B. Add Onboarding Job / Execution Layer

Do not run all seed logic directly inside serializer `create()`.

Instead add a service like:

`run_institute_onboarding(institute_id, onboarding_profile_code, overrides, initiated_by)`

This service should:

- load profile config
- merge safe overrides
- execute onboarding modules in sequence
- log success/failure module by module
- remain idempotent where possible

Recommended modules:

- institute login bootstrap
- academics bootstrap
- economy bootstrap
- feature entitlement grant
- package entitlement grant
- demo user creation
- question-bank scaffolding
- audit/verification tasks

## C. Add Onboarding Run Tracking

Create an audit/status model:

`InstituteOnboardingRun`

Suggested fields:

- `institute`
- `profile_code`
- `requested_config_json`
- `resolved_config_json`
- `status`
- `started_at`
- `completed_at`
- `initiated_by`
- `error_summary`

Child row model:

`InstituteOnboardingTaskRun`

Suggested fields:

- `run`
- `task_code`
- `status`
- `message`
- `started_at`
- `completed_at`
- `metadata_json`

This gives:

- visibility
- retry support
- future debugging
- operational confidence

## D. Add UI Support In Institute Create Page

Extend the current create modal with an `Onboarding` section.

### Minimum UI additions

- `Onboarding profile` dropdown
- `Run onboarding after create` toggle
- `Advanced options` expandable section

### Advanced options

Only show as optional overrides, not as required complexity.

Possible controls:

- `Seed academics`
- `Academic preset`
- `Seed economy defaults`
- `Economy mode`
- `Create institute admin login`
- `Create demo teacher/student users`
- `Attach starter package`
- `Grant feature access`

Important rule:

- defaults come from selected onboarding profile
- UI overrides are optional
- final orchestration happens in backend

## E. Keep Existing Seed Commands As Executors

Do not throw away current commands.

Use them as reusable backend executors or extract shared logic from them into services.

Recommended approach:

- move command business logic into services
- let commands call services
- let UI onboarding service call the same services

That avoids duplicated logic.

Example:

- current `seed_institute_bootstrap` logic becomes `bootstrap_regular_institute_service(...)`
- command calls that service
- UI onboarding service also calls that service

## F. Keep Profiles Data-Driven

Profiles should be seeded/configured separately from code.

Recommended starter profiles:

- `blank_institute`
- `school_starter`
- `school_full_access`
- `competitive_exam_starter`
- `demo_trial_full_access`

These can initially be seeded once through a command like:

- `seed_institute_onboarding_profiles`

Later they can be editable from UI.

## Recommended Data Ownership

### Hardcoded in code

Keep only true platform invariants in code:

- onboarding task registry names
- validation rules
- safe allowed override keys
- task execution order rules
- idempotency and audit behavior

### Configured in DB

Move business choices to DB:

- which academic preset to use
- whether economy defaults should run
- which question-bank package to attach
- which features should be granted
- whether demo users should be created
- whether profile is visible to operators

## Suggested Backend Contract

## Create institute payload

Extend current payload shape from plain institute fields to:

```json
{
  "name": "Trial Institute One",
  "code": "TRIAL001",
  "email": "ops@trial.edu",
  "phone": "9999999999",
  "city": "Jaipur",
  "state": "Rajasthan",
  "country": "India",
  "pincode": "302001",
  "onboarding": {
    "enabled": true,
    "profile_code": "school_full_access",
    "overrides": {
      "create_demo_users": true,
      "grant_feature_codes": ["advanced_exam_builder"]
    }
  }
}
```

### Response shape

```json
{
  "id": "....",
  "name": "Trial Institute One",
  "code": "TRIAL001",
  "onboarding_run": {
    "id": "....",
    "status": "queued"
  }
}
```

## Recommended Rollout Strategy

## Phase 1

Planning + data model only

- add onboarding profile models
- add onboarding run models
- add read APIs for profiles
- no institute-create integration yet

## Phase 2

Create-page integration

- add profile selector in create modal
- add onboarding payload support
- create onboarding service
- run small safe modules first

## Phase 3

Modular execution

- academics module
- economy module
- feature entitlement module
- package grant module
- demo-user module

## Phase 4

Operations and support

- onboarding history tab
- retry failed tasks
- dry-run preview
- onboarding template management UI

## Detailed Functional Modules

## 1. Institute Core Module

Always runs first.

Responsibilities:

- create institute row
- normalize location
- mark metadata defaults
- create base audit trail

Should remain simple and deterministic.

## 2. Institute Login Module

Optional, profile-driven.

Responsibilities:

- create institute admin login
- auto-generate or assign username pattern
- optionally generate password/reset flow

Configurable items:

- enabled/disabled
- username convention
- password policy

## 3. Academic Bootstrap Module

Optional, profile-driven.

Responsibilities:

- create academic year
- create programs
- create subjects
- create topics
- apply academic preset

Configurable items:

- preset code
- academic year strategy
- board/class family

## 4. Economy Bootstrap Module

Optional, profile-driven.

Responsibilities:

- seed economy defaults or master economy set
- create subscription-ready records
- attach default commercial setup

Configurable items:

- seed mode: `defaults` or `master`
- future template inclusion
- operator policies included or not

## 5. Feature Entitlement Module

Optional, profile-driven.

Responsibilities:

- grant platform-controlled institute feature access

Examples:

- advanced exam builder
- premium analytics
- question-bank workflows

Configurable items:

- feature code list
- start/end validity
- grant source metadata

## 6. Question-Bank Package Module

Optional, profile-driven.

Responsibilities:

- attach starter or premium packages
- create entitlement rows
- prepare institute for content usage

Configurable items:

- package code list
- lifecycle mode
- quotas if needed

## 7. Demo Users Module

Optional, profile-driven.

Responsibilities:

- create sample teacher(s)
- create sample student(s)
- optionally create academic mappings

Configurable items:

- counts
- naming convention
- target cohort/program

## 8. Verification Module

Optional but strongly recommended.

Responsibilities:

- verify seeded academics exist
- verify economy rows exist
- verify entitlements applied
- produce operator-facing warnings

## UX Recommendation For Create Modal

Do not make the modal huge.

Recommended structure:

### Section 1

`Institute Details`

- existing identity/contact fields

### Section 2

`Onboarding Setup`

- onboarding enabled toggle
- onboarding profile dropdown
- summary preview card

### Section 3

`Advanced Overrides`

Collapsed by default.

- only visible when admin wants custom onboarding

### Section 4

`Post-create status`

After save:

- show `Institute created`
- show `Onboarding queued/running/completed/failed`
- show button `Open onboarding details`

## Why This Is Better Than Hardcoding

If we hardcode onboarding inside create page:

- each new institute type needs code changes
- stage/prod behavior drifts
- operator flow becomes brittle
- support becomes manual

If we make it config-driven:

- platform admin can reuse profiles
- future onboarding changes become profile updates
- new institute categories are easier to add
- rollout is safer and auditable

## Practical Example

### Trial institute

Profile:

- `demo_trial_full_access`

Config:

- create institute admin login
- seed academics
- seed economy defaults
- attach starter package
- grant advanced builder
- create 1 teacher + 10 students demo set

### Normal school institute

Profile:

- `school_starter`

Config:

- create institute
- create admin login
- seed academics
- seed economy defaults
- no demo users
- no premium feature grants by default

### Competitive coaching institute

Profile:

- `competitive_exam_starter`

Config:

- create institute
- seed economics
- attach NEET/JEE question-bank package
- grant advanced exam builder
- skip school preset academics unless selected

## Technical Risks

### Risk 1

Long-running onboarding during request-response cycle

Mitigation:

- create institute immediately
- run onboarding asynchronously or as staged follow-up tasks

### Risk 2

Partial success creates confusing setup

Mitigation:

- onboarding run status model
- per-task status
- retry support

### Risk 3

Too many UI options overwhelm admins

Mitigation:

- profile-first design
- advanced overrides hidden by default

### Risk 4

Duplicate logic between commands and UI

Mitigation:

- extract shared service layer

## Acceptance Criteria

This plan is successful when:

- platform admin can create a new institute from UI
- platform admin can choose an onboarding profile
- onboarding profile behavior is DB-configurable
- no institute-specific seeding rules are hardcoded in frontend
- backend records onboarding run history
- failed onboarding can be diagnosed and retried
- adding a new onboarding profile does not require changing the create modal layout

## Recommended Execution Order

1. Add onboarding profile models and seed starter profiles.
2. Add onboarding run/task audit models.
3. Extract bootstrap logic into reusable services.
4. Extend institute create API to accept onboarding payload.
5. Add onboarding profile selector to institute create modal.
6. Add onboarding status surface in admin institute workspace.
7. Add retry/resume tools for failed onboarding runs.

## My Recommendation

Do not directly wire the create page to raw management commands.

Best long-term shape:

- create page selects a profile
- backend service resolves the profile
- backend service calls reusable seed/bootstrap modules
- onboarding is logged and supportable

That gives us:

- easy onboarding for new institutes
- much less hardcoding
- safer future updates
- cleaner operator workflow

## Next Best Implementation Slice

If we want to implement this in a practical first slice, the smallest valuable version is:

1. Add `InstituteOnboardingProfile`
2. Add `onboarding_profile_code` to create flow
3. Support only these modules first:
   - create institute admin login
   - seed academics
   - seed economy defaults
4. Show onboarding status after create

That will already make new institute onboarding much easier without overbuilding the first version.
