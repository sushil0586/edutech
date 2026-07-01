# Nexora Teacher Frontend Foundation

## Objective

Define how the teacher workspace should look and behave so it matches the student product system while supporting a more operational workflow.

## Global Design Rule

Teacher must use the same global UI language as student.

Reuse the same:

- shell structure
- spacing system
- border radius
- card styling
- background treatment
- primary and secondary button styles
- status-pill tones
- empty-state style
- typography hierarchy

Teacher should not get a separate color palette.

## Shared Shell

### Sidebar

Teacher sidebar should stay role-specific, but structurally identical to student.

Required behavior:

- brand at top
- primary route navigation in the middle
- account summary and logout at bottom
- active route highlighted using the same active-state styling as student

Minimum nav groups at this stage:

- Dashboard
- Exams
- Question Bank
- Results

### Topbar

Teacher topbar should reuse the same global topbar frame.

Teacher topbar content should show:

- workspace label
- one-line operational summary
- profile label
- optional quick actions later if needed

### Main Content Container

Teacher pages should use the same centered content width and responsive behavior as student pages.

Rules:

- common shell stays fixed
- only center content changes
- cards must align to the same grid rhythm
- mobile collapse should follow the same responsive breakpoints as student

## Teacher UX Tone

Teacher UI should feel:

- calm
- precise
- operational
- trustworthy

It should not feel:

- crowded
- flashy
- over-decorated
- dependent on illustration for comprehension

## Shared Surface Types

Teacher screens should mainly reuse these surface patterns:

### 1. Hero Summary Surface

Use for:

- dashboard intro
- exam builder intro
- results intro

Must contain:

- page context
- current state
- one or two primary next actions

### 2. KPI Summary Grid

Use for:

- tracked counts
- exam status split
- question bank counts
- result-state counts

Rules:

- 3 to 4 cards per row on desktop
- reduced stack on mobile
- no fake metrics

### 3. Workflow Panels

Use for:

- builder sections
- question bank workspaces
- monitoring blocks

Rules:

- one panel should communicate one job
- actions must appear next to the data they affect
- forms should stay inside the same panel as the result of the action

### 4. State Panels

Use for:

- empty
- unconfigured
- error
- blocked states

Teacher should use the same empty and error-state design primitives as student.

## Status Language

Teacher should use the same status pill system as student.

Recommended mapping:

- live or published success state -> live tone
- scheduled or action-needed caution state -> warning tone
- informational or draft state -> demo tone
- cancelled or critical issue state -> danger tone

## Teacher Role-Specific Interaction Rules

### Forms

Teacher forms are more complex than student forms.

So:

- section headings must be explicit
- helper copy should explain consequences
- actions should be grouped near their affected data
- server-action feedback should always appear at page level after redirect

### Bulk Actions

Bulk actions must always make the target clear.

Rules:

- selected count should be visible
- destructive or sweeping actions must be named clearly
- success and failure feedback must be specific

### Live Operational Surfaces

Monitoring and results screens must prioritize clarity over decoration.

Rules:

- intervention urgency should be obvious
- state changes must be timestamp-friendly
- “what should the teacher do next” should be visible

## Shared Teacher Components To Keep

The following current direction is correct and should be reused or improved instead of replaced:

- `TeacherSidebar`
- `WorkspaceTopbar`
- `PageHeader`
- `ActionSubmitButton`
- shared `StudentStatePanel` pattern until a more role-neutral component is renamed later

## Recommended Teacher Design Cleanup

During implementation, these design cleanups should happen:

- replace any remaining teacher-unique rough styling with shared student-shell styling
- make spacing consistent across teacher routes
- ensure cards, badges, buttons, and banners use the same design tokens
- keep all future teacher pages inside the same shell rather than ad-hoc layouts

## Final UI Principle

Student, teacher, parent, institute, and admin should feel like one product family.

The teacher workspace should therefore be:

- same design system
- same CSS direction
- same shell
- same interaction grammar

Only the workflow depth changes.
