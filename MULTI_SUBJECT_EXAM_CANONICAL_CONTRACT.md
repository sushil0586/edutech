# Multi-Subject Exam Canonical Contract

## Purpose

This document fulfills `Ticket A2` from
[MULTI_SUBJECT_EXAM_PHASE_0_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/MULTI_SUBJECT_EXAM_PHASE_0_1_IMPLEMENTATION_TICKETS.md:1).

It locks the canonical product and implementation contract for evolving the current model from:

- one exam -> one subject

to:

- one exam -> one or many subjects
- one section -> exactly one subject

This note is the decision source for backend, frontend, QA, and migration work.

## Final Product Contract

## Rule 1: Exam can span multiple subjects

An exam may contain:

- one subject across all sections
- multiple subjects across different sections

The exam is no longer defined as inherently single-subject.

## Rule 2: Each section must have exactly one subject

Every section must own exactly one subject.

That subject is the source of truth for:

- section topic selection
- section question linking
- section-level reporting
- student-facing section identity

## Rule 3: Questions must match the section subject

Questions linked into a section must belong to the same subject as that section.

No cross-subject override is allowed in the first rollout.

This keeps:

- authoring simpler
- validation stricter
- analytics more trustworthy

## Rule 4: Exam-level subject becomes compatibility-only

The existing exam-level `subject` should remain during transition, but it is no longer the authoring source of truth.

Its temporary role is:

- compatibility for existing APIs and UI
- optional primary display subject
- optional default seed for the first section or for quick one-subject authoring

It should not decide section topic pools once section subjects exist.

## Canonical Data Ownership

### Source of truth hierarchy

Use this order:

1. `section.subject`
2. derived exam subject summary
3. legacy exam-level `subject`

That means:

- builder logic should rely on `section.subject`
- reporting should prefer section or question subject where available
- exam-level subject should be treated as fallback metadata only

## Exam-level subject decision

### Decision

Keep exam-level `subject` temporarily, but redefine it as:

- `primary subject` in product meaning
- compatibility field in implementation meaning

### Why

This is the safest migration path because many current surfaces still expect:

- `subject`
- `subject_name`
- one exam card -> one subject label

Removing it immediately would force a risky simultaneous rewrite across admin, teacher, student, analytics, and search surfaces.

### Expected future direction

Longer term, the platform may:

- rename this field to `primary_subject`
- or keep `subject` as a compatibility alias only

That rename is not required in the first rollout.

## Section Subject Contract

Every section must include:

- `subject`
- `subject_name` on read

Every section may also include:

- section title
- instructions
- scoring settings
- question or topic allocations

Validation rule:

- section subject is required on all new authored sections

Compatibility rule:

- legacy sections may be backfilled from exam-level subject during migration

## Read Contract Decisions

## Legacy fields

The read API should continue exposing:

- `subject`
- `subject_name`

in the first rollout for compatibility.

## New fields

Add explicit multi-subject read fields:

- `primary_subject`
- `primary_subject_name`
- `subject_summary`
- `section_subjects`
- `is_multi_subject`

### Recommended behavior

- `primary_subject`:
  - equal to exam-level compatibility subject when present
- `primary_subject_name`:
  - display name for that primary subject
- `is_multi_subject`:
  - `true` when more than one distinct section subject is present
- `section_subjects`:
  - distinct list of section subjects used in the exam
- `subject_summary`:
  - compact display helper for list and search surfaces

### Subject summary shape

Recommended shape:

```ts
type ExamSubjectSummary = {
  display_label: string;
  subject_count: number;
  primary_subject_id: string | null;
  primary_subject_name: string | null;
  subjects: Array<{
    id: string;
    name: string;
    code: string;
  }>;
};
```

### Display rules

- single-subject exam:
  - `subject_name = Mathematics`
  - `subject_summary.display_label = Mathematics`
- mixed-subject exam with primary subject:
  - `subject_name = Science`
  - `subject_summary.display_label = Science +2`
- mixed-subject exam without useful primary subject:
  - `subject_name = Mixed Subjects`
  - `subject_summary.display_label = Physics, Chemistry, Biology`

## Student Subject Visibility Decision

This is the most important UX decision outside authoring.

### Decision

In student subject-scoped views, a mixed-subject exam should appear in every matching subject context.

Example:

- a NEET exam with Physics, Chemistry, Biology sections should appear in:
  - overall
  - Physics
  - Chemistry
  - Biology

### Why

From the student point of view, the exam genuinely contributes to performance in each of those subjects.
Showing it only under one primary subject would hide relevant attempts and results in the other subject views.

### Implementation implication

Student filtering logic cannot rely only on `exam.subject_name`.
It must use:

- section subject summary
- or lower-level result, attempt, topic, or question subject metadata

## Search And List Surface Decision

### Decision

Admin, teacher, institute, and student list/search surfaces should keep one compact subject line, but it must be derived from `subject_summary`, not blindly from one `subject_name`.

### Display rules

- single-subject:
  - `Mathematics`
- mixed-subject with 2-3 subjects:
  - `Physics, Chemistry, Biology`
- mixed-subject with many sections or long names:
  - `Physics +2 subjects`

This keeps cards and search results compact while staying truthful.

## Authoring Decision

### Guided wizard

The wizard may still ask for a subject early only as:

- first-section seed
- quick-create default
- optional primary subject

It must not imply that one exam can only have one subject.

### Advanced builder

The advanced builder becomes the first fully supported multi-subject authoring surface.

Builder rules:

- each section must choose a subject
- topic pools are section-scoped
- defaults for School, NEET, and JEE may scaffold multiple section subjects automatically

## Validation Decision

Enforce these rules for new authored exams:

- every section has one subject
- every linked topic belongs to the section subject
- every linked question belongs to the section subject

Do not allow:

- section without subject
- mixed-subject question pool inside one section
- silent auto-correction of invalid authoring payloads

## Migration Decision

For existing exams:

- if exam has one exam-level subject and sections have no explicit subject, backfill that subject to all sections
- if exam has no sections yet, preserve exam subject as the default seed
- if historical data is inconsistent, flag it for audit rather than guessing cross-subject intent

## Family Implications

### School

Recommended structure:

- one exam can span Math, Science, English, or other subjects by section

### NEET

Recommended structure:

- Physics
- Chemistry
- Biology

### JEE

Recommended structure:

- Physics
- Chemistry
- Mathematics

These families should be used to validate the contract during implementation.

## Explicit Non-Decisions For This Phase

This contract does not yet decide:

- whether advanced analytics should weight mixed-subject exams differently
- whether teacher assignment rules should become subject-summary aware
- whether all legacy UI should immediately switch from `subject_name` to `subject_summary`

Those decisions can be phased after the backend compatibility layer and advanced builder are stable.

## Final Decision Summary

Lock these as final for implementation:

1. exam may span multiple subjects
2. each section must have exactly one subject
3. section subject is the source of truth
4. question subject must match section subject
5. exam-level subject remains temporarily as compatibility or primary display field
6. read APIs must add explicit multi-subject summary fields
7. mixed-subject exams should appear in every matching student subject view
8. advanced builder is the first full multi-subject authoring surface

## Immediate Next Step

With this contract locked, the next implementation work should move to:

1. `A3` compatibility and migration rules
2. `A4` read serializer field specification
3. `B1` section-level subject payload support
