# Objective attempt recovery contract

21 October 2026. Pilot scope approved by the product owner: objective exams; descriptive grading excluded. Android and iOS remain student-only and require separate signed-device certification.

## Learner workflow

1. Start an eligible institute exam. The server assigns the attempt deadline and preserves delivery order.
2. Choose an answer and use **Save Answer**. This workspace uses explicit saves; it does not promise background autosave or fully offline exams.
3. A successful response updates the confirmed save time and clears the unsaved-change guard. Sending a request alone is not confirmation.
4. If connectivity fails, keep the tab open. Unsaved changes remain in that tab. Reconnect and check the saved state before retrying; do not close or reload an unsaved draft expecting offline storage.
5. If a save response is lost, the server may already have committed it. The page retains the draft, reports an unconfirmed action and permits recovery. Reloading retrieves the server's saved answer; it can discard changes that never reached the server.
6. Submit once. If the receipt is lost, open the attempt summary. A duplicate submit returns the existing API's validation error; it must not change the committed answer, submission time or final result.
7. After the deadline, answer writes are rejected. The expiry worker finalizes expired attempts from saved answers using their original deadline; recovery reads also finalize them if necessary. This does not extend the exam or recover answers that were never saved.
8. Results stay hidden until the configured publication policy allows them. A published-result notification opens the originating attempt summary, including when the learner has several attempts.

## Teacher workflow

Complete the exam after its attempts finish, calculate ranks when a ranked leaderboard is required, then publish results. Manual result publication and rank calculation are separate operations. Check publication readiness before releasing results. Objective-only scope does not certify manual grading, moderation or recheck.

## Support recovery

- Confirm the learner, institute, exam and attempt IDs through authorized account/workspace access.
- Inspect the attempt summary and the last saved answer state. Distinguish an unconfirmed client request from a persisted answer.
- If a submission response was lost, recover its summary rather than creating another attempt or editing the result.
- If the window expired, recovery uses the saved answers and original deadline. Do not change timestamps or grades to make a retry succeed.
- After a service restart, reconnect and read the existing attempt. The authoritative state is in PostgreSQL; browser-held drafts are not a backup.
- Escalate a mismatch between a saved answer, attempt score and result with sanitized request IDs and timestamps. Keep tokens, cookies, database dumps and raw browser traces private.

## Compatibility and rollout boundaries

No schema migration or new required API field is introduced. Submitted-answer writes and duplicate explicit submits retain their validation-error contract. Expired summary reads now perform the same finalization as workspace recovery, including result generation and in-app notification creation; publication visibility remains enforced. Existing clients must accept a terminal attempt status when recovering an expired attempt.

Writes and finalization lock and refresh the current attempt row. Web saves now send optional `expected_answer_updated_at`: null expects no answer, a timestamp must match the current answer, and a mismatch returns HTTP 409 without mutation. The web conflict screen shows the authoritative saved answer and states that the rejected change was not saved. Omitted versions retain legacy commit-order behavior; native and other older clients must adopt the field before stale in-progress overwrite protection can be claimed for them. This is not cross-device draft merging.

The Docker `expiry-worker` service runs `python manage.py process_expired_attempts --loop --interval 15 --batch-size 100`. Each attempt finalizes independently; errors are isolated and retried on later polls. Its health check requires a successful heartbeat within 60 seconds. Inspect service health and logs after database recovery. This bounded polling does not promise an instantaneous result at the deadline under load. A one-off operator pass is `python manage.py process_expired_attempts --batch-size 100`.

Deploy the backend before the web version guard. No migration is required. On rollback, explicitly stop the new expiry-worker before switching to an older compose definition; otherwise the removed service can remain as an orphan. Downgrading removes the new web version guard. Preserve saved answers, grades, generated results and notification history; do not restore an older snapshot over later learner work. Recheck expiry behavior after reverting.

The protected web routes renew expiring access cookies through Next Proxy; backend authorization still applies to routes and actions. A controlled fifteen-minute Docker session and outage checks are recorded in the [follow-up verification](../qa/66-w03-reliability-and-header-verification-20261021.md). Actual pilot-duration sessions, refresh-token expiry, prolonged outages, scheduler capacity, supported browser/device breadth and public staging remain separate release gates. Descriptive content must be excluded from the approved pilot inventory and policies before enrollment; this change does not globally remove existing descriptive features from other institutes or demo data.
