# W07 account recovery verification

Date: 21 October 2026  
Result: **W07.02 complete**

The backend now issues throttled, time-limited password reset requests with hashed tokens and neutral account-existence responses. Web users can request and confirm a reset, while the student app opens the same web recovery path. Delivery outcome and recovery completion are auditable.

Docker/PostgreSQL verification covered a matching and missing identity returning identical responses, successful email construction, expiry rejection, replay rejection, password validation, simulated provider failure and invalidation of previously issued access and refresh tokens. The new password authenticated successfully.

## Verification

- Migration drift check: no changes detected.
- Docker/PostgreSQL recovery suite: 4 tests passed.
- Web ESLint and `tsc --noEmit`: passed.
- Student mobile `tsc --noEmit`: passed.
- Mobile release-configuration suite: 5 tests passed.

Migration `0005_passwordresetrequest` is additive. Deploy the backend migration and configure SMTP plus the public reset URL before advertising recovery. Existing clients remain compatible. The institute-admin reset remains the verified assisted fallback if email delivery fails.
