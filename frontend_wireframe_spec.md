# Nexora Frontend Wireframe Specification

## Purpose

This document translates the UI/UX blueprint into page-level wireframe guidance for the Nexora web portal and mobile app.

It is intended to help with:

- frontend planning
- design handoff
- component breakdown
- API mapping by screen
- implementation sequencing

This is a structural specification, not a final visual design file.

## Design Principles

Every page should follow these rules:

- clear visual hierarchy
- strong spacing and readability
- action-first layout
- analytics that are easy to scan
- low cognitive load during exam flows
- consistency between web and mobile

## Global Layout Rules

### Web

- use a centered content container for marketing pages
- use app-shell layout for logged-in pages
- sidebar for student app on desktop
- top header with profile, notifications, and page actions
- cards should align to a consistent grid
- analytics sections should avoid deep nesting

### Mobile

- use bottom navigation for primary student flows
- keep each screen focused on one main task
- use compact cards with strong tap targets
- avoid long dense blocks of text
- keep action buttons anchored when possible

## Web Wireframes

## 1. Marketing Home Page

### Goal

Introduce Nexora as a premium exam readiness platform and convert users to sign up or explore exams.

### Section Structure

#### A. Top Navigation

Contents:

- Nexora logo
- Home
- Exams
- For Schools
- For Professionals
- Pricing
- Resources
- About
- Login
- Sign Up Free

Behavior:

- sticky on scroll
- light background blur on scroll

#### B. Hero Section

Left side:

- trust pill such as "All-in-One Exam Readiness Platform"
- main headline
- supporting paragraph
- 3 quick value bullets
- primary CTA
- secondary CTA
- trust micro proof like learner count and rating

Right side:

- mock dashboard product preview
- layered gradient shapes behind preview

#### C. Trust Logos Section

Contents:

- row of brand or institution logos
- short line about trusted organizations

#### D. Product Categories Section

3-card layout:

- School Students
- Competitive Exams
- Professionals

Each card includes:

- icon
- audience title
- supported exams
- 4 to 5 benefits
- CTA button

#### E. Stats Band

Horizontal metrics strip:

- active learners
- tests attempted
- exams covered
- success rate

#### F. Popular Exam Categories

Card carousel or grid:

- exam logo/icon
- exam title
- subtitle
- mock tests count
- questions count
- CTA

#### G. Final CTA Banner

Contents:

- strong action headline
- supporting copy
- primary CTA
- secondary CTA

### Components Needed

- marketing navbar
- hero CTA buttons
- stat tiles
- category cards
- exam cards
- trust logo row
- CTA banner

## 2. Login Page

### Goal

Allow fast and low-friction login for students and professionals.

### Layout

- centered auth card or split layout

Left panel optional:

- short value proposition
- analytics preview or testimonial

Right panel:

- logo
- heading
- email or username
- password
- forgot password link
- login button
- signup link

### Components Needed

- auth card
- input fields
- password field
- submit button
- inline error state

### API

- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/refresh/`
- `GET /api/v1/auth/me/`

## 3. Student Dashboard

### Goal

Show readiness, next actions, ongoing progress, and recent activity immediately after login.

### Desktop Layout

#### A. Sidebar

Links:

- Dashboard
- My Exams
- Mock Tests
- Practice
- Analytics
- Weak Areas
- Bookmarks
- Plans and Billing
- Settings
- Logout

#### B. Top Header

Contents:

- page title
- welcome text
- notifications icon
- profile avatar

#### C. Summary Cards Row

Cards:

- overall readiness
- estimated pass probability
- current exam

#### D. Performance Section

Left:

- domain-wise performance list with progress bars

Right:

- recent mock tests list

#### E. Quick Actions Row

Actions:

- start practice
- explore exams
- review weak areas
- continue last test

#### F. Notifications Preview

- latest 3 notifications

### Mobile Layout

Top:

- greeting
- notification icon

Main content:

- readiness card
- pass probability card
- quick action tiles
- recent tests
- weak area preview

### Components Needed

- app sidebar
- dashboard summary cards
- performance bars
- quick action buttons
- recent activity list
- notification preview cards

### API

- `GET /api/v1/student/insights/summary/`
- `GET /api/v1/student/exams/available/`
- `GET /api/v1/student/attempts/`
- `GET /api/v1/student/results/`
- `GET /api/v1/notifications/unread-count/`

## 4. Exams Listing Page

### Goal

Help users browse available exams and decide what to attempt next.

### Desktop Layout

#### A. Page Header

- title
- subtitle
- search field

#### B. Filter Row

- status tabs: all, scheduled, live, completed
- exam type dropdown
- sort dropdown

#### C. Main Results Area

Display as cards or table-style list:

- exam name
- category
- duration
- attempts left
- availability window
- status badge
- CTA

### Mobile Layout

- top search
- horizontal filter chips
- compact stacked exam cards

### Components Needed

- search input
- filter chips
- exam availability badge
- exam cards

### API

- `GET /api/v1/student/exams/available/`

## 5. Exam Detail Page

### Goal

Prepare the user to start the exam with full clarity on rules and expectations.

### Layout

#### A. Header

- exam title
- exam code
- back button

#### B. Main Info Card

- exam type
- duration
- attempts left
- start and end window
- status

#### C. Instructions Section

- exam rules
- question count if available
- randomization or navigation notes
- review policy
- result visibility

#### D. CTA Section

- Start Test button
- Save for later or bookmark optional

### Components Needed

- exam info card
- instruction section
- rules badges
- primary CTA footer

### API

- `GET /api/v1/student/exams/{exam_id}/detail/`
- `POST /api/v1/attempts/start/`

## 6. Attempt Workspace

### Goal

Deliver a focused and reliable exam-taking experience.

### Desktop Layout

#### A. Top Exam Bar

- exam title
- question count
- timer
- mark status
- end test button

#### B. Question Meta Row

- question number
- question type
- mark for review checkbox

#### C. Main Question Area

- question stem
- optional rich content or attachments
- answer option cards

#### D. Question Palette

Right sidebar:

- answered
- unanswered
- marked
- current

#### E. Footer Actions

- previous
- clear selection
- next
- submit

### Mobile Layout

#### A. Compact Header

- timer
- progress
- exit option

#### B. Scrollable Question Panel

- question stem
- options

#### C. Sticky Bottom Actions

- previous
- next
- palette access
- mark for review

### Behavior Requirements

- auto-save visible but not distracting
- prevent accidental submit
- preserve answer state reliably
- show section change if applicable

### Components Needed

- timer badge
- option selection card
- review toggle
- palette drawer
- submit confirmation modal

### API

- `GET /api/v1/attempts/{id}/detail/`
- `POST /api/v1/attempts/{id}/save-answer/`
- `POST /api/v1/attempts/{id}/switch-section/`
- `POST /api/v1/attempts/{id}/submit/`

## 7. Attempt Summary Page

### Goal

Show immediate attempt completion state before final or published results if needed.

### Layout

- completion banner
- attempt status
- questions attempted
- marked for review count if relevant
- next step messaging
- CTA to return to dashboard or view results later

### API

- `GET /api/v1/attempts/{id}/summary/`

## 8. Results Page

### Goal

Help the user understand performance instantly and move into analysis.

### Layout

#### A. Result Hero Card

- score percentage
- pass or fail
- exam title
- time taken

#### B. Summary Metrics

- correct
- incorrect
- skipped
- rank

#### C. Follow-up Actions

- View Detailed Analysis
- Practice Weak Areas
- Back to Dashboard

### Mobile Layout

- top score ring
- summary tiles underneath
- CTA buttons stacked

### Components Needed

- score ring
- result summary tiles
- pass/fail badge
- CTA buttons

### API

- `GET /api/v1/student/results/`
- `GET /api/v1/results/student/{student_id}/performance/`

## 9. Analytics Page

### Goal

Turn performance history into actionable insight.

### Desktop Layout

#### A. Header

- page title
- exam filter dropdown
- export or download action later

#### B. Summary KPI Row

- tests taken
- average score
- highest score
- pass probability

#### C. Charts Row

Left:

- score trend line chart

Right:

- correct vs incorrect donut or radial chart

#### D. Topic and Domain Analysis

Left:

- weakest topics

Right:

- domain performance bars

### Mobile Layout

- exam selector
- top KPIs in compact cards
- trend chart
- domain bars
- weakest topics list

### Components Needed

- KPI cards
- line chart
- donut chart
- performance bar list
- topic issue list

### API

- `GET /api/v1/student/insights/summary/`
- `GET /api/v1/results/topic-performance/`
- `GET /api/v1/results/exam-summary/`
- `GET /api/v1/results/student/{student_id}/performance/`

## 10. Weak Areas Page

### Goal

Provide an improvement path from weak performance to targeted practice.

### Layout

#### A. Header

- title
- short explanation

#### B. Weak Topic Cards

Each row includes:

- topic name
- weak score
- severity indicator
- related domain
- practice CTA

#### C. Bottom Action

- Start Focused Practice

### Mobile Layout

- stacked weak area rows
- practice CTA inline
- full-width bottom action button

### Components Needed

- weak topic list item
- severity indicator
- inline practice button

### API

- `GET /api/v1/results/topic-performance/`

## 11. Notifications Page

### Goal

Provide clean message visibility without overwhelming the user.

### Layout

- page title
- mark all as read action
- notification list
- unread state highlight

Notification item fields:

- type icon
- title
- message preview
- time
- read/unread state

### API

- `GET /api/v1/notifications/`
- `POST /api/v1/notifications/{notification_id}/mark-read/`
- `POST /api/v1/notifications/mark-all-read/`
- `GET /api/v1/notifications/unread-count/`

## 12. Settings Page

### Goal

Give the user a simple place to manage profile and app preferences.

### Layout

- profile summary card
- account info
- password or security action later
- notification preferences later
- logout action

### API

- `GET /api/v1/auth/me/`

## Mobile Wireframes

## 1. Home Dashboard

### Structure

- top greeting
- readiness card
- pass probability card
- quick actions
- recent tests list
- weak area preview

### Main CTA

- Start Practice

## 2. Tests List

### Structure

- page title
- filter pills
- searchable list of tests
- score/status chip on each item
- Start New Test button

## 3. Test Detail

### Structure

- exam metadata
- rules summary
- attempts left
- Start Test CTA

## 4. Attempt Screen

### Structure

- timer header
- question progress
- question content
- option list
- bottom nav

### Key UX Rules

- one clear action per step
- large tap targets
- confirmation before submit

## 5. Result Screen

### Structure

- score ring
- pass/fail
- time taken
- correct, incorrect, marked summary
- button to detailed analysis

## 6. Analytics Screen

### Structure

- filter dropdown
- average score card
- trend chart
- domain bars
- weak topics preview

## 7. Weak Areas Screen

### Structure

- explanation text
- weak topic rows
- practice CTA
- full-width primary button

## 8. Profile Screen

### Structure

- profile header
- account details
- notifications settings later
- logout

## Screen Priority Order

Recommended implementation sequence:

1. Marketing home page
2. Login page
3. Student dashboard
4. Exams list
5. Exam detail
6. Attempt workspace
7. Attempt summary
8. Results page
9. Analytics page
10. Weak areas page
11. Notifications page
12. Mobile dashboard
13. Mobile tests flow
14. Mobile results and analytics

## Suggested Frontend Milestones

### Milestone 1

- design tokens
- layout shell
- navigation
- buttons
- cards
- forms

### Milestone 2

- marketing site
- auth

### Milestone 3

- dashboard
- exam listing
- exam detail

### Milestone 4

- attempt workspace
- save-answer flow
- submit flow

### Milestone 5

- results
- analytics
- weak areas
- notifications

### Milestone 6

- mobile app implementation

## Final Note

This wireframe specification should be used together with:

- `frontend_ui_ux_blueprint.md`

The blueprint defines the visual and architectural direction.
This file defines the page structure and build order.
