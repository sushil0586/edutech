# Multi-Subject Exam Singular-Subject Dependency Audit

## Purpose

This document fulfills `Ticket A1` from
[MULTI_SUBJECT_EXAM_PHASE_0_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/MULTI_SUBJECT_EXAM_PHASE_0_1_IMPLEMENTATION_TICKETS.md:1).

It inventories the main places where the platform currently assumes:

- one exam -> one subject

and maps each dependency to:

- the current assumption
- the target multi-subject behavior
- migration risk
- the implementation lane

## Summary

The single-subject assumption is not limited to exam creation.
It currently appears across:

- guided and advanced authoring
- API payloads and serializers
- admin and teacher list/detail views
- student subject filters, results, and analytics
- workspace search and reporting summaries

The most important conclusion is:

- the authoring model can be changed first
- but read surfaces and analytics must get a compatibility layer before full rollout

## Dependency Inventory

| Surface | Current singular-subject assumption | Target multi-subject behavior | Migration risk | Lane |
| --- | --- | --- | --- | --- |
| [CreateExamWizard state](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/create-exam-wizard.tsx:346) | Wizard stores one `selectedSubjectValue` for the whole exam. | Wizard should use subject only as optional seed or route mixed-subject authoring into section configuration. | Medium | Guided authoring |
| [CreateExamWizard subject field](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/create-exam-wizard.tsx:797) | The create form posts one `subject` field at exam level. | Subject must be section-owned, with optional exam-level compatibility/default. | High | Guided authoring + API |
| [CreateExamWizard copy](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/create-exam-wizard.tsx:946) | Copy suggests separate exams by subject inside a program. | Copy should explain when one exam can span multiple section subjects. | Low | UX content |
| [Institute create action](/Users/ansh/Documents/Eductech/edutech_web/src/app/(institute)/institute/exams/new/page.tsx:47) | Server action builds one `subject` value into create payload. | Create action must support section-subject payloads or default-only subject behavior. | High | Backend contract |
| [Admin create action](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/new/page.tsx:100) | Admin create flow also sends one exam subject. | Same compatibility and section-aware contract needed as institute flow. | High | Backend contract |
| [AdvancedExamBuilder selected subject state](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/advanced-exam-builder.tsx:1224) | Builder owns one `selectedSubject` for the entire draft. | Builder should support section-level subject selection with optional default seed. | High | Advanced builder |
| [AdvancedExamBuilder topic loading](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/advanced-exam-builder.tsx:1568) | Topics are fetched through one selected exam subject. | Topics must resolve per section subject. | High | Advanced builder + API |
| [AdvancedExamBuilder title/code defaults](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/advanced-exam-builder.tsx:1658) | Title and code generation derive from one selected subject record. | Identity defaults must handle mixed-subject exams without overfitting to one subject. | Medium | Advanced builder |
| [AdvancedExamBuilder preview summary](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/advanced-exam-builder.tsx:4735) | Preview emphasizes one selected subject as the exam subject. | Preview should display section subject composition or subject summary. | Medium | Advanced builder |
| [Teacher builder API types](/Users/ansh/Documents/Eductech/edutech_web/src/lib/api/teacher-builder.ts:78) | Core types expose singular exam `subject` and expect singular filtering. | Types need section subject ownership and compatibility fields. | High | Shared API types |
| [AdvancedExamSectionBlueprintSerializer](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:470) | Section blueprint currently models section composition without explicit subject ownership in the audited contract. | Section blueprint should carry one required subject per section. | High | Serializer contract |
| [ExamReadSerializer](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:924) | Read serializer exposes `subject_name` from `exam.subject.name`. | Read serializer should expose section subject detail plus compatibility subject summary. | High | Read API |
| [ExamListSerializer](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:1011) | List serializer exposes one `subject_name` per exam. | List serializer should distinguish single-subject and mixed-subject exams safely. | High | Read API |
| [Exam policy serializer usage](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:976) | Economy/policy read paths also expose one `subject_name`. | Policy surfaces need compatibility display rules for mixed-subject exams. | Medium | Read API + economy |
| [Admin exams grouping](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/page.tsx:123) | Admin exam groups use `exam.subject_name` as one bucket label. | Grouping should use primary subject, subject summary, or mixed-subject bucket behavior. | Medium | Admin UI |
| [Teacher exam detail hero](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/exams/[examId]/page.tsx:266) | Teacher exam detail hero shows one `subject_name` as exam identity metadata. | Detail header should show primary subject or multi-subject summary. | Medium | Teacher UI |
| [Admin exam builder page](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/[examId]/builder/page.tsx:120) | Builder edit/update path still posts one exam-level subject. | Edit flows must support section subject updates. | High | Builder edit flow |
| [Workspace live search: student](/Users/ansh/Documents/Eductech/edutech_web/src/lib/workspace/live-search.ts:67) | Search descriptions and keywords assume one `subject_name` per exam. | Search should use subject summary or section subject rollup. | Medium | Search |
| [Workspace live search: teacher/admin](/Users/ansh/Documents/Eductech/edutech_web/src/lib/workspace/live-search.ts:161) | Teacher/admin search also formats exams with one subject label. | Same subject-summary compatibility rule needed across roles. | Medium | Search |
| [Student subject context filters](/Users/ansh/Documents/Eductech/edutech_web/src/lib/student/subject-context.ts:375) | Student exam filtering assumes each exam belongs to one `subject_name`. | Student filtering needs a rule for mixed-subject exams: include under each matching section subject or only under primary subject. | High | Student filters |
| [Student metadata subject filters](/Users/ansh/Documents/Eductech/edutech_web/src/lib/student/subject-context.ts:451) | Metadata filters read one `subject_name` from records. | Metadata must support subject summary or section subject metadata. | Medium | Student filters |
| [Student analytics aggregation](/Users/ansh/Documents/Eductech/edutech_web/src/lib/student/analytics-derivations.ts:166) | Subject aggregation uses one `item.subject_name` per record bucket. | Mixed-subject analytics should aggregate by section/question subject, not by one exam label alone. | High | Student analytics |
| [Student practice recommendations](/Users/ansh/Documents/Eductech/edutech_web/src/lib/student/practice.ts:83) | Practice matching filters exams by one `exam.subject_name`. | Practice should match against section subjects or practice-lane subject metadata. | High | Student practice |
| [Student results NEET lane copy](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/results/page.tsx:485) | Family-specific detection checks `exam.subject_name` as one family signal. | Family detection for mixed-subject exams should not depend on one exam subject label. | Medium | Student results UX |
| [Student subject switcher + layout](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/layout.tsx:76) | Student workspace subject selection expects exam and result records to align to one subject. | Mixed-subject records need a clear visibility rule under subject-scoped views. | High | Student shell |
| [Results workspace tables](/Users/ansh/Documents/Eductech/edutech_web/src/features/results-workspace/page.tsx:4390) | Results workspace rows display one `subject_name` for result lines. | Result views should show section/subject breakdown or compatibility label for mixed-subject exams. | Medium | Results workspace |
| [Admin reports subject filters](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/reports/page.tsx:138) | Subject filters and weak-topic reporting assume singular subject grouping from result records. | Reporting should remain topic/section subject based and not rely on one exam label. | Medium | Reporting |
| [Attempt serializer question metadata](/Users/ansh/Documents/Eductech/edutech_backend/apps/attempts/serializers/__init__.py:1053) | Attempt payloads already expose question-level `subject_name`, which is more granular than exam-level subject. | This is a useful compatibility anchor for student/runtime analytics and should be preserved. | Low positive dependency | Attempt/runtime |

## Main Risk Themes

## 1. Authoring Risk

The biggest hard dependency is in the advanced builder.
It currently assumes:

- one selected subject
- one topic pool
- one subject-derived identity seed

This must be refactored before the new authoring model is real.

## 2. Read Contract Risk

`ExamReadSerializer` and `ExamListSerializer` still present one exam subject as the main truth.
Without a compatibility layer:

- admin and teacher lists become misleading
- search results become misleading
- student result and exam cards may be inconsistent

## 3. Student Filter Risk

Student subject filtering today assumes one exam belongs to one subject.
This becomes ambiguous for mixed-subject exams.

The team must explicitly decide whether a mixed-subject exam:

- appears in every matching subject view
- appears only in overall view
- appears under one primary subject plus explicit mixed-subject labeling

## 4. Analytics Risk

Student analytics can likely be adapted safely because many lower-level records already carry topic and question subject.
However, any exam-level subject summaries that depend on one `subject_name` need redesign.

## Recommended Priorities

Start in this order:

1. backend contract for section subject ownership
2. advanced builder refactor
3. read serializer compatibility layer
4. student subject filtering rule
5. analytics and results truthfulness cleanup

## Recommendation For Ticket A2

Based on this audit, the safest contract choice is:

- keep exam-level subject temporarily as optional `primary subject` or compatibility field
- make section subject the real source of truth
- add subject-summary fields to read APIs before removing dependence on legacy `subject_name`

This gives the platform a stable transition path without forcing every UI surface to be rewritten at once.
