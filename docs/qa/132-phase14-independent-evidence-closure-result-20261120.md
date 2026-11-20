# Phase 14 Independent Evidence Closure Result

Date: 2026-11-20  
Campaign: `phase14-independent-closure-20261120`  
Verdict: **FAIL**

## Candidate And Runtime

- HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`
- Source fingerprint: `a870e5a9effefb1f9d20f7f7905cb835d1ae6c3e874fc1bca421a1ab02c147b4`
- Release: `phase13-20261120T053600Z`
- Backend image: `sha256:9c3fd54de70ddab2a6b0c6c8fc4601a7dd742a624ef9ed7aca3a617b1c779ea6`
- Web image: `sha256:b3948e23b29506597a3f5274bc724101b71dea3e3cd6a676f685e3b9fd9bb8df`

Public health and host inspection independently matched the frozen candidate.

## Results

| Assertion | Result | Evidence |
|---|---|---|
| Runtime identity | PASS | `runtime-identity.txt` and `release-path-readback.txt` |
| Five roles across Chromium, Firefox and WebKit | PASS, 15/15 after fixture correction | `attempt2-lean/raw-role-routing-results.json` and screenshots |
| Cross-role redirect enforcement | PASS, 15/15 | Raw requested and final paths per cell |
| Cross-role protected-content marker absence | PARTIAL | No configured marker was found, but the marker set was not sufficiently role-specific for certificate-grade proof |
| Browser logout cookie and route behavior | PASS | Both auth cookies cleared; protected route redirected to `/login` |
| Logout token replay rejection | **FAIL** | Captured access and refresh tokens both remained usable with HTTP 200 after logout |
| Login throttle enforcement and recovery | PASS | 429 reached; valid login returned 200 after 65 seconds |
| Historical registration institute reconciliation | PASS with clarification | The UUID is the configured `NEXORA-PUBLIC` public-registration institute, not an unrelated employee/customer tenant; users were already deleted and aggregate related counts were captured |
| Provider isolation evidence | CONDITIONAL | Existing locmem password-reset tests and source contract are retained; staging itself uses SMTP backend with no host/user/password configured. A fresh local rerun was blocked by a pre-existing local test database and was not forced or deleted. |
| 112-row traceability matrix | PASS | 112 rows: 111 PASS, 1 FAIL |
| Exact cleanup | PASS | Five user roots, campaign tenant, dependent profiles/academics, campaign audit rows and exact throttle key absent |

## Defect

### `P14C-DEF-001` — Logout does not revoke issued JWTs

- Severity: **P1**
- Scenario: `EDU-AUTH-006`
- Expected: after logout, the applicable access and refresh session tokens cannot be replayed.
- Actual: the UI removed `nexora_access_token` and `nexora_refresh_token` cookies and redirected protected navigation to login, but direct replay of both captured tokens returned HTTP 200.
- Scope: server-side session/token invalidation, not merely browser cookie clearing.
- Evidence: `logout-replay-result.json`.
- Status: OPEN.

No P0 issue or cross-role protected-content disclosure was observed. Because unresolved P1 defects prohibit certification, the previous 112/112 same-agent disposition is superseded for this unchanged candidate.

## Preserved Attempts

1. Attempt 1 stopped on local `ENOSPC` while writing WebKit evidence; partial screenshots, traces and the error are retained.
2. Attempt 2 initially produced six teacher/student fixture failures because profile completion was legitimately required. The fixtures were corrected within the same receipt-owned tenant and the exact 15-cell run passed.
3. The provider test rerun did not start because `test_edutech_db` already existed. No database was deleted or reused without ownership evidence.
4. Cleanup committed successfully but its first receipt print failed on UUID serialization. Independent absence and audit reconciliation subsequently proved cleanup.

Generated browser trace ZIPs were deliberately excluded because they can retain request credentials and JWT response bodies. This is recorded in `sensitive-trace-exclusion.txt`; redacted raw results and screenshots remain available.

## Cleanup And Preservation

- Synthetic tenant: `ddab8362-ff94-4249-8540-ed06080265ba` (`P14C01`).
- Synthetic users: IDs 50-54.
- Post-cleanup users, profiles, tenant and campaign audit matches: zero.
- Learn, Learn API, HRMS and Finacc returned HTTP 200 after cleanup.
- Learning backend and web remained healthy on the frozen image IDs.
- No deployment, DNS change, provider delivery, commit or push occurred.

## Current Certification State

- Frozen denominator: 112.
- PASS: 111.
- FAIL: 1 (`EDU-AUTH-006`).
- Overall certification: **FAIL** pending server-side logout/token revocation repair and focused regression.
- Confidence: not promoted; hard gate failure overrides the prior 97.75 same-agent score.

## Independent Review

- Independent QA: CONDITIONAL for evidence precision; confirmed the report's overall FAIL verdict and P1 defect.
- Independent Security: PASS for the security FAIL disposition and P1 severity.
- Review reconciliation: `133-phase14-independent-closure-reviews-20261120.md`.

## Next Authorization Required

Authorize a scoped implementation to revoke or rotate the applicable access/refresh token state on logout, add regression coverage for cookie clearing and replay rejection, deploy the repaired candidate through the controlled release path, and rerun `EDU-AUTH-006` plus shared authentication/security regression. Independent QA and Security review remains required after PASS evidence is complete.
