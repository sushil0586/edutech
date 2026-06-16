# Topic Blueprint Template

Use this template to create one reusable topic-level blueprint per topic.

The purpose of this file is not just content planning. Its main job is to stop repeated questions before they are generated or seeded.

Each topic blueprint should be detailed enough that:

- a content writer can generate premium questions from it
- a developer can convert it into generator logic
- a reviewer can audit repetition and coverage quickly

## File Naming Rule

Use a predictable file name:

- `MATH_<TOPIC_NAME>_TOPIC_BLUEPRINT.md`
- `SCI_<TOPIC_NAME>_TOPIC_BLUEPRINT.md`
- `SST_<TOPIC_NAME>_TOPIC_BLUEPRINT.md`
- `GK_<TOPIC_NAME>_TOPIC_BLUEPRINT.md`

Example:

- `MATH_INDIAN_NUMBER_SYSTEM_TOPIC_BLUEPRINT.md`

## Required Structure

Copy the structure below for each topic file.

```md
# <Topic Name> Topic Blueprint

## Topic Identity

- Class:
- Subject:
- Topic:
- Board / Curriculum:
- Intended pack size:
- Recommended difficulty mix:

## Why This Topic Needs A Separate Blueprint

- saleable importance
- high repetition risk areas
- overlap risk with nearby topics

## Topic Scope

Include:

- sub-concept 1
- sub-concept 2
- sub-concept 3

Exclude:

- concept that belongs to another topic
- advanced concept not suitable for this class

## Learning Objective Grid

| Code | Learning objective | Difficulty lanes |
| --- | --- | --- |
| LO1 | ... | foundation / intermediate |
| LO2 | ... | intermediate / advanced |

## Question Archetype Quota

| Archetype | Minimum count in 100-question pack | Notes |
| --- | --- | --- |
| direct concept check | 10 | ... |
| application | 12 | ... |
| assertion-reason | 8 | ... |

## Stem Variety Bank

Allowed opening families:

- A student notices...
- Which situation best shows...
- Study the pattern below...
- A teacher writes...
- Choose the best explanation for...

Rule:

- no opening family should dominate the pack
- no exact visible stem should repeat

## Context Bank

Use mixed contexts such as:

- classroom
- market / money
- sports
- kitchen / home
- experiment / observation
- timetable / school routine

## Anti-Repetition Rules

Hard bans:

- do not create number-swapped clones
- do not repeat the same assertion-reason logic with new nouns
- do not produce more than 2 questions from one visible sentence shape
- do not let one sub-concept dominate the advanced bucket

Near-duplicate test:

- if two questions can be confused as the same after changing numbers, names, or objects, rewrite one

## Difficulty Design

### Foundation

- what foundation should test
- what it must avoid
- archetypes allowed

### Intermediate

- what intermediate should test
- what it must avoid
- archetypes allowed

### Advanced

- what advanced should test
- what it must avoid
- archetypes allowed

## Distractor Design Rules

- common mistake 1
- common mistake 2
- misconception 3

## Variation Matrix

| Sub-concept | Direct | Application | Reasoning | Assertion-reason | Case-based | Short answer |
| --- | --- | --- | --- | --- | --- | --- |
| ... | yes | yes | yes | no | yes | yes |

## Banned Weak Patterns

- repeated template 1
- repeated template 2
- lazy distractor style 1

## Review Checklist

- at least 12 to 20 visibly distinct stems in each 100-question pack
- at least 5 to 8 archetypes used
- no repeated skeleton pattern dominates
- no sub-concept starved
- explanations are concise and correct

## Reuse Notes

- related seed family:
- related generator helper:
- last review date:
- next likely topic needing similar blueprint:
```

## Minimum Quality Rule

Do not create a topic blueprint that only says:

- generate MCQs from this topic
- keep variety
- avoid repetition

That is too weak.

A usable blueprint must explicitly define:

- sub-concepts
- archetype coverage
- banned repeat patterns
- contexts
- difficulty behavior
- distractor behavior

## Practical Workflow

1. Pick one topic that is premium or repetition-prone.
2. Create its topic blueprint using this template.
3. Generate only `10` benchmark questions first.
4. Audit for repetition.
5. Expand toward `25`, then `50`, then `100`.
6. Only after the topic blueprint is stable, scale it into seed logic.
