# W05 content maintenance verification

Date: 21 October 2026  
Environment: disposable PostgreSQL test database on the running Docker network  
Result: **W05.05 complete**

Teachers can now report an incorrect, ambiguous, outdated, formatting, accessibility or other content issue from the question detail page. The API stores institute ownership, reporter identity, a content snapshot and timestamps. Institute and platform administrators can resolve a report by publishing a corrected revision; teacher resolution is denied.

The correction service creates a new active question, carries forward academic mapping, marks, metadata, tags, passage and attachments, and can replace question text, explanation, options or accepted short answers. The old question is deactivated and linked to its replacement. Direct changes to protected content are rejected after a question has been attached to an exam or received a student answer.

The synthetic regression test created and submitted an attempt, reported its question, published corrected wording and options, then confirmed that the historical `StudentAnswer` still referenced the original question and option. The original wording and options remained unchanged while the replacement became active. Audit events identify both the original and replacement.

## Verification

- `python manage.py makemigrations --check --dry-run`: no changes detected.
- Docker/PostgreSQL: `apps.question_bank.tests.test_content_defects` plus `apps.institutes.tests.test_purge_institute_data`: 4 tests passed.
- Web ESLint on the changed teacher page and API module: passed.
- Web `tsc --noEmit`: passed.

## Compatibility and limits

Migration `0012_questioncontentdefect` is additive and existing clients do not need to call the new endpoint. Backend migration must precede the web reporting form. Routine rollback should retain the table and its audit history. The workflow does not provide retrospective regrading; any business decision to regrade completed attempts requires a separate, explicit policy and implementation.

The maintenance path is ready, but the candidate catalog remains blocked from pilot enrollment by W05.02 academic and rights signoff. Shared-library sales certification under W05.04 remains outside the assisted institute pilot.
