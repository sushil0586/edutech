# Class 8 Math Seed And Onboarding Implementation Plan

## Status Note

This document contains historical implementation planning context.

As of `2026-07-06`, part of this plan is now outdated:

- the backend already includes the `class_8_cbse_core` academic preset
- `seed_public_academics --preset class_8_cbse_core` already exists
- `seed_master_question_library --preset class_8_cbse_core --subjects math --questions-per-topic 50` can already generate the `200` public Class 8 Math master rows

So the current blocker is no longer missing preset support in code.
The current blocker is stage seed execution.

Use this runbook for the live stage remediation sequence:

- [STAGE_SEED_CONTRACT_REMEDIATION_2026-07-06.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SEED_CONTRACT_REMEDIATION_2026-07-06.md)

## Current Finding
The first Playwright verification spec for Class 8 Math is correctly failing because the required public academic seed does not exist yet.

Confirmed current state:
- Public institutes exist:
  - `PUB001`
  - `NEXORA-PUBLIC`
- Public academic program registry currently contains only:
  - `Class 7 (CLS7)`
- There is no public:
  - `Class 8` program
  - `Class 8 Math` subject
  - `Class 8 Math` topic tree
- `question_blueprints/class_8/` is only a placeholder folder right now
- `seed_curated_math_science_questions.py` is currently designed around:
  - `class_7_cbse_core`
  - Class 7 Math and Science topic packs

So the automation blocker is real:
- Class 8 onboarding cannot be proven until Class 8 public academics and Class 8 Math question content actually exist.

## Goal
Make Class 8 Math fully testable for onboarding and question-bank access by adding:

1. Public academic registry for Class 8
2. Public Class 8 Math subject
3. Four Class 8 Math topic groups
4. Two hundred curated Class 8 Math questions
5. A reusable seed flow that works like the current Class 7 curated seed flow

## Fixed Scope For This Phase

### Program
- Class 8
- Code suggestion: `CLS8`

### Subject
- Math
- Code suggestion: `CLS8-MATH`

### Topic groups
- Rational Numbers
- Linear Equations in One Variable
- Comparing Quantities
- Algebraic Expressions and Identities

### Question count
- 200 total
- 50 per topic group
- no duplicate question rows
- no duplicate authored question text

## Required Implementation Areas

## 1. Academic preset registry

### What is missing
- No `CLASS_8_CBSE_CORE` style preset exists in `apps/academics/management/seed_presets.py`

### What needs to be added
- A new preset definition for Class 8
- Program definition:
  - `name = Class 8`
  - `code = CLS8`
- Subject definition:
  - `name = Math`
  - `code = CLS8-MATH`
- Topic-group definitions with child topic codes

### Suggested topic-group/code structure
- Rational Numbers
  - `CLS8-MATH-RATIONAL`
- Linear Equations in One Variable
  - `CLS8-MATH-LINEAR-EQN`
- Comparing Quantities
  - `CLS8-MATH-COMP-QUANT`
- Algebraic Expressions and Identities
  - `CLS8-MATH-ALG-IDENTITIES`

If more granular child-topic breakdown is preferred, each topic group should still have child topics so the current preset-driven topic tree remains consistent with the existing academic design.

## 2. Public academics seed

### What is missing
- No public Class 8 academic data has been materialized into `PUB001` / `NEXORA-PUBLIC`

### What needs to happen
- Extend public academic seed flow so Class 8 preset can be created in the public institute
- Re-run public academic seed command

### Expected result
- Public institute contains:
  - Program `CLS8`
  - Subject `CLS8-MATH`
  - Topic groups and child topics for the four selected areas

## 3. Class 8 blueprint and authored pack structure

### What is missing
- `question_blueprints/class_8/` has only README placeholder content

### What needs to be added
- Authoring/compiled pack structure equivalent to current curated flows

Suggested folder path:
- `question_blueprints/class_8/curated_authoring/math_v1/`
- `question_blueprints/class_8/curated_seed_packs/math_v1/`

Suggested files:
- `CLS8-MATH-RATIONAL.md`
- `CLS8-MATH-LINEAR-EQN.md`
- `CLS8-MATH-COMP-QUANT.md`
- `CLS8-MATH-ALG-IDENTITIES.md`

Compiled JSON packs:
- `CLS8-MATH-RATIONAL.json`
- `CLS8-MATH-LINEAR-EQN.json`
- `CLS8-MATH-COMP-QUANT.json`
- `CLS8-MATH-ALG-IDENTITIES.json`

## 4. Generic curated seeding support

### What is missing
- `seed_curated_math_science_questions.py` is class-7-specific in behavior and assumptions

### What needs to be improved
Either:
- extend the current command to support multiple presets including Class 8

Or better:
- create a more generic curated seed command that accepts:
  - target institute code
  - preset
  - subject aliases
  - explicit topic codes
  - questions per topic

### Recommended direction
Refactor toward reusable curated seed support instead of creating another one-off Class 8 command.

### Expected command shape
Example target flow:
```bash
python manage.py seed_curated_questions \
  PUB001 \
  --preset class_8_cbse_core \
  --subjects math \
  --topic-codes CLS8-MATH-RATIONAL CLS8-MATH-LINEAR-EQN CLS8-MATH-COMP-QUANT CLS8-MATH-ALG-IDENTITIES \
  --questions-per-topic 50
```

## 5. Master-library sync

### What is already good
- Question create/update flow already calls:
  - `sync_master_question_from_institute_question(question)`

### What must be verified after implementation
- Newly seeded Class 8 Math public questions appear in:
  - `/api/v1/question-bank/master-library/`
- Filters by:
  - `source_institute_code`
  - `subject_code`
  - `topic_code`
work correctly

## 6. Economy package usability

### After seed is complete
We must be able to:
- create package scope for `CLS8-MATH`
- assign it to `OPBMS`
- assign it to a newly created institute
- confirm institute visibility and exam usability

This is where the already-written Playwright plan resumes.

## Recommended Build Order

1. Add `Class 8` preset definition
2. Seed public academics for Class 8
3. Create four Class 8 Math topic packs
4. Implement generic or extended curated seed command
5. Seed 200 Class 8 Math questions into public institute
6. Re-run master dataset Playwright spec
7. Proceed to OPBMS access spec
8. Proceed to new institute mixed-access onboarding spec

## Acceptance Criteria

### Academics
- Public institute has program `CLS8`
- Public institute has subject `CLS8-MATH`
- Public institute has the 4 intended topic groups

### Content
- Exactly 200 Class 8 Math master questions exist
- 50 questions map to each topic group
- No duplicate question ids
- No duplicate normalized question text

### Access
- `OPBMS` can be granted Class 8 Math through admin UI
- Newly created institute can be granted:
  - Class 7 Math
  - Class 7 Science
  - Class 8 Math

### Automation
- `admin-class8-math-master-dataset.mutable.spec.ts` passes
- `admin-opbms-class8-access.mutable.spec.ts` becomes actionable
- mixed-access onboarding automation can proceed

## Practical Conclusion
Right now the app is not failing on Class 8 onboarding because of a UI bug.
It is failing because the supporting academic and content seed for Class 8 does not yet exist.

So the correct next engineering step is:
- implement Class 8 public academics
- implement Class 8 Math curated content
- then resume onboarding/access automation
