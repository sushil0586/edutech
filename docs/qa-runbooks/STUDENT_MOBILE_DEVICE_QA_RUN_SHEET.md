# Student Mobile Device QA Run Sheet

## Objective

Use this sheet to record real-device validation for the `nexora_student_mobile` exam-first student lane.

Reference checklist:

- [STUDENT_MOBILE_QA_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_MOBILE_QA_CHECKLIST.md)
- [STUDENT_SEED_CONTRACT.md](/Users/ansh/Documents/Eductech/nexora_student_mobile/.maestro/STUDENT_SEED_CONTRACT.md)
- [STUDENT_MOBILE_WEAK_NETWORK_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_MOBILE_WEAK_NETWORK_RUNBOOK.md:1)

## Session Info

- Date:
- Tester:
- Backend environment:
- App commit or workspace snapshot:
- Device:
- OS version:
- Network condition:

## Coverage

- Auth:
  - Pass / Fail
  - Notes:
- Dashboard:
  - Pass / Fail
  - Notes:
- Exams lane:
  - Pass / Fail
  - Notes:
- Attempts lane:
  - Pass / Fail
  - Notes:
- Results lane:
  - Pass / Fail
  - Notes:
- Exam detail:
  - Pass / Fail
  - Notes:
- Live attempt runtime:
  - Pass / Fail
  - Notes:
- Summary:
  - Pass / Fail
  - Notes:
- Review:
  - Pass / Fail
  - Notes:
- Analytics:
  - Pass / Fail
  - Notes:
- Profile / logout:
  - Pass / Fail
  - Notes:

## Maestro Flow Matrix

Use this matrix when running native automation on real devices or simulators.

### Flow Inventory

| Flow | Command | Seed account | Android | iPhone | Notes |
| --- | --- | --- | --- | --- | --- |
| Exams discovery | `npm run maestro:student:exams` | `student_exam_ready` | Pass / Fail | Pass / Fail | Validates login, exams lane, filters, search, and exam-detail handoff |
| Results and summary | `npm run maestro:student:results` | `student_result_ready` | Pass / Fail | Pass / Fail | Validates results lane, summary handoff, dashboard return, and attempts-to-results continuity |
| Review journey | `npm run maestro:student:review` | `student_review_ready` | Pass / Fail | Pass / Fail | Requires a result with `review_available = true` |
| Active attempt runtime | `npm run maestro:student:attempt` | `student_active_attempt` | Pass / Fail | Pass / Fail | Safe flow only; opens submit confirmation and exits without submitting |
| Analytics and logout | `npm run maestro:student:analytics` | `student_result_ready` | Pass / Fail | Pass / Fail | Validates analytics lane, results handoff, profile visibility, and secure logout back to the role gate |
| Offline login error | `npm run maestro:student:offline-login` | `student_exam_ready` | Pass / Fail | Pass / Fail | Warm app only in Expo dev mode; validates friendly offline auth failure copy without leaving the login path |
| Offline register setup | `npm run maestro:student:offline-register` | `student_exam_ready` | Pass / Fail | Pass / Fail | Warm app only in Expo dev mode; validates friendly offline registration-setup copy and visible retry guidance |

### Maestro Session Notes

- Expo build / app binary used:
- Maestro CLI version:
- Android simulator or device:
- iPhone simulator or device:
- Flows skipped because of missing seed state:
- Failures that were setup gaps rather than product bugs:

## Device Passes

### Small Android

- Status:
- Key issues:
- Screens with overflow or cramped actions:
- Attempt runtime comfort:

### Average Android

- Status:
- Key issues:
- Screens with overflow or cramped actions:
- Attempt runtime comfort:

### iPhone-size Screen

- Status:
- Key issues:
- Screens with overflow or cramped actions:
- Attempt runtime comfort:

## Weak-Network Pass

- Status:
- Login behavior:
- Session restore behavior:
- Session restore classification:
  - acceptable Expo dev-build limitation / understandable restore failure / product bug
- Exams / attempts / results loading behavior:
- Retry behavior:
- Dead-end states observed:

### Weak-Network Maestro Notes

- Did login/exams flow still pass:
- Did active-attempt flow still pass:
- Screens with confusing loading or retry behavior:
- Any flow that should stay manual-only under weak network:
- Was session restore evaluated manually because of Expo dev-build offline cold-boot limits:

## Long-Attempt Pass

- Status:
- Timer readability:
- Previous / next navigation comfort:
- Save-answer reliability:
- Unsaved-draft protection behavior:
- Submit flow behavior:
- Fatigue or friction notes:

### Long-Attempt Runtime Notes

- Account used:
- Did runtime navigation stay comfortable after repeated question changes:
- Did unsaved-draft protection appear reliably:
- Was submit confirmation calm and understandable:
- Any runtime state that still needs manual-only validation:

## Findings

### Blockers

1.
2.
3.

### High-Priority Polish

1.
2.
3.

### Nice-To-Have Improvements

1.
2.
3.

## Signoff

- Ready for student beta:
- If not ready, top reasons:
