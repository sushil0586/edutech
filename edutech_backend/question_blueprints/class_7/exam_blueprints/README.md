# Class 7 Exam Blueprints

Use this folder for scriptable advanced exam blueprints that can be previewed or created through:

```bash
python manage.py create_advanced_exam_from_blueprint_file ...
```

This command uses the same backend service as the advanced exam builder UI.

## Workflow

1. Ensure the target institute already has seeded questions for the selected subject and topics.
2. Create or edit a blueprint JSON file in this folder.
3. Preview the blueprint first.
4. Create the exam after the preview resolves cleanly.

## Preview Example

```bash
python manage.py create_advanced_exam_from_blueprint_file \
  question_blueprints/class_7/exam_blueprints/class7_math_practice_01.json \
  --username demo-institute-admin \
  --preview-only
```

## Create Example

```bash
python manage.py create_advanced_exam_from_blueprint_file \
  question_blueprints/class_7/exam_blueprints/class7_math_practice_01.json \
  --username demo-institute-admin
```

## Important Rules

- `scope.subject_code` must match the subject that owns the seeded question bank items.
- every `topic_code` must belong to that subject
- `question_count` should not exceed the actual usable question pool
- `strict` selection mode is safest when you want no hidden fallback
- `end_at` must stay within the academic year end date

## Recommended Starting Pattern

Start with one simple draft exam:

- one subject
- one or two sections
- 10 to 20 questions
- strict selection mode
- draft status
- free economy policy first

After that, scale to:

- chapter tests
- mixed-topic practice sets
- premium mocks
- sectioned exams with different marking rules
