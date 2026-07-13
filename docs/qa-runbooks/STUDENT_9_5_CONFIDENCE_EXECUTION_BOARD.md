# Student 9.5 Confidence Execution Board

Last updated: 2026-07-08

## Purpose

This board turns the remaining student-confidence gap into a concrete execution sequence.

Use it to answer:

1. why student confidence is already strong
2. what specifically is still keeping it below `9.5/10`
3. which browser lanes should be added next
4. what must be true before we can honestly claim student confidence at `9.5/10`

Related documents:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [FUNCTIONAL_END_TO_END_HARDENING_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_END_TO_END_HARDENING_PLAN.md)
- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)
- [FUNCTIONAL_P0_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_P0_EXECUTION_BOARD.md)

---

## Current Read

### Confidence posture

- current student confidence: `9 to 9.25/10`
- target student confidence: `9.5/10`

### Why the student lane is already strong

Current browser-backed proof is already strong in:

- seeded family runtime and submit continuity across `NEET`, `JEE`, `GRE`, and `AWS`
- pending-publication handoff from submit to results
- results, summary, review, compare, and timeline storytelling continuity
- scoped analytics continuity across compare, timeline, actions, subject deep dive, and result handoff routes
- weak-network runtime recovery for save, submit, and section-switch flows

### What still keeps the score below `9.5`

The remaining gaps are no longer about whether the student journey basically works.

The board items that previously kept the lane at `8.5 to 8.75/10` are now complete.

What still keeps the lane below `9.5/10` is narrower and more non-functional:

- broader repeated-run stability across the densest student mutable lanes beyond the first focused rerun pack
- wider device and viewport breadth beyond the first high-value compact results/review proof
- performance and scale realism under slower or more crowded runtime conditions
- a little more long-tail breadth around unusual result combinations, even though the core mixed-state and descriptive chains are now browser-proven

As of `2026-07-08`, the first focused student repeatability pack is also now green:

- grouped rerun with `--repeat-each=2`: `24 passed`
- covered lanes:
  - `student-analytics-drilldown.mutable.spec.ts`
  - `student-descriptive-analytics-continuity.mutable.spec.ts`
  - `student-descriptive-result-storytelling.mutable.spec.ts`
  - `student-family-weak-network.mutable.spec.ts`
  - `student-long-session-runtime.mutable.spec.ts`
  - `student-mixed-result-history.mutable.spec.ts`
  - `student-mobile-results-review-workflow.spec.ts`
  - `student-multi-attempt-history.mutable.spec.ts`
  - `student-results-storytelling.mutable.spec.ts`
- this materially reduces the earlier concern that the strongest student lanes were only single-pass green

---

## Status Legend

- `Open`: not started
- `In Progress`: currently being worked on
- `Ready for QA`: implementation complete, focused validation pending
- `Done`: verified and accepted
- `Blocked`: waiting on data, environment, or dependency repair

---

## Board Summary

| ID | Area | Title | Severity | Status | Owner |
| --- | --- | --- | --- | --- | --- |
| ST95-01 | Descriptive realism | Add student-first descriptive release and interpretation lane | Critical | Done | Codex |
| ST95-02 | Attempt history | Prove multi-attempt history ordering and compare continuity | High | Done | Codex |
| ST95-03 | Analytics realism | Prove analytics truth after manual review or revised scoring | Critical | Done | Codex |
| ST95-04 | Runtime realism | Add long-session attempt continuity and reopen resilience lane | High | Done | Codex |
| ST95-05 | Results history | Add dense mixed-state student result-history lane | High | Done | Codex |
| ST95-06 | Mobile depth | Add high-value mobile student result and review lane | Medium | Done | Codex |

---

## Recommended Run Order

1. `ST95-01` student-first descriptive release and interpretation
2. `ST95-03` analytics truth after manual review or revised scoring
3. `ST95-02` multi-attempt history ordering and compare continuity
4. `ST95-05` mixed-state result-history lane
5. `ST95-04` long-session attempt continuity and reopen resilience
6. `ST95-06` mobile student result and review depth

Reason for this order:

- start with the highest-signal gap that still feels inferred from institute-owned proof
- then close the student analytics realism hole attached to manual evaluation
- then deepen history realism so the student account behaves truthfully under denser real usage
- finish by widening runtime and device confidence

---

## Detailed Work Items

### ST95-01 Student-First Descriptive Release And Interpretation

Status: `Done`

Problem:

- descriptive release is browser-proven today, but mostly through institute-owned lanes
- the student side still lacks one dedicated high-signal spec that treats the learner as the primary observer

Primary user impact:

- we know manual review and publication work
- we do not yet have enough direct student proof that the learner can understand awarded marks, review notes, and released answer-review state without relying on operator-side evidence

Acceptance criteria:

- one seeded student-first spec proves:
  - descriptive attempt exists for the student
  - published result is visible
  - summary exposes truthful review state
  - review page exposes descriptive prompt, answer, and awarded score
  - any review notes or moderation context shown to the learner remain truthful
- the spec should begin from a student route, not from institute review setup

Suggested spec targets:

- `tests/e2e/workflow/student-descriptive-result-storytelling.mutable.spec.ts`
- optional helper reuse from:
  - `tests/e2e/workflow/institute-results-descriptive.mutable.spec.ts`
  - `tests/e2e/workflow/student-results-storytelling.mutable.spec.ts`

Signoff condition:

- student-side descriptive release truth is directly browser-proven in one continuous learner-first lane

Closure proof:

- `tests/e2e/workflow/student-descriptive-result-storytelling.mutable.spec.ts`
  - `1 passed`
  - the learner can now follow one disposable descriptive result from student results into summary, answer review, learner-visible scoring state, released descriptive prompt, submitted answer, and analytics handoff
  - this closes the biggest earlier gap where descriptive release truth was mostly inferred from institute-owned browser lanes instead of a dedicated student-first proof

---

### ST95-02 Multi-Attempt History Ordering And Compare Continuity

Status: `Done`

Problem:

- current attempt and results coverage proves continuity
- it does not yet strongly prove what happens when the same learner has repeated runs in the same family or same exam context

Primary user impact:

- students need truthful ordering, best-versus-latest intuition, and stable compare/timeline behavior when more than one result exists

Acceptance criteria:

- one seeded spec proves:
  - at least two attempts or result entries exist for the same learner in one exam family
  - attempts workspace ordering is stable and understandable
  - results workspace ordering is stable and understandable
  - analytics compare and timeline stay truthful when multiple entries exist
  - summary and review handoff continue to point at the intended attempt

Suggested spec targets:

- `tests/e2e/workflow/student-multi-attempt-history.mutable.spec.ts`
- optional reuse from:
  - `tests/e2e/workflow/student-attempts-workspace.spec.ts`
  - `tests/e2e/workflow/student-analytics-drilldown.mutable.spec.ts`

Signoff condition:

- repeated-attempt student history no longer feels lightly inferred from generic workspace coverage

Closure proof:

- `tests/e2e/workflow/student-multi-attempt-history.mutable.spec.ts`
  - `1 passed`
  - one learner-first disposable exam now proves three successive student attempts with deterministic `0%`, `100%`, and `50%` scoring, and confirms that attempts history, published results ordering, summary handoff, compare `latest / best / lowest`, and timeline ordering all stay truthful for the same exam context

---

### ST95-03 Analytics Truth After Manual Review Or Revised Scoring

Status: `Done`

Problem:

- analytics route continuity is strong
- analytics interpretation after manual review or score revision is not yet deeply student-proven

Primary user impact:

- a learner may see truthful routes but still not have enough evidence that weak areas, comparison, and timeline remain coherent after descriptive scoring changes

Acceptance criteria:

- one seeded spec proves:
  - released descriptive result contributes to student analytics
  - compare and timeline include the correct released result context
  - weak-area or action-center guidance remains coherent after manual evaluation
  - if the result has revised or moderated marks, analytics surfaces do not contradict the released result

Suggested spec targets:

- `tests/e2e/workflow/student-descriptive-analytics-continuity.mutable.spec.ts`
- optional reuse from:
  - `tests/e2e/workflow/student-analytics-deep.spec.ts`
  - `tests/e2e/workflow/student-summary-review-source-persistence.spec.ts`
  - `tests/e2e/workflow/institute-results-descriptive-multi-role.mutable.spec.ts`

Signoff condition:

- student analytics realism is browser-proven for a manual-evaluation result, not just for objective or immediately released lanes

Closure proof:

- `tests/e2e/workflow/student-descriptive-analytics-continuity.mutable.spec.ts`
  - `1 passed`
  - one learner-first disposable descriptive lane now proves that a manually reviewed descriptive answer remains truthful across student analytics landing, compare, question analytics detail, timeline, and the underlying student question-analytics contract
- backend scoring truth also tightened at the same time:
  - partial manual-review marks now contribute to attempt and result scoring even when an answer is not fully correct
  - focused backend regression passed:
    - `./.venv/bin/python manage.py test apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_teacher_can_review_essay_answer_and_generate_result --keepdb`

---

### ST95-04 Long-Session Attempt Continuity And Reopen Resilience

Status: `Done`

Problem:

- weak-network proof is now strong
- longer healthy-but-dense sessions are still under-proven

Primary user impact:

- real students often stay in-session longer, save multiple times, switch sections repeatedly, reopen tabs, and submit under more fatigue or timer pressure than the current short-path lanes simulate

Acceptance criteria:

- one mutable student spec proves:
  - repeated saves across more than one section or checkpoint
  - reopen or revisit continuity while still in progress
  - no misleading state after many writes
  - successful final submit and truthful summary handoff

Suggested spec targets:

- `tests/e2e/workflow/student-long-session-runtime.mutable.spec.ts`
- optional reuse from:
  - `tests/e2e/workflow/student-family-weak-network.mutable.spec.ts`
  - `tests/e2e/workflow/student-multi-subject-lifecycle.mutable.spec.ts`

Signoff condition:

- student confidence is no longer based mostly on short successful attempts plus offline recovery

Closure proof:

- `tests/e2e/workflow/student-long-session-runtime.mutable.spec.ts`
  - `1 passed`
  - one learner-first disposable runtime lane now proves repeated save checkpoints across three sections, in-progress reload continuity, exam revisit and resume continuity for the same active attempt, truthful save-state carry-forward after section movement, and final submit handoff into summary

---

### ST95-05 Dense Mixed-State Student Result History

Status: `Done`

Problem:

- we have good state-matrix reading coverage
- we do not yet have a stronger seeded lane where one learner actually navigates a denser mixed history intentionally

Primary user impact:

- a real student account can contain:
  - pending evaluation
  - published review-locked result
  - review-ready result
  - descriptive reviewed result
- that mixed history should remain easy to interpret

Acceptance criteria:

- one seeded spec proves a single student account can truthfully navigate:
  - pending state
  - summary-only published state
  - review-ready published state
  - descriptive reviewed state
- transitions between result cards, summary, review, and analytics must remain consistent

Suggested spec targets:

- `tests/e2e/workflow/student-mixed-result-history.mutable.spec.ts`
- optional reuse from:
  - `tests/e2e/workflow/student-result-state-matrix-workspace.spec.ts`
  - `tests/e2e/workflow/student-post-submit-workspace.spec.ts`
  - `tests/e2e/workflow/student-results-storytelling.mutable.spec.ts`

Signoff condition:

- student result history feels dense but understandable, not only correct in isolated state slices

Closure proof:

- `tests/e2e/workflow/student-mixed-result-history.mutable.spec.ts`
  - `1 passed`
  - one learner-first disposable lane now proves that the same student account can intentionally carry and navigate four dense result states at once:
    - pending unpublished result
    - published review-locked result
    - review-ready published objective result
    - descriptive reviewed published result
  - transitions remain truthful across student results, summary, review, and analytics instead of only being validated in separate isolated state slices

---

### ST95-06 Mobile Student Result And Review Depth

Status: `Done`

Problem:

- mobile student confidence is presently more sanity-level than dense-flow-level

Primary user impact:

- if the product is used on lower-tech or phone-first flows, the strongest result and review proof should not be desktop-only

Acceptance criteria:

- one mobile-oriented student spec proves:
  - open results on compact viewport
  - open summary
  - open review when available
  - hand off into analytics or back to results truthfully

Suggested spec targets:

- `tests/e2e/workflow/student-mobile-results-review-workflow.spec.ts`
- optional reuse from:
  - `tests/e2e/workflow/student-family-mobile-results-sanity.spec.ts`
  - `tests/e2e/workflow/student-results-storytelling.mutable.spec.ts`

Signoff condition:

- dense student result and review continuity has at least one real compact-viewport lane, not only shell or light-sanity proof

Closure proof:

- `tests/e2e/workflow/student-mobile-results-review-workflow.spec.ts`
  - `1 passed`
  - one seeded compact-viewport student lane now proves a review-ready result across mobile results, summary, answer review, analytics handoff, and truthful return to results using the real phone-sized navigation contract

---

## Exit Standard

We should consider the student lane ready for `9.5/10` confidence only when:

- the current completed browser lanes keep holding under repeated reruns without drift
- the strongest student flows have more than one meaningful compact-viewport or device-shape proof
- the remaining concern is mostly performance realism and scale posture, not uncertainty in student-visible correctness
- long-tail student result combinations remain understandable even when denser seeded catalogs evolve

At that point, the main remaining caution should be broad scale choice or performance realism, not uncertainty in the student experience model.
