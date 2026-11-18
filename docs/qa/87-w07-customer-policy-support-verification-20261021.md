# W07 customer policies and support verification

Date: 21 October 2026  
Result: **W07.03 complete for the assisted pilot**

Public `/privacy`, `/terms` and `/support` routes now state the actual INR 0 institute pilot, data roles, learner/guardian handling, request process and academic-record retention limits. Links are present on login, signup, the public home page, the student footer/settings page and the student mobile profile.

Authenticated support requests record requester, institute, category, subject, details and status. Tenant ownership comes from the server-side account profile. Institute administrators can operate only their institute queue; platform administrators can handle escalations. Resolution identity, notes and time are retained and audited.

## Verification

- Migration drift: no changes detected for additive migration `0006_supportrequest`.
- Docker/PostgreSQL: support and recovery suites passed 5 tests.
- Synthetic export request: a client-supplied foreign institute was ignored; the request was owned by the authenticated institute.
- Cross-tenant institute administrator list and resolution attempts returned no data/403.
- Platform support resolved the synthetic request with traceable notes.
- Web ESLint and `tsc --noEmit`: passed.
- Student mobile `tsc --noEmit`: passed.

The policy is a pilot operating contract and still requires the named business/legal reviewer before public expansion. No automated destructive deletion is introduced; the documented review prevents account removal from contradicting academic-record retention.
