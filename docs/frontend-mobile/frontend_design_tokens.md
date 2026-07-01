# Nexora Frontend Design Tokens

## Purpose

This document defines the foundational design tokens for the Nexora web portal and mobile app.

These tokens should be used as the single source of truth for:

- colors
- typography
- spacing
- border radius
- shadows
- layout widths
- motion
- component states

The goal is to keep the visual language consistent across:

- Next.js web
- React Native mobile

## Token Philosophy

Nexora should feel:

- modern
- premium
- calm
- trustworthy
- high-clarity

Tokens should support:

- readable dashboards
- low-stress exam interfaces
- visually strong marketing pages
- clean analytics presentation

## Color Tokens

### Core Backgrounds

- `color-bg-page`: `#F8FAFC`
- `color-bg-page-alt`: `#F1F5F9`
- `color-bg-surface`: `#FFFFFF`
- `color-bg-surface-soft`: `#F8FAFC`
- `color-bg-surface-muted`: `#EEF2F7`
- `color-bg-overlay`: `rgba(15, 23, 42, 0.48)`

### Core Text

- `color-text-primary`: `#0F172A`
- `color-text-secondary`: `#334155`
- `color-text-muted`: `#64748B`
- `color-text-disabled`: `#94A3B8`
- `color-text-on-dark`: `#FFFFFF`

### Borders and Lines

- `color-border-default`: `#E2E8F0`
- `color-border-soft`: `#EDF2F7`
- `color-border-strong`: `#CBD5E1`
- `color-divider`: `#E5E7EB`

### Brand

- `color-brand-primary-50`: `#EFF6FF`
- `color-brand-primary-100`: `#DBEAFE`
- `color-brand-primary-500`: `#2563EB`
- `color-brand-primary-600`: `#1D4ED8`
- `color-brand-primary-700`: `#1E40AF`

- `color-brand-accent-50`: `#EEF2FF`
- `color-brand-accent-100`: `#E0E7FF`
- `color-brand-accent-500`: `#4F46E5`
- `color-brand-accent-600`: `#4338CA`

### Semantic Colors

- `color-success-50`: `#ECFDF5`
- `color-success-500`: `#16A34A`
- `color-success-600`: `#15803D`

- `color-warning-50`: `#FFFBEB`
- `color-warning-500`: `#F59E0B`
- `color-warning-600`: `#D97706`

- `color-danger-50`: `#FEF2F2`
- `color-danger-500`: `#EF4444`
- `color-danger-600`: `#DC2626`

- `color-info-50`: `#EFF6FF`
- `color-info-500`: `#3B82F6`

### Data Visualization Colors

- `color-chart-blue`: `#2563EB`
- `color-chart-indigo`: `#4F46E5`
- `color-chart-green`: `#22C55E`
- `color-chart-amber`: `#F59E0B`
- `color-chart-red`: `#EF4444`
- `color-chart-cyan`: `#06B6D4`

### Status Mapping

- readiness / active progress: blue
- passed / good trend: green
- warning / medium weakness: amber
- failed / critical weakness: red
- informational / neutral charts: indigo or cyan

## Gradient Tokens

Use gradients with restraint.

### Hero Gradients

- `gradient-hero-primary`: `linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)`
- `gradient-hero-soft`: `linear-gradient(135deg, rgba(37, 99, 235, 0.14) 0%, rgba(79, 70, 229, 0.08) 100%)`

### CTA Gradients

- `gradient-cta`: `linear-gradient(90deg, #1D4ED8 0%, #4F46E5 100%)`

### Surface Accent Gradients

- `gradient-card-glow`: `linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(239,246,255,0.8) 100%)`

## Typography Tokens

## Font Families

- `font-heading`: `"Plus Jakarta Sans", "Sora", sans-serif`
- `font-body`: `"Inter", "Manrope", sans-serif`

## Font Weights

- `font-weight-regular`: `400`
- `font-weight-medium`: `500`
- `font-weight-semibold`: `600`
- `font-weight-bold`: `700`
- `font-weight-extrabold`: `800`

## Type Scale

### Display

- `text-display-xl`: `clamp(3rem, 6vw, 4.75rem)`
- `text-display-lg`: `clamp(2.5rem, 5vw, 4rem)`
- `text-display-md`: `clamp(2.125rem, 4vw, 3.25rem)`

### Headings

- `text-h1`: `2.5rem`
- `text-h2`: `2rem`
- `text-h3`: `1.5rem`
- `text-h4`: `1.25rem`
- `text-h5`: `1.125rem`

### Body

- `text-body-lg`: `1.125rem`
- `text-body-md`: `1rem`
- `text-body-sm`: `0.875rem`
- `text-body-xs`: `0.75rem`

### Utility

- `text-label`: `0.875rem`
- `text-caption`: `0.75rem`
- `text-overline`: `0.6875rem`

## Line Heights

- `line-height-tight`: `1.1`
- `line-height-heading`: `1.2`
- `line-height-body`: `1.6`
- `line-height-compact`: `1.4`

## Letter Spacing

- `letter-spacing-tight`: `-0.02em`
- `letter-spacing-normal`: `0`
- `letter-spacing-wide`: `0.02em`

## Spacing Tokens

Use a consistent 4px base rhythm.

- `space-0`: `0`
- `space-1`: `4px`
- `space-2`: `8px`
- `space-3`: `12px`
- `space-4`: `16px`
- `space-5`: `20px`
- `space-6`: `24px`
- `space-8`: `32px`
- `space-10`: `40px`
- `space-12`: `48px`
- `space-14`: `56px`
- `space-16`: `64px`
- `space-20`: `80px`
- `space-24`: `96px`
- `space-32`: `128px`

## Radius Tokens

- `radius-none`: `0`
- `radius-sm`: `8px`
- `radius-md`: `12px`
- `radius-lg`: `16px`
- `radius-xl`: `20px`
- `radius-2xl`: `24px`
- `radius-full`: `999px`

Recommended usage:

- buttons: `12px`
- inputs: `12px`
- cards: `20px`
- modal/dialog: `24px`
- pills/badges: full

## Shadow Tokens

Shadows should be soft and airy.

- `shadow-xs`: `0 1px 2px rgba(15, 23, 42, 0.04)`
- `shadow-sm`: `0 4px 12px rgba(15, 23, 42, 0.06)`
- `shadow-md`: `0 10px 30px rgba(15, 23, 42, 0.08)`
- `shadow-lg`: `0 18px 50px rgba(15, 23, 42, 0.12)`
- `shadow-focus`: `0 0 0 4px rgba(37, 99, 235, 0.18)`

## Layout Tokens

### Widths

- `layout-max-content`: `1200px`
- `layout-max-wide`: `1320px`
- `layout-max-reading`: `720px`

### Sidebar

- `layout-sidebar-width`: `264px`
- `layout-sidebar-collapsed-width`: `88px`

### Header

- `layout-header-height`: `72px`

## Z-Index Tokens

- `z-base`: `1`
- `z-dropdown`: `50`
- `z-sticky`: `100`
- `z-overlay`: `200`
- `z-modal`: `300`
- `z-toast`: `400`

## Motion Tokens

Motion should feel responsive and polished, not flashy.

### Durations

- `motion-fast`: `120ms`
- `motion-normal`: `180ms`
- `motion-slow`: `280ms`

### Easings

- `ease-standard`: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- `ease-enter`: `cubic-bezier(0.16, 1, 0.3, 1)`
- `ease-exit`: `cubic-bezier(0.4, 0, 1, 1)`

### Motion Guidance

- buttons: quick hover/press feedback
- cards: subtle lift on hover for marketing and dashboard surfaces
- page sections: soft fade-up reveal
- avoid distracting motion in exam-taking screens

## Component Tokens

## Buttons

### Primary Button

- background: `color-brand-primary-500`
- text: `color-text-on-dark`
- hover background: `color-brand-primary-600`
- radius: `radius-md`
- height desktop: `48px`
- height mobile: `44px`
- horizontal padding: `space-6`

### Secondary Button

- background: `color-bg-surface`
- text: `color-brand-primary-500`
- border: `color-brand-primary-100`
- hover background: `color-brand-primary-50`

### Ghost Button

- background: transparent
- text: `color-text-secondary`
- hover background: `color-bg-surface-muted`

## Inputs

- height: `48px`
- radius: `radius-md`
- border: `color-border-default`
- background: `color-bg-surface`
- placeholder: `color-text-disabled`
- focus ring: `shadow-focus`

## Cards

### Standard Card

- background: `color-bg-surface`
- border: `1px solid color-border-soft`
- radius: `radius-xl`
- shadow: `shadow-sm`
- padding: `space-6`

### Elevated Card

- background: `color-bg-surface`
- radius: `radius-xl`
- shadow: `shadow-md`

### Analytics Card

- background: `color-bg-surface`
- border: `1px solid color-border-soft`
- radius: `radius-xl`
- shadow: `shadow-sm`
- metric numbers use semibold or bold

## Badges

### Default

- background: `color-bg-surface-muted`
- text: `color-text-secondary`
- radius: `radius-full`

### Success

- background: `color-success-50`
- text: `color-success-600`

### Warning

- background: `color-warning-50`
- text: `color-warning-600`

### Danger

- background: `color-danger-50`
- text: `color-danger-600`

## Navigation Tokens

### Sidebar Item

- default text: `color-text-secondary`
- active text: `color-brand-primary-600`
- active background: `color-brand-primary-50`
- hover background: `color-bg-surface-muted`
- radius: `radius-md`

### Navbar Link

- default text: `color-text-secondary`
- active text: `color-brand-primary-600`
- hover text: `color-text-primary`

## Exam Interface Tokens

### Question Card

- background: `color-bg-surface`
- border: `color-border-soft`
- radius: `radius-xl`
- shadow: `shadow-sm`

### Option Card

- default border: `color-border-default`
- selected border: `color-brand-primary-500`
- selected background: `color-brand-primary-50`
- hover border: `color-brand-primary-100`
- radius: `radius-md`

### Question Palette States

- current: brand primary
- answered: success
- marked: accent
- unanswered: muted gray

### Timer

- normal: `color-text-primary`
- warning: `color-warning-500`
- danger: `color-danger-500`

## Chart Tokens

### Line Charts

- primary line: `color-chart-blue`
- secondary line: `color-chart-indigo`
- gridline: `color-border-soft`
- axis text: `color-text-muted`

### Donut Charts

- correct: `color-chart-green`
- incorrect: `color-chart-red`
- skipped or neutral: `color-border-strong`

### Bar Charts

- positive: green
- medium: amber
- weak: red

## Responsive Rules

### Breakpoints

- `breakpoint-sm`: `640px`
- `breakpoint-md`: `768px`
- `breakpoint-lg`: `1024px`
- `breakpoint-xl`: `1280px`
- `breakpoint-2xl`: `1440px`

### Layout Guidance

- mobile-first structure
- collapse multi-column dashboard sections below `1024px`
- maintain generous padding on desktop and compact padding on mobile

## Accessibility Tokens

### Focus

- all interactive controls should have visible focus treatment
- use `shadow-focus` or equivalent visible outline

### Contrast Guidance

- primary text should always meet strong readability standards
- semantic states must not rely on color alone
- charts should include labels, legends, or values

## Suggested CSS Variable Naming

For Next.js web, recommended CSS variable style:

```css
:root {
  --color-bg-page: #F8FAFC;
  --color-bg-surface: #FFFFFF;
  --color-text-primary: #0F172A;
  --color-brand-primary-500: #2563EB;
  --space-4: 16px;
  --radius-xl: 20px;
  --shadow-sm: 0 4px 12px rgba(15, 23, 42, 0.06);
}
```

For React Native, map the same system into:

- `theme.colors`
- `theme.spacing`
- `theme.radius`
- `theme.typography`
- `theme.shadows`

## Token Usage Priorities

When implementation starts, create these first:

1. color tokens
2. typography tokens
3. spacing tokens
4. radius tokens
5. shadow tokens
6. button tokens
7. input tokens
8. card tokens

## Summary

These design tokens define the visual foundation of Nexora.

They should be used consistently across:

- marketing pages
- dashboard pages
- analytics
- exam-taking flows
- mobile screens

The system should always preserve the core Nexora product feel:

- premium
- clean
- calm
- high-clarity
