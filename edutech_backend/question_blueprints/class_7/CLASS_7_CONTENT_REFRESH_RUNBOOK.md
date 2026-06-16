# Class 7 Content Refresh Runbook

This runbook explains how to safely refresh weak Class 7 question families after generator improvements.

Use this when:

- audit shows repetitive Class 7 topic families
- a generator family has been improved in code
- you want to refresh only weak content instead of resetting the whole library blindly

## Purpose

The goal is to improve content quality in controlled batches.

This runbook helps you:

- refresh weak families only
- avoid disturbing unrelated content
- compare quality before and after
- make the improvement cycle repeatable for the team

## Practical Principle

Do not wipe and recreate everything every time.

Instead:

1. identify weak Class 7 families from audit
2. improve generator logic for that family
3. refresh only that family’s generated data
4. re-audit the refreshed family
5. move to the next weak family

## When To Use This Runbook

Use it after any of the following:

- audit report marks a family as `NEEDS REVIEW`
- distinct visible question texts are too low
- one question stem dominates too much
- one advanced pattern is repeated too often
- the family blueprint has been updated

## Current Class 7 Weak Families

These are the main families that may need controlled refresh cycles:

- `SCI-HEALTH-*`
- `SCI-MATTER-*`
- `SCI-PHYSICS-*`
- `SCI-MOTION-*`
- `MATH-FRACTIONS-*`
- `MATH-LOGIC-*`

## Safe Refresh Strategy

The safe refresh strategy means:

- refresh one family or one subject-family block at a time
- do not refresh unrelated families in the same step unless intentionally planned
- always use audit before and after

## Business Workflow

1. Review the latest audit report.
2. Pick one weak family.
3. Confirm the blueprint for that family is ready.
4. Confirm the generator code has been updated.
5. Refresh only that family.
6. Run audit again.
7. Compare results.
8. Approve or continue improving.

## Technical Workflow

For each weak family:

1. identify target topic codes or subject-family scope
2. delete only generated public master rows for that family
3. delete only materialized operational question rows for that family
4. regenerate master questions for that family
5. rematerialize that family into operational questions
6. run audit for that family
7. compare metrics with the previous audit

## Refresh Unit Options

There are three practical refresh unit sizes.

### Option 1. Single topic

Use when:

- only one topic is bad
- you want highly controlled comparison

Examples:

- `SCI-SPACE-EARTHMOONSUN`
- `MATH-NUMBERS-SYSTEMS`

### Option 2. Topic family

Use when:

- all related topics share the same weak generator logic
- you fixed one family-level builder in code

Examples:

- all `SCI-MATTER-*`
- all `SCI-PHYSICS-*`
- all `MATH-FRACTIONS-*`

### Option 3. Subject

Use when:

- many families under one subject changed together
- you intentionally want to refresh the full subject lane

Examples:

- all Class 7 Science
- all Class 7 Math

## Recommended Order For Class 7

Suggested practical order:

1. `SCI-HEALTH-*`
2. `SCI-MATTER-*`
3. `SCI-PHYSICS-*`
4. `SCI-MOTION-*`
5. `MATH-FRACTIONS-*`
6. `MATH-LOGIC-*`

Reason:

- these were the weakest areas in the earlier audit
- they benefit most from targeted family-level redesign

## Validation Checklist Before Refresh

Before refreshing a family, confirm:

- audit already proves the family is weak
- the family blueprint exists
- generator changes for that family are complete
- target scope is clearly defined
- you know whether you are refreshing master rows, question rows, or both

## Validation Checklist After Refresh

After refreshing a family, confirm:

- master rows exist for the target family
- operational question rows exist for the target family
- audit report runs successfully
- distinct-text ratio improves
- top-repeat share reduces
- pattern count improves
- frontend shows visibly improved variety

## Success Metrics

A family refresh is moving in the right direction when:

- distinct visible text count increases
- one repeated stem no longer dominates
- pattern mix is broader
- advanced questions are no longer one repeated structure
- content feels more premium in spot checks

## Practical Examples Of Improvement

Bad:

- `100` questions in one topic
- only `3 to 6` distinct visible texts
- `1` advanced pattern repeated `50` times

Better:

- `100` questions in one topic
- `15+` distinct visible texts
- no single stem above roughly `15 to 20%`
- `8+` useful pattern types

## What Not To Do

Avoid:

- full-library refresh after every small generator edit
- changing multiple weak families without separate audit checkpoints
- skipping audit and relying only on UI scrolling
- assuming code changes improved DB content without reseeding

## Reusable Review Loop

This is the long-term repeatable cycle:

1. audit
2. blueprint
3. generator fix
4. targeted refresh
5. audit again
6. accept or revise

## Related Documents

- [Class 7 blueprint index](./README.md)
- [Question Content Playbook](../../QUESTION_CONTENT_PLAYBOOK.md)
- [Question Generation Prompts](../../QUESTION_GENERATION_PROMPTS.md)
- [Question blueprint root](../README.md)

## Standalone Bank Attachments

For geometry-heavy standalone banks such as `Lines and Angles`, `Triangles`, `Practical Geometry`, and `Visualising Solid Shapes`, questions may include attachments.

The standalone markdown seeder supports an optional `Attachments:` block inside any question.

Example:

```md
## Question 12
Question Type: Case Study
Difficulty Level: Intermediate
Question Text: Study the intersecting-line diagram and identify the vertically opposite angle to angle 1.
Options:
- A. Angle 2
- B. Angle 3
- C. Angle 4
- D. Cannot be determined
Correct Answer: B
Explanation: Angles opposite each other when two lines intersect are vertically opposite.
Common Mistake: Confusing adjacent angles with opposite angles.
Learning Objective: Identify vertically opposite angles from a diagram.
Attachments:
- file: assets/class7/lines_angles/q12_intersecting_lines.png
  attachment_type: diagram
  title: Intersecting lines diagram
  alt_text: Two intersecting lines with four angles labeled 1, 2, 3, and 4.
  is_inline: true
```

Notes:

- `file` can be relative to the markdown file location or an absolute path.
- `attachment_type` should usually be `diagram` or `image` for math content.
- `is_inline: true` is useful when the attachment should appear as part of the question stem.
- The attachment file must exist when the seed command is run.
