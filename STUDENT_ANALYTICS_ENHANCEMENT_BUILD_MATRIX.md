# Student Analytics Enhancement Build Matrix

## Goal

Turn the current student analytics page from a summary dashboard into a practical analytics workspace that answers:

1. How am I doing overall?
2. Which exact question patterns am I weak in?
3. Compared to school, city, state, and level, where do I stand?
4. Why am I losing marks?
5. What should I do next?

Related planning document:

- [STUDENT_ANALYTICS_DRILLDOWN_PLAN.md](/Users/ansh/Documents/Eductech/STUDENT_ANALYTICS_DRILLDOWN_PLAN.md:1)


## Current Build Status

### Implemented

- Phase 1 drill-downs
  - timeline
  - action center
  - subject deep dive
  - topic deep dive
  - question-type deep dive
- Phase 2 drill-downs
  - source detail
  - result comparison
- exam-level result visibility policy inputs
  - provisional rank visibility
  - final rank visibility
  - provisional percentile visibility policy placeholder
  - benchmark visibility mode
  - rank freeze policy

### Important truthfulness constraint

- current student-facing benchmark data is average and accuracy based
- true percentile should only be shown after backend percentile support is implemented
- current UI copy has been adjusted to reflect this


## Current State Review

### Current frontend analytics page already shows

- overall percentage and accuracy
- recent exam history
- strongest subjects
- weakest subjects
- weak topics
- weak question types
- insight messages
- source-level filtering
- subject-level filtering

### Current backend data already available

- `ExamResult`
  - overall score
  - percentage
  - correct / incorrect / skipped counts
  - total exam time
  - rank
  - publish state
- `StudentTopicPerformance`
  - subject-wise and topic-wise performance
  - attempted / correct / incorrect / skipped counts
- `StudentAnswer`
  - question attempted or skipped
  - correctness
  - selected answer(s)
  - answer text
  - marked for review
  - answered at
  - time spent per question
- `Question`
  - question type
  - difficulty level
  - subject
  - topic
  - metadata
- `Institute`
  - city
  - state
  - country

### Important existing backend capability

There is already a teacher-side exam question analysis pattern in:

- `edutech_backend/apps/results/views/__init__.py`

This proves question-level aggregation is already conceptually accepted in the codebase.


## Gaps In The Current Student Analytics Experience

### UX gaps

- summary cards are mostly dead-end blocks
- no click-through from topic to actual questions
- no question-level analytics table
- no benchmarking against school / city / state
- no difficulty-layer analysis
- no time-efficiency analysis
- no mistake pattern analysis
- no direct action workflow from analytics to practice or retry
- no exam-level control for provisional vs final rank visibility
- no exam-level control for provisional vs final percentile visibility

### Data contract gaps

- no student-facing question analytics endpoint
- no benchmark aggregation endpoints
- no category taxonomy for questions
- no formal error-reason classification


## Build Matrix

## A. Can Build Now With Existing Schema

These features are feasible with current models and only require frontend work plus moderate API work.

### A1. My Question Analytics

Student-facing question table showing:

- question text summary
- subject
- topic
- question type
- difficulty
- result: correct / wrong / skipped
- marked for review
- time spent
- last attempted exam
- marks awarded / negative marks

#### Why this is feasible

- `StudentAnswer` already stores correctness, review mark, answer timestamp, and per-question time
- `Question` already stores type, difficulty, subject, topic
- attempt / exam relation already exists

#### Work needed

- new student question analytics endpoint
- frontend table with filters and sorting

#### Suggested filters

- subject
- topic
- question type
- difficulty
- result status
- marked for review

#### Suggested sorts

- most wrong
- most skipped
- highest time spent
- latest attempted


### A2. Weak Questions Panels

Practical student widgets:

- most skipped questions
- most time-consuming questions
- easy questions answered wrong
- marked-for-review but still wrong
- most recently wrong questions

#### Why this is feasible

Derived directly from `StudentAnswer + Question + Exam`.


### A3. Difficulty-Level Analytics

Show:

- foundation accuracy
- intermediate accuracy
- advanced accuracy
- skip rate by difficulty
- average time by difficulty

#### Why this is feasible

`Question.difficulty_level` already exists.


### A4. Topic x Difficulty Matrix

Examples:

- Fractions: Foundation 80%, Intermediate 52%, Advanced 31%
- Algebra: Foundation 71%, Intermediate 61%, Advanced 43%

#### Why this is feasible

Can be aggregated from `StudentAnswer` joined with `Question.topic` and `Question.difficulty_level`.


### A5. Stronger Question-Type Analytics

Upgrade current question-type risk to include:

- accuracy by type
- skip rate by type
- average time by type
- total attempts by type
- recent trend by type

#### Why this is feasible

`Question.question_type` and `StudentAnswer.time_spent_seconds` already exist.


### A6. Action Center From Analytics

Suggested action cards:

- retry wrong questions
- revise weak topic
- take medium-difficulty drill
- improve skip-heavy question type
- reattempt marked-for-review items

#### Why this is feasible

Uses existing analytics plus existing exam/practice routing patterns.


## B. Needs New Backend APIs, But Not New Core Schema

These are realistic next-step improvements. They need aggregation endpoints and possibly materialized summaries, but the base data already exists.

### B0. Exam-Level Rank Visibility Policy

Add explicit exam-level controls for:

- provisional rank visibility
- final rank visibility after closure
- provisional percentile visibility
- final percentile visibility after closure
- benchmark visibility policy

#### Why this matters

When students submit across a longer window, rank and percentile can change as more attempts arrive.

The platform should not expose that behavior accidentally.

It should be an intentional exam delivery rule.

### B1. School Benchmark Analytics

Show:

- your percentile in school
- your topic accuracy vs school average
- your difficulty accuracy vs school average
- your question-type accuracy vs school average

#### Why feasible

- student belongs to institute
- institute grouping already exists
- results and answers already exist


### B2. City / State / Country Benchmark Analytics

Show:

- your percentile in city
- your percentile in state
- your percentile in country when available
- you vs city average
- you vs state average
- you vs country average

#### Why feasible

`Institute` already stores:

- city
- state
- country

This is enough to group student results geographically at institute level.


### B3. Question-Level Peer Correctness

For each question:

- your result
- school correct %
- city correct %
- state correct %

#### Why feasible

Can be computed from `StudentAnswer` grouped by question and institute geography.


### B4. Level Benchmarking

Show comparison by:

- class / program
- cohort / section
- board-aligned academic level if modeled by program/cohort

#### Why feasible

`StudentProfile` already links:

- academic year
- program
- cohort


### B5. Time Benchmarking

For a topic or question type:

- your avg time
- school avg time
- city avg time
- state avg time

#### Why feasible

`StudentAnswer.time_spent_seconds` and `ExamResult.time_taken_seconds` already exist.


## C. Needs Schema / Taxonomy Enrichment

These are the biggest upgrades for analytics maturity.

### C1. Question Category Taxonomy

Recommended standardized question categories:

- concept recall
- direct application
- multi-step problem solving
- reasoning
- case-based
- word problem
- speed-based
- calculation-heavy
- diagram-based
- trap / misconception-prone

#### Current state

- no dedicated category field
- some question metadata patterns exist
- metadata is too flexible to be dependable for reporting at scale

#### Recommendation

Add either:

- a formal `question_category` field

or

- structured metadata contract plus validation


### C2. Error Reason Classification

Target mistake reasons:

- concept gap
- careless error
- time pressure
- low-confidence skip
- review-stage failure
- reading / interpretation error

#### Current state

This is not modeled today.

#### Recommendation

Start as derived analytics logic first, then formalize if needed.


### C3. Confidence / Behavior Layer

Potential signals:

- first answer changed later
- wrong after review
- too-fast wrong
- too-slow wrong
- skipped after long hesitation
- fatigue drop late in exam

#### Current state

Some timing and review signals exist, but not the full event model needed for deep confidence analytics.


## UX Enhancement Matrix

## 1. Performance Overview

Keep and improve:

- overall accuracy
- score trend
- attempts
- skip discipline
- benchmark summary

## 2. Question Intelligence

Add a full table:

- question
- topic
- type
- difficulty
- your result
- time spent
- peer correctness
- retry action

## 3. Weakness Map

Add:

- weak topics
- weak types
- weak difficulties
- weak categories

## 4. Benchmark Panel

Add segmented comparisons:

- you
- school
- city
- state

across:

- topic
- type
- difficulty
- category

## 5. Mistake Patterns

Add:

- most skipped concepts
- easy-but-wrong
- slow-and-wrong
- rushed-and-wrong
- repeated wrong questions

## 6. Action Center

Add direct routes:

- retry wrong questions
- take recommended drill
- revise weak topic
- take timed mini-test


## Proposed API Additions

## Phase 1 APIs

### `GET /api/v1/student/analytics/question-performance/`

Filters:

- subject
- topic
- question_type
- difficulty_level
- result_status
- marked_for_review

Fields:

- question_id
- question_text_summary
- subject_name
- topic_name
- question_type
- difficulty_level
- total_attempts
- correct_attempts
- wrong_attempts
- skipped_attempts
- latest_result
- latest_time_spent_seconds
- marked_for_review_count
- latest_exam_id
- latest_exam_title


### `GET /api/v1/student/analytics/difficulty-breakdown/`

Fields:

- difficulty_level
- total_questions
- attempted_questions
- correct_answers
- incorrect_answers
- skipped_questions
- average_time_spent_seconds
- accuracy_percentage


### `GET /api/v1/student/analytics/question-type-breakdown/`

Fields:

- question_type
- total_questions
- correct_answers
- incorrect_answers
- skipped_questions
- average_time_spent_seconds
- accuracy_percentage
- skip_percentage


## Phase 2 APIs

### `GET /api/v1/student/analytics/benchmarks/`

Dimensions:

- subject
- topic
- question_type
- difficulty_level

Comparators:

- self
- school
- city
- state


### `GET /api/v1/student/analytics/question-benchmarks/`

Fields:

- question_id
- self_result
- school_correct_percentage
- city_correct_percentage
- state_correct_percentage
- school_sample_size
- city_sample_size
- state_sample_size


## Phase 3 APIs

### `GET /api/v1/student/analytics/category-breakdown/`

Requires question category standardization.

### `GET /api/v1/student/analytics/mistake-patterns/`

Derived behavior analytics endpoint.


## Privacy And Quality Guardrails

Benchmark analytics must not expose misleading or privacy-risky numbers.

### Recommended rules

- suppress school/city/state comparison if sample size is too low
- do not expose individual peer records
- round percentages where appropriate
- mark benchmark confidence as low / medium / high based on sample size
- make it clear whether comparison is by question attempts or by exam results


## Recommended Delivery Phases

## Phase 1: Highest ROI

Build first:

1. student question analytics table
2. weak question panels
3. difficulty-level breakdown
4. richer question-type breakdown
5. actionable recommendation cards

### Why first

This gives immediate practical value without waiting for category taxonomy or large benchmark infrastructure.


## Phase 2: Benchmark Intelligence

Build next:

1. school benchmarking
2. city benchmarking
3. state benchmarking
4. question-level peer correctness
5. time benchmarking

### Why second

This creates “context,” which is what makes analytics truly meaningful for students, parents, and institutes.


## Phase 3: Taxonomy Maturity

Build next:

1. question category standardization
2. category breakdown analytics
3. category benchmarking
4. stronger metadata validation


## Phase 4: Advanced Learning Intelligence

Build later:

1. mistake reason engine
2. confidence behavior signals
3. fatigue and timing patterns
4. adaptive recommendation engine


## Recommended Next Build Order By Effort

### Low effort / high impact

- remove dead links from analytics
- add drill-down links from topics to question tables
- add question-level student analytics endpoint
- add difficulty breakdown
- add improved question-type analytics

### Medium effort / very high impact

- school benchmark endpoint
- city/state benchmark endpoint
- question-level peer correctness
- action-center recommendations

### Higher effort / strategic

- formal question category taxonomy
- mistake reason classification
- confidence and fatigue analytics


## Suggested Product Direction

The best next version of student analytics should not become “more charts.”

It should become:

- a question intelligence workspace
- a benchmark intelligence workspace
- an action recommendation workspace

That will make the analytics page useful for:

- students
- parents
- teachers
- institute admins

from the same analytics backbone.
