# W04 mobile first-viewport verification

21 October 2026. This focused checkpoint follows the [task-priority review](67-w04-task-priority-verification-20261021.md). It addresses the two mobile limitations recorded there; it does not close the full W04 UI/UX workstream.

## Result

At a **390×900** viewport, the student’s primary next-action button and the teacher’s first exam configuration control are now visible without scrolling.

- Student: the primary action appears directly below the recommendation description. Supporting metadata, guidance and diagnostic cards follow it in visual and document order.
- Student header: context controls use a compact horizontally scrollable action row. Search, source, subject, wallet, alerts and profile access remain available.
- Teacher: the four setup steps form a compact horizontal rail instead of four stacked cards. The redundant teacher workspace toolbar is hidden only on the mobile create-exam page; the global mobile menu remains available.
- Teacher: required-field validation, retained draft values, step focus, academic option hydration and disposable exam creation remain working.

## Candidate and changed files

The Docker web image is built from application commit `277b4388a199d74b2a0e2d77a0ded07104d33e9d`; its source archive SHA-256 is `ef4eccddbad5b51705cfb0124cc02f45ba82ef6f0ecf00000c936e58ad460e20`. See the [web release manifest](evidence/w04-mobile-first-viewport-20261021/web-release-manifest.json).

The final test-only revision is `8e59664`. Relative to the preceding W04 documentation checkpoint `c67ccd6`, this pass changes:

- `edutech_web/src/app/(student)/app/dashboard/page.tsx`
- `edutech_web/src/app/globals.css`
- `edutech_web/tests/e2e/workflow/task-priority-and-wizard.spec.ts`

No backend, database schema, assessment rules, authorization, scoring, publication or native application code changed.

## Verification

The production web image compiled successfully. TypeScript and targeted ESLint passed.

The initial six-check Docker pack retained five passes but correctly failed the new teacher first-viewport assertion. After hiding the redundant mobile toolbar, the same pack retained those five passes; its remaining failure was a test locator that requested an exact accessible name while the wrapped label included help text. The locator was corrected to the stable field name and both affected tests passed with zero retries. Failures are retained here rather than counted as initial passes.

Final evidence:

- Two corrected task-priority tests passed: teacher validation/focus/viewport and student action/source-order/viewport.
- The five unaffected checks passed on the final application image: student header controls, three teacher creation journeys and student task priority.
- A real disposable teacher exam shell was created and cleaned up by the existing journey.
- HTTPS headers identify the expected web artifact; the web container is healthy, non-root and read-only.
- The unchanged API remains healthy on application build `581ed8f04565f080dfe3f82c966b8171ccdd5c87`.

See the [teacher mobile capture](evidence/w04-mobile-first-viewport-20261021/teacher-390.png), [student mobile capture](evidence/w04-mobile-first-viewport-20261021/student-390.png), [teacher desktop capture](evidence/w04-mobile-first-viewport-20261021/teacher-1440.png), [student desktop capture](evidence/w04-mobile-first-viewport-20261021/student-1440.png), [verification summary](evidence/w04-mobile-first-viewport-20261021/verification-summary.json) and [runtime identity](evidence/w04-mobile-first-viewport-20261021/runtime-summary.json).

## Remaining work

W04 remains In progress. The teacher rail requires horizontal scrolling on mobile, so a user must discover later steps; it is compact but not final design certification. Signup/first-use continuity, bounded question-bank and wallet lists, the complete authoring path, keyboard/zoom/screen-reader checks, Firefox/WebKit and unfamiliar-user testing remain open. Curriculum approval, pilot-duration/native checks, capacity/restore and public staging also remain market gates.

