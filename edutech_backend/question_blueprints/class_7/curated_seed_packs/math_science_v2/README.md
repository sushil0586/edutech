# Class 7 Curated Math and Science Seed Packs

This folder is the source library for the new curated seeding command:

- `python manage.py seed_curated_math_science_questions ...`

This path is intentionally separate from the old generator-based scripts.

## Purpose

Use this folder for reviewed, topic-specific JSON packs that should be fed into the DB without relying on the older broad template generator.

For curated Math content, the Markdown files under `question_blueprints/class_7/curated_authoring/math_science_v2/` are the source of truth. The JSON files in this folder should be treated as compiled artifacts for seeding.

## Important Rule

Do not mix these files with the old seed logic.

This curated path should contain:

- reviewed topic packs
- explicit explanations
- stable options
- accepted answers for short-answer questions

## File Naming

Create one JSON file per leaf topic using the exact backend topic code:

- `MATH-NUMBERS-SYSTEMS.json`
- `SCI-MATTER-ACIDBASE.json`

## JSON Shape

```json
{
  "topic_code": "MATH-NUMBERS-SYSTEMS",
  "topic_name": "Indian and International Number Systems",
  "questions": [
    {
      "question_type": "mcq_single",
      "difficulty_level": "foundation",
      "question_text": "Question text here",
      "explanation": "Elaborative explanation here",
      "default_marks": "1.00",
      "negative_marks": "0.25",
      "options": [
        {"option_text": "Option A", "is_correct": false},
        {"option_text": "Option B", "is_correct": true},
        {"option_text": "Option C", "is_correct": false},
        {"option_text": "Option D", "is_correct": false}
      ],
      "metadata": {
        "archetype": "error_detection",
        "source_pack": "class7_curated_v2"
      }
    },
    {
      "question_type": "short_answer",
      "difficulty_level": "advanced",
      "question_text": "Short answer question here",
      "explanation": "Explain the method clearly",
      "default_marks": "2.00",
      "negative_marks": "0.00",
      "options": [],
      "metadata": {
        "accepted_answers": ["3,45,08,612", "34508612"],
        "archetype": "cross_system_conversion",
        "source_pack": "class7_curated_v2"
      }
    }
  ]
}
```

## Practical Workflow

Preferred workflow now:

1. Generate a markdown authoring file under `question_blueprints/class_7/curated_authoring/math_science_v2/`.
2. Draft and review the questions in markdown.
3. Lint the markdown file.
4. Compile the markdown file into the final JSON file here.
5. Run the curated seed command with `--replace-existing` when updating the same batch.

Markdown authoring commands:

```bash
python manage.py generate_curated_topic_authoring_markdown \
  --topic-codes MATH-NUMBERS-LARGE

python manage.py lint_curated_topic_authoring_markdown \
  --files question_blueprints/class_7/curated_authoring/math_science_v2/MATH-NUMBERS-LARGE.md \
  --expected-count 50

python manage.py compile_curated_topic_authoring_markdown \
  --files question_blueprints/class_7/curated_authoring/math_science_v2/MATH-NUMBERS-LARGE.md \
  --expected-count 50
```

Raw JSON editing should now be treated as an exception path, not the default content-entry flow.

If you want one command that runs lint, compile, and seed for all Class 7 Math Markdown packs, use:

```bash
.venv/bin/python manage.py seed_curated_class7_math_from_markdown DLI001 \
  --expected-count 50 \
  --replace-existing
```

If you first need a 50-slot authoring structure for every Math topic, use:

```bash
.venv/bin/python manage.py generate_curated_topic_pack_templates --subjects math --question-count 50
```

That command writes template-only packs into:

- `question_blueprints/class_7/curated_seed_packs/math_science_v2_templates/`

## Current Status

This folder is the new curated pipeline root.

Currently available starter packs:

- `MATH-NUMBERS-SYSTEMS.json` with `25` reviewed questions
- `SCI-MATTER-ACIDBASE.json` with `25` reviewed questions

Use these first with:

```bash
.venv/bin/python manage.py seed_curated_math_science_questions DLI001 \
  --subjects math science \
  --topic-codes MATH-NUMBERS-SYSTEMS SCI-MATTER-ACIDBASE \
  --questions-per-topic 25
```

The `50-per-topic` run will work only after each topic Markdown pack has been fully authored, linted, compiled, and the resulting JSON pack contains at least `50` reviewed questions.
