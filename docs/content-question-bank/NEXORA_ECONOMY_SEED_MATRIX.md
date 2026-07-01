# NEXORA Economy Seed Matrix

## Purpose

This document is the source of truth for all default economy configuration that should be seeded into the backend.

The goal is:

- no hardcoded star values in business logic
- all default star grants, packs, plans, and access rules should come from database seed data
- every rule should be traceable to a backend model and service flow
- seed data should stay flexible for future school, competitive, and professional learning lanes

## Core Principle

Stars must be driven by configuration, not by code constants.

That means:

- signup reward should come from `RewardRule`
- referral reward should come from `ReferralProgram`
- paid star purchase should come from `StarPack`
- recurring subscription stars should come from `SubscriptionStarCreditRule`
- premium content access should come from `ContentAccessPolicy`
- advanced unlock conditions should come from `UnlockRule`

## Economy Configuration Groups

The current backend supports these configuration groups:

1. reward rules
2. referral programs
3. star packs
4. subscription plans and cycles
5. subscription star credit rules
6. content access policies
7. unlock rules
8. admin/manual grants

## Seed Matrix

### 1. Reward Rules

Model: `apps.economy.models.RewardRule`

Use this for star credits triggered by lifecycle or academic events.

| Rule Type | Backend Value | What It Means | Configurable Today | Already Processed Today | Suggested Phase 1 Seed |
|---|---|---|---|---|---|
| Signup reward | `signup` | Award stars when a new student completes onboarding | Yes | Yes | `100` stars |
| Referral reward through reward rule | `referral` | Generic referral bonus rule | Yes | No separate processor | Do not seed initially |
| Exam completion reward | `exam_completion` | Award stars after qualifying exam result is created | Yes | Yes | `10` to `25` stars |
| Score threshold reward | `score_threshold` | Award stars when student reaches a defined percentage | Yes | Yes | `80% -> 20`, `90% -> 40` |
| Streak reward | `streak` | Award stars for continuous activity streaks | Yes | No | Keep for Phase 2 |
| Topic mastery reward | `topic_mastery` | Award stars when learner masters a topic | Yes | No | Keep for Phase 2 |
| Admin campaign reward | `admin_campaign` | Time-bound marketing or retention reward | Yes | No generic processor | Keep for Phase 2 |

### Reward Rule Fields

Each reward rule can be seeded with:

- `name`
- `institute`
- `subject` optional
- `rule_type`
- `stars_awarded`
- `score_threshold_percentage` when applicable
- `completion_count_threshold` reserved for future use
- `streak_count_threshold` reserved for future use
- `priority`
- `valid_from`
- `valid_until`
- `is_active`
- `metadata`

### Important Reward Rule Notes

- More than one active matching reward rule can be applied.
- If two signup rules are active for the same institute, both can credit stars.
- For Phase 1 we should keep exactly one default signup reward per institute unless stacking is intentional.
- Signup rewards should be triggered only after a `StudentProfile` exists, because the wallet is student-scoped.

## Recommended Default Reward Seeds

### A. Signup Reward

| Field | Suggested Value |
|---|---|
| `name` | `Default signup bonus` |
| `rule_type` | `signup` |
| `stars_awarded` | `100` |
| `priority` | `10` |
| `subject` | `null` |
| `valid_from` | `null` |
| `valid_until` | `null` |
| `is_active` | `true` |
| `metadata` | `{"seed_code": "default_signup_bonus_v1"}` |

### B. Exam Completion Reward

| Field | Suggested Value |
|---|---|
| `name` | `Exam completion reward` |
| `rule_type` | `exam_completion` |
| `stars_awarded` | `10` |
| `priority` | `20` |
| `subject` | `null` |
| `is_active` | `true` |
| `metadata` | `{"seed_code": "exam_completion_v1"}` |

### C. Score Threshold Rewards

| Field | Suggested Value |
|---|---|
| `name` | `Score 80 reward` |
| `rule_type` | `score_threshold` |
| `score_threshold_percentage` | `80.00` |
| `stars_awarded` | `20` |
| `priority` | `30` |
| `is_active` | `true` |
| `metadata` | `{"seed_code": "score_threshold_80_v1"}` |

| Field | Suggested Value |
|---|---|
| `name` | `Score 90 reward` |
| `rule_type` | `score_threshold` |
| `score_threshold_percentage` | `90.00` |
| `stars_awarded` | `40` |
| `priority` | `31` |
| `is_active` | `true` |
| `metadata` | `{"seed_code": "score_threshold_90_v1"}` |

## 2. Referral Programs

Model: `apps.economy.models.ReferralProgram`

Use this for referral bonuses because the backend already has a dedicated referral processing flow.

| Config Item | Purpose | Configurable Today | Already Processed Today | Suggested Seed |
|---|---|---|---|---|
| Referrer reward | Reward existing student for inviting another learner | Yes | Yes | `50` stars |
| Referee reward | Reward new student for joining with referral code | Yes | Yes | `50` stars |
| Reward side | Decide who gets rewarded | Yes | Yes | `both` |
| Date window | Campaign validity | Yes | Yes | open for default |
| Usage limit | Limit code usage | Yes | Yes | optional |

### Recommended Referral Seed

| Field | Suggested Value |
|---|---|
| `name` | `Default referral program` |
| `referrer_stars` | `50` |
| `referee_stars` | `50` |
| `reward_side` | `both` |
| `valid_from` | `null` |
| `valid_until` | `null` |
| `is_active` | `true` |
| `metadata` | `{"seed_code": "default_referral_program_v1"}` |

## 3. Star Packs

Model: `apps.economy.models.StarPack`

Use this for direct star purchases.

| Pack Use Case | Suggested Stars | Suggested Price | Status |
|---|---|---|---|
| Entry pack | `100` | `100.00 INR` | Seed in Phase 1 |
| Value pack | `500` | `299.00 INR` | Seed in Phase 1 |
| Growth pack | `1000` | `499.00 INR` | Optional Phase 1 |
| Premium pack | `2500` | `999.00 INR` | Optional Phase 2 |

### Recommended Star Pack Seed Set

| Code | Name | Stars | Price | Currency | Sort Order |
|---|---|---:|---:|---|---:|
| `stars-100` | `100 Stars` | 100 | 100.00 | `INR` | 10 |
| `stars-500` | `500 Stars` | 500 | 299.00 | `INR` | 20 |
| `stars-1000` | `1000 Stars` | 1000 | 499.00 | `INR` | 30 |

## 4. Subscription Plans

Models:

- `apps.economy.models.SubscriptionPlan`
- `apps.economy.models.SubscriptionPlanCycle`
- `apps.economy.models.SubscriptionStarCreditRule`

Use this when subscription value should also be expressed in stars.

| Plan | Cycle | Price | Activation Stars | Renewal Stars | Suggested Status |
|---|---|---:|---:|---:|---|
| Starter | monthly | 199.00 | 200 | 200 | Phase 1 |
| Scholar | monthly | 399.00 | 500 | 500 | Phase 1 |
| Scholar | yearly | 3999.00 | 6500 | 6500 | Phase 2 |

### Recommended Plan Seed Set

#### Plan

| Field | Starter | Scholar |
|---|---|---|
| `code` | `starter` | `scholar` |
| `name` | `Starter` | `Scholar` |
| `description` | Basic recurring access with monthly stars | Higher recurring value with more star credit |

#### Plan Cycles

| Plan Code | Billing Interval | Interval Count | Price | Currency |
|---|---|---:|---:|---|
| `starter` | `monthly` | 1 | 199.00 | `INR` |
| `scholar` | `monthly` | 1 | 399.00 | `INR` |

#### Subscription Star Credit Rules

| Plan Code | Credit on Activation | Credit on Renewal | Stars Credited |
|---|---|---|---:|
| `starter` | `true` | `true` | 200 |
| `scholar` | `true` | `true` | 500 |

## 5. Content Access Policies

Model: `apps.economy.models.ContentAccessPolicy`

Use this to define how specific content becomes accessible.

Supported policy types:

- `free`
- `stars_only`
- `entitlement_only`
- `stars_or_entitlement`

### Typical Use Cases

| Content Example | Policy Type | Suggested Config |
|---|---|---|
| Sample test | `free` | no star cost |
| Premium mock test | `stars_only` | `200` stars |
| Chapter test bundle | `stars_only` | `100` stars |
| Subscription content | `entitlement_only` | `subscription:starter` |
| Either subscription or stars | `stars_or_entitlement` | `250` stars or matching entitlement |

### Recommended Phase 1 Policy Templates

| Content Type | Content Key Pattern | Policy Type | Star Cost | Entitlement Code |
|---|---|---|---:|---|
| `exam` | sample / demo exams | `free` | 0 | blank |
| `exam` | premium mock exams | `stars_only` | 200 | blank |
| `exam` | chapter premium exams | `stars_only` | 100 | blank |
| `exam` | subscription exams | `stars_or_entitlement` | 250 | `subscription:starter` |

## 6. Unlock Rules

Model: `apps.economy.models.UnlockRule`

Use this for prerequisite-based unlocking beyond raw access policy.

Supported rule types:

- `stars_balance`
- `entitlement`
- `exam_completion`
- `score_threshold`
- `admin_approval`
- `composite`

### Live Status

| Rule Type | Evaluated Today | Notes |
|---|---|---|
| `stars_balance` | Yes | Wallet balance check works |
| `entitlement` | Yes | Entitlement check works |
| `exam_completion` | Yes | Based on result count |
| `score_threshold` | Yes | Based on best result percentage |
| `admin_approval` | Yes | Returns locked until override workflow exists |
| `composite` | No | Placeholder only right now |

### Recommended Unlock Examples

| Content | Rule Type | Suggested Value |
|---|---|---|
| Advanced topic test | `exam_completion` | complete `3` qualifying tests |
| Elite mock | `score_threshold` | achieve `75%` |
| Premium contest lane | `stars_balance` | maintain `500` available stars |
| Special institute content | `admin_approval` | institute-level manual unlock |

## 7. Admin and Manual Economy Actions

These are not usually seeded as static rows, but the backend supports them:

| Action | Backend Support | Notes |
|---|---|---|
| Admin grant stars | Yes | manual bonus or support case |
| Admin debit/adjust stars | Yes | through ledger helpers |
| Manual entitlement grant | Yes | useful for school/institute access |
| Refund stars | Partially modeled | flow can be added using ledger source `refund` |
| Expiry stars | Modeled | expiry policy processor not yet implemented |

## Recommended Phase-Wise Seeding

### Phase 1: Mandatory Seeds

Seed these first:

1. `signup` reward rule
2. one default `ReferralProgram`
3. `100`, `500`, `1000` star packs
4. `starter` and `scholar` subscription plans
5. a minimum content access policy set for free vs premium exams

### Phase 2: Academic Reward Seeds

Seed after core wallet flows are stable:

1. `exam_completion` reward
2. `score_threshold` reward ladder
3. initial unlock rules for premium or progression-based content

### Phase 3: Advanced Campaign and Retention Seeds

Seed after reporting and analytics are stable:

1. `streak` reward rules
2. `topic_mastery` reward rules
3. `admin_campaign` reward rules
4. more advanced subscription entitlement bundles

## Seed Ownership Rules

To keep the system scalable:

- every seed row should carry a `metadata.seed_code`
- seed commands should be idempotent
- seed commands should update matching seed rows instead of duplicating them
- institute-specific seeds should be isolated by institute code
- shared defaults should be easy to clone into future school, competitive, or professional tenants

## Current Backend Hook Status

### Already Live

- signup reward processor exists
- referral processor exists
- star pack payment completion exists
- subscription star credit exists
- content star spending exists
- unlock evaluation exists for most rule types

### Still Needed During Implementation

- call signup reward processor automatically when student onboarding completes
- decide whether `RewardRuleType.REFERRAL` will be used or referral will stay only under `ReferralProgram`
- define initial content policy mapping for sample, free, premium, and subscription exams
- add future processors for `streak`, `topic_mastery`, and `admin_campaign`

## Suggested First Seed Command Scope

The first seed command should create or update:

1. default signup reward
2. default referral program
3. default star packs
4. starter and scholar subscription plans
5. starter content access templates

That is the safest first step before adding more advanced reward ladders.

## Admin-First Seed Checklist

This section answers a different question from the economy seed matrix:

`which modules should be fed with default data first from the admin point of view so the platform becomes operational in the correct order`

The answer is not:

`start with economy`

The correct answer is:

`start with the dependency chain that all later admin, institute, teacher, and student workflows rely on`

## Admin Seed Order

| Order | Module | Owner | Seed Type | Mandatory Before Go-Live | Why It Must Come In This Order |
|---|---|---|---|---|---|
| 1 | Geography masters | Platform admin / backend seed | Global default seed | Yes | Institute location validation depends on it |
| 2 | Academic option catalog | Platform admin / backend seed | Global default seed | Yes | Exam defaults, builder dropdowns, and question authoring rely on it |
| 3 | Institute management | Platform admin | Manual + import seed | Yes | Every academic, roster, exam, and economy record is institute-scoped |
| 4 | Institute exam defaults | Platform admin or institute admin | Manual config seed | Yes | New exams inherit these defaults |
| 5 | Academic setup | Institute admin | Manual + import seed | Yes | Students, assignments, exams, and question scoping depend on it |
| 6 | People | Institute admin | Manual + bulk import | Yes | Student and teacher operational records are required for real usage |
| 7 | Teacher assignments | Institute admin | Manual + bulk import | Usually yes | Teacher readiness and subject ownership depend on it |
| 8 | Question bank | Institute admin / teacher | Manual + import seed | No, but strongly recommended | Exams need content inventory |
| 9 | Exams | Institute admin / teacher | Manual operational seed | No | Depends on institute, academics, defaults, and often question bank |
| 10 | Economy configuration | Backend seed first, admin visibility second | Backend idempotent seed | No for basic academic launch, yes for premium economy launch | Depends on students, exams, and access strategy |
| 11 | Demo results / showcase attempts | Backend seed / QA | Demo-only seed | No | Only needed for demos, QA, and reporting showcase |

## Module-By-Module Checklist

### 1. Geography Masters

| Item | Status Type | Owner | Feed First | Notes |
|---|---|---|---|---|
| Countries | backend seed | platform | Yes | Required for normalized institute geography |
| States | backend seed | platform | Yes | Required before city/pincode validation |
| Cities | backend seed | platform | Yes | Used by onboarding and institute profile data |
| Pincodes / postal codes | backend seed | platform | Yes | Needed because institute serializer validates complete location chain |

Recommended source:

- `apps.geography.management.commands.seed_default_geography`

### 2. Academic Option Catalog

| Item | Status Type | Owner | Feed First | Notes |
|---|---|---|---|---|
| Exam type options | backend seed | platform | Yes | Required for exam creation defaults |
| Delivery mode options | backend seed | platform | Yes | Required for exam forms |
| Timer mode options | backend seed | platform | Yes | Used by institute exam defaults |
| Navigation mode options | backend seed | platform | Yes | Used by institute exam defaults |
| Attempt policy options | backend seed | platform | Yes | Used by institute exam defaults |
| Result publish mode options | backend seed | platform | Yes | Used by institute exam defaults |
| Review mode options | backend seed | platform | Yes | Used by institute exam defaults |
| Security mode options | backend seed | platform | Yes | Used by institute exam defaults and security review |
| Economy access policy options | backend seed | platform | Yes | Required for exam-level economy policy selection |
| Question type / difficulty / format / attachment options | backend seed | platform | Yes | Needed for question bank authoring and import |

Recommended source:

- `apps.academics.management.commands.seed_option_catalog`

### 3. Institute Management

| Item | Status Type | Owner | Feed First | Notes |
|---|---|---|---|---|
| Institute name and code | manual | platform admin | Yes | Top-level tenant identity |
| Institute contact profile | manual | platform admin | Yes | Needed for operations and reporting |
| Institute geography | manual after geography seed | platform admin | Yes | Depends on geography masters |
| Institute active state | manual | platform admin | Yes | Controls operational availability |

This is the first real admin module that must be populated manually.

### 4. Institute Exam Defaults

| Item | Status Type | Owner | Feed First | Notes |
|---|---|---|---|---|
| Duration minutes | manual config | platform or institute admin | Yes | Applied to new exams if not explicitly supplied |
| Attempt policy | manual config | platform or institute admin | Yes | Affects default student attempt rules |
| Timer mode | manual config | platform or institute admin | Yes | Used by exam creation flow |
| Navigation mode | manual config | platform or institute admin | Yes | Used by exam creation flow |
| Result publish mode | manual config | platform or institute admin | Yes | Affects result lifecycle defaults |
| Review mode | manual config | platform or institute admin | Yes | Affects post-submit review |
| Security mode | manual config | platform or institute admin | Yes | Affects integrity posture |
| Resume / section switching / return rules | manual config | platform or institute admin | Yes | Impacts student attempt behavior |
| Exam instructions template | manual config | platform or institute admin | Optional | Helpful for consistent exam setup |

This is admin-first because new exams inherit these defaults unless fields are explicitly overridden.

### 5. Academic Setup

| Item | Status Type | Owner | Feed First | Notes |
|---|---|---|---|---|
| Academic years | manual + import | institute admin | Yes | Students and assignments depend on academic year |
| Programs | manual + import | institute admin | Yes | Required before cohorts and many student records |
| Cohorts | manual + import | institute admin | Yes | Required if class/batch-level scoping is used |
| Subjects | manual + import | institute admin | Yes | Required for topics, assignments, questions, and exams |
| Topics | manual + import | institute admin | Recommended early | Required for deeper content tagging and analytics |

This is the core dependency module for the institute workspace.

### 6. People

| Item | Status Type | Owner | Feed First | Notes |
|---|---|---|---|---|
| Teacher profiles | manual + bulk import | institute admin | Yes | Needed for ownership and assignments |
| Student profiles | manual + bulk import | institute admin | Yes | Needed for wallet, attempts, and results |
| Login/account readiness | operational setup | platform + institute | Yes | Needed for real usage, not just seeded records |

Important dependency:

- student profiles cannot be seeded cleanly before `academic_year`, `program`, and optional `cohort` exist
- teacher assignments cannot be seeded cleanly before teachers and subject scope exist

### 7. Teacher Assignments

| Item | Status Type | Owner | Feed First | Notes |
|---|---|---|---|---|
| Main teacher mapping by academic scope | manual + import | institute admin | Yes for teacher-led operations | Required for subject ownership and readiness |
| Assistant / mentor mapping | manual + import | institute admin | Optional | Useful for larger institutes |
| Primary assignment marker | manual | institute admin | Recommended | Prevents ambiguous ownership per scope |

This is a bridge module between academic setup and exam/question operations.

### 8. Question Bank

| Item | Status Type | Owner | Feed First | Notes |
|---|---|---|---|---|
| Core showcase/import questions | import seed | institute admin / teacher | Recommended | Speeds exam authoring |
| Subject-tagged questions | import seed | institute admin / teacher | Recommended | Better operational quality |
| Topic-tagged questions | import seed | institute admin / teacher | Recommended | Better analytics and filtering |

This is not the first admin seed module, but it is the first content seed module.

### 9. Exams

| Item | Status Type | Owner | Feed First | Notes |
|---|---|---|---|---|
| Exam shells | manual | institute admin / teacher | After defaults | Depends on institute + academics + defaults |
| Builder sections and questions | manual | institute admin / teacher | After question bank | Requires content inventory or authored questions |
| Student assignments | manual | institute admin / teacher | After students | Depends on roster readiness |
| Access key and lifecycle state | manual | institute admin / teacher | After shell creation | Operational setup, not foundational seed |

### 10. Economy Configuration

| Item | Status Type | Owner | Feed First | Notes |
|---|---|---|---|---|
| Reward rules | backend seed | backend/platform | After student model exists in real flow | Signup and exam rewards need students and events |
| Referral program | backend seed | backend/platform | After student onboarding flow | Referral relies on real student identities |
| Star packs | backend seed | backend/platform | After institute setup | Student wallet UI depends on active packs |
| Subscription plans and cycles | backend seed | backend/platform | After institute setup | Student subscription UI depends on active plans |
| Subscription star credit rules | backend seed | backend/platform | After plan cycles | Direct dependency on subscription plan cycles |
| Content access policies | backend seed + exam mapping | backend/platform | After exam strategy exists | Must align to actual premium/free exam lanes |
| Unlock rules | backend seed | backend/platform | After reward and content strategy | Best added after premium flow is stable |

Important current product truth:

- admin economy support actions exist
- pack and subscription configuration is still backend-led today
- economy should be seeded early for premium launch readiness, but it should not be the first manual admin data-entry module

### 11. Demo Results and Showcase History

| Item | Status Type | Owner | Feed First | Notes |
|---|---|---|---|---|
| Demo academic data | backend seed | QA / backend | No | Useful for testing, demos, and screenshots |
| Showcase exams | backend seed | QA / backend | No | Not part of tenant master data |
| Showcase attempt history | backend seed | QA / backend | No | Reporting/demo support only |

## Recommended Execution Flow

Use this as the real operational order:

1. run global backend seeds for `geography` and `option_catalog`
2. create platform-level institute records
3. configure institute exam defaults
4. populate academic years, programs, cohorts, subjects, and topics
5. import or create teachers and students
6. create teacher assignments
7. import starter question-bank content
8. create exams and assignment flows
9. apply economy seed command for rewards, packs, plans, policies, and unlock templates
10. load demo or QA showcase data only when needed

## Final Recommendation

From the admin point of view, the first module to feed with default data is not economy.

The first true admin-first data modules are:

1. `Institute Management`
2. `Institute Exam Defaults`
3. `Academic Setup`
4. `People`
5. `Teacher Assignments`

The first global backend seed modules are:

1. `Geography Masters`
2. `Academic Option Catalog`

The first backend-led premium/business seed module is:

1. `Economy Configuration`

## Technical Implementation Checklist

This section maps the admin-first seed order to the actual backend implementation surfaces that exist today.

Use it to answer:

- which seed can be run with a management command right now
- which seed should be created through API or admin UI flows
- which module still needs a dedicated seed command

## Execution Matrix

| Module | Primary Model / Surface | Current Execution Path | Ready Today | Gap |
|---|---|---|---|---|
| Geography masters | `apps.geography` | Django management command | Yes | None |
| Academic option catalog | `OptionCatalogEntry` | Django management command | Yes | None |
| Institutes | `InstituteViewSet` | REST API / admin workflow | Yes | No dedicated bulk seed command yet |
| Institute exam defaults | `InstituteSerializer.exam_defaults` | REST API / admin workflow | Yes | No dedicated bulk seed command yet |
| Academic setup | `AcademicYear`, `Program`, `Cohort`, `Subject`, `Topic` | REST API / admin workflow | Yes | No bundled academic bootstrap seed yet |
| Students | `StudentProfileViewSet` | REST API / roster import workflow | Yes | No dedicated backend seed command yet |
| Teachers | `TeacherProfileViewSet` | REST API / roster import workflow | Yes | No dedicated backend seed command yet |
| Teacher assignments | `TeacherAssignmentViewSet` | REST API / admin workflow | Yes | No dedicated backend seed command yet |
| Question bank | `QuestionViewSet` and import flow | REST API / import workflow / showcase seed | Yes | No institute bootstrap command yet |
| Exams | `ExamViewSet` and related section/question routes | REST API / admin workflow / showcase seed | Yes | No institute bootstrap command yet |
| Economy configuration | economy models | Backend seed command at platform level | Yes | Import remains platform-owned for now |
| Demo results | results seed commands | Django management commands | Yes | Demo-focused, not tenant bootstrap |

## Commands Available Today

### Global bootstrap commands

| Command | Purpose | Use Stage |
|---|---|---|
| `python manage.py seed_default_geography` | seed countries, states, cities, pincodes | first global bootstrap |
| `python manage.py seed_option_catalog` | seed exam and question authoring option catalogs | first global bootstrap |
| `python manage.py seed_master_economy <institute_code>` | refresh option catalog prerequisites and run the full platform economy seed flow | preferred platform economy bootstrap |

### Demo / showcase commands

| Command | Purpose | Use Stage |
|---|---|---|
| `python manage.py seed_showcase_questions` | load showcase question inventory | optional demo content |
| `python manage.py seed_showcase_exams` | load showcase exams | optional demo content |
| `python manage.py seed_demo_academic_data` | create a demo institute, people, exam, attempt, and result flow | QA / local demo |
| `python manage.py seed_showcase_attempt_history` | create result/attempt showcase history | QA / demo |
| `python manage.py purge_to_demo_state` | reset demo-style data | QA reset only |

## APIs Available Today

### Platform and institute setup

| Module | Endpoint | Notes |
|---|---|---|
| Institutes | `/api/v1/institutes/` | create, update, list institutes |
| Institute exam defaults | `/api/v1/institutes/` | stored through `exam_defaults` on institute serializer |
| Academic years | `/api/v1/academics/academic-years/` | institute-scoped academic year CRUD |
| Programs | `/api/v1/academics/programs/` | institute-scoped program CRUD |
| Cohorts | `/api/v1/academics/cohorts/` | depends on program + academic year |
| Subjects | `/api/v1/academics/subjects/` | depends on institute and optional program |
| Topics | `/api/v1/academics/topics/` | depends on subject |
| Option catalog | `/api/v1/academics/option-catalog/` | mainly global operational metadata |

### Roster and academic ownership

| Module | Endpoint | Notes |
|---|---|---|
| Students | `/api/v1/students/` | depends on institute + academic year + program |
| Teachers | `/api/v1/teachers/` | institute-scoped teacher CRUD |
| Teacher assignments | `/api/v1/teachers/assignments/` | depends on teacher + academic scope + subject |
| Student login creation | `/api/v1/accounts/students/<student_id>/create-login/` | operational account bootstrap |
| Teacher login creation | `/api/v1/accounts/teachers/<teacher_id>/create-login/` | operational account bootstrap |

### Content and assessment

| Module | Endpoint | Notes |
|---|---|---|
| Question bank | `/api/v1/question-bank/questions/` | content inventory CRUD |
| Question options | `/api/v1/question-bank/options/` | question authoring support |
| Question tags | `/api/v1/question-bank/tags/` | tagging support |
| Exams | `/api/v1/exams/` | exam shell CRUD |
| Exam sections | `/api/v1/exams/sections/` | builder support |
| Exam questions | `/api/v1/exams/questions/` | builder support |

### Economy operations

| Module | Endpoint | Notes |
|---|---|---|
| Student wallet | `/api/v1/economy/wallet/` | runtime student wallet view |
| Star packs | `/api/v1/economy/star-packs/` | student-visible pack list |
| Subscription plans | `/api/v1/economy/subscription-plans/` | student-visible plan list |
| Student orders | `/api/v1/economy/orders/` | payment order history |
| Student subscriptions | `/api/v1/economy/subscriptions/` | active subscriptions |
| Spend stars | `/api/v1/economy/spend-stars/` | content unlock spend flow |
| Admin grant stars | `/api/v1/economy/admin/grant-stars/` | support action, not seed bootstrap |
| Admin confirm payment order | `/api/v1/economy/admin/orders/<order_id>/confirm/` | operator action after order creation |

## Module Execution Notes

### 1. Geography Masters

Implementation:

- run `python manage.py seed_default_geography`

Source of truth:

- backend command populates geography models directly

Risk level:

- low

### 2. Academic Option Catalog

Implementation:

- run `python manage.py seed_option_catalog`

Source of truth:

- global option catalog seed is already idempotent

Risk level:

- low

### 3. Institute Management

Implementation path today:

- create institutes via `/api/v1/institutes/`
- or via platform-admin workflow in web app

Recommended next addition:

- add a dedicated command such as `seed_institutes_from_csv`

Why:

- institutes are the root of all tenant-scoped seed chains

### 4. Institute Exam Defaults

Implementation path today:

- update the institute through `/api/v1/institutes/<id>/`
- send `exam_defaults` payload through institute serializer

Recommended next addition:

- add a command such as `seed_institute_exam_defaults --institute <code>`

Why:

- this will let us standardize defaults across many institutes without UI-only dependency

### 5. Academic Setup

Implementation path today:

- use `/api/v1/academics/academic-years/`
- use `/api/v1/academics/programs/`
- use `/api/v1/academics/cohorts/`
- use `/api/v1/academics/subjects/`
- use `/api/v1/academics/topics/`

Recommended next addition:

- add a command such as `seed_institute_academics --institute <code> --profile <profile_name>`

Suggested seed profile examples:

- `school_standard`
- `coaching_cbse`
- `olympiad_foundation`

### 6. Students and Teachers

Implementation path today:

- students through `/api/v1/students/`
- teachers through `/api/v1/teachers/`
- account creation through `/api/v1/accounts/.../create-login/`

Recommended next addition:

- `seed_students_from_csv`
- `seed_teachers_from_csv`

Why:

- roster import exists as an app workflow, but backend bootstrap commands will help repeatable environment setup

### 7. Teacher Assignments

Implementation path today:

- use `/api/v1/teachers/assignments/`

Recommended next addition:

- `seed_teacher_assignments_from_csv`

Why:

- this is usually one of the highest-friction setup modules during onboarding

### 8. Question Bank

Implementation path today:

- use `/api/v1/question-bank/questions/` and related routes
- optional demo content via `seed_showcase_questions`

Recommended next addition:

- `seed_institute_question_bank --institute <code> --source <csv_or_profile>`

Why:

- showcase content is useful, but not a substitute for institute-aligned starter inventory

### 9. Exams

Implementation path today:

- use `/api/v1/exams/`
- builder support through `/api/v1/exams/sections/` and `/api/v1/exams/questions/`
- optional showcase content via `seed_showcase_exams`

Recommended next addition:

- `seed_institute_exam_templates --institute <code>`

Why:

- initial exam shells often follow repeatable patterns and benefit from template seeding

### 10. Economy Configuration

Implementation path today:

- models and services exist
- student-visible and admin-support APIs exist
- no dedicated seed command exists yet

Recommended command:

- `seed_master_economy <institute_code>`
- lower-level command: `seed_economy_defaults <institute_code>`

This command should create or update:

1. reward rules
2. referral program
3. star packs
4. subscription plans
5. subscription plan cycles
6. subscription star credit rules
7. content access policies
8. unlock rule templates

Important implementation note:

- current admin UI supports inspection and support actions
- current admin UI does not yet provide a true pack/subscription governance surface
- economy imports should therefore stay platform-level and command-driven first

### 11. Demo Results and Showcase History

Implementation path today:

- `seed_demo_academic_data`
- `seed_showcase_attempt_history`

Use only for:

- local QA
- stakeholder demos
- screenshot generation
- result workflow validation

Do not treat these as production bootstrap commands.

## What We Can Execute Immediately

The following are ready right now without new backend work:

1. `seed_default_geography`
2. `seed_option_catalog`
3. institute creation through `/api/v1/institutes/`
4. institute exam default updates through `/api/v1/institutes/`
5. academic setup through `/api/v1/academics/*`
6. roster creation through `/api/v1/students/` and `/api/v1/teachers/`
7. teacher assignments through `/api/v1/teachers/assignments/`

## What Still Needs Dedicated Seed Commands

These are the missing repeatable bootstrap pieces:

1. institute bulk seed command
2. institute exam-default seed command
3. academic bootstrap seed command by institute profile
4. student CSV seed command
5. teacher CSV seed command
6. teacher assignment CSV seed command
7. institute-aligned question bank seed command
8. institute exam-template seed command
9. institute-level economy governance endpoints if we ever move import away from platform control

## Recommended Build Order For New Seed Commands

If we implement missing commands next, the safest sequence is:

1. `seed_institutes_from_csv`
2. `seed_institute_exam_defaults`
3. `seed_institute_academics`
4. `seed_students_from_csv`
5. `seed_teachers_from_csv`
6. `seed_teacher_assignments_from_csv`
7. `seed_master_economy`
8. `seed_economy_defaults`
9. `seed_institute_question_bank`
10. `seed_institute_exam_templates`

That order matches the same dependency chain we identified in the admin-first review.

## Current Import Ownership

For the time being:

- economy import runs only at the platform level
- institute admin can review economy coverage and use support actions
- institute admin should not import reward rules, packs, plans, content policies, or unlock templates directly
- backend commands remain the source of truth for economy defaults until a platform-approved governance API is introduced

## Workflow: Economy -> Question Bank -> Exams -> Student Runtime

This section defines the correct operating flow between economy configuration, reusable content, and assessment delivery.

The intended workflow is not:

`economy -> question -> exam`

The intended workflow is:

`platform economy configuration -> question bank -> exam creation -> exam-level economy mapping -> student runtime -> reward/unlock feedback loop`

## Core Principle

Economy should define reusable access and reward logic.

Question bank should define reusable academic content.

Exam should be the layer where reusable content becomes a deliverable learning product with access rules attached.

That means:

- economy should not normally attach directly to individual questions
- questions should remain reusable across many exams
- exam is the correct level for access, pricing, entitlement, and unlock evaluation

## Final Workflow Stages

### Stage 1: Platform Economy Configuration

Owner:

- platform admin

Purpose:

- define all reusable economy rules before institute content teams start mapping premium delivery

What is configured here:

- reward rules
- referral program
- star packs
- subscription plans
- subscription plan cycles
- subscription star credit rules
- content access policy templates
- unlock rule templates

Output of this stage:

- reusable economy configuration exists in the backend database
- student wallet and unlock services have valid rules to evaluate
- institute teams do not need to invent pricing or reward logic locally

### Stage 2: Question Bank Authoring

Owner:

- institute admin
- teacher

Purpose:

- create reusable academic inventory independent from delivery packaging

What is configured here:

- question text
- question type
- difficulty
- explanation
- attachments
- subject and topic mapping
- tags

What is intentionally not configured here:

- star price per question
- entitlement per question
- unlock rules per question

Reason:

- the same question may appear in free practice, premium mock tests, revision tests, or scholarship exams
- attaching economy directly to the question would damage reuse and make pricing inconsistent

Output of this stage:

- clean reusable question inventory

### Stage 3: Exam Creation And Assembly

Owner:

- institute admin
- teacher

Purpose:

- convert reusable content into an actual assessment product

What is configured here:

- exam shell
- academic scope
- sections
- linked questions
- marks
- timing
- navigation
- result policy
- security policy
- assignment scope

Output of this stage:

- a complete exam exists as the delivery unit students can eventually access

### Stage 4: Exam-Level Economy Mapping

Owner:

- institute admin
- teacher where allowed
- policy source still governed by platform-seeded economy rules

Purpose:

- attach the correct access model to the final exam product

What is configured here:

- free access
- stars-only access
- entitlement-only access
- stars-or-entitlement access
- unlock prerequisites where required

Examples:

- sample exam -> `free`
- premium mock exam -> `stars_only`
- subscription exam -> `stars_or_entitlement`
- elite exam lane -> exam access policy plus unlock rule

Reason this belongs on exam:

- exam is the sellable or unlockable learning unit
- student attempts and access decisions happen at exam level
- access rules need one final target, not many question-level fragments

Output of this stage:

- the exam becomes runtime-ready with a clear access rule

### Stage 5: Student Runtime And Access Evaluation

Owner:

- backend runtime services
- student consumes the final evaluated state

Purpose:

- decide whether the student can open, unlock, buy, or attempt the exam

Backend checks include:

- current wallet balance
- entitlement state
- unlock-rule evaluation
- purchase history
- prior exam completion where relevant
- score threshold where relevant

Possible outcomes:

- exam available immediately
- exam unlockable by spending stars
- exam accessible via entitlement
- exam locked with explainable reason

Output of this stage:

- student sees accurate runtime access state

### Stage 6: Reward And Feedback Loop

Owner:

- backend runtime services

Purpose:

- push post-activity reward outcomes back into the economy

What can happen here:

- signup reward credited
- referral reward credited
- exam completion reward credited
- score threshold reward credited
- unlock state refreshed
- ledger updated

Output of this stage:

- economy state changes based on actual learner activity
- new unlocks may become available after performance changes

## Responsibility Table

| Layer | Main Responsibility | Should Own Economy Logic? | Notes |
|---|---|---|---|
| Platform economy configuration | define reusable reward, access, and unlock rules | Yes | source of truth |
| Question bank | define reusable academic content | No | content-first, not pricing-first |
| Exam | package questions into a deliverable unit | Yes, at access-mapping level | correct level for policy attachment |
| Student runtime | evaluate final access and reward state | Yes, through backend services | no hardcoded frontend decisions |

## What Must Not Happen

To keep the system maintainable, avoid these patterns:

- do not assign star price directly to every question
- do not treat questions as the paid product unit by default
- do not let institute scope invent independent economy rule semantics outside platform-controlled configuration
- do not hardcode reward values inside exam or question creation logic

## Recommended Nexora Workflow

The correct step-by-step flow should be:

1. platform admin seeds economy defaults
2. institute admin or teacher builds question bank
3. institute admin or teacher creates exam from questions
4. exam receives economy access policy
5. student runtime evaluates wallet, entitlement, and unlock state
6. student attempts exam
7. reward and unlock processors update wallet and future access state

## Final Product Truth

In Nexora:

- economy is a platform-governed configuration layer
- question bank is a reusable academic asset layer
- exam is the monetizable or unlockable delivery layer
- student wallet and unlock evaluation operate on the final exam target

This is the cleanest model for reuse, auditability, and long-term policy control.

## Exam Economy Policy Matrix

This section turns exam-level economy mapping into a strict operating rule.

The decision should always be made on two axes:

1. access axis
2. progression axis

Access axis decides:

- is the exam open, paid, bundle-based, or flexible

Progression axis decides:

- does the exam require readiness or prerequisite achievement before access is granted

## Axis 1: Access Policy Rule

| Exam Situation | Default Policy | Use When | Do Not Use When |
|---|---|---|---|
| Open reach exam | `free` | the goal is onboarding, trust-building, broad participation, or mandatory access | the exam is intended as a premium monetized product |
| Standalone premium exam | `stars_only` | the exam should be unlocked through direct wallet spend | the exam should be available through subscription or institutional entitlement |
| Bundle-only or subscription-only exam | `entitlement_only` | access must come from ownership, membership, sponsorship, operator grant, or subscription entitlement | non-members should still be able to unlock it directly with stars |
| Flexible premium exam | `stars_or_entitlement` | both subscribers and one-time buyers should access the same exam | the exam must be strictly locked to a bundle or strictly paid one-time |

## Axis 2: Progression Rule

| Exam Situation | Unlock Rule Needed? | Rule Type | Use When |
|---|---|---|---|
| Sample / demo exam | No | none | access should be immediate |
| Standard premium exam | Usually no | none | payment or entitlement alone is enough |
| Advanced progression exam | Yes | `exam_completion` | learner must complete earlier qualifying exams |
| Merit-gated exam | Yes | `score_threshold` | learner must reach a target percentage first |
| Premium lane with wallet readiness | Yes | `stars_balance` | learner must maintain a minimum star balance |
| Sponsored or manually controlled exam | Yes | `admin_approval` | institution or operator must approve access |
| Subscription gate with ownership signal | Yes when needed | `entitlement` | content should open only when a matching entitlement exists |

## Final Decision Matrix

| Exam Category | Default Access Policy | Default Unlock Rule | Example |
|---|---|---|---|
| Sample test | `free` | none | public or onboarding diagnostic |
| Demo mock | `free` | none | preview mock to drive conversion |
| Regular classroom or institute exam | `free` | none | assigned internal assessment |
| Chapter premium practice | `stars_only` | none | one-off paid practice unit |
| Premium mock test | `stars_only` | none | direct paid mock for self-serve purchase |
| Subscription-exclusive exam | `entitlement_only` | none | monthly premium member exam |
| Sponsored school content | `entitlement_only` | none | partner-funded exam access |
| Subscriber or buyer premium exam | `stars_or_entitlement` | none | same exam open to both plan holders and direct buyers |
| Advanced topic ladder exam | `stars_only` or `stars_or_entitlement` | `exam_completion` | unlock after completing earlier topic steps |
| Elite merit mock | `stars_only` or `stars_or_entitlement` | `score_threshold` | unlock only after reaching a score benchmark |
| Institute special approval exam | `entitlement_only` or `free` | `admin_approval` | manually released scholarship or invite-only exam |

## Rule Hierarchy

When deciding exam economy, apply these rules in order:

1. determine whether the exam is open or premium
2. determine whether access should be one-time paid, entitlement-based, or both
3. determine whether learner readiness must also be checked
4. if readiness matters, add an unlock rule on top of the access policy

This means:

- access policy answers `how can this exam be acquired`
- unlock rule answers `is this learner allowed to enter yet`

## Operational Decision Questions

Admin or teacher should answer these questions before saving exam economy policy:

1. Should every assigned student be able to open this exam without payment?
   If yes, choose `free`.

2. If not free, should a student be able to unlock it directly with wallet stars?
   If yes, choose `stars_only` or `stars_or_entitlement`.

3. Should subscription, bundle ownership, school sponsorship, or admin-issued access be enough?
   If yes, choose `entitlement_only` or `stars_or_entitlement`.

4. Should the student also prove readiness before access?
   If yes, add an unlock rule.

## Recommended Default Mapping By Exam Intent

| Intent | Policy Recommendation |
|---|---|
| Reach | `free` |
| Monetize one exam directly | `stars_only` |
| Deliver member-only value | `entitlement_only` |
| Maximize flexibility and conversion | `stars_or_entitlement` |
| Protect advanced content behind readiness | access policy plus unlock rule |

## What Should Be Avoided

Avoid these anti-patterns:

- assigning economy rules directly to every question
- using unlock rules when simple free access is enough
- using `entitlement_only` when one-time purchase is intentionally allowed
- using `stars_only` when subscription users are expected to receive the exam automatically
- mixing access and progression logic into one unclear rule

## Suggested Admin Save Logic

When an exam is saved, the economy policy decision should follow this interpretation:

1. choose `free` when broad access is the primary objective
2. choose `stars_only` when the exam is a standalone premium product
3. choose `entitlement_only` when access must come from membership or grant
4. choose `stars_or_entitlement` when both premium routes should work
5. add unlock rule only when readiness or approval is required beyond ownership/payment

## Final Decision Truth

In Nexora, the clean standard should be:

- `free` for reach
- `stars_only` for standalone premium
- `entitlement_only` for controlled ownership access
- `stars_or_entitlement` for flexible premium access
- unlock rules only for progression or approval

## Public Institute Exam Visibility Rule

This section defines how student exam visibility should work when Nexora uses one shared public institute for platform-owned exams.

## Goal

Support this model:

- every student keeps a home institute
- one public institute owns shared exams
- students from any institute can access eligible public exams
- eligibility is based on academic fit and runtime access policy, not on public-institute membership

## Ownership Rule

### Home institute

Student remains owned by:

- `StudentProfile.institute`
- `AccountProfile.institute`

Home institute continues to own:

- roster
- reporting
- teacher assignment
- internal exams
- institute-scoped administration

### Public institute

Public institute owns:

- public sample exams
- public premium mock exams
- public subject-wise shared exams
- platform-wide premium exam inventory

Public institute does not own:

- the student identity
- the student roster
- the student reporting home

## Final Student Exam Query Rule

Student available exams should be resolved as:

`home institute exams + eligible public institute exams`

That means the backend exam availability query should include two buckets:

### Bucket A: home institute exams

Include exam when:

- `exam.institute_id == student.institute_id`
- exam is active
- exam is published or otherwise student-visible
- academic scope matches student
- assignment rules allow access

### Bucket B: public institute exams

Include exam when:

- `exam.institute_id == PUBLIC_INSTITUTE_ID`
- `exam.source_type == platform`
- exam is active
- exam is published or otherwise student-visible
- academic targeting matches student
- assignment rules allow visibility if public assignment is used
- runtime economy and unlock evaluation can later decide whether it is open or locked

## Academic Match Rule For Public Exams

Public institute exams should not be shown to every student blindly.

They should appear only when academic targeting matches the student.

### Recommended matching keys

Use these in order:

1. academic year only if public inventory is year-sensitive
2. program or class-level equivalence
3. subject match where the exam is subject-scoped
4. cohort only if the product intentionally standardizes cohort semantics across institutes

### Recommended default

For public exams, the safest default match is:

- same program
- same subject when subject exists
- same cohort only when cohort is explicitly used as a shared public segmentation key

### Important caution

Local section names such as `A`, `B`, `C` are usually institute-specific.

So public exam visibility should not depend on local section naming unless the platform has standardized that meaning globally.

## Economy Evaluation Rule

Visibility and access are not the same thing.

A public exam may be visible but still:

- free and open
- visible but locked behind stars
- visible but locked behind entitlement
- visible but locked behind progression rules

So the backend should evaluate in two steps:

1. `is this exam eligible to be shown to this student`
2. `if shown, what is this student's actual access state`

## Final Resolution Order

For each student exam candidate, apply this order:

1. scope candidate exam into either home or public bucket
2. validate academic fit
3. validate assignment visibility
4. validate publish / lifecycle readiness
5. include in student-visible list
6. attach economy access state
7. attach unlock state

This produces outcomes like:

- visible and open
- visible and unlockable by stars
- visible and accessible by entitlement
- visible but locked with reason

## Recommended Backend Pseudocode

The final query rule should behave like this:

```text
available_exams(student) =
  exams where
    (
      exam.institute == student.home_institute
      OR
      (
        exam.institute == PUBLIC_INSTITUTE
        AND exam.source_type == platform
      )
    )
    AND exam.is_active == true
    AND exam is student-visible by lifecycle
    AND exam matches student academic scope
    AND exam assignment rules allow visibility
```

Then after visibility:

```text
for each visible exam:
  attach economy policy
  attach unlock state
  attach final access state
```

## Product Result

With this rule:

- institute students still see their own institute exams
- institute students can also see eligible public exams
- public institute becomes a shared content owner
- tenant ownership and reporting remain correct
- economy works at exam level without changing student institute ownership

## Implementation Note

Current backend behavior is still primarily institute-scoped for student exam visibility.

To support the public institute model fully, the student exam scoping logic should evolve from:

- `same institute only`

to:

- `same institute plus public institute platform exams that match academic scope`

That is the exact backend rule the product should move toward.
