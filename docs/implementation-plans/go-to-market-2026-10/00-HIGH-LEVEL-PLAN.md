# Nexora go to market high level plan

Created 21 October 2026 · Status: Planned · Baseline: 21 October readiness audit

Launch an assisted institute web pilot first, prove two real assessment cycles, then expand to paid self-service web and student Android/iOS apps through separate release gates. The core objective exam engine already works locally; the plan concentrates on reliable deployment, clear authorization, usable workflows, approved content and customer operations.

## Product scope

| Role | Web | Android | iOS |
| --- | --- | --- | --- |
| Student | Full included learner journey | Student app only | Student app only |
| Teacher | Authoring, delivery, grading and reports | Outside scope | Outside scope |
| Institute admin | Academics, people, content access, exams and operations | Outside scope | Outside scope |
| Platform admin | Governance, institutes, commerce and operations | Outside scope | Outside scope |
| Parent | Linked-child progress, results and alerts when included | Outside scope | Outside scope |

Student apps cover onboarding/login, available/assigned exams, active attempts and recovery, results/review, practice/weak areas, learner analytics, profile/settings and help. Enabled notifications must have permission and privacy handling. Wallet/subscription behavior depends on the approved commercial and store model. Other roles signing into a student app receive a clear web handoff; their native workspaces are not built.

## Release milestones

| Gate | Customer promise | Required work | Exit condition |
| --- | --- | --- | --- |
| G0 Validated staging candidate | Internally testable, reproducible release | Clean integrated SHA, migration parity, HTTPS/provenance, access contract, full exam lifecycle and negative paths | Exact deployed artifact passes the mandatory correctness and authorization checks |
| G1 Assisted institute web pilot | One selected curriculum, objective exams, assisted setup and defined support | Pilot tasks in W01–W05, W07, W09 and W10; no automated consumer payment dependency | Approved content, unfamiliar-user task acceptance, capacity cap and recovery/support readiness |
| G2 Pilot validated | Reliable use by a few design-partner institutes | Two real assessment cycles and incident/activation review | No unresolved critical incident; scores reconcile; technical non-completions investigated |
| G3 Paid self-service web | Defined paid offer with verified settlement and customer recovery | G2 plus W06, public marketing/recovery, and public-exam/shared-library gates for features actually sold | Full purchase-to-result and support/refund/reconciliation paths pass on the candidate |
| G4 Student Android and iOS | Signed student apps with safe exam continuity | W08 plus applicable shared API, policy, reliability and purchase gates | Both signed platforms pass real active-attempt recovery and beta acceptance; store requirements complete |

G3 and G4 can progress independently after the shared foundations. A student beta may start before public paid checkout when its approved access model requires no in-app purchase. Store approval is external and does not certify the web release.

## High level workstreams

| Workstream | Outcome | Lead | Detailed plan |
| --- | --- | --- | --- |
| W01 Release and deployment | One clean source revision produces the same identifiable web and API release that QA certifies on HTTPS staging. | Engineering lead and release engineer | [Tasks and acceptance criteria](01-release-and-deployment.md) |
| W02 Access and tenant policies | Each role can act only on the agreed institute, learner and content scope, including after tenant suspension. | Backend engineer | [Tasks and acceptance criteria](02-access-and-tenant-policies.md) |
| W03 Assessment workflows | Teachers can reliably deliver the included assessments and students receive correct, safely published results. | Backend and web engineers | [Tasks and acceptance criteria](03-assessment-workflows.md) |
| W04 Web UI and UX | Each role reaches its main task quickly through readable, bounded screens on desktop and mobile web. | Product designer and web engineer | [Tasks and acceptance criteria](04-web-ui-and-ux.md) |
| W05 Content and shared library | Every curriculum and question package offered at launch has complete, reviewed content and predictable access behavior. | Academic lead | [Tasks and acceptance criteria](05-content-and-shared-library.md) |
| W06 Payments and entitlements | A successful verified purchase grants the right access once, and failed, expired or refunded transactions are handled predictably. | Backend engineer responsible for commerce | [Tasks and acceptance criteria](06-payments-and-entitlements.md) |
| W07 Onboarding and customer trust | Customers understand the offer, can enter and recover their account, and have clear support/privacy procedures. | Product owner and web engineer | [Tasks and acceptance criteria](07-onboarding-and-customer-trust.md) |
| W08 Student Android and iOS | Signed Android and iOS student apps safely complete the same assessment and learning journey as student web. | Mobile engineer | [Tasks and acceptance criteria](08-student-android-and-ios.md) |
| W09 Reliability and release QA | Every shipped promise has current test evidence, measured operating limits and a demonstrated recovery path. | QA lead and release engineer | [Tasks and acceptance criteria](09-reliability-and-release-qa.md) |
| W10 Pilot and market rollout | A small group of real institutes can operate the product successfully before sales, content and student-app scope expands. | Founder or product owner | [Tasks and acceptance criteria](10-pilot-and-market-rollout.md) |

## Recommended sequence

1. Start W01 release integration and W02 policy decisions immediately. In parallel, start curriculum review, UX design, support/policy preparation and owned mobile account/signing setup.
2. Stabilize W03 assessment flows and implement only the W04 changes needed for pilot activation. W05 must approve the actual pilot data.
3. Complete G0 on deployed HTTPS staging, then W09 capacity/recovery and W10 unfamiliar-user acceptance. These gates must use the intended pilot artifact and configuration.
4. Open G1 within an agreed cohort cap. Complete two real assessment cycles before declaring G2.
5. Add W06 paid checkout and any public-exam/shared-library features being sold. Keep their tests distinct from the existing institute objective lifecycle.
6. Complete signed student Android/iOS runtime and recovery evidence, beta distribution and store submission. Web-only operator/parent roles remain unchanged in platform scope.

Do not run all ten engineering streams concurrently with a two-engineer team. Parallelize design, curriculum review, business decisions and account/provider setup; finish the release/security foundation before adding commercial complexity.

## Decisions to settle during the first two working days

| Decision | Accountable role | Working proposal | Required before |
| --- | --- | --- | --- |
| D01 First customer and curriculum | Founder and academic lead | Candidate selected 21 October: assisted Class 7 Math foundation and Science objective pack, English, 25 topics; full curriculum coverage is not claimed and academic/rights approval is pending | Topic review, reviewer signoff and controlled provisioning |
| D02 Team and release environment | Engineering lead | Two full-time engineers, dedicated QA and an owned staging environment | Committed dates and candidate integration |
| D03 Teacher scope | Product owner | Confirmed 21 October: institute-wide teacher collaboration; preserve author identity and grading ownership rules | Authorization changes and customer permission claims |
| D04 Tenant lifecycle | Product owner | Confirmed 21 October: archive is separate; suspension blocks new activity and lets existing attempts finish | Suspension enforcement and customer offboarding |
| D05 Public exam ownership | Product and backend owners | Defer cross-institute public exams from the initial pilot; choose copies or controlled public access before selling them | Public platform exam release |
| D06 Commercial offer and provider | Founder and finance owner | Assisted institute billing initially; choose a concrete automated offer later | Payment implementation and public pricing |
| D07 Student app access and purchases | Product and mobile owners | Student consumption/exam apps first; validate current store rules before adding any purchase or external payment flow | Store submission and native commercial UI |
| D08 Capacity and recovery targets | Product, QA and operations | Agree target concurrency, burst shape, recovery point and recovery time | Load/restore acceptance and pilot enrollment cap |
| D09 Native identities and distribution | Account owner and mobile engineer | Owned student app identities, Android and iOS beta tracks | Signed builds and store submission |

These are working proposals, not approvals already obtained. Implementation can continue on independent tasks while the accountable owners settle a decision.

## Planning timeline and staffing

Relative weeks start when D02 confirms staffing and environment access. Engineering effort ranges in the detailed plans are not additive calendar commitments: several activities share infrastructure or QA, while curriculum review, provider onboarding and store reviews have separate lead times.

| Window | Primary engineering focus | Parallel nonblocking work | Milestone target |
| --- | --- | --- | --- |
| Week 1 | Integrated candidate, access contract, suspension/scoping fixes | Content inventory, UX designs, policies, app identities/provider onboarding | G0 candidate prepared |
| Weeks 2–3 | Core reliability, targeted UX, deployed lifecycle and regression | Academic review, support training, unfamiliar-user sessions | G0 passed and G1 evidence assembled |
| Weeks 3–4 | Capacity/recovery closure and pilot defect fixes | Partner onboarding and first assessment cycle | G1 if all gates pass |
| Weeks 4–6 | Pilot feedback and high-impact fixes | Second cycle and paid-offer preparation | G2 |
| Weeks 5–10 | Verified payments/entitlements and public activation | Finance/support readiness; signed mobile QA as capacity permits | G3 target window |
| Weeks 6–12 and later if required | Student signed Android/iOS runtime, compatibility and release fixes | Student beta and external store review | G4 target window |

The earlier 2–4 week pilot, 6–10 week paid-web and 8–12+ week app ranges remain provisional. Re-estimate after G0 and the first pilot cycle. A dedicated mobile engineer accelerates W08; with only two shared engineers, student app certification may move beyond the illustrated window. Named owners and their availability must be added before dates become commitments.

## Release acceptance rules

- Zero unresolved critical access/privacy, incorrect-score, acknowledged-answer-loss or paid-grant defects for included features.
- No high defect that prevents a required core task or required accessibility path. Cosmetic issues may be accepted with an owner and follow-up.
- Every acceptance result references the exact release, environment and client/device. A local pass does not stand in for a staging result.
- Pilot content, cohort capacity, support ownership and recovery targets are explicitly approved.
- Deferred capabilities are disabled or clearly excluded from the offer; hidden UI alone is not API enforcement.
- No classroom, high-stakes family, question type, analytics claim or concurrent capacity is advertised solely because a preset, model or test exists.

Proposed pilot success targets are at least 80 percent unaided core-task completion in structured first-use sessions, at least 95 percent of started attempts reaching a valid final state during the pilot, and zero unresolved critical incidents across two real cycles. Agree the sample, denominator and context before using these targets; they are launch targets, not current measurements.

## Execution tracking

Use [the execution tracker](11-EXECUTION-TRACKER.md) for task IDs, owners, release gates and status. All new implementation tasks begin as Not started. Existing passing functionality is a baseline to preserve, not work to rebuild. Use [plan-data.json](plan-data.json) for machine-readable workstreams and acceptance criteria.

Update status only when the accountable owner supplies the stated outcome and verification. Record blocked external dependencies explicitly. A planning document, PR merge or passing build alone does not complete a customer journey.

## Baseline references

- [21 October readiness audit](../../qa/18-go-to-market-readiness-audit-2026-10-21.html)
- [26 audit findings and evidence summary](../../qa/evidence/market-audit-20261021/summary.json)
- [Latest retained staging parity report](../../qa/17-phase1h1-staging-parity-security-remediation.md)
- [Master QA coverage matrix](../../qa/04-master-qa-coverage-matrix.md)

This plan governs the new go-to-market sequence and student-only native scope. Existing detailed module specifications remain implementation references; dated historical confidence statements do not override the release gates here.

## Reliability follow-up — 21 October 2026

Candidate `581ed8f` implements independent expiry processing, conditional web answer saves, persisted access-cookie renewal and a sampled student-header overlap fix. See the [verification and changed-file report](../../qa/66-w03-reliability-and-header-verification-20261021.md). W03 and W09 remain In progress; W04 implementation has begun. Objective-only scope is confirmed, but actual curriculum/content, pilot-duration and native checks, public staging, capacity, restore, onboarding/policies and pilot acceptance remain gates before launch.
