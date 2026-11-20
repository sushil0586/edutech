# Phase 14 Independent Evidence Closure Execution Package

Date: 2026-11-20  
Campaign: `phase14-independent-closure-20261120`  
Status: **AUTHORIZED AND IN PROGRESS**

## Authorization

The owner authorized the bounded continuation proposed after report 130. The mutation boundary is one receipt-owned synthetic staging tenant, five synthetic role accounts, candidate-specific browser/API checks, exact cache-key handling, and deletion of only receipt-recorded fixtures. Real users, provider delivery, unrelated tenant data, infrastructure, DNS, deployment and source changes are excluded.

## Frozen Candidate

- HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`
- Source fingerprint: `a870e5a9effefb1f9d20f7f7905cb835d1ae6c3e874fc1bca421a1ab02c147b4`
- Release: `phase13-20261120T053600Z`
- Backend image: `sha256:9c3fd54de70ddab2a6b0c6c8fc4601a7dd742a624ef9ed7aca3a617b1c779ea6`
- Web image: `sha256:b3948e23b29506597a3f5274bc724101b71dea3e3cd6a676f685e3b9fd9bb8df`
- Public origin: `https://learn.accerio.in`

## Closure Assertions

| ID | Assertion | Required evidence |
|---|---|---|
| `P14C-ID-001` | Deployed runtime equals the frozen candidate | Health payload, response headers, release and immutable image IDs |
| `P14C-ROLE-001` | Five roles land correctly and a cross-role route discloses no protected content in Chromium, Firefox and WebKit | Raw Playwright list/JSON output, screenshots, traces, route/status assertions |
| `P14C-LOGOUT-001` | Logout clears both session cookies, denies the protected route and prevents token replay | Cookie-name state only, protected-route result and redacted replay result |
| `P14C-THROTTLE-001` | Invalid login reaches 429 and a valid login succeeds after the configured window | Timestamped status sequence and recovery timestamp |
| `P14C-PROVIDER-001` | Password-recovery contracts use the in-memory backend without provider delivery | Redacted effective-setting receipt plus outbox/provider reconciliation |
| `P14C-SCOPE-001` | Historical registration institute association is explained and reconciled | Read-only model/runtime evidence and related-record reconciliation |
| `P14C-MATRIX-001` | All 112 frozen scenarios have individual status and current evidence references | Frozen 112-row matrix and count validation |
| `P14C-CLEAN-001` | Only campaign-owned roots are removed and no campaign residual remains | Preflight, receipt, dry-run, exact deletion and post-cleanup receipts |

## Fixture Contract

- Tenant code: `P14C01`.
- Usernames: `p14c-platform-admin`, `p14c-institute-admin`, `p14c-teacher`, `p14c-student`, `p14c-parent`.
- Every created database root ID and relevant dependent-count baseline is recorded before browser execution.
- Cleanup may target only receipt-recorded IDs after immediate ownership revalidation.
- No public self-registration is used; this avoids mutation of any pre-existing registration institute.

## Stop Conditions

Stop without widening scope on candidate drift, existing fixture collision, provider routing ambiguity, unexpected institute association, protected-content disclosure, real-user interaction, cleanup ownership mismatch, unrelated record mutation, P0/P1 failure or service-health regression.

## Evidence

New artifacts are retained under `docs/qa/evidence/phase14-independent-closure-20261120/`. Historical Phase 14 evidence remains unchanged.
