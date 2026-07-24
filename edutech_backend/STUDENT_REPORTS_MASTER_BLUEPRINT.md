# Student Reports Master Blueprint

## Purpose

This document defines the student reporting module as a product-ready reporting suite.

It is meant to bridge:

- customer reporting expectations
- current database design
- current backend payloads
- current frontend implementation
- future phase-wise delivery

This is the primary blueprint for the student section only.

Date:

- July 18, 2026

---

## What The Customer Is Expecting

The customer expectation is not limited to isolated analytics pages.

They are expecting a complete student reporting experience with:

- performance dashboards
- exam-level reports
- subject-level reports
- chapter or topic-level reports
- question-level reports
- time management analysis
- rank and percentile history
- improvement tracking
- study recommendations
- downloadable reports

The expected reporting style is:

- management-ready
- printable/exportable
- filterable
- easy to scan
- role-specific

For the student role, this means the reporting experience should help a learner answer:

- how am I doing overall?
- what happened in my recent tests?
- which subjects and topics are weak?
- which questions or patterns are costing marks?
- how is my time usage affecting outcomes?
- how am I improving over time?
- what should I do next?

---

## Student Reporting Product Goal

The student reporting module should become the academic decision layer for the learner.

It should do three things well:

1. summarize performance clearly
2. identify weakness precisely
3. recommend the next learning action

This means the reports are not only historical.

They must also support:

- drill-down
- continuity across reports
- practice follow-up
- review follow-up
- eventual report export

---

## Student Report Inventory

The customer-facing student reporting suite should include the following reports.

| Priority | Report | Purpose | Primary Unit |
| --- | --- | --- | --- |
| P1 | Overall Performance Dashboard | Student-level summary of academic state | One student |
| P1 | Exam Summary Report | Exam-by-exam result history | One result |
| P1 | Subject-wise Performance Report | Subject-level standing | One subject |
| P1 | Wrong Questions Report | Mistake-focused recovery report | One question |
| P1 | Improvement Trend Report | Improvement over time | Time bucket / recent results |
| P2 | Question-wise Analysis | Full question evidence and drill-down | One question |
| P2 | Chapter-wise Performance Report | Topic or chapter mastery | One topic |
| P2 | Time Management Report | Time usage and pacing behavior | One exam / question bucket |
| P2 | Rank & Percentile History | Relative performance trajectory | One result point |
| P3 | AI Study Recommendations | Suggested next actions | One recommendation |
| P3 | Downloadable Reports | Export/report center | One downloadable artifact |

Note:

- in the current product, `chapter-wise` is effectively the same family as `topic mastery`
- phase 1 should use topic-level reporting as the academic equivalent of chapter performance

---

## Current Student Reporting Assets Already Available

The current product already contains a strong base for the student reporting module.

### Existing student report pages

| Route | Current role |
| --- | --- |
| `/app/results` | Exam Summary Report anchor |
| `/app/analytics` | Subject-wise Performance anchor |
| `/app/weak-areas` | Topic / chapter mastery anchor |
| `/app/practice` | Practice Recommendation anchor |
| `/app/analytics/questions` | Question Pattern / Question-wise Analysis anchor |
| `/app/analytics/timeline` | Improvement Trend anchor |
| `/app/analytics/actions` | Recommendation / action center anchor |
| `/app/analytics/subjects/[subject]` | Subject deep-dive |
| `/app/analytics/topics/[topic]` | Topic deep-dive |
| `/app/analytics/question-types/[questionType]` | Format deep-dive |

### Existing protected workflow layer

The student academic reporting surfaces already have strong Playwright coverage in the current repo.

Reference:

- `edutech_backend/STUDENT_ACADEMIC_E2E_COVERAGE_AUDIT.md`

This means the blueprint should focus on:

- report completeness
- customer alignment
- visual/functional gaps
- backend data gaps
- export readiness

not basic route creation.

---

## Student Report Architecture

Every student report should follow a consistent contract.

### Base page structure

1. report header
2. compact KPI strip
3. filter bar
4. main report table
5. row click modal or drill panel
6. related report links
7. optional export actions

### Drill-down contract

The standard flow should be:

- summary report
- row click modal
- deeper report
- practice or review follow-up

### Report output modes

The long-term module should support:

- interactive web report
- downloadable PDF
- downloadable spreadsheet
- parent-shareable summary for selected student reports

Phase 1 does not need to ship all export modes immediately, but the report contracts should be designed with export in mind.

---

## Report Definitions

## 1. Overall Performance Dashboard

### Purpose

This is the top student summary screen.

It should answer:

- what is my current academic state?
- what changed recently?
- what should I focus on first?

### Primary UI

- KPI strip
- recent trend chart
- current subject highlights
- recent result summary
- recommendation block

### Suggested KPI cards

- Tests Attended
- Average Score
- Highest Score
- Percentile
- Accuracy
- Skipped Rate

### Existing data sources

- `StudentInsightSummary`
- `StudentResult`
- `StudentTopicPerformance`
- `StudentAvailableExam`

### Primary backend dependencies

- `StudentProfile`
- `StudentExamAttempt`
- `ExamResult`
- `StudentTopicPerformance`

### Current implementation status

- partially available through `/app/analytics`
- partially available through dashboard summary
- not yet formalized as a dedicated customer-facing “Overall Performance Dashboard” report

### Phase recommendation

- Phase 1

---

## 2. Exam Summary Report

### Purpose

Exam-by-exam academic history.

### Questions it answers

- which exams did I take?
- what score did I get?
- which results are pending?
- what should I review or practice next?

### Main row unit

- one result / one exam attempt outcome

### Core columns

- Exam Name
- Subject Scope
- Source
- Attempt or Publish Date
- Score
- Percentage
- Rank
- Status
- Review
- Next Action

### Existing frontend anchor

- `/app/results`

### Existing data sources

- `StudentResult`
- `StudentAttemptSummary`
- `StudentAttemptReview`

### Backend dependencies

- `StudentExamAttempt`
- `ExamResult`
- `StudentAnswer`
- `StudentAnswerReviewTask`

### Current implementation status

- implemented
- protected
- aligned to the table-first model

### Phase recommendation

- Phase 1

---

## 3. Subject-wise Performance Report

### Purpose

Subject-level academic standing for the student.

### Questions it answers

- which subject is strongest?
- which subject is weakest?
- where should I intervene first?

### Main row unit

- one subject

### Core columns

- Subject
- Average Percentage
- Trend
- Attempted Questions
- Skipped Questions
- Weak Topics
- Source Focus
- Current State

### Existing frontend anchor

- `/app/analytics`

### Existing data sources

- `StudentInsightSummary.strongest_subjects`
- `StudentInsightSummary.weakest_subjects`
- `StudentQuestionAnalytics`
- `StudentTopicPerformance`

### Backend dependencies

- `Question`
- `StudentAnswer`
- `ExamResult`
- `StudentTopicPerformance`

### Current implementation status

- implemented
- protected
- subject deep-dive already exists

### Phase recommendation

- Phase 1

---

## 4. Chapter-wise Performance Report

### Purpose

Topic or chapter-level mastery and weakness.

### Note

The current platform uses topic-level academic entities. For the first release, chapter-wise reporting should be implemented through topic mastery unless a separate chapter entity is introduced.

### Questions it answers

- which chapters are weak?
- which chapters are improving?
- which chapter needs immediate revision?

### Main row unit

- one topic or chapter-equivalent topic

### Core columns

- Topic / Chapter
- Subject
- Mastery Level
- Percentage
- Attempted
- Skipped
- Trend
- Evidence
- Next Action

### Existing frontend anchor

- `/app/weak-areas`

### Existing data sources

- `StudentTopicPerformance`
- `StudentQuestionAnalytics`
- `StudentInsightSummary.weak_topics`

### Backend dependencies

- `Question.topic`
- `StudentAnswer`
- `StudentTopicPerformance`

### Current implementation status

- implemented as Topic Mastery Report
- customer-facing language may need optional “chapter” terminology

### Phase recommendation

- Phase 1

---

## 5. Question-wise Analysis

### Purpose

Detailed question evidence for recovery and review.

### Questions it answers

- which exact questions caused loss?
- what answer did I give?
- what was correct?
- what pattern is repeating?

### Main row unit

- one question

### Core columns

- Question
- Subject
- Topic
- Type
- Difficulty
- Result
- Time
- Peer Signal

### Existing frontend anchor

- `/app/analytics/questions`

### Existing data sources

- `StudentQuestionAnalytics`

### Backend dependencies

- `StudentAnswer`
- `Question`
- `QuestionOption`
- `StudentAnswerSelectedOption`
- `StudentExamAttempt`

### Current implementation status

- implemented
- now formalized as Question Pattern Report
- deeper question evidence panel already exists

### Phase recommendation

- Phase 2

---

## 6. Wrong Questions Report

### Purpose

A learner-facing mistake recovery report.

### Questions it answers

- which wrong questions should I revisit first?
- which subjects and topics are causing repeated mistakes?

### Main row unit

- one wrong question

### Core columns

- Question
- Subject
- Topic
- Mistake Type
- Correct Answer
- Your Answer
- Last Seen
- Suggested Fix

### Existing data sources

- `StudentQuestionAnalytics`
- result/review payloads

### Backend dependencies

- `StudentAnswer`
- `Question`
- `QuestionOption`
- `StudentAnswerSelectedOption`

### Current implementation status

- partially represented inside question analytics and action center
- not yet isolated as its own dedicated first-class report screen

### Phase recommendation

- Phase 1 for product definition
- Phase 2 for dedicated screen if required

---

## 7. Time Management Report

### Purpose

Pacing and time-usage analysis.

### Questions it answers

- where am I spending too much time?
- which question types slow me down?
- is time management affecting score?

### Main row unit

- exam attempt summary or grouped question bucket

### Core columns or widgets

- Total Time
- Time per Question
- Time Taken
- Time Left
- Slowest Questions
- Time Distribution by bucket

### Existing data sources

- `StudentQuestionAnalytics.your_time_spent_seconds`
- `StudentAttemptSummary`
- `StudentAttemptReview`
- `StudentResult.time_taken_seconds`

### Backend dependencies

- `StudentExamAttempt`
- `StudentAnswer`
- `ExamResult`

### Current implementation status

- partial
- time fields exist
- no dedicated student time report yet

### Phase recommendation

- Phase 2

---

## 8. Rank & Percentile History

### Purpose

Relative performance tracking over time.

### Questions it answers

- is my rank improving?
- is my percentile stable?
- am I improving even when raw marks fluctuate?

### Main row unit

- one published result point

### Core widgets

- current rank
- best percentile
- average percentile
- trend chart

### Existing data sources

- `StudentResult.rank`
- `StudentResult.percentile`
- `StudentInsightSummary.recent_exams`

### Backend dependencies

- `ExamResult`
- `StudentExamAttempt`

### Current implementation status

- partially represented in result history and comparison
- no dedicated student-first rank history report yet

### Phase recommendation

- Phase 2

---

## 9. Improvement Trend Report

### Purpose

Improvement over time using recent results and question evidence.

### Questions it answers

- am I improving overall?
- did a recent dip come from one subject or source?
- is the trend positive enough?

### Main row unit

- timeline point or recent result

### Existing frontend anchor

- `/app/analytics/timeline`

### Existing data sources

- `StudentInsightSummary.improvement_trend`
- `StudentResult`
- `StudentQuestionAnalytics`

### Backend dependencies

- `ExamResult`
- `StudentAnswer`
- `StudentTopicPerformance`

### Current implementation status

- implemented
- protected
- now hardened to render even when scoped question analytics partially fail

### Phase recommendation

- Phase 1

---

## 10. AI Study Recommendations

### Purpose

Suggest the next best action for the student.

### Questions it answers

- what should I study now?
- which topic should I fix first?
- which practice set should I take next?

### Main row unit

- one recommendation

### Existing frontend anchors

- `/app/practice`
- `/app/analytics/actions`

### Existing data sources

- `StudentInsightSummary.weak_topics`
- `StudentInsightSummary.weak_question_types`
- `StudentAvailableExam`
- practice recommendation logic

### Backend dependencies

- `StudentTopicPerformance`
- `StudentAnswer`
- `StudentAvailableExam`
- `Exam`

### Current implementation status

- recommendation surfaces exist
- action center exists
- not yet packaged in the exact customer-facing “AI recommendation dashboard” format

### Phase recommendation

- Phase 3

---

## 11. Downloadable Reports

### Purpose

Allow the student or school to export/share report artifacts.

### Supported outputs desired

- PDF
- spreadsheet
- possibly guardian-shareable summary

### Candidate downloadable report types

- Overall Performance Report
- Subject Report
- Topic Report
- Practice Report
- Rank History

### Existing data sources

- all current student report payloads

### Backend dependencies

- report composition layer
- template rendering layer
- export service

### Current implementation status

- not productized yet

### Phase recommendation

- Phase 3

---

## Data Model Mapping

The student reporting module depends primarily on the following backend entities.

### Core runtime and result chain

- `StudentExamAttempt`
- `StudentAnswer`
- `StudentAnswerSelectedOption`
- `StudentAnswerReviewTask`
- `ExamResult`
- `StudentTopicPerformance`

### Academic content chain

- `Question`
- `QuestionOption`
- `QuestionTag`
- `QuestionTagMap`
- `Exam`
- `ExamQuestion`

### Student context chain

- `StudentProfile`
- `Institute`
- `Program`
- source metadata on exams and results

### Important relationship flow

`Question -> ExamQuestion -> Exam -> StudentExamAttempt -> StudentAnswer -> ExamResult -> StudentTopicPerformance`

This is the main reporting lineage for the student section.

---

## Current Frontend-to-Backend Mapping

| Student report | Existing route | Primary payloads already available |
| --- | --- | --- |
| Overall Performance Dashboard | `/app/analytics` and dashboard summary | `StudentInsightSummary`, `StudentResult`, `StudentTopicPerformance` |
| Exam Summary Report | `/app/results` | `StudentResult`, `StudentAttemptSummary`, `StudentAttemptReview` |
| Subject-wise Performance | `/app/analytics` | `StudentInsightSummary`, `StudentQuestionAnalytics` |
| Chapter-wise / Topic Mastery | `/app/weak-areas` | `StudentTopicPerformance`, `StudentQuestionAnalytics` |
| Question-wise Analysis | `/app/analytics/questions` | `StudentQuestionAnalytics` |
| Wrong Questions Report | partial in `/app/analytics/actions` and `/app/analytics/questions` | `StudentQuestionAnalytics` |
| Time Management Report | not dedicated | `StudentQuestionAnalytics`, `StudentAttemptSummary`, `StudentResult` |
| Rank & Percentile History | partial in results and compare | `StudentResult`, `StudentInsightSummary` |
| Improvement Trend | `/app/analytics/timeline` | `StudentInsightSummary`, `StudentResult`, `StudentQuestionAnalytics` |
| AI Recommendations | `/app/practice`, `/app/analytics/actions` | `StudentInsightSummary`, `StudentAvailableExam` |
| Downloadable Reports | not yet implemented | report composition needed |

---

## Gaps Between Customer Expectation And Current Implementation

## Gap 1: No single “Overall Performance Dashboard” contract yet

Current state:

- summary fragments exist
- but not yet framed exactly like the customer’s dashboard-style expectation

Needed:

- dedicated KPI dashboard contract
- explicit chart/report layout

## Gap 2: Wrong Questions Report is not isolated as its own named product artifact

Current state:

- question analytics and action center already contain this data

Needed:

- a dedicated report identity if the customer expects it separately

## Gap 3: Time Management Report is not yet formalized

Current state:

- timing data exists
- no dedicated report page

Needed:

- explicit report definition
- time bucket summaries
- slowest-question grouping

## Gap 4: Rank & Percentile history is not yet a first-class report

Current state:

- rank and percentile exist in result-level payloads

Needed:

- a dedicated history report with trend visualization

## Gap 5: Downloadable report layer is not productized

Current state:

- interactive screens exist

Needed:

- export composition
- report template format
- PDF and spreadsheet strategy

## Gap 6: AI recommendations need customer-facing framing

Current state:

- action center and practice recommendation surfaces exist

Needed:

- visual packaging closer to “AI Study Recommendations”
- confidence, reasons, and action bundles

---

## Student Reporting Build Phases

## Phase 1: Core Academic Report Suite

Deliver:

- Overall Performance Dashboard
- Exam Summary Report
- Subject-wise Performance Report
- Chapter-wise / Topic Mastery Report
- Improvement Trend Report
- Question Pattern Report foundation

Expected outcome:

- student has a complete first-wave academic reporting system

## Phase 2: Diagnostic Expansion

Deliver:

- Question-wise Analysis refinement
- Wrong Questions Report
- Time Management Report
- Rank & Percentile History

Expected outcome:

- student can diagnose not only what is weak, but why

## Phase 3: Action & Distribution Layer

Deliver:

- AI Study Recommendations
- Downloadable Reports
- guardian-shareable summary variants where needed

Expected outcome:

- the reporting system becomes shareable, printable, and action-driven

---

## Immediate Next Build Recommendation

The next implementation steps should be:

1. formalize Overall Performance Dashboard as a first-class report surface
2. define Wrong Questions Report as a named report
3. create Time Management Report
4. create Rank & Percentile History report
5. design Downloadable Reports architecture

This is the fastest path from the current strong student analytics base to the customer’s expected reporting suite.

---

## Bottom Line

The student section already has enough data and route coverage to support a serious reporting module.

What is needed now is not a new foundation.

What is needed is:

- report formalization
- role-specific packaging
- export readiness
- customer-facing naming and structure

This blueprint should be treated as the master plan for student reporting before expanding the same reporting language to:

- parent
- teacher
- institute
- admin
