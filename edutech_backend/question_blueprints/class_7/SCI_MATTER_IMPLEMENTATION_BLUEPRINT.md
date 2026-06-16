# SCI_MATTER Implementation Blueprint

This file is the implementation-ready blueprint for improving the `SCI-MATTER-*` question generator family.

Use it before editing:

- `apps/question_bank/management/curriculum_seed_support.py`

This family currently covers topic lanes such as:

- Acidic, Basic, and Neutral Substances
- Metals and Non-metals
- Physical and Chemical Changes

## Current Problem

The current generator behavior still overuses a small pattern pool.

Typical issues:

- one repeated assertion-reason stem dominating the advanced bucket
- the same neutralisation or indicator logic reused too often
- weak sub-topic separation across matter-related topics

## Target Outcome

For each `SCI-MATTER-*` topic with `100` questions, aim for:

- at least `15 to 20` distinct visible stems
- at least `8` usable question patterns
- multiple practical contexts
- stronger sub-topic coverage across materials, changes, indicators, and real-life use

## Generator Design Rule

Do not treat all matter topics as one repeated generic chemistry block.

Instead:

- create multiple foundation variants
- create multiple intermediate variants
- create multiple advanced variants
- rotate deterministically by `sequence_number`
- vary wording and scenario even inside the same pattern

## Foundation Variants

### 1. `matter_indicator_observation`

- type: `mcq_single`
- concept: identify acid/base/neutral from litmus or indicator behavior
- context: simple classroom observation

### 2. `matter_change_recognition`

- type: `mcq_single`
- concept: identify physical vs chemical change
- context: kitchen, school, household materials

### 3. `metal_property_basics`

- type: `mcq_single`
- concept: basic properties of metals and non-metals
- context: common objects

### 4. `material_use_selection`

- type: `mcq_single`
- concept: choose suitable material based on property
- context: wire, utensil, packaging, handle, tool

### 5. `acid_base_everyday_example`

- type: `true_false` or `mcq_single`
- concept: connect common substances to acidic/basic behavior
- context: lemon juice, soap solution, antacid, vinegar

## Intermediate Variants

### 6. `neutralisation_use_case`

- type: `mcq_single`
- concept: understand neutralisation in practical life
- context: antacid, soil treatment, insect sting, cleaning

### 7. `material_property_reasoning`

- type: `mcq_single`
- concept: infer why a material is selected for a job
- context: electrical wires, cooking utensils, machine parts

### 8. `physical_vs_chemical_compare`

- type: `mcq_single`
- concept: compare two changes and decide category
- context: rusting, melting, burning, cutting, dissolving

### 9. `reactivity_common_sense`

- type: `mcq_single`
- concept: reason from visible change or use, not heavy chemistry detail
- context: rusting, corrosion, dull/shiny surfaces

### 10. `indicator_inference_case`

- type: `mcq_multiple`
- concept: choose all valid conclusions from indicator observations
- context: two or three test liquids

### 11. `misconception_correction_matter`

- type: `mcq_single`
- concept: correct wrong idea about change, material, or acid-base behavior
- context: classroom statement

## Advanced Variants

### 12. `assertion_reason_matter`

- type: `mcq_single`
- concept: cause-effect explanation in matter topics
- sub-concepts:
  - rusting
  - chemical change
  - neutralisation
  - metal property use
  - non-metal behavior

### 13. `advanced_material_selection`

- type: `mcq_single`
- concept: best material choice with reasoning
- context: design or repair scenario

### 14. `advanced_matter_multiselect`

- type: `mcq_multiple`
- concept: select all correct observations or conclusions
- context: experiments, material tests, use-cases

### 15. `case_based_chemical_change`

- type: `mcq_single`
- concept: identify or justify whether a change is chemical
- context: rusting, cooking, burning, curdling, tarnishing

### 16. `acid_base_decision_case`

- type: `mcq_single`
- concept: choose the best correction or action from an acid-base scenario
- context: lab mix-up, stomach acidity, garden soil, accidental touch

### 17. `best_explanation_matter`

- type: `mcq_single`
- concept: choose best explanation, not just fact recall
- context: properties and uses of materials

### 18. `short_answer_matter_reason`

- type: `short_answer`
- concept: brief reason or classification answer
- context: “why is this used?”, “what kind of change is this?”, “which substance type fits?”

## Recommended Distribution For 100 Questions

Foundation:

- `matter_indicator_observation` -> `5`
- `matter_change_recognition` -> `5`
- `metal_property_basics` -> `4`
- `material_use_selection` -> `3`
- `acid_base_everyday_example` -> `3`

Intermediate:

- `neutralisation_use_case` -> `6`
- `material_property_reasoning` -> `5`
- `physical_vs_chemical_compare` -> `5`
- `reactivity_common_sense` -> `4`
- `indicator_inference_case` -> `5`
- `misconception_correction_matter` -> `5`

Advanced:

- `assertion_reason_matter` -> `10`
- `advanced_material_selection` -> `8`
- `advanced_matter_multiselect` -> `8`
- `case_based_chemical_change` -> `8`
- `acid_base_decision_case` -> `7`
- `best_explanation_matter` -> `5`
- `short_answer_matter_reason` -> `4`

## Recommended Question-Type Mix

- `mcq_single`: `55 to 65`
- `mcq_multiple`: `15 to 20`
- `short_answer`: `8 to 12`
- `true_false`: `5 to 10`

## Variation Rules

Vary:

- substance names
- setting: lab, kitchen, clinic, school, garden, workshop
- type of observation
- type of mistake being tested
- type of material application

Avoid repeating:

- the same rusting assertion
- the same antacid question
- the same litmus wording

## Quality Gate

After implementation, each `SCI-MATTER-*` topic should aim for:

- `15+` distinct visible texts minimum
- no single repeated stem above `15 to 20%`
- `8+` useful pattern types
- better spread across acid/base, changes, and material properties
