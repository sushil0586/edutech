# Pilot data, retention and support policy

Effective 21 October 2026. Business/legal approval is required before expanding beyond the assisted institute pilot.

## Accountable owners

| Area | Accountable operator |
| --- | --- |
| Learner roster, guardian authority and academic records | Participating institute administrator |
| Platform security, privacy routing and service incidents | Platform operations |
| Content complaints and corrections | Academic lead |
| Pilot terms and zero-price access | Product owner |
| Future invoices, tax, refunds and paid terms | Founder and finance owner before W06.02 |

## Requests

Authenticated users submit account, assessment, export, deletion or privacy requests through `/support`. The server derives requester and institute from the authenticated account. Requesters cannot select another tenant. Institute administrators can list and resolve requests for their institute; platform administrators can handle escalations across institutes. Every creation and status update is audit logged.

Support verifies the request through the account email and, for a learner, confirms institute or guardian authority before disclosure. Exports are delivered only to the verified requester or authorized institute administrator and contain only that account/institute scope.

## Deletion and retention

A verified request may remove or anonymize optional profile/contact data and disable the login. It does not silently erase submitted attempts, answers, scores, result publication history, content-revision evidence, security events or audit logs while the institute has an academic, safeguarding, dispute or legal retention duty. Support records the fields acted on, records retained, authority, reason and review date in resolution notes.

The institute decides the academic retention period under its applicable policy and law. Platform operations removes retained records when the institute confirms the duty has ended, subject to backup-expiry and legal-hold procedures. Public pages therefore promise a reviewed deletion process rather than immediate deletion of every record.

## Service targets

- Active exam/access incident: acknowledge within one working day.
- Privacy, export or deletion request: acknowledge within two working days and complete or explain the retention basis within 30 calendar days.
- Content defect: follow the content-maintenance service targets.
- Security incident: escalate immediately to platform operations.

Support messages must not include passwords, full answer text or another learner's personal data.
