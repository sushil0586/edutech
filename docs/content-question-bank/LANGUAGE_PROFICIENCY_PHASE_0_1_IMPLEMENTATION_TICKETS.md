# Language Proficiency Phase 0 And Phase 1 Implementation Tickets

## Scope

This note tracks the next exam lane after:

- NEET
- JEE
- GRE
- AWS certification

The current focus is the shared `language_proficiency` lane represented today by:

- IELTS Academic
- PTE Academic

## What Is Now Done

### Phase 0 Alignment

- frontend exam-family metadata now includes `language_proficiency`
- preset-pack family resolution now treats IELTS/PTE as first-class family-owned packs
- shared family id resolution now recognizes:
  - IELTS
  - PTE
  - TOEFL
  - language / study abroad language

### Phase 1 Builder Hardening

- `ielts_academic` now has structured recommendations and builder defaults
- `pte_academic` now has structured recommendations and builder defaults
- admin builder now consumes those packs through the standard structured preset flow instead of special-case hardcoding
- admin Playwright validation now proves the packs seed the builder correctly
- institute builder handoff validation now includes IELTS and PTE

### Phase 1 Scope And Contract Hardening

- demo institute seeding now creates a `language_proficiency` lane:
  - program: `Demo IELTS Track`
  - subject: `IELTS Academic Skills`
  - student: `demo-language-student`
  - exam: `DM-LANG-EXAM-01`
- teacher family registry validation now expects `language_proficiency`
- teacher authoring contract coverage now includes language-family UI and API checks
- institute authoring contract coverage now includes language-family UI and API checks

## Current Honest Status

Moderate-to-moderate-high confidence for metadata, seeded scope, builder setup, and baseline runtime release flow.

What is proven:

- metadata is explicit
- preset packs are structured
- admin builder handoff works
- institute builder handoff includes IELTS and PTE
- demo academic scope now exposes a seeded language-family path
- teacher and institute authoring contracts include the language lane
- teacher and institute release happy-path specs now include IELTS runtime publication flow
- student family experience detail coverage now includes the language lane
- teacher builder handoff for IELTS and PTE passes locally
- institute builder handoff including IELTS and PTE passes locally
- teacher mutable IELTS release flow passes locally
- institute mutable IELTS release flow passes locally
- teacher mutable PTE release flow passes locally
- institute mutable PTE release flow passes locally
- student language-family experience detail passes locally
- teacher and institute published results workspace shows language-family analytics framing locally
- learner-facing language summaries now avoid default speaking-capture promises and describe the lane as structured language simulation with rubric-guided responses
- student attempt copy now frames transcripts and audio/video uploads as optional configured artifacts, not default language-exam speaking support
- backend attempt detail, save-answer, and artifact-upload APIs now filter language-family audio/video transcript support unless the question explicitly opts in through `response_artifact_policy`

What is not yet proven:

- learner runtime for listening / speaking / transcript-heavy behavior
- richer results, review, and analytics fit for mature band-style language reporting beyond the baseline language lens

## Next Tickets

## Ticket L1: Seed language-family academic scope

### Objective

Expose one reliable demo program and subject path that carries `language_proficiency` in teacher and institute scopes.

### Why

The packs now exist, but demo institute scope needs a seeded academic path so contract and runtime tests can bind to real data.

### Acceptance criteria

- teacher scope can select a language-family program directly
- institute scope can select a language-family program directly
- builder family guidance renders from academic scope, not only preset-pack copy

### Status

Implemented.

## Ticket L2: Teacher and institute builder handoff coverage

### Objective

Mirror the admin builder validation for teacher and institute scopes.

### Acceptance criteria

- IELTS and PTE packs seed builder defaults under institute scope
- IELTS and PTE packs seed builder defaults under teacher scope

### Status

Implemented.

What is done:

- institute scope coverage is now included in the existing family handoff spec
- teacher scope now has dedicated IELTS and PTE builder handoff coverage

## Ticket L3: Language-family authoring contracts

### Objective

Confirm allowed question types and scoring hints for `language_proficiency`.

### Acceptance criteria

- editor surfaces family-safe question types
- negative-marking guidance stays disabled
- manual-review / writing-safe paths remain visible where intended

### Status

Implemented for teacher and institute coverage.

## Ticket L4: Runtime honesty check

### Objective

Decide what the lane truly supports now vs later.

### Decision table to lock

- IELTS:
  - reading/listening/writing simulation only now?
  - speaking later?
- PTE:
  - prompt-guided reading/listening/writing only now?
  - audio capture later?

### Acceptance criteria

- no language pack implies unsupported speaking/audio capture behavior
- learner copy stays honest about what this lane currently simulates

### Status

Implemented for student runtime contract enforcement.

## Runtime Coverage Added

- [teacher-family-release-happy-path.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/teacher-family-release-happy-path.mutable.spec.ts:1)
- [institute-family-release-happy-path.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/institute-family-release-happy-path.mutable.spec.ts:1)
- [student-family-experience-detail.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/student-family-experience-detail.spec.ts:1)

These now register language-lane coverage for:

- teacher release and publication workflow
- institute release and publication workflow
- learner-facing family experience panel

## Local Execution Results

Executed successfully on June 26, 2026:

- `student-family-experience-detail.spec.ts` for `language_proficiency`
- `teacher-language-family-preset-builder-handoff.spec.ts`
- `institute-family-preset-builder-handoff.spec.ts`
- `teacher-family-release-happy-path.mutable.spec.ts --grep "ielts_academic"`
- `institute-family-release-happy-path.mutable.spec.ts --grep "ielts_academic"`
- `teacher-family-release-happy-path.mutable.spec.ts --grep "pte_academic"`
- `institute-family-release-happy-path.mutable.spec.ts --grep "pte_academic"`
- updated `student-family-experience-detail.spec.ts` with language honesty assertions
- targeted Django attempt workspace contract tests for language-family response artifact filtering

## Validation Added

Current validation entrypoint:

- [admin-language-family-preset-builder-handoff.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-language-family-preset-builder-handoff.spec.ts:1)
- [institute-family-preset-builder-handoff.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/institute-family-preset-builder-handoff.spec.ts:1)
- [teacher-family-authoring-contracts.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/teacher-family-authoring-contracts.mutable.spec.ts:1)
- [institute-family-authoring-contracts.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/institute-family-authoring-contracts.mutable.spec.ts:1)

This currently proves:

- IELTS builder defaults are structured and applied
- PTE builder defaults are structured and applied
- the language lane no longer depends on one-off builder code paths
- institute pack handoff includes the language lane
- teacher and institute authoring contracts enforce language-safe question types
