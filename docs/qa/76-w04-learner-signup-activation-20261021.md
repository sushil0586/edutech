# W04.04 learner and signup activation verification — 2026-10-21

## Result

W04.04 is complete for the objective-exam pilot. Student signup now keeps role choice and the essential account fields in one compact form, shows an actionable validation error, and continues through profile completion into the student workspace. On a 390×900 viewport, the truthful next action is visible before performance diagnostics.

## Product changes

- Removed the repeated signup explanation panel and kept role selection with the registration form.
- Attached login and submit controls to the registration form and exposed the validation summary as an assertive alert.
- Moved the student recommendation card ahead of the hidden welcome block and visible KPI diagnostics in source order.
- Added the existing idempotent `seed_default_geography` command to the Docker migration job. A clean deployment now supplies the country, state, city and pincode options required to finish onboarding.

## Docker verification

The web container ran image `edutech-w04-activation-web:7c621d8` with application revision `7c621d89f1aa935dfba94b425065f9dd62866571` and source archive SHA-256 `fb722c912630d46b2a707c99e2213820c4399fcfe5833dc77b4ce31d5a3be67d`. The deployment and final test correction are committed at `901db4070f4bb82d4c51f04961c69c259f6fe3b7`.

| Check | Result |
|---|---|
| Mobile signup role, validation and recovery | Passed |
| Mobile student action before diagnostics | Passed |
| Existing student priority and teacher wizard regression | 2 passed |
| Public student signup → profile completion → workspace | Passed |
| Docker Compose configuration with geography seed | Valid |
| TypeScript, targeted ESLint and production build | Passed before exact image creation |

The first lifecycle run exposed an empty geography catalog because the Docker migration service did not run the existing seed command. After correcting the migration job and seeding the isolated Docker database, the same lifecycle passed in 3.6 seconds. Both disposable users and their related profile, location and acquisition records were deleted after verification.

## Evidence

- [Signup mobile validation state](evidence/w04-learner-signup-activation-20261021/screenshots/signup-mobile-error.png)
- [Student mobile first action](evidence/w04-learner-signup-activation-20261021/screenshots/student-dashboard-mobile-action.png)
- [Release manifest](evidence/w04-learner-signup-activation-20261021/artifact/release-manifest.json)
- [Artifact checksums](evidence/w04-learner-signup-activation-20261021/artifact/SHA256SUMS)
- [Source inventory](evidence/w04-learner-signup-activation-20261021/artifact/source-inventory.json)

## Scope boundary

This closes learner activation for the agreed objective-exam pilot. Broader accessibility and responsive certification remains in W04.05. Structured sessions with unfamiliar human participants and activation analytics remain onboarding/customer-trust work; the checks here validate the executable first-use route and captured error state.
