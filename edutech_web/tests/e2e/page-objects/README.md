# Playwright Page Objects

## Purpose

This folder is the institute-first move toward cleaner end-user Playwright coverage.

Use page objects for:

- repeated route entry
- repeated filter actions
- repeated navigation actions
- repeated state assertions

Do not move every assertion into page objects.

Keep this split:

- page objects: reusable actions and stable state helpers
- specs: user journeys, intent, assertions that explain business behavior
