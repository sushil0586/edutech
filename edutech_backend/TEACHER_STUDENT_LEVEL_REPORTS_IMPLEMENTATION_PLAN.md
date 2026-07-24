# Teacher Student-Level Reports Implementation Plan

## Scope

This document defines the teacher reporting module as a student-level academic reporting system inside the teacher section.

The operating principle is:

- the teacher does not start with teacher self-performance
- the teacher starts with student academic evidence within teacher scope
- reports should be table-first
- every row should support modal or drawer drill-down
- every drill-down should preserve teacher scope and student context

Date:

- Tuesday, July 21, 2026

---

## Current Delivery Status

This section tracks what has already been completed for the teacher student-level reporting initiative before UI and API implementation starts.

### Completed so far

| Phase | Deliverable | Status | Notes |
| --- | --- | --- | --- |
| Phase 0 | Teacher report family blueprint | Completed | Defined which student academic reports must be mirrored in teacher scope |
| Phase 0 | Teacher route audit and reuse mapping | Completed | Identified which current teacher routes can be reused and which new `/teacher/reports/*` routes should be created |
| Phase 0 | Teacher backend mapping for first report wave | Completed | Mapped backend readiness for results, subject performance, and topic mastery |

### Completed document set

| Document | Role |
| --- | --- |
| `TEACHER_STUDENT_LEVEL_REPORTS_BLUEPRINT.md` | Defines the full teacher student-level report family |
| `TEACHER_REPORT_ROUTE_AUDIT_AND_MAPPING.md` | Maps report families to current and new teacher routes |
| `TEACHER_REPORT_BACKEND_MAPPING.md` | Maps backend models, services, and likely API reuse for the first three teacher reports |

### What is not implemented yet

- no teacher student report UI pages have been built yet
- no dedicated teacher report APIs have been added yet
- no teacher-specific report serializers or service wrappers have been added yet
- no teacher Playwright coverage exists yet for the new report family

### Immediate build starting point

The first implementation wave should begin with:

1. `Teacher Student Results Report`
2. `Teacher Student Subject Performance Report`
3. `Teacher Student Topic Mastery Report`

---

## Product Goal

The teacher reporting module should become the academic intervention layer for the teacher.

It should help the teacher:

1. identify which students need attention
2. understand where performance is breaking down
3. move from report evidence to intervention action quickly

This means every report should support:

- scanning
- filtering
- drill-down
- continuity across related reports
- action handoff to exam, review, question, or practice workflow

---

## What Already Exists

The teacher section already has strong operational surfaces that can anchor the report layer.

### Existing teacher academic routes

| Route | Current role |
| --- | --- |
| `/teacher/dashboard` | Teacher overview shell |
| `/teacher/results` | Teacher result operations anchor |
| `/teacher/reviews` | Review queue and result follow-up anchor |
| `/teacher/exams` | Exam management and reporting anchor |
| `/teacher/exams/[examId]` | Exam detail and performance anchor |
| `/teacher/exams/[examId]/builder` | Exam setup and assignment anchor |
| `/teacher/question-bank` | Question library and question evidence anchor |
| `/teacher/question-bank/[questionId]` | Question detail anchor |

### What this means for implementation

The first teacher reporting release should not start by building everything from zero.

It should:

- reuse `/teacher/results` as the first report anchor
- reuse `/teacher/dashboard` and `/teacher/exams/[examId]` for top-level summary blocks
- add teacher reporting routes only where dedicated report behavior is needed

---

## Teacher Report Architecture

### Release UX pattern

Each teacher report page should contain:

1. report header
2. compact KPI strip
3. filter bar
4. main table
5. row click modal or side drawer
6. links to related reports
7. relevant intervention actions

### Row interaction pattern

Each row should support:

- open details
- open related report
- open student results or review
- open exam context
- assign or recommend next action where relevant

### Common teacher modal tabs

- `Overview`
- `Subject Breakdown`
- `Topic Breakdown`
- `Attempt History`
- `Weak Areas`
- `Recommendations`

---

## Shared Teacher Filter Contract

All teacher student-level reports should support a common filter system.

### Shared filters

- Academic year
- Program / class
- Batch / section
- Student
- Exam
- Exam type
- Subject
- Topic
- Date range
- Result status
- Review availability

### Shared UX rules

- filter state must persist between related reports where possible
- reset must fully clear teacher report filters
- filters and action buttons must stay visually aligned on dense pages

---

## Teacher Report Set

The first teacher release should mirror the student report families in priority order.

| Priority | Report | Purpose | Primary row |
| --- | --- | --- | --- |
| P1 | Teacher Student Results Report | Show teacher-scoped student result history | One student result |
| P1 | Teacher Student Subject Performance Report | Show student performance by subject | One student-subject row |
| P1 | Teacher Student Topic Mastery Report | Show weak and strong topics | One topic or student-topic row |
| P2 | Teacher Student Wrong Questions Report | Show which questions students miss | One question or student-question row |
| P2 | Teacher Student Question Pattern Report | Show pattern-level answer behavior | One grouped pattern row |
| P2 | Teacher Student Time Management Report | Show pacing and time loss | One student attempt row |
| P3 | Teacher Student Practice Recommendation Report | Show suggested next practice by student | One recommendation |
| P3 | Teacher Student Study Recommendations Report | Convert evidence into intervention guidance | One recommendation |
| P3 | Teacher Student Rank History Report | Show longitudinal movement | One result point |
| P3 | Teacher Downloadable Student Reports Surface | Export teacher-scoped academic reports | One export artifact |

---

## Phase 1: Teacher Results Report

### Objective

Turn `/teacher/results` into the first-class teacher student-results report.

### Core questions answered

- which students attempted which exams?
- which results are published, pending, pass, or fail?
- which results have answer review available?
- which results need teacher follow-up?

### Primary row

- one student result

### Minimum columns

- Student Name
- Exam Name
- Subject Scope
- Attempt Date
- Score
- Percentage
- Rank
- Result Status
- Review Status

### Required filters

- Exam
- Student
- Subject
- Result status
- Published status
- Date range

### Required row drilldown

- student overview
- subject breakdown
- topic breakdown
- attempt history
- weak areas
- recommendations

### Suggested related actions

- Open review queue
- Open student weak areas
- Open exam detail

### Primary routes

- `/teacher/results`

### Status

- Planned

---

## Phase 2: Teacher Subject Performance Report

### Objective

Create a subject-level teacher report for student academic comparison.

### Core questions answered

- which students are weak in which subject?
- which subject is falling across the class?
- where are skips and low accuracy concentrated?

### Primary row options

- one student-subject row
- one aggregate subject row for current class scope

### Minimum columns

- Student Name
- Subject
- Average Percentage
- Accuracy
- Attempted Questions
- Skipped Questions
- Weak Topic Count
- Trend

### Required filters

- Class / batch
- Student
- Subject
- Source exam type
- Date range

### Required drilldown

- subject attempt history
- subject topic table
- recent results in this subject
- wrong-question density inside subject

### Recommended routes

- `/teacher/analytics`
- or `/teacher/reports/subjects`

### Status

- Planned

### Status

- Planned

---

## Phase 3: Teacher Topic Mastery Report

### Objective

Create the teacher weak-topics and topic-mastery report layer.

### Core questions answered

- which topics are weak across the class?
- which students share the same weak topics?
- where should remediation start?

### Primary row options

- one topic aggregate row
- one student-topic row

### Minimum columns

- Topic
- Subject
- Student Count Affected
- Average Percentage
- Attempt Count
- Skip Count
- Mastery Level
- Last Seen

### Required filters

- Class / batch
- Student
- Subject
- Topic family
- Weak only
- Date range

### Required drilldown

- weak students for this topic
- exams containing this topic
- question evidence for topic
- recommended remedial practice

### Recommended routes

- `/teacher/reports/weak-areas`
- or `/teacher/analytics/topics`

### Status

- Planned

---

## Phase 4: Teacher Wrong Questions And Question Pattern Reports

### Objective

Expose mistake-level and pattern-level academic evidence for teacher intervention.

### Included reports

- Teacher Student Wrong Questions Report
- Teacher Student Question Pattern Report

### Core questions answered

- which exact questions are missed most often?
- which students are repeating the same mistake pattern?
- are issues topic-driven, concept-driven, or pacing-driven?

### Recommended routes

- `/teacher/reports/wrong-questions`
- `/teacher/reports/question-patterns`

### Status

- Planned

---

## Phase 5: Teacher Time Management Report

### Objective

Show where student pacing is damaging outcomes.

### Core questions answered

- who is too slow?
- who is leaving marks because of time loss?
- which section or topic is consuming too much time?

### Recommended route

- `/teacher/reports/time-management`

### Status

- Planned

---

## Phase 6: Teacher Recommendation Reports

### Objective

Turn teacher-scoped student evidence into next-action reports.

### Included reports

- Teacher Student Practice Recommendation Report
- Teacher Student Study Recommendations Report

### Core questions answered

- what should the teacher assign next?
- which students need immediate intervention?
- what is the most useful next academic action?

### Recommended routes

- `/teacher/reports/practice-recommendations`
- `/teacher/reports/study-recommendations`

### Status

- Planned

---

## Phase 7: Teacher Rank History And Downloads

### Objective

Complete the teacher student-report suite with longitudinal and export surfaces.

### Included reports

- Teacher Student Rank History Report
- Teacher Downloadable Student Reports Surface

### Recommended routes

- `/teacher/reports/rank-history`
- `/teacher/reports/downloads`

### Status

- Planned

---

## Phase 8: Teacher UI/UX Visual Review

### Objective

Review the dense teacher operator pages and report pages in browser before and during implementation.

### Primary visual focus pages

- `/teacher/question-bank`
- `/teacher/question-bank/[questionId]`
- `/teacher/exams/[examId]`
- `/teacher/exams/[examId]/builder`
- `/teacher/results`
- `/teacher/reviews`
- teacher report routes added in earlier phases

### UX checks

- button alignment
- filter row alignment
- long-text truncation with ellipses
- consistent KPI rhythm
- modal or drawer spacing
- dense table readability

### Status

- Planned

---

## Phase 9: Teacher Playwright Workspace Coverage

### Objective

Add truth-focused Playwright workflow coverage for teacher student-level report behavior.

### Expected coverage families

- teacher results workspace
- teacher subject report workspace
- teacher weak areas report workspace
- teacher wrong questions workspace
- teacher time management workspace
- teacher recommendations workspace
- teacher rank history workspace
- teacher downloads workspace

### Status

- Planned

---

## Phase 10: Teacher Desktop Visual Contracts

### Objective

Add small, high-signal screenshot contracts for dense teacher pages and new teacher reports.

### Expected visual zones

- filter cards
- KPI strips
- first report table row or card
- first queue card
- dense hero regions

### Status

- Planned

---

## Phase 11: Teacher Mobile Visual Contracts

### Objective

Protect mobile readability for teacher pages that are expected to be usable on mobile.

### Candidate pages

- `/teacher/results`
- `/teacher/reviews`
- `/teacher/question-bank`
- teacher report routes with dense evidence layouts

### Status

- Planned

---

## Phase 12: Teacher Documentation And Gap Audit

### Objective

Create the teacher equivalents of the student reporting and coverage audit documents.

### Expected documents

- teacher report master blueprint
- teacher reporting phase tracker
- teacher academic E2E coverage audit
- teacher remaining gaps audit

### Status

- Planned

---

## Recommended Build Order

### First build wave

1. Teacher Results Report
2. Teacher Subject Performance Report
3. Teacher Topic Mastery Report

### Second build wave

4. Teacher Wrong Questions Report
5. Teacher Question Pattern Report
6. Teacher Time Management Report

### Third build wave

7. Teacher Practice Recommendation Report
8. Teacher Study Recommendations Report
9. Teacher Rank History Report
10. Teacher Downloadable Reports Surface

### Fourth wave

11. Playwright workspace coverage
12. Desktop visual contracts
13. Mobile visual contracts
14. Documentation and gap audit

---

## What We Should Do Next

The next practical implementation step should be:

1. create the teacher route audit and report-to-route map
2. identify which teacher backend payloads already exist
3. define the first report build target as `/teacher/results`
4. start Phase 1 with teacher student results reporting

---

## Final Direction

The teacher section should become a student-performance command center.

That means:

- same report families as the student section
- broader filters
- class-to-student drilldown
- evidence-driven intervention
- release-grade visual and Playwright protection

This implementation plan is the execution base for that work.
