# First pilot content offer

Selected 21 October 2026 · Status: Ready for academic approval

## Offer boundary

The first offer is an assisted institute web pilot for Indian private schools using a CBSE/NCERT-first Class 7 structure. It is a bounded **Math foundation and Science objective assessment pack**, not a complete Class 7 curriculum. Delivery and authoring are in English. Android and iOS remain student-only and are outside this content-selection gate.

The assessment scope contains four automatically scored types: single-choice MCQ, multiple-choice MCQ, true/false and exact-match short answer. Essay/manual-review questions, descriptive grading, public cross-institute exams and paid shared-library acquisition are excluded.

## Promised inventory

Every listed topic has one compiled pack of 50 questions. The source inventory contains 1,250 questions across 25 topics: 350 Math questions across 7 topics and 900 Science questions across 18 topics.

### Math

| Topic code | Pilot topic |
| --- | --- |
| `MATH-NUMBERS-LARGE` | Large Numbers Around Us |
| `MATH-NUMBERS-SYSTEMS` | Indian and International Number Systems |
| `MATH-NUMBERS-PLACE` | Place Value and Comparison |
| `MATH-ARITH-EXPRESSIONS` | Arithmetic Expressions |
| `MATH-ARITH-ORDER` | Order of Operations |
| `MATH-ARITH-DECIMALS` | Decimals |
| `MATH-ALGEBRA-VARIABLES` | Variables and Expressions |

The other 11 Class 7 Math leaf topics in the catalog are not part of the pilot offer because they do not have compiled curated packs in this release source.

### Science

| Topic code | Pilot topic |
| --- | --- |
| `SCI-EXPLORATION-WORLD` | The Ever-Evolving World of Science |
| `SCI-MATTER-ACIDBASE` | Acidic, Basic, and Neutral Substances |
| `SCI-MATTER-METALS` | Metals and Non-metals |
| `SCI-MATTER-CHANGES` | Physical and Chemical Changes |
| `SCI-PHYSICS-ELECTRICITY` | Electric Circuits and Components |
| `SCI-PHYSICS-HEAT` | Heat Transfer in Nature |
| `SCI-PHYSICS-LIGHT` | Light, Shadows, and Reflections |
| `SCI-MOTION-TIME` | Measurement of Time |
| `SCI-MOTION-MOTION` | Motion in Everyday Life |
| `SCI-LIFE-ANIMALS` | Life Processes in Animals |
| `SCI-LIFE-PLANTS` | Life Processes in Plants |
| `SCI-LIFE-RESPIRATION` | Respiration in Organisms |
| `SCI-LIFE-TRANSPORT` | Transportation in Animals and Plants |
| `SCI-LIFE-PLANT-REPRODUCTION` | Reproduction in Plants |
| `SCI-HEALTH-ADOLESCENCE` | Adolescence and Growth |
| `SCI-SPACE-EARTHMOONSUN` | Earth, Moon, and the Sun |
| `SCI-ENV-FORESTS` | Forests: Our Lifeline |
| `SCI-ENV-WASTEWATER` | Wastewater Story |

## Exam bundles offered

The assisted setup may create these three objective patterns from the approved inventory:

| Pattern | Questions | Duration | Topic scope | Release policy |
| --- | ---: | ---: | --- | --- |
| Topic quiz | 10 | 15 minutes | One offered topic | Teacher publishes results |
| Topic test | 20 | 30 minutes | One or two offered topics in one subject | Teacher publishes results |
| Mixed subject assessment | 40 | 60 minutes | Offered Math and/or Science topics | Teacher publishes results |

Negative marking is off by default. Teachers may choose fewer topics within the offered inventory, but may not advertise uncovered Class 7 topics as supplied content.

## Ownership and review

The packs are provisioned into each pilot institute and become private institute-source questions under the current data model. They are not sold or represented as platform-licensed shared-library content. The academic lead is accountable for approval; a Math reviewer and a Science reviewer must be named in the signoff record before enrollment.

The minimum topic gate is 50 complete questions, valid answer keys, explanations, accepted answers for short-answer items, no placeholder text, an academic-lead-approved difficulty distribution, peer review for correctness and repetition, successful lint/compile/seed and a database spot check. The current Math checklist calls for 10/20/20 foundation/intermediate/advanced; three included Math packs currently lint as 10/25/15. The Science packs lint as 20/15/15 but do not yet have a separate approved Science checklist. W05.02 must resolve or explicitly approve these distributions and perform the human curriculum and editorial review; structural validation alone is not academic approval.

## Provisioning gate

The running Docker database inspected on 21 October contains zero questions from seed batch `curated_math_science_v2`. Before pilot use, provision only these 25 topic codes into the selected institute, then reconcile the database totals and visibility. The source packs are candidate inventory, not deployed customer inventory.

Machine-readable inventory and source counts are in [the W05 selection evidence](../qa/evidence/w05-first-content-offer-20261021/content-offer-inventory.json).
