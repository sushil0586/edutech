# Student Analytics Drill-Down Plan

## Purpose

This document defines the next layer of student analytics beyond the current summary page.

The current analytics page at `/app/analytics` should remain the summary workspace.

The upgrade is to make each major section drill into a focused detail page that answers one of these questions:

1. what is happening
2. why it is happening
3. what the student should do next

This plan is intentionally product-first.

It is not about adding more charts to the current page.

It is about turning analytics into:

- diagnosis
- explanation
- action


## Current Analytics Page Role

The current page already works well as a top-level overview.

It shows:

- overall performance
- accuracy
- trend
- attempt history
- performance by source
- source and subject breakdown
- subject performance
- recent published results
- topic performance
- question-type risk
- insight messages

This means the next upgrade should not replace the page.

It should make the page more useful by giving each section a clear drill-down destination.


## Product Rule For Drill-Down Pages

Each drill-down page should have one dominant job.

### Allowed page purposes

- summary detail
- root-cause diagnosis
- comparison
- action planning

### Avoid

- pages that try to be both dashboard and action center at the same time
- pages that repeat the same numbers from the parent page without adding explanation
- drill-down pages that have no next step


## Target Information Architecture

Keep `/app/analytics` as the summary page.

Add focused routes beneath it.

### Suggested route family

- `/app/analytics/timeline`
- `/app/analytics/actions`
- `/app/analytics/sources/[sourceKey]`
- `/app/analytics/subjects/[subjectKey]`
- `/app/analytics/topics/[topicKey]`
- `/app/analytics/question-types/[questionType]`
- `/app/analytics/results/compare`
- `/app/analytics/insights/[insightKey]`


## Implementation Status

### Phase 1 complete

- `/app/analytics/timeline`
- `/app/analytics/actions`
- `/app/analytics/subjects/[subjectKey]`
- `/app/analytics/topics/[topicKey]`
- `/app/analytics/question-types/[questionType]`
- homepage links for KPI cards, subjects, topics, and question-type risk

### Phase 2 complete

- `/app/analytics/sources/[sourceKey]`
- `/app/analytics/results/compare`
- homepage links for performance by source
- homepage links for source and subject breakdown
- homepage links for recent published results

### Data honesty rule now applied

- no fake percentile is shown where the backend only provides peer averages
- benchmark areas explicitly say `peer average` and `peer accuracy`
- rank is shown only when the backend has actually calculated and exposed it


## Section-By-Section Drill-Down Map

## 1. Analytics Focus Hero

### Current role

Highlights the weakest tracked topic and points toward practice.

### Drill-down destination

`Improvement Action Center`

### Suggested route

- `/app/analytics/actions`

### What this page should answer

- what is the biggest improvement opportunity right now
- which exact topic or question pattern is responsible
- what should the student do next

### Suggested content

- primary weak topic
- top weak question type
- most recent wrong questions
- questions skipped too often
- recommended practice sets
- retry wrong questions action
- revise topic action
- reattempt marked-for-review action

### Main CTA

- start targeted practice


## 2. KPI Cards

Cards:

- average performance
- accuracy rate
- performance trend
- attempt history

### Drill-down destination

`Performance Timeline`

### Suggested route

- `/app/analytics/timeline`

### What this page should answer

- am I improving over time
- is my accuracy improving or just my attempt count
- are bad results isolated or repeating

### Suggested content

- exam-by-exam score trend
- accuracy trend
- skip trend
- attempt frequency trend
- best and worst exam periods
- subject trend overlays
- source-based trend comparison

### Filters

- date range
- subject
- source
- teacher
- exam type


## 3. Performance By Source

### Drill-down destination

`Source Detail`

### Suggested routes

- `/app/analytics/sources/institute`
- `/app/analytics/sources/teacher`
- `/app/analytics/sources/practice`
- `/app/analytics/sources/mock`

### What this page should answer

- where do I perform best or worst
- is my performance changing by learning source
- which sources expose which weaknesses

### Suggested content

- source-specific score trend
- subject breakdown inside source
- weak topics inside source
- question-type behavior inside source
- recent exams from this source
- teacher-specific breakdown when relevant


## 4. Source And Subject Breakdown

### Drill-down destination

`Source x Subject Matrix`

### Suggested route

- `/app/analytics/sources/[sourceKey]?subject=[subjectKey]`

### What this page should answer

- how do I perform in a specific subject under a specific source
- is this weakness universal or context-specific

### Suggested content

- selected source and subject header
- result trend in this combination
- weak topics within this combination
- weak question types within this combination
- recent exams matching this combination
- comparison against overall subject performance


## 5. Subject Performance

### Drill-down destination

`Subject Deep Dive`

### Suggested route

- `/app/analytics/subjects/[subjectKey]`

### What this page should answer

- what is my true status in this subject
- which chapters drive the result
- whether the weakness is topic-based, type-based, or difficulty-based

### Suggested content

- subject summary
- chapter or topic hierarchy
- strongest and weakest topics
- difficulty breakdown
- question-type breakdown
- recent subject-specific results
- action recommendations for this subject

### Why this is high priority

This is the most natural student mental model.

Students usually think in subjects before they think in data dimensions.


## 6. Recent Published Results

### Drill-down destination

`Result Comparison`

### Suggested route

- `/app/analytics/results/compare`

### Phase 2 output now live

- latest vs best vs lowest comparison
- published result ledger
- rank availability visibility
- pending publication count
- overall benchmark snapshot with clear labeling when filters are active

### What this page should answer

- why was this result better or worse than the last one
- what changed between recent exams
- which mistakes are repeating

### Suggested content

- last 3 to 5 result comparison
- topic movement between attempts
- question-type movement between attempts
- score, accuracy, and skip deltas
- strongest gains
- repeated losses


## 7. Topic Performance

This block already has a natural drill-down pattern and should become one of the strongest analytics flows.


### Drill-down destination

`Topic Deep Dive`

### Suggested route

- `/app/analytics/topics/[topicKey]`

### What this page should answer

- why is this topic weak or strong
- which exact questions define the topic signal
- what kind of practice is needed

### Suggested content

- topic summary
- question table for this topic
- wrong vs skipped questions
- difficulty distribution inside the topic
- question-type distribution inside the topic
- average time spent
- benchmark comparison if available
- recommended practice linked to this topic

### Important note

The existing `/app/analytics/questions` route already proves this drill-down model is valid.

That route can either:

- remain the shared filtered question table under the hood, or
- evolve into the data layer behind `Topic Deep Dive`


## 8. Question-Type Risk

### Drill-down destination

`Question-Type Lab`

### Suggested route

- `/app/analytics/question-types/[questionType]`

### What this page should answer

- am I losing marks because of format, not just knowledge
- which question types lead to wrong answers, skips, or slow completion

### Suggested content

- accuracy by question type
- skip rate by question type
- average time by question type
- easy vs hard performance in this type
- filtered question list
- practice recommendations for this type


## 9. Insight Messages

### Drill-down destination

`Insight Evidence`

### Suggested route

- `/app/analytics/insights/[insightKey]`

### What this page should answer

- why did the system generate this message
- which records support the insight
- what should the student do after reading it

### Suggested content

- insight statement
- supporting metrics
- supporting topics
- supporting recent questions or exams
- recommended next action

### Why this matters

Without evidence, insights can feel decorative.

With evidence, insights become trustworthy.


## Drill-Down Build Priority

## Phase 1: Highest-Value Drill-Downs

These create the strongest improvement in usefulness with the least product sprawl.

1. subject deep dive
2. topic deep dive
3. question-type lab
4. performance timeline
5. improvement action center

### Why this order

- subject and topic are the most intuitive student navigation paths
- question-type exposes behavior patterns the current page only hints at
- timeline makes the KPI cards meaningful
- action center converts analytics into practice


## Phase 2: Comparison And Context Layers

1. result comparison
2. source detail
3. source x subject matrix
4. insight evidence

### Why this is second

These features are useful, but they depend on students already understanding the first-layer diagnostic pages.


## Data And API Expectations

## Can be built largely from existing or near-existing patterns

- topic deep dive
- subject deep dive
- question-type lab
- performance timeline
- action center

The existing analytics page and `/app/analytics/questions` route already provide the shape for filtered drill-down behavior.

## Likely needs stronger aggregation endpoints

- result comparison
- source detail trend analytics
- source x subject matrix analytics
- insight evidence payloads

## Benchmark-dependent extensions

Some drill-down pages should later support:

- school comparison
- city comparison
- state comparison
- program comparison

### Important benchmark rule

Where the product is meant to answer:

- where do I stand in class
- where do I stand in school
- where do I stand in city
- where do I stand in state

the correct metric should be percentile rank, not only peer average percentage.

### Implementation note

The current student benchmark payloads expose peer averages and peer accuracy rates.

That is useful for comparison context, but it is not a true percentile.

For public-facing benchmark UI, we should:

- use peer average wording where only average data exists
- reserve percentile wording for places where backend rank-distribution logic exists

### Phase 2 backend expectation

Add student percentile outputs for:

- class level
- school
- city
- state

This should be computed on the backend from peer result distributions, not guessed in the frontend.

These should be additive, not blocking, for the first implementation pass.


## Exam-Level Result And Rank Visibility Strategy

This analytics layer depends on a truthful result-visibility policy.

The current backend already treats result delivery as exam-level configuration through fields such as:

- `show_result_immediately`
- `result_publish_mode`
- `review_mode`

The same principle should be used for rank and percentile visibility.

### Product goal

Allow institutes or teachers to decide, per exam, whether students see:

- immediate score only
- immediate score plus provisional rank
- immediate score plus provisional percentile
- final rank only after exam closure
- final percentile only after exam closure

### Recommended exam-level controls

1. `rank_visibility_mode`
   Suggested values:
   - `hidden`
   - `provisional_after_submit`
   - `final_after_exam_closure`

2. `percentile_visibility_mode`
   Suggested values:
   - `hidden`
   - `provisional_after_submit`
   - `final_after_exam_closure`

3. `benchmark_visibility_mode`
   Suggested values:
   - `hidden`
   - `peer_average_only`
   - `peer_average_plus_percentile`

4. `rank_freeze_policy`
   Suggested values:
   - `rolling_until_exam_closure`
   - `freeze_on_exam_closure`

### Recommended public-facing copy rules

- If rank is visible before exam closure:
  show `Provisional rank`

- If percentile is visible before exam closure:
  show `Provisional percentile`

- If the exam is still open and final ranking is deferred:
  show `Final rank pending exam closure`

- If percentile is not available but benchmark averages are:
  show `Peer average available now, rank updates later`

### Why this matters

In rolling-participation exams, more students may submit after an earlier student has already seen a result.

That means:

- rank can move
- percentile can move
- peer averages can move

The UI must reflect that truth explicitly instead of implying that early rank is final.

### Implementation direction

This should be stored as explicit exam delivery configuration, not inferred only from analytics screens.

That keeps:

- teacher intent clear
- student messaging consistent
- result visibility rules reusable across results, review, dashboard, and analytics

### Recommended default

For most public-facing school exams:

- score visibility: immediate if allowed by exam policy
- rank visibility: `final_after_exam_closure`
- percentile visibility: `final_after_exam_closure`
- benchmark visibility: `peer_average_only`

For practice or informal drills:

- score visibility: immediate
- rank visibility: `hidden`
- percentile visibility: `hidden`
- benchmark visibility: `peer_average_only`


## Frontend Delivery Approach

## Page strategy

Do not create eight completely different heavy pages immediately.

Instead create a reusable analytics detail system with:

- shared filter header
- shared summary strip
- reusable question table
- reusable breakdown cards
- reusable benchmark block
- reusable action CTA block

## Component direction

Suggested reusable building blocks:

- `StudentAnalyticsDetailHeader`
- `StudentAnalyticsFilterBar`
- `StudentAnalyticsQuestionTable`
- `StudentAnalyticsTrendPanel`
- `StudentAnalyticsBreakdownPanel`
- `StudentAnalyticsBenchmarkPanel`
- `StudentAnalyticsActionPanel`

This keeps the new drill-down experience consistent and faster to extend.


## What To Test Now

### After Phase 1

- open `/app/analytics` and confirm KPI cards open the timeline page
- open a weak topic and confirm the topic page only shows matching question evidence
- open a question type and confirm the format page shows benchmark, topic, and difficulty breakdown
- open a subject and confirm the page uses real question and topic data only

### After Phase 2

- click any row in `Performance by Source` and confirm the source detail page opens with matching real records
- click any row in `Source and Subject Breakdown` and confirm the page is scoped to that exact source plus subject combination
- click `Compare results` in `Recent Published Results` and confirm best, latest, lowest, and published ledger values match `/app/results`
- verify that rank shows `pending` where backend has not exposed rank yet
- verify benchmark cards still say `peer average` and `peer accuracy`, not percentile


## Success Criteria

We should consider this drill-down expansion successful if:

1. the summary page remains fast to scan
2. every major analytics block has an intentional next destination
3. students can move from weak signal to exact questions
4. students can move from diagnosis to practice without guessing
5. the product answers not only what is weak, but why and what next


## Recommended Immediate Next Step

Implement the first drill-down cluster around the sections that already feel closest to real action:

1. topic performance
2. question-type risk
3. subject performance
4. KPI trend cards
5. hero action center

This gives the current analytics page a clear second layer without forcing a full analytics rewrite.
