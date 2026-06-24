# Future-Proof Assessment Platform Execution Blueprint

## Purpose

This document converts the high-level architecture map into an execution-oriented plan.

It focuses on:

- concrete data-model evolution
- backend module ownership
- frontend impact areas
- sequence of implementation
- phase-wise delivery priorities

This is the practical follow-up to:

- [FUTURE_PROOF_ASSESSMENT_PLATFORM_ARCHITECTURE_MAP.md](./FUTURE_PROOF_ASSESSMENT_PLATFORM_ARCHITECTURE_MAP.md)
- [NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md](./NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md)

---

## Core Product Goal

The portal should evolve into one configurable assessment platform capable of supporting:

- school assessments
- competitive exams
- professional certifications
- language proficiency exams

without creating separate products too early.

The execution principle is:

`generalize the engines, not the brand surface`

---

## Current Architecture Assessment

## Strengths

The current platform already has enough structure to move forward safely:

- institute-first tenancy
- domain-separated backend apps
- question bank and exam models
- attempt lifecycle
- result lifecycle
- role-based portals
- good enough rich content and media baseline

## Current constraints

The main limitations are not around the portal itself.
They are around how flexible the current assessment model is.

Current stress points:

- `Question` is still too prompt-centric
- exam scoring is still too marks-centric
- delivery is still too generic for media-first exams
- evaluation is still too objective-exam oriented
- analytics are still more dashboard-oriented than exam-family oriented

These are solvable by structured expansion.

---

## Architectural Refactor Principles

All future work should follow these rules:

### 1. Preserve the modular monolith

Do not split into microservices now.

Stay with the current modular Django monolith and keep domain boundaries clean.

### 2. Introduce registries, not condition sprawl

Do not solve every new exam family with more `if exam_type == ...` logic.

Instead introduce:

- item type registry
- scoring registry
- delivery policy registry
- evaluation policy registry

### 3. Keep migration evolutionary

Do not replace `Question`, `Exam`, and `StudentAnswer` in one rewrite.

Wrap and extend them first.

### 4. Make media, evaluation, and scoring first-class domains

These cannot remain side concerns if the platform is to support `PTE`, `TOEFL`, `IELTS`, `GRE`, `GMAT`, and certification-grade practice.

---

## Target Domain Expansion

## A. Assessment Family Layer

Introduce a conceptual family layer.

Suggested model:

- `AssessmentFamily`

Core fields:

- `code`
- `label`
- `description`
- `is_active`
- `metadata`

Suggested seed data:

- `school`
- `competitive`
- `certification`
- `language_proficiency`

Purpose:

- drives analytics presets
- drives delivery presets
- drives scoring defaults
- helps avoid hardcoding by brand name

## B. Assessment Program Layer

Introduce a higher-level product/program layer that sits above specific exams.

Suggested model:

- `AssessmentProgram`

Core fields:

- `institute`
- optional `assessment_family`
- `name`
- `code`
- `description`
- `metadata`

Examples:

- `CBSE Class 8`
- `NEET Foundation`
- `AWS CCP`
- `IELTS Academic`

This should coexist with the academic `Program` model at first if needed.

Longer term:

- academic `Program` can stay for school tenancy
- assessment `Program` can become the exam/product classification layer

---

## Item Model Evolution

## Current reality

Today the main content structure is roughly:

- `Question`
- `QuestionOption`
- `QuestionPassage`
- `QuestionAttachment`

This is enough for objective and comprehension-heavy workflows, but not for full multi-format assessment delivery.

## Recommended near-term extension

Keep current tables, but add a richer orchestration layer on top.

### Suggested additions

- `AssessmentItemType`
- `AssessmentItemTemplate`
- `AssessmentItemPolicy`

### `AssessmentItemType`

Purpose:

- registry table for authoring and delivery behavior

Core fields:

- `code`
- `label`
- `assessment_family`
- `response_mode`
- `auto_evaluation_mode`
- `supports_media`
- `supports_passage`
- `supports_sub_items`
- `schema_version`
- `metadata`

Examples:

- `mcq_single`
- `mcq_multiple`
- `essay`
- `speaking_response`
- `audio_fill_blanks`

### `Question` model evolution

Add fields like:

- `item_type_code`
- `response_schema`
- `authoring_schema`
- `evaluation_schema`
- `delivery_schema`

These can start as JSON fields.

This allows the same `Question` table to temporarily support richer behaviors without destructive schema replacement.

### Longer-term target

Introduce:

- `AssessmentItem`
- `AssessmentItemOption`
- `AssessmentItemSegment`
- `AssessmentItemAttachment`
- `AssessmentItemGroup`

But only after the registry layer is stable.

---

## Delivery Model Evolution

## Current reality

Current exam delivery appears closer to:

- exam
- sections
- questions
- attempt
- answer

This works for standard web-based tests but is not enough for specialized delivery modes.

## Recommended additions

### `ExamTemplate`

Purpose:

- reusable test structure by exam family

Core fields:

- `institute`
- `assessment_family`
- `name`
- `template_type`
- `metadata`

### `SectionDeliveryPolicy`

Purpose:

- defines section behavior independent of frontend pages

Core fields:

- `section`
- `navigation_mode`
- `timer_mode`
- `media_mode`
- `review_mode`
- `response_lock_mode`
- `metadata`

Examples:

- free navigation
- sequential navigation
- audio-driven auto-progress
- speaking prep timer + answer timer

### `AttemptDeliverySnapshot`

Purpose:

- freeze delivery rules at attempt start

This prevents future template changes from mutating live attempts.

Fields:

- `attempt`
- `delivery_policy_snapshot`
- `section_snapshot`
- `security_snapshot`

---

## Response Model Evolution

## Current reality

Current `StudentAnswer` style data likely supports:

- selected option
- multiple selected options
- short answer text

That is not enough for language and advanced response formats.

## Recommended additions

### `ResponseArtifact`

Purpose:

- store media-backed student responses

Examples:

- audio recording
- uploaded document
- transcript
- handwriting scan if ever needed

Core fields:

- `attempt`
- `question`
- `artifact_type`
- `file`
- `duration_seconds`
- `transcript`
- `metadata`

### Extend answer payload support

Add a normalized answer payload concept:

- `selected_option_ids`
- `answer_text`
- `numeric_value`
- `ordered_tokens`
- `highlight_ranges`
- `recording_reference`

This can start as a JSON field alongside existing fields.

---

## Evaluation Model Evolution

## Current reality

The system likely assumes most scoring is immediate and objective.

That is fine for school and competitive objective exams, but not enough for:

- essays
- speaking
- written explanation tasks
- rubric-based certification simulations

## Recommended additions

### `EvaluationRubric`

Core fields:

- `institute`
- `assessment_family`
- `name`
- `criteria_schema`
- `band_mapping_schema`
- `is_active`

### `ManualEvaluationTask`

Core fields:

- `attempt`
- `question`
- `assigned_to`
- `status`
- `priority`
- `due_at`
- `metadata`

### `EvaluationRecord`

Core fields:

- `attempt`
- `question`
- `evaluator`
- `evaluation_mode`
- `rubric_scores`
- `comments`
- `final_marks`
- `published_at`

### `ModerationRecord`

Core fields:

- `evaluation_record`
- `moderator`
- `decision`
- `notes`

This becomes essential once you support real writing and speaking workflows.

---

## Scoring Engine Design

## Recommended pattern

Create a scoring strategy layer under a dedicated service module.

### Suggested structure

- `apps/results/scoring/registry.py`
- `apps/results/scoring/standard_marks.py`
- `apps/results/scoring/negative_marks.py`
- `apps/results/scoring/band_score.py`
- `apps/results/scoring/scaled_score.py`
- `apps/results/scoring/rubric_score.py`

### Strategy interface

Each scorer should expose methods such as:

- `score_answer()`
- `score_attempt()`
- `normalize_result()`
- `build_breakdown()`

### Suggested scoring families

- `standard_marks`
- `negative_marks`
- `competitive_partial_credit`
- `language_band_score`
- `certification_scaled_score`
- `rubric_only`

## Where it should attach

Add references like:

- `exam.scoring_strategy`
- `section.scoring_strategy`
- `question.evaluation_mode`

This allows the same portal to support:

- school quizzes
- NEET-style negative marking
- IELTS band estimation
- GMAT/GRE scaled transformations later

---

## Analytics Engine Design

## Recommended shift

Move toward analytics presets per exam family instead of one broad dashboard.

### Suggested preset types

- `school_mastery`
- `competitive_benchmark`
- `certification_domain_readiness`
- `language_skill_progression`

### Suggested analytics layers

- global summary
- section summary
- skill summary
- item difficulty summary
- time behavior summary
- evaluator quality summary

### Recommended implementation path

Do not rewrite all analytics now.

Instead:

1. keep current analytics screens
2. introduce backend preset builders
3. let frontend choose layout by preset type

---

## Backend Ownership Plan

## Recommended app/module ownership

### `apps/question_bank`

Continue owning:

- item content
- item type registry
- passages
- attachments
- authoring schemas
- publishing/versioning later

### `apps/exams`

Continue owning:

- exam assembly
- sections
- section policies
- exam templates
- packaging

### `apps/attempts`

Continue owning:

- attempt lifecycle
- response capture
- response artifacts
- delivery snapshot

### `apps/results`

Continue owning:

- scoring strategies
- evaluation records
- result normalization
- publication
- family-aware analytics builders

### `apps/reports`

Keep for:

- notifications
- audit-driven reporting
- operational alerts

Do not overload it with core scoring or evaluation responsibilities.

### `common/`

Should own:

- generic media validation helpers
- file upload rules
- reusable response contracts
- registry utilities if shared

---

## Frontend Impact Map

## Existing areas that will expand

### Question bank authoring

Will need:

- item-type-aware editors
- media-first editors
- rubric and evaluation config panels
- preview by delivery mode

### Exam builder

Will need:

- template selection
- section delivery controls
- scoring strategy controls
- family-specific validation warnings

### Student attempt pages

Will need:

- item-type renderer registry
- audio player blocks
- recorder blocks
- essay editor blocks
- media preload states
- stricter section/timer behavior

### Results workspace

Will need:

- family-aware dashboards
- evaluator review queues
- rubric breakdown views
- band/scaled score summaries

### Admin and institute settings

Will need:

- tenant feature flags
- storage/media quotas
- allowed exam families
- branding and plan-gated features

---

## Implementation Sequence

This is the recommended order.

## Phase 0: Hardening before expansion

Deliverables:

- keep current portal stable
- complete rich content work
- fix current CRUD rough edges
- keep tests growing with each new engine

Exit condition:

- current portal stable for regular question-bank + builder use

## Phase 1: Registry foundations

Deliverables:

- item type registry
- scoring strategy registry
- section delivery policy registry

Backend impact:

- new models or option-catalog-backed registry approach
- service-layer dispatch

Frontend impact:

- authoring and builder pages become registry-driven

Exit condition:

- new item and scoring types can be introduced without page rewrites

## Phase 2: Competitive and certification expansion

Deliverables:

- integer/numerical response
- matrix or assertion-reason support
- stronger negative marking
- rank and benchmark analytics
- domain-readiness reporting

Best-fit exam families:

- `NEET`
- `JEE`
- `PO`
- `NDA`
- `AWS`

Exit condition:

- platform handles advanced objective and certification workflows cleanly

## Phase 3: Media-first delivery expansion

Deliverables:

- audio section support
- transcript support
- recording capture support
- response artifacts

Best-fit exam families:

- `PTE`
- `TOEFL`
- `IELTS`

Exit condition:

- listening and speaking tasks can be delivered and stored reliably

## Phase 4: Evaluation and rubric engine

Deliverables:

- essay response support
- speaking evaluation queue
- rubric model
- manual evaluation workflows
- moderation

Best-fit exam families:

- `IELTS`
- `TOEFL`
- `GRE`
- `GMAT`

Exit condition:

- platform supports subjective evaluation at scale

## Phase 5: SaaS maturity

Assessment-family configuration is now established as a working platform layer.

This phase should now be treated as complete for the current architecture target because:

- families exist as first-class data
- programs inherit family profiles
- builder defaults, starter templates, and saved templates react to those profiles
- teacher and institute analytics surfaces now expose the family lens instead of hiding it
- institute onboarding can apply family-aware exam-default templates before local refinement

The next work should move into Phase 6 analytics maturity rather than expanding Phase 5 indefinitely.

Deliverables:

- white-label controls
- feature entitlements
- plan gating
- tenant quotas
- usage metering
- stronger audit and reporting controls

Exit condition:

- platform is commercially safe to scale across many institutes

---

## Suggested Ticket Themes

These are the first execution epics worth opening.

### Epic 1: Item Type Registry

Includes:

- registry schema
- seed data
- authoring dispatch
- delivery dispatch
- validation dispatch

### Epic 2: Scoring Strategy Registry

Includes:

- scorer interface
- standard scorer
- negative-mark scorer
- exam-level scorer selection
- section override support

### Epic 3: Section Delivery Policy

Includes:

- section policy schema
- navigation and timer rules
- media behavior flags
- attempt snapshot integration

### Epic 4: Response Artifact Infrastructure

Includes:

- recording/file artifact model
- upload endpoints
- storage rules
- student UI integration

### Epic 5: Manual Evaluation Workflow

Includes:

- evaluation queue
- rubric models
- evaluator dashboards
- moderation

### Epic 6: Family-Aware Analytics

Includes:

- preset system
- backend summary builders
- UI layout switchers

---

## What To Refactor First In Current Code

Most valuable immediate refactors:

### 1. Extract question type behavior out of forms and serializers

Today too much logic will naturally drift into:

- forms
- page components
- serializer branches

Introduce a registry layer before this grows.

### 2. Move scoring assumptions out of result aggregation

Current result services should not become the dumping ground for every exam-family scoring rule.

### 3. Separate delivery policy from page rendering

The frontend should render based on server-declared policy, not hardcoded section assumptions.

### 4. Add richer metadata snapshots at attempt start

This prevents live data changes from breaking old attempts.

---

## Final Recommendation

### Is the current portal still the right base?

Yes.

### Is the current architecture enough without change?

No.

### What is the correct move?

Keep the portal, keep the modular monolith, and invest in:

- registries
- strategies
- media
- evaluation
- family-aware analytics

That path gives the best balance of:

- speed
- maintainability
- product breadth
- SaaS readiness

---

## Immediate Next Engineering Move

If implementation starts soon, the most important next artifact should be:

`Phase 1 implementation tickets for registry foundations`

That means three execution streams:

1. `item type registry`
2. `scoring strategy registry`
3. `section delivery policy registry`

Those are the architectural pivots that will make everything else easier later.

---

## Execution Status Snapshot

This section tracks the current practical state of the platform so the blueprint can be used for planning as well as architecture.

### Done

The platform already has a strong working base in these areas:

- multi-role portals for admin, institute, teacher, student, and parent flows
- academic setup and institute-scoped tenancy
- question bank with objective questions and comprehension-style grouping support
- bulk upload baseline for question ingestion
- exam builder, section authoring, and question linking
- student attempt lifecycle and result generation flow
- result publication controls
- teacher and institute analytics/workspace improvements
- manual review task model and review event trail
- teacher review queue for grading manual-review answers
- institute review queue for routing, moderation, and recheck workflows
- review-blocked publication safeguards
- reviewer workload, hotspot, and oldest-pending queue analytics
- queue pagination, triage filters, and scope-preserving navigation
- institute-side bulk review-task assignment

### In Progress

These areas are live and usable, but now sit in product-maturity or expansion territory rather than core P0 safety risk:

- comprehension authoring UX and structured rich-text support
- analytics modularization for exam-wise, student-wise, and question-wise drilldowns
- advanced moderation presets and higher-volume review ergonomics
- additional builder policy tuning as real institute usage reveals stricter create or publish rules
- next-phase architecture work for pluggable item types, scoring, and delivery policies

### Next 30 Days

These are the highest-value near-term execution items:

- begin Phase 3 item-type capability engine foundations
- define registry contracts for authoring, attempt, evaluation, review, and analytics surfaces
- convert remaining exam-family assumptions into policy or strategy layers
- add regression coverage around the newly completed readiness, builder-safety, and review-operations baseline

Phase 3 starts from a partially-complete foundation:

- the backend already exposes a basic question-type registry
- current question types already carry response-mode and evaluation-mode metadata
- but important behavior is still hard-coded in serializers, attempt services, and some UI branches

So the immediate implementation path is:

1. harden the registry into a true capability-contract layer
2. move authoring and answer-validation rules behind registry helpers
3. move evaluation dispatch behind registry-driven pathways
4. then add the next item families on top of that stable base

### Next 90 Days

These are the next platform-maturity goals once current workflows are hardened:

- introduce item type registry foundations
- introduce scoring strategy registry foundations
- introduce section delivery policy registry foundations
- make analytics preset-driven instead of one-layout-for-all
- add reusable exam templates and stronger blueprint-driven exam creation
- standardize event, audit, and operational reporting around core assessment workflows

### Future Expansion

These are the strategic growth tracks for exam-family expansion and SaaS readiness:

- certification and competitive-exam scoring variants
- media-first response capture for listening and speaking exams
- rubric-based evaluation and moderation engine
- response artifact infrastructure for audio, documents, transcripts, and future media
- family-aware analytics presets for school, competitive, certification, and language exams
- tenant feature flags, quotas, entitlements, branding, and billing controls
- stronger observability, compliance, and operational governance for multi-institute scale

### Current Overall Readiness

Architecturally, the platform is in a good position to keep expanding from the current codebase.

The key reality is:

- the base portal is worth continuing
- the current architecture is good enough for evolutionary expansion
- the next real leverage comes from registries, strategy layers, and stronger policy-driven engines

That means the platform does not need to be replaced.
It needs disciplined expansion.

---

## P0 Delivery Board

This is the immediate execution layer.

P0 means:

- directly blocks safe institute onboarding
- directly risks bad data, broken results, or manual operational overload
- should be completed before major new exam-family expansion starts

### P0 Objective

Make the current platform operationally safe, content-safe, and review-safe for real institute usage before expanding the engine surface further.

### P0 Streams

#### P0.1 Question Bank Data Integrity

Scope:

- centralized academic mapping validation
- enforce institute, program, subject, and topic consistency
- define and enforce explicit `program = null` rules
- prevent invalid comprehension parent-child linkage
- prevent silent invalid saves through API and bulk upload

Backend focus:

- serializers
- service-layer validation
- import validation pipeline
- regression tests

Frontend focus:

- better row-level import diagnostics
- clearer validation messages in authoring flows

Done when:

- invalid academic combinations cannot be saved from UI or import
- invalid comprehension linkage is rejected consistently
- validation failures explain the exact row and field

Status:

- complete for the current hardening target
- centralized validation added in serializer, model, and service paths
- comprehension parent-child mapping drift is now blocked
- regression coverage exists for the implemented comprehension integrity rules

#### P0.2 Bulk Upload Hardening

Scope:

- better invalid-row reporting
- duplicate detection
- safer preview-to-finalize guarantees
- stronger mandatory-field checks per question type
- comprehension-aware import validation

Backend focus:

- import preview service
- finalization guardrails
- duplicate detection policy

Frontend focus:

- actionable import error list
- row status clarity
- import summary reliability

Done when:

- preview and final save cannot diverge silently
- duplicate or incomplete rows are visible before finalization
- operators can fix imports without guessing

Status:

- complete for the current hardening target
- duplicate detection now runs in preview and finalize
- comprehension passage duplicate and passage-order collisions are surfaced early
- operator-facing import summary UX now calls out duplicate and comprehension conflict rows clearly

#### P0.3 Exam Builder Safety

Scope:

- section-level validation
- question coverage and count warnings
- topic and difficulty imbalance warnings
- marking and section configuration mismatch warnings
- comprehension linking safety in builder flow

Backend focus:

- builder validation helpers
- exam consistency services

Frontend focus:

- visible warnings before publish
- clearer readiness signals in builder

Done when:

- an exam cannot be published with structurally broken composition
- major content-balance risks are surfaced before publication

Status:

- complete for the current P0 hardening target
- builder preview now warns about difficulty fallback, single-topic concentration, inherited marks, and timer-duration mismatches
- severe structural issues now surface as explicit preview blockers before create
- future work is policy tuning, not missing baseline builder safety

#### P0.4 Review Workflow Completion

Scope:

- complete institute review operations beyond single-task routing
- select-all-on-page and bulk review actions
- clearer result publication blocker drilldown
- teacher-side queue speed improvements
- stronger reviewer operational summaries

Backend focus:

- bulk queue endpoints
- workflow guardrails
- audit coverage

Frontend focus:

- batch actions
- queue productivity UX
- blocker visibility

Done when:

- institutes can clear review backlogs without one-by-one operations
- teachers can move through queue work efficiently
- blocked publication states are explicit and drillable

Status:

- complete for the current P0 operational target
- institute bulk assignment, select-all-on-page support, bulk recheck, and bulk moderation are now in place
- teacher queue now supports claim-next, resume-next, and save-and-open-next grading flow
- reviewer analytics, assignment-scope filtering, and publication blocker drilldown are in place
- remaining work is optional workflow polish, not missing core queue capability

#### P0.5 Result Readiness Clarity

Scope:

- publish-readiness explanation layer
- explicit blocker breakdown by exam
- unresolved review visibility
- stronger readiness messaging across exam, builder, and result workspaces

Backend focus:

- readiness summary aggregation
- blocker metadata contracts

Frontend focus:

- readiness cards
- blocker chips
- publish-state explanations

Done when:

- admins and teachers can tell exactly why results are not ready
- publication state is never ambiguous

Status:

- complete for the current P0 operational target
- explicit readiness board now separates blockers, pending dependencies, and ready signals
- the same readiness clarity is now mirrored across results, exam detail, and builder surfaces
- remaining work is presentational refinement, not missing readiness visibility

### P0 Recommended Order

Execution order should be:

1. `P0.1 Question Bank Data Integrity`
2. `P0.2 Bulk Upload Hardening`
3. `P0.3 Exam Builder Safety`
4. `P0.4 Review Workflow Completion`
5. `P0.5 Result Readiness Clarity`

Reason:

- bad content data poisons every later workflow
- import hardening is the highest-volume corruption vector
- builder safety prevents invalid exams from reaching attempts and results
- review completion protects descriptive evaluation at scale
- readiness clarity makes operations reliable once the pipeline is safe

### P0 Exit Criteria

P0 should be treated as complete only when all of these are true:

- question and import validation is centrally enforced
- exam builder catches major structural issues before publish
- review queues are operationally scalable for institutes
- result blockers are explicit, accurate, and actionable
- regression coverage exists for the main authoring, builder, review, and result-risk flows

Current status:

- these criteria are now met for the current hardening target
- remaining work has moved from platform-safety gaps into product-maturity and expansion layers

### Immediate P0 Execution Recommendation

The best next implementation slice is:

`Phase 3 Question-Type Capability Engine`

That is now the highest-leverage next slice because it enables:

- predictable addition of new question families without cross-cutting rewrite risk
- cleaner support for school, competitive, certification, and language exam patterns
- lower long-term maintenance cost as the portal expands into more exam verticals
- a stronger SaaS-ready architecture based on registries and policy-driven engines
