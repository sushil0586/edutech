# Phase 13 Deployment And Public Verification

Date: 2026-11-20  
Deployment verdict: **PASS**  
Public authenticated workflow verdict: **PASS after authorized fixture continuation**

## Candidate

- HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`
- Source fingerprint: `a870e5a9effefb1f9d20f7f7905cb835d1ae6c3e874fc1bca421a1ab02c147b4`
- Release: `phase13-20261120T053600Z`
- Backend image: `sha256:9c3fd54de70ddab2a6b0c6c8fc4601a7dd742a624ef9ed7aca3a617b1c779ea6`
- Web image: `sha256:b3948e23b29506597a3f5274bc724101b71dea3e3cd6a676f685e3b9fd9bb8df`

## Admission And Deployment

- The moved static IP's ED25519 host key was recaptured and explicitly admitted as `SHA256:rBv9ULftYbmdwh1JrIKbW39yUMGnt3H6KKPrF9IvJaQ`; the previous known-hosts file was preserved.
- A fresh encrypted PostgreSQL and media backup completed at `/srv/saas/backups/learning-portal/20261120T053518Z`.
- A 99 MiB secret-free source bundle was transferred to the versioned release directory. Runtime environment files were not transferred.
- Native amd64 backend and web images were built and independently qualified against disposable PostgreSQL.
- Qualification passed migrations, Django checks, health checks, runtime-user checks, security-header checks, 110 migration records, and exact disposable cleanup.
- The live migration command reported no pending migrations.
- Backend, web and API gateway containers were recreated and reached healthy state.
- The active `current` symlink and `.active-release` record were atomically promoted to the new release after health and identity checks.
- The previous `phase10-20261119T032758Z` release and immutable images remain available for rollback.

## Runtime Verification

- `https://learn.accerio.in/`: HTTP 200
- `https://learn.accerio.in/api/v1/health/`: HTTP 200
- Runtime headers and backend health both attest the exact build and source fingerprint.
- `https://hrms.accerio.in/`: HTTP 200
- `https://accerio.in/`: HTTP 200

## Preserved Findings

1. The host bundle validator depends on `rg`, which is absent on the server, but still prints its success message. The independent compose, image and runtime checks passed; the validator behavior remains an operations defect to repair locally before a future release.
2. The web dependency install reported 11 package audit findings: 7 moderate and 4 high. No automatic dependency mutation was performed.
3. The deployed release smoke produced 0 PASS / 8 FAIL because all expected demo credentials were invalid. Read-only database reconciliation confirmed that `demo-platform-admin`, `demo-institute-admin`, `demo-teacher`, `demo-student`, and `demo-parent` do not exist in staging. One later request was throttled after repeated invalid logins.

The eight browser failures are classified as the preserved missing-fixture attempt, not application acceptance failures. After authorized synthetic fixture provisioning, the release smoke passed 8/8, the broader smoke passed 6/6, and the release workflows passed 24/24 across Chromium, Firefox and WebKit. See `docs/qa/127-phase13-public-authenticated-closure-20261120.md`.

## Remaining Gate

The deployment and candidate-specific public verification gate is closed. Phase 14 shared-authentication reconciliation remains a separately gated phase.

Evidence: `docs/qa/evidence/phase13-deployment-admission-20261120/`.
