# Penetration Findings Tracker Template

Last updated: 2026-07-06

## Purpose

Use this template to log penetration-testing findings consistently.

---

## Summary Table

| ID | Title | Severity | Area | Environment | Status | Owner | Retest |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PEN-001 | example finding | `high` | auth / IDOR / upload / XSS / business logic | `stage` | `open` | `owner-name` | `pending` |

Status values:

- `open`
- `in progress`
- `fixed`
- `risk accepted`
- `false positive`

Retest values:

- `pending`
- `passed`
- `failed`

---

## Finding Template

### PEN-XXX. Finding title

- Severity: `critical | high | medium | low`
- Environment: `local | stage | isolated security env`
- Date found: `YYYY-MM-DD`
- Tester:
- Area:
- Affected role:
- Affected route or endpoint:
- CWE or category if known:

#### Reproduction steps

1. 
2. 
3. 

#### Actual result

-

#### Expected result

-

#### Business impact

-

#### Evidence

- screenshot:
- request sample:
- response sample:
- trace or log:

#### Remediation recommendation

-

#### Owner

-

#### Status

-

#### Retest notes

-

---

## Severity Guide

### Critical

- auth bypass
- cross-tenant admin escalation
- unrestricted access to highly sensitive data
- direct system-compromise path

### High

- confirmed IDOR with meaningful data exposure
- stored XSS in privileged workflow
- broken authorization on important write path
- dangerous upload or import bypass

### Medium

- reflected XSS with constrained impact
- missing or weak abuse protections
- limited-scope business logic bypass

### Low

- hardening header gaps
- low-sensitivity information leakage
- non-exploitable but noisy weakness
