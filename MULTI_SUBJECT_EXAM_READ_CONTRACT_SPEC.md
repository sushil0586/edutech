# Multi-Subject Exam Read Contract Spec

## Purpose

This document fulfills `Ticket A4` from
[MULTI_SUBJECT_EXAM_PHASE_0_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/MULTI_SUBJECT_EXAM_PHASE_0_1_IMPLEMENTATION_TICKETS.md:1).

It defines the exact read contract for exam APIs during the transition from:

- one exam -> one subject

to:

- one exam -> one or many section subjects

This contract is intended for:

- backend serializers
- frontend list/detail surfaces
- search consumers
- student filtering and analytics surfaces

It should be used together with:

- [MULTI_SUBJECT_EXAM_CANONICAL_CONTRACT.md](/Users/ansh/Documents/Eductech/MULTI_SUBJECT_EXAM_CANONICAL_CONTRACT.md:1)
- [MULTI_SUBJECT_EXAM_MIGRATION_AND_COMPATIBILITY_RULES.md](/Users/ansh/Documents/Eductech/MULTI_SUBJECT_EXAM_MIGRATION_AND_COMPATIBILITY_RULES.md:1)

## Design Goals

The read contract must:

1. keep current consumers working
2. let new consumers detect mixed-subject exams explicitly
3. expose section subject composition without forcing every old UI to rewrite immediately
4. avoid lying through one misleading `subject_name`

## Compatibility Strategy

The API should continue exposing legacy fields:

- `subject`
- `subject_name`

But these fields are no longer sufficient by themselves.

The API must add explicit multi-subject fields:

- `primary_subject`
- `primary_subject_name`
- `is_multi_subject`
- `section_subjects`
- `subject_summary`

## Required Exam-Level Fields

Every exam read response should include:

```ts
type ExamReadSubjectContract = {
  subject: string | null;
  subject_name: string | null;
  primary_subject: string | null;
  primary_subject_name: string | null;
  is_multi_subject: boolean;
  section_subjects: ExamSectionSubjectSummary[];
  subject_summary: ExamSubjectSummary;
};
```

## Section Subject Summary Shape

Each distinct subject used by sections should be represented as:

```ts
type ExamSectionSubjectSummary = {
  id: string;
  name: string;
  code: string;
  section_count: number;
  section_ids?: string[];
};
```

### Notes

- `section_count` is required
- `section_ids` is optional and may be omitted from list endpoints if payload size is a concern

## Subject Summary Shape

Use this object for compact read-side display:

```ts
type ExamSubjectSummary = {
  display_label: string;
  short_label: string;
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

## Field Semantics

## `subject`

### Meaning

Compatibility field representing the legacy exam-level subject or chosen primary subject.

### Rules

- single-subject exam:
  - equals the subject used by all sections
- mixed-subject exam with primary subject:
  - equals primary subject
- mixed-subject exam without stable primary subject:
  - `null`

## `subject_name`

### Meaning

Compatibility display field for legacy consumers.

### Rules

- single-subject exam:
  - actual subject name
- mixed-subject exam with primary subject:
  - primary subject name
- mixed-subject exam without stable primary subject:
  - `"Mixed Subjects"`

### Important note

New consumers should not rely on this field as the full truth.

## `primary_subject`

### Meaning

Explicit primary subject identifier for mixed-subject-aware consumers.

### Rules

- may equal `subject`
- may be `null`
- should not be inferred from random section order

## `primary_subject_name`

### Meaning

Display name for the explicit primary subject.

### Rules

- `null` when no meaningful primary subject exists

## `is_multi_subject`

### Meaning

Boolean indicator of whether the exam spans more than one distinct section subject.

### Rules

- `false` when section subjects collapse to one distinct subject
- `true` when two or more distinct section subjects exist

## `section_subjects`

### Meaning

Distinct subject list used across the exam's sections.

### Rules

- list each unique section subject once
- aggregate by subject, not by section row
- stable ordering should be:
  - primary subject first if present
  - otherwise by first section order or subject name

## `subject_summary`

### Meaning

Compact helper object for list cards, headers, and search results.

### Rules

- always present
- should be truthy and renderable even for legacy exams

## Display Label Rules

## `subject_summary.display_label`

Use these rules:

- one subject:
  - `"Mathematics"`
- two or three subjects:
  - `"Physics, Chemistry, Biology"`
- more than three subjects with primary subject:
  - `"Physics +3 subjects"`
- more than three subjects without primary subject:
  - `"Mixed Subjects (+4)"`

## `subject_summary.short_label`

Use these rules:

- one subject:
  - `"Mathematics"`
- mixed-subject with primary subject:
  - `"Physics +2"`
- mixed-subject without primary subject:
  - `"Mixed Subjects"`

This field is useful for compact cards and chips.

## Endpoint Behavior

## List endpoints

List endpoints should include:

- `subject`
- `subject_name`
- `primary_subject`
- `primary_subject_name`
- `is_multi_subject`
- `subject_summary`

List endpoints may include `section_subjects`:

- recommended: yes for internal portals
- optional: trimmed if performance becomes a concern

## Detail endpoints

Detail endpoints should include the full contract:

- all exam-level subject fields
- full `section_subjects`
- section-level subject on each section

## Section read shape

Each section in detail responses should include:

```ts
type ExamSectionReadSubjectContract = {
  id: string;
  name: string;
  subject: string | null;
  subject_name: string | null;
};
```

For new authored exams:

- `subject` must be non-null
- `subject_name` must be non-null

For legacy unmigrated records during transition:

- nullable fields may still exist temporarily

## Example Responses

## Example A: Legacy or new single-subject exam

```json
{
  "subject": "sub_math",
  "subject_name": "Mathematics",
  "primary_subject": "sub_math",
  "primary_subject_name": "Mathematics",
  "is_multi_subject": false,
  "section_subjects": [
    {
      "id": "sub_math",
      "name": "Mathematics",
      "code": "MATH",
      "section_count": 2
    }
  ],
  "subject_summary": {
    "display_label": "Mathematics",
    "short_label": "Mathematics",
    "subject_count": 1,
    "primary_subject_id": "sub_math",
    "primary_subject_name": "Mathematics",
    "subjects": [
      {
        "id": "sub_math",
        "name": "Mathematics",
        "code": "MATH"
      }
    ]
  }
}
```

## Example B: NEET mixed-subject exam with Biology as primary subject

```json
{
  "subject": "sub_bio",
  "subject_name": "Biology",
  "primary_subject": "sub_bio",
  "primary_subject_name": "Biology",
  "is_multi_subject": true,
  "section_subjects": [
    {
      "id": "sub_bio",
      "name": "Biology",
      "code": "BIO",
      "section_count": 1
    },
    {
      "id": "sub_chem",
      "name": "Chemistry",
      "code": "CHEM",
      "section_count": 1
    },
    {
      "id": "sub_phys",
      "name": "Physics",
      "code": "PHY",
      "section_count": 1
    }
  ],
  "subject_summary": {
    "display_label": "Biology, Chemistry, Physics",
    "short_label": "Biology +2",
    "subject_count": 3,
    "primary_subject_id": "sub_bio",
    "primary_subject_name": "Biology",
    "subjects": [
      {
        "id": "sub_bio",
        "name": "Biology",
        "code": "BIO"
      },
      {
        "id": "sub_chem",
        "name": "Chemistry",
        "code": "CHEM"
      },
      {
        "id": "sub_phys",
        "name": "Physics",
        "code": "PHY"
      }
    ]
  }
}
```

## Example C: Mixed-subject exam without meaningful primary subject

```json
{
  "subject": null,
  "subject_name": "Mixed Subjects",
  "primary_subject": null,
  "primary_subject_name": null,
  "is_multi_subject": true,
  "section_subjects": [
    {
      "id": "sub_eng",
      "name": "English",
      "code": "ENG",
      "section_count": 1
    },
    {
      "id": "sub_sci",
      "name": "Science",
      "code": "SCI",
      "section_count": 1
    }
  ],
  "subject_summary": {
    "display_label": "English, Science",
    "short_label": "Mixed Subjects",
    "subject_count": 2,
    "primary_subject_id": null,
    "primary_subject_name": null,
    "subjects": [
      {
        "id": "sub_eng",
        "name": "English",
        "code": "ENG"
      },
      {
        "id": "sub_sci",
        "name": "Science",
        "code": "SCI"
      }
    ]
  }
}
```

## Consumer Guidance

## Legacy consumers

Legacy consumers may continue using:

- `subject_name`

But this should be treated as a temporary compatibility path.

## New consumers

New or updated consumers should prefer:

1. `subject_summary.display_label`
2. `subject_summary.short_label`
3. `is_multi_subject`
4. `section_subjects`

Use `subject_name` only as a fallback.

## Student filtering guidance

Student subject-scoped filtering should not use only:

- `subject`
- `subject_name`

It should prefer:

- `section_subjects`
- or lower-level attempt/result/question subject data where available

## Search guidance

Search indexing should include:

- `subject_summary.display_label`
- all `section_subjects[].name`
- `primary_subject_name`
- legacy `subject_name`

This keeps mixed-subject exams searchable under all participating subjects.

## Serializer Adoption Plan

Adopt this in order:

1. add new read fields to detail serializers
2. add new read fields to list serializers
3. update builder/detail UIs to prefer `subject_summary`
4. update search and student filters
5. gradually reduce dependence on raw `subject_name`

## Acceptance Criteria

- a client can detect mixed-subject exams without inference
- old clients still receive `subject` and `subject_name`
- new clients have enough structure to render truthful list and detail experiences
- serializer behavior is deterministic for single-subject and mixed-subject cases

## Immediate Next Step

With this read contract defined, implementation can proceed to:

1. `B1` section-level subject payload support
2. `B2` validation rules
3. `B3` read serializer implementation
