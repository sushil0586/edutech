# Class 7 Math NCERT Chapterwise Content Map

## Objective

Use a clean school taxonomy for Class 7 Math content:

- `Class 7`
- `Mathematics`
- `Chapter`
- `Question Pack`

For school content, the business meaning should be:

- `Class` = academic grade, for example `Class 7`
- `Subject` = `Mathematics`
- `Chapter` = the curriculum teaching unit
- `Question Pack` = the authored 50-question bank used for practice tests, chapter tests, assignments, or mixed exams

This keeps school content easy to understand for institutes, teachers, and students.

## Canonical Structure

Recommended school hierarchy:

`Class 7 -> Mathematics -> Chapter -> Questions`

Recommended implementation rule:

- every question must belong to exactly one chapter-level pack
- the same question text must not be reused across two chapter packs
- number-swapped variants should also be treated as duplicates

## Current Repo Reality

The repo already has `18` curated Class 7 Math packs under:

`edutech_backend/question_blueprints/class_7/curated_authoring/math_science_v2/`

These are high-quality topic packs, but they do not perfectly match NCERT chapter naming one-to-one.

So for school mode, we should treat them as chapter-aligned subtopics.

## NCERT Chapterwise Mapping

### 1. Integers

Status: `Gap in curated v2 chapter map`

Current repo alignment:

- older bank exists:
  - `CLASS_7_INTEGERS_50_QUESTION_BANK.md`

Recommended school treatment:

- create or upgrade a canonical curated pack for `Integers`
- keep all integer questions only inside this chapter pack

### 2. Fractions and Decimals

Status: `Covered through chapter split`

Current curated topic packs:

- `MATH-FRACTIONS-EQUIVALENT`
- `MATH-FRACTIONS-MULTIPLY`
- `MATH-FRACTIONS-DIVIDE`
- `MATH-ARITH-DECIMALS`

Recommended school treatment:

- show this as one chapter: `Fractions and Decimals`
- internally keep four sub-packs for cleaner authoring and better variety
- when creating a chapter exam, pull questions from these four packs without duplication

### 3. Data Handling

Status: `Gap in curated v2 chapter map`

Current repo alignment:

- older bank exists:
  - `CLASS_7_DATA_HANDLING_50_QUESTION_BANK.md`

Recommended school treatment:

- promote this into a canonical chapter pack for school mode

### 4. Simple Equations

Status: `Gap in curated v2 chapter map`

Current repo alignment:

- older bank exists:
  - `CLASS_7_SIMPLE_EQUATIONS_50_QUESTION_BANK.md`

Recommended school treatment:

- promote this into a canonical chapter pack for school mode

### 5. Lines and Angles

Status: `Covered through chapter split`

Current curated topic packs:

- `MATH-GEOMETRY-LINES`
- `MATH-GEOMETRY-ANGLES`

Recommended school treatment:

- show this as one chapter: `Lines and Angles`
- internally retain two packs because line concepts and angle reasoning are naturally different

### 6. The Triangle and Its Properties

Status: `Covered`

Current curated topic pack:

- `MATH-GEOMETRY-TRIANGLES`

Recommended school treatment:

- direct one-chapter mapping

### 7. Congruence of Triangles

Status: `Gap in curated v2 chapter map`

Current repo alignment:

- older bank exists:
  - `CLASS_7_CONGRUENCE_OF_TRIANGLES_50_QUESTION_BANK.md`

Recommended school treatment:

- promote this into a canonical chapter pack for school mode

### 8. Comparing Quantities

Status: `Not covered in curated v2`

Current repo alignment:

- no clear curated chapter pack found

Recommended school treatment:

- create a dedicated chapter pack

### 9. Rational Numbers

Status: `Not covered in curated v2`

Current repo alignment:

- no clear curated chapter pack found

Recommended school treatment:

- create a dedicated chapter pack

### 10. Practical Geometry

Status: `Gap in curated v2 chapter map`

Current repo alignment:

- older bank exists:
  - `CLASS_7_PRACTICAL_GEOMETRY_50_QUESTION_BANK.md`

Recommended school treatment:

- promote this into a canonical chapter pack for school mode

### 11. Perimeter and Area

Status: `Gap in curated v2 chapter map`

Current repo alignment:

- older bank exists:
  - `CLASS_7_PERIMETER_AND_AREA_50_QUESTION_BANK.md`

Recommended school treatment:

- promote this into a canonical chapter pack for school mode

### 12. Algebraic Expressions

Status: `Covered through chapter split`

Current curated topic packs:

- `MATH-ALGEBRA-LETTERS`
- `MATH-ALGEBRA-VARIABLES`
- `MATH-ALGEBRA-PATTERNS`

Recommended school treatment:

- show this as one chapter: `Algebraic Expressions`
- keep internal split because expression basics, variables, and pattern rules are authoring-wise distinct

### 13. Exponents and Powers

Status: `Not covered in curated v2`

Current repo alignment:

- no clear curated chapter pack found

Recommended school treatment:

- create a dedicated chapter pack

### 14. Symmetry

Status: `Gap in curated v2 chapter map`

Current repo alignment:

- older bank exists:
  - `CLASS_7_SYMMETRY_50_QUESTION_BANK.md`

Recommended school treatment:

- promote this into a canonical chapter pack for school mode

### 15. Visualising Solid Shapes

Status: `Gap in curated v2 chapter map`

Current repo alignment:

- older bank exists:
  - `CLASS_7_VISUALISING_SOLID_SHAPES_50_QUESTION_BANK.md`

Recommended school treatment:

- promote this into a canonical chapter pack for school mode

## Additional Curated Packs Present In Repo

These curated packs exist, but they are not direct NCERT Class 7 chapter names:

- `MATH-NUMBERS-LARGE`
- `MATH-NUMBERS-SYSTEMS`
- `MATH-NUMBERS-PLACE`
- `MATH-ARITH-EXPRESSIONS`
- `MATH-ARITH-ORDER`
- `MATH-LOGIC-NUMBERPLAY`
- `MATH-LOGIC-PATTERNS`
- `MATH-LOGIC-PUZZLES`

Recommended treatment:

- keep them as school enrichment packs
- or map them under a future bucket such as:
  - `Class 7 -> Mathematics -> Foundation Skills`
  - `Class 7 -> Mathematics -> Logical Thinking`
- do not force them into the main NCERT chapter list unless product wants strict chapter-first browsing

## Duplicate Control Rule

This must be enforced for school content:

- no exact duplicate question across chapter packs
- no near-duplicate question with only changed numbers
- no repeated real-life story with the same solving pattern
- no repeated distractor pattern across too many questions
- one question should test one clear learning objective

Use this checklist as the current quality gate:

- [CLASS_7_MATH_QUALITY_CHECKLIST.md](/Users/ansh/Documents/Eductech/edutech_backend/question_blueprints/class_7/curated_authoring/math_science_v2/CLASS_7_MATH_QUALITY_CHECKLIST.md:1)

## Recommended Product Rule

For school mode, the cleanest UX is:

- student sees `Class 7`
- then `Mathematics`
- then chapter list using NCERT names

Behind the scenes:

- a chapter may map to one pack
- or a chapter may map to multiple curated sub-packs

Example:

- `Fractions and Decimals`
  - `MATH-FRACTIONS-EQUIVALENT`
  - `MATH-FRACTIONS-MULTIPLY`
  - `MATH-FRACTIONS-DIVIDE`
  - `MATH-ARITH-DECIMALS`

This is good because:

- UX stays chapterwise for school users
- authoring stays modular for content quality
- exams can mix subtopics without duplicating questions

## Current Summary

From a school NCERT point of view:

- directly or partially covered through curated split packs: `4` chapters
  - `Fractions and Decimals`
  - `Lines and Angles`
  - `The Triangle and Its Properties`
  - `Algebraic Expressions`
- older-bank-backed but not yet cleanly promoted into curated chapter packs: `8` chapters
  - `Integers`
  - `Data Handling`
  - `Simple Equations`
  - `Congruence of Triangles`
  - `Practical Geometry`
  - `Perimeter and Area`
  - `Symmetry`
  - `Visualising Solid Shapes`
- still needing dedicated canonical chapter packs: `3` chapters
  - `Comparing Quantities`
  - `Rational Numbers`
  - `Exponents and Powers`

## Best Next Step

Build a canonical chapter registry for school:

1. define all `15` NCERT Class 7 Math chapters in DB/config
2. map each chapter to one or more repo question packs
3. migrate older standalone banks into curated Markdown packs where needed
4. run duplicate review chapter by chapter before final seeding
