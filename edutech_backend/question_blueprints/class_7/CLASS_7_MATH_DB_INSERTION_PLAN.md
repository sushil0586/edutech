# Class 7 Math Curated DB Insertion Plan

## Objective

Insert curated Class 7 Math questions into the DB for all leaf topics using the existing curated pipeline, while ensuring:

- no repeated or near-duplicate questions
- coverage across all supported question types
- image-backed questions where useful
- predictable difficulty distribution
- topic-to-subject matching through the existing academic preset and topic codes

## Current Repo Reality

### Source of truth

For Class 7 Math, Markdown authoring files under `question_blueprints/class_7/curated_authoring/math_science_v2/` are the source of truth.

- authors should write and review content in Markdown
- compiled JSON should be treated as a generated seeding artifact
- direct JSON editing should be used only as an exception path

### Existing pipeline

The repo already has a curated flow:

1. generate template JSON
2. generate markdown authoring files
3. author and review questions
4. lint for placeholders and duplicate stems
5. compile markdown to curated JSON
6. seed curated JSON into DB

### Important limitation

The current curated seed command creates:

- `Question`
- `QuestionOption`

It does not currently create:

- `QuestionAttachment`
- `MasterQuestionAttachment`

That means "questions with images" is not fully supported by the current curated seeding command yet. We should extend the curated schema and seed command before final bulk insertion.

### Existing distinctness protection

Current linting already rejects near-duplicate stems inside one topic file by normalizing question text. This is useful, but it is only per file, not across all Math topics.

## Class 7 Math Topic Scope

There are 18 Class 7 Math leaf topics in the preset:

1. `MATH-NUMBERS-LARGE` - Large Numbers Around Us
2. `MATH-NUMBERS-SYSTEMS` - Indian and International Number Systems
3. `MATH-NUMBERS-PLACE` - Place Value and Comparison
4. `MATH-ARITH-EXPRESSIONS` - Arithmetic Expressions
5. `MATH-ARITH-ORDER` - Order of Operations
6. `MATH-ARITH-DECIMALS` - Decimals
7. `MATH-ALGEBRA-LETTERS` - Expressions using Letter-Numbers
8. `MATH-ALGEBRA-VARIABLES` - Variables and Expressions
9. `MATH-ALGEBRA-PATTERNS` - Patterns and Rules
10. `MATH-GEOMETRY-LINES` - Parallel and Intersecting Lines
11. `MATH-GEOMETRY-ANGLES` - Angles and Reasoning
12. `MATH-GEOMETRY-TRIANGLES` - Triangle Properties
13. `MATH-FRACTIONS-EQUIVALENT` - Equivalent Fractions
14. `MATH-FRACTIONS-MULTIPLY` - Multiplication of Fractions
15. `MATH-FRACTIONS-DIVIDE` - Division of Fractions
16. `MATH-LOGIC-NUMBERPLAY` - Number Play
17. `MATH-LOGIC-PATTERNS` - Patterns and Sequences
18. `MATH-LOGIC-PUZZLES` - Puzzles and Cryptarithms

## Decision Needed Before Authoring

The requested difficulty split is:

- `20%` foundation
- `40%` intermediate
- `30%` advanced

This totals `90%`, so we need one final agreed distribution before bulk authoring starts.

Recommended correction:

- `20%` foundation
- `40%` intermediate
- `40%` advanced

Reason:

- it preserves the requested foundation and intermediate weights
- it fills the missing 10% without weakening advanced coverage
- it maps cleanly to batches of `10`, `20`, `25`, or `50`

If we keep `25` questions per topic, the nearest integer split would be:

- `5` foundation
- `10` intermediate
- `10` advanced

If we keep `50` questions per topic, the exact split would be:

- `10` foundation
- `20` intermediate
- `20` advanced

## Variety Rule For Best Content

The core quality rule is:

- every question in a topic pack must feel materially different to a student
- no question should look like a recycled version of another with only number swaps
- no single pattern should dominate the pack

### Important clarification on the `4%` rule

If a topic pack has `25` questions, then `4%` is effectively `1` question.

That means the `4%` cap cannot be applied literally to broad `question_type` buckets like:

- `mcq_single`
- `mcq_multiple`
- `true_false`
- `short_answer`

Reason:

- the system only supports these four core question types
- every realistic pack will need more than one question from at least one type

So the best implementation is:

- apply the `4%` rule to repeated pattern families, not to the top-level DB question types

### Enforceable interpretation

For a `25`-question topic pack:

- one exact stem family should appear at most `1` time
- one archetype should usually appear at most `1` time
- a second use of the same archetype is allowed only if the solving experience is clearly different
- no repeated classroom story, image setup, or distractor style should appear more than `1` time

For a `50`-question topic pack:

- one repeated pattern family should appear at most `2` times
- one archetype should usually appear at most `2` times

### Working question-type distribution

We should still use all supported curated types across each topic pack:

- `mcq_single`
- `mcq_multiple`
- `true_false`
- `short_answer`

Recommended baseline per 25-question topic pack:

- `10` to `12` mcq_single
- `4` to `5` mcq_multiple
- `2` to `3` true_false
- `6` to `8` short_answer

Recommended baseline per 50-question topic pack:

- `20` to `24` mcq_single
- `8` to `10` mcq_multiple
- `4` to `6` true_false
- `12` to `16` short_answer

This gives the student a varied experience without forcing unnatural structure.

## Distinctness Strategy

Distinctness has to be enforced at three levels.

### 1. Within-topic distinctness

For each topic:

- no repeated stem structure with just number changes
- no repeated distractor pattern
- no repeated worked-example pattern
- no same concept tested in the same surface form more than once
- no repeated archetype more than once in a 25-question pack unless the second one uses a clearly different solving mode
- no repeated visual setup more than once in a 25-question pack

Example:

- avoid asking three decimal-place-value questions that only swap numbers

### 2. Cross-topic distinctness

Across all 18 Math topics:

- track archetype usage by topic
- track stem templates globally
- avoid the same classroom story reused across topics
- avoid the same image reused unless the topic goal is materially different

### 3. DB-level duplicate prevention

Before final seed:

- normalize question text
- compare against already curated Math questions in DB for Class 7
- flag exact duplicates
- flag near-duplicates with high text similarity

## Image Strategy

Images should be used where they genuinely improve the question, not as decoration.

Recommended image-heavy topics:

- `MATH-GEOMETRY-LINES`
- `MATH-GEOMETRY-ANGLES`
- `MATH-GEOMETRY-TRIANGLES`
- `MATH-LOGIC-PUZZLES`
- `MATH-LOGIC-PATTERNS`
- `MATH-NUMBERS-PLACE` for place-value charts or number cards
- `MATH-ARITH-ORDER` for expression cards or worked-step visuals

Recommended image usage target:

- `20%` to `35%` of questions per topic include an attachment

### Required implementation change for images

Extend curated authoring JSON/markdown to support:

```json
"attachments": [
  {
    "file_path": "question_blueprints/class_7/assets/math/MATH-GEOMETRY-ANGLES/q03-angle-diagram.png",
    "attachment_type": "diagram",
    "title": "Angle diagram",
    "alt_text": "Two intersecting rays forming labeled angles",
    "display_order": 1,
    "is_inline": true
  }
]
```

Then update the curated seeding command to:

1. validate attachment payload
2. create `QuestionAttachment`
3. mirror to `MasterQuestionAttachment` if master sync is expected to preserve attachments

## Execution Plan

### Phase 1. Finalize schema and rules

1. Confirm final difficulty split.
2. Confirm per-topic question count: `25` first, then scale to `50`.
3. Extend curated pack schema to include optional `attachments`.
4. Extend markdown authoring/compiler flow to parse and validate attachments.
5. Extend curated seed command to create question attachments.

### Phase 2. Build authoring inventory

1. Generate or refresh 50-question markdown authoring files for all 18 Math topic codes.
2. Create a single tracking sheet with:
   - topic code
   - topic name
   - target count
   - difficulty target
   - question-type target
   - image target
   - authoring status
   - review status
   - seed status

### Phase 3. Author topic packs in batches

Author in thematic batches:

1. Numbers
   - `MATH-NUMBERS-LARGE`
   - `MATH-NUMBERS-SYSTEMS`
   - `MATH-NUMBERS-PLACE`
2. Arithmetic
   - `MATH-ARITH-EXPRESSIONS`
   - `MATH-ARITH-ORDER`
   - `MATH-ARITH-DECIMALS`
3. Algebra
   - `MATH-ALGEBRA-LETTERS`
   - `MATH-ALGEBRA-VARIABLES`
   - `MATH-ALGEBRA-PATTERNS`
4. Geometry
   - `MATH-GEOMETRY-LINES`
   - `MATH-GEOMETRY-ANGLES`
   - `MATH-GEOMETRY-TRIANGLES`
5. Fractions
   - `MATH-FRACTIONS-EQUIVALENT`
   - `MATH-FRACTIONS-MULTIPLY`
   - `MATH-FRACTIONS-DIVIDE`
6. Logic
   - `MATH-LOGIC-NUMBERPLAY`
   - `MATH-LOGIC-PATTERNS`
   - `MATH-LOGIC-PUZZLES`

### Phase 4. Add automated validation

Add pre-seed checks for:

- exact duplicate stem within a file
- near-duplicate stem within a file
- repeated archetype over allowed threshold
- repeated stem-family over allowed threshold
- repeated image-context over allowed threshold
- near-duplicate stem across all Math curated files
- difficulty distribution mismatch
- question-type distribution mismatch
- missing accepted answers for short-answer items
- invalid option counts or correct-answer counts
- missing image files for attachment-backed questions

### Phase 5. Review and approval

For each topic pack:

1. content review
2. curriculum alignment review
3. duplicate review
4. image review
5. final lint and compile

Only approved packs move to DB seed.

### Phase 6. Seed into DB

Run seed by reviewed topic batches first, not all 18 topics at once.

Recommended order:

1. numbers
2. arithmetic
3. algebra
4. geometry
5. fractions
6. logic

Use `--replace-existing` only for the curated batch being refreshed.

## Suggested Commands

Generate templates:

```bash
.venv/bin/python manage.py generate_curated_topic_pack_templates --subjects math
```

Generate markdown authoring files:

```bash
.venv/bin/python manage.py generate_curated_topic_authoring_markdown \
  --topic-codes MATH-NUMBERS-LARGE MATH-NUMBERS-SYSTEMS MATH-NUMBERS-PLACE \
  MATH-ARITH-EXPRESSIONS MATH-ARITH-ORDER MATH-ARITH-DECIMALS \
  MATH-ALGEBRA-LETTERS MATH-ALGEBRA-VARIABLES MATH-ALGEBRA-PATTERNS \
  MATH-GEOMETRY-LINES MATH-GEOMETRY-ANGLES MATH-GEOMETRY-TRIANGLES \
  MATH-FRACTIONS-EQUIVALENT MATH-FRACTIONS-MULTIPLY MATH-FRACTIONS-DIVIDE \
  MATH-LOGIC-NUMBERPLAY MATH-LOGIC-PATTERNS MATH-LOGIC-PUZZLES
```

Lint after authoring:

```bash
.venv/bin/python manage.py lint_curated_topic_authoring_markdown \
  --files question_blueprints/class_7/curated_authoring/math_science_v2/*.md \
  --expected-count 25
```

Compile approved packs:

```bash
.venv/bin/python manage.py compile_curated_topic_authoring_markdown \
  --files question_blueprints/class_7/curated_authoring/math_science_v2/*.md \
  --expected-count 25
```

Seed approved Math topic packs:

```bash
.venv/bin/python manage.py seed_curated_math_science_questions DLI001 \
  --subjects math \
  --topic-codes MATH-NUMBERS-LARGE MATH-NUMBERS-SYSTEMS MATH-NUMBERS-PLACE \
  --questions-per-topic 25 \
  --replace-existing
```

## Acceptance Criteria

The plan is ready for execution when all of the following are true:

1. all 18 Class 7 Math topics have 50-question curated authoring files
2. the final difficulty split is agreed and measurable
3. question-type targets are defined per topic
4. image attachment support exists in the curated pipeline
5. duplicate checks run within-topic and cross-topic
6. repeated pattern-family usage stays within the approved threshold
6. every authored pack passes lint and compile
7. seed runs topic-by-topic without missing topic pack errors

## Recommended Next Step

Implement the pipeline support first, in this order:

1. add attachment support to curated authoring and seeding
2. add cross-topic duplicate detection for Math packs
3. generate all 18 Math authoring files
4. begin authoring and review in topic batches
