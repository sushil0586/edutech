# Pilot activation and support measurement

## Purpose and ownership

The pilot owner reviews the platform-admin Reports page every week with support and engineering. The default window is seven days. Institute administrators may query the same summary for their own tenant; platform administrators see all tenants.

## Event contract

| Event | Trigger | Safe event detail |
|---|---|---|
| `public_registration` | Account registration succeeds | role, platform, release |
| `onboarding_profile_complete` | Required profile is completed | role, platform, release |
| `student_first_assigned_exam_seen` | Student first receives a non-empty assigned-exam list | visible count |
| `attempt_start` | Attempt starts | exam and student identifiers |
| `attempt_save_failed` | A save conflicts or fails validation | exam identifier and error category |
| `attempt_submit` | Attempt submits | exam identifier and attempt status |
| `support_request_created` | Authenticated user creates a support request | request category |

Every event is enriched with account role, `web`/`android`/`ios`/`api` client platform, client version and backend build. Unknown client values become `unknown`. Event-specific metadata uses an allowlist. Answer text, transcripts, selected answers, passwords, tokens, email addresses and usernames are never accepted by this event helper.

Clients should send `X-Client-Platform` and `X-Client-Version`. The backend release fills the version when the client omits it.

## Weekly review

1. Open **Platform Admin → Reports** and compare starts, submissions, save failures and support requests for the last seven days.
2. Review signup-to-profile and start-to-submit rates by role, platform and release from `GET /api/v1/reports/activation-summary/?days=7`.
3. Investigate a release/platform segment when save failures rise, completion drops, or support requests cluster. Use audit identifiers to find the operational record; do not add response content to analytics.
4. Record owner, observation, action and due date in the pilot review notes. Compare the next weekly window to confirm recovery.

The summary accepts 1–90 days. It reports event volume rather than unique-user conversion, so weekly decisions must state that limitation.
