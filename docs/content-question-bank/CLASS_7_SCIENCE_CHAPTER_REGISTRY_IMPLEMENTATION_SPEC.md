# Class 7 Science Chapter Registry Implementation Spec

## Objective

Define the implementation-ready mapping for school Science content using:

- `Program`: Class 7
- `Subject`: Science
- `Chapter`: NCERT-style visible chapter
- `Internal topic packs`: curated repo packs used for authoring and seeding

This spec should be treated as the canonical school-facing registry before large-scale Science authoring begins.

Relevant current references:

- [CLASS_7_SCIENCE_NCERT_CHAPTERWISE_CONTENT_MAP.md](/Users/ansh/Documents/Eductech/docs/content-question-bank/CLASS_7_SCIENCE_NCERT_CHAPTERWISE_CONTENT_MAP.md:1)
- [seed_presets.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/academics/management/seed_presets.py:1)

Important current preset:

- `class_7_cbse_core`

## Current Backend Reality

The backend already has:

- `Program`: `Class 7`
- `Subject`: `Science`
- parent topic groups and leaf topic codes used for academic setup
- curated Science topic packs under:
  - [math_science_v2](/Users/ansh/Documents/Eductech/edutech_backend/question_blueprints/class_7/curated_authoring/math_science_v2:1)
  - [topics/science](/Users/ansh/Documents/Eductech/edutech_backend/question_blueprints/class_7/topics/science:1)

This structure is good for authoring, but it is not yet the exact school chapter registry we want to expose to institutes and teachers.

## Recommended Product Decision

For school mode, do **not** flatten Science into generic internal topic families.

Instead:

1. keep internal topic packs for authoring and seed maintenance
2. introduce a visible `chapter registry` layer
3. map each visible chapter to one or more internal Science topic packs
4. seed questions chapter-first
5. enforce strict duplicate control at the chapter pack level

This gives us:

- clean school UX
- consistent chapter tests
- easier package design later
- safer deduplication

## Canonical Visible Chapter Registry

Recommended visible chapter list for `Class 7 -> Science`:

1. Nutrition in Plants
2. Nutrition in Animals
3. Heat
4. Acids, Bases and Salts
5. Physical and Chemical Changes
6. Respiration in Organisms
7. Transportation in Animals and Plants
8. Reproduction in Plants
9. Motion and Time
10. Electric Current and Its Effects
11. Light
12. Forests: Our Lifeline
13. Wastewater Story

## Registry Mapping

### Visible chapters already aligned with current curated internal packs

| Visible chapter | Internal topic codes |
| --- | --- |
| Nutrition in Plants | `SCI-LIFE-PLANTS` |
| Nutrition in Animals | `SCI-LIFE-ANIMALS` |
| Heat | `SCI-PHYSICS-HEAT` |
| Acids, Bases and Salts | `SCI-MATTER-ACIDBASE` |
| Physical and Chemical Changes | `SCI-MATTER-CHANGES` |
| Reproduction in Plants | `SCI-LIFE-PLANT-REPRODUCTION` |
| Electric Current and Its Effects | `SCI-PHYSICS-ELECTRICITY` |
| Light | `SCI-PHYSICS-LIGHT` |
| Forests: Our Lifeline | `SCI-ENV-FORESTS` |
| Wastewater Story | `SCI-ENV-WASTEWATER` |

### Visible chapters that should map to multiple internal packs

| Visible chapter | Internal topic codes |
| --- | --- |
| Motion and Time | `SCI-MOTION-MOTION`, `SCI-MOTION-TIME` |
| Transportation in Animals and Plants | `SCI-LIFE-ANIMALS`, `SCI-LIFE-TRANSPORT`, `SCI-LIFE-PLANTS` |

### Visible chapters that need dedicated canonical chapter packs

| Visible chapter | Current state |
| --- | --- |
| Respiration in Organisms | current repo has internal coverage, but no strict school chapter pack should be treated as canonical yet |
| Transportation in Animals and Plants | needs its own visible chapter pack even if internal concepts come from mixed sources |
| Forests: Our Lifeline | curated code exists, but chapter-first seed plan should formalize it |
| Wastewater Story | curated code exists, but chapter-first seed plan should formalize it |

## Recommended Chapter Codes

Suggested stable chapter codes:

| Chapter | Suggested chapter code |
| --- | --- |
| Nutrition in Plants | `CLS7-SCI-CH-NUTRITION-PLANTS` |
| Nutrition in Animals | `CLS7-SCI-CH-NUTRITION-ANIMALS` |
| Heat | `CLS7-SCI-CH-HEAT` |
| Acids, Bases and Salts | `CLS7-SCI-CH-ACID-BASE-SALTS` |
| Physical and Chemical Changes | `CLS7-SCI-CH-PHYSICAL-CHEMICAL-CHANGES` |
| Respiration in Organisms | `CLS7-SCI-CH-RESPIRATION` |
| Transportation in Animals and Plants | `CLS7-SCI-CH-TRANSPORTATION` |
| Reproduction in Plants | `CLS7-SCI-CH-REPRODUCTION-PLANTS` |
| Motion and Time | `CLS7-SCI-CH-MOTION-TIME` |
| Electric Current and Its Effects | `CLS7-SCI-CH-ELECTRIC-CURRENT` |
| Light | `CLS7-SCI-CH-LIGHT` |
| Forests: Our Lifeline | `CLS7-SCI-CH-FORESTS` |
| Wastewater Story | `CLS7-SCI-CH-WASTEWATER` |

## Recommended Config Shape

Add a Science chapter registry config layer, separate from the academic preset itself.

Suggested shape:

```json
{
  "program_code": "CLS7",
  "subject_code": "CLS7-SCI",
  "visible_chapters": [
    {
      "chapter_code": "CLS7-SCI-CH-NUTRITION-PLANTS",
      "chapter_name": "Nutrition in Plants",
      "sort_order": 10,
      "internal_topic_codes": [
        "SCI-LIFE-PLANTS"
      ]
    },
    {
      "chapter_code": "CLS7-SCI-CH-MOTION-TIME",
      "chapter_name": "Motion and Time",
      "sort_order": 90,
      "internal_topic_codes": [
        "SCI-MOTION-MOTION",
        "SCI-MOTION-TIME"
      ]
    }
  ]
}
```

## Recommended DB/Product Rule

Visible Science chapter registry should drive:

- school content browsing
- chapter tests
- teacher chapter selection
- institute chapter-level reports
- package scope design for school question banks

Internal topic codes should continue to drive:

- question authoring
- seeding
- pack maintenance
- duplicate control

## Duplicate Rule

This must be enforced across all Class 7 Science chapter content:

- no exact duplicate question text across two chapter packs
- no near-duplicate created by only changing labels, organisms, or examples
- no repeated experiment scenario with the same reasoning path
- no repeated distractor set pattern across too many questions
- no single question should belong to two visible chapter packs

Recommended operational rule:

- one authored question belongs to one canonical chapter pack only
- chapter split packs may use multiple internal topic codes, but their seeded question output must remain unique

## Difficulty Policy

Class 7 Science chapter packs should use this fixed distribution:

- `40% foundation`
- `30% medium`
- `30% hard`

For a `50-question` chapter pack:

- `20 foundation`
- `15 medium`
- `15 hard`

This distribution should be treated as the default school authoring target unless a chapter explicitly needs a different mix later.

## Suggested Rollout Order

### Phase 1. Registry only

- freeze the visible chapter registry
- keep existing backend preset unchanged
- use the chapter registry for UI labels and chapter selection

### Phase 2. Chapter-first authoring

- author or refresh one chapter pack at a time
- enforce duplicate checks before moving to the next chapter

### Phase 3. Chapter-first seeding orchestration

- support seeding by visible chapter
- internally fan out to mapped topic codes where needed
- verify that seeded output remains unique within the subject bank

## Best Immediate Implementation Choice

If we want the fastest safe path:

1. keep `class_7_cbse_core` as is
2. add this Science chapter registry layer for school mode
3. author `50` questions per chapter using the fixed difficulty mix
4. seed chapter by chapter, not subject-wide in one bulk run
5. reject duplicates before any chapter pack is marked ready
