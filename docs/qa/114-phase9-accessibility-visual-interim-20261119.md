# Phase 9 Accessibility and Visual Interim Result

Date: 2026-11-19  
Candidate HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f` plus the preserved dirty working tree  
Environment: task-owned PostgreSQL, local Django backend, production-built Next.js standalone server  
Verdict: **IN PROGRESS - NOT CERTIFIED**

## Executed evidence

- Final AXE route audit: 6/6 role groups passed in Chromium across 58 primary routes, with zero serious or critical violations.
- Keyboard-only workflow pack: 15/15 passed across Chromium, Firefox and WebKit.
- Styled desktop visual inventory: 6/6 role groups captured in Chromium across 58 routes.
- 320px visual inventory: 6/6 role groups captured in Chromium; representative admin, student and parent screens received human screenshot review.
- Final parent 320px regression: 1/1 role inventory passed after the shared state-panel containment repair.
- Production builds passed after each source correction; final ESLint and TypeScript checks passed.

## Defects found and repaired

1. **Serious WCAG contrast failure** on the student dashboard weak-topic percentage (`3.4:1`). The value now uses the existing secondary-text token.
2. **Critical unnamed control** on teacher question-bank selection checkboxes. Each checkbox now has a question-specific accessible name.
3. **320px clipping** in the shared empty-state panel. Long status text and footnotes now shrink and wrap; mobile padding is bounded.
4. **Invalid test-environment rendering**: the initial standalone server omitted `.next/static`, producing unstyled screenshots. Those artifacts are retained but excluded. The standalone candidate was reassembled with static/public assets before valid visual and AXE evidence was collected.

## Retained non-passing attempts

- Initial AXE harness failed because `import.meta` was incompatible with the test module mode; the harness path resolution was corrected without weakening assertions.
- Initial styled-candidate AXE found the unnamed teacher checkbox and failed as expected.
- A broad admin validation run was stopped after three failures and one 180-second timeout. It mixed non-Phase-9 fixture assumptions with accessibility work and did not provide valid promotion evidence; its output is retained.
- Initial desktop/mobile screenshot inventories were unstyled due to incomplete standalone assembly and are not counted as visual evidence.

## Frozen-ID disposition

`EDU-A11Y-001`..`006` remain **NOT RUN** in the authoritative register because the phase acceptance contract is atomic and these mandatory areas remain incomplete:

- dialog/drawer focus trap, Escape/close behavior and return focus;
- validation error association and focus movement in submitted error states;
- loading, empty, error, success and live-region interaction states;
- keyboard operation of horizontally contained dense tables;
- fully styled Firefox and WebKit visual inventories, plus tablet coverage.

No unresolved P0/P1 product defect was left from the evidence executed here. This report does not authorize Phase 10.

## Evidence

Evidence is retained under `docs/qa/evidence/phase9-accessibility-visual-20261119/`. Generated route screenshots remain under `edutech_web/artifacts/visual-pass*`.
