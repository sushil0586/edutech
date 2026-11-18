# W04 task priority and guided creation checkpoint

21 October 2026. This is a focused local UI/UX checkpoint. Objective-only pilot scope and student-only Android/iOS remain unchanged. W04 is still In progress.

## What changed

- Teacher creation opens directly into the guided form, removing repeated setup/count panels. The removed cohort/subject counts were initialized to zero before client-side hydration, which could imply missing setup even when options were available.
- The shared teacher/institute/platform wizard removes duplicate current-step summaries and inventory cards. Step controls use normal navigation buttons with `aria-current="step"`; changing a step focuses and scrolls to its named section. Native required-field validation and draft values remain in the form.
- The student dashboard places the primary recommendation/action before performance KPIs and moves recommendation statistics after its action in source order.
- Desktop student context filters can share a row, reducing header height while keeping the previously fixed search/action separation.

No backend, schema, scoring, authorization, publication or native code changed. The wizard still has four setup steps followed by question/assignment work; this does not claim the complete audience → questions → schedule → preview/publish redesign.

## Runtime identity and verification

**Eight focused Chromium browser checks passed in 48.7 seconds, with zero retries and zero skips.** They cover platform-admin guided setup, teacher validation and scope hydration, actual disposable teacher exam creation and cleanup, focus/retained draft values across steps, learner source and visual task order, header hit targets at 1280/1440/390 pixels and the existing published-result receipt link. TypeScript, targeted ESLint and the production web Docker build passed. Strict HTTPS verification matched the new web identity and retained API identity, and confirmed a non-root/read-only web container. See [verification summary](evidence/w04-task-priority-20261021/verification-summary.json) and [runtime identity](evidence/w04-task-priority-20261021/runtime-summary.json). The unchanged backend regression and fifteen-minute soak were not repeated for this presentation-only change.

Only the web image is rebuilt in the existing `edutech-w02-docker` project. The API and expiry-worker retain application SHA `581ed8f04565f080dfe3f82c966b8171ccdd5c87`. This is an explicitly mixed-component UI checkpoint, not a newly certified unified full-stack release. Docker remains at **https://localhost:39123/login**, using the task certificate. Original dirty application source and the unrelated Docker project are preserved.

The application web build is `011bc3141adbdf84f3f5c78e1db9018e6012fdb8` ([manifest](evidence/w04-task-priority-20261021/web-release-manifest.json)); the verification-only update `b593574` aligns existing tests with the new navigation semantics. The [full change patch](evidence/w04-task-priority-20261021/changes.patch) covers seven web/test files relative to `8e26296`.

## Visual evidence and limits

Reviewed all four desktop/mobile after captures against the baseline:

| Screen | Before | After | Finding |
| --- | --- | --- | --- |
| Teacher 1440px | [Before](evidence/w04-task-priority-20261021/before-teacher-1440.png) | [After](evidence/w04-task-priority-20261021/after-teacher-1440.png) | Repeated summary panels removed; the first blueprint control is now visible within the captured 900px viewport. |
| Teacher 390px | [Before](evidence/w04-task-priority-20261021/before-teacher-390.png) | [After](evidence/w04-task-priority-20261021/after-teacher-390.png) | Less repetition, but shell/header and stacked step navigation still push inputs below the first viewport. |
| Student 1440px | [Before](evidence/w04-task-priority-20261021/before-student-1440.png) | [After](evidence/w04-task-priority-20261021/after-student-1440.png) | Main action precedes diagnostics; desktop context controls share a row. |
| Student 390px | [Before](evidence/w04-task-priority-20261021/before-student-390.png) | [After](evidence/w04-task-priority-20261021/after-student-390.png) | The recommendation replaces KPIs at the top, but the primary button remains below the first viewport. Mobile header and recommendation density need another pass. |

No claim of complete WCAG conformance, unfamiliar-user acceptance, every browser/device or all academic catalogs is made. Signup, account recovery, onboarding and the broader teacher question-bank/authoring audit remain open.

## Next work

Continue W04 with bounded question-bank lists and a shorter end-to-end authoring path, then signup/first-use and critical accessibility checks. Approve pilot curriculum/content before tailoring presets or certifying real pilot exams. W03/W09 still need actual pilot-duration/native checks, the original intermittent failure diagnosis, capacity/restore and public staging. This checkpoint does not approve market launch.
