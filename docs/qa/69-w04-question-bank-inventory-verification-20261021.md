# W04 teacher question-bank inventory verification

21 October 2026. This checkpoint implements and verifies the teacher question-bank portion of W04.02 against the local TLS Docker stack. It does not close W04.02 because wallet pagination and high-volume fixture testing remain open.

## Result

The teacher now reaches a bounded, searchable question inventory before licensing guidance and specialist controls.

- The first page is explicitly limited to 20 rows and retains server pagination.
- A prominent quick-search form appears immediately after the page heading.
- Compact view is the default; academic and specialist filters remain available in a collapsed disclosure.
- Licensed-source guidance is collapsed until requested and reflects the institute's live switch/package state.
- On a 390×900 viewport, redundant teacher chrome is removed for this page and header actions use a horizontal rail, keeping the search input, Search button and filter entry in the first task surface.
- New Question remains directly reachable from the page header.

## Candidate and changed files

The exact Docker web image is `edutech-w04-question-bank-web:68633219`, built from application commit `68633219f8068e4541901f2f54b44a1ab2e8bc39`. Its immutable source archive SHA-256 is `102b8f922521fbc922e7921ea09a05bc957a281b7d147d4371c6b9591a57dd65`; see the [release manifest](evidence/w04-question-bank-inventory-20261021/web-release-manifest.json).

The final browser-test revision is `a271e0c83d540ca2f1245b1b87be1df312e9e2b9`. Relative to documentation checkpoint `1ccb906`, the implementation and regression coverage change:

- `edutech_web/src/app/(teacher)/teacher/question-bank/page.tsx`
- `edutech_web/src/components/ui/teacher-question-bank-workspace.tsx`
- `edutech_web/src/app/globals.css`
- `edutech_web/tests/e2e/workflow/teacher-question-bank-compact-inventory.spec.ts`
- `edutech_web/tests/e2e/workflow/question-bank-deep.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-question-bank-shared-library-workspace.spec.ts`

No backend, schema, authorization, scoring, exam publication or native application code changed.

## Verification

The production Next.js image compiled successfully. TypeScript and targeted ESLint passed. The final zero-retry Chromium pack passed all four journeys:

1. bounded compact inventory, quick search, collapsed advanced controls, mobile first-screen access and New Question navigation;
2. question search plus comprehension authoring and import validation;
3. live shared-library entitlement/intake state and request-only teacher behavior;
4. dependent academic-filter hydration.

The first focused run exposed three useful failures: stacked mobile actions hid Search, an empty search result raced the detail assertion, and shared-library assertions assumed an enabled switch. The product layout and state-aware regressions were corrected before the final pass. The final Docker web container is healthy and identifies the exact build/archive above; the unchanged API remains on `581ed8f04565f080dfe3f82c966b8171ccdd5c87`.

See the [390px quick-find capture](evidence/w04-question-bank-inventory-20261021/teacher-question-bank-quick-find-390.png), [final page capture](evidence/w04-question-bank-inventory-20261021/teacher-question-bank-final.png) and [Playwright result](evidence/w04-question-bank-inventory-20261021/playwright-last-run.json).

## Remaining work

W04.02 remains In progress. The wallet order/ledger surface still needs bounded pagination. The question bank still needs empty, small and hundreds-of-record fixture measurements plus unfamiliar-teacher observation of finding and adding a question without coaching. Full keyboard, zoom, screen-reader and Firefox/WebKit certification remains part of W04.05. These limits mean this checkpoint improves the pilot path but does not approve market launch.
