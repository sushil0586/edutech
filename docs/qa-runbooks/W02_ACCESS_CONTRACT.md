# W02 pilot access contract

Decisions confirmed by the product owner on 21 October 2026: teachers collaborate across teaching resources in their own institute; tenant suspension allows attempts already in progress to finish and blocks new attempts. Android/iOS remains student-only. This contract preserves ordinary institute isolation.

## Role and resource matrix

| Resource/action | Platform admin | Institute admin | Teacher | Student | Parent |
| --- | --- | --- | --- | --- | --- |
| Institute lifecycle, suspend/reactivate | All institutes | Own institute settings; no suspension control | Denied | Denied | Denied |
| Academic setup and roster writes | All institutes | Own institute | Read own academic setup; no roster/credential administration | Own profile where offered | Linked-child identity only |
| Questions, exams and advanced authoring | All institutes, subject to feature/content access rules | Own institute | Institute-wide collaboration; personal teaching assignment is not an access boundary | Eligible exam discovery/detail only | Denied |
| Attempts | Operational access in scope | Own institute | Own institute monitoring/review | Own attempts only; valid assignment/window/entitlement required to start | Progress only through active child links |
| Grades, result actions and reports | Operational access in scope | Own institute | Own institute; claimed grading tasks retain reviewer/moderation ownership rules | Own results/reviews under publication rules | Active links and per-child visibility flags; published results only |
| Money and policy | Platform policy and permitted account operations | Own institute operations as enabled by economy policy | No grants, confirmations or policy changes | Own wallet, orders and permitted spending | Only offered child views with explicit child permission |

Collaboration does not allow impersonating another teacher as the author, overriding grading claim/moderation locks, bypassing content entitlements, managing credentials, or crossing institute boundaries. Record ownership and actor identity remain attributed. Institute creation and archival are platform-admin only. Institute admins cannot reset, disable or enable platform-admin, Django staff or superuser accounts, even if linked to the same institute. Policy metadata is platform-controlled; institute admins use the dedicated validated settings fields.

## Account and tenant states

- Disabled user, disabled account profile, or disabled/missing required linked role profile: reject login, refresh and existing bearer tokens. Incomplete onboarding retains its existing profile-completion path.
- Password changes invalidate previously issued access and refresh tokens. Tokens issued before this release lack the credential fingerprint and require one fresh sign-in on promotion. Clients continue treating JWTs as opaque strings; API response shapes remain compatible.
- Archive (`is_active=false`): record visibility/archival state, preserving existing access semantics. Archive is distinct from suspension and does not disable member accounts.
- Suspend: explicit `POST /api/v1/institutes/{id}/suspend/`, platform-admin only, requiring a reason. Adds an audit event; preserves answers, attempts, grades, files and history.
- A suspended institute's ordinary protected operations are denied even through stale sessions. Only a student with a pre-suspension in-progress attempt can log in or refresh to finish it. Identity hydration remains available for the completion UI.
- The finish exception is limited to the owning student, original institute and an attempt started no later than the suspension timestamp. Allowed operations are attempt read/detail, save/upload, section switching, integrity events and submission. Existing timers and attempt validation still apply. Start, discovery, wallet, ordinary reports, grading and unrelated records remain blocked.
- A terminal attempt's own summary remains accessible through an existing valid session; writes are blocked. Refresh is unavailable once no qualifying attempt remains. Saved answers survive reload, suspension and reactivation.
- Concurrent PostgreSQL starts share-lock the institute. Suspension takes an exclusive lock and timestamps after earlier starts commit, so it does not admit starts after the suspension boundary.
- Reactivation: explicit `POST /api/v1/institutes/{id}/reactivate/`, platform-admin only, with an audit event. It restores ordinary permissions without changing archive state or deleting history. Repeated suspension does not move the original cutoff.

Access-state fields are read-only in ordinary institute create/update serializers. The platform web institute panel exposes separate suspend/reactivate controls and states the finish-existing-attempt behavior. Students see a suspension banner while finishing.

## Parent visibility

Child reads require an active parent account/profile, an active relationship in the same institute and an active child. Revoked/suspended/inactive links cannot expose child detail, progress, alerts, alert counts, single-alert mutations or bulk mutations, even when the request omits the child filter.

`can_view_progress` controls progress views; `can_view_results` additionally controls detailed published result rows and result/score alerts. Other progress alerts require progress permission. `can_receive_alerts` controls all alert list/count/update paths. Unknown alert categories remain hidden until assigned a visibility policy. Selecting an empty alert page never mutates every alert.

## Public exams and remaining release scope

Cross-institute public exams are deferred from the initial pilot, as selected in the go-to-market plan. A `platform` source label never overrides tenant scope. Institute-local content can still be offered under ordinary assignment, academic and entitlement rules. Cross-institute discovery, commercial entitlement and reporting ownership need W02.04/W05 decisions and separate certification before sale.

## Deployment and rollback

Migration `institutes.0008` adds `is_suspended` (false by default), `suspended_at` and `suspension_reason`; it does not modify historical records. Apply it before starting this candidate. Ordinary active institutes retain their existing scope. The web deployment requires the matching backend access actions and identity field.

Rolling back to pre-W02 application code removes enforcement of suspended state and reintroduces the fixed parent/session gaps. Do not use that rollback while any institute is suspended; restore a compatible enforcing build or restrict entry first. The additive database columns can remain present. Do not remove them or delete assessment data as part of application rollback.

Local Docker evidence is recorded in the W02 execution report. Live public staging, full export/manual-grade coverage, real provider integrations and device certification must not be inferred from a selected test suite.
