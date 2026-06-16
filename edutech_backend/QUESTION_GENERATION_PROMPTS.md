# Question Generation Prompts

This file contains strong reusable prompts for generating high-quality, non-repetitive question-bank content.

Use these prompts when:

- generating premium manual question sets with AI
- creating seed-script source content
- producing CSV import content
- expanding topic packs
- reviewing whether a content-generation workflow is strong enough

These prompts are intentionally strict.

The main purpose is:

- stop repeated question stems
- stop repeated number-swapping templates
- force richer variation in reasoning and context

## How To Use

1. Pick the most suitable prompt below.
2. Replace the placeholders.
3. Keep the anti-repetition rules unchanged.
4. Generate content in small batches first.
5. Review distinctness before generating the next batch.

Recommended batch size:

- `10` questions for first-pass validation
- `25` questions for a stable topic batch
- only after validation, scale toward `50` or `100`

Do not ask AI for `100` questions at once unless the prompt includes strict structure and variation rules.

## Global Anti-Repetition Rules

These rules should be included in almost every generation prompt.

```text
Important anti-repetition rules:
1. Do not create duplicate or near-duplicate questions.
2. Do not reuse the same sentence structure more than twice.
3. Do not create questions that only change numbers while keeping the same logic and wording.
4. Use multiple archetypes: concept check, application, reasoning, assertion-reason, compare-contrast, case-based, multi-select, and short-answer.
5. Ensure distractors are realistic and based on common student mistakes.
6. Vary opening phrases. Do not repeatedly begin with “A student says…”, “Which of the following…”, or “True or False…”.
7. Keep each question tied to one clear learning objective.
8. Explanations must be short, correct, and useful.
9. Questions must feel premium, exam-ready, and saleable.
10. If any question feels like a reworded copy of another, replace it with a fresh archetype.
```

## Master Prompt For Premium Topic Pack

Use this when generating a strong topic pack from scratch.

```text
You are creating premium academic content for a school assessment platform.

Generate {COUNT} high-quality questions for:

Class: {CLASS_NAME}
Subject: {SUBJECT_NAME}
Topic: {TOPIC_NAME}
Board / Curriculum: {BOARD_NAME}
Difficulty mix:
- Foundation: {FOUNDATION_COUNT}
- Intermediate: {INTERMEDIATE_COUNT}
- Advanced: {ADVANCED_COUNT}

Allowed question types:
- MCQ Single
- MCQ Multiple
- True / False
- Short Answer

Required question archetypes to include:
- direct concept check
- application in real-life context
- observation or experiment-based reasoning
- assertion-reason
- compare and contrast
- misconception correction
- case-based prompt
- multi-select truth evaluation
- short-answer numerical or conceptual response

Important anti-repetition rules:
1. Do not create duplicate or near-duplicate questions.
2. Do not reuse the same sentence structure more than twice.
3. Do not create questions that only change numbers while keeping the same logic and wording.
4. At least 12 visibly different question stems must appear in the set.
5. Every 10-question block must include at least 4 different archetypes.
6. Advanced questions must not be only harder calculations; they must include reasoning, elimination, or concept connection.
7. Use strong, realistic distractors based on actual student mistakes.
8. Avoid noisy labels, codes, IDs, or seed prefixes in visible text.
9. Keep wording clear, polished, and exam-ready.
10. Content should feel premium and saleable, not generic or auto-generated.

Output format for each question:
- question_number
- difficulty_level
- question_type
- archetype
- learning_objective
- question_text
- options (if applicable)
- correct_answer
- explanation
- common_mistake_targeted

Before finalizing, internally check:
- no repeated stems
- no repeated logic patterns dominating the set
- no weak distractors
- no trivial advanced questions
```

## Prompt For First 10-Question Quality Benchmark

Use this before generating a large topic pack.

```text
Create only 10 premium questions for the topic below.

Topic details:
- Class: {CLASS_NAME}
- Subject: {SUBJECT_NAME}
- Topic: {TOPIC_NAME}
- Curriculum: {BOARD_NAME}

Goal:
This is not a bulk generation task. This is a benchmark set to validate quality before scaling.

Rules:
1. Every question must use a different or clearly distinct stem style.
2. Use at least 6 different archetypes across these 10 questions.
3. Include at least:
   - 2 foundation
   - 3 intermediate
   - 5 advanced
4. Include at least:
   - 1 assertion-reason
   - 1 MCQ multiple
   - 1 short answer
   - 1 real-life application
   - 1 misconception correction
5. No two questions should feel like number-swapped copies.
6. All distractors must be plausible.
7. The content should feel good enough to sell as a premium academic product.

Return the questions in a structured, clean format.
```

## Prompt For Math Question Generation

Use this for math-heavy premium content.

```text
Generate {COUNT} premium Math questions for:

Class: {CLASS_NAME}
Topic: {TOPIC_NAME}
Board: {BOARD_NAME}

Mandatory variety:
- number sense
- stepwise reasoning
- applied arithmetic
- logical pattern or puzzle style
- elimination-based MCQ
- real-life situation
- short numerical answer
- one or more olympiad-style twists

Important anti-repetition rules:
1. Do not create the same mathematical structure repeatedly with changed numbers.
2. Avoid producing 10 versions of “find the product/sum/value” with identical logic.
3. Use different contexts such as money, school, arrangements, measurements, tables, and comparisons.
4. Advanced questions must involve reasoning, not only bigger numbers.
5. Use realistic distractors built from common calculation mistakes, place-value errors, sign errors, and logic mistakes.

Required output fields:
- question_type
- difficulty_level
- archetype
- question_text
- options
- correct_answer
- explanation
```

## Prompt For Science Question Generation

Use this for science-heavy premium content.

```text
Generate {COUNT} premium Science questions for:

Class: {CLASS_NAME}
Topic: {TOPIC_NAME}
Board: {BOARD_NAME}

Mandatory variety:
- concept understanding
- observation-based inference
- daily-life application
- experiment or activity-based reasoning
- assertion-reason
- misconception correction
- compare and classify
- case-based question

Important anti-repetition rules:
1. Do not repeat the same conceptual sentence with slightly different wording.
2. Do not let all advanced questions collapse into a single assertion-reason pattern.
3. Use different contexts such as classroom experiments, sports, home situations, environmental observations, and lab thinking.
4. Keep explanations scientifically correct and concise.
5. Distractors must represent believable student misconceptions.

Required output fields:
- question_type
- difficulty_level
- archetype
- question_text
- options
- correct_answer
- explanation
```

## Prompt For Assertion-Reason Questions Only

Use this when building a selective assertion-reason pack without making it repetitive.

```text
Generate {COUNT} assertion-reason questions for:

Class: {CLASS_NAME}
Subject: {SUBJECT_NAME}
Topic: {TOPIC_NAME}

Important rules:
1. Each assertion-reason pair must test a different sub-concept.
2. Do not restate the same idea in different wording.
3. Use varied logic patterns:
   - both true and explanation correct
   - both true but explanation not correct
   - assertion true but reason false
   - assertion false but reason true
4. Make the reason academically meaningful, not a shallow paraphrase.
5. Avoid writing more than two questions with the same visible structure.

Use standard four answer options.
Also include:
- learning_objective
- explanation
- why the distractors are plausible
```

## Prompt For Case-Based Questions

Use this for stronger practical content.

```text
Generate {COUNT} case-based questions for:

Class: {CLASS_NAME}
Subject: {SUBJECT_NAME}
Topic: {TOPIC_NAME}

Rules:
1. Each question must start from a short realistic situation.
2. The situation must be useful, not decorative.
3. Each case should test a different concept or reasoning angle.
4. Avoid repeated openings such as “A student says…” in every question.
5. Keep the scenario concise and easy to visualize.
6. Use premium-quality distractors.

Preferred contexts:
- classroom
- home
- lab
- sports
- travel
- shopping
- nature or environment
```

## Prompt For Multi-Select Questions

Use this for richer evaluation.

```text
Generate {COUNT} MCQ Multiple questions for:

Class: {CLASS_NAME}
Subject: {SUBJECT_NAME}
Topic: {TOPIC_NAME}

Rules:
1. Each question should have 4 options.
2. At least 2 options should be correct when academically appropriate.
3. Incorrect options must be plausible.
4. Do not repeat the same “Select all true statements” structure in every question.
5. Use different formats:
   - select all correct observations
   - select all valid methods
   - select all statements that apply
   - select all reasons that support a conclusion
```

## Prompt For Short-Answer Questions

Use this to create non-trivial short answers.

```text
Generate {COUNT} short-answer questions for:

Class: {CLASS_NAME}
Subject: {SUBJECT_NAME}
Topic: {TOPIC_NAME}

Rules:
1. Answers must be short but not trivial.
2. Do not create only direct recall prompts.
3. Include calculation, explanation, inference, or one-step reasoning where suitable.
4. Avoid repeating the same “find the value” structure.
5. Include accepted answer variants where needed.
```

## Prompt For Expanding Existing Topic Bank Without Duplicates

Use this when questions already exist and you want fresh ones.

```text
You are expanding an existing question bank.

Topic:
- Class: {CLASS_NAME}
- Subject: {SUBJECT_NAME}
- Topic: {TOPIC_NAME}

Existing question styles already present:
{EXISTING_PATTERNS_OR_SAMPLE_STEMS}

Task:
Generate {COUNT} new questions that do NOT duplicate the existing styles.

Hard constraints:
1. Avoid all visible stem styles already listed above.
2. Avoid all logic structures already listed above.
3. Prefer new archetypes and new contexts.
4. If an idea is too close to an existing question, discard it and create a different one.
5. The new set should clearly expand variety, not just add volume.
```

## Prompt For AI Self-Check Before Final Output

Use this after generation if the model supports multi-step refinement.

```text
Review the generated question set and check:

1. Are any two questions near-duplicates?
2. Are multiple questions using the same visible stem?
3. Are advanced questions too similar to each other?
4. Are distractors weak or obviously wrong?
5. Are there enough different archetypes?
6. Does the set feel premium and saleable?

If any problem is found, rewrite the weak questions before final output.
```

## Recommended Workflow

Best practical sequence:

1. Generate `10` benchmark questions.
2. Review them using the content playbook.
3. Expand to `25`.
4. Run the audit command against the generated/imported set.
5. Only then scale to `50` or `100`.

## Final Rule

Never ask for “100 questions on one topic” with a weak prompt.

Weak prompts create:

- repeated stems
- number-swapped clones
- shallow distractors
- fake difficulty

Strong prompts create:

- richer variety
- stronger reasoning
- cleaner exam readiness
- better saleable content
