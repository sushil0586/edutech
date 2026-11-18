# W04.01 role navigation closure — 2026-10-21

## Result

W04.01 is complete for the pilot. Each included web role has a direct route to its primary tasks, active navigation matches the current destination, and compact mobile menus retain the operational routes needed for the pilot.

## Role-to-task map

| Role | First-use priorities | Repeat-use priorities | Primary navigation |
|---|---|---|---|
| Platform admin | Institute readiness, people setup, exam oversight | Reports, security and economy operations | Dashboard, Exams, Institutes, Economy, Security, Reports, People, Academic Setup, Settings |
| Institute admin | People/roster, academic setup, exam readiness | Question bank, results, reviews, reports and assignments | Dashboard, Exams, Results, Reviews, Question Bank, People, Academic Setup, Teacher Assignments, Reports, Economy, Security, Settings |
| Teacher | Find or create a question, create the objective exam | Results, reports and review queue | Dashboard, Exams, Question Bank, Results, Reports, Reviews |
| Student | Continue or start the next eligible test | Attempts, results, practice, weak areas and account utilities | Dashboard, Tests, Results, Practice, Attempts, Analytics, Reports, Weak Areas, Alerts, Wallet, Subscriptions, Profile, Settings |
| Parent | Confirm linked children and progress visibility | Alerts and settings | Dashboard, Children, Progress, Alerts, Settings |

The student dashboard prioritizes the truthful next action before diagnostics. Teacher question search and New Question are directly reachable, while exam creation uses the shortened guided path. Institute top actions expose People, Academic Setup and Exams. Parent navigation remains intentionally small.

## Docker verification

- **15 passed, 0 failed** across Chromium, Firefox and WebKit for the five role shells.
- **3 passed, 0 failed** for 390×844 platform, institute and teacher mobile navigation.
- Targeted ESLint, TypeScript and diff validation passed.

The cross-browser suite follows actual navigation links into each task and verifies destination headings and active states. The mobile suite opens the compact menu, follows dense operational routes, applies filters, enters question creation, opens results/reviews and verifies recovery from filtered empty states.

One stale mobile assertion expected readiness content to remain expanded. The current responsive design intentionally places result operations inside a task disclosure. The test now opens that disclosure before checking readiness, matching the real mobile interaction. Product behavior did not change.

## Evidence

- [Verification summary](evidence/w04-role-navigation-20261021/verification-summary.json)
- [Platform admin mobile navigation](evidence/w04-role-navigation-20261021/platform-admin-mobile.png)
- [Institute mobile navigation](evidence/w04-role-navigation-20261021/institute-mobile.png)
- [Teacher mobile navigation and filtered recovery](evidence/w04-role-navigation-20261021/teacher-mobile.png)
- [Task-priority verification](67-w04-task-priority-verification-20261021.md)
- [Question and wallet closure](78-w04-question-wallet-closure-20261021.md)
- [Accessible responsive pilot certification](77-w04-accessible-responsive-pilot-certification-20261021.md)

## Scope boundary

This closes the web navigation and task-priority gate for the objective-exam pilot. Android/iOS remains student-only under W08. Full-surface manual assistive-technology and physical-device certification remains broader-release work under W04.05.
