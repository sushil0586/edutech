# MATH_LOGIC Implementation Blueprint

This file is the implementation-ready blueprint for improving the `MATH-LOGIC-*` question generator family.

Use it before editing:

- `apps/question_bank/management/curriculum_seed_support.py`

This family currently covers topic lanes such as:

- Patterns and Sequences
- Number Play
- Puzzles and Cryptarithms

## Current Problem

The current generator still leans too heavily on one sequence-growth structure.

Typical issues:

- same “jumps increase by 2” sentence shape repeated
- not enough puzzle or rule-finding diversity
- weak distinction across pattern topics

## Target Outcome

For each `MATH-LOGIC-*` topic with `100` questions, aim for:

- at least `15 to 20` distinct visible stems
- at least `7 to 8` pattern types
- meaningful mix of sequence, arrangement, table, and puzzle logic

## Foundation Variants

### 1. `simple_pattern_next_term`

- type: `mcq_single`
- concept: identify next term in a straightforward pattern

### 2. `growing_object_pattern`

- type: `mcq_single`
- concept: infer pattern from chairs, tiles, sticks, or shapes

### 3. `missing_term_basic`

- type: `mcq_single`
- concept: find one missing term in a simple numeric pattern

## Intermediate Variants

### 4. `pattern_total_reasoning`

- type: `short_answer`
- concept: find sum or total from a small generated pattern

### 5. `second_difference_sequence`

- type: `mcq_single`
- concept: detect growing jump pattern

### 6. `rule_identification`

- type: `mcq_single`
- concept: choose rule that matches a sequence or table

### 7. `arrangement_logic_case`

- type: `mcq_single`
- concept: infer result from a small arrangement rule

### 8. `misconception_correction_logic`

- type: `mcq_single`
- concept: correct a wrong interpretation of a pattern

## Advanced Variants

### 9. `multi_step_pattern_reasoning`

- type: `mcq_single`
- concept: next term or missing term with deeper rule

### 10. `pattern_multiselect_truths`

- type: `mcq_multiple`
- concept: select all true statements about a pattern

### 11. `cryptarithm_or_code_style`

- type: `mcq_single`
- concept: simple coded relation or substitution logic

### 12. `table_pattern_inference`

- type: `mcq_single`
- concept: infer growth rule from structured values

### 13. `short_answer_logic_extension`

- type: `short_answer`
- concept: extend the rule and produce the next valid result

### 14. `best_explanation_logic`

- type: `mcq_single`
- concept: choose the best reasoning behind a sequence or pattern

## Recommended Distribution For 100 Questions

Foundation:

- `simple_pattern_next_term` -> `8`
- `growing_object_pattern` -> `6`
- `missing_term_basic` -> `6`

Intermediate:

- `pattern_total_reasoning` -> `8`
- `second_difference_sequence` -> `7`
- `rule_identification` -> `6`
- `arrangement_logic_case` -> `5`
- `misconception_correction_logic` -> `4`

Advanced:

- `multi_step_pattern_reasoning` -> `14`
- `pattern_multiselect_truths` -> `10`
- `cryptarithm_or_code_style` -> `8`
- `table_pattern_inference` -> `8`
- `short_answer_logic_extension` -> `10`
- `best_explanation_logic` -> `10`

## Recommended Question-Type Mix

- `mcq_single`: `50 to 60`
- `mcq_multiple`: `10 to 15`
- `short_answer`: `20 to 25`
- `true_false`: `0 to 5`

## Variation Rules

Vary:

- number pattern
- seating or object growth pattern
- table format
- missing-term prompt
- coded replacement
- story context

Avoid repeating:

- one exact jump-growth frame
- one exact opening line for all sequence items

## Quality Gate

After implementation, each `MATH-LOGIC-*` topic should aim for:

- `15+` distinct visible texts minimum
- `7+` pattern types
- no one sequence stem dominating the pack
