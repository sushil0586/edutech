# W09 objective-exam pilot release matrix

Candidate application SHA: `8b5f6329c9e1`. Scope: assisted institute web pilot, objective exams, institute-wide teacher collaboration, student-only native apps outside this web-pilot gate, and zero-price assisted commercial setup.

| Area | Included journey or risk | Current evidence | Status | Final owner/action |
|---|---|---|---|---|
| Platform | Create/activate institute, scoped administrators, suspension policy | W02 tenant lifecycle and W07 onboarding evidence | Passed locally | QA repeats smoke on promoted stage digest |
| Institute | Roster, teacher assignment, exam oversight, results | W02/W04 evidence and W09 Chromium/Firefox/WebKit dashboard journeys | Passed locally | Institute pilot owner performs UAT |
| Teacher | Find/add objective questions, create/assign/publish exam, review results | W03–W05 evidence and W09 teacher detail journeys | Passed locally; unfamiliar-user task pending | Academic lead and UAT facilitator |
| Student | Signup/profile, discover/start/save/reload/submit/result | W03/W04/W07 evidence; W09 100-user run and restart reconciliation | Passed locally; pilot-duration and human task pending | QA runs duration test; facilitator runs UAT |
| Assessment correctness | Acknowledged saves, duplicate submit, score/result uniqueness | 1,800/1,800 load checks; 100 attempts/1,000 answers/100 results; zero mismatches | Passed locally | Repeat at 60 target and 100 headroom on stage |
| Capacity | Start/save/submit p95 and error rate | Local p95 1.04/1.05/1.13s, 0% errors | Provisional only | Release engineer measures public TLS stage and cost |
| Recovery | Restart, backup/restore, scheduled expiry | Restart reconciliation, 22 recovery tests, isolated restore | Passed locally; max-duration stage run pending | QA and release engineer |
| Incident response | Health failure reaches owner | Local receiver delivered critical event | Configuration pending | Operations sets real webhook and named roster, acknowledges test alert |
| Privacy/access | Tenant boundaries, role checks, sensitive activation metadata | W02 access evidence and W07 allowlist tests | Passed locally | Security QA repeats stage smoke |
| Accessibility | Keyboard, axe high-impact, 320px reflow, visible focus, live regions | W09 accessibility pack: 8 passed, 1 active-attempt fixture skipped | Passed for executed fixtures | QA supplies active attempt on stage and reruns skipped case |
| Browser | Core admin/institute/teacher/student workflows | Chromium 4/4; WebKit 4/4; Firefox 3/4 then unchanged rerun 1/1 | Passed with retained intermittent | Watch institute navigation on stage |
| Customer support | Policies, support request lifecycle, activation dashboard | W07.03/W07.05 evidence | Passed locally | Support owner performs stage workflow |
| Human usability | Teacher find/add, wallet history, signup/first action | W07 observation runbook | Unverified | Recruit unfamiliar participants; automation cannot close |
| Android/iOS | Student-only apps | W08 workstream | Excluded from assisted web pilot | Required before native beta/release |
| Paid commerce | Automated checkout/refunds | W06 zero-price assisted contract | Deferred/excluded | Required before paid self-service launch |
| Descriptive grading | Manual/descriptive assessment | Pilot decision is objective exams only | Deferred/excluded | Separate certification before offer expansion |

No row is green solely because code or a test file exists. Local, stage, human and excluded claims remain separate. W10 pilot approval requires the stage and unfamiliar-user rows to close against the promoted digest.
