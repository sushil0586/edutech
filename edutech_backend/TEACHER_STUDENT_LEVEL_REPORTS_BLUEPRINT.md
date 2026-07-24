# Teacher Student-Level Reports Blueprint

## Purpose

This document defines the report suite that should exist in the teacher section, using the same academic reporting families already created for students.

The key difference is perspective:

- student section shows `my academic data`
- teacher section should show `student academic data within teacher scope`

This is not a teacher self-performance module first.

This is a teacher-operated student academic reporting module.

Date:

- Tuesday, July 21, 2026

---

## Core Product Principle

Every major student report that exists for the student role should also exist for the teacher role.

But in teacher view, the report must support academic supervision across:

- assigned students
- class or batch
- section
- exam
- subject
- topic
- question

The teacher should be able to start broad and drill down to one student or one question.

---

## Teacher Reporting Objective

The teacher section should answer these questions quickly:

- which students are doing well or poorly?
- which subjects or topics are weak across my class?
- which students are stuck on the same questions?
- where is time management hurting outcomes?
- which practice or intervention should I assign next?
- which students need review, remediation, or follow-up?

This means the teacher report layer should become the academic intervention layer for the teacher.

---

## Teacher Report Family Mapping

The teacher section should mirror the student report families below.

| Student report family | Teacher equivalent | Primary unit in teacher view |
| --- | --- | --- |
| Results Report | Student Results Report For Teacher | One student result / one attempt |
| Subject Performance Report | Student Subject Performance Report For Teacher | One student-subject or one class-subject row |
| Topic Mastery / Weak Areas Report | Student Topic Mastery Report For Teacher | One topic or one student-topic row |
| Practice Recommendation Report | Student Practice Recommendation Report For Teacher | One student recommendation |
| Question Pattern Report | Student Question Pattern Report For Teacher | One student-question pattern or one question bucket |
| Wrong Questions Report | Student Wrong Questions Report For Teacher | One wrong question instance or grouped question row |
| Time Management Report | Student Time Management Report For Teacher | One student attempt pacing row |
| Study Recommendations Report | Student Study Recommendations Report For Teacher | One student recommendation row |
| Rank History Report | Student Rank History Report For Teacher | One result point or one student trend row |
| Downloadable Reports Surface | Teacher Downloadable Student Reports Surface | One export artifact |

---

## Recommended Teacher Report Hierarchy

The teacher reporting hierarchy should work like this:

1. Teacher report dashboard
2. Report list page
3. Row-level modal or drawer
4. Student detail drilldown
5. Exam / topic / question drilldown
6. Follow-up action

The teacher should not be forced to jump pages too early.

Preferred interaction flow:

- report table row
- quick modal or side panel
- drilldown tab
- open related report with carried filters

---

## Required Teacher Filters

All teacher student-level reports should support a shared filter grammar.

### Global teacher filters

- Academic year
- Class / program
- Batch / section
- Exam
- Exam type
- Subject
- Topic
- Student
- Date range
- Result status
- Review availability

### Optional report-specific filters

- Published only
- Attempt status
- Weak only
- Wrong only
- Skipped only
- High-risk only
- Needs intervention only

---

## Required Drilldown Dimensions

Every teacher student-level report should drill down through one or more of these dimensions:

- Student
- Exam
- Subject
- Topic
- Question
- Attempt history
- Review history
- Recommendation history

---

## Teacher Report Definitions

## 1. Student Results Report For Teacher

### Purpose

Show teacher-scoped student results in one place.

### Primary questions answered

- who attempted which exam?
- who passed, failed, or is pending?
- who has review available?
- which exam outcomes need intervention?

### Primary row

- one student result

### Suggested columns

- Student Name
- Class / Batch
- Exam Name
- Subject Scope
- Attempt Date
- Score
- Percentage
- Rank
- Result Status
- Review Status

### Modal or drilldown tabs

- Overview
- Subject Breakdown
- Topic Breakdown
- Attempt History
- Weak Areas
- Recommendations

### Recommended route

- `/teacher/results`

---

## 2. Student Subject Performance Report For Teacher

### Purpose

Compare how students are performing subject by subject.

### Primary row options

- one student-subject row
- or one subject aggregate row for the selected class

### Suggested columns

- Student Name
- Subject
- Average Percentage
- Accuracy
- Attempted Questions
- Skipped Questions
- Trend
- Weak Topic Count

### Drilldown

- student subject history
- recent exams in that subject
- topic breakdown within subject

### Recommended route

- `/teacher/analytics`
- or `/teacher/reports/subjects`

---

## 3. Student Topic Mastery Report For Teacher

### Purpose

Help teachers identify weak topics by student or by class.

### Primary row options

- one topic aggregate row
- or one student-topic row

### Suggested columns

- Topic
- Subject
- Student Count Affected
- Average Percentage
- Attempt Count
- Skip Count
- Mastery Level
- Last Seen

### Drilldown

- students weak in this topic
- exams where this topic appears
- linked remedial practice or worksheet action

### Recommended route

- `/teacher/reports/weak-areas`
- or `/teacher/analytics/topics`

---

## 4. Student Practice Recommendation Report For Teacher

### Purpose

Show which students need which next practice action.

### Primary row

- one student recommendation

### Suggested columns

- Student Name
- Recommended Practice
- Subject
- Topic Focus
- Trigger Reason
- Priority
- Last Attempt
- Suggested Next Action

### Drilldown

- student weak areas
- recent results
- assign practice action

### Recommended route

- `/teacher/reports/practice-recommendations`

---

## 5. Student Question Pattern Report For Teacher

### Purpose

Reveal student answer behavior patterns at question level.

### Primary row options

- one question type bucket
- one question pattern bucket
- one student-pattern row

### Suggested columns

- Student Name
- Pattern Type
- Wrong Count
- Skipped Count
- Accuracy
- Avg Time
- Subject
- Topic

### Drilldown

- wrong question list
- skipped question list
- question-type comparison

### Recommended route

- `/teacher/reports/question-patterns`

---

## 6. Student Wrong Questions Report For Teacher

### Purpose

Show the exact questions students are missing most often.

### Primary row options

- one question row
- one student-question row

### Suggested columns

- Student Name
- Question
- Subject
- Topic
- Exam
- Student Answer
- Correct Answer
- Error Pattern
- Last Seen

### Drilldown

- question details
- other students who missed the same question
- assign remediation

### Recommended route

- `/teacher/reports/wrong-questions`

---

## 7. Student Time Management Report For Teacher

### Purpose

Help the teacher identify students losing marks because of pacing.

### Primary row

- one student attempt pacing row

### Suggested columns

- Student Name
- Exam
- Total Time
- Avg Time Per Question
- Slowest Section
- Slowest Topic
- Skipped Due To Time
- Time Risk Level

### Drilldown

- question pacing evidence
- slowest questions
- section timing pattern

### Recommended route

- `/teacher/reports/time-management`

---

## 8. Student Study Recommendations Report For Teacher

### Purpose

Turn report evidence into actionable study guidance.

### Primary row

- one student recommendation row

### Suggested columns

- Student Name
- Recommendation Type
- Subject
- Topic
- Why Recommended
- Urgency
- Suggested Duration
- Status

### Drilldown

- source evidence from results / weak areas / time issues
- recommended practice or intervention

### Recommended route

- `/teacher/reports/study-recommendations`

---

## 9. Student Rank History Report For Teacher

### Purpose

Track how students are moving over time relative to prior attempts or cohort standing.

### Primary row options

- one result point
- one student trend row

### Suggested columns

- Student Name
- Exam
- Attempt Date
- Score
- Percentage
- Rank
- Percentile
- Trend Change

### Drilldown

- student result timeline
- best vs recent comparison
- subject trend

### Recommended route

- `/teacher/reports/rank-history`

---

## 10. Teacher Downloadable Student Reports Surface

### Purpose

Give teachers a report center for printable or exportable student academic reports.

### Primary row

- one export artifact

### Suggested columns

- Report Name
- Scope
- Student / Class Filter
- Generated On
- Format
- Status
- Download Action

### Recommended route

- `/teacher/reports/downloads`

---

## Recommended Teacher Route Plan

### Existing teacher routes that should anchor report work

- `/teacher/results`
- `/teacher/reviews`
- `/teacher/exams`
- `/teacher/exams/[examId]`
- `/teacher/question-bank`
- `/teacher/question-bank/[questionId]`

### Recommended new teacher reporting routes

- `/teacher/reports`
- `/teacher/reports/subjects`
- `/teacher/reports/weak-areas`
- `/teacher/reports/practice-recommendations`
- `/teacher/reports/question-patterns`
- `/teacher/reports/wrong-questions`
- `/teacher/reports/time-management`
- `/teacher/reports/study-recommendations`
- `/teacher/reports/rank-history`
- `/teacher/reports/downloads`

---

## Teacher Modal / Drawer Contract

Every teacher report row should open a modal or side drawer with:

- student overview
- latest academic status
- subject breakdown
- topic breakdown
- attempt history
- related report links
- intervention action buttons

### Suggested action buttons inside modal

- Open Student Results
- Open Weak Areas
- Open Wrong Questions
- Open Time Management
- Open Review History
- Open Exam Results
- Assign Practice

---

## Recommended Delivery Order

### Phase 1

- Teacher Results Report
- Teacher Subject Performance Report
- Teacher Topic Mastery Report

### Phase 2

- Teacher Wrong Questions Report
- Teacher Question Pattern Report
- Teacher Time Management Report

### Phase 3

- Teacher Practice Recommendation Report
- Teacher Study Recommendations Report
- Teacher Rank History Report
- Teacher Downloadable Reports Surface

### Phase 4

- Playwright workspace coverage
- desktop visual contracts
- mobile visual contracts where appropriate

---

## What Should Happen Next

The next implementation step should be:

1. create a route-by-route teacher reporting phase plan
2. map each report to current backend payloads and missing APIs
3. identify which teacher pages should be reused versus newly added
4. start with teacher results and teacher subject performance first

---

## Final Direction

The teacher section should become a student-performance command center.

That means:

- same report families as student
- broader teacher scope
- stronger filters
- class-to-student drilldown
- direct academic intervention actions

This is the correct base before building teacher-only operational or productivity reports.
