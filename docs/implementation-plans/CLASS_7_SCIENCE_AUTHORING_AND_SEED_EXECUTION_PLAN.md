# Class 7 Science Authoring And Seed Execution Plan

## Objective

Turn the Class 7 Science chapter registry into actual seedable question-bank content using the same markdown-first workflow already used for curated Math packs.

## Scope

Target NCERT-facing Class 7 Science chapter coverage:

1. Nutrition in Plants
2. Nutrition in Animals
3. Heat
4. Acids, Bases and Salts
5. Physical and Chemical Changes
6. Respiration in Organisms
7. Transportation in Animals and Plants
8. Reproduction in Plants
9. Motion and Time
10. Electric Current and Its Effects
11. Light
12. Forests: Our Lifeline
13. Wastewater Story

## Current Implementation Status

### Already available as internal seeded topic families

- `SCI-LIFE-PLANTS`
- `SCI-LIFE-ANIMALS`
- `SCI-PHYSICS-HEAT`
- `SCI-MATTER-ACIDBASE`
- `SCI-MATTER-CHANGES`
- `SCI-MOTION-MOTION`
- `SCI-MOTION-TIME`
- `SCI-PHYSICS-ELECTRICITY`
- `SCI-PHYSICS-LIGHT`

### Newly added as chapter-ready topic codes

- `SCI-LIFE-RESPIRATION`
- `SCI-LIFE-TRANSPORT`
- `SCI-LIFE-PLANT-REPRODUCTION`
- `SCI-ENV-FORESTS`
- `SCI-ENV-WASTEWATER`

## Authoring Strategy

### Visible chapter logic

Use NCERT chapter names in school-facing browsing and reporting.

### Internal pack logic

Keep internal topic-code packs as the authoring and seeding unit.

Examples:

- `Nutrition in Plants` maps to `SCI-LIFE-PLANTS`
- `Motion and Time` maps to:
  - `SCI-MOTION-MOTION`
  - `SCI-MOTION-TIME`

## Workflow

### Phase 1. Generate scaffolds

Generate or refresh template JSON packs for Science topics:

```bash
python manage.py generate_curated_topic_pack_templates \
  --preset class_7_cbse_core \
  --subjects science \
  --overwrite \
  --question-count 50
```

Generate markdown authoring packs from template JSON:

```bash
python manage.py generate_curated_topic_authoring_markdown \
  --topic-codes \
  SCI-LIFE-PLANTS \
  SCI-LIFE-ANIMALS \
  SCI-PHYSICS-HEAT \
  SCI-MATTER-ACIDBASE \
  SCI-MATTER-CHANGES \
  SCI-LIFE-RESPIRATION \
  SCI-LIFE-TRANSPORT \
  SCI-LIFE-PLANT-REPRODUCTION \
  SCI-MOTION-MOTION \
  SCI-MOTION-TIME \
  SCI-PHYSICS-ELECTRICITY \
  SCI-PHYSICS-LIGHT \
  SCI-ENV-FORESTS \
  SCI-ENV-WASTEWATER \
  --overwrite
```

### Phase 2. Author questions

Author real questions in:

`edutech_backend/question_blueprints/class_7/curated_authoring/math_science_v2/`

Rules:

- exactly `50` questions per topic pack
- no placeholder text
- no visible duplicate stems across chapter packs
- no near-duplicate number-swaps
- keep school-level language natural and direct

### Phase 3. Lint and compile

Per topic or batch:

```bash
python manage.py lint_curated_topic_authoring_markdown \
  --files question_blueprints/class_7/curated_authoring/math_science_v2/SCI-LIFE-PLANTS.md \
  --expected-count 50
```

```bash
python manage.py compile_curated_topic_authoring_markdown \
  --files question_blueprints/class_7/curated_authoring/math_science_v2/SCI-LIFE-PLANTS.md \
  --expected-count 50
```

### Phase 4. Seed to institute

Use the new convenience command:

```bash
python manage.py seed_curated_class7_science_from_markdown DLI001 \
  --expected-count 50 \
  --replace-existing
```

For only selected topics:

```bash
python manage.py seed_curated_class7_science_from_markdown DLI001 \
  --topic-codes SCI-LIFE-RESPIRATION SCI-ENV-FORESTS \
  --expected-count 50 \
  --replace-existing
```

## Recommended Authoring Order

### Wave 1. Highest reuse from existing content families

1. `SCI-LIFE-PLANTS`
2. `SCI-LIFE-ANIMALS`
3. `SCI-PHYSICS-HEAT`
4. `SCI-MATTER-ACIDBASE`
5. `SCI-MATTER-CHANGES`
6. `SCI-MOTION-MOTION`
7. `SCI-MOTION-TIME`
8. `SCI-PHYSICS-ELECTRICITY`
9. `SCI-PHYSICS-LIGHT`

### Wave 2. New chapter lanes

10. `SCI-LIFE-RESPIRATION`
11. `SCI-LIFE-TRANSPORT`
12. `SCI-LIFE-PLANT-REPRODUCTION`
13. `SCI-ENV-FORESTS`
14. `SCI-ENV-WASTEWATER`

## Product Mapping Notes

### One-to-one visible mapping

- `SCI-LIFE-PLANTS` -> `Nutrition in Plants`
- `SCI-LIFE-ANIMALS` -> `Nutrition in Animals`
- `SCI-PHYSICS-HEAT` -> `Heat`
- `SCI-MATTER-ACIDBASE` -> `Acids, Bases and Salts`
- `SCI-MATTER-CHANGES` -> `Physical and Chemical Changes`
- `SCI-LIFE-RESPIRATION` -> `Respiration in Organisms`
- `SCI-LIFE-TRANSPORT` -> `Transportation in Animals and Plants`
- `SCI-LIFE-PLANT-REPRODUCTION` -> `Reproduction in Plants`
- `SCI-PHYSICS-ELECTRICITY` -> `Electric Current and Its Effects`
- `SCI-PHYSICS-LIGHT` -> `Light`
- `SCI-ENV-FORESTS` -> `Forests: Our Lifeline`
- `SCI-ENV-WASTEWATER` -> `Wastewater Story`

### One visible chapter using two internal packs

- `Motion and Time`
  - `SCI-MOTION-MOTION`
  - `SCI-MOTION-TIME`

## Acceptance Criteria

- all `14` internal Science topic packs are present as markdown authoring files
- all authored packs lint successfully
- all authored packs compile successfully
- all seeded packs create verified platform-quality question rows
- school-facing product can browse using the NCERT chapter names
- chapter packs do not share duplicate visible questions

## What Still Remains After This Plan File

This plan enables the workflow, but the actual content still needs to be written:

- real authored question text
- explanations
- distractors
- duplicate review
- seed execution
