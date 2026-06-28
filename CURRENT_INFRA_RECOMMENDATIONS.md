# Current Infra Recommendations

This document captures the recommended infrastructure stance for Nexora Learn at the current product stage.

It is intentionally practical and lightweight. The goal is to keep the platform stable without introducing early complexity.

## Current recommendation

For now, continue with the current architecture and current exam runtime model.

Recommended current posture:

- keep the existing Django monolith
- keep the existing Next.js web app
- keep Nginx plus a relational database
- avoid redesigning attempt delivery at this stage
- avoid early high-concurrency optimization unless real usage proves the need

## Why this is the right decision now

At the current stage:

- product correctness matters more than premature performance engineering
- real usage patterns are still more valuable than estimated usage patterns
- concurrency-heavy optimization introduces complexity and risk
- the current product needs operational clarity and observability more than architectural change

## Immediate actions

These are the actions that should be done now.

### 1. Add basic server monitoring

Track at minimum:

- CPU usage
- memory usage
- disk usage
- disk growth
- network usage
- backend process restarts
- frontend process restarts
- nginx health

Purpose:

- know when the server is stressed
- detect instability before it affects exams

### 2. Add application-level monitoring

Track at minimum:

- request latency
- 4xx and 5xx error rates
- login failures
- attempt save failures
- attempt submit failures
- slow endpoints
- database connection pressure

Purpose:

- understand whether issues are code-level or infra-level

### 3. Keep exam-day operations disciplined

Before major live exams:

- confirm backend service is up
- confirm frontend service is up
- confirm nginx is healthy
- confirm disk is not nearly full
- confirm memory pressure is acceptable
- confirm database is reachable

During major live exams:

- avoid heavy manual imports
- avoid large exports
- avoid unnecessary deployment changes
- watch error logs and latency

After major live exams:

- review incidents
- review slow endpoints
- review peak resource usage

### 4. Run one realistic controlled load test

Do not overcomplicate this.

Goal:

- estimate current safe concurrent exam load
- identify whether attempt start, save, or submit is the first bottleneck

This should be treated as a measurement exercise, not a large infrastructure project.

### 5. Protect the database first

For the current phase:

- keep database indexes reviewed
- avoid unnecessary reporting load during exam windows
- avoid mixing heavy admin operations with critical exam windows

Reason:

- the database is the most likely first bottleneck in this product

### 6. Stagger major exam windows where possible

Operationally reduce peak concurrency by:

- scheduling institute windows separately
- avoiding same-minute launches for all batches
- spreading large exam starts across controlled time windows

This is the cheapest optimization available.

## Low-cost improvements worth doing now

These are useful improvements that are still low risk.

### 1. Better log capture and rotation

Make sure:

- backend logs are retained
- nginx logs are usable
- disk is not consumed by uncontrolled logs

### 2. Static and media hygiene

Make sure:

- static files are served efficiently
- media growth is monitored
- uploaded artifacts do not silently consume too much disk

### 3. Deployment discipline

Before each production deployment:

- run backend migrations carefully
- build frontend cleanly
- restart services in a controlled sequence
- verify service health immediately after deployment

### 4. Exam support checklist

Maintain a short checklist for support during live exam windows:

- current active exam
- support contact owner
- backend logs location
- nginx logs location
- restart commands
- database health check command

## What to postpone

These should not be prioritized right now unless real evidence forces them.

- full exam snapshot caching redesign
- Redis-first optimization project
- queue-heavy architecture changes
- microservices split
- Kubernetes migration
- sophisticated autoscaling work
- multi-region infra
- advanced high-concurrency tuning without real load evidence

## Warning signals that mean we should revisit architecture

Revisit deeper optimization if one or more of these happen repeatedly:

- attempt submit failures during live exams
- frequent autosave failures
- CPU or memory saturation during exam windows
- database connection exhaustion
- slow exam start times at peak
- noticeable latency spikes when many students start together
- infra cost rising faster than active usage
- repeated service restarts during exam traffic

## Decision rule

Current rule:

- ship and operate with current architecture
- measure real usage
- optimize only after evidence

Future rule:

- if real concurrency becomes a recurring business pattern, then execute the high-concurrency optimization plan in phases

## Recommended next operational documents

The following documents are the most useful follow-ups:

- exam-day runbook
- deployment checklist
- basic monitoring checklist
- load test plan

## Summary

Current best path:

- keep the current system
- add monitoring
- measure real behavior
- improve operations
- delay architecture-heavy optimization until usage justifies it

This gives the highest stability-to-complexity ratio for the current stage of Nexora Learn.
