# Phase 9 Accessibility and Visual Execution Package

Date: 2026-11-19
Status: AUTHORIZED / PRE-EXECUTION
Candidate HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`

## Frozen scenarios

| ID | Contract |
|---|---|
| EDU-A11Y-001 | Keyboard navigation and visible focus across role workspaces |
| EDU-A11Y-002 | Dialog/drawer focus, close and return-focus behavior |
| EDU-A11Y-003 | Form labels, validation and error association |
| EDU-A11Y-004 | Dense tables, controls and horizontal containment |
| EDU-A11Y-005 | Loading, empty, error, success and live-region semantics |
| EDU-A11Y-006 | 320px reflow and cross-browser visual integrity |

## Execution boundary

- Isolated PostgreSQL container: `edutech-phase9-postgres-20261119`
- Database: `phase9_a11y_visual_cert`; role: `phase9_a11y_visual`
- Backend: `127.0.0.1:39942`; production frontend: `127.0.0.1:39940`
- Primary route manifest: anonymous/auth, admin, institute, teacher, student and parent stable routes
- Desktop engines: Chromium, Firefox and WebKit
- Responsive views: tablet, mobile device projects and explicit 320px viewport
- AXE gate: no serious/critical violations; all results retained
- Visual policy: capture current screenshots for review; never update baselines silently
- External providers: disabled; in-memory email only

## Stop gates

Stop on serious/critical AXE violations, inaccessible mandatory actions, focus loss/trap, incoherent overlap, off-canvas required controls, tenant leakage, unexpected mutation or ambiguous runtime identity.
