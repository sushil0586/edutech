# SCI_MOTION Implementation Blueprint

This file is the implementation-ready blueprint for improving the `SCI-MOTION-*` question generator family.

Use it before editing:

- `apps/question_bank/management/curriculum_seed_support.py`

This family currently covers topic lanes such as:

- Measurement of Time
- Motion in Everyday Life
- The Ever-Evolving World of Science

## Current Problem

The current generator repeats too few motion patterns.

Typical issues:

- repeated “same distance, half the time” comparison
- too much reuse of one speed formula pattern
- not enough table-based or observation-based motion reasoning

## Target Outcome

For each `SCI-MOTION-*` topic with `100` questions, aim for:

- at least `15 to 20` distinct visible stems
- at least `8` pattern types
- stronger mix of speed, time, uniform motion, and real travel situations

## Foundation Variants

### 1. `uniform_motion_basics`

- type: `mcq_single`
- concept: identify what must be compared for uniform motion

### 2. `time_measurement_basic`

- type: `mcq_single`
- concept: choose suitable time-measuring situation or tool

### 3. `faster_slower_identification`

- type: `mcq_single`
- concept: compare obvious speed differences

### 4. `distance_time_relation_basic`

- type: `true_false` or `mcq_single`
- concept: basic link between time, distance, and speed

## Intermediate Variants

### 5. `same_distance_compare_speed`

- type: `mcq_single`
- concept: same distance, different time reasoning

### 6. `same_time_compare_distance`

- type: `mcq_single`
- concept: same time, different distance reasoning

### 7. `table_based_motion_reading`

- type: `mcq_single`
- concept: read a simple distance-time table

### 8. `travel_scenario_reasoning`

- type: `mcq_single`
- concept: infer who is faster or whether motion is uniform

### 9. `measurement_choice_motion`

- type: `mcq_single`
- concept: decide what should be measured to compare motion properly

### 10. `misconception_correction_motion`

- type: `mcq_single`
- concept: correct a wrong motion statement

## Advanced Variants

### 11. `speed_computation_advanced`

- type: `short_answer`
- concept: compute speed from distance and time

### 12. `multi_factor_motion_case`

- type: `mcq_single`
- concept: compare more than one traveler or interval

### 13. `uniform_vs_nonuniform_case`

- type: `mcq_single`
- concept: infer uniform/non-uniform behavior from observation or table

### 14. `motion_multiselect`

- type: `mcq_multiple`
- concept: choose all true statements about motion data

### 15. `assertion_reason_motion`

- type: `mcq_single`
- concept: cause-effect and motion understanding

### 16. `best_explanation_motion`

- type: `mcq_single`
- concept: choose best explanation for a movement outcome

### 17. `short_answer_time_or_distance`

- type: `short_answer`
- concept: one-step compute time or distance

## Recommended Distribution For 100 Questions

Foundation:

- `uniform_motion_basics` -> `6`
- `time_measurement_basic` -> `5`
- `faster_slower_identification` -> `5`
- `distance_time_relation_basic` -> `4`

Intermediate:

- `same_distance_compare_speed` -> `6`
- `same_time_compare_distance` -> `5`
- `table_based_motion_reading` -> `5`
- `travel_scenario_reasoning` -> `5`
- `measurement_choice_motion` -> `5`
- `misconception_correction_motion` -> `4`

Advanced:

- `speed_computation_advanced` -> `10`
- `multi_factor_motion_case` -> `8`
- `uniform_vs_nonuniform_case` -> `8`
- `motion_multiselect` -> `7`
- `assertion_reason_motion` -> `7`
- `best_explanation_motion` -> `6`
- `short_answer_time_or_distance` -> `5`

## Variation Rules

Vary:

- runner, cyclist, bus, toy car, school van, walker
- table format vs plain-language format
- same distance vs same time comparison
- speed vs time vs distance target

Avoid repeating:

- one same-distance-half-time sentence
- one speed formula sentence frame

## Quality Gate

After implementation, each `SCI-MOTION-*` topic should aim for:

- `15+` distinct visible texts minimum
- no single repeated stem above `15 to 20%`
- `8+` patterns
- healthy balance between conceptual and numerical motion reasoning
