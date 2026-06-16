# SCI_HEALTH_ADOLESCENCE Implementation Blueprint

This file is the implementation-ready blueprint for improving the `SCI-HEALTH-ADOLESCENCE` question generator.

Use it before editing:

- `apps/question_bank/management/curriculum_seed_support.py`

The goal is to replace the current low-variety generator behavior with a richer rotating pattern system.

## Current Problem

The old generator behavior collapses too much of the topic into:

- one repeated foundation pattern
- one repeated intermediate pattern
- one repeated advanced pattern

That causes:

- repeated stems
- weak pattern variety
- poor premium quality

## Target Outcome

For `100` questions in this topic, we want:

- at least `15 to 20` distinct visible stems
- multiple advanced reasoning styles
- better balance between health, nutrition, hygiene, sleep, growth, and misconception correction
- stronger variety across question types

## Generator Design Rule

Do not implement this topic family like:

```python
if family == "science_health":
    if difficulty == foundation:
        return one_template()
    if difficulty == intermediate:
        return one_template()
    return one_template()
```

Instead use:

```python
if family == "science_health":
    if difficulty == foundation:
        return _pick_variant(sequence_number, foundation_variants)
    if difficulty == intermediate:
        return _pick_variant(sequence_number, intermediate_variants)
    return _pick_variant(sequence_number, advanced_variants)
```

## Recommended Pattern Inventory

## Foundation variants

These should total `20` questions per `100`.

### 1. `health_stage_identification`

- question type: `mcq_single`
- concept: identify adolescence from age and visible growth clues
- use when: asking about stage recognition
- avoid repeating the same age and same physical clue

Example intent:

- age + height increase
- age + voice/body changes
- age + growing independence

### 2. `puberty_change_recognition`

- question type: `mcq_single`
- concept: identify a normal puberty-related change
- use when: checking direct concept understanding
- vary the body-change context

### 3. `healthy_habit_selection`

- question type: `mcq_single`
- concept: select one best habit supporting healthy growth
- context: routine, meals, exercise, sleep, hygiene

### 4. `basic_nutrient_need`

- question type: `mcq_single`
- concept: identify useful nutrient group in a situation
- context: sports weakness, growth, tiredness, poor meal habits

### 5. `personal_hygiene_basics`

- question type: `true_false` or `mcq_single`
- concept: hygiene during adolescence
- context: sweat, skin, clean clothes, bathing, grooming

### 6. `sleep_need_basics`

- question type: `mcq_single`
- concept: value of rest and sleep
- context: student schedule, morning tiredness, late-night routine

## Intermediate variants

These should total `30` questions per `100`.

### 7. `routine_comparison_growth`

- question type: `mcq_single`
- concept: compare two routines and choose the better one
- context: school-going adolescents

### 8. `nutrition_cause_effect`

- question type: `short_answer` or `mcq_single`
- concept: connect weakness, low energy, or poor performance to nutrition habits
- context: sports, class fatigue, skipped breakfast

### 9. `hygiene_decision_scenario`

- question type: `mcq_single`
- concept: choose best hygiene action
- context: sports practice, sweat, oily skin, shared items

### 10. `growth_support_reasoning`

- question type: `mcq_single`
- concept: explain why habits support growth
- context: sleep, exercise, meals, cleanliness

### 11. `misconception_correction_health`

- question type: `mcq_single`
- concept: correct a false belief
- context: peer conversation, classroom statement, family advice

### 12. `emotional_social_change_context`

- question type: `mcq_single`
- concept: recognize emotional or social change during adolescence
- context: behavior, self-awareness, mood, social adjustment

### 13. `good_choice_bad_choice_pair`

- question type: `mcq_multiple`
- concept: choose all healthy actions from a mixed list
- context: school-life and daily routine decisions

## Advanced variants

These should total `50` questions per `100`.

### 14. `assertion_reason_growth`

- question type: `mcq_single`
- concept: cause-effect in growth, hormones, nutrition, hygiene, or sleep
- important: create multiple sub-concepts, not one repeated assertion

Sub-concept options:

- sleep and growth
- hygiene and body changes
- nutrition and energy
- exercise and health
- adolescence as physical + emotional development

### 15. `case_based_health_priority`

- question type: `mcq_single`
- concept: choose the most urgent improvement in a poor routine
- context: tired student, weak student, irregular student, stressed student

### 16. `multi_factor_growth_reasoning`

- question type: `mcq_single`
- concept: evaluate several health factors together
- context: compare complete routines, not one isolated habit

### 17. `advanced_multi_select_growth`

- question type: `mcq_multiple`
- concept: select all genuinely healthy practices
- important: must not dominate the whole advanced bucket

### 18. `sleep_nutrition_exercise_balance`

- question type: `mcq_single`
- concept: balance among multiple habits
- context: sports, exams, tiredness, body development

### 19. `misconception_best_correction_advanced`

- question type: `mcq_single`
- concept: choose best correction to a harmful or incomplete belief
- context: advice from friend, online myth, careless routine

### 20. `short_answer_health_reason`

- question type: `short_answer`
- concept: answer a direct “why” or “which nutrient / which habit” prompt briefly

### 21. `healthy_growth_priority_order`

- question type: `mcq_single`
- concept: identify the first correction needed in a bad routine
- context: several simultaneous problems

### 22. `school_counselor_case`

- question type: `mcq_single`
- concept: infer best advice from symptoms and habits
- context: counselor, teacher, parent, sports coach

## Recommended Question-Type Mix

Inside this topic family, do not let one type dominate too much.

Suggested target:

- `mcq_single`: around `55 to 65`
- `mcq_multiple`: around `15 to 20`
- `short_answer`: around `10 to 15`
- `true_false`: around `5 to 10`

## Recommended Distribution For 100 Questions

Foundation:

- `health_stage_identification` -> `4`
- `puberty_change_recognition` -> `4`
- `healthy_habit_selection` -> `4`
- `basic_nutrient_need` -> `3`
- `personal_hygiene_basics` -> `3`
- `sleep_need_basics` -> `2`

Intermediate:

- `routine_comparison_growth` -> `5`
- `nutrition_cause_effect` -> `5`
- `hygiene_decision_scenario` -> `4`
- `growth_support_reasoning` -> `4`
- `misconception_correction_health` -> `4`
- `emotional_social_change_context` -> `4`
- `good_choice_bad_choice_pair` -> `4`

Advanced:

- `assertion_reason_growth` -> `8`
- `case_based_health_priority` -> `8`
- `multi_factor_growth_reasoning` -> `7`
- `advanced_multi_select_growth` -> `7`
- `sleep_nutrition_exercise_balance` -> `6`
- `misconception_best_correction_advanced` -> `5`
- `short_answer_health_reason` -> `4`
- `healthy_growth_priority_order` -> `3`
- `school_counselor_case` -> `2`

## Suggested Code Structure

In `curriculum_seed_support.py`, the health family should be implemented with:

### `_science_health_foundation(topic, sequence_number)`

- builds a `foundation_variants` list
- returns `_pick_variant(sequence_number, foundation_variants)`

### `_science_health_intermediate(topic, sequence_number)`

- builds an `intermediate_variants` list
- returns `_pick_variant(sequence_number, intermediate_variants)`

### `_science_health_advanced(topic, sequence_number)`

- builds an `advanced_variants` list
- returns `_pick_variant(sequence_number, advanced_variants)`

Then inside the broader health branch:

```python
if family == "science_health":
    if difficulty_level == TopicDifficulty.FOUNDATION:
        return _science_health_foundation(topic, sequence_number)
    if difficulty_level == TopicDifficulty.INTERMEDIATE:
        return _science_health_intermediate(topic, sequence_number)
    return _science_health_advanced(topic, sequence_number)
```

## Variation Rules Inside Each Pattern

Even inside one pattern, do not keep the wording fixed.

Vary:

- age
- school situation
- routine details
- symptom details
- habit combinations
- role in scenario: student, friend, teacher, parent, coach
- opening phrase

Examples of varied openings:

- “Riya is 12 and…”
- “During sports practice…”
- “A class teacher notices…”
- “One student believes…”
- “Which routine best supports…”
- “Why is it important to…”

Avoid always using:

- “A student…”
- “Select all practices…”
- “Which of the following…”

## Common Mistakes This Family Should Target

- confusing adolescence with adulthood
- ignoring emotional change
- thinking food alone is enough
- thinking exercise alone is enough
- ignoring sleep
- poor hygiene judgment
- not linking habits to energy and growth
- believing myths from peers

## Quality Gate After Implementation

After this family is updated and reseeded, it should aim for:

- at least `15` distinct visible texts minimum
- ideally `20+`
- no single repeated stem dominating the topic
- multiple advanced patterns in audit output

## Practical Review Rule

If the audit still shows:

- one advanced pattern dominating
- one visible stem repeated heavily
- fewer than `10 to 15` distinct texts

then the generator is still not good enough and needs more sub-patterns.
