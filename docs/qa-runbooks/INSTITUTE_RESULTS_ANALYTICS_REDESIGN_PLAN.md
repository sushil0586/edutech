# Institute Results Analytics Redesign Plan

## Goal

Redesign the results analytics experience so it reads in a clear hierarchy:

1. All exams
2. One selected exam
3. Students inside that exam
4. Question-wise evidence for one selected student

The page should feel more visual, easier to scan, and more useful for institute admins and teachers who need both summary insights and drill-down evidence.

## Current State

The current `/institute/results/analysis` page already has:

- exam selection
- topic performance rows
- question analysis rows
- question filter chips for `all`, `hard_questions`, and `skipped_often`

The current page does **not** yet present the full hierarchy clearly:

- the exam list is visually mixed into the analysis content
- there is no dedicated student performance lane inside the analysis view
- there is no student-to-question drill-down inside analysis
- charts are minimal, so pattern recognition is slower than it should be

## Data Contract Audit

### Already available

- `fetchTeacherExams()`
  - gives exam cards for the all-exam layer
- `fetchTeacherResultSummary()`
  - gives per-exam result summary
- `fetchTeacherExamAttemptPage(examId, ...)`
  - gives student attempt level summary for one exam
- `fetchTeacherQuestionAnalysis(examId, ...)`
  - gives exam-level question aggregates
- `fetchTeacherTopicPerformance(examId, ...)`
  - gives exam-level topic aggregates
- `fetchTeacherExamLeaderboard(examId, ...)`
  - gives ranked student list

### Gap discovered

The current analysis flow does not expose a teacher/institute-safe API for:

- one selected student inside one exam
- all answered questions for that selected student attempt
- correctness, skipped state, marked-for-review state, time spent, and selected answer evidence in one analytics-friendly response

### Important permission note

- institute admins can access raw scoped attempt data more broadly
- teachers do **not** currently have the same raw answer access through the generic `attempts/answers` route

So the clean shared solution is:

- add a results-scoped drill-down endpoint for exam + attempt analytics detail
- use that same endpoint in both institute and teacher workspaces

## Proposed Information Architecture

### 1. All Exams Rail

Purpose:

- answer “which exam needs attention?”

Content:

- exam cards
- average score
- attempts
- pass/fail split
- topic coverage count
- most-wrong question count

Visual treatment:

- compact cards
- status pills
- stronger active state
- optional sparkline/trend mini-visual if enough data exists later

### 2. Exam Overview Canvas

Purpose:

- answer “what is happening in this exam overall?”

Content:

- hero summary
- participation and evaluation KPI cards
- topic strength chart
- question risk chart
- student performance distribution

Recommended graphs:

- horizontal topic bars for score percentage
- stacked bar for correct vs wrong vs skipped totals
- student distribution bands:
  - high performers
  - mid performers
  - low performers
  - critical integrity/watch cases

### 3. Student Explorer

Purpose:

- answer “which students are struggling and why?”

Content:

- searchable student attempt list
- filters:
  - all
  - low score
  - high skipped
  - high wrong
  - marked for review
  - integrity watch
- sorting:
  - lowest score
  - highest wrong
  - highest skipped
  - longest time
  - latest submission

Visual treatment:

- split layout with student list on the left
- selected student narrative card on the right
- clear score, accuracy, skip rate, and time indicators

### 4. Student Question Evidence

Purpose:

- answer “where exactly did this student lose marks?”

Content:

- one row/card per question
- question text summary
- subject and topic
- selected answer
- correctness
- marks awarded
- negative marks
- skipped state
- marked-for-review state
- time spent

Recommended graphs:

- mini outcome strip:
  - correct
  - wrong
  - skipped
- time-spent comparison bars across student questions
- optional filter chips:
  - all
  - wrong
  - skipped
  - marked
  - slow

## UX Direction

The redesign should feel more intentional and “analytics-first”, not like a list of cards pasted side by side.

### Design principles

- clear hierarchy from broad to narrow
- strong visual segmentation
- fewer cramped columns
- more narrative summaries
- graphs only where they answer a real question
- mobile-safe stacking

### Suggested page order

1. Analytics hero
2. All-exam summary rail
3. Exam-level charts
4. Student explorer
5. Student question evidence
6. Improvement recommendations

## Filters to Add

### Exam filters

- exam status
- published state
- sort by score, attempts, latest

### Student filters

- search by name or admission number
- score band
- skipped-heavy
- wrong-heavy
- integrity watch
- marked for review

### Question filters for selected student

- all
- wrong
- skipped
- marked
- slow

## Implementation Plan

### Phase 1: Data support

- add a results-scoped attempt analytics endpoint
- expose selected student attempt answer evidence for teacher and institute roles
- add frontend API helper and types

### Phase 2: Analysis page redesign

- rebuild analysis page into:
  - analytics hero
  - exam overview charts
  - student explorer
  - question evidence drill-down
- reuse existing shared results workspace structure

### Phase 3: Visual polish

- add lightweight SVG charts
- add stronger section framing
- improve empty states
- improve pills, legends, and filter clarity

## Scope for This Implementation

This implementation will aim to deliver:

- documented redesign
- teacher/institute-safe student drill-down backend contract
- richer analysis page hierarchy
- relevant graphs using existing real data
- clearer student and question filters

This implementation will not attempt:

- external chart libraries
- fake benchmark data
- historical trend charts if the backend does not provide true trend series

## Success Criteria

The page is successful if a user can answer these questions quickly:

- Which exam needs review?
- Which topics are weak in this exam?
- Which students are struggling in this exam?
- For one selected student, which questions caused the score drop?
- What should I improve in the question bank or exam blueprint next?
