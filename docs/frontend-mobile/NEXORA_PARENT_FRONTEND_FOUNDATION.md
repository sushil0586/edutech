# Nexora Parent Frontend Foundation

## Purpose

This file defines how the parent section should look and behave before feature implementation starts.

The parent module must visually belong to the same family as student, teacher, and institute.

## Product Tone

The parent product should feel:

- calm
- sober
- warm
- trustworthy
- supportive
- easy to understand

It should not feel:

- operationally dense
- corporate admin-heavy
- childish
- gamified
- monetization-first

## Foundational Rules

### 1. Same Global CSS System

Parent must reuse the same global CSS foundation already used by student, teacher, and institute.

That means:

- same shell primitives
- same page spacing system
- same button language
- same card language
- same metric card language
- same empty-state language

### 2. Simplicity Over Density

Parent screens should prefer:

- summaries over raw detail
- explanations over operational jargon
- clear callouts over dense controls

The parent role should feel reassuring, not overwhelming.

### 3. Child Context Must Stay Clear

Whenever a parent screen shows child data, it must always make clear:

- which child is selected
- what timeframe the information covers
- whether the information is complete or partial

### 4. No Fake Alerts

The frontend must not hardcode:

- alert counts
- weak-area severity
- progress movement
- wallet or star balances
- recent results

All such values must come from backend-approved parent-safe APIs.

## Shared Shell Strategy

The parent product should use one shared application shell across authenticated parent screens.

That means:

1. persistent left sidebar
2. persistent top header
3. central content canvas
4. persistent footer rhythm

Only the central content should change between routes.

## Sidebar Direction

The parent sidebar direction is now partially implemented and should support:

- Dashboard
- Children
- Progress
- Alerts
- Settings

Still planned for later if product scope approves it:

- Wallet

Not every route must ship immediately, but the navigation direction should be intentional from the start.

## Topbar Contract

The parent topbar should provide:

- role label
- current child context where relevant
- optional quick actions
- same global visual tone as other Nexora roles

## Screen Types

Parent screens will mostly fall into four patterns:

### 1. Family dashboard

Use:

- welcome summary
- linked-child cards
- alert summary
- progress snapshot

### 2. Child detail visibility

Use:

- selected-child overview
- recent results
- weak-area summary
- support guidance

### 3. Alert and summary workspace

Use:

- alert cards
- severity grouping
- digest summaries
- recent changes

### 4. Settings page

Use:

- notification preferences
- linked-account visibility
- quiet explanatory content

## UX Principles

- support first
- low-friction navigation
- one obvious next action per screen
- no operational clutter
- calm reading flow
- role scope always understandable

## Route-Level UX Direction

### Dashboard

- linked-child summary first
- alerts second
- recent performance movement third

### Children

- easy switching between children
- clear academic and access context

### Progress

- score trend
- recent exams
- weak subjects and topics

### Alerts

- important risks first
- improvements second
- weekly summary access third
- alert status actions should remain available directly inside the alert feed

### Wallet

- visibility only where parent-safe and intentionally exposed
- no fake commerce actions

### Settings

- backend-saved notification preferences
- linked-account guidance
- family-support controls

## Current Implementation Snapshot

The current parent frontend already follows this foundation through:

- shared sidebar and topbar shell
- shared page-header and card system
- shared empty-state and status-pill patterns
- backend-driven dashboard, children, progress, alerts, and settings pages
- child-switching behavior inside the parent workspace

The remaining parent frontend work should focus on:

- wallet visibility only if a parent-safe backend contract is approved
- weekly digest presentation once delivery logic exists
- any future route-specific refinements without drifting from the shared UI system

## Reuse Rules

Parent frontend should reuse:

- shared workspace shell
- shared page headers
- shared status pills
- shared metric and dashboard cards
- shared empty-state patterns

Parent frontend should not reuse:

- dense teacher operational patterns
- institute management framing
- student purchase-first emphasis

## Implementation Constraint

Every new parent route should be checked against:

- student design system
- actual parent role scope
- available backend parent-safe contracts

If a parent screen visually drifts from the shared system or functionally exceeds its role boundary, it should be corrected before expansion.
