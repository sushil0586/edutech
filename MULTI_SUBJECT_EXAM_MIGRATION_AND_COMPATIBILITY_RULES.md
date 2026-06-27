# Multi-Subject Exam Migration And Compatibility Rules

## Purpose

This document fulfills `Ticket A3` from
[MULTI_SUBJECT_EXAM_PHASE_0_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/MULTI_SUBJECT_EXAM_PHASE_0_1_IMPLEMENTATION_TICKETS.md:1).

It defines how the platform should transition safely from:

- one exam -> one subject

to:

- one exam -> one or many section subjects

without breaking:

- existing exams
- existing read surfaces
- current authoring clients
- student, teacher, and admin workflows

This document should be used together with:

- [MULTI_SUBJECT_EXAM_CANONICAL_CONTRACT.md](/Users/ansh/Documents/Eductech/MULTI_SUBJECT_EXAM_CANONICAL_CONTRACT.md:1)
- [MULTI_SUBJECT_EXAM_SINGULAR_SUBJECT_DEPENDENCY_AUDIT.md](/Users/ansh/Documents/Eductech/MULTI_SUBJECT_EXAM_SINGULAR_SUBJECT_DEPENDENCY_AUDIT.md:1)

## Migration Goals

The migration is successful when:

- all current single-subject exams continue to function
- new multi-subject exams can be authored safely
- legacy UI can still render exam records during the transition
- student subject filtering can evolve without losing current data access

## Compatibility Principles

Follow these principles:

1. preserve existing exam readability before optimizing model purity
2. prefer explicit backfill over implicit runtime guessing
3. preserve legacy fields until read surfaces have moved to the new summary contract
4. never silently merge or rewrite inconsistent historical subject relationships without audit visibility

## Data State Categories

During rollout, every exam will fall into one of these states.

## State A: Legacy single-subject exam with sections

Characteristics:

- exam has one exam-level `subject`
- sections exist
- sections do not yet own explicit subject records in the new contract

### Rule

Backfill the exam subject onto every section.

### Result

- exam remains effectively single-subject
- section subject becomes explicit
- no student-facing behavior changes

## State B: Legacy single-subject exam without sections yet

Characteristics:

- exam has one exam-level `subject`
- no meaningful authored sections yet

### Rule

Preserve exam-level subject as:

- primary subject
- first-section seed when the exam is later opened in builder

### Result

- no forced migration complexity for empty shells
- builder can initialize the first section from the legacy subject

## State C: New single-subject exam after rollout

Characteristics:

- authoring occurs after the new model is introduced
- all sections use the same subject

### Rule

Store:

- section subject on every section
- exam-level subject as compatibility primary subject

### Result

- fully compatible with old read surfaces
- no ambiguity in the new model

## State D: New multi-subject exam after rollout

Characteristics:

- sections use two or more distinct subjects

### Rule

Store:

- subject on every section
- exam-level subject as optional primary subject or compatibility anchor
- derived multi-subject summary fields

### Result

- new UI can render mixed-subject truthfully
- old UI can still fall back to compatibility subject fields until migrated

## State E: Historically inconsistent exam

Characteristics may include:

- exam subject suggests one subject
- linked section questions imply another subject
- topic and question subject relationships do not line up cleanly

### Rule

Do not auto-correct silently.

Instead:

- preserve current data
- mark for audit
- expose a repair recommendation through admin or internal diagnostics later

### Result

- data integrity risk stays visible
- rollout avoids guessing incorrect academic intent

## Section Backfill Rules

## Backfill source

For legacy exams, use:

- `exam.subject`

as the default section subject source.

## Backfill operation

For each legacy section that lacks explicit subject ownership:

- assign the exam-level subject to that section

## Backfill scope

Run this for:

- published exams
- draft exams with existing sections
- archived exams if they are still used in read/report surfaces

## Backfill exclusions

Do not backfill automatically when:

- exam has no subject at all
- subject relationships appear inconsistent with section question records and the inconsistency threshold policy flags it

## Inconsistency Audit Rules

An exam should be flagged for manual review when any of these conditions appear:

- section-linked questions span multiple subjects but the section has no clear subject intent
- exam-level subject conflicts with the dominant subject of section-linked questions
- section topic allocations imply a different subject than the exam-level subject

## Recommended initial handling

For flagged records:

- keep them readable
- mark them as `needs_subject_audit` in internal diagnostics or migration reporting
- avoid auto-reassigning questions to a guessed subject

## Legacy Create And Update Payload Rules

During the compatibility window, old clients may still submit:

- one exam-level `subject`
- sections without explicit `subject`

### Rule for single-subject payloads

If:

- exam-level `subject` is present
- every section lacks explicit `subject`

then normalize by:

- assigning the exam subject to every submitted section

### Rule for mixed payloads

If:

- some sections include subject
- others do not

then:

- treat missing section subject as validation error for newly authored sections
- allow compatibility normalization only for explicitly approved legacy flows

### Rule for conflicting payloads

If:

- section subject is present
- exam-level subject conflicts

then:

- accept section subject as source of truth
- preserve exam-level subject only if it is intentionally used as primary subject
- otherwise require the client to resolve the mismatch clearly

## Legacy Read Serializer Rules

During the first rollout, read serializers must continue returning:

- `subject`
- `subject_name`

for compatibility.

### Compatibility rule for single-subject exams

If all sections use one subject:

- `subject` = that subject
- `subject_name` = that subject name
- `is_multi_subject` = `false`

### Compatibility rule for mixed-subject exams with primary subject

If multiple section subjects exist and one primary subject is defined:

- `subject` = primary subject id
- `subject_name` = primary subject name
- `is_multi_subject` = `true`
- `subject_summary` must disclose the full composition

### Compatibility rule for mixed-subject exams without useful primary subject

If multiple section subjects exist and no stable primary subject is appropriate:

- `subject` = `null`
- `subject_name` = `Mixed Subjects`
- `is_multi_subject` = `true`
- `subject_summary` carries the actual distinct section subjects

This avoids mislabeling a mixed exam as belonging to one random subject.

## Student Visibility Compatibility Rules

Student subject-scoped surfaces are the most sensitive compatibility area.

### Rule

During transition:

- overall views should always include mixed-subject exams
- subject-specific views should include mixed-subject exams if any section matches the selected subject

### Compatibility fallback

If a surface still depends only on legacy `subject_name`, it may temporarily under-show mixed-subject exams.

That is acceptable only during the migration window and should be explicitly tracked as technical debt, not considered final behavior.

## Search And List Compatibility Rules

Until all role surfaces move to `subject_summary`:

- continue exposing `subject_name`
- add `is_multi_subject`
- add `subject_summary.display_label`

List/search UIs should progressively switch to:

- `subject_summary.display_label` first
- `subject_name` as fallback only

## Reporting Compatibility Rules

Reporting should prefer the most granular available subject source:

1. question subject
2. topic subject
3. section subject
4. exam primary subject

This prevents mixed-subject exams from collapsing into one misleading subject bucket where granular data is already available.

## Migration Rollout Sequence

Run migration in this order:

1. add new section subject capability
2. backfill explicit section subject for compatible legacy records
3. introduce read compatibility fields
4. update advanced builder to write section subjects
5. update UI surfaces to prefer `subject_summary`
6. phase down reliance on legacy exam-level `subject`

## Required Migration Outputs

The migration process should produce:

- count of legacy exams successfully backfilled
- count of exams with no sections and deferred section initialization
- count of records flagged for manual subject audit
- count of mixed-subject exams authored after rollout

## Acceptance Criteria

- legacy single-subject exams remain stable in authoring, runtime, and reporting
- new multi-subject exams can coexist with old read surfaces
- inconsistent historical records are visible and not silently misclassified
- serializer fallback behavior is defined before implementation begins

## Final Recommendation

Use the following practical implementation stance:

- normalize old single-subject payloads where safe
- make all new authored sections explicit about subject
- preserve exam-level subject as compatibility metadata
- use `Mixed Subjects` only when no meaningful primary subject exists
- never guess cross-subject intent from inconsistent historical content without audit flags

## Immediate Next Step

With migration rules locked, the next document should define the exact read field contract for:

- `subject`
- `subject_name`
- `primary_subject`
- `subject_summary`
- `section_subjects`
- `is_multi_subject`

That is the remaining `A4` decision layer before backend implementation starts.
