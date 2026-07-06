# Class 7 Science Chapterwise Seeding Plan

## Objective

Create Class 7 Science questions using a chapter-first workflow that is:

- fast enough for active content building
- strict enough for production use
- clean enough for package-based monetization later

This plan assumes:

- visible structure = `Class 7 -> Science -> Chapter`
- every seeded question must belong to exactly one visible chapter pack
- duplicate questions are not allowed

Reference spec:

- [CLASS_7_SCIENCE_CHAPTER_REGISTRY_IMPLEMENTATION_SPEC.md](/Users/ansh/Documents/Eductech/docs/content-question-bank/CLASS_7_SCIENCE_CHAPTER_REGISTRY_IMPLEMENTATION_SPEC.md:1)

## Standard Target Per Chapter

Default seed size per chapter:

- `50 questions`

Default difficulty distribution:

- `40% foundation`
- `30% medium`
- `30% hard`

Translated into counts:

- `20 foundation`
- `15 medium`
- `15 hard`

If we complete all `13` chapters:

- `13 x 50 = 650 Science questions`

## Canonical Chapter Order

Recommended authoring and seeding order:

1. Nutrition in Plants
2. Nutrition in Animals
3. Heat
4. Acids, Bases and Salts
5. Physical and Chemical Changes
6. Motion and Time
7. Electric Current and Its Effects
8. Light
9. Reproduction in Plants
10. Respiration in Organisms
11. Transportation in Animals and Plants
12. Forests: Our Lifeline
13. Wastewater Story

Reason for this order:

- earlier chapters already align better with existing curated repo packs
- this lets us build momentum on cleaner chapters first
- later mixed chapters can be handled after the chapter-first rules are stable

## Per-Chapter Authoring Contract

Before authoring a chapter pack, define:

- visible chapter name
- chapter code
- internal topic code mapping
- subtopic list
- misconceptions list
- allowed question types
- difficulty distribution
- duplicate control notes

## Standard Question-Type Mix

Recommended default per `50-question` chapter pack:

- `30` MCQ direct or reasoning questions
- `10` case, observation, or experiment interpretation questions
- `10` application or higher-order questions

This keeps packs useful for:

- practice
- chapter tests
- assignments
- mixed mock exams

## Difficulty Rules

### Foundation questions

Should test:

- direct concept understanding
- definitions
- obvious examples
- simple observation
- one-step recall or recognition

Target count:

- `20 per chapter`

### Medium questions

Should test:

- compare and classify
- cause-and-effect
- simple process understanding
- everyday application
- one-to-two-step reasoning

Target count:

- `15 per chapter`

### Hard questions

Should test:

- multi-step reasoning
- experiment interpretation
- assertion-style logic
- cross-concept application inside the same chapter
- misconception resistance

Target count:

- `15 per chapter`

## No-Duplicate Rule

This is mandatory.

### Prohibited duplicates

- exact same question text
- same question with only option order changed
- same stem with only names or objects swapped
- same experimental situation with identical reasoning path
- same answer pattern reused with cosmetic wording change

### Practical duplicate policy

A question must be rejected if it is:

- exact duplicate
- near duplicate
- concept duplicate with trivial language variation

### Safe authoring rule

Each question should be unique in at least one of these ways:

- different concept focus
- different reasoning pattern
- different evidence or observation
- different data/diagram/case setup

## Chapter-by-Chapter Seed Matrix

| Chapter | Chapter code | Internal pack alignment | Target total | Foundation | Medium | Hard |
| --- | --- | --- | --- | --- | --- | --- |
| Nutrition in Plants | `CLS7-SCI-CH-NUTRITION-PLANTS` | `SCI-LIFE-PLANTS` | 50 | 20 | 15 | 15 |
| Nutrition in Animals | `CLS7-SCI-CH-NUTRITION-ANIMALS` | `SCI-LIFE-ANIMALS` | 50 | 20 | 15 | 15 |
| Heat | `CLS7-SCI-CH-HEAT` | `SCI-PHYSICS-HEAT` | 50 | 20 | 15 | 15 |
| Acids, Bases and Salts | `CLS7-SCI-CH-ACID-BASE-SALTS` | `SCI-MATTER-ACIDBASE` | 50 | 20 | 15 | 15 |
| Physical and Chemical Changes | `CLS7-SCI-CH-PHYSICAL-CHEMICAL-CHANGES` | `SCI-MATTER-CHANGES` | 50 | 20 | 15 | 15 |
| Respiration in Organisms | `CLS7-SCI-CH-RESPIRATION` | dedicated chapter pack | 50 | 20 | 15 | 15 |
| Transportation in Animals and Plants | `CLS7-SCI-CH-TRANSPORTATION` | mixed internal mapping with one visible chapter | 50 | 20 | 15 | 15 |
| Reproduction in Plants | `CLS7-SCI-CH-REPRODUCTION-PLANTS` | `SCI-LIFE-PLANT-REPRODUCTION` | 50 | 20 | 15 | 15 |
| Motion and Time | `CLS7-SCI-CH-MOTION-TIME` | `SCI-MOTION-MOTION`, `SCI-MOTION-TIME` | 50 | 20 | 15 | 15 |
| Electric Current and Its Effects | `CLS7-SCI-CH-ELECTRIC-CURRENT` | `SCI-PHYSICS-ELECTRICITY` | 50 | 20 | 15 | 15 |
| Light | `CLS7-SCI-CH-LIGHT` | `SCI-PHYSICS-LIGHT` | 50 | 20 | 15 | 15 |
| Forests: Our Lifeline | `CLS7-SCI-CH-FORESTS` | `SCI-ENV-FORESTS` | 50 | 20 | 15 | 15 |
| Wastewater Story | `CLS7-SCI-CH-WASTEWATER` | `SCI-ENV-WASTEWATER` | 50 | 20 | 15 | 15 |

## Practical Creation Workflow

For each chapter:

1. freeze chapter scope
2. define subtopics
3. write `20 foundation` questions
4. write `15 medium` questions
5. write `15 hard` questions
6. run duplicate review
7. run concept review
8. run answer validation
9. seed approved chapter pack
10. verify chapter visibility in the app

Do not start authoring the next chapter until the current chapter pack passes duplicate and correctness review.

## Review Checklist Per Chapter

Every chapter pack must pass:

- no duplicate questions
- no near-duplicate variants
- correct chapter tagging
- correct difficulty tagging
- correct answer key
- explanation quality check
- language clarity check
- age-appropriate framing
- no mixed-chapter leakage

## Recommended Repo Structure

For Science chapter authoring, keep:

- chapter registry spec
- chapterwise content map
- one authoring file per internal pack or chapter pack
- one seed pack per final approved pack

Recommended outcome:

- one visible chapter registry
- one approved seeded chapter pack per chapter
- one clean package-ready Science bank

## Best Immediate Execution Choice

Start with these first `5` chapters:

1. Nutrition in Plants
2. Nutrition in Animals
3. Heat
4. Acids, Bases and Salts
5. Physical and Chemical Changes

These are the cleanest starting point because they already align well with the current curated internal Science structure.
