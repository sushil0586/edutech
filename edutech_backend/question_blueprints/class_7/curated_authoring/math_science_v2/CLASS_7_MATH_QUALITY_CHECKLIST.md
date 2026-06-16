# Class 7 Math Quality Checklist

Use this checklist before compiling or seeding any Class 7 Math topic pack.

For curated Math content, Markdown is the source of truth.

## Goal

Ship only topic packs that are:

- correct
- distinct
- student-friendly
- difficulty-balanced
- seed-ready

## Per-Topic Gate

A topic is ready only when every item below is true.

### Content completeness

- the file has exactly `50` question blocks
- there is no `[AUTHORING REQUIRED]` text left
- every question has a real explanation
- every short-answer item has accepted answers
- every MCQ or true-false item has valid options

### Difficulty distribution

- `10` foundation questions
- `20` intermediate questions
- `20` advanced questions

### Distinctness

- no repeated stem with only number swaps
- no repeated distractor pattern
- no repeated worked-example pattern
- no repeated real-life story unless the solving experience is clearly different
- no repeated archetype beyond the allowed threshold for the pack
- the pack feels varied to a student from start to finish

### Learning quality

- each question tests a real concept, not just surface memorization
- distractors are believable but clearly wrong for a mathematical reason
- explanations teach the method, not just the answer
- language is simple, direct, and class-appropriate
- numbers used are clean, realistic, and intentional

### Format quality

- question text is unambiguous
- there is only one correct answer for `mcq_single`
- there is at least one correct answer for `mcq_multiple`
- `true_false` questions are genuinely conceptual, not trivial
- accepted answers cover reasonable formatting variants

## Review Flow

Use this order for each topic:

1. Author the full Markdown pack.
2. Self-review against this checklist.
3. Peer-review for math correctness and repetition.
4. Run lint.
5. Compile.
6. Seed the single topic into DB.
7. Spot-check the seeded questions in DB.

## Commands

Lint one topic:

```bash
.venv/bin/python manage.py lint_curated_topic_authoring_markdown \
  --files question_blueprints/class_7/curated_authoring/math_science_v2/TOPIC_CODE.md \
  --expected-count 50
```

Compile one topic:

```bash
.venv/bin/python manage.py compile_curated_topic_authoring_markdown \
  --files question_blueprints/class_7/curated_authoring/math_science_v2/TOPIC_CODE.md \
  --expected-count 50
```

Run the full topic flow:

```bash
.venv/bin/python manage.py seed_curated_class7_math_from_markdown DLI001 \
  --topic-codes TOPIC_CODE \
  --expected-count 50 \
  --replace-existing
```

## Batch Gate

Before running all topics together:

- every topic has passed the per-topic gate
- every topic has been seeded successfully at least once on its own
- DB spot-checks are complete for each finished topic
- no known duplicate or ambiguity issues remain open

## Recommended Rollout

Use this batch order:

1. Numbers
2. Arithmetic
3. Algebra
4. Geometry
5. Fractions
6. Logic

Only run the all-topics command after all topics in the batch sequence have individually passed.
