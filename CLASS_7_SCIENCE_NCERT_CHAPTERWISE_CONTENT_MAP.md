# Class 7 Science NCERT Chapterwise Content Map

## Objective

Use a clean school taxonomy for Class 7 Science content:

- `Class 7`
- `Science`
- `Chapter`
- `Question Pack`

For school content, the business meaning should be:

- `Class` = academic grade, for example `Class 7`
- `Subject` = `Science`
- `Chapter` = the curriculum teaching unit visible to institutes, teachers, and students
- `Question Pack` = the authored question bank used for chapter tests, practice work, assignments, and mixed exams

## Canonical Structure

Recommended school hierarchy:

`Class 7 -> Science -> Chapter -> Questions`

Recommended implementation rule:

- every question must belong to exactly one chapter-level pack
- the same visible question text must not be reused across two chapter packs
- near-duplicate stem families should also be treated as duplicates

## Current Repo Reality

The repo already has Class 7 Science topic blueprints under:

`edutech_backend/question_blueprints/class_7/topics/science/`

These are useful and high-signal, but several are internal concept-family names rather than direct NCERT chapter names.

So for school mode, we should keep the internal topic strength while exposing a chapter-first NCERT structure.

## NCERT Chapterwise Mapping

### 1. Nutrition in Plants

Status: `Covered through internal topic family`

Current repo alignment:

- `LIFE_PROCESSES_IN_PLANTS_QUESTION_BLUEPRINT.md`
- topic code: `SCI-LIFE-PLANTS`

Recommended school treatment:

- visible chapter name: `Nutrition in Plants`
- keep internal topic family broad enough to include photosynthesis, needs of plants, and related observation-based reasoning

### 2. Nutrition in Animals

Status: `Covered through internal topic family`

Current repo alignment:

- `LIFE_PROCESSES_IN_ANIMALS_QUESTION_BLUEPRINT.md`
- topic code: `SCI-LIFE-ANIMALS`

Recommended school treatment:

- visible chapter name: `Nutrition in Animals`
- use existing family for ingestion, digestion, teeth, and feeding-system reasoning

### 3. Heat

Status: `Covered through internal topic family`

Current repo alignment:

- `HEAT_TRANSFER_IN_NATURE_QUESTION_BLUEPRINT.md`
- topic code: `SCI-PHYSICS-HEAT`

Recommended school treatment:

- visible chapter name: `Heat`
- internal family can still cover conduction, convection, radiation, temperature sense, and daily-life transfer situations

### 4. Acids, Bases and Salts

Status: `Covered through internal topic family`

Current repo alignment:

- `ACIDIC_BASIC_AND_NEUTRAL_SUBSTANCES_QUESTION_BLUEPRINT.md`
- topic code: `SCI-MATTER-ACIDBASE`

Recommended school treatment:

- visible chapter name: `Acids, Bases and Salts`
- keep indicator, neutralization, and safe-handling logic in this pack

### 5. Physical and Chemical Changes

Status: `Covered`

Current repo alignment:

- `PHYSICAL_AND_CHEMICAL_CHANGES_QUESTION_BLUEPRINT.md`
- topic code: `SCI-MATTER-CHANGES`

Recommended school treatment:

- direct one-chapter mapping

### 6. Respiration in Organisms

Status: `Gap in direct chapter registry`

Current repo alignment:

- partially overlaps with `LIFE_PROCESSES_IN_ANIMALS`
- not represented as its own chapter blueprint yet

Recommended school treatment:

- create a dedicated chapter blueprint for `Respiration in Organisms`
- keep breathing, respiration, aerobic / anaerobic basics, and organism comparison inside this chapter pack only

### 7. Transportation in Animals and Plants

Status: `Gap in direct chapter registry`

Current repo alignment:

- partially overlaps with `LIFE_PROCESSES_IN_ANIMALS`
- partially overlaps with `LIFE_PROCESSES_IN_PLANTS`
- not represented as its own chapter blueprint yet

Recommended school treatment:

- create a dedicated chapter blueprint for `Transportation in Animals and Plants`
- keep blood circulation and plant transport comparisons together in one visible school chapter

### 8. Reproduction in Plants

Status: `Gap in direct chapter registry`

Current repo alignment:

- light overlap with plant-life topic family
- no dedicated chapter blueprint yet

Recommended school treatment:

- create a dedicated chapter blueprint for `Reproduction in Plants`
- keep vegetative propagation, seeds, spores, pollination, and dispersal in this chapter pack

### 9. Motion and Time

Status: `Covered through chapter split`

Current repo alignment:

- `MOTION_IN_EVERYDAY_LIFE_QUESTION_BLUEPRINT.md`
- `MEASUREMENT_OF_TIME_QUESTION_BLUEPRINT.md`
- topic codes:
  - `SCI-MOTION-MOTION`
  - `SCI-MOTION-TIME`

Recommended school treatment:

- visible chapter name: `Motion and Time`
- internally retain two concept families because motion and time measurement author differently

### 10. Electric Current and Its Effects

Status: `Covered through internal topic family`

Current repo alignment:

- `ELECTRIC_CIRCUITS_AND_COMPONENTS_QUESTION_BLUEPRINT.md`
- topic code: `SCI-PHYSICS-ELECTRICITY`

Recommended school treatment:

- visible chapter name: `Electric Current and Its Effects`
- keep simple circuit, heating effect, magnetic effect, and safety reasoning in this family

### 11. Light

Status: `Covered through internal topic family`

Current repo alignment:

- `LIGHT_SHADOWS_AND_REFLECTIONS_QUESTION_BLUEPRINT.md`
- topic code: `SCI-PHYSICS-LIGHT`

Recommended school treatment:

- visible chapter name: `Light`
- keep reflection, shadow, source, path, and observation-based reasoning within this chapter pack

### 12. Forests: Our Lifeline

Status: `Gap in direct chapter registry`

Current repo alignment:

- no dedicated chapter blueprint found

Recommended school treatment:

- create a dedicated chapter blueprint for `Forests: Our Lifeline`
- keep ecosystem interdependence, forest roles, food chains, and conservation logic in this chapter

### 13. Wastewater Story

Status: `Gap in direct chapter registry`

Current repo alignment:

- no dedicated chapter blueprint found

Recommended school treatment:

- create a dedicated chapter blueprint for `Wastewater Story`
- keep sanitation, treatment flow, pollution prevention, and hygiene logic in this chapter pack

## Recommended School-Facing Chapter List

Use this visible chapter list for:

- student browsing
- teacher chapter selection
- institute chapter tests
- chapter-based packages and subscriptions

Recommended list:

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

## Practical Product Rule

For school mode:

- students and institutes should see NCERT chapter names
- internal generator or seed families may stay split where that improves content quality
- chapter exams may pull from one or more internal packs only when they all belong to the same visible chapter

Example:

- `Motion and Time`
  - can internally pull from:
    - `SCI-MOTION-MOTION`
    - `SCI-MOTION-TIME`

But:

- `Nutrition in Plants`
  - should not silently mix with `Reproduction in Plants`
  - because those are separate NCERT teaching chapters

## Repo Gaps To Close

Direct chapter-ready blueprint gaps:

- `Respiration in Organisms`
- `Transportation in Animals and Plants`
- `Reproduction in Plants`
- `Forests: Our Lifeline`
- `Wastewater Story`

Chapter-name alignment gaps where visible label should change even if core content already exists:

- `Nutrition in Plants`
- `Nutrition in Animals`
- `Heat`
- `Acids, Bases and Salts`
- `Motion and Time`
- `Electric Current and Its Effects`
- `Light`

## Recommended Next Steps

1. define all `13` NCERT Class 7 Science chapters in the visible chapter registry
2. keep existing reusable internal science topic families where the mapping is already strong
3. create dedicated new blueprints for the `5` uncovered chapters
4. author chapter-level question packs without duplicate visible stems across chapters
5. seed chapter packs into the canonical platform question bank before institute rollout
