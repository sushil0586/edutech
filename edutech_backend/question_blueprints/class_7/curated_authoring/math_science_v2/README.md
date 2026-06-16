# Class 7 Curated Markdown Authoring

This folder is the human-friendly authoring layer for curated Class 7 Math and Science question packs.

For curated Math authoring, this Markdown folder is the source of truth.

Use this path when:

- content writers need to draft or review questions
- you want easier version control than raw JSON
- you want linting before compile and seed

## Workflow

1. Generate a markdown authoring file from the template scaffold.
2. Replace all placeholder text with real authored questions.
3. Lint the markdown file.
4. Compile the markdown file into the final JSON pack.
5. Seed the compiled JSON pack into the database.

## Commands

Generate markdown authoring files:

```bash
python manage.py generate_curated_topic_authoring_markdown \
  --topic-codes MATH-NUMBERS-LARGE MATH-NUMBERS-PLACE
```

Lint markdown authoring files:

```bash
python manage.py lint_curated_topic_authoring_markdown \
  --files \
  question_blueprints/class_7/curated_authoring/math_science_v2/MATH-NUMBERS-LARGE.md \
  question_blueprints/class_7/curated_authoring/math_science_v2/MATH-NUMBERS-PLACE.md \
  --expected-count 50
```

Compile markdown authoring files into final JSON:

```bash
python manage.py compile_curated_topic_authoring_markdown \
  --files \
  question_blueprints/class_7/curated_authoring/math_science_v2/MATH-NUMBERS-LARGE.md \
  question_blueprints/class_7/curated_authoring/math_science_v2/MATH-NUMBERS-PLACE.md \
  --expected-count 50
```

Seed the compiled JSON packs:

```bash
python manage.py seed_curated_math_science_questions DLI001 \
  --subjects math \
  --topic-codes MATH-NUMBERS-LARGE MATH-NUMBERS-PLACE \
  --questions-per-topic 50 \
  --replace-existing
```

Run the full Markdown-first flow for all Class 7 Math topics with one command:

```bash
python manage.py seed_curated_class7_math_from_markdown DLI001 \
  --expected-count 50 \
  --replace-existing
```

## Source Of Truth

- author and review questions in Markdown
- treat compiled JSON as a generated seeding artifact
- avoid editing compiled JSON directly unless there is a special recovery case

Use the production review checklist here before compile or seed:

- [CLASS_7_MATH_QUALITY_CHECKLIST.md](./CLASS_7_MATH_QUALITY_CHECKLIST.md)

## Authoring Format

Each file contains:

- topic header fields
- one `## Question N` block per item
- `Question Text:`
- `Explanation:`
- `Options:` for MCQ or `Accepted Answers:` for short-answer

The compiler rejects:

- `[AUTHORING REQUIRED]`
- `TODO`
- `placeholder`
- prompt-style instruction text such as `Create a ...`

Only fully authored markdown files should be compiled.
