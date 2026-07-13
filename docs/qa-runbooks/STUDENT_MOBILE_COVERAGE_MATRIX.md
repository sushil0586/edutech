# Student Mobile Coverage Matrix

Status snapshot for the student mobile surface after the latest Playwright runs.

## Passed

- AWS practice mobile runtime
- JEE multi-section mobile runtime
- Student mobile utility surfaces
- Student mobile attempt runtime

## Partial

- Mobile browser-reopen recovery for a live multi-section attempt
  - The reopen flow was explored, but the stable passing coverage kept the single-page reload path instead.

## Pending

- Additional mobile result-review variants beyond the seeded AWS path
- Subscription and wallet mutation flows on mobile
- Cross-browser validation for mobile student flows
- More recovery edge cases such as reopen-after-tab-close with deterministic seeded states

## Confidence

- Runtime start/save/submit: high
- Attempt runtime visibility: high
- Section switching: high on the seeded JEE flow
- Utility surfaces: high
- Recovery edge cases: medium
