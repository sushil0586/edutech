# SCI_PHYSICS Implementation Blueprint

This file is the implementation-ready blueprint for improving the `SCI-PHYSICS-*` question generator family.

Use it before editing:

- `apps/question_bank/management/curriculum_seed_support.py`

This family currently covers topic lanes such as:

- Electric Circuits and Components
- Heat Transfer in Nature
- Light, Shadows, and Reflections

## Current Problem

The current generator repeats too few practical patterns.

Typical issues:

- one repeated “hot spoon” explanation stem
- weak diversity across electricity, heat, and light
- too much reuse of one troubleshooting style

## Target Outcome

For each `SCI-PHYSICS-*` topic with `100` questions, aim for:

- at least `15 to 20` distinct visible stems
- `8+` pattern types
- strong practical situations
- better separation between electricity, heat, and light/reflection sub-concepts

## Foundation Variants

### 1. `circuit_completion_basic`

- type: `mcq_single`
- concept: simple open/closed circuit understanding

### 2. `conductor_insulator_choice`

- type: `mcq_single`
- concept: identify suitable material

### 3. `heat_transfer_basic`

- type: `mcq_single`
- concept: conductor vs insulator in everyday life

### 4. `light_shadow_basics`

- type: `mcq_single`
- concept: basic behavior of light and shadows

### 5. `mirror_reflection_basics`

- type: `true_false` or `mcq_single`
- concept: simple reflection and visibility ideas

## Intermediate Variants

### 6. `circuit_failure_reasoning`

- type: `mcq_multiple`
- concept: identify all causes of a failed bulb circuit

### 7. `heat_use_case_reasoning`

- type: `mcq_single`
- concept: explain heat-related material choice
- context: utensils, flasks, handles, clothes, roofing

### 8. `light_source_and_path`

- type: `mcq_single`
- concept: infer light behavior in a setup

### 9. `shadow_change_scenario`

- type: `mcq_single`
- concept: reason about shadow length or position changes

### 10. `practical_electricity_decision`

- type: `mcq_single`
- concept: choose best correction or best setup in a circuit

### 11. `misconception_correction_physics`

- type: `mcq_single`
- concept: correct a common wrong statement

## Advanced Variants

### 12. `assertion_reason_physics`

- type: `mcq_single`
- concept: cause-effect explanation
- sub-concepts:
  - conductors and insulators
  - current flow
  - heat transfer
  - reflection
  - shadows

### 13. `advanced_circuit_troubleshoot`

- type: `mcq_single`
- concept: infer the most likely error in a practical circuit case

### 14. `advanced_heat_transfer_case`

- type: `mcq_single`
- concept: compare material behavior in heat situations

### 15. `advanced_light_reasoning`

- type: `mcq_single`
- concept: infer reflection, visibility, shadow, or blockage outcome

### 16. `physics_multiselect_observations`

- type: `mcq_multiple`
- concept: select all correct observations from a situation

### 17. `best_explanation_physics`

- type: `mcq_single`
- concept: choose the best explanation, not just a true fact

### 18. `short_answer_physics_reason`

- type: `short_answer`
- concept: one-step explanation or inference

## Recommended Distribution For 100 Questions

Foundation:

- `circuit_completion_basic` -> `4`
- `conductor_insulator_choice` -> `4`
- `heat_transfer_basic` -> `4`
- `light_shadow_basics` -> `4`
- `mirror_reflection_basics` -> `4`

Intermediate:

- `circuit_failure_reasoning` -> `6`
- `heat_use_case_reasoning` -> `5`
- `light_source_and_path` -> `5`
- `shadow_change_scenario` -> `5`
- `practical_electricity_decision` -> `5`
- `misconception_correction_physics` -> `4`

Advanced:

- `assertion_reason_physics` -> `10`
- `advanced_circuit_troubleshoot` -> `9`
- `advanced_heat_transfer_case` -> `8`
- `advanced_light_reasoning` -> `8`
- `physics_multiselect_observations` -> `6`
- `best_explanation_physics` -> `5`
- `short_answer_physics_reason` -> `4`

## Variation Rules

Vary:

- classroom model setup
- kitchen and home objects
- school lab situations
- sports/daylight observation
- object material and use

Avoid repeating:

- one spoon question
- one bulb troubleshooting question
- one shadow question with only wording changes

## Quality Gate

After implementation, each `SCI-PHYSICS-*` topic should aim for:

- `15+` distinct visible texts minimum
- no single repeated stem above `15 to 20%`
- `8+` patterns
- clear sub-concept spread across electricity, heat, and light
