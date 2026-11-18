# Pilot content maintenance policy

Applies to the Class 7 Math and Science objective-exam pilot. The academic lead owns the catalog; institute administrators and platform administrators act as reviewers. Teachers may report issues from the question detail page, but cannot resolve their own reports through the correction API.

## Correction workflow

1. A teacher reports the question, category and description. The system records the reporter, institute, timestamp and an immutable snapshot of the question and options.
2. The institute administrator owns the review queue. A platform administrator may resolve escalated or platform-authored content.
3. The reviewer checks the source, answer key, explanation, curriculum mapping and any attached media. Incorrect-answer or unsafe-content reports should be reviewed the same working day; other reports should be reviewed within five working days.
4. An approved correction creates a new active question revision. The original becomes inactive and records the replacement identifier. Tags, passage link, scoring settings and attachments carry forward unless the reviewer changes supported answer content.
5. Existing exams, student answers and results retain the original question and option identifiers. Questions already used by an exam or answer cannot have their protected content edited directly.
6. The defect record stores the resolver, resolution notes, replacement question and resolution time. Audit logs cover reporting and resolution.

## Review cadence and expansion

The academic lead reviews open defects monthly and samples every active pilot topic quarterly. The review records overdue defects, repeated issue categories and any topic that should be withdrawn pending correction.

A new topic enters the advertised catalog only after it has at least 50 structurally valid questions, recorded source and usage rights, named academic review, approved curriculum mapping and difficulty distribution, no unresolved critical defects, and successful isolated provisioning and cleanup. Expansion waits until all currently advertised topics retain approval.

## Deployment and rollback

Migration `0012_questioncontentdefect` is additive. Deploy the backend and migration before exposing the teacher reporting form. Existing API clients continue to work; the new defect endpoints are optional.

Application rollback may leave the additive table in place so report history is preserved. Dropping it would discard the audit trail and is not an acceptable routine rollback. Corrections already published as revisions remain valid questions even if the reporting UI is rolled back.
