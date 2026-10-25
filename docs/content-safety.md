# Local content checks

The client and Express API share schemas in `src/lib/content-safety.ts`. The
API is authoritative: direct HTTP requests go through the same checks before
writing to Postgres. Invalid drafts remain editable; errors appear in Content,
Identity and Publish. Nothing is silently censored or deleted from a draft.

## What is enforced

- Known fields, types, enums, finite numeric ranges and unique item IDs.
- 400,000 UTF-8 bytes per publication, 100 blocks, 40 image references per page,
  20 gallery images per block, 50 FAQ/timeline items, 10,000 characters and 300
  runs per text block. Other fields have their own smaller limits.
- HTTP(S) public destinations only, without credentials, control characters,
  local/private IP literals, executable schemes or known adult domains. Own
  managed uploads have a narrow localhost exception for development. Video
  links support YouTube, Vimeo or direct MP4/WebM/OGV URLs.
- Text and filenames use the explicit rules in `src/lib/content-policy.ts` for
  adult and graphic violence tags, and contextual heuristics in
  `src/lib/text-moderation.ts` for threats, personal attacks, hate and violent
  recruitment or promotion.
  NFKC normalization and invisible separator removal catch some simple evasions;
  rich-text runs are checked together. These are **word/phrase rules, not a
  semantic classifier**: they can miss obfuscation and context. Adjust the rule
  list to match the product's policy.
- Image uploads: PNG/JPEG/WebP/GIF, 10 MiB maximum; audio uploads:
  MP3/WAV/OGG/M4A/AAC, 20 MiB maximum. Extension, declared MIME and signature
  must agree. Archives, executables and active formats such as SVG are refused.
  The browser reads raster dimensions before decoding to reject oversized inputs
  early; server decoding remains authoritative.
- Images are fully decoded with Sharp, constrained to 16,777,216 input pixels
  and 8192 px per side, rotated, resized within 1600 px and encoded as WebP.
  This removes metadata and trailing source payloads. Animated inputs become
  a still image. Embedded image data receives these checks again on publication.
  Audio gets container/signature checks; it is **not fully decoded or scanned**.
- Uploads require a session before multipart parsing and are tied to the
  uploader and page. Publication checks managed asset existence, page, uploader
  and API origin. Conditional SQL upserts prevent concurrent ownership theft.
  Existing unowned pages cannot be claimed through a content update.
- Content writes/uploads have a shared Postgres limit of 30 requests/minute per
  user, plus IP, signup, publication and byte quotas described in
  [anti-abuse.md](./anti-abuse.md). Multipart and JSON sizes are limited separately.
- Public pages use validated API data. URL-fragment profiles no longer override
  saved publications. `/preview` reads the local draft after authentication and
  includes `noindex`; it is not a shareable publication.

Passwords are not subjected to content filters or normalization. New passwords
are bounded to 72 UTF-8 bytes because bcrypt ignores bytes beyond that point.
Account names, emails and onboarding choices are validated separately.

## Context, profanity and reputational claims

The contextual rules currently cover selected Russian and English constructs.
Profanity by itself is not a prohibited category. Emotional language, profane
praise, self-directed swearing and criticism of products stay publishable.
Targeted humiliating labels, direct threats, dehumanising group attacks and
explicit support/recruitment for violent extremism are blocking findings.
Political preferences, religion, identity and ordinary advocacy are not grounds
for blocking. "Propaganda" here means promotion of violence/violent extremism,
not a generic ban on a viewpoint or identity.

Negations, clearly reported speech and nearby explanation are considered within
a bounded clause. Reports or educational quotations can produce a non-blocking
warning instead of a rejection. One sentence's disclaimer does not suppress a
new threat in the next sentence or after "but/но". Inline text runs are joined
before moderation, preserving both the context and checks against split-word
evasions. Unicode normalization, invisible separators and selected mixed-script
lookalikes are handled without rewriting the saved text.

Reputational allegations about identifiable people or organisations produce an
advisory to check the wording, evidence and distinction between fact and opinion.
The checker never decides that an allegation is false, defamatory or verified.
Warnings are visible in Content, Identity and Publish; successful publication
responses also contain `warnings` for API clients and the quick-copy path. They
do **not** block publication, require an attestation or represent human review.
Warnings contain field paths and general advice, not copies of the flagged text.

This is a local rule engine with limited grammar/vocabulary, not full contextual
understanding or a fact-checking service. Irony, fiction, indirect insults,
unlisted languages, evasion and ambiguous quotations can still be misclassified.
Future semantic text moderation needs its own model/review workflow; a CV model
alone does not verify factual accusations or classify arbitrary text reliably.

## Code and injection protection

Public text and filenames also use `src/lib/code-content.ts`. The product does
not accept user HTML, CSS rules, executable snippets or code fences. Checks
cover common JavaScript, SQL, shell, PHP, Python and other language constructs,
including bounded decoding of HTML entities, percent encoding and Unicode
escapes. Rich-text runs are checked together. Links containing encoded code
payloads are rejected as well. Prose, apostrophes, ampersands and ordinary
comparisons remain usable. This policy can have false positives and cannot
identify every possible language, encoding or program.

Execution protection is separate from that heuristic:

- React renders public content as text, never as user-provided HTML. The rich
  text editor pastes plain text and builds DOM nodes without interpreting HTML.
- Only validated URL schemes and destinations reach links/media. Only hex
  colors reach profile CSS, including draft previews. Chart IDs, custom property
  names and colors are restricted; chart styles no longer use raw HTML insertion.
- Database values stay SQL parameters. There is no user-code evaluation,
  template compilation, shell command construction or custom script block.
- Production HTML has a per-request cryptographic CSP nonce. App/SSR scripts
  carry it; other inline scripts, inline event handlers, `eval`, plugins and
  arbitrary iframe sources are blocked. Embedded YouTube/Vimeo players use
  fixed provider URLs inside sandboxed iframes. Third-party player scripts run
  inside those separate frames; users cannot supply their script source.
- SSR HTML is `private, no-store` so shared caches do not reuse nonces. Error
  pages need no JavaScript and deny scripts entirely. API responses have a
  restrictive CSP and `nosniff`.

Development permits Vite's same-origin and inline bootstrap scripts so HMR can
run, while keeping inline event handlers, object embeds and base tags blocked.
The strict nonce script policy is enforced in the production build. Test CSP
with the actual production artifact and configure `VITE_API_URL` to the real API
origin before building; that origin is the allowed API connection destination.

These controls do not imply universal immunity, antivirus scanning or safety
of a third-party site after a visitor follows a link. Prevention relies on
keeping input as data at each execution boundary, following the
[OWASP XSS Prevention guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
and [SQL parameterization guidance](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).

## Future self-hosted computer vision

`backend/content-inspection.ts` exposes `configureMediaInspector`. Call it once
at API startup to install your model adapter:

```ts
configureMediaInspector(async ({ bytes, mime, kind }) => {
  // Send these bytes to your own classifier, with authentication and timeout.
  // Translate its result into one of the supported verdicts.
  return { status: "allowed" }; // only after the classifier actually approves
});
```

The default adapter returns `unreviewed` and sends nothing to any service.
Uploads and embedded/managed media on publication call the adapter. A `blocked`
verdict rejects the request with 422; thrown errors or malformed results also
reject it. A connected production adapter should throw on timeout/unavailability
and never substitute `unreviewed` for a failed check. Verdicts are not persisted
as approvals in this implementation.

**Current limits:** local checks cannot determine whether a valid image, audio
file or video depicts pornography, violence or abuse. Remote media and external
links are checked as URLs only; the server does not fetch them. Their contents
can change or redirect after publication. To enforce visual policy on them,
add controlled media ingestion, redirect/DNS/IP checks and moderation before
hosting; remote URLs must then be restricted to that pipeline. There is no
antivirus engine, OCR, video-frame extraction, audio transcription or exhaustive
malicious-domain database here.

On startup, idempotent schema changes add `uploaded_by` to both upload tables.
Legacy files without that value retain page-level ownership checks. Invalid
legacy publications are withheld from the public API, but remain available to
their owner through `/api/me/profile` for correction. No existing row is deleted.

## Verification

Run `npm run test:safety`, `npx tsc --noEmit` and `npm run build`. The safety
tests cover nested fields, split-run evasions, URL schemes/hosts, forged files,
real image decoding, classifier rejection/failure and HTTP upload/publication
guards. HTTP tests stub Postgres and never connect to a live database.

Validation follows the layered approach described in the
[OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
and [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html).
