# Future-Proof Assessment Platform Architecture Map

## Purpose

This document defines how the current portal can evolve into one multi-exam SaaS platform that supports:

- School assessments for `Class 2 to 10`
- Senior secondary assessments for `Class 11 to 12`
- Competitive exams such as `NEET`, `JEE`, `IAS`, `PCS`, `Bank PO`, `NDA`
- Professional certification prep such as `AWS`
- Language proficiency exams such as `PTE`, `TOEFL`, and `IELTS`

The goal is to expand the existing portal, not replace it, while keeping the architecture modular enough for long-term scale.

---

## Executive Decision

### Keep and expand the current portal

Architecturally, the current platform is a valid base.

The current system already has:

- Multi-role access
- Multi-tenant institute separation
- Question bank foundation
- Exam builder foundation
- Attempt and result pipelines
- Teacher and institute workflows
- Analytics groundwork

This means the platform does **not** need a fresh rebuild now.

### But stop treating future features as one-off additions

From this point forward, new features should be built as reusable engines, not page-level custom logic.

That is the key architectural shift required for SaaS-grade growth.

---

## What Can Stay

These parts are directionally correct and should be retained:

- `Frontend/backend split`
- `Role-based web portals`
- `Institute-scoped data ownership`
- `Question bank as core content repository`
- `Exam builder as orchestration layer`
- `Attempt/result lifecycle separation`
- `Current comprehension and rich-content foundation`

These are good foundations for a broader assessment platform.

---

## What Must Be Strengthened

The current architecture is good enough to extend, but not yet strong enough for all target exam families without refactoring.

### 1. Content model must become item-based, not only question-based

Future exams need more than a single prompt plus options.

Examples:

- Reading passage + 5 sub-questions
- Audio clip + timed response
- Essay prompt + rubric
- Speaking prompt + recording slot
- Diagram/image + caption + explanation

Target direction:

- `AssessmentItem`
- `ItemSegment`
- `ItemAttachment`
- `ItemResponseRule`
- `ItemEvaluationRule`

The current `Question` model can be evolved into this over time, rather than replaced immediately.

### 2. Question types must become pluggable

The system should support a registry-driven item type layer.

Core families to plan for:

- `mcq_single`
- `mcq_multiple`
- `true_false`
- `short_answer`
- `integer_response`
- `numerical_response`
- `matrix_match`
- `assertion_reason`
- `comprehension_set`
- `essay`
- `audio_mcq`
- `audio_short_answer`
- `speaking_response`
- `fill_in_blanks`
- `reorder_paragraphs`
- `highlight_text`
- `integrated_task`

Each item type should declare:

- authoring schema
- delivery schema
- response schema
- auto-evaluation capability
- manual-evaluation requirement

### 3. Scoring must be strategy-based

One generic marks model will not be enough.

Different exam families need different scoring approaches:

- school percentage scoring
- competitive negative marking
- scaled score conversion
- band scoring
- rubric scoring
- sectional cutoff logic
- weighted skill scoring

Target direction:

- `ScoringStrategy`
- `SectionScoringStrategy`
- `ResultNormalizationStrategy`

Suggested strategy families:

- `standard_marks`
- `negative_marks`
- `band_score`
- `scaled_score`
- `rubric_score`
- `hybrid_score`

### 4. Delivery must become section-engine driven

Different exams have different delivery rules.

Examples:

- `JEE/NEET`: timed sections, negative marking, optional section logic
- `IELTS Listening`: audio-led sequential flow
- `TOEFL Speaking`: prompt + prep timer + response timer
- `PTE`: mixed task types with media-first flow
- `GMAT/GRE`: sectional or adaptive behaviors later

Target direction:

- `ExamTemplate`
- `SectionTemplate`
- `DeliveryPolicy`
- `NavigationPolicy`
- `TimingPolicy`
- `MediaPolicy`

### 5. Media must become a first-class subsystem

For language and professional exams, media is not secondary.

Need first-class support for:

- images
- diagrams
- audio
- transcript
- video if required
- speaking response recordings
- listening assets

Target direction:

- unify upload pipeline
- central media validation rules
- protected media URLs
- preloading rules by exam section
- media observability and storage quotas

### 6. Evaluation must split into auto, human, and hybrid

School and objective exams rely heavily on auto-evaluation.
Language and writing-heavy exams require manual or rubric-backed evaluation.

Target direction:

- `AutoEvaluatedResponse`
- `ManualEvaluationQueue`
- `RubricEvaluation`
- `ModerationWorkflow`
- `Re-evaluationWorkflow`

This is essential for:

- IELTS writing
- TOEFL writing
- GRE AWA
- GMAT writing/data interpretation
- speaking tasks in PTE/IELTS/TOEFL

### 7. Analytics should be exam-family aware

One generic result page will not be enough.

Need different analytics lenses for:

- school chapter/topic mastery
- competitive rank and speed analysis
- certification domain readiness
- language skill-band progression

Target direction:

- `AnalyticsPreset` by exam family
- skill-level analytics
- section fatigue analytics
- attempt pattern analytics
- evaluator performance analytics

---

## Target Architecture

The portal should evolve into these major modules.

### 1. Content Engine

Owns:

- item authoring
- passages
- attachments
- rich text
- tags
- item type definitions
- publishing and versioning

### 2. Test Assembly Engine

Owns:

- exam templates
- sections
- section/item mapping
- blueprint rules
- randomization rules
- package creation for mocks and practice sets

### 3. Delivery Engine

Owns:

- attempt flow
- section timers
- navigation restrictions
- media preload/lock rules
- device and session enforcement
- speaking/listening UX

### 4. Response Engine

Owns:

- student answer capture
- recording uploads
- autosave
- offline-safe retry logic if introduced later
- task-type-specific payload validation

### 5. Evaluation Engine

Owns:

- auto scoring
- rubric scoring
- manual review queues
- moderation
- finalization rules

### 6. Result Engine

Owns:

- score aggregation
- band/scaled score conversion
- sectional summaries
- pass/fail/cutoff rules
- publication workflow

### 7. Analytics Engine

Owns:

- dashboards
- comparative reports
- weakness mapping
- cohort benchmarks
- exam-family-specific insights

### 8. SaaS Control Layer

Owns:

- tenant configuration
- branding
- permissions
- quotas
- subscription plan gates
- audit logs
- storage and media limits

---

## Recommended Domain Layering

Introduce a layered assessment taxonomy.

### Assessment Family

Examples:

- `school`
- `competitive`
- `certification`
- `language_proficiency`

### Assessment Program

Examples:

- `cbse_foundation`
- `neet_prep`
- `jee_mains`
- `ias_prelims`
- `aws_cloud_practitioner`
- `ielts_academic`

### Exam Template

Examples:

- weekly quiz
- full mock
- sectional test
- listening practice set
- writing evaluation pack

This lets one platform support very different products without splitting the codebase too early.

---

## Suggested Data Evolution

Do not rewrite everything at once.

Instead, evolve gradually:

### Current

- `Question`
- `QuestionOption`
- `QuestionPassage`
- `Exam`
- `ExamQuestion`
- `StudentAnswer`

### Near-term evolution

- keep current tables
- add `item_type` behavior layer
- add richer response schemas
- add evaluation metadata
- add media metadata

### Mid-term evolution

Introduce abstractions such as:

- `AssessmentItem`
- `AssessmentItemVariant`
- `AssessmentSectionPolicy`
- `ResponseArtifact`
- `EvaluationRecord`

This can coexist with existing models during migration.

---

## Exam Family Capability Matrix

### School

Primary needs:

- syllabus mapping
- chapter/topic coverage
- objective + short answer
- teacher review
- student analytics

Current portal fit:

- strong

### Competitive Exams

Primary needs:

- objective formats
- speed/accuracy analysis
- negative marking
- sectional rules
- ranking and benchmarking

Current portal fit:

- good with scoring and delivery upgrades

### Certifications

Primary needs:

- domain/topic mapping
- scenario-based items
- timed mocks
- analytics by objective/domain

Current portal fit:

- good with item-type and analytics upgrades

### Language Proficiency

Primary needs:

- audio
- speaking capture
- essay evaluation
- rubric workflows
- band scoring

Current portal fit:

- possible, but needs the most new architecture

---

## Refactor Priorities Before Massive Expansion

### Priority 1

- Introduce item-type strategy layer
- Introduce scoring strategy layer
- Introduce section delivery policy layer

### Priority 2

- Introduce media subsystem for audio/image/recordings
- Introduce manual evaluation and rubric models
- Expand attempt payloads by response type

### Priority 3

- Add analytics presets by assessment family
- Add publishing/versioning workflow for content
- Add SaaS feature gating and plan-based controls

### Priority 4

- Adaptive testing support if required later
- AI-assisted evaluation support
- Large-scale content operations and moderation tools

---

## What Not To Do

Avoid these mistakes:

- hardcoding each exam type into separate pages and serializers
- creating separate portals for each exam family too early
- mixing delivery logic with scoring logic
- mixing evaluation logic with reporting logic
- letting rich content, audio, and media live as ad hoc add-ons

These are the things that usually make expansion painful later.

---

## Recommended Build Phases

### Phase 1: Solidify the core platform

- stabilize current question bank and exam builder
- unify rich content behavior
- improve attachment/media workflows
- strengthen analytics for current objective exams

### Phase 2: Competitive and certification readiness

- add advanced objective item types
- add section policies
- add scoring strategies
- add rank and benchmark analytics

### Phase 3: Language exam readiness

- add audio-first sections
- add speaking response capture
- add essay evaluation workflow
- add rubric engine
- add band/scaled score reporting

### Phase 4: SaaS maturity

- plan-based entitlements
- white-label features
- quota and storage controls
- stronger audit and compliance tooling

---

## Final Architectural Position

### Short answer

Yes, this portal can support the long-term vision.

### More accurate answer

The platform is a good foundation, but it must now evolve into a modular assessment architecture.

You do not need:

- a new portal
- a full rewrite

You do need:

- disciplined modularization
- strategy-based scoring and delivery
- stronger media and evaluation subsystems
- structured refactoring before broad exam-family expansion

---

## Immediate Recommended Next Step

Before adding more big exam families, implement these three platform changes:

1. `Item type registry`
2. `Scoring strategy registry`
3. `Section delivery policy registry`

Those three decisions will determine whether future expansion stays clean or becomes hard to maintain.

