# Teacher Report Route Audit And Mapping

## Purpose

This document maps the current teacher routes to the student-level academic report suite that should be built in the teacher section.

It answers:

- which teacher routes already exist
- which of those can act as report anchors
- which new teacher report routes should be created
- which reports should reuse existing pages versus use dedicated report pages

Date:

- Tuesday, July 21, 2026

---

## Core Decision

The teacher section should not create new routes blindly.

We should:

- reuse existing teacher academic routes where the report naturally belongs
- add new `/teacher/reports/*` routes only where dedicated reporting behavior is needed
- keep dense operational pages separate from dense reporting pages when their goals are different

---

## Current Teacher Route Inventory

### Existing teacher routes found in the app

| Route | Current type | Primary purpose |
| --- | --- | --- |
| `/teacher/dashboard` | Existing | Teacher overview shell |
| `/teacher/exams` | Existing | Exam catalog and management |
| `/teacher/exams/new` | Existing | Quick exam creation |
| `/teacher/exams/advanced` | Existing | Advanced exam setup |
| `/teacher/exams/[examId]` | Existing | Exam detail and performance summary |
| `/teacher/exams/[examId]/builder` | Existing | Exam setup, questions, and assignment |
| `/teacher/question-bank` | Existing | Question library and authoring workspace |
| `/teacher/question-bank/new` | Existing | Create question |
| `/teacher/question-bank/import` | Existing | Import questions |
| `/teacher/question-bank/[questionId]` | Existing | Question detail and editing |
| `/teacher/question-bank/comprehension/new` | Existing | Create comprehension set |
| `/teacher/question-bank/comprehension/import` | Existing | Import comprehension set |
| `/teacher/question-bank/comprehension/[passageId]` | Existing | Comprehension detail and editing |
| `/teacher/results` | Existing | Results operations and reporting anchor |
| `/teacher/results/live` | Existing | Live results monitoring |
| `/teacher/results/leaderboard` | Existing | Result ranking or leaderboard view |
| `/teacher/results/attempts` | Existing | Attempt-oriented result view |
| `/teacher/results/analysis` | Existing | Result analysis view |
| `/teacher/reviews` | Existing | Review queue and result follow-up |
| `/teacher/search` | Existing | Search utility |

---

## Report-To-Route Reuse Strategy

### Reuse-first principle

Use an existing route as the report home when:

- the route already matches the report’s primary purpose
- filters and table behavior can live naturally there
- row drilldowns belong to the same operating context

Create a dedicated report route when:

- the report is analytically dense and not just operational
- the report needs a new table contract
- the report needs its own filter grammar and modal workflow
- adding it to an existing dense operator page would make the UX worse

---

## Teacher Report Mapping Matrix

| Teacher report | Reuse current route or create new one | Recommended route | Reason |
| --- | --- | --- | --- |
| Teacher Student Results Report | Reuse current | `/teacher/results` | This is already the natural anchor for teacher-scoped student results |
| Teacher Student Subject Performance Report | Create new | `/teacher/reports/subjects` | Subject comparison is analytical and should not overload `/teacher/results` |
| Teacher Student Topic Mastery Report | Create new | `/teacher/reports/weak-areas` | Topic weakness deserves its own report surface |
| Teacher Student Practice Recommendation Report | Create new | `/teacher/reports/practice-recommendations` | Recommendation logic is distinct from results operations |
| Teacher Student Question Pattern Report | Create new | `/teacher/reports/question-patterns` | Pattern-level analytics should not live inside question-bank operations |
| Teacher Student Wrong Questions Report | Create new | `/teacher/reports/wrong-questions` | Recovery reporting needs its own table and drilldown flow |
| Teacher Student Time Management Report | Create new | `/teacher/reports/time-management` | Pacing analytics is a dedicated academic report family |
| Teacher Student Study Recommendations Report | Create new | `/teacher/reports/study-recommendations` | Action-oriented academic recommendations deserve a dedicated route |
| Teacher Student Rank History Report | Create new | `/teacher/reports/rank-history` | Longitudinal rank tracking is a standalone report surface |
| Teacher Downloadable Student Reports Surface | Create new | `/teacher/reports/downloads` | Export center should be a dedicated reporting utility |

---

## Existing Route Reuse Details

## 1. `/teacher/results`

### Recommended role

Primary home for the Teacher Student Results Report.

### Why reuse it

- route purpose already aligns with teacher-scoped student result visibility
- existing teacher behavior already expects exam/result workflows here
- this is the best place for:
  - student result table
  - published / pending / review-ready status
  - result-driven drilldowns

### What should be added here

- stronger report table contract
- cleaner results summary strip
- report-first filters
- row modal or drawer for student result details
- carry-forward links to weak areas, review, and exam detail

### What should not be forced here

- full subject comparison reporting
- topic mastery analysis
- recommendation-center reporting

---

## 2. `/teacher/exams/[examId]`

### Recommended role

Exam-scoped reporting support surface.

### Why reuse it

- this page is ideal for one-exam performance summary
- it can host:
  - section performance summary
  - exam-level student list
  - question issue summaries

### Best use in report architecture

- use as a drilldown target from teacher results and subject/topic reports
- do not use it as the main home for class-wide reporting

---

## 3. `/teacher/reviews`

### Recommended role

Review backlog and follow-up queue surface.

### Why reuse it

- naturally supports teacher follow-up on published results
- should be a linked action from results and wrong-question reports

### Best use in report architecture

- keep as operational queue
- link into it from results and report modals
- do not force broad subject/topic reporting into this page

---

## 4. `/teacher/question-bank`

### Recommended role

Question evidence and question-quality support surface.

### Why reuse it

- it can support drilldown from wrong-question or question-pattern reports
- it is the correct home for detailed question editing or content correction

### Best use in report architecture

- use as a drilldown target
- do not treat it as the main home of teacher student-performance reporting

---

## 5. `/teacher/dashboard`

### Recommended role

Teacher reporting overview anchor.

### Why reuse it

- the dashboard should show top report entry points and summary KPI blocks
- it can link to:
  - results
  - weak areas
  - question patterns
  - time management
  - recommendations

### Best use in report architecture

- dashboard is the summary and launch layer
- dedicated report routes should hold the deeper tables

---

## Recommended New Teacher Report Routes

These routes should be added to complete the teacher-side student reporting suite.

| Route | Report family | Reason |
| --- | --- | --- |
| `/teacher/reports` | Teacher reports hub | One place to open all teacher student-level reports |
| `/teacher/reports/subjects` | Subject performance | Dedicated subject comparison table |
| `/teacher/reports/weak-areas` | Topic mastery / weak areas | Dedicated topic weakness report |
| `/teacher/reports/practice-recommendations` | Practice recommendations | Action-oriented assignment report |
| `/teacher/reports/question-patterns` | Question pattern report | Pattern-level answer behavior analysis |
| `/teacher/reports/wrong-questions` | Wrong questions report | Detailed mistake recovery reporting |
| `/teacher/reports/time-management` | Time management report | Pacing and time-loss evidence |
| `/teacher/reports/study-recommendations` | Study recommendations | Intervention planning surface |
| `/teacher/reports/rank-history` | Rank history report | Longitudinal rank and percentile tracking |
| `/teacher/reports/downloads` | Download center | Exportable report surface |

---

## Report Build Target By Route

### Wave 1: Reuse-first foundational routes

| Route | Build target |
| --- | --- |
| `/teacher/results` | Teacher Student Results Report |
| `/teacher/dashboard` | Teacher report launch summaries |
| `/teacher/exams/[examId]` | Exam-scoped report drilldown support |

### Wave 2: First dedicated report routes

| Route | Build target |
| --- | --- |
| `/teacher/reports` | Reports hub |
| `/teacher/reports/subjects` | Subject Performance Report |
| `/teacher/reports/weak-areas` | Topic Mastery Report |

### Wave 3: Recovery and intervention routes

| Route | Build target |
| --- | --- |
| `/teacher/reports/wrong-questions` | Wrong Questions Report |
| `/teacher/reports/question-patterns` | Question Pattern Report |
| `/teacher/reports/time-management` | Time Management Report |

### Wave 4: Recommendation and longitudinal routes

| Route | Build target |
| --- | --- |
| `/teacher/reports/practice-recommendations` | Practice Recommendation Report |
| `/teacher/reports/study-recommendations` | Study Recommendations Report |
| `/teacher/reports/rank-history` | Rank History Report |
| `/teacher/reports/downloads` | Download Center |

---

## Navigation Recommendation

### Teacher primary nav

Keep the current teacher primary nav simple:

- Dashboard
- Exams
- Results
- Reviews
- Question Bank

### Add new nav item

- Reports

### Inside `Reports`

Use local tabs or report cards for:

- Subjects
- Weak Areas
- Wrong Questions
- Question Patterns
- Time Management
- Recommendations
- Rank History
- Downloads

---

## UI/UX Recommendation By Route Type

### Existing reused operational routes

Use:

- compact KPI strips
- operational CTAs
- report table plus workflow links

Examples:

- `/teacher/results`
- `/teacher/reviews`
- `/teacher/exams/[examId]`

### New dedicated report routes

Use:

- stronger report header
- report-first filters
- table-first layout
- modal or drawer drilldown
- export or share actions where relevant

Examples:

- `/teacher/reports/subjects`
- `/teacher/reports/weak-areas`
- `/teacher/reports/time-management`

---

## Route Decisions Summary

### Reuse existing routes

- `/teacher/dashboard`
- `/teacher/results`
- `/teacher/reviews`
- `/teacher/exams/[examId]`
- `/teacher/question-bank`

### Add dedicated teacher report routes

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

## What We Should Do Next

The next practical step should be:

1. map current teacher backend payloads to the first three report families
2. identify frontend components we can reuse from the student reports
3. begin implementation with `/teacher/results`
4. then create `/teacher/reports` and `/teacher/reports/subjects`

---

## Final Direction

The teacher section should evolve into:

- a teacher-controlled student academic reporting system
- anchored by existing result and exam routes
- expanded by dedicated report routes where analytics deserves its own space

This route audit is the implementation map for that transition.
