# Exam Family Observations And Bug Tracker

## Purpose

This tracker turns the current family hardening review into one actionable list.

It separates:

- confirmed bugs or inconsistencies
- release blockers
- hardening tasks
- lower-priority polish items

Current scope:

- School
- NEET
- JEE
- GRE
- AWS certification

References:

- [EXAM_FAMILY_LAUNCH_READINESS_NOTE.md](/Users/ansh/Documents/Eductech/EXAM_FAMILY_LAUNCH_READINESS_NOTE.md:1)
- [EXAM_FAMILY_PHASE_0_1_CHECKLIST.md](/Users/ansh/Documents/Eductech/EXAM_FAMILY_PHASE_0_1_CHECKLIST.md:1)
- [SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md:1)
- [NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md:1)

## Section A. Confirmed Bugs And Inconsistencies

### A1. AWS review behavior is documented inconsistently

- Severity: `High`
- Type: `documentation and release-contract bug`
- Status: `Closed`

Original observation:

- the release validation bundle said AWS review unlocks immediately after submit in institute, teacher, and admin release flows
- the launch-readiness note correctly said summary and result availability are proven, while review availability is surfaced truthfully when review is not available

Evidence:

- [NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md:589)
- [NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md:622)
- [NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md:652)
- [EXAM_FAMILY_LAUNCH_READINESS_NOTE.md](/Users/ansh/Documents/Eductech/EXAM_FAMILY_LAUNCH_READINESS_NOTE.md:116)

Resolution:

- the release validation bundle wording now matches the validated AWS seeded behavior
- the bundle now states immediate summary and result availability, with truthful review-availability messaging

Impact if unresolved:

- QA can assert the wrong outcome
- release notes can overclaim product behavior
- family signoff can drift from actual runtime truth

Follow-up:

1. keep Playwright wording aligned with the release bundle when AWS review policy changes again

### A2. Signoff checklist still contains stale next-sprint language

- Severity: `Medium`
- Type: `planning inconsistency`
- Status: `Closed`

Original observation:

- the School, NEET, JEE signoff checklist said to build one dedicated NEET seeded mock and automate it end to end
- that work was already completed and documented elsewhere

Evidence:

- [SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md:155)

Resolution:

- the signoff checklist now points to the actual next NEET hardening task: device, weak-network, and runtime-comfort validation on the seeded mock

Impact if unresolved:

- creates confusion about what is actually pending
- lowers trust in the signoff tracker
- can lead to duplicate execution or stale sprint planning

Follow-up:

1. keep signoff checklists focused on pending validation only

## Section B. Release Blockers

These are not always code defects, but they still block strong production claims.

### B1. Mobile and real-device validation is still incomplete

- Severity: `High`
- Status: `Open`

Observation:

- shared family confidence is still only moderate for mobile and real-device readiness
- School signoff still has pending Android, iPhone, weak-network, long-attempt, and visual-polish checks

Evidence:

- [EXAM_FAMILY_LAUNCH_READINESS_NOTE.md](/Users/ansh/Documents/Eductech/EXAM_FAMILY_LAUNCH_READINESS_NOTE.md:26)
- [SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md:50)

Impact:

- production issues can still surface on small screens
- attempt comfort and result clarity are not fully proven on real devices
- current readiness should stay at pilot-ready rather than broader-launch-ready

Required next step:

1. run Android and iPhone validation for login, exams, attempt, summary, and results
2. capture concrete defects from that pass instead of leaving this as a generic concern
3. execute [SCHOOL_NEET_JEE_DEVICE_AND_WEAK_NETWORK_SIGNOFF_RUNBOOK.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_DEVICE_AND_WEAK_NETWORK_SIGNOFF_RUNBOOK.md:1) as the source-of-truth run sheet

### B2. Empty, loading, and error-state truthfulness is still not fully signed off

- Severity: `High`
- Status: `Open`

Observation:

- School signoff still lists truthfulness review for empty/loading/error states as pending
- a mobile-sized automated baseline now proves truthful fallback panels for unavailable exam-detail, summary, and review routes, but this is still narrower than full live weak-network validation

Evidence:

- [SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md:45)
- [SCHOOL_NEET_JEE_DEVICE_AND_WEAK_NETWORK_SIGNOFF_RUNBOOK.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_DEVICE_AND_WEAK_NETWORK_SIGNOFF_RUNBOOK.md:1)

Impact:

- learners can still see misleading state messaging
- support burden rises when failures are phrased as success, emptiness, or silent loading

Required next step:

1. audit utility and student-facing surfaces for truthful empty/loading/error behavior
2. fix any misleading copy before stronger production claims

### B3. Weak-network and long-attempt behavior is not fully proven

- Severity: `High`
- Status: `Open`

Observation:

- weak-network and long-attempt validation are still listed as pending signoff work
- launch-readiness for all families still calls this out as a broader-confidence gap

Evidence:

- [EXAM_FAMILY_LAUNCH_READINESS_NOTE.md](/Users/ansh/Documents/Eductech/EXAM_FAMILY_LAUNCH_READINESS_NOTE.md:132)
- [SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md:52)

Impact:

- save-state trust can break under real usage
- submit, results, and review behavior may feel unreliable even if backend correctness is fine

Required next step:

1. run weak-network validation for login, active attempt, summary, and results
2. run long-attempt comfort validation on small-screen devices
3. record findings in [SCHOOL_NEET_JEE_DEVICE_AND_WEAK_NETWORK_SIGNOFF_RUNBOOK.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_DEVICE_AND_WEAK_NETWORK_SIGNOFF_RUNBOOK.md:1)

## Section C. Family-Specific Hardening Tasks

### C1. NEET still needs intentional result and runtime comfort validation

- Severity: `Medium`
- Status: `Open`

Observation:

- leaderboard and result posture for NEET still need intentional validation
- long-attempt comfort and section switching/progress cues still need manual validation

Evidence:

- [SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md:85)

Recommended next step:

1. run the seeded NEET full mock on small screens
2. validate section switching, progress clarity, and result/leaderboard posture intentionally

### C2. JEE still needs broader pattern confidence

- Severity: `Medium`
- Status: `Open`

Observation:

- JEE numeric-entry support is only partially proven in runtime
- additional JEE pattern variants may still be required
- broader create-to-publish JEE scenarios may still need coverage
- the seeded JEE review route can still land in a truthful `review unavailable` state, so result metadata and final review-route behavior should not be treated as identical without explicit verification

Evidence:

- [EXAM_FAMILY_PHASE_0_1_CHECKLIST.md](/Users/ansh/Documents/Eductech/EXAM_FAMILY_PHASE_0_1_CHECKLIST.md:51)
- [SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md](/Users/ansh/Documents/Eductech/SCHOOL_NEET_JEE_SIGNOFF_AND_HARDENING_CHECKLIST.md:131)

Recommended next step:

1. confirm whether the current seeded JEE pattern matches customer expectations
2. add another JEE variant only if a real requirement remains uncovered

### C3. GRE reporting maturity is still limited

- Severity: `Medium`
- Status: `Open`

Observation:

- GRE score storytelling is still thin
- sectional reporting depth remains partial
- admission-style reporting polish is still pending

Evidence:

- [EXAM_FAMILY_LAUNCH_READINESS_NOTE.md](/Users/ansh/Documents/Eductech/EXAM_FAMILY_LAUNCH_READINESS_NOTE.md:100)
- [EXAM_FAMILY_PHASE_0_1_CHECKLIST.md](/Users/ansh/Documents/Eductech/EXAM_FAMILY_PHASE_0_1_CHECKLIST.md:68)

Recommended next step:

1. define the exact GRE reporting contract for this phase
2. ensure UI language does not imply deeper sectional or scaled-score maturity than we actually support

### C4. AWS domain breadth and analytics still need depth

- Severity: `Medium`
- Status: `Open`

Observation:

- certification-domain analytics and recommendation framing are still shallow
- broader content variation across certification domains is not yet strongly evidenced

Evidence:

- [EXAM_FAMILY_LAUNCH_READINESS_NOTE.md](/Users/ansh/Documents/Eductech/EXAM_FAMILY_LAUNCH_READINESS_NOTE.md:125)
- [EXAM_FAMILY_PHASE_0_1_CHECKLIST.md](/Users/ansh/Documents/Eductech/EXAM_FAMILY_PHASE_0_1_CHECKLIST.md:85)

Recommended next step:

1. keep AWS claims scoped to the current practitioner-style validated lane
2. expand only when additional domain coverage is intentionally seeded and tested

## Section D. Lower-Priority Polish And Operational Notes

### D1. Family-specific analytics maturity is still only moderate

- Severity: `Low`
- Status: `Open`

Observation:

- all four families are still only moderate in analytics maturity

Evidence:

- [EXAM_FAMILY_LAUNCH_READINESS_NOTE.md](/Users/ansh/Documents/Eductech/EXAM_FAMILY_LAUNCH_READINESS_NOTE.md:32)

Impact:

- product is usable, but insight surfaces may still feel school-first or generic

### D2. AWS e2e still has operational flake risk under parallel execution

- Severity: `Low`
- Status: `Open`

Observation:

- AWS immediate-release e2e can hit timeout noise during builder startup when run in parallel

Evidence:

- [NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/NEET_JEE_GRE_AWS_PHASE_0_1_IMPLEMENTATION_TICKETS.md:683)

Impact:

- can waste QA time
- can create false regression alarms

Recommended next step:

1. keep AWS release validation sequential in CI and local signoff until startup stability is stronger

## Section E. Overall Read

### Strong now

- family-aware authoring and release flows
- backend release and result safety nets
- dedicated seeded cross-role lanes for NEET, JEE, GRE, and AWS

### Not strong enough yet for broader-launch claims

- device-level comfort
- weak-network and long-attempt proof
- deep family-specific reporting and analytics maturity
- a few remaining doc and signoff consistency issues

## Section F. Recommended Next Execution Order

1. Fix the AWS review-documentation inconsistency
2. Clean stale planning language from the School/NEET/JEE signoff checklist
3. Run device and weak-network signoff on School
4. Run the same hardening pass on the seeded NEET and JEE lanes
5. Tighten GRE and AWS reporting-language boundaries before broader rollout claims
