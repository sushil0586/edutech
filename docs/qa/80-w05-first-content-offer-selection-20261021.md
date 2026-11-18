# W05 first content offer selection

21 October 2026 · Candidate branch `integration/w01-release-20261021`

## Result

W05.01 is **ready for academic approval**. The candidate offer is finite: assisted Class 7 CBSE/NCERT-first institutes, English, Math and Science, 25 named topics, 50 source questions per topic and four auto-scored question types. Descriptive/manual grading and every topic without a compiled pack are excluded.

The full offer contract is [PILOT_CLASS7_MATH_SCIENCE_OBJECTIVE_OFFER.md](../content-question-bank/PILOT_CLASS7_MATH_SCIENCE_OBJECTIVE_OFFER.md). The machine-readable source inventory is [content-offer-inventory.json](evidence/w05-first-content-offer-20261021/content-offer-inventory.json).

## Evidence

| Check | Result |
| --- | --- |
| Compiled packs | 25 |
| Questions | 1,250: Math 350; Science 900 |
| Question types | 1,015 single-choice, 50 multiple-choice, 75 true/false, 110 exact-match short answer |
| Source structure | 0 missing text, placeholder, answer-key or accepted-answer violations in the bounded structural scan |
| Repository authoring linter | All 25 Markdown packs pass at 50 questions; repetition warnings remain for review |
| Difficulty review | Four Math packs are 10/20/20; three Math packs are 10/25/15; Science packs are 20/15/15 |
| Runtime contract | All four included types are stable, auto-scorable and do not require manual review |
| Docker health | Web, backend, worker, PostgreSQL, Redis and proxy healthy during inspection |
| Docker deployed seed inventory | 0 records for `curated_math_science_v2` |

The zero deployed count is a release gate: source availability does not mean a pilot institute can use the content. W05.02 must complete academic review; W05.03 must provision the approved packs into an isolated customer catalog and prove that QA fixtures are absent.

## Approval still required

The accountable academic lead must name Math and Science reviewers and sign the topic-level quality record after correctness, curriculum mapping, repetition, explanations and difficulty are reviewed. The lead must also resolve or accept the three Math distribution deviations and approve a Science difficulty standard. Until that happens, this selection is not an approved curriculum offer and must not be marketed or enrolled.
