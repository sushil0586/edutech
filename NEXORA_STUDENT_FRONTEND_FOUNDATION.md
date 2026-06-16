# Nexora Student Frontend Foundation

## Purpose

This document completes the three frontend foundation steps before visual screen design starts:

1. define the design system
2. define screen-by-screen UX specifications
3. define the first page structures for dashboard and wallet

This file should be treated as the frontend reference for the new student experience.

It supersedes scattered planning across:

- `frontend_design_tokens.md`
- `frontend_ui_ux_blueprint.md`
- `frontend_wireframe_spec.md`
- `STUDENT_MODULE_NEXTJS_PLAN.md`

where this file is more current or more specific to the new sober and soft student product direction.

## Product Tone

The new student product should feel:

- sober
- soft
- calm
- premium
- academic
- trustworthy

The target visual benchmark should be:

- modern and polished
- light and spacious
- cleanly card-based
- soft-blue and warm-neutral
- elegant without being flashy
- premium without becoming dark or heavy

It should not feel:

- loud
- gamified
- neon
- sales-heavy
- cluttered
- admin-like

## Foundational Rules

### 1. Backend Truth First

The frontend must not hardcode:

- star balances
- reward amounts
- pack values
- subscription values
- locked or unlocked status
- access reasons
- pricing messages
- entitlement assumptions
- result visibility assumptions

All such values must come from backend APIs.

### 2. Soft Hierarchy

Important information should stand out through:

- spacing
- typography weight
- grouping
- muted contrast changes

not through aggressive color or oversized decoration.

### 3. One Main Action Per Surface

Each screen must make the next action obvious:

- start test
- resume test
- unlock content
- buy stars
- review result
- improve weak areas

### 4. Calm Commerce

Stars and purchase flows must feel useful and transparent, not manipulative.

That means:

- no flashy counters
- no casino-like rewards presentation
- no fake urgency
- no loud upsell banners

### 5. Exam Trust

Attempt and result-related screens must feel stable, serious, and low-distraction.

### 6. Visual Benchmark Discipline

If there is a choice between:

- louder vs calmer
- denser vs more spacious
- more decorative vs more readable
- sharper vs softer

we should choose:

- calmer
- more spacious
- more readable
- softer

## Part 1. Design System

## Global CSS Strategy

The new student frontend should use one global CSS foundation so that every screen follows the same visual language by default.

This means:

- tokens live in one global stylesheet
- app shell primitives live in one global stylesheet
- typography rules live in one global stylesheet
- default card, button, input, chip, badge, and section styles come from the same shared CSS layer
- page-level styling should be minimal and only used for composition differences

We should not build screens with isolated visual systems or page-specific styling logic that drifts from the rest of the product.

## Shared Shell Strategy

The student product should use one shared application shell across all authenticated screens.

That means the following areas should stay common across the product:

- header / topbar
- left sidebar
- footer
- page container
- page section spacing

Only the central page content should change from screen to screen.

### Shared Shell Contract

Every logged-in student screen should inherit the same structural layout:

1. persistent left sidebar
2. persistent top header
3. central content canvas
4. persistent footer

This should be true for:

- dashboard
- wallet
- subject catalog
- test detail
- results
- analytics
- weak areas
- notifications
- settings

### Shell Benefits

This shared shell is important because it gives:

- visual consistency
- faster navigation
- lower learning effort
- cleaner implementation
- easier responsive behavior

### Shell Variation Rule

The shell should remain common unless there is a strong product reason not to.

Valid exceptions:

- login
- signup
- public landing pages
- exam attempt workspace

The exam attempt workspace may use a more focused layout for trust and concentration, but it should still inherit the same visual design system.

### Shared Areas

#### Sidebar

The sidebar should remain common across student app screens and include:

- dashboard
- tests
- results
- practice
- subjects
- bookmarks
- wallet
- subscriptions
- profile
- settings

The active state, icon treatment, spacing, width, and surface style should be identical across screens.

#### Header

The header should remain common across student app screens and include:

- subject selector or scope selector where relevant
- global search
- wallet or stars quick summary
- notifications
- profile menu

The header can support small contextual differences, but the structure and styling should stay shared.

#### Footer

The footer should remain common across student app screens and should be quiet and minimal.

Recommended content:

- trust or product assurance line
- support entry point
- optional lightweight policy/help links

The footer should feel like a stable close to the page, not a marketing block.

#### Central Content Area

This is the only area that should materially change between screens.

The content area should inherit:

- the same page padding
- the same section spacing
- the same content width rules
- the same card system
- the same state components

## Student App Shell Specification

This section defines the exact shared layout structure we should build first and reuse across the student product.

## Desktop Shell Structure

The desktop shell should have four persistent regions:

1. left sidebar
2. top header
3. central content canvas
4. bottom footer

### Desktop Layout Formula

The visual structure should behave like this:

- sidebar fixed or sticky on the left
- main app region on the right
- header fixed or sticky inside the main region
- page content below the header
- footer below the page content inside the same main region

The student should feel that they are staying inside one product frame while only the center content changes.

### Sidebar Specification

The sidebar should be:

- visually quiet
- softly bordered
- slightly separated from the page background
- stable across all student screens

It should contain:

- brand mark and product name at the top
- primary navigation in the middle
- optional support/help card near the bottom

Recommended behavior:

- width should remain consistent
- active item uses soft fill and stronger text
- icons remain subtle and uniform
- sidebar should not collapse unexpectedly on desktop

### Header Specification

The header should be the common control strip for the student app.

It should contain:

- subject or scope selector
- global search
- stars quick summary
- notification entry
- profile menu

Recommended behavior:

- use the same height across screens
- keep internal spacing consistent
- stay sticky when helpful
- avoid changing header composition from page to page

Allowed variation:

- page-specific header title can change in the central content area
- the shared utility strip itself should remain structurally stable

### Central Content Specification

The central content canvas should be the flexible region for each screen.

It should include:

- page intro or hero area
- primary content sections
- section spacing based on shared rhythm
- all page-specific cards and data views

Rules:

- do not redesign surrounding shell per page
- do not move global controls into local content unnecessarily
- keep width and padding consistent across screens

### Footer Specification

The footer should be present across student screens, but remain minimal.

Recommended content:

- trust reassurance line
- support link
- optional help or policy links

Recommended behavior:

- visually light
- small vertical footprint
- same spacing and border treatment everywhere

The footer should feel like a closing product utility strip, not a content-heavy website footer.

## Mobile Shell Structure

Mobile should still preserve the same shared-shell idea, but adapt it for smaller space.

### Mobile Layout Formula

The mobile shell should behave like this:

1. top mobile header
2. page content canvas
3. mobile footer or bottom navigation area

The left sidebar can transform into:

- drawer navigation
- sheet navigation
- bottom navigation for primary routes

### Mobile Common Areas

The following still remain shared on mobile:

- top header behavior
- navigation pattern
- content padding
- footer or bottom utility area
- shared card and button system

The shell changes form, but not design language.

## Shell Reuse Rules

### Rule 1. One Shell Component

We should implement one shared shell component for student authenticated pages.

That shell should own:

- sidebar rendering
- header rendering
- footer rendering
- main content layout boundaries

### Rule 2. Content Slot Pattern

Every page should plug its own central content into the same shell.

In practice:

- shell stays the same
- screen content slot changes

### Rule 3. No Lookalike Shells

We should not create:

- one dashboard shell
- another wallet shell
- another results shell

with nearly identical layout but separate code.

If the shell looks the same, it should be the same component.

### Rule 4. Shared Header And Sidebar Data Model

The shell should eventually accept shared backend-aware data such as:

- current student context
- current subject context
- wallet summary
- notification count
- profile summary

That keeps global areas truthful without duplicating fetch logic across pages.

## Shared Shell Visual Notes

The shell should visually communicate:

- stability
- calmness
- premium clarity

through:

- consistent padding
- restrained borders
- soft surface layering
- steady icon treatment
- minimal visual noise

The shell itself should never compete with the content.

## Shell First Build Priority

Before designing multiple screens, we should first define:

1. shared shell layout
2. shared sidebar
3. shared header
4. shared footer
5. central content container

After that, each screen should only design its internal content blocks.

## Shared Shell Content Specification

This section defines what the common sidebar, header, and footer should actually contain.

## 1. Sidebar Content Specification

The sidebar is the primary orientation and navigation area for the student app.

### Sidebar Zones

The sidebar should have three stable zones:

1. brand zone
2. navigation zone
3. support zone

### Brand Zone

The top of the sidebar should contain:

- Nexora brand mark
- product wordmark

Optional:

- a very short academic descriptor only if it remains visually quiet

The brand zone should feel clean and premium, not like a marketing banner.

### Navigation Zone

The main navigation zone should contain the core student routes in a stable order.

Recommended order:

1. dashboard
2. tests
3. results
4. practice
5. subjects
6. bookmarks
7. wallet
8. subscriptions
9. profile
10. settings

### Sidebar Item Behavior

Each item should include:

- icon
- label
- active state

Optional:

- quiet badge count for notifications or new items only if truly needed

The active state should use:

- soft background fill
- stronger text
- stronger icon tone

It should not use:

- harsh left bars
- loud glow
- aggressive contrast jumps

### Sidebar Fixed Versus Contextual

The sidebar should stay mostly fixed across screens.

Fixed:

- structure
- item order
- width
- icon style
- active treatment

Contextual:

- current active item
- optional unread badge

### Sidebar Bottom Support Zone

The lower sidebar can contain one small support/help surface.

Recommended content:

- help icon
- short reassurance line
- contact support action

This should feel like a useful utility, not a promotional card.

## 2. Header Content Specification

The header is the shared utility and quick-access bar for the student app.

### Header Zones

The header should have three zones:

1. left utility zone
2. center search zone
3. right action zone

### Left Utility Zone

This zone should contain context selectors when relevant.

Recommended items:

- subject selector
- availability or scope selector only where truly useful

Rules:

- do not overload this area
- avoid putting page-specific clutter here

### Center Search Zone

This zone should contain global search.

The search should support:

- tests
- chapters
- topics
- possibly premium content later

Search behavior should feel common across the app, not reinvented per screen.

### Right Action Zone

This zone should contain:

- stars quick summary
- notifications button
- profile avatar or initials
- profile menu trigger

Optional:

- subscription state marker if subtle and truly useful

### Header Fixed Versus Contextual

Fixed:

- height
- spacing
- search shell style
- notification control
- profile control
- wallet quick-summary placement

Contextual:

- selected subject
- live wallet summary
- notification count
- profile details

### Header Experience Rule

The header should always help the student answer:

- where am I focused
- what can I search
- how many stars do I have
- do I have something new to check

without turning into a crowded command bar.

## 3. Footer Content Specification

The footer is a shared reassurance and utility strip.

### Footer Purpose

The footer should:

- close the page calmly
- reinforce trust
- provide lightweight support entry

### Recommended Footer Content

- one trust line such as platform reliability or assessment integrity reassurance
- support link
- optional help/policy links if we need them

### Footer Rules

- keep it small
- keep it quiet
- keep it visually consistent
- never turn it into a large marketing footer inside the student app

## 4. Central Content Specification

The central content area is where each screen expresses its unique purpose.

### Content Area Zones

Most student screens should organize central content as:

1. page intro zone
2. priority content zone
3. supporting content zone
4. closing utility or secondary insight zone

### Fixed Content Rules

The central area should still inherit:

- same horizontal padding
- same vertical spacing rhythm
- same section title styles
- same card and badge system
- same empty-state and loading-state system

### Flexible Content Rules

Only these things should change by screen:

- page title and intro copy
- page-specific content blocks
- page-specific actions
- page-specific data density

## 5. Shell Data Ownership

The shared shell should eventually own the data needed for its common areas.

### Shell-Level Data

The shell should be able to receive:

- student identity summary
- current academic context
- subject options
- wallet quick summary
- notification count
- profile menu data

### Page-Level Data

Individual pages should own:

- dashboard recommendations
- ledger detail
- results detail
- analytics detail
- subject content detail

This keeps global areas stable and prevents repeated fetching patterns.

## 6. Shell Component Deliverables

Before building multiple student pages, the new frontend repo should define these common components:

- `StudentAppShell`
- `StudentSidebar`
- `StudentHeader`
- `StudentFooter`
- `StudentContentContainer`
- `StudentNavItem`
- `StudentSearchBar`
- `StudentWalletQuickPill`
- `StudentNotificationButton`
- `StudentProfileMenu`

## 7. Shell Design Approval Rule

We should approve the shared shell before full screen rollout.

That approval should cover:

- sidebar layout
- header layout
- footer layout
- mobile adaptation
- spacing rhythm
- common interaction states

Once the shell is approved, the rest of the screens should reuse it without re-arguing the frame.

## Dashboard Content Specification

This section defines the actual center content of the student dashboard inside the shared shell.

The dashboard is the primary logged-in student home screen.

Its job is not to show everything.

Its job is to show:

- where the student stands
- what the student should do next
- what is available now
- what is locked and why
- what changed recently

## Dashboard Content Goals

The dashboard should help the student answer these questions within a few seconds:

- what should I do next
- which subject am I in
- what can I access right now
- what is locked
- how many stars do I have
- how am I progressing

## Dashboard Content Zones

The dashboard center content should have these zones in order:

1. welcome and context zone
2. priority hero zone
3. subject navigation zone
4. available content zone
5. locked content zone
6. progress zone
7. latest activity zone

## 1. Welcome And Context Zone

This is the opening orientation area of the dashboard.

### Purpose

- greet the student
- show current academic context
- set the tone for the page

### Required Content

- welcome line using student name
- class / grade / program context
- board or academic context where relevant
- one short next-action sentence

### Content Rules

- keep copy short
- do not overload with metrics
- this zone is for orientation, not data density

### Visual Direction

- calm, spacious
- left aligned text
- optional subtle academic illustration on the right

## 2. Priority Hero Zone

This is the most important functional part of the dashboard.

It should contain two equal-priority hero cards:

1. recommended test card
2. wallet summary card

### 2A. Recommended Test Card

#### Purpose

- present the best next academic action

#### Required Content

- recommendation badge
- test title
- subject
- short reason for recommendation
- metadata row:
  - question count
  - duration
  - difficulty if available
- primary CTA
- secondary CTA if needed

#### CTA Priority

Use only one primary action:

- `Start Test`
- `Resume Test`
- `View Details`

Secondary action may be:

- `View Details`
- `Why recommended`

#### Rules

- only show one main recommendation here
- do not turn this into a carousel
- do not show multiple competing hero actions

### 2B. Wallet Summary Card

#### Purpose

- make the star system visible without overpowering learning

#### Required Content

- wallet title
- available stars
- short supporting line
- primary CTA to open wallet

Optional:

- one small hint like what stars can unlock next

#### Rules

- keep it clean and premium
- avoid loud star graphics
- avoid promotional copy
- no hardcoded commercial messaging

## 3. Subject Navigation Zone

This zone helps the student pivot from overall overview into a subject-specific lane.

### Required Content

- subject chips or subject tabs
- optional availability filter
- optional `View All` or broader catalog entry

### Behavior

- switching subject should re-scope the dashboard content when supported
- active subject should be visually clear
- the UI must still work if the student has only one subject context

### Rules

- keep this interaction lightweight
- do not let this zone look like a heavy admin filter bar

## 4. Available Content Zone

This zone shows content that the student can act on immediately.

### Purpose

- expose the most useful accessible content
- encourage fast action

### Supported Item Types

- chapter test
- mock test
- practice test
- subject practice
- unlocked premium content

### Required Card Content

Each card should show:

- state badge
- title
- short content type or context
- metadata row
- difficulty if available
- one primary CTA

### Valid State Badges

- `Free`
- `Recommended`
- `Resume`
- `Unlocked`
- `Ready`

### CTA Examples

- `Start Now`
- `Resume`
- `Open`

### Rules

- keep card actions consistent
- do not show more than one primary CTA per card
- use a clean grid on desktop and a stacked list or small carousel on mobile

## 5. Locked Content Zone

This zone explains premium or restricted content without making it feel dead or hostile.

### Purpose

- show what exists beyond current access
- explain the value
- explain the lock reason
- provide the correct unlock path

### Required Content

Each locked card should show:

- locked icon or lock badge
- title
- content type
- metadata row
- unlock requirement
- primary unlock CTA

### Unlock Requirement Examples

- unlocks with `250 stars`
- requires entitlement
- requires subscription credit path if applicable through stars model

### Explainer Surface

This zone should include one supporting explainer block such as:

- why this is locked
- how stars work
- how to unlock premium content

### Rules

- locked content should still look desirable
- never style it like disabled broken content
- messaging must come from backend-supported rules where applicable

## 6. Progress Zone

This zone gives the student a steady sense of momentum.

### Purpose

- summarize performance
- show weak areas
- give one next improvement direction

### Structure

Use two sub-areas:

1. recent performance summary
2. weak area summary

### 6A. Recent Performance Summary

#### Required Content

- recent score snapshot
- simple progress visual
- attempt count or recent test count
- one supporting interpretation label

#### Rules

- avoid too many charts
- keep the summary easy to read in seconds

### 6B. Weak Area Summary

#### Required Content

- top weak topics or domains
- weakness percentage or severity indicator
- one CTA to improve weak areas

#### CTA Examples

- `Improve Weak Areas`
- `Practice Now`

## 7. Latest Activity Zone

This zone shows recent meaningful events in the student journey.

### Purpose

- create continuity
- make star actions visible
- make test actions visible

### Supported Activity Types

- attempted test
- earned stars
- unlocked content
- result published
- resumed attempt

### Required Row Content

Each activity row should show:

- activity icon
- activity title
- supporting detail
- timestamp

Optional:

- star delta if relevant

### Rules

- use simple list format
- keep chronology clear
- do not overload with every minor event

## Dashboard Data Model Expectations

The dashboard should eventually consume a backend contract that can support:

- student context summary
- recommended next content
- wallet quick summary
- subject options
- available content list
- locked content list with reasons
- progress summary
- recent activity summary

The dashboard must not invent:

- unlock status
- stars value
- recommendation reason
- lock reason

from frontend guesswork.

## Dashboard Density Rules

The dashboard should feel rich, but not crowded.

### Do

- group related information
- give hero items breathing room
- keep card text short
- use section titles clearly

### Do Not

- turn the dashboard into a data dump
- duplicate the same information in multiple cards
- use too many charts
- overload the first screen with secondary details

## Dashboard Mobile Adaptation

On mobile, the dashboard should keep the same zone order, but compress thoughtfully:

1. welcome and context
2. recommended test hero
3. wallet summary
4. subject chips
5. available content
6. locked content
7. progress
8. latest activity

### Mobile Rules

- keep hero cards stacked
- keep CTAs large and clear
- avoid cramped multi-column layouts
- preserve strong vertical rhythm

## Dashboard Build Deliverables

Before coding the full dashboard visuals, we should define:

- `StudentDashboardHero`
- `StudentRecommendedTestCard`
- `StudentWalletHeroCard`
- `StudentSubjectChipRow`
- `StudentAvailableContentGrid`
- `StudentLockedContentSection`
- `StudentProgressSection`
- `StudentActivityList`

## Dashboard Approval Rule

We should approve the dashboard if:

- the next action is obvious
- the wallet is visible but not overpowering
- available and locked content are clearly separated
- progress and activity feel useful but calm
- the layout still feels soft, modern, and spacious

## Wallet Content Specification

This section defines the actual center content of the wallet screen inside the shared shell.

The wallet screen is not just a purchase page.

It is the student's trust screen for the star economy.

Its job is to explain:

- how many stars the student has
- where stars came from
- where stars were spent
- what can be unlocked
- what purchase options currently exist

## Wallet Content Goals

The wallet should help the student answer these questions quickly:

- how many stars do I have right now
- did I earn or buy these stars
- where did I spend them
- what can I unlock next
- what packs or subscriptions are available

## Wallet Content Zones

The wallet center content should have these zones in order:

1. wallet intro zone
2. balance summary zone
3. purchase options zone
4. ledger history zone
5. unlock history zone
6. help and explanation zone

## 1. Wallet Intro Zone

This is the opening orientation area of the wallet screen.

### Purpose

- explain the screen clearly
- make the current balance immediately visible

### Required Content

- page title
- one-line explanation of stars
- current available stars

Optional:

- one short line about what stars can do next

### Rules

- keep tone calm and factual
- do not use promotional copy
- do not overload the intro with too many metrics

## 2. Balance Summary Zone

This zone provides a structured star summary.

### Purpose

- show the composition of the student's economy state
- separate balance from history

### Recommended Summary Cards

Use compact cards for:

1. available stars
2. lifetime earned
3. lifetime spent
4. paid stars
5. subscription stars

### Required Content

Each summary card should show:

- metric label
- metric value
- optional short supporting label

### Rules

- cards should be easy to compare at a glance
- avoid decorative charting here
- keep this zone analytical and clear

## 3. Purchase Options Zone

This zone shows the currently available economy offers.

### Purpose

- show pack and subscription options
- help students understand value
- keep purchase decisions calm and clear

### Structure

Split into two groups:

1. star packs
2. subscription plans

### 3A. Star Packs

#### Required Card Content

Each pack card should show:

- pack name
- stars credited
- price
- currency
- primary CTA

Optional:

- short backend-driven description

#### CTA Examples

- `Buy Pack`
- `Continue`

### 3B. Subscription Plans

#### Required Card Content

Each subscription card should show:

- plan name
- billing cycle
- price
- star credit outcome
- primary CTA

Optional:

- short backend-driven description

#### CTA Examples

- `Choose Plan`
- `Continue`

### Rules

- use backend-driven names and values only
- do not invent plan benefits in the frontend
- do not use fake urgency or fake savings language
- cards should feel informative first, commercial second

## 4. Ledger History Zone

This zone shows how stars moved over time.

### Purpose

- provide audit clarity
- build trust in the economy
- help the student understand credits and debits

### Required Content

Each ledger row should show:

- reason or action label
- source type
- star delta
- resulting balance
- timestamp

Optional:

- a small category marker such as:
  - reward
  - purchase
  - subscription
  - unlock
  - admin adjustment

### Rules

- positive and negative movement should be distinguishable
- labels should remain plain and readable
- history should feel like a clean statement, not a noisy transaction feed

## 5. Unlock History Zone

This zone shows where stars or access rights were used successfully.

### Purpose

- connect the economy to real student value
- make unlocked content visible

### Required Content

Each unlock row or card should show:

- unlocked content title
- content type
- unlock method if available
- timestamp

Optional:

- star cost if unlocked through spending

### Rules

- keep this simpler than the main ledger
- do not duplicate all ledger detail here
- treat this as student-facing value history

## 6. Help And Explanation Zone

This zone explains how the economy works in plain language.

### Purpose

- reduce confusion
- reduce purchase anxiety
- explain the relationship between rewards, purchases, and unlocks

### Recommended Content

- how stars are earned
- how stars are spent
- how subscriptions add stars
- what happens after unlock

### Rules

- explanations should be short
- language should be plain and human
- do not make legal or policy text the main focus of the wallet

## Wallet Data Model Expectations

The wallet should eventually consume backend contracts for:

- wallet summary
- star ledger history
- unlock state or unlock history
- star pack catalog
- subscription plan catalog
- order history
- active subscriptions

The wallet must not guess:

- balance composition
- subscription contribution
- pack pricing
- content unlock logic

from frontend assumptions.

## Wallet Visual Rules

The wallet should feel:

- calm
- premium
- transparent
- structured

It should not feel:

- flashy
- casino-like
- crowded
- aggressive

### Visual Hierarchy

The wallet should visually prioritize:

1. current available stars
2. summary clarity
3. purchase options
4. audit history

### Premium Treatment Rule

The wallet can use warm sand and pale gold accents, but only softly.

It should avoid:

- bright yellow overload
- metallic gimmicks
- glowing reward visuals

## Wallet Mobile Adaptation

On mobile, the wallet should keep the same content order:

1. intro
2. available stars
3. summary cards
4. star packs
5. subscription plans
6. ledger history
7. unlock history
8. explanation/help

### Mobile Rules

- stack all cards vertically
- keep CTA buttons wide and clear
- keep history rows compact but readable
- avoid wide tables on mobile

## Wallet Build Deliverables

Before coding the full wallet visuals, we should define:

- `StudentWalletIntro`
- `StudentBalanceSummaryGrid`
- `StudentStarPackGrid`
- `StudentSubscriptionPlanGrid`
- `StudentLedgerList`
- `StudentUnlockHistoryList`
- `StudentWalletHelpBlock`

## Wallet Approval Rule

We should approve the wallet if:

- current stars are immediately visible
- balance composition is understandable
- pack and subscription options feel clear, not pushy
- ledger history feels trustworthy
- unlock history connects stars to real student value

## Subject Catalog Content Specification

This section defines the actual center content of the subject catalog screen inside the shared shell.

The subject catalog is where the student explores available and locked learning content in a structured way.

Its job is to help the student answer:

- what content exists for this subject
- what is available right now
- what is locked
- why it is locked
- what I can do next

## Subject Catalog Goals

The subject catalog should help the student:

- browse by subject without confusion
- understand content types quickly
- distinguish free, unlocked, resumable, and locked items
- take action without reading too much text

## Subject Catalog Content Zones

The subject catalog center content should have these zones in order:

1. page intro zone
2. subject scope zone
3. filter and sort zone
4. available content zone
5. locked content zone
6. catalog guidance zone

## 1. Page Intro Zone

This is the orientation area for the subject catalog.

### Purpose

- explain what the student is browsing
- give the current scope immediately

### Required Content

- page title
- one-line description
- current subject scope or overall scope

Optional:

- one small summary line such as content count or recommendation hint

### Rules

- keep it short
- do not overload with dashboard-like analytics

## 2. Subject Scope Zone

This zone lets the student move between subject lanes.

### Purpose

- keep subject browsing obvious
- reduce catalog confusion

### Required Content

- subject chips, tabs, or selector
- active subject indication

### Behavior

- selecting a subject should re-scope visible content
- the current subject should be unambiguous
- if only one subject exists, the UI should still remain clean

### Rules

- keep the selector lightweight
- avoid heavy multi-row controls

## 3. Filter And Sort Zone

This zone helps refine the content without making the screen feel like an admin table.

### Recommended Filters

- availability
- content type
- difficulty where meaningful

### Recommended Sort Options

- recommended
- newest
- shortest
- easiest

### Rules

- keep filters optional and simple
- default state should still work well without manual filtering
- never overload the top of the page with advanced controls

## 4. Available Content Zone

This zone contains content the student can use immediately.

### Purpose

- show accessible content clearly
- support quick decision-making

### Supported Item Types

- chapter tests
- mock tests
- practice tests
- subject bundles if already unlocked
- resumable content

### Required Card Content

Each card should show:

- content state badge
- title
- short content context
- metadata row
- optional difficulty marker
- one primary CTA

### Valid Available States

- `Free`
- `Unlocked`
- `Resume`
- `Recommended`
- `Ready`

### CTA Examples

- `Start`
- `Resume`
- `Open`
- `View Details`

### Rules

- cards should stay clean and consistent
- do not mix too many action types in one row
- prefer clarity over density

## 5. Locked Content Zone

This zone contains content that exists but requires stars or another backend-defined access rule.

### Purpose

- make premium or restricted content visible
- explain the access requirement
- route the student to the right next step

### Required Card Content

Each locked card should show:

- locked state indicator
- title
- content type
- metadata row
- lock reason
- unlock requirement
- one primary CTA

### Lock Reason Examples

- requires `250 stars`
- requires entitlement
- currently not available

### CTA Examples

- `Unlock with Stars`
- `Open Wallet`
- `View Details`

### Rules

- keep the content attractive, not deadened
- lock reason must be understandable
- the frontend must not fabricate access explanations

## 6. Catalog Guidance Zone

This zone is a small supporting area at the end of the page.

### Purpose

- reduce confusion
- help the student understand catalog states

### Recommended Content

- explanation of badges or states
- how unlocking works
- where to go for stars or subscriptions

### Rules

- keep it short
- this is guidance, not a tutorial wall

## Subject Catalog Data Model Expectations

The subject catalog should eventually consume backend contracts for:

- subject options
- content items
- access policy summaries
- unlock state
- recommendation markers where available
- pricing or star requirements where relevant

The catalog must not guess:

- whether something is unlocked
- whether something is premium
- what star cost applies
- what lock reason to show

from frontend assumptions.

## Subject Catalog Visual Rules

The subject catalog should feel:

- organized
- calm
- premium
- easy to scan

It should not feel:

- like a dense course marketplace
- like an admin list view
- like a cluttered e-commerce grid

### Visual Hierarchy

The catalog should visually prioritize:

1. current subject scope
2. available content
3. locked but valuable content
4. light guidance

## Subject Catalog Mobile Adaptation

On mobile, the subject catalog should keep this order:

1. page intro
2. subject scope selector
3. lightweight filters
4. available content
5. locked content
6. guidance

### Mobile Rules

- make subject switching easy with horizontal chips or a simple selector
- keep filters compact
- stack cards vertically
- ensure lock reasons remain readable without expanding dense panels

## Subject Catalog Build Deliverables

Before coding the full subject catalog visuals, we should define:

- `StudentSubjectCatalogIntro`
- `StudentSubjectScopeRow`
- `StudentCatalogFilterBar`
- `StudentAvailableContentList`
- `StudentLockedContentList`
- `StudentCatalogGuidanceBlock`

## Subject Catalog Approval Rule

We should approve the subject catalog if:

- subject scope is always clear
- available and locked content are easy to distinguish
- lock reasons feel understandable
- the screen stays calm and scannable even with many items

## Test Detail Content Specification

This section defines the actual center content of the test detail screen inside the shared shell.

The test detail screen is where the student understands one specific content item before taking action.

Its job is to answer:

- what is this test
- can I access it
- why or why not
- what happens if I start
- what should I do next

## Test Detail Goals

The test detail screen should help the student:

- understand the test quickly
- see the current access state clearly
- understand rules without reading long blocks
- choose the correct next action with confidence

## Test Detail Content Zones

The test detail center content should have these zones in order:

1. page intro zone
2. access state zone
3. test summary zone
4. action zone
5. rules and expectations zone
6. support and guidance zone

## 1. Page Intro Zone

This is the top orientation area of the screen.

### Purpose

- identify the test clearly
- set the subject and type context

### Required Content

- test title
- subject
- content type
- optional short descriptor

### Rules

- keep the title prominent
- do not bury the core identity of the test under metadata

## 2. Access State Zone

This is the most important state area on the page.

### Purpose

- show whether the student can act now
- explain why if blocked

### Supported Access States

- free and available
- unlocked and available
- resume available
- locked by stars
- locked by entitlement
- not yet available
- no attempts remaining

### Required Content

This zone should show:

- current access state label
- short explanation
- lock reason if relevant
- supporting secondary note if useful

### Rules

- access state must be visible above the fold
- this should be plain-language and calm
- the frontend must not guess the state from partial data

## 3. Test Summary Zone

This zone explains the actual structure of the test.

### Purpose

- help the student understand the scope before starting

### Required Content

- question count
- duration
- difficulty if available
- attempt count or remaining attempts if available
- optional sections count

### Rules

- prefer concise metric cards or metadata rows
- do not turn this into a long spec sheet

## 4. Action Zone

This zone contains the main decision action for the student.

### Purpose

- make the next step obvious

### Primary CTA Priority

Only one primary CTA should be used at a time:

- `Start Test`
- `Resume Test`
- `Unlock with Stars`
- `Open Wallet`
- `View Summary`

### Secondary CTA Examples

- `View Details`
- `See Rules`
- `Back to Subject`

### CTA Rules

- never show multiple competing primary actions
- choose the CTA based on backend truth
- keep button text direct and calm

## 5. Rules And Expectations Zone

This zone explains what the student should know before beginning.

### Purpose

- reduce uncertainty
- improve trust before action

### Recommended Content

- time limit
- submission behavior
- result visibility summary
- review availability summary
- attempt rules summary

### Rules

- summarize rules in student-facing language
- avoid raw backend jargon
- do not overload with legal-style policy text

## 6. Support And Guidance Zone

This is a lightweight closing area for helpful clarification.

### Purpose

- help the student if the action is blocked or unclear

### Recommended Content

- why this may be locked
- what stars can do here
- where results or review will appear

### Rules

- keep guidance short
- treat it as reassurance, not filler

## Test Detail Data Model Expectations

The test detail screen should eventually consume backend contracts for:

- content identity
- access state
- unlock requirement
- attempt status
- attempt limits
- result visibility summary
- review availability summary
- runtime metadata

The screen must not guess:

- whether the student can start
- whether the student must unlock
- whether review will be available
- how many attempts remain

from frontend assumptions.

## Test Detail Visual Rules

The test detail screen should feel:

- clear
- confident
- calm
- trustworthy

It should not feel:

- dense
- technical
- overly promotional
- visually noisy

### Visual Hierarchy

The page should visually prioritize:

1. test identity
2. access state
3. primary action
4. practical rules

## Test Detail Mobile Adaptation

On mobile, the test detail screen should keep this order:

1. page intro
2. access state
3. test summary
4. primary action
5. rules
6. guidance

### Mobile Rules

- keep the primary CTA prominent
- avoid wide metadata layouts
- keep access messaging visible without scrolling too far

## Test Detail Build Deliverables

Before coding the full test detail visuals, we should define:

- `StudentTestDetailIntro`
- `StudentTestAccessStateCard`
- `StudentTestSummaryMetrics`
- `StudentTestPrimaryActionBlock`
- `StudentTestRulesSummary`
- `StudentTestGuidanceBlock`

## Test Detail Approval Rule

We should approve the test detail screen if:

- the student can understand the test in seconds
- the current access state is unmistakable
- the next action is obvious
- the rules feel clear without becoming heavy

## Result Screen Content Specification

This section defines the actual center content of the result screen inside the shared shell.

The result screen is where the student sees outcome, interpretation, and next direction after an assessment.

Its job is to answer:

- what was my result
- is it final or pending
- what went well
- what needs work
- what should I do next

## Result Screen Goals

The result screen should help the student:

- understand the result immediately
- distinguish score visibility states clearly
- feel supported, not judged
- move naturally into review, retry, or improvement actions

## Result Screen Content Zones

The result center content should have these zones in order:

1. result status zone
2. score summary zone
3. strengths and weak areas zone
4. next action zone
5. supporting details zone

## 1. Result Status Zone

This is the top outcome state area.

### Purpose

- make the current result state obvious

### Supported States

- published
- submitted and pending
- evaluated but not yet published
- review available
- review locked

### Required Content

- state label
- short explanation
- timestamp if useful

### Rules

- never imply a final score if one is not actually visible
- keep the wording plain and calm

## 2. Score Summary Zone

This zone contains the primary performance summary.

### Purpose

- present the headline outcome clearly

### Required Content

- score or percentage if visible
- pass/fail or performance label if supported
- short interpretation line
- core metrics if available

### Rules

- if score is not visible, show the real state instead of placeholder numbers
- keep the visual summary strong but not dramatic

## 3. Strengths And Weak Areas Zone

This zone translates the result into learning value.

### Purpose

- show where the student did well
- show where improvement is needed

### Required Content

- top strengths
- top weak areas
- simple severity or performance indicators

### Rules

- keep this readable before making it highly visual
- avoid overloading the screen with charts

## 4. Next Action Zone

This zone turns the result into the next useful step.

### Purpose

- guide the student forward

### Primary CTA Examples

- `Review Answers`
- `Practice Weak Areas`
- `Retry Test`
- `Go to Dashboard`

### Secondary CTA Examples

- `View Detailed Report`
- `Open Related Subject`

### Rules

- only one primary action should dominate
- choose the next action based on actual result and review state

## 5. Supporting Details Zone

This zone contains lower-priority supporting information.

### Recommended Content

- attempt date
- duration used
- question counts if available
- review policy reminder

### Rules

- keep this secondary
- do not bury the main outcome above it

## Result Screen Data Model Expectations

The result screen should eventually consume backend contracts for:

- result visibility state
- score summary
- review availability
- strengths and weaknesses
- related next-action recommendations

The result screen must not guess:

- score visibility
- review availability
- performance interpretation

from frontend assumptions.

## Result Screen Visual Rules

The result screen should feel:

- supportive
- clear
- calm
- trustworthy

It should not feel:

- harsh
- overly celebratory
- punitive
- visually overloaded

### Visual Hierarchy

The page should visually prioritize:

1. result state
2. score summary
3. next action
4. strengths and weaknesses

## Result Screen Mobile Adaptation

On mobile, the result screen should keep this order:

1. result state
2. score summary
3. next action
4. strengths and weak areas
5. supporting details

### Mobile Rules

- keep the score summary compact
- keep the next action close to the top
- avoid long stacked analytics blocks

## Result Screen Build Deliverables

Before coding the full result visuals, we should define:

- `StudentResultStatusCard`
- `StudentScoreSummaryCard`
- `StudentStrengthWeaknessPanel`
- `StudentResultNextActionBlock`
- `StudentResultDetailsList`

## Result Screen Approval Rule

We should approve the result screen if:

- the result state is instantly understandable
- the outcome feels supportive and actionable
- the next action is obvious
- the screen stays truthful when scores or review are unavailable

## Attempt Screen Content Specification

This section defines the actual attempt workspace content for the student assessment flow.

This screen is an exception to the normal shared shell structure, but it must still inherit the same design system.

Its job is to help the student:

- stay focused
- track progress
- answer safely
- understand save and submit state

## Attempt Screen Goals

The attempt screen should:

- feel stable and serious
- reduce anxiety during answering
- make progress and timing visible
- avoid decorative distractions

## Attempt Screen Content Zones

The attempt workspace should have these zones:

1. focused topbar zone
2. test progress zone
3. question and answer zone
4. navigation zone
5. submit and safety zone

## 1. Focused Topbar Zone

### Purpose

- keep the student oriented without the full app shell

### Required Content

- test title
- timer
- current section if relevant
- safe exit behavior if allowed

### Rules

- this must remain minimal
- do not include wallet, promotions, or unrelated global actions

## 2. Test Progress Zone

### Purpose

- show how far the student has progressed

### Required Content

- answered count
- remaining count if useful
- section progress if applicable

### Rules

- keep progress visible
- do not crowd the question area

## 3. Question And Answer Zone

### Purpose

- provide the main workspace for answering

### Required Content

- question stem
- answer options or response area
- mark-for-review control if supported
- answer save state

### Rules

- prioritize readability
- use strong whitespace
- avoid decorative clutter

## 4. Navigation Zone

### Purpose

- help movement between questions or sections

### Required Content

- previous / next controls
- question palette or compact progress navigator
- section switcher if applicable

### Rules

- navigation must feel predictable
- important movement controls should stay easy to reach

## 5. Submit And Safety Zone

### Purpose

- help the student finish with confidence

### Required Content

- submission status
- save reassurance
- submit action
- final confirmation behavior

### Rules

- submitting should feel deliberate
- warnings should be clear but not alarming

## Attempt Screen Data Model Expectations

The attempt screen should eventually consume backend contracts for:

- active attempt state
- timer and timing mode
- question content
- answer state
- save state
- progress state
- section structure
- submit eligibility

The attempt screen must not guess:

- remaining time
- save success
- submit readiness
- section progression

from frontend assumptions.

## Attempt Screen Visual Rules

The attempt screen should feel:

- serious
- stable
- distraction-free
- readable

It should not feel:

- decorative
- marketplace-like
- commercially active
- noisy

### Visual Hierarchy

The page should visually prioritize:

1. timer and test identity
2. question content
3. answer action
4. progress and submission

## Attempt Screen Mobile Adaptation

On mobile, the attempt workspace should:

1. keep timer and core controls at the top
2. show question content immediately
3. keep answer actions reachable
4. keep submit action deliberate and clear

### Mobile Rules

- avoid tiny question palette interactions
- keep response controls thumb-friendly
- preserve strong readability

## Attempt Screen Build Deliverables

Before coding the full attempt visuals, we should define:

- `StudentAttemptTopbar`
- `StudentAttemptProgressStrip`
- `StudentQuestionPanel`
- `StudentAnswerPanel`
- `StudentQuestionNavigator`
- `StudentAttemptSubmitBar`

## Attempt Screen Approval Rule

We should approve the attempt screen if:

- the student can stay focused easily
- timer and progress are always understandable
- answer actions feel safe
- submit behavior feels deliberate and trustworthy

## Analytics Screen Content Specification

This section defines the actual center content of the analytics screen inside the shared shell.

The analytics screen is where the student understands longer-term progress patterns.

Its job is to answer:

- how am I improving
- which subjects are strong or weak
- where should I focus next
- what trend should I care about

## Analytics Screen Goals

The analytics screen should help the student:

- understand performance trends without confusion
- see subject and topic patterns
- turn insights into the next academic action

## Analytics Screen Content Zones

The analytics center content should have these zones in order:

1. analytics intro zone
2. trend summary zone
3. subject performance zone
4. topic performance zone
5. next action zone

## 1. Analytics Intro Zone

### Purpose

- orient the student to the analytics view

### Required Content

- page title
- one-line explanation
- optional selected time scope if supported

### Rules

- keep this light
- do not duplicate dashboard welcome behavior

## 2. Trend Summary Zone

### Purpose

- show whether performance is improving, stable, or dropping

### Required Content

- recent performance trend
- one clear interpretation line
- optional supporting metric cards

### Rules

- use simple trend visuals
- prioritize legibility over chart complexity

## 3. Subject Performance Zone

### Purpose

- show how the student is doing across subjects

### Required Content

- subject list or cards
- performance indicator
- clear comparison or ordering

### Rules

- keep the subject comparison easy to scan
- avoid dense multi-series charts unless clearly useful

## 4. Topic Performance Zone

### Purpose

- surface topic-level patterns that matter for improvement

### Required Content

- top weak topics
- strongest topics if useful
- severity or performance indicator

### Rules

- topic-level insight should lead to action, not just diagnosis
- do not overload with too many topics at once

## 5. Next Action Zone

### Purpose

- convert analytics into a concrete next step

### Primary CTA Examples

- `Practice Weak Areas`
- `Retry Subject Test`
- `Open Subject Catalog`

### Rules

- one clear action path should dominate
- do not make the screen purely observational

## Analytics Screen Data Model Expectations

The analytics screen should eventually consume backend contracts for:

- performance trend summary
- subject-level performance
- topic-level performance
- action recommendations

The screen must not guess:

- trend meaning
- weak-topic severity
- next recommendation

from frontend assumptions.

## Analytics Screen Visual Rules

The analytics screen should feel:

- intelligent
- calm
- clear
- actionable

It should not feel:

- overwhelming
- overly technical
- chart-first at the expense of understanding

### Visual Hierarchy

The page should visually prioritize:

1. trend direction
2. subject performance
3. topic-level action points
4. next action

## Analytics Screen Mobile Adaptation

On mobile, the analytics screen should keep this order:

1. intro
2. trend summary
3. subject performance
4. topic performance
5. next action

### Mobile Rules

- collapse complex comparison into simple stacked blocks
- limit chart density
- keep action prompts near insight blocks

## Analytics Screen Build Deliverables

Before coding the full analytics visuals, we should define:

- `StudentAnalyticsIntro`
- `StudentTrendSummaryCard`
- `StudentSubjectPerformancePanel`
- `StudentTopicPerformancePanel`
- `StudentAnalyticsNextActionBlock`

## Analytics Screen Approval Rule

We should approve the analytics screen if:

- the main trend is understandable quickly
- subject and topic patterns are easy to scan
- the screen suggests what to do next
- the experience stays calm and not chart-heavy

## Weak Areas Screen Content Specification

This section defines the actual center content of the weak areas screen inside the shared shell.

The weak areas screen is where the student sees concentrated improvement opportunities.

Its job is to answer:

- what am I weakest at
- how severe is it
- what should I practice next

## Weak Areas Screen Goals

The weak areas screen should help the student:

- identify top priority gaps
- understand which topics need attention first
- move immediately into targeted practice or retry

## Weak Areas Screen Content Zones

The weak areas center content should have these zones in order:

1. weak areas intro zone
2. priority weakness zone
3. weak topic list zone
4. action zone

## 1. Weak Areas Intro Zone

### Purpose

- frame the screen as a supportive improvement view

### Required Content

- page title
- one-line explanation
- optional current subject scope

### Rules

- keep the tone constructive
- avoid making the screen feel like a failure report

## 2. Priority Weakness Zone

### Purpose

- highlight the most important improvement opportunity

### Required Content

- top weak topic or domain
- severity indicator
- one-line explanation if available

### Rules

- only one primary weakness should be spotlighted
- keep the explanation concise

## 3. Weak Topic List Zone

### Purpose

- show the ranked list of areas needing work

### Required Content

- topic or domain name
- weakness percentage or severity
- supporting indicator or label
- optional direct action entry

### Rules

- rank in a meaningful order
- keep the list readable before decorative
- avoid showing too many items by default

## 4. Action Zone

### Purpose

- help the student act on the insight immediately

### Primary CTA Examples

- `Practice Topic`
- `Retry Test`
- `Open Subject Content`

### Secondary CTA Examples

- `View Related Tests`
- `See More Topics`

### Rules

- the screen must lead to action, not just diagnosis
- one clear path should dominate

## Weak Areas Data Model Expectations

The weak areas screen should eventually consume backend contracts for:

- ranked weak topics or domains
- weakness severity
- related practice or retry suggestions

The screen must not guess:

- which weakness is most important
- severity ordering
- what content best addresses the weakness

from frontend assumptions.

## Weak Areas Visual Rules

The weak areas screen should feel:

- supportive
- focused
- practical
- clear

It should not feel:

- punishing
- alarmist
- cluttered

### Visual Hierarchy

The page should visually prioritize:

1. top weakness
2. ranked weak-topic list
3. immediate next action

## Weak Areas Mobile Adaptation

On mobile, the weak areas screen should keep this order:

1. intro
2. top weakness
3. weak-topic list
4. action block

### Mobile Rules

- keep each weakness row compact
- use clear ranking and severity
- keep practice CTA close to the top of the flow

## Weak Areas Build Deliverables

Before coding the full weak areas visuals, we should define:

- `StudentWeakAreasIntro`
- `StudentTopWeaknessCard`
- `StudentWeakTopicList`
- `StudentWeakAreasActionBlock`

## Weak Areas Approval Rule

We should approve the weak areas screen if:

- the top weakness is instantly clear
- the list feels ranked and useful
- the student knows what to practice next
- the tone stays constructive and calm

### Global CSS Responsibilities

The global stylesheet should define:

- root design tokens
- page background treatment
- heading and body typography defaults
- default link and focus states
- layout container widths
- section spacing rhythm
- card surfaces
- button variants
- form input shell styles
- chip and pill styles
- list and table surface styles
- locked and premium state styles
- wallet and economy accent styles

### CSS Architecture

The global CSS layer should be organized conceptually like this:

1. root tokens
2. base reset and typography
3. layout primitives
4. shared surface primitives
5. interactive primitives
6. semantic state primitives
7. responsive adjustments

### Recommended Global Class Families

The new frontend should have consistent shared classes or equivalents for:

- `app-shell`
- `app-sidebar`
- `app-topbar`
- `app-footer`
- `app-content`
- `page-container`
- `page-section`
- `surface-card`
- `surface-card-soft`
- `surface-card-premium`
- `hero-card`
- `kpi-card`
- `timeline-list`
- `chip`
- `chip-active`
- `badge`
- `badge-success`
- `badge-warning`
- `badge-premium`
- `button-primary`
- `button-secondary`
- `button-quiet`
- `input-shell`
- `search-shell`
- `section-title`
- `section-subtitle`

### Styling Discipline

We should prefer:

- global reusable classes for repeated UI patterns
- local classes only for layout composition
- no one-off color decisions inside page files
- no inline hardcoded visual tokens in components

### Important Rule

If two screens need the same kind of:

- card
- button
- chip
- wallet block
- premium section
- activity list

they should inherit from the same global CSS primitive instead of being redesigned separately.

If two screens share the same shell area:

- sidebar
- header
- footer

they should use the exact same structural component, not separate lookalikes.

## Visual Benchmark

The design reference we are aiming for includes these layout characteristics:

- a slim left navigation rail
- a restrained top utility bar with search
- a generous welcome area
- two priority hero cards near the top
- a light filter or subject chip row
- available content separated clearly from locked content
- a warm premium section for locked items
- a calm analytics and activity row near the bottom

This should be treated as the baseline dashboard composition.

## Color Direction

### Base Palette

- page background: warm off-white
- secondary background: mist gray
- surface: white
- soft surface tint: cloud gray
- hero background wash: pale blue-white
- text primary: deep slate
- text secondary: muted slate
- border: pale gray

### Accent Palette

Use one restrained primary family:

- primary: muted blue
- primary strong: deep academic blue
- primary soft: pale blue wash

Use one support accent sparingly:

- support accent: soft teal or muted ink-blue

### Semantic Palette

- success: softened green
- warning: pale amber
- danger: muted terracotta red
- info: pale blue

### Economy Palette

Stars should not be bright yellow by default.

Use:

- star surface: soft sand
- star border: pale gold-beige
- star icon: warm brass
- premium locked state: parchment or stone tint

This keeps the economy visually premium without feeling noisy.

### Suggested First-Pass Palette

Use this palette for the first design pass:

- `--bg-page`: `#FAF8F4`
- `--bg-page-alt`: `#F5F7FB`
- `--bg-surface`: `#FFFFFF`
- `--bg-surface-soft`: `#F8FAFD`
- `--bg-hero-soft`: `#F6F9FF`
- `--bg-star-soft`: `#FFF6E8`
- `--bg-premium-soft`: `#FFF9EE`
- `--text-primary`: `#172033`
- `--text-secondary`: `#4B5873`
- `--text-muted`: `#7F8AA3`
- `--border-soft`: `#EEF2F7`
- `--border-default`: `#E3E8F2`
- `--brand-primary`: `#1F5FD6`
- `--brand-primary-strong`: `#174AA8`
- `--brand-primary-soft`: `#EAF2FF`
- `--brand-support`: `#6C8BC7`
- `--state-success`: `#7BC47F`
- `--state-success-soft`: `#EEF9EF`
- `--state-warning`: `#D9A441`
- `--state-warning-soft`: `#FFF6E4`
- `--state-danger`: `#D26A5C`
- `--state-danger-soft`: `#FFF0EE`
- `--state-info`: `#78A7E8`
- `--star-icon`: `#E2A93B`
- `--premium-border`: `#F0DFC1`

These tokens should be defined globally and consumed everywhere from the same source.

## Suggested Token Set

These are the token families we should use in the new frontend repo:

- `--bg-page`
- `--bg-page-alt`
- `--bg-surface`
- `--bg-surface-soft`
- `--bg-star-soft`
- `--bg-premium-soft`
- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--border-soft`
- `--border-default`
- `--brand-primary`
- `--brand-primary-strong`
- `--brand-primary-soft`
- `--state-success`
- `--state-warning`
- `--state-danger`
- `--state-info`

## Typography

### Personality

Typography should feel:

- scholarly
- contemporary
- human
- composed

### Recommended Pairing

- headings: `Plus Jakarta Sans` or `Sora`
- body: `Manrope` or `Inter`

Recommended first choice:

- headings: `Plus Jakarta Sans`
- body: `Manrope`

### Type Behavior

- page titles should feel confident but not dramatic
- card headings should be medium-to-semibold
- body copy should stay highly readable
- numeric values like scores and stars should be semibold, not oversized

### Scale Guidance

- display text only for marketing hero or key milestone moments
- dashboard and app pages should mostly live in a restrained `h1` to `body-sm` system

## Spacing

Use a 4px rhythm with generous breathing room.

Recommended app spacing behavior:

- card padding: comfortable, not tight
- section gap: clearly visible
- screen edge padding on mobile: relaxed
- desktop content width: centered and not too wide

## Radius

Use soft radii:

- buttons: medium
- inputs: medium
- cards: large
- modals: extra large
- pills: full

Nothing should feel overly sharp or overly bubbly.

Recommended first-pass values:

- sidebar active state: `14px`
- input and search shell: `18px`
- chip and pill: `999px`
- content card: `20px`
- hero card: `24px`
- modal: `28px`

## Elevation

Use shadows sparingly:

- low, soft shadows
- thin borders first
- shadow only when grouping matters

The product should look refined, not floating.

Recommended usage:

- main cards should rely on thin borders first
- shadows should be ambient and very soft
- top navigation and sidebar should feel mostly flat
- locked premium section should use background tint more than shadow

## Motion

Motion should be:

- quiet
- useful
- brief

Allowed:

- staggered page reveal
- hover lift on cards
- fade-slide for drawers and modals
- soft loading shimmer

Avoid:

- springy exaggerated motion
- bouncing counters
- flashy transitions on exam screens

## Iconography

Icons should be:

- simple
- outlined or lightly filled
- consistent stroke weight

Avoid cartoonish or playful icon sets.

## Illustration And Imagery

Marketing and empty states can use abstract academic visuals, but app screens should rely mostly on:

- layout clarity
- typography
- clean iconography

Student app screens should not depend on decorative illustration.

## Component Rules

### Buttons

We need:

- primary button
- secondary button
- tertiary text action
- quiet danger action

Primary buttons should be solid but muted, not electric.

Button styling should come from the global CSS layer, not individual screen CSS.

### Cards

We need:

- stat card
- action card
- content card
- locked content card
- timeline card
- ledger item card

Cards should clearly communicate state without heavy decoration.

Card families should behave like this:

- hero recommendation card: action-led, large, airy
- wallet card: premium but restrained
- available content card: clean white with soft border
- locked content card: warm tinted background
- progress card: analytical and quiet
- activity card: list-led and readable

All card families should inherit from shared global card primitives.

### Inputs

Inputs should feel:

- soft bordered
- calm on focus
- easy to scan

Focus state should use a subtle ring, not harsh glow.

Search bars, subject filters, and form fields should all come from the same global input system.

### Badges And Pills

We need consistent pills for:

- unlocked
- locked
- low stars
- active subscription
- pending result
- published result
- resumed attempt

### Empty States

Every empty state should answer:

- what this area is for
- why nothing is showing
- what to do next

## Accessibility Rules

- maintain clear contrast for core text
- avoid relying on color alone for lock, result, or risk states
- keep tap targets comfortable on mobile
- keep exam controls keyboard-friendly on web
- keep finance and star information legible and structured

## Part 2. Screen-By-Screen UX Specifications

## 1. Public Landing

### Goal

Introduce Nexora as a calm, credible student product.

### Must Communicate

- who it is for
- what it helps with
- why it feels trustworthy
- how to start

### Main Actions

- create account
- sign in
- explore practice and assessments

### Tone

Soft premium, not startup-loud.

## 2. Registration And Login

### Goal

Reduce friction and make the first interaction feel safe.

### UX Rules

- minimal fields first
- clear role direction from backend
- calm reassurance copy
- no unnecessary promotional clutter

### Main Actions

- sign up
- log in
- continue to student workspace

## 3. Student Dashboard

### Goal

Act as the first meaningful product surface after login.

### Must Show

- welcome and student context
- current stars
- current learning lane or subject lane
- next recommended action
- available content
- locked content with reason
- recent progress

### Visual Intent

The dashboard should look like:

- an academic home screen
- not a KPI-heavy admin dashboard
- not a marketplace
- not a generic exam table page

### Main Actions

- start test
- resume test
- explore subject
- buy stars

## 4. Subject Catalog

### Goal

Help the student browse what is available by subject and content type.

### Must Show

- subject switcher
- free vs locked vs unlocked items
- content labels
- star cost where relevant
- lock reason

### Main Actions

- open detail
- unlock with stars
- buy stars if needed

## 5. Test Detail

### Goal

Answer immediately:

- can I access this
- why or why not
- what happens if I start

### Must Show

- availability state
- attempt rules
- timing and question count
- stars requirement if applicable
- result and review policy summary if relevant

### Main Actions

- start
- resume
- unlock
- go to wallet

## 6. Attempt Screen

### Goal

Provide a serious, distraction-free assessment environment.

### Must Show

- timer
- progress
- section or question navigation
- save state
- submit state

### UX Rules

- keep contrast steady
- avoid decorative side content
- no commercial prompts

## 7. Attempt Summary

### Goal

Support the transition from submission to outcome.

### Must Show

- submission confirmation
- attempt summary
- result state if available
- next valid route

### Main Actions

- view result
- review answers if available
- return to dashboard

## 8. Results

### Goal

Make outcomes legible and emotionally steady.

### Must Show

- score
- status
- strengths
- weak zones
- review availability
- next best study action

### UX Rules

- no harsh failure styling
- use supportive guidance

## 9. Analytics

### Goal

Explain progress without overwhelming the student.

### Must Show

- trend
- subject performance
- topic performance
- recent outcome summary
- improvement opportunities

### Main Actions

- retry
- practice weak area
- take next test

## 10. Weak Areas

### Goal

Turn weakness data into actionable next steps.

### Must Show

- topic or domain weakness
- severity
- linked practice options
- last seen evidence

### Main Actions

- practice topic
- retry exam
- open related subject content

## 11. Wallet

### Goal

Make the star economy transparent and trustworthy.

### Must Show

- available stars
- earned vs paid vs subscription breakdown
- recent ledger activity
- unlock history
- available packs
- available subscription plans

### UX Rules

- use financial clarity
- avoid flashy reward presentation
- explain changes with plain labels

### Main Actions

- buy stars
- view ledger
- view unlock history
- use stars on content

## 12. Purchase And Subscription

### Goal

Help the student understand value without pressure.

### Must Show

- current stars
- pack value
- plan value
- how stars help unlock content
- purchase status

### UX Rules

- no fake scarcity
- no countdown gimmicks
- no hardcoded commercial messages

## 13. Notifications

### Goal

Keep notifications useful and calm.

### Must Show

- exam reminders
- result publication
- reward events
- unlock events
- purchase completion

### Main Actions

- open related screen
- mark read

## 14. Settings

### Goal

Keep settings small, truthful, and useful.

### Must Show

- account summary
- academic context
- session actions
- any persisted preferences only if backend-supported

## Part 3. First Page Structure

## A. Dashboard Page Structure

## Desktop

### 1. Top Welcome Strip

Contents:

- student name
- current class or program context
- current subject lane or overall lane
- one-line next action guidance

Purpose:

- orient the student instantly

Visual notes:

- use a large calm heading
- keep the sub-context line tight and light
- allow a subtle academic illustration or soft decorative visual at the right

### 2. Priority Row

Two-column emphasis area:

- left: next recommended test card
- right: star wallet summary card

The wallet summary should show:

- available stars
- short explanation of what stars can do
- primary action to open wallet or buy stars

Visual notes:

- both hero cards should feel balanced
- recommended card should be the learning driver
- wallet card should feel premium but calm
- avoid oversized star iconography

### 3. Subject Switch And Filter Bar

Contents:

- subject selector
- content type tabs
- availability filter

Purpose:

- let the student move from overview to focused lane

Visual notes:

- chips should be rounded and light
- active state should use soft blue fill
- availability filter should sit quietly at the edge

### 4. Available Content Section

Card grid or stacked list for:

- ready now
- resume now
- recommended next

Each card should show:

- title
- type
- subject
- short metadata
- main action

Visual notes:

- place small state badges at the top
- keep metadata on one clean row
- anchor CTA consistently at card bottom

### 5. Locked Content Section

Separate visual group for locked items.

Each item should show:

- title
- required stars or access condition
- lock reason
- unlock action if eligible

Visual notes:

- wrap the section in a warm cream container
- locked cards should feel premium, not disabled
- include one explainer card such as `Why is this locked?`

### 6. Progress Section

Two-column section:

- recent results and outcomes
- weak area snapshot

Visual notes:

- use clean summary visuals
- avoid crowded charting
- keep weak areas readable first, visual second

### 7. Activity Section

Latest meaningful activity:

- rewards earned
- unlocked content
- recent attempts

Visual notes:

- render as a clean timeline or list
- timestamps should stay secondary
- star gains and spends should be distinct but understated

## Mobile

Stack order:

1. welcome strip
2. next recommended test
3. wallet summary
4. subject switcher
5. available content
6. locked content
7. recent progress
8. latest activity

## Dashboard Data Contract Expectations

This screen should eventually consume:

- student context API
- dashboard recommendation API
- economy wallet summary
- unlock state summary
- recent results summary

It must not infer unlock state from local rules.

## B. Wallet Page Structure

## Desktop

### 1. Wallet Header

Contents:

- page title
- short explanation of stars
- current available stars

### 2. Balance Summary Row

Cards:

- available stars
- lifetime earned
- lifetime spent
- paid stars
- subscription stars

### 3. Purchase Section

Two groups:

- star packs
- subscription plans

Each card should show only backend-driven values:

- name
- description if provided
- stars credited
- price
- cycle if applicable

Visual notes:

- packs should feel clear and financial
- subscriptions should explain rhythm and value without pressure
- visual treatment should match the dashboard wallet card

### 4. Ledger Section

Structured list or table for recent star activity.

Each row should show:

- action label
- source type
- stars delta
- resulting balance
- timestamp

### 5. Unlock History Section

Show recent content unlocked through star spend or entitlement.

### 6. Context Help Section

Explain in plain language:

- how stars are earned
- how stars are spent
- how subscriptions contribute stars

This help text should be product-controlled, not fake dynamic logic.

## Mobile

Stack order:

1. wallet header
2. available stars card
3. balance summary cards
4. star packs
5. subscription plans
6. recent ledger
7. unlock history

## Wallet Data Contract Expectations

This screen should rely on:

- `GET /api/v1/economy/wallet/`
- `GET /api/v1/economy/ledger/`
- `GET /api/v1/economy/unlocks/`
- `GET /api/v1/economy/star-packs/`
- `GET /api/v1/economy/subscription-plans/`
- `GET /api/v1/economy/orders/`
- `GET /api/v1/economy/subscriptions/`

## Recommended Frontend Build Order

Before visual polish, the new student frontend should define:

1. theme tokens
2. global CSS primitives
3. app shell
4. dashboard layout blocks
5. wallet layout blocks
6. subject catalog layout blocks
7. test detail layout blocks
8. shared cards, pills, and state messaging

## Final Rule

We should not jump into high-fidelity screen design until:

- the new frontend repo direction is fixed
- this design system is accepted
- the dashboard and wallet information hierarchy is accepted
- backend-driven economy contracts remain the source of truth

When we start high-fidelity screen design, the outcome should clearly resemble:

- a sober academic dashboard
- a modern card-led workspace
- a calm wallet and premium zone
- a soft, spacious student-first layout

And all of that should come from one shared global CSS system so every screen feels like the same product.
