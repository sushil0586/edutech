# Teacher Report Backend Mapping

## Purpose

This document maps the backend data layer for the first three teacher student-level report families:

1. Teacher Student Results Report
2. Teacher Student Subject Performance Report
3. Teacher Student Topic Mastery Report

It answers:

- which backend models already support these reports
- which existing service functions can likely be reused
- which current APIs are close to the teacher need
- where aggregation or permission gaps still exist

Date:

- Tuesday, July 21, 2026

---

## Scope

This document only covers the first teacher report wave.

It does not yet map:

- wrong questions
- question patterns
- time management
- rank history detail pages
- downloadable report generation

Those should be mapped after the first three teacher student-level reports are designed.

---

## Core Backend Assets Already Present

The backend already contains strong academic result and attempt entities that can support teacher student-level reporting.

### Core models already available

| Model | Role in teacher reporting |
| --- | --- |
| `ExamResult` | Main result ledger for student result rows |
| `StudentTopicPerformance` | Topic-level student weakness or strength evidence |
| `ExamPerformanceSummary` | Exam-level aggregate summary support |
| `StudentExamAttempt` | Attempt state, timing, and submission context |
| `StudentAnswer` | Fine-grained answer evidence for future report phases |
| `Exam` | Exam metadata, source, teacher linkage, visibility policy |
| `StudentProfile` | Student identity and teacher-scope joins |

### Core viewsets already available

| ViewSet | Likely relevance |
| --- | --- |
| `ExamResultViewSet` | Strong candidate base for teacher results reporting |
| `StudentTopicPerformanceViewSet` | Strong candidate base for teacher topic mastery reporting |
| `ExamPerformanceSummaryViewSet` | Support for exam aggregate views |
| `StudentExamAttemptViewSet` | Support for result detail and follow-up context |
| `StudentAnswerReviewTaskViewSet` | Support for future review-linked reporting |

### Core service layer already available

The most important reusable backend logic appears to live in:

- `edutech_backend/apps/results/services.py`
- `edutech_backend/apps/reports/services.py`
- `edutech_backend/apps/exams/services.py`

This is a good sign because the heavy aggregation logic is already centralized instead of being page-specific.

---

## Report 1: Teacher Student Results Report

## Goal

Show teacher-scoped student results as the main first report.

### Primary row

- one student result

### Ideal backend source

Primary model:

- `ExamResult`

Primary likely serializer family:

- `ExamResultSerializer`
- `ExamResultListSerializer`

Primary likely view anchor:

- `ExamResultViewSet`

### Data fields already strongly supported

Based on current backend structures and usage patterns, this report likely already has direct support for:

- exam
- student
- score
- percentage
- rank
- result status
- published state
- review availability
- attempt linkage

### Why this report is a strong reuse candidate

The current student result and teacher result layers already rely on published result objects and review availability logic.

Existing evidence includes:

- `ExamResult.rank`
- `ExamResult.percentage`
- review-availability serializer fields in results serializers
- rank calculation and publication logic in `apps/results/services.py`

### Likely backend gaps

The biggest teacher-specific gap is not raw result data.

The likely gap is teacher-scoped filtering and joins such as:

- only students relevant to the current teacher
- only exams owned or sourced by the current teacher
- class / batch / section scoping in one query grammar

### Backend requirements for first release

Minimum backend output for teacher results report:

- result id
- student id and display name
- exam id, code, title
- subject scope label
- submitted or published date
- final score
- percentage
- rank
- result status
- review available
- source type and teacher ownership

### Recommended backend decision

Reuse the existing result model and result viewset logic.

Prefer:

- add teacher-specific filtering and serializer shaping

Avoid:

- building a parallel result ledger model

### Mapping status

- Raw data availability: Strong
- Teacher-scope filtering: Needs confirmation
- Report payload shaping: Moderate work

---

## Report 2: Teacher Student Subject Performance Report

## Goal

Compare student academic performance by subject for a teacher-controlled population.

### Primary row options

- one student-subject row
- or one class-subject aggregate row

### Ideal backend sources

Primary likely sources:

- `ExamResult`
- result aggregation services in `apps/results/services.py`

Supporting source:

- `StudentTopicPerformance`

### Why this report is likely partially supported already

The results service layer already contains subject aggregation logic.

Evidence from current code patterns strongly suggests existing subject-oriented aggregates such as:

- subject average percentage
- accuracy percentage
- attempted or skipped distributions
- strongest and weakest subject logic

This means the teacher subject performance report probably does not need a brand-new data model.

### What likely exists today

Likely reusable service outputs:

- subject-wise average percentage
- subject-wise accuracy
- subject-wise counts
- source-subject aggregates
- student subject rollups

### Likely backend gaps

This report needs a teacher-facing aggregation mode that can answer:

- subject performance per student within teacher scope
- aggregate subject performance across the selected class or batch

The current student-facing subject summaries may already answer:

- one student across many subjects

But the teacher view must also answer:

- many students inside one teacher scope

That usually means new grouping modes are needed even if the metrics already exist.

### Backend requirements for first release

Minimum payload for teacher subject performance:

- student id and display name
- subject id and subject name
- average percentage
- accuracy percentage
- attempted question count
- skipped question count
- weak topic count
- last activity date
- optional trend label

### Recommended backend decision

Reuse current subject aggregate service logic where possible, but create a teacher-specific subject report service entry point.

Prefer:

- one teacher report service that can switch between
  - `student-subject`
  - `subject-aggregate`

Avoid:

- embedding subject analytics directly into the page layer

### Mapping status

- Raw metrics availability: Moderate to strong
- Teacher aggregate mode: Likely missing
- Serializer/API shaping: Required

---

## Report 3: Teacher Student Topic Mastery Report

## Goal

Show topic weakness or mastery at teacher scope.

### Primary row options

- one topic aggregate row
- one student-topic row

### Ideal backend source

Primary model:

- `StudentTopicPerformance`

Primary likely serializer:

- `StudentTopicPerformanceSerializer`

Primary likely view anchor:

- `StudentTopicPerformanceViewSet`

### Why this report is the clearest backend reuse candidate

The data model already includes a dedicated topic performance table.

That is exactly the type of persistent aggregate usually needed for:

- weak topic reporting
- topic mastery reporting
- class-wide topic gap detection

### What likely exists today

Strong direct support probably already exists for:

- student
- subject
- topic
- percentage
- attempted question volume
- skip behavior
- topic-level performance ranking

### Likely backend gaps

The likely gap is not topic-level data itself.

The likely gap is:

- aggregate topic reporting across teacher scope
- teacher-friendly grouping and sorting
- filters for class, subject, exam family, or student cluster

### Backend requirements for first release

Minimum payload for teacher topic mastery report:

- topic id and topic name
- subject id and subject name
- student id and display name when using student-topic mode
- average percentage
- attempted questions
- skipped questions
- mastery bucket or severity label
- last seen date
- optional student count for aggregate mode

### Recommended backend decision

Reuse `StudentTopicPerformance` as the canonical data source.

Prefer:

- add teacher-scoped aggregate query mode
- keep student-topic and topic-aggregate modes in the same report service

Avoid:

- recalculating topic mastery from raw answers in every request

### Mapping status

- Raw topic evidence: Strong
- Teacher aggregate mode: Likely missing
- API shaping and filter grammar: Required

---

## Existing Service Reuse Signals

The current `apps/results/services.py` file contains strong evidence of already-available logic for:

- result publication
- rank calculation
- average percentage aggregation
- accuracy calculations
- subject aggregation
- topic aggregation
- source aggregation
- weak-subject and weak-topic derivation

This is important because it means the teacher reports should start by wrapping or extending existing services rather than inventing a new reporting math layer.

### Likely best approach

Create teacher-facing report services that:

- call current aggregation logic where possible
- add teacher-scope filters
- return table-shaped payloads for teacher frontend pages

---

## Permission And Scope Considerations

The biggest design-to-implementation risk for teacher reporting is scope control.

The teacher report layer must not accidentally expose:

- other teachers’ students
- institute-wide data outside assignment or source ownership
- unrelated exam results

### Scope dimensions that need explicit enforcement

- teacher-owned exams
- teacher-assigned students
- teacher institute
- selected class or batch
- selected subject where relevant

### Backend recommendation

Do not rely only on frontend filters for teacher scope.

Teacher report endpoints should enforce scope in the backend query layer.

---

## Recommended First API Strategy

### Option A: Extend existing endpoints

Use existing endpoints where possible and add:

- teacher-specific query params
- teacher-scoped queryset behavior
- expanded serializer fields

Best candidate:

- teacher results report

### Option B: Add teacher report endpoints

Create dedicated teacher report endpoints when:

- the grouping logic is different from student behavior
- the output shape is report-first rather than CRUD-first
- the page needs aggregate rows, not model rows

Best candidates:

- teacher subject performance report
- teacher topic mastery report

### Recommended split

- `Teacher Student Results Report`: extend existing result behavior if possible
- `Teacher Student Subject Performance Report`: dedicated teacher report endpoint preferred
- `Teacher Student Topic Mastery Report`: dedicated teacher report endpoint preferred

---

## Backend Gaps Summary

| Report | Raw data | Aggregation support | Teacher scope support | API readiness |
| --- | --- | --- | --- | --- |
| Teacher Student Results Report | Strong | Strong | Needs confirmation | Medium-high |
| Teacher Student Subject Performance Report | Moderate-strong | Partial | Likely missing | Medium |
| Teacher Student Topic Mastery Report | Strong | Partial-strong | Likely missing | Medium |

---

## Recommended Next Steps

1. inspect teacher-facing result and analytics API endpoints in detail
2. confirm which current serializers already expose the required teacher result fields
3. identify whether teacher scope is already enforced in `ExamResultViewSet`
4. design dedicated teacher endpoints for:
   - subject performance
   - topic mastery
5. only after that, begin frontend work on `/teacher/results` and `/teacher/reports/subjects`

---

## Final Direction

For the first teacher report wave:

- results reporting is closest to implementation-ready
- subject performance is likely service-reusable but needs teacher aggregate API design
- topic mastery has the strongest model foundation but still needs teacher report shaping

This means the best build order remains:

1. Teacher Student Results Report
2. Teacher Student Subject Performance Report
3. Teacher Student Topic Mastery Report
