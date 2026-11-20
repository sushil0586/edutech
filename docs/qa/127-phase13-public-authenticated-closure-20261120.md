# Phase 13 Public Authenticated Closure

Date: 2026-11-20  
Verdict: **PASS**

## Authorization

The owner authorized one receipt-owned synthetic staging tenant, five synthetic role accounts, candidate-specific browser verification, and exact cleanup. Real users, provider delivery and unrelated data were excluded.

## Fixture Admission

- Campaign: `phase13-public-auth-20261120`
- Tenant ID: `e1cd5e72-5462-44b7-99e1-b667d0fd74bf`
- Initial role accounts: five exact user IDs recorded in `fixture-receipt.json`
- Registration smoke accounts: two exact user IDs recorded in `registration-fixture-receipt.json`
- Email backend for provisioning: in-memory
- Preflight proved that tenant code `DLI001` and all five role usernames were absent before provisioning.

## Browser Results

| Campaign | Result |
|---|---:|
| Candidate release smoke, Chromium | 8/8 PASS |
| Broad role/journey smoke, Chromium | 6/6 PASS |
| Candidate release workflows, Chromium | 8/8 PASS |
| Candidate release workflows, Firefox | 8/8 PASS |
| Candidate release workflows, WebKit | 8/8 PASS |
| Cross-browser subtotal | 24/24 PASS |

The original 0/8 public attempt remains retained. It failed at authentication because the authorized synthetic identities did not yet exist and is classified as prerequisite evidence, not an application acceptance failure.

## Cleanup

- Seven exact receipt-owned user IDs deleted.
- One exact receipt-owned tenant ID deleted.
- Post-cleanup reconciliation: zero matching users and zero matching tenants.
- Login throttle cleanup was limited to the current test-client identity plus the command's local defaults.
- Learn, Learn API, HRMS and Finacc returned HTTP 200 after cleanup.

## Candidate

- Release: `phase13-20261120T053600Z`
- HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`
- Source fingerprint: `a870e5a9effefb1f9d20f7f7905cb835d1ae6c3e874fc1bca421a1ab02c147b4`
- Backend: `sha256:9c3fd54de70ddab2a6b0c6c8fc4601a7dd742a624ef9ed7aca3a617b1c779ea6`
- Web: `sha256:b3948e23b29506597a3f5274bc724101b71dea3e3cd6a676f685e3b9fd9bb8df`

Evidence is retained under `docs/qa/evidence/phase13-public-auth-20261120/`; `SHA256SUMS` freezes the campaign artifact checksums.

Phase 14 was not executed. Its eight shared-authentication scenarios remain NOT RUN.
