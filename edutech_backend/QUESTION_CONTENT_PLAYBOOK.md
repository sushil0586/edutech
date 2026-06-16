# Question Content Playbook

This document is the long-term reference for creating strong question-bank content for Nexora.

Use it when:

- writing manual premium questions
- designing future seed scripts
- reviewing imported CSV question sets
- training content writers
- defining quality standards for institute and platform libraries

The main goal is simple:

- avoid repetitive template-style questions
- create saleable, trust-building academic content
- keep content reusable across exams, practice, and analytics

## Core Principle

Questions should not feel machine-repeated.

A strong question bank should contain variety across:

- concept tested
- language style
- reasoning depth
- question type
- context or scenario
- distractor quality
- difficulty

If 100 questions of one topic feel like the same question with changed numbers, the content is weak even if it is technically correct.

## Content Quality Rules

Every question should aim for the following:

1. Clear wording
2. One precise learning objective
3. Appropriate difficulty
4. Realistic or academically useful distractors
5. Correct explanation
6. No noisy prefixes, IDs, or seed markers in visible text
7. No duplicate or near-duplicate phrasing within the same topic pack

## Recommended Question Mix Per Topic

Do not create 100 questions from 1 or 2 patterns.

For a good topic-level pack, use a balanced mix like this:

- `20%` concept check questions
- `20%` application questions
- `20%` reasoning or logic-based questions
- `10%` assertion-reason questions
- `10%` multi-select or elimination questions
- `10%` short-answer questions
- `10%` case-based, observation-based, or practical scenario questions

This is a recommended mix, not a strict rule. Some topics naturally need more reasoning and fewer direct recall questions.

## Difficulty Framework

Suggested interpretation:

- `Foundation`: direct concept checks, basic recognition, single-step application
- `Intermediate`: 2-step thinking, comparison, classification, applied scenarios
- `Advanced`: olympiad-style, tricky distractors, reasoning chains, multi-concept thinking

Recommended design behavior:

- foundation should build confidence, not be trivial
- intermediate should test understanding, not just memory
- advanced should challenge thought process, not confuse with bad wording

## Difficulty Distribution

Use this only when the product goal requires it:

- `20%` foundation
- `30%` intermediate
- `50%` advanced

This distribution works for olympiad or premium challenge banks.

For school support banks, a more balanced distribution may be better:

- `30%` foundation
- `40%` intermediate
- `30%` advanced

## Allowed Question Types

Current backend support:

- `MCQ Single`
- `MCQ Multiple`
- `True / False`
- `Short Answer`

Future content should still be designed more richly inside these four types.

For example:

- a case-based prompt can still be `MCQ Single`
- an assertion-reason prompt can still be `MCQ Single`
- a practical selection task can be `MCQ Multiple`
- a one-line numeric reasoning prompt can be `Short Answer`

## Recommended Question Archetypes

Use these archetypes repeatedly across topics, but do not copy the same sentence structure.

### 1. Direct Concept Check

Use for:

- definitions
- recognition
- basic identification

Example:

> Which fraction is equivalent to `3/5`?

### 2. Computation With Context

Use for:

- arithmetic
- algebra
- percentages
- unit-based maths

Example:

> A school bag costs `₹240`. A discount of `25%` is offered. How much does the customer pay?

### 3. Observation-Based Science

Use for:

- experiments
- lab conditions
- visible change interpretation

Example:

> Blue litmus turns red in a solution. What does this observation suggest?

### 4. Real-Life Application

Use for:

- money
- shopping
- travel
- classroom situations
- health and habits

Example:

> After climbing stairs quickly, a student's pulse rate increases. What is the best reason?

### 5. Pattern and Logic

Use for:

- sequences
- arrangement
- number sense
- puzzle-like reasoning

Example:

> The sequence is `4, 7, 12, 19, ...`. If the pattern continues, what is the next term?

### 6. Assertion-Reason

Use for:

- science explanation
- cause-effect validation
- conceptual depth

Standard answer options:

- Both A and R are true, and R is the correct explanation of A.
- Both A and R are true, but R is not the correct explanation of A.
- A is true, but R is false.
- A is false, but R is true.

### 7. Multi-Select Truth Evaluation

Use for:

- identifying all correct observations
- selecting all valid methods
- checking multiple claims

Example:

> Select all statements that are true about the number `72036`.

### 8. Error Detection or Best Correction

Use for:

- misconceptions
- common student confusion
- exam-ready critical reasoning

Example:

> A student says solar eclipses happen every new moon everywhere on Earth. Which is the best correction?

### 9. Compare and Contrast

Use for:

- speed comparison
- quantity comparison
- science classification
- property differences

Example:

> Two toy cars travel the same distance, but one takes half the time. What can be concluded?

### 10. Short Numerical Response

Use for:

- direct but non-trivial calculation
- algebraic solving
- product/sum/value finding

Example:

> Three consecutive even numbers are `14`, `16`, and `18`. Find their product.

## Topic-Level Variety Rule

For any one topic, do not allow all questions to come from one pattern.

Minimum standard for a healthy topic pack:

- at least `5` question archetypes for a `50-question` pack
- at least `8` question archetypes for a `100-question` pack
- at least `12` distinct visible stems for a premium `100-question` pack

Better target:

- `20+` distinct visible stems for a premium `100-question` pack

## What Makes Content Feel Repetitive

These are warning signs:

- same opening phrase repeated too often
- same math structure with different numbers only
- same explanation structure repeated word-for-word
- same distractor pattern repeated
- same concept asked from one angle only
- all advanced questions being just “bigger arithmetic”

Bad pattern example:

- “Three consecutive even numbers are … what is their product?”
- repeated 20 times with different values

That is not a premium bank.

## What Makes Content Feel Premium

Premium content usually has:

- strong concept progression
- thoughtful distractors
- curriculum alignment
- olympiad-style twists
- real-life interpretation
- reasoning variety
- polished language

A premium topic pack should make the learner feel:

- “this is challenging”
- “this is well-designed”
- “this tests understanding, not memorization”

## Distractor Writing Rules

Distractors should be:

- plausible
- close to common student mistakes
- not obviously absurd
- not duplicated in meaning

Distractor examples:

- arithmetic mistake
- sign mistake
- place value confusion
- unit confusion
- concept reversal
- overgeneralization

Avoid:

- joke options
- unrelated words
- trivially wrong answers
- two options meaning the same thing

## Explanation Writing Rules

Every explanation should:

- confirm the correct idea
- show the reasoning, not just the answer
- stay short and useful
- help future revision

Good explanation pattern:

- identify the concept
- show the reasoning step
- state the final answer

Bad explanation pattern:

- “Option B is correct.”

## Writing Guidelines By Subject

## Math

Preferred mix:

- direct number sense
- contextual arithmetic
- place value
- fraction reasoning
- algebra setup
- pattern logic
- elimination-based MCQ
- short numeric response

Math should not be only:

- mechanical calculation
- one-step substitution
- number changes on the same sentence frame

Good math contexts:

- money
- shopping
- school supplies
- time and distance
- arrangements
- scoreboards
- discounts
- area/perimeter situations

## Science

Preferred mix:

- observation and conclusion
- daily-life application
- experiment-based inference
- cause-effect reasoning
- assertion-reason
- misconception correction
- compare and classify
- health and environment scenarios

Science should not be only:

- isolated factual recall
- textbook sentence copy
- repeated “which is correct” with no context

Good science contexts:

- classroom experiments
- sports and health
- household objects
- weather and nature
- models and diagrams
- food, digestion, growth
- circuits, heat, light, phases, motion

## Case-Based Question Design

A case-based question should have:

- a short scenario
- one clear decision or conclusion
- minimal extra wording

Template:

1. Introduce a student, teacher, object, event, or experiment
2. State 2 to 4 useful facts
3. Ask one focused question

Example:

> During a science fair, two bulbs are connected in separate circuits. In one circuit, the switch is open. In the other, the wire near the bulb is loose. Which circuits will fail to glow?

## Assertion-Reason Design Rules

Use assertion-reason only when:

- the reason truly explains the assertion
- both statements are academically meaningful
- it is not artificially forced

Avoid weak assertion-reason items that simply restate the same sentence in two forms.

## Question Blueprint Template

Use this template when creating any new seed logic or manual content.

```md
Subject:
Topic:
Difficulty:
Question Type:
Archetype:
Learning Objective:
Common Mistake Targeted:

Question:

Options:
A.
B.
C.
D.

Correct Answer:

Explanation:

Metadata Notes:
- pattern key:
- concept family:
- practical / olympiad / mixed:
```

## Seed Script Design Rules

When writing generator-backed seed scripts:

1. Never use only one generator per difficulty bucket.
2. Create multiple variants per topic family.
3. Rotate variant families deterministically.
4. Vary wording, not only numbers.
5. Vary question type where academically suitable.
6. Track `question_pattern` in metadata for quality audits.
7. Periodically check `distinct question_text count` by topic.

## Minimum Generator Standard

Before approving a seed generator for a topic:

- `100` generated questions should not collapse into `3` distinct stems
- each difficulty bucket should have multiple patterns
- advanced level should contain genuine reasoning variety
- at least some questions should feel human-authored

## Review Checklist

Before accepting a new topic pack, review:

- Is the language clean?
- Are there duplicates?
- Are the distractors believable?
- Are explanations useful?
- Are difficulty levels appropriate?
- Is the pack varied enough?
- Would a teacher feel confident selling or assigning this content?

If the answer to the last question is “no”, the pack is not ready.

## Recommended Future Direction

Use a hybrid strategy:

- `Tier 1`: hand-crafted premium question sets for top-selling topics
- `Tier 2`: controlled generator-assisted questions for expansion
- `Tier 3`: imported institutional question banks reviewed against this playbook

Recommended premium-first topics:

- Indian and International Number Systems
- Fractions
- Algebra
- Earth, Moon, and the Sun
- Electric Circuits and Components
- Adolescence and Growth

## Suggested Repo Usage

This file should guide:

- future `seed_master_question_library` improvements
- future `seed_curriculum_questions` improvements
- manual question creation in admin, institute, and teacher flows
- CSV content authoring templates
- QA review before publishing questions

## Final Rule

Content is the product.

If the content feels repetitive, predictable, or careless, the product feels weak.

If the content feels thoughtful, varied, and trustworthy, the platform becomes saleable.
