# Institute Current Gaps And UI/UX Risks

## Purpose

This is the institute-focused observation report to use while expanding browser automation.

It is intentionally written from an end-user point of view.

## Known current strengths

- institute shell routes already exist
- question bank has both local and linked lanes
- exams, results, reports, reviews, and economy already have automation foundations
- mutable institute coverage already exists for several workflows

## Known current risks

### High-value usability risks

- some institute pages still carry dense operator-style layouts instead of task-first user framing
- filter count and control density can overwhelm users on data-heavy pages
- linked question behavior is powerful but concept-heavy and easy to misunderstand
- entitlement and package language is still business-technical rather than institute-friendly

### Likely automation gaps

- page-wise pagination depth is not uniformly explicit across every institute grid
- empty/error/loading states are not documented page by page
- smaller-width layout behavior is not yet systematically tracked for institute pages
- grid formatting and sort correctness are not yet centralized under one reporting standard
- popup and confirmation-message coverage is still distributed across multiple specs

### Current user confusion hotspots

- linked questions vs local questions
- package vs entitlement vs feature access
- revocation vs pause vs inactive state
- builder eligibility vs question-bank eligibility
- advanced builder gating vs question-bank scope gating

## Required bug report format

Use this exact format:

### Page

`/institute/...`

### Scenario

Short user action summary

### Steps

1.  
2.  
3.  

### Actual result

What the user saw

### Expected result

What should have happened

### Severity

Critical / High / Medium / Low

### Category

Functional / UI / UX / Validation / Performance / Pagination / Filter / Search / Data

### Evidence

Screenshot path / video path / trace path

### Suggested fix

Short practical recommendation
