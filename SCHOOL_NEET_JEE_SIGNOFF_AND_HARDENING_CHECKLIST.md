# School, NEET, and JEE Signoff And Hardening Checklist

## Purpose

This checklist converts the current confidence summary into execution order and signoff criteria for:

- School
- NEET
- JEE

Use it to decide:

- what can be signed off now
- what needs one more focused validation pass
- what still needs product decisions before stronger release confidence

References:

- [SCHOOL_NEET_JEE_ROLE_CONFIDENCE_SUMMARY.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_ROLE_CONFIDENCE_SUMMARY.md:1)
- [ROLE_MODULE_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ROLE_MODULE_COVERAGE_MAP.md:1)
- [NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md:1)
- [EXAM_CREATION_SCENARIO_CATALOG.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/EXAM_CREATION_SCENARIO_CATALOG.md:1)
- [SCHOOL_NEET_JEE_DEVICE_AND_WEAK_NETWORK_SIGNOFF_RUNBOOK.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_DEVICE_AND_WEAK_NETWORK_SIGNOFF_RUNBOOK.md:1)

## Launch Order Recommendation

1. School
2. NEET
3. JEE

## Family Status Snapshot

| Family | Current status | Release read |
| --- | --- | --- |
| School | strongest lane across all roles | signoff candidate after final hardening pass |
| NEET | seeded and cross-role verified | controlled signoff candidate after final device/network and reporting pass |
| JEE | seeded and cross-role verified | controlled signoff candidate after one more focused hardening pass |

## Section A. School Signoff Checklist

### Product readiness

- `Done` cross-role web workflows exist for admin, institute, teacher, and student
- `Done` mutable exam creation, publication, learner attempt, and result visibility flows exist
- `Done` student post-submit and results routes are already broadly covered
- `Pending` final truthfulness review for empty/loading/error states on utility surfaces
- `Pending` final mobile comfort pass on smaller screens

### QA and hardening

- `Pending` real-device Android validation of student login, exams, attempt, summary, and results
- `Pending` real-device iPhone validation of student login, exams, attempt, summary, and results
- `Pending` weak-network validation for login, active attempt, and results loading
- `Pending` long-attempt comfort validation on small screens
- `Pending` final visual polish sweep from device findings

### Signoff gate

School can be called signoff-ready when:

- student web and mobile-web attempt flow feels stable on small screens
- weak-network behavior does not create misleading student states
- no major truthfulness issues remain in empty/loading/error states

## Section B. NEET Hardening Checklist

### Product readiness already present

- `Done` family-aware guided create defaults
- `Done` family-aware advanced builder defaults and guidance
- `Done` multi-subject exam support with subject at section level
- `Done` dedicated NEET seed command and backend verification
- `Done` dedicated seeded NEET full-mock lane:
  - `DMO-NEET-FULL-01`
  - `DMO-NEET-RESULT-01`
  - `demo-neet-student`
- `Done` seeded NEET cross-role coverage:
  - student contract
  - student real lifecycle
  - teacher oversight
  - institute oversight
  - admin oversight

### Still needed

- `Pending` validate leaderboard and result posture intentionally for the NEET lane
- `Pending` validate student long-attempt comfort for serious mock usage
- `Pending` validate section switching and progress cues under a full mock attempt

### Recommended implementation tasks

1. Run manual small-screen QA using the seeded NEET full mock
2. Run weak-network QA using the seeded NEET full mock
3. Validate leaderboard/result posture more intentionally for NEET launch expectations
4. Decide whether Biology remains one block or later splits into Botany/Zoology for realism

### Signoff gate

NEET can move from `moderate-high` to `high` confidence when:

- a dedicated NEET seeded paper is verified end to end
- student runtime comfort is manually validated
- result and review behavior is confirmed intentionally for NEET, not only inferred from generic exam coverage

## Section C. JEE Hardening Checklist

### Product readiness already present

- `Done` family-aware guided create defaults
- `Done` family-aware advanced builder defaults and guidance
- `Done` multi-subject exam support removes the old one-subject realism blocker
- `Done` generic cross-role timed-exam workflows already exist
- `Done` dedicated JEE seed command and backend verification
- `Done` dedicated seeded JEE full-mock lane:
  - `DMO-JEE-FULL-01`
  - `DMO-JEE-RESULT-01`
  - `demo-jee-student`
- `Done` seeded JEE cross-role coverage:
  - student contract
  - student real lifecycle
  - teacher oversight
  - institute oversight
  - admin oversight
- `Done` seeded JEE posture includes:
  - Physics/Chemistry/Mathematics
  - objective and numeric sections per subject
  - hybrid runtime
  - fullscreen security checkpoint

### Still needed

- `Pending` validate leaderboard and result posture more intentionally for the JEE lane
- `Pending` validate whether additional JEE pattern variants are required beyond the current seeded contract
- `Pending` expand from seeded runtime proof into broader create-to-publish JEE family scenarios if launch scope needs it
- `Pending` run the same manual device/network hardening pass used for School and NEET on the JEE seeded mock

### Recommended implementation tasks

1. Run manual small-screen QA using the seeded JEE full mock
2. Run weak-network QA using the seeded JEE full mock
3. Validate leaderboard/result posture more intentionally for JEE launch expectations
4. Decide whether one seeded JEE lane is sufficient or whether additional JEE pattern variants are required

### Signoff gate

JEE can move from `moderate-high` to `high` confidence when:

- the seeded JEE lane is manually validated on device and weak network
- result and leaderboard posture is confirmed intentionally for JEE
- no extra JEE pattern variants are still implicitly expected but unverified

## Section D. Best Next Sprint

### If the goal is highest confidence gain per effort

1. Finish School device and weak-network signoff
2. Run the focused device, weak-network, and runtime-comfort pass on the seeded NEET mock
3. Run the same hardening pass on the seeded JEE mock
4. Decide whether more JEE variants are actually needed for launch scope

## Section E. Practical Signoff Decision

### Safe to sign off soon

- School:
  - yes, after final hardening pass
- NEET:
  - yes for controlled rollout after one focused NEET validation pass
- JEE:
  - yes for controlled rollout if the current seeded JEE contract matches customer expectations

### Not yet safe to oversell

- JEE:
  - do not describe as School-level mature until broader JEE hardening and manual QA are completed

## Bottom Line

- School is the closest to complete signoff
- NEET is ready for one focused hardening pass
- JEE is now in the same practical bucket as NEET: real, seeded, automated, and ready for targeted hardening rather than first-time implementation
