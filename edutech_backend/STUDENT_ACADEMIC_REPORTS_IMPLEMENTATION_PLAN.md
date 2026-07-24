# Student Academic Reports Implementation Plan

## Scope

This document defines the student-only academic reporting module as a set of simple tabular reports with modal drill-downs.

The design principle is:

- one student sees only their own academic data
- reports are table-first
- every row opens a detail modal
- modal tabs link to deeper related reports

This should be the first reporting release before expanding to teacher, institute, parent, or admin reporting.

---

## What Already Exists

The current product already has strong student reporting data available through the backend and frontend.

### Existing backend data

Reusable student reporting payloads already exist for:

- result history
- insight summary
- weak subjects
- weak topics
- question-type weakness
- source-wise performance
- result comparison inputs
- practice follow-up recommendations

### Existing frontend pages

The current student reporting surface already includes:

- results page
- analytics page
- subject drill-down
- topic drill-down
- question analytics drill-down
- result comparison
- weak areas page

This means the student report phase should focus on simplifying and restructuring the experience into clear tabular reports, not rebuilding the data model from zero.

---

## Student Report Architecture

### Release UX pattern

Each report page should contain:

1. report header
2. small summary strip
3. filter bar
4. report table
5. row click modal
6. links to related reports

### Modal behavior

Each table row should support:

- row click to open modal
- `View details` action
- `Open related report` action
- `Start practice` or `Review result` action when relevant

### Common student modal tabs

- `Overview`
- `Subject Breakdown`
- `Topic Breakdown`
- `Attempt History`
- `Weak Areas`
- `Next Action`

---

## Student Report Set

The first student release should include 4 core reports.

| Priority | Report | Purpose | Row Unit |
| --- | --- | --- | --- |
| P1 | Student Results Report | Show exam-by-exam academic outcomes | One result |
| P1 | Student Subject Performance Report | Show subject-level academic standing | One subject |
| P1 | Student Topic Mastery Report | Show topic-level mastery and weakness | One topic |
| P1 | Student Practice Recommendation Report | Show what to do next | One practice set |

Optional second-wave report:

| Priority | Report | Purpose | Row Unit |
| --- | --- | --- | --- |
| P2 | Student Question Pattern Report | Show wrong/skipped behavior patterns | One question type or grouped question bucket |

---

## Report 1: Student Results Report

### Purpose

This is the main academic history table for the student.

It should answer:

- what exams have I attempted?
- how did I score?
- which results are pending?
- where should I review or practice next?

### Default columns

| Column | Notes |
| --- | --- |
| Exam Name | Primary report label |
| Subject Scope | Subject or multi-subject display |
| Source | Institute / teacher / library source |
| Attempt Date | Attempt or publish date |
| Score | Final score |
| Percentage | Final percentage |
| Rank | Rank if available |
| Result Status | Pass / fail / pending |
| Review Status | Review available or locked |
| Action | Review / Practice / Resume |

### Filters

- subject
- source
- date range
- published status
- result status
- sort by latest / highest / lowest / fastest / best rank

### Row modal

#### Overview tab

- exam name
- exam code
- score
- percentage
- rank
- result status
- result publication state
- time taken

#### Subject Breakdown tab

- subject-wise performance for this result
- strongest subject inside this exam
- weakest subject inside this exam

#### Topic Breakdown tab

- weakest topics touched by this exam
- skipped-heavy topics

#### Attempt History tab

- previous attempts of similar exam or same source if available

#### Next Action tab

- `Review result`
- `Practice weak areas`
- `Retry similar practice`

### Related report links

- `Open Subject Performance report`
- `Open Topic Mastery report`
- `Open Practice Recommendation report`

---

## Report 2: Student Subject Performance Report

### Purpose

This report should show where the student stands subject by subject.

It should answer:

- which subject is strongest?
- which subject needs intervention?
- where is the student skipping more?

### Default columns

| Column | Notes |
| --- | --- |
| Subject | Subject name |
| Avg Percentage | Average score in subject |
| Accuracy | Subject-level correctness |
| Attempted Questions | Total attempted volume |
| Skipped Questions | Total skipped volume |
| Trend | Improving / stable / declining |
| Weak Topics | Count of weak topics under subject |
| Last Seen | Most recent activity in subject |

### Filters

- source
- date range
- subject family if needed
- trend state

### Row modal

#### Overview tab

- subject average
- subject accuracy
- attempts in this subject
- skipped behavior

#### Topic Breakdown tab

- all weak topics for this subject
- average percentage by topic
- most skipped topics

#### Result History tab

- all results containing this subject
- recent progression

#### Next Action tab

- top recommended practice sets for subject
- suggested revision priority

### Related report links

- `Open Topic Mastery report` filtered to subject
- `Open Results report` filtered to subject
- `Open Practice Recommendation report` filtered to subject

---

## Report 3: Student Topic Mastery Report

### Purpose

This is the most important intervention report.

It should answer:

- which topics are weak?
- which topics are improving?
- which topics need immediate practice?

### Default columns

| Column | Notes |
| --- | --- |
| Topic | Topic name |
| Subject | Parent subject |
| Avg Percentage | Topic performance |
| Attempted Questions | Exposure count |
| Skipped Questions | Skip count |
| Mastery Level | Weak / developing / strong |
| Trend | Improving / stable / declining |
| Last Seen | Recent exam containing topic |
| Action | Practice topic |

### Suggested mastery labels

| Range | Label |
| --- | --- |
| below 40% | Weak |
| 40% to 69% | Developing |
| 70% and above | Strong |

These ranges can be configured later.

### Filters

- subject
- mastery level
- source
- recently seen only

### Row modal

#### Overview tab

- topic average
- attempts
- skips
- mastery level

#### Exam Presence tab

- which exams included this topic
- student score in those exams

#### Question Pattern tab

- wrong-heavy behavior
- skipped-heavy behavior

#### Recommended Practice tab

- start practice focused on this topic
- open related subject drill-down

### Related report links

- `Open Results report` filtered to topic subject
- `Open Subject Performance report`
- `Open Practice Recommendation report` focused on topic

---

## Report 4: Student Practice Recommendation Report

### Purpose

This is the action table that turns reporting into learning next steps.

It should answer:

- what should the student attempt next?
- which recommendation is based on weak areas?
- which recommendation is resume-ready?

### Default columns

| Column | Notes |
| --- | --- |
| Practice Set | Exam/practice title |
| Subject | Subject label |
| Recommendation Reason | Weak topic / follow-up / revision / retry |
| Duration | Practice duration |
| Difficulty or Type | Practice or mock type |
| Availability | Ready now / locked / resume |
| Source | Source label |
| Action | Start / Resume / Unlock |

### Filters

- subject
- availability
- source
- recommendation reason

### Row modal

#### Overview tab

- practice set summary
- subject scope
- why this is recommended

#### Weak Area Mapping tab

- linked weak subjects
- linked weak topics

#### Attempt Readiness tab

- can start
- can resume
- access or economy constraints

### Related report links

- `Open Topic Mastery report`
- `Open Subject Performance report`
- `Open Results report`

---

## Optional Report 5: Student Question Pattern Report

### Purpose

This is useful, but should come after the first four reports.

It should answer:

- which question formats are hurting the student?
- where does the student skip too much?

### Default columns

| Column | Notes |
| --- | --- |
| Question Type | MCQ / numerical / assertion etc. |
| Wrong % | Wrong ratio |
| Skip % | Skip ratio |
| Wrong Count | Volume |
| Skipped Count | Volume |
| Total Seen | Exposure |
| Risk Flag | High / medium / low |

### Modal drill-down

- linked subjects
- linked topics
- recent result contexts

---

## Recommended Navigation Model

### Student reports menu

Under the student area, create a single `Reports` section with tabs:

- `Results`
- `Subjects`
- `Topics`
- `Recommendations`
- `Question Patterns` later

### Drill-down flow examples

Results flow:

`Results table -> Result modal -> Open Topic Mastery filtered to weak subject`

Subject flow:

`Subject table -> Subject modal -> Open Topic Mastery filtered to selected subject`

Topic flow:

`Topic table -> Topic modal -> Start Practice`

Recommendation flow:

`Recommendation table -> Recommendation modal -> Start or Resume attempt`

---

## Backend Reuse Plan

### Reuse immediately

The current backend already supports most of the student reporting logic.

We should reuse:

- student insight summary payload
- student results payload
- student question analytics payload
- practice follow-up payload

### Likely backend additions

To make the frontend table-first and modal-first, we may still want dedicated list/detail endpoints later:

| Need | Recommendation |
| --- | --- |
| Results table | Reuse current results endpoint first |
| Results modal detail | Derive from result + attempt summary, add dedicated detail endpoint later |
| Subject table | Derive from insight summary first |
| Topic table | Derive from insight summary first |
| Recommendation table | Reuse practice follow-up endpoint |
| Question pattern table | Reuse question analytics endpoint |

### Best delivery strategy

Do not create too many new endpoints in phase 1.

Phase 1 should assemble the reports from existing APIs wherever possible.

---

## Frontend Build Plan

### Phase 1

Build the student reports shell:

- new student `Reports` area
- tab navigation
- reusable table component
- reusable report modal component

### Phase 2

Build the `Results` report first because it is the highest-value report.

### Phase 3

Build `Subject Performance` and `Topic Mastery`.

### Phase 4

Build `Practice Recommendation`.

### Phase 5

Add `Question Pattern` as advanced analysis.

---

## Recommended Build Order

| Order | Item | Why |
| --- | --- | --- |
| 1 | Results Report | Highest visibility and easiest user validation |
| 2 | Topic Mastery Report | Best academic intervention value |
| 3 | Subject Performance Report | Best summary lens |
| 4 | Practice Recommendation Report | Turns reporting into action |
| 5 | Question Pattern Report | Advanced optimization layer |

---

## Product Notes

### Keep it simple

Avoid building a dashboard-heavy student reporting experience first.

The first release should feel like:

- clear
- sortable
- actionable
- easy to compare

### What success looks like

A student should be able to answer these questions in under 30 seconds:

- How am I doing overall?
- Which subjects are weak?
- Which topics need work first?
- Which result should I review?
- What should I practice next?

If the student can do that from tables plus modals, the report design is working.
