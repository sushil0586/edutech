# Class 7 Math and Science Question Rebuild Workflow

Use this workflow when rebuilding Class 7 Math and Science questions from scratch because the previous seeded content is too repetitive.

This document is intentionally limited to:

- Class 7 Math
- Class 7 Science

It should be used before creating a fresh question batch for DB import or reseeding.

## Goal

Replace repeated, low-variety question banks with:

- topic-wise premium content
- stronger archetype diversity
- lower duplicate risk
- safe incremental regeneration

## Non-Negotiable Rule

Do not recreate all `Math + Science` questions in one shot.

Use the rebuild order below:

1. one topic
2. 10 benchmark questions
3. review repetition
4. expand to 25
5. expand to 50 or 100 only after approval

If a 10-question batch is weak, rewrite it before scaling.

## Source Files To Use

Math topic files:

- [topics/math/README.md](./topics/math/README.md)

Science topic files:

- [topics/science/README.md](./topics/science/README.md)

Global template and checks:

- [../TOPIC_BLUEPRINT_TEMPLATE.md](../TOPIC_BLUEPRINT_TEMPLATE.md)
- [../TOPIC_BLUEPRINT_REVIEW_CHECKLIST.md](../TOPIC_BLUEPRINT_REVIEW_CHECKLIST.md)
- [../QUESTION_GENERATION_PROMPTS.md](../QUESTION_GENERATION_PROMPTS.md)

## Recommended Rebuild Order

Start with the highest repetition-risk or saleable topics first.

### Math first wave

1. Indian and International Number Systems
2. Place Value and Comparison
3. Arithmetic Expressions
4. Order of Operations
5. Decimals
6. Equivalent Fractions
7. Multiplication of Fractions
8. Division of Fractions
9. Variables and Expressions
10. Patterns and Rules

### Science first wave

1. Acidic, Basic, and Neutral Substances
2. Physical and Chemical Changes
3. Electric Circuits and Components
4. Heat Transfer in Nature
5. Motion in Everyday Life
6. Life Processes in Plants
7. Life Processes in Animals
8. Adolescence and Growth
9. Earth, Moon, and the Sun
10. Light, Shadows, and Reflections

## Per-Topic Rebuild Method

For each topic:

1. Open the exact topic blueprint file.
2. Read:
   - scope
   - premium question lanes
   - anti-repetition rules
   - incremental build plan
3. Generate only 10 questions first.
4. Review manually for:
   - repeated visible stem
   - repeated logic shell
   - repeated distractor pattern
   - same archetype domination
5. If clean, generate the next 15.
6. Review again.
7. Then decide whether the topic deserves 50 or 100.

## Topic-Level Acceptance Gate

A topic batch should not move forward if:

- more than 2 questions feel like number-swapped copies
- more than 2 questions use the same visible opening pattern
- advanced questions are just bigger numbers or longer wording
- assertion-reason dominates the topic
- explanations feel generic or copy-pasted

## Required Variety Standard

For each final 25-question topic batch:

- at least 6 visibly different stem families
- at least 4 archetypes
- at least 1 misconception-correction question where suitable
- at least 1 application or case-based question where suitable
- advanced questions must include reasoning, not just difficulty by size

For each final 100-question topic batch:

- at least 12 to 18 visibly distinct stems
- at least 6 to 8 archetypes
- no repeated skeleton pattern dominating the pack

## Math-Specific Rebuild Rules

- do not accept packs that only rotate numbers
- do not accept advanced questions that are merely larger calculations
- use contexts such as school, money, measurements, data, arrangements, and comparison
- include error detection and interpretation, not just direct solving

## Science-Specific Rebuild Rules

- do not accept packs that only rotate one observation shell
- do not allow all advanced questions to become assertion-reason
- include observation, experiment, daily life, misconception correction, and inference
- explanations must be scientifically correct and concise

## Practical Batch Size Recommendation

Use this safe progression:

- `10` questions: benchmark
- `25` questions: first stable topic set
- `50` questions: only after two reviews
- `100` questions: only for strong, validated topics

## Rebuild Tracking Table

Use this table while rebuilding.

| Subject | Topic | 10-question benchmark | 25-question approved | 50+ approved | Notes |
| --- | --- | --- | --- | --- | --- |
| Math | Indian and International Number Systems | pending | pending | pending | |
| Math | Place Value and Comparison | pending | pending | pending | |
| Math | Arithmetic Expressions | pending | pending | pending | |
| Math | Order of Operations | pending | pending | pending | |
| Math | Decimals | pending | pending | pending | |
| Math | Equivalent Fractions | pending | pending | pending | |
| Math | Multiplication of Fractions | pending | pending | pending | |
| Math | Division of Fractions | pending | pending | pending | |
| Math | Variables and Expressions | pending | pending | pending | |
| Math | Patterns and Rules | pending | pending | pending | |
| Science | Acidic, Basic, and Neutral Substances | pending | pending | pending | |
| Science | Physical and Chemical Changes | pending | pending | pending | |
| Science | Electric Circuits and Components | pending | pending | pending | |
| Science | Heat Transfer in Nature | pending | pending | pending | |
| Science | Motion in Everyday Life | pending | pending | pending | |
| Science | Life Processes in Plants | pending | pending | pending | |
| Science | Life Processes in Animals | pending | pending | pending | |
| Science | Adolescence and Growth | pending | pending | pending | |
| Science | Earth, Moon, and the Sun | pending | pending | pending | |
| Science | Light, Shadows, and Reflections | pending | pending | pending | |

## What We Should Do Next

The right next practical move is:

1. rebuild only Class 7 Math and Science
2. start from first-wave topics
3. create audited 10-question benchmark sets first
4. only after approval, generate the replacement batches for DB

Do not directly reseed all old topics again with the same generator behavior.
