# Current Implementation Action List

This document turns the current infrastructure recommendations into a practical action list.

It also clarifies an important distinction:

- some actions are **platform admin operational responsibilities**
- some actions are **engineering/devops implementation responsibilities**
- some actions may later become **platform admin UI features**, but are not required as UI work right now

## Key answer

Not all of these should be built into the platform admin product UI right now.

For the current stage:

- most items are **engineering/devops/backoffice operations**
- only a smaller subset should eventually appear in the platform admin workspace

That is the correct approach for now, because turning everything into admin-facing UI too early would be unnecessary complexity.

## Ownership legend

- `Engineering`: backend/frontend code or architecture work
- `DevOps`: server, process, deployment, monitoring, backup, runtime operations
- `Platform Admin Ops`: operational process done by the business/admin team outside product code
- `Future Platform Admin UI`: good candidate for later productization

## Do now

### 1. Basic server monitoring

- Priority: `P0`
- Effort: `Low`
- Owner: `DevOps`
- UI needed now: `No`
- Future platform admin UI candidate: `Maybe summary only`

What to implement:

- CPU monitoring
- RAM monitoring
- disk monitoring
- nginx process monitoring
- Django backend service monitoring
- Next.js web service monitoring

Why it matters:

- this gives immediate visibility into server stress and service instability

### 2. Application-level error and latency monitoring

- Priority: `P0`
- Effort: `Low to Medium`
- Owner: `Engineering + DevOps`
- UI needed now: `No`
- Future platform admin UI candidate: `Yes, high-level summary only`

What to implement:

- request latency tracking
- 4xx and 5xx tracking
- autosave failure tracking
- submit failure tracking
- login failure tracking
- top slow endpoints

Why it matters:

- this tells us whether stability issues come from code paths or infrastructure

### 3. Exam-day runbook

- Priority: `P0`
- Effort: `Low`
- Owner: `Platform Admin Ops + DevOps`
- UI needed now: `No`
- Future platform admin UI candidate: `No`

What to implement:

- a written checklist for pre-exam health checks
- a live monitoring checklist during exams
- a recovery checklist if service degradation happens

Why it matters:

- operational discipline reduces incidents more cheaply than code changes

### 4. Controlled load test

- Priority: `P0`
- Effort: `Medium`
- Owner: `Engineering + DevOps`
- UI needed now: `No`
- Future platform admin UI candidate: `No`

What to implement:

- simulate exam start load
- simulate autosave load
- simulate submit load
- record bottlenecks and capacity observations

Why it matters:

- this replaces guessing with evidence

### 5. Database critical-path review

- Priority: `P0`
- Effort: `Medium`
- Owner: `Engineering`
- UI needed now: `No`
- Future platform admin UI candidate: `No`

What to implement:

- inspect attempt start queries
- inspect autosave queries
- inspect submit queries
- inspect result fetch queries
- review indexes on exam/attempt/result paths

Why it matters:

- the database is the most likely first bottleneck

### 6. Log capture and log rotation

- Priority: `P0`
- Effort: `Low`
- Owner: `DevOps`
- UI needed now: `No`
- Future platform admin UI candidate: `No`

What to implement:

- backend log retention
- nginx log retention
- rotation rules
- quick inspection commands

Why it matters:

- avoids disk issues and improves incident response

## Do next if pressure appears

### 7. Static and media delivery hygiene

- Priority: `P1`
- Effort: `Medium`
- Owner: `Engineering + DevOps`
- UI needed now: `No`
- Future platform admin UI candidate: `No`

What to implement:

- confirm static file delivery is efficient
- monitor uploaded artifact growth
- avoid app server overload from file serving

Why it matters:

- keeps the main app tier free for exam traffic

### 8. Concurrency-aware exam scheduling policy

- Priority: `P1`
- Effort: `Low`
- Owner: `Platform Admin Ops`
- UI needed now: `No`
- Future platform admin UI candidate: `Yes`

What to implement now:

- scheduling guidance for large batches
- avoid all institutes starting at the same time

What can become UI later:

- admin-facing scheduling recommendations
- institute launch-load warnings

Why it matters:

- this is one of the cheapest ways to reduce peak infra cost

### 9. Redis for hot read caching

- Priority: `P1`
- Effort: `Medium`
- Owner: `Engineering + DevOps`
- UI needed now: `No`
- Future platform admin UI candidate: `No`

What to implement:

- cache exam metadata
- cache repeated scope/entitlement lookups
- cache repeated summary reads where safe

Why it matters:

- reduces repeated database pressure

### 10. Async jobs for heavy post-submit workflows

- Priority: `P1`
- Effort: `Medium to High`
- Owner: `Engineering`
- UI needed now: `No`
- Future platform admin UI candidate: `No`

What to implement:

- move heavy analytics, leaderboard, and reporting recalculation out of request path

Why it matters:

- protects live exam experience

## Later candidates for product UI

These are valid later platform-admin features, but should not be the first implementation target.

### 11. Platform health summary panel

- Priority: `P2`
- Owner: `Engineering`
- UI audience: `Platform admin`

Possible UI data:

- service health summary
- recent error trend
- current exam-day status
- top overloaded institutes or exam windows

### 12. Exam launch load warning panel

- Priority: `P2`
- Owner: `Engineering`
- UI audience: `Platform admin`

Possible UI data:

- upcoming large exam overlaps
- concurrency risk flags
- recommendations to stagger launches

### 13. Institute operational scorecard

- Priority: `P2`
- Owner: `Engineering`
- UI audience: `Platform admin`

Possible UI data:

- institute exam readiness
- roster completeness
- submission health
- support incident history

## Should these be at platform admin side?

Short answer:

- `Operational visibility`: yes, eventually some of it can appear at platform admin side
- `Core infra controls`: no, those should remain engineering/devops responsibilities

### Good platform admin side candidates

- service health summary
- exam-day readiness summary
- institute launch-risk summary
- high-level failure trend summary
- support-focused alerts

### Not good platform admin UI candidates right now

- raw CPU graphs
- raw DB tuning controls
- server restart controls inside app UI
- log rotation management
- cache invalidation controls
- deployment controls

Those belong outside the business admin UI for now.

## Recommended practical split

### Right now

- implement monitoring outside the product
- keep runbooks outside the product
- keep server operations outside the product
- let platform admins use process/checklists instead of UI

### Later

- expose only summarized, decision-friendly information in platform admin dashboards

That keeps the product clean and avoids turning the admin panel into a devops console.

## Suggested execution order

1. basic monitoring
2. log discipline
3. exam-day runbook
4. load test
5. DB review
6. small fixes from findings
7. later decide whether summary health should appear in platform admin UI

## Final recommendation

For the current phase, treat these as:

- mostly `Engineering/DevOps implementation`
- partly `Platform Admin operational process`
- only selectively `future platform-admin UI features`

That is the least risky and most efficient implementation path.
