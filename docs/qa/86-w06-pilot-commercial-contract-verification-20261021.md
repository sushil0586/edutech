# W06 pilot commercial contract verification

Date: 21 October 2026  
Result: **W06.01 complete for the pilot billing decision**

The assisted institute pilot is explicitly INR 0 with no student checkout, payment order, tax invoice, renewal or refund transaction. Institute access is provisioned through audited administrative grants and is described as included pilot access. Paid web, shared-library sales and native purchase flows remain excluded.

The implementation now defaults `STUDENT_SELF_SERVICE_PURCHASES_ENABLED` to false. Both student order-creation endpoints return 403 while disabled, and the web wallet/subscription pages replace order actions with institute-managed access guidance. Existing wallet history and granted-access consumption remain available.

## Verification

- Docker/PostgreSQL economy API policy test confirms a student cannot create a payment order while the pilot gate is off and no `PaymentOrder` is written.
- Existing economy API tests explicitly enable the feature when exercising future paid-order behavior, preserving that test coverage without enabling it in pilot environments.
- Web ESLint and `tsc --noEmit` pass for the changed wallet and subscription pages.
- Sample pilot grant/exit records contain no provider transaction and preserve submitted academic history.

No schema migration is required. Enabling student purchasing is a future configuration and release decision, not a pilot operation. W06.02–W06.05 remain required before any paid release.
