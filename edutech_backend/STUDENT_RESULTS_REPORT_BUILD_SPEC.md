# Student Results Report Build Spec

## Goal

Define the first student report as an implementation-ready, table-first academic report with modal drill-downs.

This report should become the anchor of the student reporting experience.

It should help the student answer:

- what did I attempt?
- what was my result?
- what is still pending?
- what should I review?
- what should I do next?

---

## Product Position

This report is not just a history page.

It is the student's primary academic outcome report.

The student should be able to:

- scan exam outcomes quickly
- sort and filter performance
- open full result context in a modal
- move from result to subject/topic/practice drill-downs

---

## Reuse From Current System

### Existing frontend source

The current base page already exists:

- `edutech_web/src/app/(student)/app/results/page.tsx`

### Existing frontend API

The current API call already exists:

- `fetchStudentResults() -> /api/v1/student/results/`

### Existing result payload

The current `StudentResult` payload already includes:

- exam identity
- source identity
- score values
- percentage
- rank
- published state
- review availability
- time taken
- metadata

This is enough to ship phase 1 without a new list endpoint.

---

## Final UX Structure

### Page layout

The page should have this structure:

1. report header
2. compact KPI strip
3. filter bar
4. results table
5. pagination
6. result detail modal

### Above-table KPI strip

Keep this compact and academic:

| KPI | Purpose |
| --- | --- |
| Average Result | Student average across published results |
| Latest Result | Latest visible score |
| Review Ready | Count of review-ready results |
| Pending Publication | Count of submitted but unpublished outcomes |

### Primary table title

Use:

- `Results Report`

Optional contextual subtitle:

- `Academic result history and next action`

---

## Results Table Definition

### Default columns

| Column | Source | Purpose |
| --- | --- | --- |
| Exam Name | `exam_title` | Main row identity |
| Subject Scope | derived from `metadata` or subject context | Show subject or multi-subject scope |
| Source | `source_label`, `source_name`, `source_teacher_name` | Show where exam came from |
| Attempt / Publish Date | `published_at` or `created_at` | Show recency |
| Score | `final_score` | Numeric outcome |
| Percentage | `percentage` | Main academic metric |
| Rank | `rank` | Relative standing |
| Result Status | `result_status`, `is_published` | Pass/fail/pending |
| Review | `review_available` | Review state |
| Next Action | derived | Review, practice, resume |

### Column behavior

#### Exam Name

- Primary clickable cell
- Opens modal
- Second line may show exam code

#### Subject Scope

- Show single subject when clear
- Show `Multi-subject` where applicable
- If detailed subject labels exist in metadata, show a compact joined label

#### Source

- Show `Institute`, `Teacher`, or library-style source label
- If teacher-sourced, include teacher name

#### Attempt / Publish Date

- If published, show publish date
- If not published, show submitted/created label

#### Result Status

Map to:

- `Pending`
- `Pass`
- `Fail`
- `Withheld` later if needed

#### Review

Map to:

- `Available`
- `Locked`
- `Awaiting result`

#### Next Action

Map to:

- `Review result`
- `Practice weak areas`
- `Resume practice`
- `Awaiting publish`

---

## Filters

### Phase 1 filters

| Filter | Values |
| --- | --- |
| Status | all, published, pending, pass, fail, review_ready |
| Sort | latest, highest, lowest, fastest, rank |
| Group | none, source, outcome, review |
| Page size | 6, 12, 18 |
| Subject context | from existing subject selector |
| Source context | from existing source selector |

### Phase 2 filters

Add later:

- date range
- exam type
- source teacher
- only ranked results

---

## Table Row Actions

Each row should support:

| Action | Behavior |
| --- | --- |
| Row click | Open detail modal |
| `View details` | Open detail modal explicitly |
| `Review result` | Open review page if allowed |
| `Practice weak areas` | Open recommended practice or weak-areas page |
| `Resume` | Resume follow-up attempt if one exists |

For phase 1, row click plus one action button is enough.

---

## Result Detail Modal

### Modal goal

The modal should provide rich academic context without forcing a full page jump.

### Modal header

Show:

- exam name
- exam code
- subject scope
- source
- result badge

### Modal tabs

#### Tab 1: Overview

Show:

- score
- percentage
- rank
- correct answers
- incorrect answers
- skipped questions
- time taken
- publication state
- review state

#### Tab 2: Subject Breakdown

Show:

- subject-wise rows for this result if available
- strongest subject within this result
- weakest subject within this result

Phase 1 fallback:

- if subject-level breakdown is not directly available per result, show a contextual summary with linked subject report access

#### Tab 3: Topic Breakdown

Show:

- weak topics linked to this result context
- skipped-heavy topics if derivable

Phase 1 fallback:

- show related weak topics from overall student analytics scoped to the same subject

#### Tab 4: Attempt Context

Show:

- attempt date
- attempt state
- result published at
- source label
- review availability

#### Tab 5: Next Action

Show:

- primary CTA
- secondary CTA
- recommendation text

Suggested CTAs:

- `Open Review`
- `Practice Weak Areas`
- `Open Subject Report`
- `Open Topic Report`

---

## Drill-Down Navigation

### Required linked routes

From the modal, support links to:

- student subject performance report
- student topic mastery report
- student practice recommendation report
- review page when available

### Preferred flow

`Results table -> Result modal -> Topic Breakdown tab -> Open Topic Mastery report filtered to selected subject`

This keeps the report chain academic and intentional.

---

## Data Mapping

### Current payload fields we can use immediately

| UI Need | Current field |
| --- | --- |
| exam label | `exam_title` |
| exam code | `exam_code` |
| source label | `source_label` |
| source detail | `source_name`, `source_teacher_name` |
| score | `final_score` |
| percentage | `percentage` |
| rank | `rank` |
| status | `result_status`, `is_published` |
| review state | `review_available` |
| answer counts | `correct_answers`, `incorrect_answers`, `skipped_questions` |
| time taken | `time_taken_seconds` |
| publish date | `published_at` |
| fallback recency | `created_at` |

### Derived UI values

| Derived field | Logic |
| --- | --- |
| visible status label | pending if `!is_published`, else pass/fail |
| review label | awaiting result / available / locked |
| next action | based on publish state, review state, and result status |
| display date | `published_at` first, fallback `created_at` |

---

## Gaps To Handle Carefully

### Gap 1: Per-result subject breakdown

The current result row does not expose a direct per-result subject breakdown.

Phase 1 approach:

- use available metadata if present
- otherwise show subject context summary and link to subject report

Phase 2 approach:

- add a dedicated result detail endpoint with subject/topic drill-down for that specific result

### Gap 2: Result-specific topic breakdown

The current result list payload alone is not enough for exact result-to-topic mapping in all cases.

Phase 1 approach:

- reuse overall topic performance and subject-scoped weak topics

Phase 2 approach:

- add result-detail analytics endpoint

### Gap 3: Modal data density

Do not overload the first modal.

Phase 1 modal can be summary-first with linked deeper reports.

---

## Component Breakdown

### Suggested new components

| Component | Responsibility |
| --- | --- |
| `StudentResultsReportTable` | render report table |
| `StudentResultsReportFilters` | render filters |
| `StudentResultStatusBadge` | consistent status badge |
| `StudentResultNextAction` | action label/button |
| `StudentResultDetailModal` | row detail modal |
| `StudentResultDetailTabs` | modal tabs |

### Reusable existing pieces

Reuse where possible:

- page header
- KPI grid
- filter card styling
- status pills
- action submit button styles

---

## Delivery Plan

### Phase 1

Restructure the current student results page into a cleaner table-first report:

- preserve current backend calls
- improve report labeling
- replace card-heavy or grouped browsing emphasis with a proper table
- add row modal

### Phase 2

Add stronger subject/topic detail inside the modal.

### Phase 3

Add export and advanced filters.

---

## Acceptance Criteria

The first release is successful if:

1. student can scan all result history in a simple table
2. student can filter by status and sort by score/rank/latest
3. clicking a row opens a modal with academic details
4. modal includes next-step actions
5. student can move from result to subject/topic/practice reports smoothly

---

## Recommended Immediate Build Task

The next implementation task should be:

`Convert the current student results experience into a true Results Report table with a detail modal, while reusing the existing /api/v1/student/results/ payload.`
