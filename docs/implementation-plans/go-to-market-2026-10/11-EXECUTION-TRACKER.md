# Go to market execution tracker

Created 21 October 2026 · Status: In progress

[High level plan](00-HIGH-LEVEL-PLAN.md)

Assign named owners and target dates after staffing is confirmed. Status values: Not started, In progress, Blocked, Ready for QA, Passed, Deferred. Deferred tasks must identify the feature/channel excluded from the release.

## Workstream tasks

| Task | Deliverable | Release gate | Dependency | Status |
| --- | --- | --- | --- | --- |
| [W01.01](01-release-and-deployment.md) | Declare the active release sources | Pilot | Entry decisions | In progress |
| [W01.02](01-release-and-deployment.md) | Build reproducible release artifacts | Pilot | W01.01 | Passed |
| [W01.03](01-release-and-deployment.md) | Correct and verify HTTPS routing | Pilot | W01.02 | In progress |
| [W01.04](01-release-and-deployment.md) | Certify the deployed assessment lifecycle | Pilot | W01.03, W02.02, W03.01 | Blocked |
| [W01.05](01-release-and-deployment.md) | Rehearse promotion and rollback | Pilot | W01.04, W09.04 | Blocked |
| [W02.01](02-access-and-tenant-policies.md) | Freeze the access contract | Pilot | Entry decisions | Ready for QA |
| [W02.02](02-access-and-tenant-policies.md) | Enforce tenant and account state | Pilot | W02.01 | Ready for QA |
| [W02.03](02-access-and-tenant-policies.md) | Align teacher and parent scope | Pilot for teacher; parent gate if offered | W02.01 | Ready for QA |
| [W02.04](02-access-and-tenant-policies.md) | Resolve public exam eligibility | Public web if platform exams are offered | W02.01, W05.01 | Deferred |
| [W02.05](02-access-and-tenant-policies.md) | Certify authorization on the release candidate | Pilot | W02.02, W02.03 | Ready for QA |
| [W03.01](03-assessment-workflows.md) | Stabilize the objective assessment baseline | Pilot | W02.01, W05.01 | In progress |
| [W03.02](03-assessment-workflows.md) | Resolve teacher results navigation | Pilot | W03.01 | In progress |
| [W03.03](03-assessment-workflows.md) | Prove answer and session recovery | Pilot | W03.01 | In progress |
| [W03.04](03-assessment-workflows.md) | Certify descriptive grading if included | Descriptive assessment release | W02.03, W03.01 | Deferred |
| [W03.05](03-assessment-workflows.md) | Reconcile learner reports and notifications | Pilot for results; broader release for optional alerts | W03.01, W03.02 | In progress |
| [W04.01](04-web-ui-and-ux.md) | Define role tasks and simplify navigation | Pilot | Entry decisions | Complete |
| [W04.02](04-web-ui-and-ux.md) | Make question and wallet lists bounded | Pilot for question bank; commerce gate for wallet | W04.01 | Complete |
| [W04.03](04-web-ui-and-ux.md) | Shorten exam creation | Pilot | W04.01, W03.01 | Complete |
| [W04.04](04-web-ui-and-ux.md) | Improve learner and signup activation | Pilot | W04.01, W07.01 | Complete |
| [W04.05](04-web-ui-and-ux.md) | Certify accessible responsive tasks | Pilot for critical tasks; broader release for full included surface | W04.02, W04.03, W04.04 | Complete for pilot; broader release in progress |
| [W05.01](05-content-and-shared-library.md) | Select the first content offer | Pilot | Entry decisions | In progress |
| [W05.02](05-content-and-shared-library.md) | Approve curriculum completeness and quality | Pilot | W05.01 | In progress |
| [W05.03](05-content-and-shared-library.md) | Separate customer content from test fixtures | Pilot | W05.02 | Complete |
| [W05.04](05-content-and-shared-library.md) | Certify shared content acquisition | Shared-library sales release | W02.03, W05.02 | Not started |
| [W05.05](05-content-and-shared-library.md) | Set content maintenance ownership | Pilot | W05.02 | Complete |
| [W06.01](06-payments-and-entitlements.md) | Freeze the commercial contract | Pilot billing decision; paid contract later | Entry decisions | Complete for pilot; paid offer deferred |
| [W06.02](06-payments-and-entitlements.md) | Implement provider payment verification | Public paid launch | W06.01 | Not started |
| [W06.03](06-payments-and-entitlements.md) | Make entitlement lifecycle consistent | Public paid launch | W06.02 | Not started |
| [W06.04](06-payments-and-entitlements.md) | Complete finance and support operations | Public paid launch | W06.03 | Not started |
| [W06.05](06-payments-and-entitlements.md) | Approve a controlled paid release | Public paid launch | W06.04, W07.03, W09.05 | Not started |
| [W07.01](07-onboarding-and-customer-trust.md) | Complete role onboarding and first use | Pilot | W02.01 | Complete |
| [W07.02](07-onboarding-and-customer-trust.md) | Add account recovery | Public self-serve; assisted fallback acceptable for pilot | W07.01 | Complete |
| [W07.03](07-onboarding-and-customer-trust.md) | Publish customer policies and support routes | Pilot | W07.01, W06.01 | Complete for pilot |
| [W07.04](07-onboarding-and-customer-trust.md) | Replace internal marketing content | Public acquisition | W05.01, W06.01 | Not started |
| [W07.05](07-onboarding-and-customer-trust.md) | Measure activation and support friction | Pilot | W07.01, W07.03, W04.04 | Ready for human observation |
| [W08.01](08-student-android-and-ios.md) | Establish app identities and distribution | Student app beta | Entry decisions | Blocked on identities/accounts/signing |
| [W08.02](08-student-android-and-ios.md) | Simplify the student app experience | Student app beta | W08.01, W04.01 | In progress; device matrix open |
| [W08.03](08-student-android-and-ios.md) | Prove the signed exam and recovery journey | Student app beta | W08.01, W03.03, W07.01 | In progress; signed journey open |
| [W08.04](08-student-android-and-ios.md) | Complete native security and service behavior | Student app release | W08.03, W07.03 | In progress; signed-device probes open |
| [W08.05](08-student-android-and-ios.md) | Prepare store submissions and student beta | Student app release | W08.04, W09.05, W10.03 | Not started |
| [W09.01](09-reliability-and-release-qa.md) | Freeze the release test matrix | Pilot | Entry decisions | Complete for objective-exam web pilot |
| [W09.02](09-reliability-and-release-qa.md) | Validate long sessions and outages | Pilot | W03.03, W01.03 | In progress; Docker recovery passed, stage duration pending |
| [W09.03](09-reliability-and-release-qa.md) | Measure capacity for the sold cohort | Pilot | W01.03, W03.01 | Ready for authorized stage confirmation |
| [W09.04](09-reliability-and-release-qa.md) | Prove backup restore and incident response | Pilot | W01.02 | Ready for stage responder configuration |
| [W09.05](09-reliability-and-release-qa.md) | Run final candidate regression | Each release gate | W01.04, W02.05, W09.02, W09.03, W09.04 | In progress; local candidate checkpoint passed |
| [W10.01](10-pilot-and-market-rollout.md) | Choose design partners and pilot promises | Pilot | Entry decisions | Not started |
| [W10.02](10-pilot-and-market-rollout.md) | Run unfamiliar-user acceptance | Pilot | W04.05, W05.02, W07.01 | Not started |
| [W10.03](10-pilot-and-market-rollout.md) | Approve and run the web pilot | Pilot | W01.05, W02.05, W03.05, W04.05, W05.05, W07.03, W07.05, W09.05, W10.02 | Not started |
| [W10.04](10-pilot-and-market-rollout.md) | Expand to paid web and student app betas | Public web and student beta | W10.03 | Not started |
| [W10.05](10-pilot-and-market-rollout.md) | Operate a continuing release process | After pilot | W10.03 | Not started |

## Audit finding coverage

| Finding | Workstream coverage |
| --- | --- |
| REL01 | [W01 Release and deployment](01-release-and-deployment.md) |
| REL02 | [W01 Release and deployment](01-release-and-deployment.md) |
| REL03 | [W01 Release and deployment](01-release-and-deployment.md) |
| HYGIENE01 | [W01 Release and deployment](01-release-and-deployment.md) |
| AUTH01 | [W02 Access and tenant policies](02-access-and-tenant-policies.md) |
| AUTH02 | [W02 Access and tenant policies](02-access-and-tenant-policies.md) |
| EXAM01 | [W02 Access and tenant policies](02-access-and-tenant-policies.md) |
| NAV01 | [W03 Assessment workflows](03-assessment-workflows.md) |
| REVIEW01 | [W03 Assessment workflows](03-assessment-workflows.md) |
| RELIABILITY01 | [W03 Assessment workflows](03-assessment-workflows.md) |
| UX01 | [W04 Web UI and UX](04-web-ui-and-ux.md) |
| UX02 | [W04 Web UI and UX](04-web-ui-and-ux.md) |
| UX03 | [W04 Web UI and UX](04-web-ui-and-ux.md) |
| UX04 | [W04 Web UI and UX](04-web-ui-and-ux.md) |
| A11Y01 | [W04 Web UI and UX](04-web-ui-and-ux.md) |
| CONTENT01 | [W05 Content and shared library](05-content-and-shared-library.md) |
| SHARE01 | [W05 Content and shared library](05-content-and-shared-library.md) |
| PAY01 | [W06 Payments and entitlements](06-payments-and-entitlements.md) |
| MKT02 | [W06 Payments and entitlements](06-payments-and-entitlements.md) |
| SHARE01 | [W06 Payments and entitlements](06-payments-and-entitlements.md) |
| AUTH03 | [W07 Onboarding and customer trust](07-onboarding-and-customer-trust.md) |
| TRUST01 | [W07 Onboarding and customer trust](07-onboarding-and-customer-trust.md) |
| MKT01 | [W07 Onboarding and customer trust](07-onboarding-and-customer-trust.md) |
| MKT02 | [W07 Onboarding and customer trust](07-onboarding-and-customer-trust.md) |
| UX04 | [W07 Onboarding and customer trust](07-onboarding-and-customer-trust.md) |
| MOBILE01 | [W08 Student Android and iOS](08-student-android-and-ios.md) |
| RELIABILITY01 | [W08 Student Android and iOS](08-student-android-and-ios.md) |
| A11Y01 | [W08 Student Android and iOS](08-student-android-and-ios.md) |
| UX04 | [W08 Student Android and iOS](08-student-android-and-ios.md) |
| PERF01 | [W09 Reliability and release QA](09-reliability-and-release-qa.md) |
| RELIABILITY01 | [W09 Reliability and release QA](09-reliability-and-release-qa.md) |
| A11Y01 | [W09 Reliability and release QA](09-reliability-and-release-qa.md) |
| REL03 | [W09 Reliability and release QA](09-reliability-and-release-qa.md) |
| OPS01 | [W09 Reliability and release QA](09-reliability-and-release-qa.md) |
| UAT01 | [W10 Pilot and market rollout](10-pilot-and-market-rollout.md) |
| OPS01 | [W10 Pilot and market rollout](10-pilot-and-market-rollout.md) |
| MKT02 | [W10 Pilot and market rollout](10-pilot-and-market-rollout.md) |

## W01 execution update

Local release foundation verified on 21 October. Live staging connection details and the W02/W03/W09 dependent signoffs remain open. [Execution report and evidence](../../qa/62-w01-release-foundation-20261021.md).

## Release decision record

| Gate | Candidate SHA and environment | Evidence | Open blockers | Owner and decision date |
| --- | --- | --- | --- | --- |
| G0 staging | Pending | Pending | See W01 and W02 | Unassigned |
| G1 pilot | Pending | Pending | Pilot gates | Unassigned |
| G2 validated pilot | Pending | Pending | Two real cycles | Unassigned |
| G3 paid web | Pending | Pending | Commercial gates | Unassigned |
| G4 student Android and iOS | Pending | Pending | Signed device, beta and store gates | Unassigned |

## Change discipline

For each completed task record named owner, PR/commit, affected client versions, environment, test outcomes and evidence links. If a shared API changes after a client has shipped, verify compatibility or define the minimum supported client and safe upgrade behavior. Keep store approval separate from internal technical acceptance.

## Docker verification continuation

[Local Docker verification](../../qa/63-w01-docker-verification-20261021.md) passed the selected browser gate on candidate `9bd1f564b6cb5935054ae92f253caa5945bd37b2`: 10 browser tests, four UI role logins, 79 backend tests and 31 deployment checks. Corrected archive identity propagation and the internal server API route. This local evidence advances W01 preparation; it does not clear W01.03–W01.05 live deployment gates or the broader W02/W03 workstreams.

## W02 Docker execution

[W02 access verification](../../qa/64-w02-access-and-tenant-verification-20261021.md) implements the confirmed institute-wide teacher model, audited suspension with existing-attempt completion, live account/session checks, parent visibility and tenant-admin privilege boundaries. Candidate `fb4c806053c202cb665fc0941c149a4aaa184ef3` passed 160 backend tests and 70 direct HTTPS probes. All 11 selected browser cases passed across runs; the initial batch included a provisioning 502 and its unchanged lifecycle rerun passed. W02 is ready for independent release QA; W02.04 cross-institute public exams are deferred from the initial pilot. W09.02 owns the open connection-reset and Gunicorn control-path findings. The updated local review origin is `https://localhost:39123`; W01 public staging gates remain open.

## W03 execution checkpoint — 21 October 2026

Objective-only pilot scope confirmed; descriptive grading excluded pending its own release gate. Recovery/result fixes and current evidence are listed in [W03 Docker verification](../../qa/65-w03-objective-recovery-verification-20261021.md). W03 is in progress: pilot content/policy enforcement, navigation root cause, full-duration soak/expiry scheduling and broader report-state coverage remain open. Android/iOS certification remains separate and student-only.

## Reliability follow-up — 21 October 2026

Candidate `581ed8f` adds independent expiry processing, conditional web saves, persisted access-cookie renewal, runtime hardening and a sampled student-header layout fix. [Verification and changed files](../../qa/66-w03-reliability-and-header-verification-20261021.md). W03/W09.02 remain In progress; W03.04 stays Deferred. W04.01/W04.05 are In progress with broader task and accessibility checks outstanding. Curriculum/content approval, pilot-duration/native checks, capacity/restore and public staging remain release gates.

[W04 task-priority checkpoint](../../qa/67-w04-task-priority-verification-20261021.md): focused teacher-creation and learner-action changes; broader UX gates remain open.

[W04 mobile first-viewport checkpoint](../../qa/68-w04-mobile-first-viewport-verification-20261021.md): student action and teacher first configuration control are visible at 390×900; complete W04 certification remains open.
