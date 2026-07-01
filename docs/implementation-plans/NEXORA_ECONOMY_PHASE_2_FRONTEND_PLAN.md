# NEXORA Economy Phase 2 Frontend Plan

## Purpose

This document defines Phase 2 of the Nexora economy rollout from a frontend point of view.

Phase 1 establishes the backend economy defaults and seed data.

Phase 2 makes those defaults visible and usable across the student-facing product without hardcoding star values, pack values, or subscription assumptions in the UI.

## Phase 2 Goal

Make the star economy feel real and guided inside the product.

That means:

- students should understand where stars come from
- students should understand where stars can be used
- locked premium content should clearly explain why it is locked
- wallet, packs, subscriptions, and unlocks should all come from backend APIs
- no screen should show static pricing or static star numbers

## Phase 2 Scope

Phase 2 should focus on student-facing screens first.

We should not expand to teacher, parent, or institute economy editing in this phase except where those roles already set content access policy.

## Core Backend Inputs Used by Phase 2

The frontend should only consume backend-driven economy data from:

- wallet summary
- star ledger
- reward history
- unlock state history
- star packs
- subscription plans
- student subscriptions
- payment orders
- content access policy outcome on exams and practice content

## Screen Review

The current student app already has these economy-aware screens or hooks:

- `/app/dashboard`
- `/app/exams`
- `/app/exams/[examId]`
- `/app/results`
- `/app/attempts`
- `/app/weak-areas`
- `/app/wallet`
- `/app/subscriptions`
- global topbar wallet pill in student layout

This means Phase 2 is not about inventing new screens first.

It is about tightening the economy experience across these existing screens.

## Phase 2 Frontend Priorities

### Priority A: Dashboard Economy Readiness

Screen:

- `/app/dashboard`

What should be shown:

- live available stars
- recommended premium content with unlock labels
- clear CTA to wallet when balance is low
- clear CTA to unlock when balance is enough
- reward visibility for recent earned stars

Required behaviors:

- if content is free, show normal start action
- if content is locked and unlockable with stars, show star cost
- if content is locked by entitlement, show subscription or plan guidance
- if content is already unlocked, show unlocked state, not cost again

UI expectations:

- keep wallet card compact and high visibility
- premium explanation should be short and clear
- avoid technical backend words like `entitlement_only`

Suggested labels:

- `Free`
- `Unlocked`
- `Unlock with 100 stars`
- `Included in subscription`
- `Not available yet`

### Priority B: Exam Listing and Exam Detail

Screens:

- `/app/exams`
- `/app/exams/[examId]`

What should be shown:

- access state for every exam
- star cost when applicable
- unlock reason when applicable
- one-click unlock when policy allows spending stars
- redirect path to wallet/subscription page when direct unlock is not possible

Required behaviors:

- access state must come from backend `economy_access`
- no screen should compute its own star cost
- exam detail page should explain why an exam is locked
- exam detail page should explain whether spending stars is permanent for that exam

UI expectations:

- status pill near exam CTA
- helper line under CTA
- if balance is insufficient, show how many more stars are needed

Suggested helper messages:

- `This mock test needs 200 stars before it can be started.`
- `You already unlocked this exam.`
- `This exam is included in your active subscription.`
- `You need 75 more stars to unlock this exam.`

### Priority C: Wallet as Central Economy Hub

Screen:

- `/app/wallet`

This is the main Phase 2 economy anchor screen.

What should be shown:

- current wallet balance
- lifetime earned and spent
- recent rewards
- recent ledger activity
- unlock history
- star packs
- subscription plan previews
- order history

Required behaviors:

- all numeric values come from backend
- all pack cards come from backend seed data
- all subscription cards come from backend seed data
- reward rows should explain trigger type in simple language
- ledger rows should group and sort clearly

UI expectations:

- separate sections for:
  - `Balance`
  - `Earned`
  - `Spent`
  - `Buy stars`
  - `Subscriptions`
  - `Recent activity`
  - `Unlocked content`

Phase 2 wallet polish:

- promote latest reward event near the top
- explain pending purchase orders more clearly
- explain that payment settlement is pending if provider automation is not active yet

### Priority D: Subscription Conversion Flow

Screen:

- `/app/subscriptions`

What should be shown:

- live subscription options
- cycle price
- stars credited on activation
- stars credited on renewal
- active subscriptions
- subscription order states

Required behaviors:

- all plan values come from backend
- no static monthly/yearly assumptions in frontend
- if active subscription exists, highlight included access value
- if no subscription exists, show comparison with wallet purchase route

UI expectations:

- make this screen decision-oriented, not ledger-heavy
- show `best for regular learners` style guidance
- show value summary:
  - price
  - stars credited
  - access implication

Suggested UX blocks:

- `Your current subscription`
- `Available plans`
- `Pending orders`
- `Why subscribe instead of buying stars each time?`

### Priority E: Unlock Follow-up in Results, Attempts, Weak Areas

Screens:

- `/app/results`
- `/app/attempts`
- `/app/weak-areas`

What should be shown:

- premium next-step practice recommendations
- unlock CTA for follow-up content
- star cost if locked
- unlocked state if already purchased

Required behaviors:

- follow-up practice card should respect backend unlock state
- if unlock is not possible through stars, show correct guidance
- after unlock, screen should refresh and show live unlocked state

UI expectations:

- keep these prompts contextual, not sales-heavy
- connect the recommendation with the student’s weakness or recent result

Suggested prompt examples:

- `Practice this weak area with a premium set`
- `Unlock targeted algebra practice for 80 stars`
- `Already unlocked. Start now`

## Phase 2 Non-Student Support Screens

These are lower priority in this phase but still relevant:

### Teacher Exam Builder

Screens:

- `/teacher/exams/[examId]`
- create exam wizard

Teacher should be able to:

- set whether exam is free
- set star-based unlock
- set entitlement-only access
- set stars-or-entitlement access

Phase 2 expectation:

- keep policy controls guided and simpler
- reduce technical confusion around policy labels
- make teacher understand learner impact before saving

### Admin Economy Workspace

Screens:

- `/admin/economy`
- admin economy workspace

Phase 2 expectation:

- keep these as operational tools
- not the main focus of this phase
- useful for QA and support

## Phase 2 UX Rules

### Rule 1: Never Show Backend Terms Directly

Do not show raw values like:

- `stars_or_entitlement`
- `entitlement_only`
- `unlock_state_status`

Convert them into user-friendly labels.

### Rule 2: Explain Missing Requirement

If content is locked, always explain:

- what is required
- whether stars can solve it
- what the next best action is

### Rule 3: Keep Unlock Decisions Local

Unlock CTAs should appear at the point where the student wants the content.

Examples:

- dashboard card
- exam list item
- weak-area recommendation
- results follow-up card

Do not force every unlock journey through the wallet page.

### Rule 4: Wallet Is the Source of Clarity

All detailed economy explanation should live in wallet and subscriptions.

Other screens should stay compact and action-driven.

### Rule 5: Reward Moments Must Feel Positive

When a student earns stars:

- reward card should be visible
- wallet should reflect it immediately
- dashboard should surface recent progress value

## Phase 2 API Dependence Matrix

| Screen | Backend Need | Must Be Dynamic |
|---|---|---|
| Dashboard | wallet summary, recommended exams with economy access | Yes |
| Exams list | exam economy access | Yes |
| Exam detail | content policy outcome, unlock state | Yes |
| Wallet | wallet, ledger, rewards, unlocks, packs, orders, plans, subscriptions | Yes |
| Subscriptions | plans, cycles, credit rules, active subs, orders | Yes |
| Results | follow-up unlock action | Yes |
| Attempts | premium follow-up unlock action | Yes |
| Weak areas | targeted premium practice unlock action | Yes |

## Phase 2 Implementation Sequence

### Step 1

Stabilize backend seed data:

- signup reward
- referral program
- star packs
- subscription plans
- subscription credit rules
- base content access policies

### Step 2

Polish wallet and subscriptions pages so the seeded data is clearly visible and trustworthy.

### Step 3

Polish dashboard and exams listing so content unlock state is obvious and guided.

### Step 4

Polish contextual unlocks in results, attempts, and weak areas.

### Step 5

Polish teacher-facing policy configuration language so premium gating remains understandable at authoring time.

## Phase 2 Acceptance Criteria

Phase 2 can be considered complete when:

1. every student-facing economy number is backend-driven
2. no screen shows static star pack or subscription values
3. locked content always explains why it is locked
4. unlockable content always provides the correct next action
5. wallet, packs, and subscriptions are coherent and visually consistent
6. reward earning feels visible, not hidden
7. teacher-set premium policies are reflected accurately in student screens

## Recommended Immediate Next Work

After this plan, the first frontend implementation pass should focus on:

1. wallet screen polish
2. subscription screen polish
3. dashboard premium content guidance
4. exams list and exam detail unlock clarity

That gives the student the full economy journey:

- earn stars
- see stars
- understand stars
- spend stars
- choose subscription vs pack
- unlock premium content confidently

