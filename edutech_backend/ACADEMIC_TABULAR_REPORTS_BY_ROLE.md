# Academic Tabular Reports By Role

## Goal

Design simple, high-utility academic reports as table-first screens.

Each role should see:

- a primary report table
- focused academic columns
- quick filters
- row click or action button to open a modal
- modal drill-down to related reports without leaving context

This document favors operationally useful academic reporting over dashboard-heavy UI.

---

## Shared Report Design Rules

### Core UX Pattern

Every report should follow this structure:

1. Header with report title and purpose
2. Filter bar
3. Simple table
4. Row actions
5. Detail modal
6. Drill-down links inside modal

### Table Rules

- Default to tabular layout, not cards.
- Keep first release columns limited to the most important 6-10 fields.
- Support search, sort, pagination, and CSV export.
- Use sticky header and sticky first column for large tables.
- Show summary counts above the table.

### Modal Rules

Each row should open a modal with:

- summary details
- academic breakdown
- recent history
- linked related reports
- action buttons

### Drill-Down Rules

Drill-down should happen in this order:

- `Table row -> modal`
- `Modal tab -> nested detail table`
- `Modal action -> open related report with same filters`

Avoid sending users to a new page immediately when they only want context.

### Common Modal Tabs

Use these tabs where relevant:

- `Overview`
- `Subject Breakdown`
- `Topic Breakdown`
- `Attempt History`
- `Weak Areas`
- `Recommendations`

---

## Role 1: Student Reports

### Objective

A student should see only their own academic data, in a clean progress-oriented format.

### Primary Reports

| Report | Purpose | Default Row |
| --- | --- | --- |
| Results Report | Show exam-by-exam academic outcome | One exam attempt/result |
| Subject Performance Report | Show subject-wise standing | One subject |
| Topic Mastery Report | Show topic-wise strength/weakness | One topic |
| Question Pattern Report | Show wrong/skipped behavior | One question type or question bucket |
| Practice Recommendation Report | Show what to attempt next | One recommended exam/practice set |

### Student Results Report

| Column | Meaning |
| --- | --- |
| Exam Name | Which exam/practice set |
| Subject Scope | Subject or multi-subject label |
| Attempt Date | When it was attempted |
| Score | Raw score/final score |
| Percentage | Final percentage |
| Rank | Rank if available |
| Result Status | Pass/fail/pending |
| Review Status | Review available or not |

Filters:

- Subject
- Exam type
- Date range
- Result status
- Published only / all

Student modal drill-down:

- `Overview`: score, percentage, rank, time taken
- `Subject Breakdown`: subject-wise marks
- `Topic Breakdown`: weakest and strongest topics
- `Question Pattern`: wrong/skipped/correct counts
- `Next Action`: practice recommendation, review link

### Student Subject Performance Report

| Column | Meaning |
| --- | --- |
| Subject | Subject name |
| Avg Percentage | Student average in this subject |
| Accuracy | Correctness ratio |
| Attempted Questions | Questions attempted |
| Skipped Questions | Questions skipped |
| Trend | Improving/stable/declining |
| Weak Topics | Count of weak topics |

Modal drill-down:

- recent exams in this subject
- topic table for this subject
- question-type weakness inside this subject

### Student Topic Mastery Report

| Column | Meaning |
| --- | --- |
| Topic | Topic name |
| Subject | Parent subject |
| Avg Percentage | Topic performance |
| Attempted Questions | Total attempts on this topic |
| Skipped Questions | Total skips |
| Mastery Level | Weak/developing/strong |
| Last Seen | Most recent exam containing topic |

Modal drill-down:

- topic timeline
- exams where topic appeared
- linked practice sets for that topic

---

## Role 2: Parent Reports

### Objective

A parent should get a simple academic visibility report for each child, without overload.

### Primary Reports

| Report | Purpose | Default Row |
| --- | --- | --- |
| Child Progress Report | Overall academic summary | One child |
| Recent Results Report | Latest result history | One result |
| Weak Areas Report | Subjects/topics needing attention | One weak area |
| Alert Report | Academic and integrity alerts | One alert |

### Parent Child Progress Report

| Column | Meaning |
| --- | --- |
| Student Name | Child name |
| Class/Program | Academic placement |
| Avg Percentage | Overall average |
| Accuracy | Overall accuracy |
| Recent Trend | Improving/stable/declining |
| Weak Subjects | Count |
| Weak Topics | Count |
| Last Attempt | Latest activity |

Modal drill-down:

- recent results table
- weak subjects table
- weak topics table
- alert summary
- recommendation summary for guardian discussion

---

## Role 3: Teacher Reports

### Objective

A teacher should be able to review learner performance, class trends, and academic intervention needs in table form.

### Primary Reports

| Report | Purpose | Default Row |
| --- | --- | --- |
| Exam Performance Report | Compare exams handled by teacher | One exam |
| Student Performance Report | Compare students | One student |
| Subject/Topic Gap Report | Find weak learning areas | One topic |
| Question Quality Report | Find problematic questions | One question |
| Review Queue Report | Track pending academic review work | One review task or exam |

### Teacher Exam Performance Report

| Column | Meaning |
| --- | --- |
| Exam Name | Exam title |
| Exam Code | Exam identifier |
| Attempts | Total attempted |
| Avg Percentage | Average class score |
| Pass Count | Passed learners |
| Fail Count | Failed learners |
| Pending Review | Review backlog |
| Published | Results published or not |

Filters:

- Subject
- Batch/cohort
- Exam type
- Date range
- Published status

Modal drill-down:

- `Overview`: exam summary
- `Section Breakdown`: section-wise performance
- `Student List`: all students in that exam
- `Weak Topics`: topic gaps from this exam
- `Question Issues`: most wrong and most skipped questions

### Teacher Student Performance Report

| Column | Meaning |
| --- | --- |
| Student Name | Learner |
| Admission No | Identifier |
| Attempts | Number of attempts |
| Avg Percentage | Average score |
| Accuracy | Accuracy level |
| Weak Subjects | Count |
| Weak Topics | Count |
| Trend | Improvement state |

Modal drill-down:

- exam history for that student
- subject breakdown
- topic weakness
- recommended intervention

### Teacher Subject/Topic Gap Report

| Column | Meaning |
| --- | --- |
| Subject | Subject name |
| Topic | Topic name |
| Avg Percentage | Topic average across class |
| Attempted Questions | Exposure volume |
| Wrong Rate | Wrong ratio |
| Skip Rate | Skip ratio |
| Affected Students | Number of impacted learners |

Modal drill-down:

- list of affected students
- linked exams where this topic underperformed
- recommended revision/practice plan

---

## Role 4: Institute Admin Reports

### Objective

Institute admins should see academic performance across classes, subjects, exams, and cohorts.

### Primary Reports

| Report | Purpose | Default Row |
| --- | --- | --- |
| Institute Exam Report | Track exam performance institute-wide | One exam |
| Cohort Performance Report | Compare batches/cohorts | One cohort |
| Subject Health Report | Compare subjects | One subject |
| Student Risk Report | Find at-risk students | One student |
| Publication Backlog Report | Track results waiting for release | One exam/result summary |

### Institute Exam Report

| Column | Meaning |
| --- | --- |
| Exam Name | Exam title |
| Program/Cohort | Scope |
| Attempts | Total attempts |
| Avg Percentage | Overall score |
| Accuracy | Question correctness |
| Pass Rate | Pass proportion |
| Pending Review | Review blockers |
| Publication Status | Published/backlog |

Modal drill-down:

- exam summary
- section performance
- subject contribution
- student leaderboard
- weak topics from exam

### Institute Cohort Performance Report

| Column | Meaning |
| --- | --- |
| Cohort | Batch/class |
| Students | Learner count |
| Exams Taken | Number of tracked exams |
| Avg Percentage | Cohort average |
| Accuracy | Cohort accuracy |
| Weak Subjects | Count |
| At-Risk Students | Count |
| Trend | Cohort trend |

Modal drill-down:

- subject table for cohort
- student table for cohort
- exam history for cohort

### Institute Student Risk Report

| Column | Meaning |
| --- | --- |
| Student | Student name |
| Cohort | Cohort/class |
| Avg Percentage | Overall performance |
| Accuracy | Accuracy level |
| Weak Subjects | Count |
| Weak Topics | Count |
| Skipped Questions | Behavior signal |
| Risk Level | Low/medium/high |

Modal drill-down:

- academic history
- weak areas
- recent score trend
- assigned teacher or mentor follow-up

---

## Role 5: Platform Admin Reports

### Objective

Platform admins should review academic reporting at a cross-institute level, mainly for oversight and benchmarking.

### Primary Reports

| Report | Purpose | Default Row |
| --- | --- | --- |
| Cross-Institute Performance Report | Compare institutes | One institute |
| Exam Publication Health Report | Track release delays | One institute or exam |
| Subject Benchmark Report | Compare subject outcomes globally | One subject |
| Weak Topic Concentration Report | Identify repeated learning gaps | One topic |

### Cross-Institute Performance Report

| Column | Meaning |
| --- | --- |
| Institute | Institute name |
| Active Students | Reporting student base |
| Tracked Exams | Exam count |
| Avg Percentage | Academic average |
| Accuracy | Overall correctness |
| Weak Subjects | Count |
| Pending Publications | Result backlog |
| Review Load | Pending review load |

Modal drill-down:

- institute-level exam table
- institute weak topic table
- institute top/bottom performer summary

---

## Recommended First Release

If we want a practical first rollout, start with these 8 tables:

| Priority | Role | Report |
| --- | --- | --- |
| P1 | Student | Results Report |
| P1 | Student | Topic Mastery Report |
| P1 | Teacher | Exam Performance Report |
| P1 | Teacher | Student Performance Report |
| P1 | Institute | Institute Exam Report |
| P1 | Institute | Student Risk Report |
| P1 | Parent | Child Progress Report |
| P2 | Admin | Cross-Institute Performance Report |

---

## Modal Interaction Model

For consistency, every table row should support:

| Action | Behavior |
| --- | --- |
| Row click | Open summary modal |
| `View details` | Open full modal |
| `Open related report` | Jump to filtered table |
| `Export row data` | Export selected record summary |

### Example Drill-Down Flow

Student results flow:

`Results table -> Result modal -> Topic breakdown tab -> Open Topic Mastery report`

Teacher exam flow:

`Exam table -> Exam modal -> Student list tab -> Open Student Performance report`

Institute cohort flow:

`Cohort table -> Cohort modal -> Weak subjects tab -> Open Subject Health report`

---

## Technical Mapping Guidance

The reporting structure should reuse existing backend summary models and result analytics where possible:

- `ExamResult`
- `StudentTopicPerformance`
- `ExamPerformanceSummary`
- attempt and answer analytics
- teacher insight summary payloads
- student insight summary payloads
- parent progress payloads

The best implementation pattern is:

1. list endpoint for table rows
2. detail endpoint for modal payload
3. filtered linked endpoint for drill-down

---

## Product Recommendation

Do not start with complex dashboard widgets.

Start with:

- simple tables
- strong filters
- clean modal details
- report-to-report drill-downs

That will be easier to ship, easier to validate with users, and much more useful for real academic operations.
