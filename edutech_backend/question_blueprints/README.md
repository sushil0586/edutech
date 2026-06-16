# Question Blueprints

This folder contains class-wise reusable blueprint documents for question generation and generator implementation.

Use this structure to keep content planning organized by class and then by topic family.

Suggested hierarchy:

- `question_blueprints/class_7/`
- `question_blueprints/class_8/`
- `question_blueprints/class_9/`
- `question_blueprints/class_10/`

Current available class folders:

- [Class 7](./class_7/README.md)
- [Class 8](./class_8/README.md)
- [Class 9](./class_9/README.md)
- [Class 10](./class_10/README.md)

Recommended rule:

1. create global playbooks at backend root
2. create family blueprints inside the relevant class folder
3. create topic-specific premium blueprints for repetition-prone or saleable topics

Core reusable docs:

- [TOPIC_BLUEPRINT_TEMPLATE.md](./TOPIC_BLUEPRINT_TEMPLATE.md)
- [TOPIC_BLUEPRINT_REVIEW_CHECKLIST.md](./TOPIC_BLUEPRINT_REVIEW_CHECKLIST.md)

Practical lifecycle:

1. identify weak family from audit
2. create or update blueprint
3. implement generator
4. reseed
5. re-audit
6. preserve blueprint for future reuse

Recommended escalation:

1. family blueprint when one generator family is weak
2. topic blueprint when one topic keeps producing repeated questions
3. topic benchmark batch of 10 questions
4. audit before scaling to 25, 50, or 100
