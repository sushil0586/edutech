# Next Implementation Execution Tracker

## Purpose

This document translates the architecture direction into a concrete execution tracker for the next expansion cycle.

It is meant to answer:

- what is already strong enough
- what is still missing before the platform is truly SaaS-ready
- what should be built next
- what order reduces future rework

Related documents:

- [FUTURE_PROOF_ASSESSMENT_PLATFORM_ARCHITECTURE_MAP.md](/Users/ansh/Documents/Eductech/docs/architecture-product/FUTURE_PROOF_ASSESSMENT_PLATFORM_ARCHITECTURE_MAP.md)
- [FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md](/Users/ansh/Documents/Eductech/docs/architecture-product/FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md)
- [NEXT_IMPLEMENTATION_ROADMAP.md](./NEXT_IMPLEMENTATION_ROADMAP.md)
- [PHASE_1_FOUNDATION_HARDENING_IMPLEMENTATION_PLAN.md](./PHASE_1_FOUNDATION_HARDENING_IMPLEMENTATION_PLAN.md)
- [PHASE_2_REVIEWER_WORKFLOW_ENGINE_IMPLEMENTATION_PLAN.md](./PHASE_2_REVIEWER_WORKFLOW_ENGINE_IMPLEMENTATION_PLAN.md)
- [PHASE_4B_RUBRIC_REVIEW_ENGINE_IMPLEMENTATION_PLAN.md](./PHASE_4B_RUBRIC_REVIEW_ENGINE_IMPLEMENTATION_PLAN.md)
- [PHASE_3_FRONTEND_REGISTRY_ADOPTION_PLAN.md](./PHASE_3_FRONTEND_REGISTRY_ADOPTION_PLAN.md)
- [PHASE_6_ANALYTICS_MATURITY_IMPLEMENTATION_PLAN.md](./PHASE_6_ANALYTICS_MATURITY_IMPLEMENTATION_PLAN.md)

---

## Executive Position

The portal is on the right architectural path.

It should be expanded, not replaced.

The current codebase is already good enough to become a multi-exam assessment SaaS if future work follows these rules:

1. keep the modular monolith
2. add registries and policies instead of branching per exam
3. strengthen contracts before expanding surfaces
4. treat content, delivery, scoring, review, analytics, and media as separate engines
5. build for exam families, not individual brand hacks

---

## Current Readiness Snapshot

## Strong enough today

- institute-scoped tenancy
- role-based portals
- question bank foundation
- reusable comprehension-set model
- rich-content authoring baseline
- objective attempt and result lifecycle
- descriptive/manual-review baseline
- analytics workspace foundation

## Not strong enough yet

- manual review is not yet a full queue workflow
- question-type contracts are not yet complete enough for rapid expansion
- media-first exam flows are not yet first-class
- exam-family profiles are not yet configuration-driven
- analytics are not yet equally strong for objective, descriptive, and media-heavy items
- audit and operations tooling is still light for a multi-institute SaaS posture

---

## Readiness by Expansion Goal

| Expansion goal | Current readiness | Main gap |
| --- | --- | --- |
| Class 2 to 10 school assessments | High | better analytics, reviewer workflow |
| Class 11 to 12 and board-prep assessments | High | subjective review depth, section templates |
| NEET, JEE, NDA, PO, PCS style exams | Medium-high | stronger scoring policies, section policies, speed analytics |
| AWS and certification practice | Medium-high | domain analytics, question-quality feedback, profile presets |
| IELTS, TOEFL, PTE | Medium | media engine, speaking/listening delivery, rubric workflows |
| GRE, GMAT style advanced formats | Medium | richer item engine, section logic, scaled scoring |

Interpretation:

- school, coaching, and certification practice can continue on the current base with controlled expansion
- language proficiency and advanced adaptive exam families should be added through phased engine work, not page-level custom builds

---

## Execution Principle

The next implementation cycle should harden the platform in this order:

1. data integrity
2. reviewer operations
3. item-type capability contracts
4. media delivery and response artifacts
5. exam-family configuration
6. advanced analytics
7. SaaS operations and governance

This order matters because every later phase depends on the earlier contracts being stable.

---

## P0 Definition

P0 is the mandatory hardening layer before broad exam-family expansion.

P0 includes only work that does one or more of the following:

- prevents bad content data from entering the system
- prevents invalid exams from being published
- prevents manual-review operations from breaking at institute scale
- prevents ambiguous or unsafe result publication states

### P0 Streams

1. question bank data integrity
2. bulk upload hardening
3. exam builder safety
4. review workflow completion
5. result readiness clarity

### Original Best Starting Point

The most valuable implementation start was:

`question bank data integrity + bulk upload hardening`

Reason:

- these are the earliest corruption points
- they protect every downstream builder, attempt, and result workflow
- they reduce the highest operational support burden first

### Current P0 Status

The P0 hardening wave is now effectively complete for the current safety target.

Completed or effectively complete:

- question bank data integrity
- bulk upload hardening
- exam builder safety with explicit preview blockers
- review workflow completion for the main institute and teacher queue operations
- result readiness clarity across results, exam detail, and builder surfaces

Main remaining P0 gap:

- no critical platform-safety gap remains in the original P0 scope
- only policy tuning and workflow polish remain where real usage suggests refinement

### Updated Best Next Slice

The best next implementation slice is now:

`Phase 3 question-type capability engine`

Reason:

- the original P0 safety baseline is now in place
- the next architecture multiplier is making new item types cheap and predictable to add
- this is the foundation for NEET, JEE, UPSC, banking, certification, and language-exam expansion
- it reduces future rewrite risk by moving the platform toward registry-driven capabilities

---

## Phased Delivery Tracker

## Phase 1: Foundation Hardening

### Goal

Make the current content engine safe enough for high-volume authoring and future question-type growth.

### Includes

- centralized academic mapping validation
- explicit `program = null` policy
- stricter comprehension parent-child validation
- stronger row and field diagnostics for bulk imports
- finalize-preview integrity checks
- broader tests for objective, descriptive, and comprehension authoring flows
- explicit role-wise CRUD verification

### Unlocks

- safe school and certification onboarding
- less content corruption during bulk upload
- confidence before new item types are added

### Exit criteria

- invalid academic combinations never save silently
- import preview returns actionable row-level fixes
- question, passage, and import flows have regression coverage
- teacher and institute role behavior is verified intentionally

### Status

Largely complete for the current hardening target.

What is now true:

- academic mapping validation is centralized across key authoring paths
- comprehension parent-child integrity is guarded
- import preview/finalize divergence risk is reduced
- duplicate and invalid-row reporting is much stronger

What still belongs later:

- broader CRUD audit by role across every edge surface
- deeper long-tail validation for future item families

---

## Phase 2: Reviewer Workflow Engine

### Goal

Turn manual review into a proper operational subsystem.

### Includes

- pending review queue
- reviewer assignment
- review states: pending, in_review, reviewed, recheck_requested, moderated
- score-change history
- reviewer notes and moderation trail
- unresolved review blockers before final publication
- dashboard counts for manual-review load

### Unlocks

- school descriptive answers
- essay evaluation
- IELTS/TOEFL/PTE writing workflows
- moderated scoring for high-stakes institutes

### Exit criteria

- teachers can work from a dedicated queue
- review history is auditable
- results cannot be treated as final when review blockers remain

### Priority

Very high.
This is the biggest platform gap after content integrity.

### Current status

Complete for the current P0 operational target.

What is already done:

- review-task model and event trail
- teacher and institute review queues
- institute assignment-scope filtering
- reviewer workload and queue hotspot visibility
- institute bulk assignment operations
- institute bulk recheck and bulk moderation operations
- institute select-all-on-page queue handling
- teacher claim-next, resume-next, and save-and-open-next flow
- publication blocker drilldown in the results workspace

What still remains:

- optional moderation presets for more advanced institute workflows
- further polish if future descriptive volume reveals new bottlenecks

---

## Phase 3: Question-Type Capability Engine

### Goal

Make adding new item types predictable and low-risk.

### Includes

- capability registry per item type
- authoring schema contract
- response schema contract
- evaluation mode contract
- analytics mode contract
- standardized renderer mapping across question bank, builder, attempt, review, and results

### First recommended types

- `numeric_answer`
- `true_false`
- `fill_in_blanks`
- `essay_manual_review`
- `assertion_reason`
- `matrix_match`

### Current starting point

Already present:

- a backend question-type registry
- response-mode and evaluation-mode definitions
- registry payloads already exposed through question-bank APIs
- working support for `mcq_single`, `mcq_multiple`, `true_false`, `short_answer`, `numeric_answer`, and `essay_manual_review`

Still hard-coded enough to slow expansion:

- serializer rules for accepted answers, numeric tolerance, review guidance, and option behavior
- attempt-service answer handling and evaluation branching
- some frontend rendering and labeling assumptions

### Phase 3 execution order

#### Phase 3.1 Registry contract hardening

- centralize authoring, response, evaluation, and review capability helpers
- refactor serializers and attempt save flows to use registry-driven predicates
- expose richer capability metadata where needed

#### Phase 3.2 Attempt and evaluation decoupling

- move scoring dispatch behind type contracts
- normalize response payload handling by response mode
- isolate manual-review versus auto-score execution paths

#### Phase 3.3 Frontend renderer and authoring registry

- drive editor sections from registry capabilities
- drive attempt rendering from delivery variants
- reduce fixed per-type UI branching

#### Phase 3.4 New type onboarding

- ship `fill_in_blanks`
- ship `assertion_reason`
- ship `matrix_match`

### Active status

Started.
Current implementation focus is `Phase 3.1 Registry contract hardening`.

Progress update:

- `Phase 3.1` is complete for the current foundation target
- `Phase 3.2` backend attempt and evaluation dispatch has been moved toward registry-driven pathways
- `Phase 3.3` frontend registry adoption is now active across teacher authoring and student attempt surfaces
- `Phase 3.4` now includes three delivered registry-native item types:
  - `fill_in_blanks` through authoring, import preview, and attempt scoring
  - `assertion_reason` through structured authoring fields, fixed-option validation, import preview, and student attempt rendering
  - `matrix_match` through structured left/right match columns, import preview, standard option scoring, and student attempt rendering
- `Phase 3.3` now has a dedicated implementation companion and a first shared frontend presentation helper for question-type-specific labels, placeholders, and authoring/delivery hints
- `Phase 3.3` shared presentation rules now also drive teacher question-bank preview states and student response placeholders, reducing one more set of type-specific UI branches
- `Phase 3.3` now includes a shared student prompt renderer so live attempt and post-attempt review screens present passage-linked, structured, and media-backed questions through the same rendering path
- `Phase 3.3` question evidence inside the results workspace now consumes richer structured analysis payloads, letting institute and teacher analytics drill-down reuse the same prompt semantics for passage, matrix, assertion/reason, text response, and media-backed questions
- `Phase 3.3` review-task detail surfaces for both teacher and institute moderation now consume the same structured question payload shape, so manual review queues no longer fall back to plain summary-only prompts

### Unlocks

- school and competitive exam breadth
- structured future support for GRE/GMAT-like patterns
- reduced code duplication when adding item families

### Exit criteria

- a new type can be added without touching many unrelated files
- import, attempt, evaluation, and analytics all follow shared type contracts

### Priority

Very high.
This is the main architecture multiplier.

### Phase 3 closeout status

Phase 3 is now functionally complete for the current onboarding target:

- registry contracts are in place
- attempt and evaluation dispatch are registry-aware
- teacher and student surfaces use shared type capabilities
- `fill_in_blanks`, `assertion_reason`, and `matrix_match` are live as registry-native types

---

## Phase 4: Media-First Assessment Engine

### Goal

Prepare the platform for listening, speaking, and asset-heavy delivery.

### Includes

- unified attachment rules for questions and passages
- secure media URL and access policy
- media validation by type and size
- audio/video-ready student rendering
- preload strategy by section
- response artifact storage contract for student uploads
- transcript support where relevant

### Unlocks

- IELTS listening
- TOEFL listening and speaking
- PTE speaking and listening
- diagram-heavy school and science assessments
- certification questions with reference media

### Exit criteria

- the system can safely deliver timed media prompts
- the student side can render and upload media-backed responses
- media behavior is not ad hoc per page

### Priority

High, but after reviewer and type-engine hardening.

### Current status

Started with the first contract-hardening slice:

- shared attachment/media validation rules now exist for question attachments
- backend attachment uploads now validate file type and size by declared attachment type
- teacher and institute upload actions now apply the same validation before sending files downstream
- question type registry payloads now expose media capability metadata
- backend and frontend now share explicit attachment capability contracts for image, diagram, PDF, audio, and video support
- registry tests now protect media delivery mode, preload strategy, and attachment capability behavior against regressions
- student exam detail and live attempt payloads now expose per-question `media_context`
- student exam and attempt screens now render reusable question-media panels with image, PDF, audio, and video preview support
- `StudentAnswer` now supports `response_artifacts` and `answer_transcript` for future speaking/listening and upload-backed responses
- save-answer validation now protects the response-artifact contract and keeps objective question flows from accepting media-style payloads
- student attempt workspace now has a dedicated response-artifact upload endpoint backed by shared storage
- uploaded response artifacts now return normalized payloads with upload token, checksum, storage path, and file URL for later save-answer binding
- student live attempt forms now support optional transcript capture plus file-backed response uploads for text-response questions
- student response uploads now flow through a dedicated Next.js proxy route with shared client-side validation, live progress feedback, and inline error handling before save-answer submission
- text-response attempt forms now support in-browser audio/video capture for speaking-style answers, with stop-before-save protection and upload-ready recording previews
- uploaded artifacts are now visible in both the active attempt workspace and the student review surface, and later answer saves preserve prior uploads unless the response is cleared
- response-artifact permissions are now registry-driven, so only question types that explicitly allow uploaded/recorded responses expose those controls and accept those payloads
- teacher and institute review-task detail payloads now include transcripts and response artifacts for manual-review workflows
- reviewer detail surfaces now render playback/preview cards for uploaded audio, video, image, and document responses
- teacher and institute review surfaces now also receive question-level review guidance, parsed rubric checklist items, and full prompt context for more consistent media-backed scoring
- essay manual-review questions can now carry rubric criteria in the backend contract, and teacher/institute review forms can submit criterion-level rubric scores that roll up into validated totals
- teacher question authoring now includes a rubric-criteria builder for essay/manual-review types, keeping rubric definition, review guidance, and default marks aligned in one reusable editor flow
- result-workspace student question analysis now surfaces rubric snapshots and can submit rubric-backed manual reviews through the review-task workflow without leaving the analytics screen
- teacher and institute review timelines now surface rubric snapshots per event, so moderation and recheck history remain auditable at the criterion level
- analytics now expose rubric insight at both selected-student and exam-cohort levels, surfacing weak criteria directly inside the results workspace
- moderation history now preserves previous rubric snapshots, and review timelines show criterion-level deltas between initial review and moderated scoring

---

## Phase 5: Assessment Family Profiles

### Goal

Make the platform configurable by exam family instead of creating separate products.

### Includes

- `AssessmentFamily` model or equivalent configuration layer
- allowed item types per family
- scoring defaults per family
- delivery presets per family
- analytics presets per family
- family-aware authoring hints and templates

### Initial profiles

- `school`
- `competitive`
- `certification`
- `language_proficiency`

### Unlocks

- cleaner onboarding of new institutes
- less brand-specific custom logic
- controlled feature exposure by product family

### Exit criteria

- a new program can inherit a family profile
- authoring and exam builder defaults adapt from configuration

### Priority

High.
This is where SaaS-grade extensibility becomes visible.

### Current status

Complete for the current Phase 5 target.

What is already done:

- `AssessmentFamily` model exists with seeded baseline profiles for school, competitive, certification, and language proficiency
- programs can now carry an assessment-family mapping at the data layer
- academic APIs expose family code, label, and full profile metadata with program records
- advanced exam builder reads program-family profiles and adapts experience guidance, timing defaults, passing-mark defaults, and allowed-question-type hints
- preset packs, starter templates, and saved advanced templates now rank family-matching options first and preserve family metadata in builder blueprints
- admin and institute academic-setup screens now allow family selection directly when creating or editing programs
- teacher and institute results workspaces now surface assessment-family-aware analysis guidance, delivery context, and bank-improvement cues from the exam experience profile
- teacher dashboard exam summaries now carry family-aware delivery guidance, and the institute dashboard now shows active assessment-family mix across programs
- institute exam defaults now support family-aware template application so onboarding teams can apply school, competitive, certification, and language-proficiency policy packs before fine-tuning local overrides

Phase 5 closeout interpretation:

- the family layer is now visible across program setup, builder defaults, saved templates, results guidance, teacher dashboard summaries, institute dashboard mix reporting, and institute policy onboarding
- future family-aware analytics depth now belongs to Phase 6 rather than remaining Phase 5 debt

---

## Phase 6: Analytics Maturity

### Goal

Move from dashboard-like reporting to operational and academic decision support.

### Includes

- objective plus subjective score distribution
- reviewer turnaround analytics
- section and skill analytics
- speed, skip, and fatigue analytics
- question quality feedback loops
- topic mastery views by family
- certification domain readiness
- language skill-band progress

### Unlocks

- stronger institute retention
- better teacher interventions
- measurable question-bank quality
- executive reporting for premium SaaS tiers

### Exit criteria

- every major exam family has a meaningful analytics lens
- institutes can act on the results, not just view them

### Priority

Medium-high.
Very important commercially, but it depends on earlier engines being stable.

Implementation companion:

- [PHASE_6_ANALYTICS_MATURITY_IMPLEMENTATION_PLAN.md](./PHASE_6_ANALYTICS_MATURITY_IMPLEMENTATION_PLAN.md)

### Current status

Slice 1 is complete and Slice 2 review-operations analytics is now live on the review workspaces.

What is already done:

- exam performance summaries now expose shared score-distribution buckets
- exam performance summaries now expose shared section-performance rollups
- teacher result summary contracts now include distribution, section analytics, and exam experience profile together
- teacher and institute results workspaces now render the first Phase 6 distribution and section-lens views from that shared backend contract
- teacher insight summaries and teacher dashboard surfaces now reuse that same contract for distribution and section-pressure visibility
- institute dashboard summary now reuses that same contract for recent exam analytics, aggregate score bands, and weak-section watchlists
- review queue summaries now expose turnaround, aging, blocked-exam, and recheck-pressure analytics
- institute and teacher review workspaces now surface backlog aging, reviewer load, and exam hotspot analytics from that shared review summary
- review queue summaries now also expose 24-hour throughput trend and exam release-risk rollups
- institute and teacher review workspaces now surface queue trend direction and release-risk visibility
- exam performance summaries now expose release-risk metadata for publication workflows
- teacher and institute results workspaces now surface release-risk visibility directly in the guided publish flow
- results workspace exam lists now support release-risk filtering, grouping, card badging, and risk-first sorting
- review queue summaries now expose multi-window history across 24h, 3d, and 7d windows
- institute and teacher review workspaces now surface short, medium, and weekly queue pressure side by side
- question analysis now exposes quality signals, revision priority, wrong/skip rates, and editorial notes per question
- results analysis now surfaces revision candidates, urgent question fixes, skip-risk totals, and quality-aware risk cards
- question analysis now also exposes distractor-level quality signals, revision reasons, and top revision-question summaries
- teacher and institute results workspaces now surface distractor quality boards, per-question distractor evidence, and bank-improvement queues
- teacher and institute results workspaces now also render family-specific deep-dive lanes for school, competitive, certification, and language exam interpretation
- results overview now surfaces a cross-exam family portfolio lane so teams can compare risk and performance by assessment family across their scope

What remains inside Phase 6:

- expand the shared lens and distribution layer across more analytics surfaces
- deepen review-operations analytics with richer historical comparisons and broader result-risk actions
- deepen family-specific analytics beyond the current results workspace first-pass interpretation layer

---

## Phase 7: SaaS Governance and Operations

### Goal

Strengthen the product so many institutes can run safely on one platform.

### Includes

- audit trails for bulk actions and review actions
- feature flags by tenant or assessment family
- usage and storage quotas
- background job visibility
- export/report governance
- institute onboarding templates
- error observability and operational dashboards
- archival and retention strategy

### Unlocks

- cleaner enterprise onboarding
- safer multi-tenant operations
- easier support and debugging
- premium packaging later

### Exit criteria

- operational actions are traceable
- the team can safely support multiple active institutes at once

### Priority

High for productization, even if not always visible to end users.

---

## Phase 8: Advanced Assessment Modes

### Goal

Prepare for higher-complexity exam behavior once the platform core is stable.

### Includes

- scaled score normalization
- rubric scoring engine
- sectional cutoff logic
- hybrid scoring
- adaptive or semi-adaptive section behaviors
- speaking recording evaluation hooks
- external evaluator workflows if needed

### Unlocks

- GMAT/GRE style future paths
- advanced language assessments
- high-stakes professional testing workflows

### Exit criteria

- advanced behaviors are implemented as policies, not scattered conditions

### Priority

Later.
Do not rush this before Phases 1 to 7 are stable.

---

## Recommended Delivery Sequence

## Now

1. finish Phase 1 foundation hardening
2. start Phase 2 reviewer workflow
3. finish the question-type capability contract for current and near-term types

## Next

1. build Phase 4 media-first support
2. add Phase 5 assessment family profiles
3. grow analytics alongside those contracts

## Later

1. SaaS operations hardening
2. advanced scoring and adaptive behaviors

---

## Practical Product Advice

## For school and coaching use cases

The current portal can already be expanded confidently.
The biggest gains will come from:

- reviewer workflow
- section templates
- speed and mastery analytics

## For certification prep

The current portal is also a good fit.
The next value areas are:

- domain analytics
- better import tooling
- profile-driven defaults

## For IELTS, TOEFL, and PTE

Do not create another platform.
Extend this one, but only through engine work:

- media delivery
- response artifact upload
- rubric review
- skill-aware analytics

## For GRE and GMAT style growth

The current base can still work, but only if:

- question-type capability contracts are completed
- scoring and section policy layers are introduced

---

## Risks to Avoid

Do not do these:

- adding new exam types through one-off page logic
- mixing manual review rules into result pages directly
- hardcoding brand-specific scoring in serializers
- creating duplicate authoring pages per exam family
- allowing imports to keep widening without schema discipline
- starting a microservice split before the domain contracts are mature

---

## Definition of Architectural Success

The architecture should be considered truly future-ready when:

1. new item types can be added mostly through registry and renderer contracts
2. new exam families can be onboarded mostly through configuration
3. objective, descriptive, and media-heavy assessments all use the same platform core
4. institute operations remain auditable and safe under scale
5. analytics can explain performance at exam, section, skill, student, and question levels

---

## Immediate Recommended Next Build

If one implementation stream should be taken next, it should be:

`Phase 2 reviewer workflow engine`

Reason:

- it closes the biggest operational gap
- it is required for descriptive and language-style assessments
- it improves school, board-prep, and essay-heavy workflows immediately
- it strengthens the platform without forcing a disruptive schema rewrite

After that, the strongest parallel stream is:

`Phase 3 question-type capability engine`

That combination gives the platform the best base for expansion into:

- NEET/JEE style breadth
- certification depth
- IELTS/PTE/TOEFL style future flows
