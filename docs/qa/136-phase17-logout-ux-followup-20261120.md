# Phase 17 - Logout UX Follow-up

Date: 2026-11-20  
Scope: authorized local implementation and isolated synthetic validation only  
Deployment: NOT RUN  
Commit/push: NOT RUN

## Candidate

- HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`
- Working tree: dirty and preserved
- Included source files: 2,205
- Source manifest SHA-256: `828f367e7381b86512ce6d1d260a483ed8756ab7b365021d6c5251b4e81e56ec`
- Included roots: `edutech_backend`, `edutech_web`, `deployment/lightsail-shared`
- Exclusions: Git data, virtual environments, dependencies, build/test output, visual artifacts, caches, secrets, media and collected static files
- Evidence: `docs/qa/evidence/phase17-logout-ux-followup-20261120/candidate-fingerprint.txt`

The commit SHA alone does not identify this candidate. Existing unrelated tracked and untracked work was not reset, cleaned, stashed, overwritten or committed.

## Implemented Repair

1. Logout now revokes the server session before clearing browser cookies.
2. A failed revocation keeps the authenticated session intact and renders an accessible, actionable error beside the logout control.
3. The same logout form behavior is used by desktop/mobile operator sidebars and student settings.
4. Login policy links now have explicit wrapping and spacing at narrow widths.
5. Pending button text inherits the primary button foreground color, preventing the generic auth-span rule from reducing contrast.

Changed Phase 17 source:

- `edutech_web/src/lib/auth/actions.ts`
- `edutech_web/src/components/ui/logout-form.tsx`
- Logout-form integrations in the workspace sidebar, teacher sidebar and student settings page
- Phase 17 rules in `edutech_web/src/app/globals.css`

These files already contained earlier campaign changes. Only the Phase 17 hunks above belong to this repair.

## Scenario Results

| ID | Scenario | Expected | Result |
| --- | --- | --- | --- |
| P17-LOGOUT-001 | Logout endpoint returns synthetic 503 | Stay authenticated, preserve exact cookie values, show an accessible error and permit retry | PASS: Chromium, Firefox, WebKit |
| P17-LOGOUT-002 | Error presentation | Exact message is visible without overlap with `role="alert"` and `aria-live="polite"` | PASS: Chromium, Firefox, WebKit |
| P17-LOGIN-001 | Login footer at 320 px | Privacy, Terms and Support are distinct, wrapped links without horizontal overflow | PASS: Chromium, Firefox, WebKit |
| P17-LOGIN-002 | Primary button label | Computed label color remains white in all three engines | PASS |
| P17-STATIC-001 | Focused lint | No errors or warnings | PASS |
| P17-STATIC-002 | TypeScript | No errors | PASS |
| P17-BUILD-001 | Production Next build | Build and static generation complete | PASS |
| P17-DATA-001 | Synthetic fixture cleanup | Exact campaign user, profile, sessions and audit rows absent | PASS |

Browser evidence is in `browser-result.json` and the retained screenshots. The logout failure was injected only for `POST /api/v1/auth/logout/`; normal requests were forwarded to the authorized staging service. Direct synthetic-session revocation was performed after each engine assertion.

## Failed Attempts Retained

1. The first browser attempt exposed a Next.js server-action constraint because a non-async initial-state constant was exported from a `use server` module. The state was moved into the client form.
2. The proxy initially forwarded stale compression metadata after decoding the body. Response headers were corrected.
3. The proxy initially omitted the authorization header. Auth forwarding was corrected.
4. The initial alert selector matched Next's hidden route announcer as well as the visible logout error. The assertion was narrowed to the product-owned `.logoutError` element.
5. The first closure invocation could not resolve Playwright because the evidence script is outside the web package. The invocation stopped before browser launch and was rerun with `NODE_PATH` bound to `edutech_web/node_modules`.
6. The first Phase 17 custody preflight included Django's informational shell banner before its JSON receipt. It stopped before seeding; the retry explicitly extracted the final JSON line.

The first failure is retained as `browser-attempt1-failure.txt`; the final passing result and harness source preserve the corrected behavior. No acceptance assertion was weakened.

## Data and Side Effects

- One fresh Phase 17-owned synthetic admin account was used; no real user was touched.
- Preflight confirmed no pre-existing campaign fixture.
- Cleanup deleted only receipt-owned fixture IDs.
- Final server readback reports zero campaign users, profiles, sessions and audit records.
- Provider delivery and unrelated data were not accessed.
- Local development and proxy processes were stopped.

## Visual Review

- `chromium-logout-failure.png`, `firefox-logout-failure.png`, `webkit-logout-failure.png`: error remains within the sidebar, is readable, and does not overlap navigation or the retry control. The black development badge visible in local captures is Next's development indicator, not application content.
- `chromium-login-320.png`, `firefox-login-320.png`, `webkit-login-320.png`: all three policy links remain distinct with no horizontal overflow.
- Computed primary-button label color is `rgb(255, 255, 255)` in all three engines.

## Verification Summary

- ESLint: PASS
- TypeScript: PASS
- Next production build: PASS, 158 pages generated
- Browser matrix: PASS
- Exact cleanup reconciliation: PASS
- Evidence checksums: retained in `evidence-files.sha256`

## Independent Review

The initial QA review was **CONDITIONAL** and identified missing cross-engine logout-failure coverage plus assertion precision gaps. Those gaps were addressed through a fresh Phase 17-owned campaign. A second review correctly blocked while evidence was still being finalized. After source and evidence manifests were frozen and verified, final independent QA and Security reviews both issued **PASS**. All review rounds are retained.

## Verdict

**LOCAL ACCEPTANCE: PASS**

The two Phase 16 P3 UX findings are repaired on the fingerprinted local candidate. A fresh receipt-owned campaign passed the authenticated logout-failure workflow in all three browser engines with exact cookie-value, message, `role="alert"` and `aria-live` assertions, followed by exact cleanup to zero. Independent QA and Security both pass. This does not change the deployed Phase 16 release verdict or establish staging behavior for the new code. Commit, deployment and post-deployment verification remain outside this authorization and are **NOT RUN**.
