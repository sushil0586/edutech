# Phase 12 Operations And Monitoring Closure

Date: 2026-11-20  
Target: shared Lightsail `saas-staging-02-quarantine`  
Verdict: **PASS**

This continuation preserves the historical BLOCKED result in report 121. It closes only the missing off-host alert-delivery acceptance criterion.

## Scenario Results

| Scenario | Result | Closure evidence |
|---|---|---|
| `EDU-OPS-001` health and alerts | PASS | The existing local alert and journal path now also publishes to a dedicated SNS topic. A real test notification reached the confirmed external mailbox. |
| `EDU-OPS-002` certificate/capacity monitoring | PASS | The previously passed certificate, disk, memory and backup-freshness checks use the same independently exercised external delivery path. |
| `EDU-OPS-003` failed deployment rollback | PASS | Preserved from report 121; not rerun. |
| `EDU-OPS-004` reboot/admin runbook | PASS | Preserved from report 121; not rerun. |

## External Alert Contract

- Topic: `arn:aws:sns:ap-south-1:227022022984:learning-portal-operations`.
- Subscription: confirmed email subscription, ARN suffix `7bfaeb97-2217-4f0b-82f1-2f9bfb8c5b63`.
- Publisher: IAM user `learning-portal-alert-publisher`, with no console access.
- Authorization: one inline policy permitting only `sns:Publish` to the exact topic ARN.
- Host custody: the access credential is stored at `/srv/saas/secrets/learning-portal-alert/credentials`, owned by `root:root`, directory mode `0700`, file mode `0400`.
- Alert content is limited to timestamp, host name and failed systemd unit. It contains no application secrets, tenant data or personal data.
- The local root-only alert and `daemon.alert` journal record remain mandatory and are written before SNS publication.
- SNS publication failure makes the alert unit fail visibly rather than silently claiming delivery.

## End-To-End Delivery Test

The admitted test started `learning-portal-alert@phase12-sns-test.service` on the staging host.

- Systemd result: `Result=success`, `ExecMainStatus=0`.
- Local receipt: `20261120T043253Z-phase12-sns-test.alert`, `root:root`, mode `0600`.
- External receipt: Gmail search in the confirmed destination mailbox displayed an unread message from AWS Notifications with subject `Learning portal operational alert` at 10:02 AM IST.
- Message fields matched the trigger: timestamp `2026-11-20T04:32:53+00:00`, host `ip-172-26-10-202`, unit `phase12-sns-test`.

The test proves monitor-to-alert-service, local custody, IAM authentication, exact-topic publish, SNS subscription and email delivery. It does not claim a separate external uptime probe; total host or network loss remains detectable only through an independently configured external monitor.

## Preservation And Integrity

Repository and installed hashes matched:

| Artifact | SHA-256 |
|---|---|
| `learning-portal-alert` | `55857f751e1d59ee04d99baae059b3ab2db182eb0c158a6776979b9b6743b5f7` |
| alert service | `23649211bad9bdc7d0821a83f43c4f2984b727cc5dfd3b0a576170d5515cd55e` |

After the test:

- The five-minute monitor timer remained enabled and active.
- The latest normal monitor result remained successful.
- All 13 expected shared-host containers remained running; all health-enabled containers were healthy.
- `https://learn.accerio.in/` returned HTTP 200.
- Temporary local, host-transfer and CloudShell credential copies were removed without displaying the secret.
- CloudShell deletion was explicitly confirmed and verified by the exact-path absence assertion `CLOUDSHELL_CREDENTIAL_REMOVED`.
- Existing application data, DNS, static IP and other projects were unchanged.

## Final Phase 12 Result

Phase 12 cumulative result: **4 PASS, 0 CONDITIONAL, 0 FAIL, 0 BLOCKED, 0 NOT RUN**.

Global frozen register: **104 PASS, 0 CONDITIONAL, 0 FAIL, 0 BLOCKED, 8 NOT RUN**.

## Evidence

- `docs/qa/evidence/phase12-alert-closure-20261120/source-and-artifact-identity.txt`
- `docs/qa/evidence/phase12-alert-closure-20261120/host-alert-and-preservation.txt`
- Historical report: `docs/qa/121-phase12-operations-monitoring-interim-20261119.md`

Phase 13 was not authorized or started.
