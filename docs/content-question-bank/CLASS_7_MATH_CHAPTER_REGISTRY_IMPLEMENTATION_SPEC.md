# Class 7 Math Chapter Registry Implementation Spec

## Objective

Define the implementation-ready mapping for school content using:

- `Program`: Class 7
- `Subject`: Mathematics
- `Chapter`: NCERT-style visible chapter
- `Internal topic packs`: curated repo packs used for authoring and seeding

This spec is based on the current backend preset:

- [seed_presets.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/academics/management/seed_presets.py:1)

Important current preset:

- `class_7_cbse_core`

## Current Backend Reality

The backend already has:

- `Program`: `Class 7`
- `Subject`: `Math`
- `6` parent topic groups
- `18` leaf topic codes

Current leaf topic groups in preset:

1. `MATH-NUMBERS`
2. `MATH-ARITH`
3. `MATH-ALGEBRA`
4. `MATH-GEOMETRY`
5. `MATH-FRACTIONS`
6. `MATH-LOGIC`

This is a good normalized internal structure, but it is not a strict NCERT chapter list.

## Recommended Product Decision

For school mode, do **not** replace the current normalized internal preset immediately.

Instead:

1. keep the existing `18` internal leaf topic codes
2. introduce a visible `chapter registry` layer
3. map each visible chapter to one or more internal topic codes
4. keep duplicate control at the question-pack level

This gives us:

- clean school UX
- backward compatibility with the current preset
- better content modularity

## Canonical Visible Chapter Registry

Recommended visible chapter list for `Class 7 -> Mathematics`:

1. Integers
2. Fractions and Decimals
3. Data Handling
4. Simple Equations
5. Lines and Angles
6. The Triangle and Its Properties
7. Congruence of Triangles
8. Comparing Quantities
9. Rational Numbers
10. Practical Geometry
11. Perimeter and Area
12. Algebraic Expressions
13. Exponents and Powers
14. Symmetry
15. Visualising Solid Shapes

## Registry Mapping

### Visible chapters that can map to current curated leaf topics

| Visible chapter | Internal topic codes |
| --- | --- |
| Fractions and Decimals | `MATH-FRACTIONS-EQUIVALENT`, `MATH-FRACTIONS-MULTIPLY`, `MATH-FRACTIONS-DIVIDE`, `MATH-ARITH-DECIMALS` |
| Lines and Angles | `MATH-GEOMETRY-LINES`, `MATH-GEOMETRY-ANGLES` |
| The Triangle and Its Properties | `MATH-GEOMETRY-TRIANGLES` |
| Algebraic Expressions | `MATH-ALGEBRA-LETTERS`, `MATH-ALGEBRA-VARIABLES`, `MATH-ALGEBRA-PATTERNS` |

### Visible chapters currently backed by older standalone banks

| Visible chapter | Current source |
| --- | --- |
| Integers | `CLASS_7_INTEGERS_50_QUESTION_BANK.md` |
| Data Handling | `CLASS_7_DATA_HANDLING_50_QUESTION_BANK.md` |
| Simple Equations | `CLASS_7_SIMPLE_EQUATIONS_50_QUESTION_BANK.md` |
| Congruence of Triangles | `CLASS_7_CONGRUENCE_OF_TRIANGLES_50_QUESTION_BANK.md` |
| Practical Geometry | `CLASS_7_PRACTICAL_GEOMETRY_50_QUESTION_BANK.md` |
| Perimeter and Area | `CLASS_7_PERIMETER_AND_AREA_50_QUESTION_BANK.md` |
| Symmetry | `CLASS_7_SYMMETRY_50_QUESTION_BANK.md` |
| Visualising Solid Shapes | `CLASS_7_VISUALISING_SOLID_SHAPES_50_QUESTION_BANK.md` |

### Visible chapters still needing canonical chapter packs

| Visible chapter | Current state |
| --- | --- |
| Comparing Quantities | no canonical curated pack yet |
| Rational Numbers | no canonical curated pack yet |
| Exponents and Powers | no canonical curated pack yet |

## Internal Topics That Should Stay As Internal-Only For Now

These are useful and already authored, but they should not be shown as main NCERT chapters unless product explicitly wants enrichment lanes mixed into school browsing:

- `MATH-NUMBERS-LARGE`
- `MATH-NUMBERS-SYSTEMS`
- `MATH-NUMBERS-PLACE`
- `MATH-ARITH-EXPRESSIONS`
- `MATH-ARITH-ORDER`
- `MATH-LOGIC-NUMBERPLAY`
- `MATH-LOGIC-PATTERNS`
- `MATH-LOGIC-PUZZLES`

Recommended presentation:

- use them inside chapter exam generation
- or expose them later as:
  - `Foundation Skills`
  - `Mental Ability`
  - `Enrichment`

## Recommended Config Shape

Add a chapter registry config layer, separate from the academic preset itself.

Suggested shape:

```json
{
  "program_code": "CLS7",
  "subject_code": "CLS7-MATH",
  "visible_chapters": [
    {
      "chapter_code": "CLS7-MATH-CH-FRACDEC",
      "chapter_name": "Fractions and Decimals",
      "sort_order": 20,
      "internal_topic_codes": [
        "MATH-FRACTIONS-EQUIVALENT",
        "MATH-FRACTIONS-MULTIPLY",
        "MATH-FRACTIONS-DIVIDE",
        "MATH-ARITH-DECIMALS"
      ]
    },
    {
      "chapter_code": "CLS7-MATH-CH-LINESANGLES",
      "chapter_name": "Lines and Angles",
      "sort_order": 50,
      "internal_topic_codes": [
        "MATH-GEOMETRY-LINES",
        "MATH-GEOMETRY-ANGLES"
      ]
    }
  ]
}
```

## Recommended DB/Product Rule

Visible chapter registry should drive:

- school content browsing
- chapter tests
- teacher chapter selection
- institute chapter-level reports

Internal topic codes should continue to drive:

- question authoring
- seeding
- pack maintenance
- duplicate control

## Duplicate Rule

This must be enforced across all Class 7 Math chapter content:

- no exact duplicate question text across two chapter packs
- no near-duplicate created by only changing numbers
- no repeated classroom story with the same solving pattern
- no repeated distractor set template across too many items

Recommended operational rule:

- one authored question belongs to one internal topic pack only
- one internal topic pack maps to one visible chapter only

This keeps overlap manageable.

## Suggested Rollout Order

### Phase 1. Registry only

- keep current preset unchanged
- add visible chapter registry config
- use it for UI labels and chapter selection

### Phase 2. Content normalization

- convert older standalone chapter banks into curated Markdown packs
- create missing packs for:
  - `Comparing Quantities`
  - `Rational Numbers`
  - `Exponents and Powers`

### Phase 3. Chapter-first seeding orchestration

- support seeding by visible chapter
- internally fan out to mapped topic codes

## Best Immediate Implementation Choice

If we want the fastest safe path:

1. keep `class_7_cbse_core` as is
2. add a `chapter alias / registry` layer for school mode
3. do not rename existing topic codes yet
4. gradually migrate older chapter banks into curated Markdown packs

That gives us school-friendly UX without breaking current content pipelines.
