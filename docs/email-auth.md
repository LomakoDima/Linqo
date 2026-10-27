# Email confirmation and Resend

## Configuration

Password signup is always available. It first saves the account, then opens email confirmation in the same form. New password accounts require confirmation before sign-in in both development and production. Missing Resend settings or failed delivery leave the account pending, without a session; the confirmation step shows the delivery problem and offers resend. Google and GitHub remain separate sign-in options.

Set these **server-only** values in `.env` (production: server environment):

```dotenv
RESEND_API_KEY=re_your_private_key
RESEND_FROM=noreply@your-verified-domain.example
FRONTEND_URL=http://localhost:8080
```

Use the frontend's actual port during development and its public HTTPS origin in production. Never prefix the Resend key with `VITE_` or commit it. `RESEND_FROM` is a plain mailbox address; the sender name is added by the server.

In Resend, add your sending domain and copy its generated DNS records to your DNS provider. Wait for verification, then use an address on that domain. The `resend.dev` sender is restricted to the address associated with your Resend account; it is rejected by Linqo in production. See [Resend domain restrictions](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

Restart the API after changing `.env`. Its boot migrations add verification columns and tokens without deleting accounts or pages.

`npm run dev` / `npm run dev:server` now watch `.env` and restart the API on changes. An already-running older command needs one manual restart to pick up this watch option.

```powershell
npm run mail:check
npm run mail:test -- your-test-recipient@example.com
```

The first command only checks configuration format, without sending mail or validating credentials. The second sends a real, explicitly addressed test message. A successful provider response means accepted for delivery; check the inbox and Resend logs for delivery/bounces. No real test message is sent by the automated test suite.

## Account flow

- Password signup saves the account before requesting an email. It returns HTTP 201 and opens confirmation, with no login session. The response explicitly reports whether mail was sent; delivery failures keep the pending account and display a retryable message.
- The login form always offers password signup and sign-in alongside Google and GitHub. It has no email-availability gate, provider notices or Apple placeholder. Only initialization and active requests temporarily disable controls.
- Signup shows confirmation in the same form, without a route change or document reload. Initial delivery failures keep their message visible. Opening the login page starts with its normal form; pending email hints are used only by the dedicated confirmation route. Passwords and tokens are never stored in browser storage. A request lock prevents double submissions and mode changes during an active request.
- Password sign-in uses the password created for Linqo. Google/GitHub-only accounts have no local password; their provider password cannot be used here. Failed sign-in uses the same generic response for unknown addresses, wrong passwords and provider-only accounts. Existing local-password sign-in does not depend on email delivery being configured.
- The migration preserves historical account access and sessions without inventing verification timestamps. Existing rows receive a separate legacy access exception (`email_verification_required=false`); the final column default is `true` for every new account. Re-running the migration preserves these values. Actual email confirmation, verified OAuth, or password recovery records ownership and ends that exception. Existing content is preserved.
- Confirmation links expire in 30 minutes. Only SHA-256 token hashes are stored. One token per account is active, and resending invalidates the old link. The fragment token does not reach SSR/access logs and is removed from browser history. Confirmation requires an explicit button press, so opening/prefetching a link does not consume it.
- Verification consumes the token in a transaction under an account row lock. Replay and concurrent confirmations cannot both succeed. Old sessions and password-reset tokens are invalidated; confirmation itself does not create a login session.
- New email addresses in Settings stay pending. The old address remains active until the new one is confirmed; collisions leave the old address intact. Successful changes invalidate sessions and old recovery tokens. OAuth-only accounts continue to manage addresses at their provider.
- Google/GitHub addresses are trusted only after the provider's verified-email check. Linking an unverified password registration by verified OAuth discards its previously chosen password, preventing an earlier registrant of somebody else's address from retaining access. Verified existing accounts keep their password.

## Delivery and limits

Verification has the existing per-IP auth limits, per-address request limits, five issuance attempts per account per hour and a 60-second resend cooldown. Confirmation also uses auth rate limiting. Email changes use the account mutation limiter. Database counters are shared across API processes.

Mail requests use the Resend HTTPS API, a 12-second timeout and an idempotency key derived from the verification-token hash. No tokens, codes, API keys, recipient addresses or provider response bodies are logged. A timed-out token stays valid because the provider might already have accepted the email; resending rotates it normally.

Signup returns a saved pending account even when delivery is unavailable, with emailSent=false and an actionable deliveryError instead of falsely claiming a message was sent. Resend, password recovery and email changes still report unavailable delivery as an error. Password-recovery responses remain generic to avoid disclosing membership; background provider failures are logged with a safe error code.

This implements provider acceptance, not delivery webhooks, bounce processing, or a durable background mail queue. [Resend send API](https://resend.com/docs/api-reference/emails/send-email).

## Tests

`npm run test:auth` uses isolated PGlite and mocked transport. It covers session/publication gating, token hashes/expiry/rotation/replay, concurrent claims, sender failures, pending email changes, identity collisions, recovery, OAuth claims, and HTTP transport error handling. It does not connect to the developer's database or send real mail.
