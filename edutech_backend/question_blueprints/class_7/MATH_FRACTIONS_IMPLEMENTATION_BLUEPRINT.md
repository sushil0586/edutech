# MATH_FRACTIONS Implementation Blueprint

This file is the implementation-ready blueprint for improving the `MATH-FRACTIONS-*` question generator family.

Use it before editing:

- `apps/question_bank/management/curriculum_seed_support.py`

This family currently covers topic lanes such as:

- Equivalent Fractions
- Multiplication of Fractions
- Division of Fractions

## Current Problem

The current generator overuses too few fraction structures.

Typical issues:

- repeated `x + 1/y` style composite questions
- weak spread across visual, practical, and comparison-based fraction ideas
- too much single-format MCQ output

## Target Outcome

For each `MATH-FRACTIONS-*` topic with `100` questions, aim for:

- at least `15 to 20` distinct visible stems
- multiple real-life fraction contexts
- stronger coverage of equivalence, sharing, comparison, part-whole, and operations

## Foundation Variants

### 1. `fraction_equivalence_basic`

- type: `mcq_single`
- concept: identify equivalent fraction

### 2. `fraction_shaded_model`

- type: `mcq_single`
- concept: identify shaded fraction from a model description

### 3. `fraction_part_of_set`

- type: `mcq_single`
- concept: represent part of a group as a fraction

### 4. `simple_fraction_compare`

- type: `true_false` or `mcq_single`
- concept: compare simple fractions

## Intermediate Variants

### 5. `fraction_remaining_quantity`

- type: `mcq_single`
- concept: find remainder after a fraction is used

### 6. `fraction_share_context`

- type: `mcq_single`
- concept: sharing food, rope, money, or materials

### 7. `fraction_compare_context`

- type: `mcq_single`
- concept: compare two practical fraction amounts

### 8. `fraction_operation_step`

- type: `short_answer` or `mcq_single`
- concept: one-step operation with meaningful context

### 9. `misconception_correction_fraction`

- type: `mcq_single`
- concept: correct a common fraction mistake

## Advanced Variants

### 10. `fraction_composite_reasoning`

- type: `mcq_single`
- concept: multi-part or reverse-style fraction reasoning

### 11. `fraction_case_based_decision`

- type: `mcq_single`
- concept: choose best answer from a realistic share/use case

### 12. `fraction_multiselect_truths`

- type: `mcq_multiple`
- concept: select all correct statements about fractions

### 13. `assertion_reason_fraction`

- type: `mcq_single`
- concept: equivalence, order, operation, or comparison logic

### 14. `fraction_inverse_reasoning`

- type: `short_answer`
- concept: infer original whole or missing fractional part

### 15. `best_explanation_fraction`

- type: `mcq_single`
- concept: choose best reasoning, not just answer

## Recommended Distribution For 100 Questions

Foundation:

- `fraction_equivalence_basic` -> `6`
- `fraction_shaded_model` -> `5`
- `fraction_part_of_set` -> `5`
- `simple_fraction_compare` -> `4`

Intermediate:

- `fraction_remaining_quantity` -> `6`
- `fraction_share_context` -> `6`
- `fraction_compare_context` -> `5`
- `fraction_operation_step` -> `7`
- `misconception_correction_fraction` -> `6`

Advanced:

- `fraction_composite_reasoning` -> `10`
- `fraction_case_based_decision` -> `9`
- `fraction_multiselect_truths` -> `8`
- `assertion_reason_fraction` -> `8`
- `fraction_inverse_reasoning` -> `8`
- `best_explanation_fraction` -> `7`

## Recommended Question-Type Mix

- `mcq_single`: `55 to 65`
- `mcq_multiple`: `10 to 15`
- `short_answer`: `15 to 20`
- `true_false`: `5 to 10`

## Variation Rules

Vary:

- pizza, ribbon, rope, chocolate, notebooks, money, recipe, water, tiles
- visual language vs number language
- same-whole vs different-whole comparison
- forward vs reverse problems

Avoid repeating:

- one algebraic composite frame
- one “rope remaining” frame with new numbers only

## Quality Gate

After implementation, each `MATH-FRACTIONS-*` topic should aim for:

- `15+` distinct visible texts minimum
- no single repeated stem above `15 to 20%`
- stronger mix beyond plain MCQ single
