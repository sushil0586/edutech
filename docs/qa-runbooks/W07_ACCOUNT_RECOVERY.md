# W07 account recovery runbook

Users start at `/forgot-password` on the web. The request accepts a username or email and always returns the same message, including for missing, inactive or undeliverable accounts. Requests are IP throttled. A matching active account receives a link containing a request identifier and one-time random token.

Only the token hash is stored. Links expire after 30 minutes by default and become inactive immediately after successful use. A new request invalidates earlier unused requests. Passwords pass the configured Django validators. Changing the password invalidates existing JWT access and refresh tokens through the password-hash revocation claim.

The student app opens the same web recovery route. This keeps delivery and confirmation behavior consistent across web, Android and iOS without storing recovery secrets in the app.

## Operations

Configure `PASSWORD_RESET_WEB_URL`, `DEFAULT_FROM_EMAIL` and the SMTP settings before enabling public recovery. Monitor `PasswordResetRequest.delivery_status` and the `password_reset_requested` / `password_reset_completed` audit events. Provider errors remain neutral to the requester and are recorded as `failed`.

For the assisted pilot, support may verify the institute, account identity and role, then ask an authorized institute administrator to use the existing scoped reset-password control. Support never asks for the existing password and never discloses whether an unverified email has an account.

Routine application rollback should retain migration `0005_passwordresetrequest` and its audit records. Disable the public links if delivery is unavailable; do not drop the table during rollback.
