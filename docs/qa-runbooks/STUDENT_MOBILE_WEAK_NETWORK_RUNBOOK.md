# Student Mobile Weak-Network Runbook

## Purpose

Use this runbook to validate `nexora_student_mobile` under:

1. slow network
2. high latency
3. full offline drop
4. forced request timeout

This runbook is written for the Android emulator because that path is currently available in local validation.

## Prerequisites

1. Android emulator is booted
2. mobile app is already built and launchable
3. backend is reachable in normal mode
4. `.env` is configured for the emulator base URL:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
EXPO_PUBLIC_API_REQUEST_TIMEOUT_MS=20000
```

## Normal-Network Reset

Before every pass, restore the emulator to its normal network state:

```bash
adb shell svc wifi enable
adb shell svc data enable
adb emu network speed full
adb emu network delay none
```

## Slow-Network Pass

Use this when validating that loading states remain understandable without forcing a full failure:

```bash
adb emu network speed edge
adb emu network delay gprs
```

Recommended checks:

- login still progresses without confusing dead ends
- results and analytics show meaningful loading copy
- retry buttons remain visible on error states
- tab changes do not leave blank screens behind

## Offline-Drop Pass

Use this when validating fully disconnected behavior:

```bash
adb shell svc wifi disable
adb shell svc data disable
```

Recommended checks:

- login shows understandable failure copy
- results lane shows retryable error state
- analytics lane shows retryable error state
- session restore failure returns to a controlled auth path

When done, re-enable connectivity:

```bash
adb shell svc wifi enable
adb shell svc data enable
```

Important note:

- on the current Expo Android dev build, a fully offline cold app launch can fail before the student UI appears because the JS bundle still depends on Metro
- treat that as a local dev harness limitation, not a product bug
- for offline login validation, first open the app online until the login screen is visible, then disable network and run the offline login flow
- treat session restore under full offline cold boot as manual-only for now unless we move to a release-style build or a bundled CI artifact

## Session-Restore Manual Pass

Use this pass to validate restore behavior without overclaiming automation support in Expo dev mode.

Recommended order:

1. Launch the app online and log in successfully
2. Fully close the app after the session is persisted
3. Disable network:

```bash
adb shell svc wifi disable
adb shell svc data disable
```

4. Reopen the app
5. Observe whether the role gate / restore path:
   - stays understandable
   - avoids loops or blank dead ends
   - returns the student to a controlled auth state if restore cannot complete

Record the result as one of:

- acceptable Expo dev-build limitation
- understandable restore failure
- confusing restore failure that needs product work

## Forced-Timeout Pass

Use this when you want timeout handling to appear quickly instead of waiting for the default 20-second timeout.

Set this in `nexora_student_mobile/.env` before launching the app:

```bash
EXPO_PUBLIC_API_REQUEST_TIMEOUT_MS=3000
```

Then use either:

```bash
adb emu network speed edge
adb emu network delay gprs
```

or full offline mode:

```bash
adb shell svc wifi disable
adb shell svc data disable
```

Recommended checks:

- login shows the friendly connection message
- registration option loading exposes retry instead of dead-ending
- role-gate restore failure stays understandable
- exams, results, and analytics error panels expose `Retry`

## Suggested Manual Order

1. Normal-network smoke on login, results, analytics
2. Slow-network pass on login and analytics
3. Offline-drop pass on results and analytics
4. Forced-timeout pass on login and registration setup

## Suggested Automation Order

Use normal network for baseline:

```bash
npm run maestro:student:results
npm run maestro:student:analytics
```

Then repeat those same flows under slow network to classify failures as:

- acceptable network flake
- setup gap
- product bug

## Notes

- The current local iPhone simulator pass is still blocked by the Xcode toolchain version gap.
- The timeout override is meant for QA only. Keep the default `20000` for normal local development unless you are intentionally testing failure states.
- Session-restore-under-offline-cold-boot should not be used as a product regression signal in Expo dev mode unless the app has already proven it can boot without Metro on that build artifact.
