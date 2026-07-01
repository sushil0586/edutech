  # Nexora Final Implementation Source Of Truth

## Status

This file is the single implementation source of truth for the current Nexora build.

Going forward, we should follow this file over the older planning documents when there is overlap or conflict.

This document is informed by the existing markdown docs in this workspace, but it intentionally resolves contradictions and reflects the latest product direction decisions.

For the new student frontend foundation, use:G

- `NEXORA_STUDENT_FRONTEND_FOUNDATION.md`

as the working frontend reference before high-fidelity screen design begins.

For the teacher module planning and implementation follow-up, use:

- `NEXORA_TEACHER_MODULE_SOURCE_OF_TRUTH.md`

as the teacher-side source document, together with its linked functional specs.

For the institute admin module planning and implementation follow-up, use:

- `NEXORA_INSTITUTE_ADMIN_MODULE_SOURCE_OF_TRUTH.md`

as the institute-side source document, together with its linked planning and functional specs.

For the public landing, signup simplification, and first-login profile completion redesign, use:

- `NEXORA_PUBLIC_ENTRY_AND_PROFILE_COMPLETION_PLAN.md`

as the source document before implementation starts on the public auth surface.

For learner-type scalability across school, senior secondary, and professional tracks, use:

- `NEXORA_LEARNER_TYPE_MAPPING_MATRIX.md`

as the simple reference document for onboarding, dashboard, and academic-model alignment.

## Current Product Decision

Nexora is being built as:

`a student-first assessment, practice, and progression platform powered by the existing Django backend and a new dedicated frontend experience`

## Final Direction

### 1. Backend Direction

- keep the current Django backend 
- do not start a new backend repo
- extend the current backend with new student-economy, unlock, and entitlement capabilities
- preserve institute-scoped tenancy and role-aware access

### 2. Frontend Direction

- create a new dedicated frontend repo for the latest student experience
- do not continue using the old frontend as the primary student product surface
- the new frontend should consume the current backend APIs and evolve with new backend contracts

### 3. Product Direction

- student is the primary public-facing product role right now
- teacher and institute-admin remain operational support roles
- parent remains future-facing, not launch-critical
- payments, stars, unlocks, rewards, and purchases must be database-driven, not hardcoded

## What We Are Building Right Now

The active implementation target is:

1. a clean public student entry flow
2. a new student frontend
3. a subject-aware dashboard
4. a subject-wise test catalog
5. a configurable star economy
6. a configurable unlock engine
7. a purchase-ready but modular monetization layer
8. admin override controls
9. secure and trustworthy assessment behavior on the existing exam backbone

## What We Are Not Building Right Now

These are explicitly not the main execution target for this phase:

- ERP modules
- hostel, payroll, fees, transport
- full parent product experience
- live classes
- recorded courses
- AI tutoring
- webcam proctoring
- a new backend rewrite

## Architecture Truth

### Backend

The backend remains:

- a modular Django monolith
- institute-scoped
- role-aware through `AccountProfile`
- assessment-centered through existing exam, attempt, result, and analytics models

### Frontend

The student product should move to a new frontend codebase that is:

- student-first
- modern
- production-facing
- not constrained by the structure of the existing web frontend

### Identity And Role Truth

`AccountProfile` remains the single source of truth for:

- role
- tenant scope
- workspace routing
- linked student or teacher profile
- registration context

### Academic Structure Truth

The academic structure must support more than only school classes.

Nexora should be able to serve:

- school learners from class 2 to 10
- senior secondary learners in class 11 and 12
- professional learners such as Azure, AWS, and similar certification or skills tracks

So `subject` must be treated as a generic learning domain, not only as a school subject.

The future-safe structure should be:

- learning lane or program family
- program
- subject
- topic

Examples:

- school
  - program: `Class 8 CBSE`
  - subject: `Math`
  - topic: `Algebra`

- senior secondary
  - program: `Class 11 Science`
  - subject: `Physics`
  - topic: `Kinematics`

- professional
  - program: `AWS Cloud Practitioner`
  - subject: `Security`
  - topic: `Shared Responsibility Model`

The product should therefore avoid assuming:

- every learner is class-based
- every learner has a board
- every subject comes from a school textbook catalog

## Core Product Principles

### 1. No Hardcoding

Do not hardcode:

- star balances
- reward amounts
- referral bonuses
- subscription credit amounts
- subscription renewal credits
- purchase packs
- content prices
- unlock thresholds
- entitlement rules
- score-based rewards
- plan-to-star conversions
- spend amounts per content item

All of these must come from the database and backend rules.

### 2. Ledger, Not Counters

The star economy must be transaction-based, not only balance-based.

Balances should be derived from ledger events and summarized into fast-read profile tables where needed.

### 3. Configurable Product Rules

The product should support:

- signup bonuses
- referral rewards
- manual admin grants
- earned stars from performance
- spending stars on content
- direct paid purchase of stars or bundles
- free access and paid access coexisting

without code rewrites.

### 4. Star-Led Commercial Model

All commercial and progression calculations should be star-led by default.

That means:

- subscription plans should grant stars, directly or on a schedule
- one-time purchases should grant stars
- rewards should grant stars
- student spending should consume stars
- unlock calculations should evaluate stars first

Entitlements are allowed, but only as a secondary override layer for special access cases such as:

- bundle ownership
- campaign grants
- institution-sponsored access
- admin manual exceptions

The default commercial rule is:

`plans, purchases, rewards, and progression all resolve through the star economy, with entitlements used only when direct access must bypass normal star spending`

### 5. Reuse The Existing Assessment Backbone

Do not rewrite:

- exam structure
- attempts
- answers
- results
- topic performance

unless a specific missing capability forces it.

### 6. Truthful UX

The frontend must not imply:

- access that does not exist
- review that is not actually available
- purchases that are not enabled
- settings that do not persist
- progress that is not backed by real data

## Launch Scope

## Phase A. Foundation And Alignment

### Objective

Create one stable implementation path and stop splitting direction across multiple docs and partial product ideas.

### Deliverables

- this file becomes the main implementation guide
- new student frontend repo is approved as the primary student UI path
- backend remains the existing Django project
- economy and unlock system are approved as new backend modules
- economy backend foundation is implemented in `apps/economy`
- economy database schema is captured in the initial migration
- signup reward and exam-result reward hooks are part of the backend flow
- wallet, ledger, unlock-state, star-pack, subscription-plan, spend, order, and subscription APIs are part of Phase A backend scope
- Django admin is the interim operator control plane for economy configuration and audit

### Phase A Implementation Output

Phase A backend implementation should now be treated as:

- a configurable economy foundation, not a temporary mock
- a star-led commercial engine, not a plan-led shortcut
- a service-layer orchestration model, not view-level business logic

### Phase A Backend APIs

Student APIs:

- `GET /api/v1/economy/wallet/`
- `GET /api/v1/economy/ledger/`
- `GET /api/v1/economy/unlocks/`
- `GET /api/v1/economy/star-packs/`
- `GET /api/v1/economy/subscription-plans/`
- `POST /api/v1/economy/spend-stars/`
- `GET /api/v1/economy/orders/`
- `POST /api/v1/economy/orders/star-pack/`
- `POST /api/v1/economy/orders/subscription/`
- `GET /api/v1/economy/subscriptions/`

Admin APIs:

- `POST /api/v1/economy/admin/grant-stars/`
- `GET /api/v1/economy/admin/student/<student_id>/wallet/`
- `POST /api/v1/economy/admin/student/<student_id>/refresh-unlocks/`
- `POST /api/v1/economy/admin/orders/<order_id>/confirm/`

### Phase A Operator Surface

Until a dedicated internal management UI exists, the economy should be operated through Django admin for:

- reward rules
- star packs
- subscription plans and cycles
- subscription star credit rules
- content access policies
- unlock rules
- entitlements
- payment orders and transactions
- subscriptions
- ledger and reward audit

## Phase B. Student Public Entry And Identity

### Objective

Give students a clean registration and login experience.

### Scope

- public student registration
- role-aware onboarding
- student workspace redirect
- profile and academic context capture

### Required Truth

- registration should stay minimal
- role routing must come from backend identity
- class, board, school, and interest data should be captured structurally

## Phase C. New Student Frontend

### Objective

Build a dedicated modern student-facing frontend.

### Required Surface

- landing experience
- login and registration
- dashboard
- test catalog
- exam detail
- attempt flow
- results
- analytics
- weak areas
- settings
- stars, rewards, unlocks, and purchase surfaces

### UX Direction

- modern and premium
- clear and calm
- student-first, not admin-first
- strong exam trust during attempt flows
- strong next-action guidance on dashboard and results

## Phase D. Student Dashboard

### Objective

Make the dashboard the first meaningful product surface after login.

### It Must Show

- student context
- current subject or overall subject lane
- current star summary
- next recommended test
- locked vs available items
- lock reason
- next practical action

## Phase E. Subject-Wise Test Catalog

### Objective

Expose tests in a way that feels relevant immediately.

### Catalog Structure

- overall view
- subject-wise view
- sample tests
- mock tests
- practice tests
- future bundles and premium packs

### Required Behavior

- subject filtering
- teacher-source filtering for student exam discovery and assignment visibility
- available vs locked distinction
- clear action labels
- no silent blocked states

## Phase F. Star Economy And Unlock Layer

### Objective

Build a full configurable economy, not just a progress badge.

### Economy Sources We Must Support

- signup bonus
- referral bonus
- admin grant
- earned reward from completion
- earned reward from score thresholds
- future streak rewards
- direct paid purchase
- future subscription or plan-based credits

### Economy Uses We Must Support

- unlocking tests
- unlocking sample papers
- unlocking subject bundles
- unlocking chapter bundles
- unlocking premium prep packs
- future timed packs and premium assets

### Required Backend Design

Create a new backend domain, preferably `apps/economy`, with at least these model families:

#### A. Student Economy State

- `StudentEconomyProfile`
- per-student summary balances
- available, lifetime earned, lifetime spent, admin granted, paid credited
- subscription-derived credited stars
- total locked or reserved stars if we need pending spend protection later

#### B. Immutable Ledger

- `StarLedger`
- every increase or decrease stored as a transaction
- source type, source id, reason, delta, balance snapshot, metadata
- this is the single source of truth for star movement
- all balances must be derivable from this ledger

#### C. Reward Rules

- `RewardRule`
- configurable score thresholds, completion rewards, bonus events
- no score or completion reward should live only in application code

#### D. Reward Events

- `StudentRewardEvent`
- de-duplication and traceability for reward issuance

#### E. Referral Layer

- `ReferralProgram`
- `ReferralCode`
- `ReferralEvent`

#### F. Purchase Catalog

- `StarPack`
- configurable offers such as:
  - 100 stars for 100 INR
  - 500 stars for 299 INR

#### G. Subscription Catalog

- `SubscriptionPlan`
- `SubscriptionPlanCycle`
- `SubscriptionStarCreditRule`
- plans must define their star credit behavior through data
- support monthly, quarterly, yearly, or custom cycles
- support direct recurring star grants without hardcoded plan logic

#### H. Payment Layer

- `PaymentOrder`
- `PaymentTransaction`
- purchase intent, status, amount, currency, provider references
- must support both star-pack purchases and subscription purchases

#### I. Access And Unlock Layer

- `ContentAccessPolicy`
- `UnlockRule`
- `StudentUnlockState`
- `StudentEntitlement`
- content access should support:
  - star-spend required
  - entitlement required
  - either stars or entitlement
  - free access

#### J. Student Subscription State

- `StudentSubscription`
- `SubscriptionInvoice` or `SubscriptionBillingEvent`
- tracks active plan, billing status, renewal state, cancellation state, and credited cycles
- subscription status itself should not directly unlock content unless an entitlement rule explicitly says so

### Design Rules

- stars are the primary commercial and progression calculation unit
- subscriptions should credit stars rather than bypass the economy by default
- entitlements are a controlled override, not the default pricing path
- paid access and earned access must coexist cleanly
- admin override must remain possible
- all grants and spends must be auditable
- content pricing must be configurable
- subscription pricing and star credit rules must be configurable
- every unlock decision must be explainable from stored rules and recorded state

### Final Backend Model Structure

The backend model structure we should follow is:

#### 1. Identity And Student Context

- `AccountProfile`
- `StudentProfile`

#### 2. Existing Assessment Backbone

- `Exam`
- `StudentExamAttempt`
- `StudentAnswer`
- `ExamResult`
- `StudentTopicPerformance`

#### 3. Economy Core

- `StudentEconomyProfile`
- `StarLedger`

#### 4. Reward Engine

- `RewardRule`
- `StudentRewardEvent`

#### 5. Referral Engine

- `ReferralProgram`
- `ReferralCode`
- `ReferralEvent`

#### 6. Commerce Catalog

- `StarPack`
- `SubscriptionPlan`
- `SubscriptionPlanCycle`
- `SubscriptionStarCreditRule`

#### 7. Purchase And Billing

- `PaymentOrder`
- `PaymentTransaction`
- `StudentSubscription`
- `SubscriptionBillingEvent`

#### 7A. Purchase And Settlement Flow

The backend flow we should follow is:

1. student selects a configured `StarPack` or `SubscriptionPlanCycle`
2. backend creates a `PaymentOrder`
3. payment provider or admin settlement confirms the order
4. backend creates a `PaymentTransaction`
5. backend settles the commercial effect through services
6. star-pack settlement credits stars into `StarLedger`
7. subscription settlement activates or renews `StudentSubscription`
8. subscription settlement writes a `SubscriptionBillingEvent`
9. subscription star credits are issued into `StarLedger`

This means:

- payment records never replace the ledger
- subscriptions do not bypass the ledger
- student balance changes always remain auditable

#### 8. Access And Unlocks

- `ContentAccessPolicy`
- `UnlockRule`
- `StudentUnlockState`
- `StudentEntitlement`

#### 9. Admin And Audit Support

- admin grant and adjustment actions must write to `StarLedger`
- subscription credit actions must write to `StarLedger`
- reward issuance must write to both `StudentRewardEvent` and `StarLedger`
- spend actions must write to `StarLedger` and update unlock state or entitlement state as applicable

## Phase G. Admin Controls

### Objective

Allow institute and admin teams to control the student economy and access safely.

### Required Controls

- grant stars
- deduct stars if required by policy
- manually unlock content
- manually lock or hide content
- apply exception-based access
- inspect star ledger history
- inspect purchase history
- inspect reward history

## Phase H. Secure Assessment Hardening

### Objective

Keep Nexora credible as an assessment platform while building the consumer and practice layer.

### Scope

- keep browser-based integrity model
- keep security-mode normalization
- keep exam-key and access simplification where useful
- preserve attempt resilience and teacher monitoring

### Explicit Non-Goal

- webcam proctoring is not part of this phase

## Data Model Principles

### Existing Core Tables Stay Central

The following remain core:

- `AccountProfile`
- `StudentProfile`
- `TeacherProfile`
- `Institute`
- `AcademicYear`
- `Program`
- `Cohort`
- `Subject`
- `Topic`
- `Exam`
- `StudentExamAttempt`
- `StudentAnswer`
- `ExamResult`
- `StudentTopicPerformance`

### New Domain Should Be Added, Not Squeezed In

Do not force the economy system into:

- `registration_context`
- `metadata` fields as the main source of truth
- random fields on `StudentProfile`
- random fields on `Exam`

Metadata can support extensions, but the core economy model must have proper tables.

## Frontend Principles For The New Repo

### Product Shape

The new frontend should be:

- student-focused
- latest frontend stack
- backend-connected from day one
- designed around real availability, reward, and policy states

### Required Frontend Areas

- public marketing and entry
- student auth
- student dashboard
- catalog and detail pages
- attempt runtime
- results and review
- analytics
- stars wallet
- purchase flow
- reward history
- unlock state visibility

### UX Rules

- always explain why something is locked
- always show the next meaningful action
- never fake persistence
- never hardcode rewards or prices
- keep the attempt experience calm and trustworthy

## API And Service Rules

### Backend API Rules

- keep scoped querysets first
- no unsafe cross-tenant object fetches
- use service-layer orchestration for economy flows
- use audit logs for sensitive actions

### Recommended Response Style

- lists return normalized list payloads
- actions return structured action responses
- detail endpoints return truthful current state

### Economy Workflow Services

Implement economy logic in services, not views or model hooks:

- award signup stars
- issue referral rewards
- issue exam-performance rewards
- spend stars
- create purchase order
- confirm payment
- grant purchased stars
- evaluate unlock rules
- apply manual admin override

## Delivery Roadmap

## Stage 1. Finalize Direction

- approve this file
- freeze contradictory planning branches
- use this as implementation reference

## Stage 2. New Student Frontend Repo Setup

- scaffold the new frontend repo
- wire auth and session model
- connect to the current backend
- establish design system and routing shell

## Stage 3. Economy Backend Foundation

- add `apps/economy`
- create economy models
- create migrations
- add admin visibility
- add core services

## Stage 4. Dashboard And Catalog Integration

- surface star summary
- surface lock reasons
- surface unlockable content
- surface recommended next action

## Stage 5. Reward And Spend Flows

- signup reward
- referral reward
- exam-performance reward
- spend on sample test or content

## Stage 6. Purchase Layer

- star packs
- order creation
- transaction confirmation
- wallet crediting

## Stage 7. Admin Economy Controls

- ledger inspection
- grants
- manual unlocks
- adjustments

## Stage 8. QA And UAT

- economy logic validation
- student journey validation
- admin override validation
- purchase and reward validation
- attempt and result compatibility validation

## Required QA Scenarios

We must validate at least:

- new student gets signup stars correctly
- referred student and referrer get correct rewards
- student can buy configured star pack
- student can spend stars on a priced item
- student cannot access locked content without sufficient access
- unlock reason is visible and correct
- admin grant immediately affects availability
- paid and earned stars remain distinguishable
- reward duplication is prevented
- tenant boundaries remain enforced

## Final Non-Negotiable Decisions

1. new frontend repo for student experience
2. existing backend remains the system of record
3. no new backend repo
4. economy is ledger-based
5. all prices, rewards, and unlocks are configurable
6. all access must be truthful and auditable
7. existing assessment backbone is extended, not rewritten

## Supersession Note

This file supersedes older planning intent where needed, especially in these areas:

- old frontend vs new frontend direction
- MVP-only scope vs student-growth scope
- simple star gating vs full economy design
- free-now assumptions vs purchase-ready architecture

## Source Inputs Reviewed

This file was consolidated from the current planning and architecture documents in this workspace, including:

- `CURRENT_MVP_SCOPE.md`
- `ARCHITECTURE_NOTES.md`
- `DATABASE_DESIGN.md`
- `DATABASE_RELATIONSHIP_MAP.md`
- `MULTI_TENANT_RULES.md`
- `ROLE_ACCESS_MATRIX.md`
- `ROLE_FRONTEND_BACKEND_GAP_ANALYSIS.md`
- `STUDENT_PHASE_WISE_IMPLEMENTATION_PLAN.md`
- `STUDENT_PROD_LAUNCH_AND_STAR_GATING_DESIGN.md`
- `STUDENT_MODULE_NEXTJS_PLAN.md`
- `STUDENT_MODULE_REVIEW.md`
- `STUDENT_MODULE_QA_CHECKLIST.md`
- `PHASE_1_STUDENT_PORTAL_PUNCHLIST.md`
- `REGISTRATION_AND_SUBSCRIPTION_IMPLEMENTATION_PLAN.md`
- `NEXORA_GAP_IMPLEMENTATION_PLAN.md`
- `PHASE_3_SECURE_ASSESSMENT_PLAN.md`
- `PHASE_3A_SECURITY_MODEL_SPEC.md`
- `SECURITY_NOTES.md`
- `WEBCAM_PROCTORING_ARCHITECTURE_NOTE.md`
- `HYBRID_PLATFORM_STRATEGY.md`
- `frontend_ui_ux_blueprint.md`
- `frontend_design_tokens.md`
- `frontend_wireframe_spec.md`
- `DEPLOYMENT_GUIDE.md`
- `QA_UAT_CHECKLIST.md`
