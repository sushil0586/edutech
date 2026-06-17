# Seed Script Flow

This is the canonical order for backend seed execution so academics, question banks, dropdowns, and exam builder all stay aligned.

## Public Platform Flow

1. Create or refresh the public hub:
   `python manage.py seed_public_institute_bootstrap`
2. Seed the public academic catalog:
   `python manage.py seed_public_academics`
3. Seed shared question content with one strategy:
   `python manage.py seed_master_question_library PUB001 --subjects math science --questions-per-topic 100`
   or
   `python manage.py seed_curated_math_science_questions PUB001 --subjects math science --questions-per-topic 50`
4. Remove still-empty active topics only after content is loaded:
   `python manage.py deactivate_empty_topics --institute-code PUB001`
5. Verify:
   `python manage.py audit_academic_catalog --institute-code PUB001 --fail-on-empty-active-topics --fail-on-findings`

## Regular Institute Flow

1. Create or refresh the institute:
   `python manage.py seed_institute_bootstrap SCH001 --name "Springfield School"`
2. Seed the institute academic catalog:
   `python manage.py seed_institute_academics SCH001`
3. Seed institute question content with one strategy:
   `python manage.py seed_curriculum_questions SCH001 --subjects math science --questions-per-topic 100`
   or
   `python manage.py seed_curated_math_science_questions SCH001 --subjects math science --questions-per-topic 50`
   or
   `python manage.py seed_class7_math_standalone_bank SCH001 --file path/to/file.md --replace-existing`
4. Remove still-empty active topics only after content is loaded:
   `python manage.py deactivate_empty_topics --institute-code SCH001`
5. Verify:
   `python manage.py audit_academic_catalog --institute-code SCH001 --fail-on-empty-active-topics --fail-on-findings`

## Rules

- Always run academics before any question seed.
- Do not run `deactivate_empty_topics` in the middle of content seeding.
- If cleanup was already run, the question seed commands now reactivate the target subject/topic scope automatically.
- Use the public flow for canonical shared content.
- Use the institute flow for tenant-owned operational content.
