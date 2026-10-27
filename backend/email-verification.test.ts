import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { once } from "node:events";
import type { PoolClient } from "pg";
import { PGlite } from "@electric-sql/pglite";
import express from "express";
import cookieParser from "cookie-parser";
import { ABUSE_SCHEMA } from "./abuse-schema";
import { EMAIL_VERIFICATION_SCHEMA } from "./email-verification-schema";
import { mailTransport, EmailDeliveryError, type TransactionalEmail } from "./email";

process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:1/test";
process.env.ABUSE_SECRET = "email-verification-test-secret-at-least-32-chars";
process.env.RESEND_API_KEY = "re_test_only";
process.env.RESEND_FROM = "noreply@example.test";
process.env.FRONTEND_URL = "http://localhost:8080";
process.env.NODE_ENV = "test";
const { pool } = await import("./db");
const { authDb } = await import("./auth-transaction");
const { authRouter } = await import("./routes/auth");
const { meRouter } = await import("./routes/me");
const { profilesRouter } = await import("./routes/profiles");
const { errorHandler } = await import("./http-errors");
const { requestEmailVerification, confirmEmail, verificationHash } =
  await import("./email-verification");
const { hashPassword, createSession, getUserForToken } = await import("./auth");
const { solveRegistrationProof } = await import("../src/lib/registration-pow");
const db = new PGlite();
const sent: TransactionalEmail[] = [];
const realDeliver = mailTransport.deliver.bind(mailTransport);
let mailFails = false;
let origin = "";
let server: ReturnType<ReturnType<typeof express>["listen"]>;
let ip = 1;
before(async () => {
  await db.exec(`CREATE TABLE users(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password_hash TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE sessions(token TEXT PRIMARY KEY,user_id UUID REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE password_reset_tokens(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id) ON DELETE CASCADE,code_hash TEXT,reset_token TEXT UNIQUE,attempts INT NOT NULL DEFAULT 0,verified_at TIMESTAMPTZ,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE oauth_accounts(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id) ON DELETE CASCADE,provider TEXT,provider_user_id TEXT,UNIQUE(provider,provider_user_id));`);
  await db.exec(ABUSE_SCHEMA);
  await db.query(
    "INSERT INTO users(email,name,password_hash) VALUES('legacy@example.test','Existing User',$1)",
    [await hashPassword("test-password-123")],
  );
  await db.exec(EMAIL_VERIFICATION_SCHEMA);
  await db.exec(EMAIL_VERIFICATION_SCHEMA);
  test.mock.method(pool, "query", (sql: string, values: unknown[] = []) =>
    db.query<Record<string, unknown>>(sql, values),
  );
  test.mock.method(
    authDb,
    "transaction",
    async <T>(operation: (client: Pick<PoolClient, "query">) => Promise<T>) =>
      db.transaction((tx) =>
        operation({ query: tx.query.bind(tx) } as unknown as Pick<PoolClient, "query">),
      ),
  );
  test.mock.method(mailTransport, "deliver", async (message: TransactionalEmail) => {
    if (mailFails) throw new EmailDeliveryError();
    sent.push(message);
  });
  const app = express();
  // Synthetic client IPs keep independent cases from exhausting a shared IP
  // quota. The production proxy configuration is tested in abuse.test.ts.
  app.set("trust proxy", "loopback");
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", authRouter);
  app.use("/api/me", meRouter);
  app.use("/api/profiles", profilesRouter);
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  origin = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  test.mock.restoreAll();
  await db.close();
});
function call(path: string, body?: unknown, cookie?: string, method = "POST", network?: string) {
  return fetch(origin + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": network ?? `192.0.2.${ip++}`,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "manual",
  });
}
const cookieOf = (response: Response) => response.headers.get("set-cookie")?.split(";")[0];
function tokenOf(message: TransactionalEmail) {
  const link = message.text.match(/http[^\s]+/)![0];
  const url = new URL(link);
  assert.equal(url.search, "");
  assert.equal(url.pathname, "/verify-email");
  return new URLSearchParams(url.hash.slice(1)).get("token")!;
}
async function user(email: string, verified = false) {
  return (
    await db.query<{ id: string }>(
      "INSERT INTO users(email,name,password_hash,email_verified_at) VALUES($1,'Test User',$2,CASE WHEN $3 THEN now() ELSE NULL END) RETURNING id",
      [email, await hashPassword("test-password-123"), verified],
    )
  ).rows[0].id;
}
async function signup(email: string) {
  const network = `192.0.2.${ip++}`;
  const response = await call(
    "/api/auth/registration-challenge",
    undefined,
    undefined,
    "GET",
    network,
  );
  const challenge = await response.json();
  const cookie = cookieOf(response)!;
  const proof = solveRegistrationProof(challenge.nonce, challenge.difficulty);
  await db.query<Record<string, unknown>>(
    "UPDATE registration_challenges SET created_at=now()-interval '3 seconds' WHERE id=$1",
    [challenge.id],
  );
  return call(
    "/api/auth/signup",
    {
      name: "Test User",
      email,
      password: "test-password-123",
      website: "",
      challengeId: challenge.id,
      proof,
    },
    cookie,
    "POST",
    network,
  );
}
async function ageToken(id: string) {
  await db.query<Record<string, unknown>>(
    "UPDATE email_verification_tokens SET created_at=now()-interval '70 seconds' WHERE user_id=$1",
    [id],
  );
}

test("migration preserves historical access without inventing an email verification timestamp", async () => {
  const row = (
    await db.query<{ email_verified_at: Date | null; email_verification_required: boolean }>(
      "SELECT email_verified_at,email_verification_required FROM users WHERE email='legacy@example.test'",
    )
  ).rows[0];
  assert.equal(row.email_verified_at, null);
  assert.equal(row.email_verification_required, false);
  assert.equal(
    (
      await call("/api/auth/signin", {
        email: "legacy@example.test",
        password: "test-password-123",
      })
    ).status,
    200,
  );
  await db.exec(EMAIL_VERIFICATION_SCHEMA);
  assert.equal(
    (
      await db.query<{ email_verification_required: boolean }>(
        "SELECT email_verification_required FROM users WHERE email='legacy@example.test'",
      )
    ).rows[0].email_verification_required,
    false,
  );
});

test("signup sends a fragment link but grants no session or publication until confirmed", async () => {
  const response = await signup("signup@example.test");
  assert.equal(response.status, 201);
  assert.equal(cookieOf(response), undefined);
  assert.equal((await response.json()).verificationRequired, true);
  const row = (
    await db.query<{ id: string; email_verified_at: Date | null }>(
      "SELECT id,email_verified_at FROM users WHERE email='signup@example.test'",
    )
  ).rows[0];
  assert.equal(row.email_verified_at, null);
  const mail = sent.at(-1)!;
  const token = tokenOf(mail);
  assert.match(token, /^[a-f0-9]{64}$/);
  const record = (
    await db.query<{ token_hash: string; ttl: number }>(
      "SELECT token_hash,EXTRACT(EPOCH FROM expires_at-created_at)::int AS ttl FROM email_verification_tokens WHERE user_id=$1",
      [row.id],
    )
  ).rows[0];
  assert.equal(record.token_hash, verificationHash(token));
  assert.notEqual(record.token_hash, token);
  assert.ok(record.ttl >= 1790 && record.ttl <= 1800);
  const blocked = await call("/api/auth/signin", {
    email: "signup@example.test",
    password: "test-password-123",
  });
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).code, "EMAIL_VERIFICATION_REQUIRED");
  const oldSession = await createSession(row.id);
  assert.equal(await getUserForToken(oldSession), null);
  assert.equal(
    (await call("/api/profiles/test", {}, `linqo_session=${oldSession}`, "PUT")).status,
    401,
  );
  assert.equal((await call("/api/auth/verify-email", { token })).status, 200);
  assert.equal((await call("/api/auth/verify-email", { token })).status, 400);
  const login = await call("/api/auth/signin", {
    email: "signup@example.test",
    password: "test-password-123",
  });
  assert.equal(login.status, 200);
  assert.match(cookieOf(login)!, /^linqo_session=/);
});

test("resend is bounded, rotates the previous link and expiry never verifies an account", async () => {
  const id = await user("resend@example.test");
  await requestEmailVerification(id);
  const old = tokenOf(sent.at(-1)!);
  await assert.rejects(
    requestEmailVerification(id),
    (error: { code?: string }) => error.code === "VERIFICATION_COOLDOWN",
  );
  await ageToken(id);
  await requestEmailVerification(id);
  const latest = tokenOf(sent.at(-1)!);
  await assert.rejects(confirmEmail(old));
  await db.query<Record<string, unknown>>(
    "UPDATE email_verification_tokens SET expires_at=now()-interval '1 second' WHERE user_id=$1",
    [id],
  );
  await assert.rejects(confirmEmail(latest));
  assert.equal(
    (
      await db.query<Record<string, unknown>>("SELECT email_verified_at FROM users WHERE id=$1", [
        id,
      ])
    ).rows[0].email_verified_at,
    null,
  );
});

test("concurrent confirmation claims are single-use and malformed links fail closed", async () => {
  const id = await user("race@example.test");
  await requestEmailVerification(id);
  const token = tokenOf(sent.at(-1)!);
  const outcomes = await Promise.allSettled([confirmEmail(token), confirmEmail(token)]);
  assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter((r) => r.status === "rejected").length, 1);
  for (const invalid of ["", "<script>", "a".repeat(63), "f".repeat(64)])
    await assert.rejects(confirmEmail(invalid));
});

test("missing configuration and failed delivery do not silently activate accounts", async () => {
  const key = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const failed = await signup("not-created@example.test");
    assert.equal(failed.status, 201);
    const failure = await failed.json();
    assert.equal(failure.verificationRequired, true);
    assert.equal(failure.emailSent, false);
    assert.match(failure.deliveryError, /account is saved/);
    assert.equal(cookieOf(failed), undefined);
    assert.equal(
      (await db.query("SELECT id FROM users WHERE email='not-created@example.test'")).rows.length,
      1,
    );
    // Existing passwords work independently of the email service.
    assert.equal(
      (
        await call("/api/auth/signin", {
          email: "  LEGACY@EXAMPLE.TEST  ",
          password: "test-password-123",
        })
      ).status,
      200,
    );
    assert.equal(
      (await call("/api/auth/forgot-password", { email: "unknown@example.test" })).status,
      503,
    );
    await assert.rejects(
      requestEmailVerification("00000000-0000-0000-0000-000000000001"),
      EmailDeliveryError,
    );
  } finally {
    process.env.RESEND_API_KEY = key;
  }
  mailFails = true;
  try {
    const response = await signup("failed-mail@example.test");
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.verificationRequired, true);
    assert.equal(result.emailSent, false);
    assert.equal(cookieOf(response), undefined);
  } finally {
    mailFails = false;
  }
  const row = (
    await db.query<{ id: string; email_verified_at: Date | null }>(
      "SELECT id,email_verified_at FROM users WHERE email='failed-mail@example.test'",
    )
  ).rows[0];
  assert.equal(row.email_verified_at, null);
  await ageToken(row.id);
  const response = await call("/api/auth/resend-verification", {
    email: "failed-mail@example.test",
  });
  assert.equal(response.status, 200);
  await confirmEmail(tokenOf(sent.at(-1)!));
});

test("consecutive email registrations keep separate passwords and independently confirm", async () => {
  for (const email of ["first-new@example.test", "second-new@example.test"]) {
    const response = await signup(email);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { verificationRequired: true, email, emailSent: true });
    const pending = await call("/api/auth/signin", { email, password: "test-password-123" });
    assert.equal(pending.status, 403);
    assert.equal((await pending.json()).code, "EMAIL_VERIFICATION_REQUIRED");
    await confirmEmail(tokenOf(sent.at(-1)!));
    const login = await call("/api/auth/signin", {
      email: email.toUpperCase(),
      password: "test-password-123",
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).user.email, email);
  }
});

test("OAuth-only and unknown accounts never pretend to accept a provider password", async () => {
  await db.query(
    "INSERT INTO users(email,name,email_verified_at) VALUES('provider-only@example.test','Provider User',now())",
  );
  const failures = [];
  for (const email of [
    "provider-only@example.test",
    "unknown-user@example.test",
    "legacy@example.test",
  ]) {
    const response = await call("/api/auth/signin", { email, password: "a-provider-password" });
    assert.equal(response.status, 401);
    assert.equal(cookieOf(response), undefined);
    failures.push(await response.json());
  }
  assert.deepEqual(failures[0], failures[1]);
  assert.deepEqual(failures[1], failures[2]);
  assert.equal(failures[0].code, "INVALID_CREDENTIALS");
  assert.equal(failures[0].error, "Invalid email or password");
});

test("signup without Resend still creates accounts waiting for email confirmation", async () => {
  const key = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  const sentBefore = sent.length;
  try {
    for (const email of ["local-first@example.test", "local-second@example.test"]) {
      const created = await signup(email);
      assert.equal(created.status, 201);
      const result = await created.json();
      assert.equal(result.verificationRequired, true);
      assert.equal(result.email, email);
      assert.equal(result.emailSent, false);
      assert.equal(cookieOf(created), undefined);
      const login = await call("/api/auth/signin", { email, password: "test-password-123" });
      assert.equal(login.status, 403);
      assert.equal((await login.json()).code, "EMAIL_VERIFICATION_REQUIRED");
      const row = (
        await db.query<{ email_verified_at: Date | null; password_hash: string }>(
          "SELECT email_verified_at,password_hash FROM users WHERE email=$1",
          [email],
        )
      ).rows[0];
      assert.equal(row.email_verified_at, null);
      assert.notEqual(row.password_hash, "test-password-123");
      assert.equal(
        (await call("/api/auth/signin", { email, password: "incorrect-password" })).status,
        401,
      );
    }
    assert.equal(sent.length, sentBefore);
    const retry = await signup("local-first@example.test");
    assert.equal(retry.status, 403);
    assert.equal((await retry.json()).code, "EMAIL_VERIFICATION_REQUIRED");
  } finally {
    process.env.RESEND_API_KEY = key;
  }
  const resend = await call("/api/auth/resend-verification", { email: "local-first@example.test" });
  assert.equal(resend.status, 200);
  await confirmEmail(tokenOf(sent.at(-1)!));
  assert.equal(
    (
      await call("/api/auth/signin", {
        email: "local-first@example.test",
        password: "test-password-123",
      })
    ).status,
    200,
  );
});

test("unconfirmed accounts cannot sign in in either development or production", async () => {
  const id = await user("pending-all-environments@example.test");
  const session = await createSession(id);
  try {
    for (const environment of ["development", "production"]) {
      process.env.NODE_ENV = environment;
      assert.equal(await getUserForToken(session), null);
      const login = await call("/api/auth/signin", {
        email: "pending-all-environments@example.test",
        password: "test-password-123",
      });
      assert.equal(login.status, 403);
      assert.equal((await login.json()).code, "EMAIL_VERIFICATION_REQUIRED");
    }
  } finally {
    process.env.NODE_ENV = "test";
  }
});

test("email changes preserve the old address until proof, then revoke sessions and reset tokens", async () => {
  const id = await user("before@example.test", true);
  const cookie = `linqo_session=${await createSession(id)}`;
  const changed = await call(
    "/api/me",
    { email: "after@example.test", currentPassword: "test-password-123" },
    cookie,
    "PATCH",
  );
  assert.equal(changed.status, 200);
  const updated = (await changed.json()).user;
  assert.equal(updated.email, "before@example.test");
  assert.equal(updated.pendingEmail, "after@example.test");
  const token = tokenOf(sent.at(-1)!);
  await db.query<Record<string, unknown>>(
    "INSERT INTO password_reset_tokens(user_id,email,reset_token,verified_at,expires_at) VALUES($1,'before@example.test',$2,now(),now()+interval '10 minutes')",
    [id, "a".repeat(64)],
  );
  assert.equal(
    (await call("/api/auth/signin", { email: "after@example.test", password: "test-password-123" }))
      .status,
    401,
  );
  assert.equal((await confirmEmail(token)).emailChange, true);
  assert.equal(
    (
      await db.query<Record<string, unknown>>("SELECT email,pending_email FROM users WHERE id=$1", [
        id,
      ])
    ).rows[0].email,
    "after@example.test",
  );
  assert.equal(await getUserForToken(cookie.split("=")[1]), null);
  assert.equal(
    (
      await call("/api/auth/reset-password", {
        resetToken: "a".repeat(64),
        password: "new-password-123",
      })
    ).status,
    401,
  );
  assert.equal(
    (await call("/api/auth/signin", { email: "after@example.test", password: "test-password-123" }))
      .status,
    200,
  );
});

test("a competing email claim rolls back and leaves the current identity unchanged", async () => {
  const id = await user("collision-source@example.test", true);
  await requestEmailVerification(id, "collision-target@example.test");
  const token = tokenOf(sent.at(-1)!);
  await user("collision-target@example.test", true);
  await assert.rejects(confirmEmail(token), (error: { status?: number }) => error.status === 409);
  assert.equal(
    (await db.query<Record<string, unknown>>("SELECT email FROM users WHERE id=$1", [id])).rows[0]
      .email,
    "collision-source@example.test",
  );
  assert.equal(
    (
      await db.query<Record<string, unknown>>(
        "SELECT token_hash FROM email_verification_tokens WHERE user_id=$1",
        [id],
      )
    ).rows.length,
    1,
  );
});

test("password recovery proves the current email, consumes its token once and invalidates sessions", async () => {
  const id = await user("reset@example.test");
  const old = await createSession(id);
  const start = sent.length;
  assert.equal(
    (await call("/api/auth/forgot-password", { email: "reset@example.test" })).status,
    200,
  );
  for (let i = 0; i < 200 && sent.length === start; i++)
    await new Promise((resolve) => setTimeout(resolve, 10));
  const code = sent.at(-1)!.text.match(/code is (\d{6})/)![1];
  const response = await call("/api/auth/verify-reset-code", { email: "reset@example.test", code });
  assert.equal(response.status, 200);
  const { resetToken } = await response.json();
  const results = await Promise.all([
    call("/api/auth/reset-password", { resetToken, password: "recovered-password-123" }),
    call("/api/auth/reset-password", { resetToken, password: "recovered-password-123" }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 401]);
  assert.equal(await getUserForToken(old), null);
  assert.ok(
    (
      await db.query<Record<string, unknown>>("SELECT email_verified_at FROM users WHERE id=$1", [
        id,
      ])
    ).rows[0].email_verified_at,
  );
  assert.equal(
    (
      await call("/api/auth/signin", {
        email: "reset@example.test",
        password: "recovered-password-123",
      })
    ).status,
    200,
  );
});

test("verified OAuth safely claims new registrations and preserves historical provider access", async () => {
  const id = await user("oauth@example.test");
  let providerEmail = "oauth@example.test";
  process.env.GOOGLE_CLIENT_ID = "test-client";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  const originalFetch = globalThis.fetch;
  const mocked = test.mock.method(
    globalThis,
    "fetch",
    async (input: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) => {
      const url = String(input);
      if (url === "https://oauth2.googleapis.com/token")
        return Response.json({ access_token: "fake-token" });
      if (url === "https://openidconnect.googleapis.com/v1/userinfo")
        return Response.json({
          sub: "google-test-identity",
          email: providerEmail,
          email_verified: true,
          name: "Owner",
        });
      return originalFetch(input, options);
    },
  );
  try {
    const response = await call(
      "/api/auth/google/callback?code=fake-code&state=test-state",
      undefined,
      "linqo_oauth_state=test-state; linqo_oauth_verifier=test-verifier",
      "GET",
    );
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "http://localhost:8080/build");
    const row = (
      await db.query<Record<string, unknown>>(
        "SELECT password_hash,email_verified_at FROM users WHERE id=$1",
        [id],
      )
    ).rows[0];
    assert.equal(row.password_hash, null);
    assert.ok(row.email_verified_at);
    assert.equal(
      (
        await call("/api/auth/signin", {
          email: "oauth@example.test",
          password: "test-password-123",
        })
      ).status,
      401,
    );
    // A previously linked provider may have changed its email. Preserve the
    // historical identity login without certifying the account's old address.
    await db.query(
      "UPDATE users SET email_verified_at=NULL,email_verification_required=false WHERE id=$1",
      [id],
    );
    providerEmail = "changed-provider-address@example.test";
    const historical = await call(
      "/api/auth/google/callback?code=fake-code&state=test-state",
      undefined,
      "linqo_oauth_state=test-state; linqo_oauth_verifier=test-verifier",
      "GET",
    );
    assert.equal(historical.status, 302);
    assert.equal(historical.headers.get("location"), "http://localhost:8080/build");
    assert.ok(cookieOf(historical));
    assert.equal(
      (
        await db.query<{ email_verified_at: Date | null }>(
          "SELECT email_verified_at FROM users WHERE id=$1",
          [id],
        )
      ).rows[0].email_verified_at,
      null,
    );
  } finally {
    mocked.mock.restore();
  }
});

test("Resend requests use bounded transport, idempotency and generic provider errors", async () => {
  const message = {
    to: "transport@example.test",
    subject: "Test",
    text: "Test",
    html: "<p>Test</p>",
    idempotencyKey: "verification/test-key",
  };
  let reject = false;
  const mocked = test.mock.method(
    globalThis,
    "fetch",
    async (input: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) => {
      assert.equal(String(input), "https://api.resend.com/emails");
      assert.equal(options?.method, "POST");
      assert.ok(options?.signal);
      assert.equal(
        (options?.headers as Record<string, string>)["Idempotency-Key"],
        message.idempotencyKey,
      );
      const payload = JSON.parse(String(options?.body));
      assert.equal(payload.from, "Linqo <noreply@example.test>");
      assert.deepEqual(payload.to, [message.to]);
      return reject
        ? Response.json({ message: "sensitive provider error" }, { status: 403 })
        : Response.json({ id: "test-message-id" });
    },
  );
  try {
    await realDeliver(message);
    reject = true;
    await assert.rejects(
      realDeliver(message),
      (error: Error) => error instanceof EmailDeliveryError && !error.message.includes("sensitive"),
    );
  } finally {
    mocked.mock.restore();
  }
});
