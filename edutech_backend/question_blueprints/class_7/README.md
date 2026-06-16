# Class 7 Question Blueprints

This folder contains reusable question-generation implementation blueprints for Class 7 topic families.

Use these files when:

- improving seed generators
- designing prompt-based content generation
- reviewing topic-family quality
- onboarding content writers or backend developers

Available blueprints:

- [SCI_HEALTH_ADOLESCENCE_IMPLEMENTATION_BLUEPRINT.md](./SCI_HEALTH_ADOLESCENCE_IMPLEMENTATION_BLUEPRINT.md)
- [SCI_MATTER_IMPLEMENTATION_BLUEPRINT.md](./SCI_MATTER_IMPLEMENTATION_BLUEPRINT.md)
- [SCI_PHYSICS_IMPLEMENTATION_BLUEPRINT.md](./SCI_PHYSICS_IMPLEMENTATION_BLUEPRINT.md)
- [SCI_MOTION_IMPLEMENTATION_BLUEPRINT.md](./SCI_MOTION_IMPLEMENTATION_BLUEPRINT.md)
- [MATH_FRACTIONS_IMPLEMENTATION_BLUEPRINT.md](./MATH_FRACTIONS_IMPLEMENTATION_BLUEPRINT.md)
- [MATH_LOGIC_IMPLEMENTATION_BLUEPRINT.md](./MATH_LOGIC_IMPLEMENTATION_BLUEPRINT.md)
- [CLASS_7_CONTENT_REFRESH_RUNBOOK.md](./CLASS_7_CONTENT_REFRESH_RUNBOOK.md)
- [topics/README.md](./topics/README.md)
- [CLASS_7_MATH_SCIENCE_QUESTION_REBUILD_WORKFLOW.md](./CLASS_7_MATH_SCIENCE_QUESTION_REBUILD_WORKFLOW.md)
- [CLASS_7_MATH_SCIENCE_BENCHMARK_OUTLINES.md](./CLASS_7_MATH_SCIENCE_BENCHMARK_OUTLINES.md)

Topic libraries by subject:

- [Math topic library](./topics/math/README.md)
- [Science topic library](./topics/science/README.md)
- [Social Science topic library](./topics/social_science/README.md)
- [Computer topic library](./topics/computer/README.md)
- [General Knowledge topic library](./topics/gk/README.md)

Related navigation:

- [Question blueprints root](../README.md)
- [Curated markdown authoring](./curated_authoring/math_science_v2/README.md)
- [Final curated seed packs](./curated_seed_packs/math_science_v2/README.md)

Practical reuse flow:

1. pick the weak family from the audit report
2. open the matching blueprint
3. implement or refine the generator patterns
4. reseed that family
5. rerun the audit
6. move to the next weak family

When repetition is still happening inside one topic:

1. open the matching file in `topics/`
2. use its sub-concept and anti-repetition rules
3. generate only a 10-question benchmark first
4. audit visible stem variety
5. then scale that topic into the seed flow

Recommended operational path now:

1. use the topic blueprint in `topics/`
2. generate a markdown authoring file
3. author and review questions in markdown
4. lint the markdown pack
5. compile it into final curated JSON
6. seed the compiled pack
