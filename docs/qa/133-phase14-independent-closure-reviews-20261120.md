# Phase 14 Independent Closure Reviews

Date: 2026-11-20

## QA Verdict

**CONDITIONAL** for report accuracy.

QA independently verified the candidate HEAD/fingerprint/images, 15 unique engine-role results, cookie clearing, HTTP 200 access/refresh replay, throttle recovery, 112-row matrix arithmetic, checksum integrity and post-cleanup absence. QA agreed the overall candidate verdict is **FAIL** and `P14C-DEF-001` is a genuine P1 defect.

QA conditions:

1. The retained marker check was not role-specific enough to independently prove protected-content absence for every denied route. The report now limits PASS to landing/redirect behavior and treats content-marker evidence as partial.
2. The original runtime receipt did not resolve the release symlink. A subsequent read-only receipt captured `/srv/saas/projects/learning-portal/current -> /srv/saas/projects/learning-portal/releases/phase13-20261120T053600Z`.
3. The initial six fixture failures remain narrative because their raw result was overwritten; this limitation remains explicit.

## Security Verdict

**PASS** for the report's security disposition.

Security independently confirmed:

- Access-token replay authenticated `/api/v1/auth/me/` after logout.
- Refresh-token replay also succeeded, allowing session extension after logout.
- P1 severity and the certification-blocking FAIL verdict are justified.
- Provider evidence remains correctly CONDITIONAL.
- Exact cleanup is sufficiently supported.
- Trace exclusion was appropriate because archives can retain JWTs and synthetic credentials.
- All 54 evidence files represented by the reviewed manifest verified, with the expected caveat that the manifest is not externally anchored.

Security also noted that `logout_throttle.cjs` did not make replay rejection a process-level hard assertion. The remediation regression must fail automatically when either replay status is successful.

## Reconciled Verdict

- Candidate certification: **FAIL**.
- Independent QA: CONDITIONAL on evidence precision, not on the existence of the defect.
- Independent Security: PASS for the FAIL disposition.
- Open blocker: P1 `P14C-DEF-001`.

No independent reviewer modified files, executed tests, accessed staging or used credentials.
