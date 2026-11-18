# W01 release preparation and promotion

Prepare one clean candidate, verify it locally and promote that exact artifact through the existing deployment channel. Android and iOS scope remains student-only; no legacy Flutter or nested mirror is packaged.

## Prepare the source candidate

Use an isolated checkout, preserving other dirty worktrees. Fetch the target baseline before preparation. The selected commit must contain current `origin/main` and preserve the applied migration files byte-for-byte.

```bash
git fetch --no-tags origin main
git worktree add --detach /path/to/isolated-release-checkout <full-candidate-sha>
cd /path/to/isolated-release-checkout
python3 -m unittest discover -s deployment/tests -v
python3 deployment/prepare_release.py \
  --sha <full-candidate-sha> \
  --environment staging \
  --output /path/outside/checkout/release-bundle
```

The output directory must not already exist. Preparation refuses a dirty checkout, wrong SHA, non-main-containing history, modified baseline migrations, tracked runtime environment files or signing keys. Do not work around a refusal by deleting user changes or relaxing the guard.

The bundle contains `source.tar.gz`, `release-manifest.json`, `source-inventory.json` and `SHA256SUMS`. Repeat preparation to a second directory and compare source archives when validating reproducibility. Manifests intentionally record their actual preparation timestamp.

## Verify an existing bundle

```bash
python3 deployment/release_manifest.py verify \
  --manifest /path/to/bundle/release-manifest.json \
  --archive /path/to/bundle/source.tar.gz \
  --expected-sha <full-candidate-sha> \
  --expected-environment staging
```

Validate `SHA256SUMS` from within the bundle. Confirm the packaged components are exactly deployment, Django backend, Next.js web and Expo student mobile. Keep runtime secrets, media, dependency installations, database dumps and signing identities outside the archive.

## Check staging before promotion

Using the approved connection, capture current source/artifact identity, effective nginx configuration and database migration history without exposing credentials. Compare the source migration graph to the actual stage database or an authorized isolated clone. In particular, economy `0011_expand_operator_policy_scopes` must remain applied exactly once and match the policy digest.

Confirm a recoverable backup and the migration-compatible rollback target before altering the running service. A local migration reconstruction or a successful `migrate --plan` does not prove the shared stage is identical.

## Run the existing pipeline

Configure the existing Jenkins job with:

- `PIPELINE_MODE=full` and `DEPLOY_ENV=staging`.
- The reviewed full `RELEASE_GIT_SHA` and the deployment change reference.
- `DEPLOY_PUBLIC_ORIGIN=https://learn.accerio.in` for the current configured staging contract.
- Backend tests and frontend build enabled, with a nonempty supported browser suite other than `none`.
- The existing approved host/SSH credential entries, strict known-host verification and synthetic draft fixture variables required by the job.

The pipeline must obtain a commit containing these controls. It prepares and verifies the archive once, then promotes that archive. Do not copy an arbitrary dirty workspace onto the host or replace the required runtime identifiers with the branch name.

The current host deployment still builds web output on the target from the verified source and lockfiles. This verifies source identity, not a cross-host byte-reproducible compiled image. Container image publication and remote registry attestation are separate existing release paths and were not exercised by W01.

## Certify the running candidate

```bash
deployment/verify-https-entrypoint.sh \
  https://learn.accerio.in \
  <full-candidate-sha> \
  <source-archive-sha256>
```

Require public certificate validity, secure cookies, trusted-origin behavior, normalized routes, exact web/API provenance and intentional unknown-host rejection. Timeouts or connection refusal are failures, not successful rejection evidence.

Then run the assigned-draft security gate and full synthetic institute/student lifecycle through result publication, including negative ownership/assignment/time-window checks. Keep artifacts bound to the running candidate and verify exact fixture cleanup. Teacher-authored same-exam or official full-paper claims require their own scenarios.

## Recovery and completion

Rehearse database and relevant media restore into an isolated clone; verify the selected previous app release can read the recovered data. Measure recovery against the agreed targets and test the complete service rollback, including web/API configuration and runtime identity. Do not automatically reverse applied migrations to roll back an application.

W01 is complete only after the required live checks and its W02/W03/W09 dependencies pass. Record the release owner, candidate, artifact, capacity/recovery constraints, open exclusions and decision date in the execution tracker.
