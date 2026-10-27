# Anti-abuse controls

These are application-level controls for the Express API. All enforced counters
live in PostgreSQL and survive process restarts; the database is shared across
API instances. Database failure rejects protected requests instead of silently
allowing unlimited traffic. There is no external CAPTCHA service or fingerprinting.

## Default limits

| Operation                                   | Identity         | Limit                   |
| ------------------------------------------- | ---------------- | ----------------------- |
| API traffic, before JSON parsing            | IP/network       | 600 requests / minute   |
| Authentication attempts and OAuth flow      | IP/network       | 40 / 15 minutes         |
| Password signup attempts                    | IP/network       | 10 / hour               |
| New accounts, including OAuth               | IP/network       | 20 / 24 hours           |
| Registration challenge issuance             | IP/network       | 30 / 15 minutes         |
| Sign-in and reset-code checking             | Normalized email | 12 / 15 minutes, shared |
| Password reset requests                     | Normalized email | 5 / hour                |
| Content uploads, publishing, account writes | Account          | 30 / minute, shared     |
| Uploaded bytes, including rejected files    | Account          | 128 MiB / 24 hours      |
| Served image/audio bytes                    | IP/network       | 1 GiB / hour            |

Rate windows start with their first request. Rejecting another request does not
extend the window. A bounded process-local denial cache reduces database work
for already-limited identities; it never grants access. Shared SQL counters are
atomic. HTTP 429 responses contain `code`, `retryAfter`, `Retry-After` and rate
headers. The client displays the wait time. The health endpoint is exempt;
ordinary session lookup/sign-out is exempt from the tighter credential limit.

No raw IP addresses or emails are stored in the counters. Keys use HMAC with
`ABUSE_SECRET` (32+ characters), or a database-backed shared random secret if
unset. IPv4-mapped addresses are normalized; IPv6 addresses share a /64 bucket.
This can also group legitimate users on a shared network: defaults are explicit
product limits, not a claim that each limited request is malicious.

`TRUSTED_PROXIES` is unset by default: `X-Forwarded-For` does not choose the client
identity. Behind a proxy, explicitly configure only its source IP/CIDR and make
sure it sanitizes forwarding headers. Broad trust, hop counts and /0 are refused.
Never configure arbitrary internet clients as trusted proxies.

## Registration protection

The browser requests a random registration challenge and solves an 18-bit SHA-256
proof in a dedicated Web Worker. The check has a 2-second minimum age, a 10-minute
expiry and is tied to both the network and an HttpOnly, SameSite cookie. A single
conditional database update consumes it: concurrent submissions/replays cannot
reuse it. Direct signup requests without this check are rejected. A hidden,
non-focusable website field catches simplistic form-filling bots; filling it is
rejected, but it is not treated as proof that a person is human.

The proof is **not CAPTCHA, identity verification or email verification**. An
automated client can solve it; it raises automation cost while the independent
quotas bound account creation. The UI retries a fresh check on a new submission;
slow work has a 30-second timeout. The computational check stays local; passwords
are never sent to a third-party service. Transactional email uses Resend as
described in [email authentication](email-auth.md).

OAuth sign-ins for existing accounts do not spend the new-account quota. New
OAuth accounts spend the same daily IP/network budget as password registrations,
and Google/GitHub email addresses must be provider-verified. Password-based
registrations require the separate [email confirmation flow](email-auth.md)
before a session can access protected routes; historical accounts retain the
documented migration exception. Account creation succeeds before email delivery; unconfirmed accounts remain pending. Reset-code attempts are consumed atomically
before password comparison to limit concurrent guessing as well.

## Publication limits

| Account age    | Pages | Material publications / rolling 24 hours | Cooldown   |
| -------------- | ----- | ---------------------------------------- | ---------- |
| First 24 hours | 1     | 30                                       | 10 seconds |
| Older          | 3     | 150                                      | 5 seconds  |

Existing pages remain editable when the page-count ceiling is reached. An
identical publication is a no-op: it preserves `updatedAt`, consumes no daily
publication slot and bypasses the publication cooldown. It still counts as an
API/content request. Page creation and quotas are checked inside the same
transaction as the write, using an account row lock; slug ownership remains
conditional in the upsert. Rejection rolls the write back and leaves the draft
and previous public version intact. A mature account at its fixed page ceiling
receives 403 `PAGE_LIMIT`, without a misleading time-based retry instruction.

## Spam detection

Client and server reject a clear flood of duplicate promotional blocks: at least
six long copies making up 80% of long blocks, or twelve copies of one destination.
Tracking parameters (`utm_*`, `gclid`, `fbclid`) do not disguise duplicate URLs;
meaningful query parameters, paths and anchor navigation remain distinct.

Substantial repeated campaigns are also checked across accounts. A candidate
needs three nontrivial text blocks, 160 characters of text and two destinations.
Its normalized fingerprint ignores page identity, styles, block IDs, decorative
empty blocks and block order. A sixth distinct account copying the same campaign
within an hour is rejected. A campaign-level advisory transaction lock prevents
parallel writes from racing this check. This targets identical coordinated
content, not every repeated phrase or a shared social platform domain.
An existing owner can update the same already-published campaign, so copies by
other accounts cannot lock the original page out of updates.

These checks do not classify every scam, link destination or fuzzy paraphrase.
Legitimate coordinated campaigns can hit the duplicate threshold; changing the
policy or adding review is a deliberate product decision. Profanity/context
moderation remains separate. Publication event fingerprints are kept for seven
days and purged in bounded batches. Expired challenges and counters are also
purged in bounded batches; cleanup does not delete user profiles or uploaded media.

## Deployment and tests

Restart the API to apply the idempotent schema migration. No additional service
is required. Thresholds are in `backend/abuse.ts` and `backend/publication-limits.ts`.
Store/proxy configuration belongs in `.env`; never put a secret in frontend env.

Run `npm run test:abuse`, `npm run test:safety`, `npx tsc --noEmit` and `npm run build`.
The abuse suite executes production SQL against isolated PGlite PostgreSQL, tests
counter exhaustion/reset, replay/racing consumption, registration, ownership,
quotas, duplicate campaigns and forged proxy headers. It never connects to the
developer's real database. PGlite serializes local transactions; it does not
simulate a multi-node network or test real reverse-proxy configuration.

Distributed botnets, volumetric DDoS and persistent storage quotas require further
infrastructure: edge/proxy limits, observability and, when appropriate, ownership
verification or an external/adaptive challenge. The local proof alone does not
stop determined automation. Application request limits also cannot prevent all
database/network load before rejection.

References: [OWASP bot management](https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html),
[Express proxy configuration](https://expressjs.com/en/guide/behind-proxies.html),
[PostgreSQL atomic upserts](https://www.postgresql.org/docs/current/sql-insert.html).
