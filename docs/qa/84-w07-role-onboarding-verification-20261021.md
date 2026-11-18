# W07 role onboarding and first-use verification

Date: 21 October 2026  
Result: **W07.01 complete**

The existing web registration flow creates a login and sends student, teacher and parent accounts to role-specific profile completion. Protected student, parent and administrator layouts already enforced active role and completion state. This change closes the remaining teacher-layout gap by sending incomplete teachers to `/complete-profile` before rendering protected teacher data.

The native role gate now checks student completion state. Complete students enter the student dashboard, where the recommended assigned exam links to exam detail or an active attempt. Incomplete students receive a working web profile-completion action. Teacher, parent and administrator accounts receive a working role-specific web login action and never enter the student tab layout. The public web destination is a validated release endpoint configured with `EXPO_PUBLIC_WEB_PORTAL_URL`.

## Verification

- Docker/PostgreSQL public registration and profile-completion suite: 19 tests passed with the test process's HTTPS redirect disabled; the production redirect remains enabled.
- Web ESLint and `tsc --noEmit`: passed.
- Student mobile `tsc --noEmit`: passed.
- Mobile release-configuration suite: 5 tests passed, including validation of public HTTPS endpoints.
- Existing student dashboard behavior selects a resumable exam first, then a startable assigned exam, and links it to the exam detail or attempt route.

Native device exam and recovery certification remains under W08.03. Password recovery remains under W07.02. These are separate release gates and do not change the completed role-routing contract.
