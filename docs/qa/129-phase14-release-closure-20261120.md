# Phase 14 Release Closure

Date: 2026-11-20  
Scenario verdict: **PASS**  
Overall release verdict: **CONDITIONAL - independent review pending**

## Candidate

- HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`
- Dirty source fingerprint: `a870e5a9effefb1f9d20f7f7905cb835d1ae6c3e874fc1bca421a1ab02c147b4`
- Release: `phase13-20261120T053600Z`
- Backend: `sha256:9c3fd54de70ddab2a6b0c6c8fc4601a7dd742a624ef9ed7aca3a617b1c779ea6`
- Web: `sha256:b3948e23b29506597a3f5274bc724101b71dea3e3cd6a676f685e3b9fd9bb8df`

Public runtime headers and `/api/v1/health/` continued to attest the same build and source fingerprint.

## Shared Authentication Results

| Scenario | Result | Current evidence |
|---|---|---|
| `EDU-AUTH-002` invalid login | PASS | Staging returned 400 without a session; isolated inactive/invalid credential contracts passed. |
| `EDU-AUTH-003` lock/rate behavior | PASS | Staging returned 429 within the configured invalid-login sequence; isolated password-reset throttling passed. |
| `EDU-AUTH-004` password recovery | PASS | Neutral matched/unmatched response, in-memory delivery receipt and provider-failure handling passed against PostgreSQL. |
| `EDU-AUTH-005` password reset | PASS | Single-use confirmation, expiry rejection, intended-account password change and replay rejection passed. |
| `EDU-AUTH-006` logout/session invalidation | PASS | Chromium logout removed both session cookies and denied the protected route; reset invalidated access and refresh tokens. |
| `EDU-AUTH-008` duplicate identity | PASS | Duplicate email and duplicate login/username contracts rejected persistence against PostgreSQL. |
| `EDU-AUTH-009` profile completion | PASS | Student and teacher registration reached the rendered completion workflow; role/profile completion persistence contracts passed. |
| `EDU-AUTH-010` role landing/route denial | PASS | Five roles across Chromium, Firefox and WebKit landed correctly and were denied a cross-role route: 15/15. |

Together with the previously passed `EDU-AUTH-001` and `EDU-AUTH-007`, shared authentication is now **10/10 PASS**.

## Execution Totals

- Isolated PostgreSQL authentication contracts: 28 passed plus 3/3 selector-corrected reruns, 31 passing contracts total.
- Staging role landing and route denial: 15/15 role-engine combinations passed.
- Staging registration/profile-entry journeys: 2/2 passed.
- Staging invalid login, rate limit and logout: all required assertions passed.
- Preserved broad selector attempt: 21 passed, 6 failed, 3 skipped. All six failures required historical Phase 6 child/alert fixtures and were outside the Phase 14 authentication contract. A fixture-independent parent role check subsequently passed in all three engines.

The initial isolated run also preserves three selector errors caused by addressing existing methods to the wrong test class. Those exact methods passed 3/3 after correcting only the selector.

## Data And Cleanup

- Preflight proved tenant `DLI001` and the five role usernames were absent.
- Campaign tenant: `3ead2fc2-4296-4e83-90c8-ef93c91cf199`.
- Exact role user IDs: 43-47.
- Exact registration user IDs: 48-49.
- Role, onboarding, institute scope and 36 attributed login audit records were reconciled before cleanup.
- Seven exact user roots and the exact tenant were deleted after ownership revalidation.
- Residual reconciliation: zero matching users and zero matching tenants.
- The exact login throttle key was targeted; it had already expired, so no broad cache clear occurred.
- Task PostgreSQL containers were removed and port `40211` was closed.
- Learn, Learn API, HRMS and Finacc returned HTTP 200 after cleanup.

No real user, external provider delivery, unrelated tenant, DNS, infrastructure or sibling application was mutated.

## Frozen Register

The 112-scenario denominator is now:

- PASS: **112**
- CONDITIONAL: **0**
- FAIL: **0**
- BLOCKED: **0**
- NOT RUN: **0**

No unresolved P0/P1 defect remains in the frozen scenario register.

## Confidence

Using `35F + 25S + 15U + 15D + 10O`:

- Functional: `112/112 = 1.00`
- Security/integrity: `10/10 = 1.00`
- UI/accessibility: `0.85`, retaining the two documented P2 mobile visual follow-ups from Phase 3
- Data/audit: `1.00`
- Operations/recovery: `8/8 = 1.00`

Candidate-specific same-agent confidence: **97.75/100**.

This exceeds the 95 threshold but is not statistical reliability proof. Full independent certification remains pending because the same primary agent orchestrated and executed this closure. No independent reviewer has signed this exact final package.

## Remaining Non-Blocking Risks

1. Two P2 mobile visual-polish findings remain documented from Phase 3.
2. The host release validator still depends on absent `rg` and can print success after that check fails; independent deployment checks passed, but the validator should be repaired before the next release.
3. The deployed web dependency audit reported 7 moderate and 4 high package findings; no unsafe automatic upgrade was applied.
4. Repository changes remain dirty and uncommitted. Commit/push is outside this authorization.

Evidence and checksums: `docs/qa/evidence/phase14-release-closure-20261120/`.

## Independent Review Addendum

Two independent read-only reviewers completed QA and Security review of this exact retained package. Both returned **CONDITIONAL**. Neither identified a P0/P1 defect, cleanup failure or evidence-integrity mismatch, and all 16 checksum-manifest entries verified.

Independent PASS remains gated by:

1. A Phase 14 runtime identity receipt.
2. Raw multi-engine `EDU-AUTH-010` role and denial evidence.
3. A frozen 112-row scenario-to-evidence matrix.
4. Effective provider-isolation evidence.
5. Reconciliation of registration users 48-49 with non-campaign institute `b6326fc6-f8f4-4eb6-91a0-d15611e470ca`.
6. Reconstructable logout and post-throttle recovery evidence.

The final overall verdict therefore remains **CONDITIONAL**. See `130-phase14-independent-review-20261120.md` for the attributed findings and bounded closure requirements.

## Superseding Evidence

The authorized independent-evidence continuation found that browser logout clears cookies but does not revoke the issued access or refresh token. Both tokens returned HTTP 200 when replayed after logout. `EDU-AUTH-006` is now FAIL, the current register is 111 PASS / 1 FAIL, and this report's 112/112 same-agent disposition is superseded. See `132-phase14-independent-evidence-closure-result-20261120.md`.
