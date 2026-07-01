# Nexora Frontend UI/UX Blueprint

## Objective

This document defines the UI/UX planning direction for the Nexora web portal and mobile app before implementation starts.

The goal is to build:

- a modern marketing website in Next.js
- a student-first web portal in Next.js
- a focused mobile app in React Native
- a clean, professional, premium exam-tech visual system

This plan is aligned with the current backend architecture already available in the Django API.

## Product Direction

Nexora should feel:

- modern
- professional
- trustworthy
- aspirational
- analytics-driven
- student-friendly

The product should not look like a generic admin dashboard. It should feel like a polished learning and exam readiness platform.

## Primary Product Focus

Phase 1 priority users:

- student
- learner
- certification aspirant

Later expansion:

- teacher
- institute admin
- parent

## Design Language

### Visual Tone

- bright and clean base
- soft atmospheric gradients
- premium card-based surfaces
- strong typography
- subtle shadows
- rounded corners
- minimal clutter

### Experience Goals

- easy to scan
- high readability
- strong confidence during test-taking
- clear analytics storytelling
- visually calm during stressful exam flows

## Color System

Recommended base palette:

- `Background`: `#F8FAFC`
- `Surface`: `#FFFFFF`
- `Surface Soft`: `#F1F5F9`
- `Text Strong`: `#0F172A`
- `Text Soft`: `#475569`
- `Border`: `#E2E8F0`
- `Primary`: `#2563EB`
- `Primary Strong`: `#1D4ED8`
- `Accent`: `#4F46E5`
- `Success`: `#16A34A`
- `Warning`: `#F59E0B`
- `Danger`: `#EF4444`

Usage guidance:

- use blue as the core interaction color
- use accent sparingly for emphasis and premium feel
- use green, amber, and red only for performance or state signals
- keep backgrounds light and breathable

## Typography

Recommended pairing:

- headings: `Plus Jakarta Sans` or `Sora`
- body and UI text: `Inter` or `Manrope`

Typography intent:

- bold, confident headlines
- soft but readable body text
- semibold numeric highlights for scores, charts, and readiness metrics

## Core Visual Rules

- avoid flat, lifeless white pages
- use subtle gradients in hero and CTA sections
- maintain generous spacing
- use light borders with restrained shadows
- keep cards consistent in radius and spacing
- prioritize readability over decoration
- avoid overusing saturated colors

## Platform Split

### Web

Built in Next.js for:

- marketing website
- authentication
- student dashboard
- exam browsing
- exam attempt workspace
- results and analytics
- later teacher and admin workflows

### Mobile

Built in React Native for:

- quick access dashboard
- mock test browsing
- practice
- result viewing
- weak area improvement
- notifications and progress tracking

## Web Information Architecture

### Public Marketing Pages

- `/`
- `/exams`
- `/schools`
- `/professionals`
- `/pricing`
- `/resources`
- `/about`
- `/login`
- `/signup`

### Student Application Pages

- `/app/dashboard`
- `/app/exams`
- `/app/exams/[id]`
- `/app/attempts/[id]`
- `/app/results`
- `/app/results/[id]`
- `/app/analytics`
- `/app/weak-areas`
- `/app/bookmarks`
- `/app/notifications`
- `/app/settings`

### Later Management Pages

- `/app/manage/questions`
- `/app/manage/exams`
- `/app/manage/results`
- `/app/manage/students`

## Mobile Information Architecture

### Bottom Navigation

- `Home`
- `Tests`
- `Practice`
- `Analytics`
- `Profile`

### Main Mobile Screens

- home dashboard
- mock test list
- exam detail
- attempt screen
- result screen
- analytics
- weak areas
- notifications
- profile and settings

## Shared Component Inventory

### Layout

- navbar
- sidebar
- mobile bottom navigation
- page header
- section header
- breadcrumb

### Inputs and Controls

- text input
- password field
- search field
- select
- segmented tabs
- checkbox
- radio options
- toggle switch
- filter chips

### Feedback and Utility

- modal
- drawer
- toast
- empty state
- skeleton loader
- pagination
- status badge

### Core Cards

- metric card
- exam card
- result summary card
- domain performance card
- weak area card
- notification card
- CTA card

### Assessment Components

- question panel
- option card
- timer badge
- mark-for-review control
- question palette
- section switcher
- progress tracker
- submit confirmation modal

### Analytics Components

- line chart
- donut chart
- horizontal performance bars
- readiness score card
- pass probability card
- topic breakdown list

## Web Screen Planning

### 1. Landing Page

Sections:

- top navigation
- hero with strong headline and dashboard preview
- trust bar with company or learner logos
- audience category cards
- popular exam categories
- key metrics strip
- final CTA section

Purpose:

- establish trust quickly
- communicate product breadth
- position Nexora as serious and premium

### 2. Login and Signup

Layout:

- clean split screen or centered card
- simple forms
- optional product value panel

Purpose:

- low-friction onboarding
- consistent, trusted auth experience

### 3. Student Dashboard

Sections:

- greeting header
- readiness score
- pass probability
- current exam card
- domain-wise performance
- recent mock tests
- quick actions
- notifications preview

Purpose:

- immediate progress visibility
- fast access to next action

### 4. Exam List

Sections:

- page heading
- search
- filters
- tabs for status
- list or grid of exams

Purpose:

- help users find the right exam fast
- distinguish scheduled, live, and past tests

### 5. Exam Detail

Sections:

- exam title and metadata
- instructions
- duration
- attempts left
- review policy
- result visibility
- start test CTA

Purpose:

- reduce uncertainty before starting
- prepare the user clearly

### 6. Attempt Workspace

Desktop layout:

- top header with timer and status
- central question panel
- right-side question palette
- bottom or inline navigation controls

Mobile layout:

- compact top timer
- stacked question content
- fixed bottom actions

Purpose:

- maximize focus
- reduce confusion
- support confidence during timed exams

### 7. Results Screen

Sections:

- score summary
- pass/fail state
- time taken
- correct, incorrect, skipped
- rank if available
- CTA to detailed analysis

Purpose:

- provide clarity and emotional closure
- move user naturally into learning insights

### 8. Analytics Screen

Sections:

- score trend
- average score
- highest score
- pass probability
- domain strengths and weaknesses
- recent performance comparison

Purpose:

- convert raw results into improvement insight

### 9. Weak Areas Screen

Sections:

- list of weak topics
- severity indicator
- topic score or trend
- practice CTA per topic

Purpose:

- create a clear improvement workflow

## Mobile Screen Planning

### 1. Home Dashboard

Sections:

- greeting
- readiness circle
- pass probability
- quick actions
- recent tests
- compact progress cards

### 2. Mock Test List

Sections:

- filter tabs
- test cards
- status and score tags
- start test CTA

### 3. Test Screen

Sections:

- timer
- progress
- question content
- answer options
- previous and next controls
- mark for review

### 4. Result Screen

Sections:

- score ring
- pass/fail status
- test summary
- question summary
- CTA to detailed analysis

### 5. Analytics Screen

Sections:

- trend charts
- average score
- domain bars
- score changes over time

### 6. Weak Areas Screen

Sections:

- ranked weak topics
- progress severity
- practice actions

## Backend Endpoint Mapping

### Authentication

- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/refresh/`
- `GET /api/v1/auth/me/`

### Student Dashboard and Exams

- `GET /api/v1/student/exams/available/`
- `GET /api/v1/student/results/`
- `GET /api/v1/student/insights/summary/`
- `GET /api/v1/student/attempts/`
- `GET /api/v1/student/exams/{exam_id}/detail/`

### Attempt Flow

- `POST /api/v1/attempts/start/`
- `GET /api/v1/attempts/{id}/detail/`
- `POST /api/v1/attempts/{id}/save-answer/`
- `POST /api/v1/attempts/{id}/switch-section/`
- `POST /api/v1/attempts/{id}/submit/`
- `GET /api/v1/attempts/{id}/summary/`
- `GET /api/v1/attempts/{id}/review/`

### Results and Analytics

- `GET /api/v1/results/student/{student_id}/performance/`
- `GET /api/v1/results/exam/{exam_id}/leaderboard/`
- `GET /api/v1/results/topic-performance/`
- `GET /api/v1/results/exam-summary/`

### Notifications

- `GET /api/v1/notifications/`
- `POST /api/v1/notifications/{notification_id}/mark-read/`
- `POST /api/v1/notifications/mark-all-read/`
- `GET /api/v1/notifications/unread-count/`

## Frontend Architecture Recommendation

### Next.js Structure

- `app/(marketing)` for public pages
- `app/(auth)` for login and signup
- `app/(student)` for student product flows
- `components/ui` for the design system
- `features/auth`
- `features/exams`
- `features/attempts`
- `features/results`
- `features/analytics`

### React Native Structure

- `features/auth`
- `features/dashboard`
- `features/tests`
- `features/attempts`
- `features/results`
- `features/analytics`
- `features/profile`
- shared `ui`
- shared `theme`
- shared `api`

## State Strategy

Recommended:

- TanStack Query for server state
- lightweight global auth store for session
- local feature state for active attempt runtime

Why:

- backend is already API-driven
- exam state needs careful handling
- analytics and dashboard data are ideal for query caching

## Implementation Order

### Phase 1

- finalize design tokens
- finalize type system
- finalize component rules

### Phase 2

- build landing page
- build auth flow

### Phase 3

- build student dashboard
- build exam listing
- build exam detail

### Phase 4

- build attempt workspace
- build results
- build analytics
- build weak areas

### Phase 5

- build mobile app screens on the same API contracts

### Phase 6

- build teacher and admin interfaces

## Product Strategy Guidance

For the first visible version, the student journey should define the quality bar.

That means:

- the landing page must feel premium
- authentication must feel clean
- the dashboard must feel intelligent
- the attempt workspace must feel focused and reliable
- results and analytics must feel useful, not decorative

Admin-heavy interfaces should not shape the first impression of the product.

## Immediate Next Planning Tasks

Before coding starts, the next recommended planning outputs are:

1. final brand palette and gradients
2. font decision
3. desktop and mobile spacing scale
4. component design tokens
5. web screen-by-screen wireframe spec
6. mobile screen-by-screen wireframe spec
7. backend endpoint mapping by screen

## Summary

Nexora is ready to move into frontend planning with a strong student-first product direction.

The backend already supports the core experience needed for:

- authentication
- student dashboard
- exam discovery
- attempt flow
- results
- analytics
- notifications

The frontend should now be designed as a polished exam-tech platform with a cohesive design system across web and mobile.
