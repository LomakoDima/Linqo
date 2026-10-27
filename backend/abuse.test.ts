import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import process from "node:process";
import { once } from "node:events";
import { PGlite } from "@electric-sql/pglite";
import express from "express";
import cookieParser from "cookie-parser";
import { ABUSE_SCHEMA } from "./abuse-schema";
import { EMAIL_VERIFICATION_SCHEMA } from "./email-verification-schema";
import { mailTransport } from "./email";
import type { PoolClient } from "pg";
import { solveRegistrationProof } from "../src/lib/registration-pow";
import { detectProfileSpam } from "../src/lib/spam-detection";
import { defaultProfile, type Profile } from "../src/lib/link-store";
import { errorHandler } from "./http-errors";

process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:1/test";
process.env.ABUSE_SECRET = "anti-abuse-test-secret-with-at-least-32-characters";
process.env.RESEND_API_KEY = "re_test_only";
process.env.RESEND_FROM = "noreply@example.test";
process.env.FRONTEND_URL = "http://localhost:8080";
const { pool } = await import("./db");
const { authDb } = await import("./auth-transaction");
const { consumeCounter, networkIdentity, trustedProxies, rateLimit } = await import("./abuse");
const { validProof, issueRegistrationChallenge, verifyRegistration } =
  await import("./registration");
const { savePublication, publicationDb, campaignFingerprint } =
  await import("./publication-limits");
const { authRouter } = await import("./routes/auth");
const db = new PGlite();
const query = (sql: string, values: unknown[]) => db.query<Record<string, unknown>>(sql, values);
let restoreQuery: () => void;
let restoreTransactions: () => void;
before(async () => {
  await db.exec(`CREATE TABLE users(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL DEFAULT 'Test',email TEXT UNIQUE,password_hash TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE profiles(slug TEXT PRIMARY KEY,data JSONB NOT NULL,owner_id UUID REFERENCES users(id),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE sessions(token TEXT PRIMARY KEY,user_id UUID REFERENCES users(id),expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
  await db.exec(ABUSE_SCHEMA);
  await db.exec(
    `CREATE TABLE password_reset_tokens(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),code_hash TEXT,reset_token TEXT,attempts INT DEFAULT 0,verified_at TIMESTAMPTZ,expires_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT now());`,
  );
  await db.exec(EMAIL_VERIFICATION_SCHEMA);
  test.mock.method(mailTransport, "deliver", async () => {});
  test.mock.method(
    authDb,
    "transaction",
    async <T>(operation: (client: Pick<PoolClient, "query">) => Promise<T>) =>
      db.transaction((tx) =>
        operation({ query: tx.query.bind(tx) } as unknown as Pick<PoolClient, "query">),
      ),
  );
  await db.exec(ABUSE_SCHEMA); // migration is safe to re-run
  const mocked = test.mock.method(pool, "query", query);
  const transactions = test.mock.method(
    publicationDb,
    "transaction",
    async <T>(operation: (q: typeof query) => Promise<T>) =>
      db.transaction((tx) =>
        operation((sql, values) => tx.query<Record<string, unknown>>(sql, values)),
      ),
  );
  restoreQuery = () => mocked.mock.restore();
  restoreTransactions = () => transactions.mock.restore();
});
after(async () => {
  restoreQuery();
  restoreTransactions();
  await db.close();
});

async function user(fresh = false): Promise<string> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO users(created_at) VALUES(now()-$1*interval '1 hour') RETURNING id`,
    [fresh ? 0 : 48],
  );
  return result.rows[0].id;
}
async function ageEvents(owner: string): Promise<void> {
  await db.query(
    "UPDATE publication_events SET created_at=now()-interval '1 minute' WHERE owner_id=$1",
    [owner],
  );
}

test("shared SQL counters atomically reject parallel excess and expire without extending bans", async () => {
  const results = await Promise.all(
    Array.from({ length: 12 }, () =>
      consumeCounter(query, "parallel-test", { max: 5, seconds: 60 }),
    ),
  );
  assert.equal(results.filter((r) => r.allowed).length, 5);
  const before = await db.query<{ expires_at: Date }>(
    "SELECT expires_at FROM abuse_counters WHERE key='parallel-test'",
  );
  await consumeCounter(query, "parallel-test", { max: 5, seconds: 60 });
  const after = await db.query<{ expires_at: Date }>(
    "SELECT expires_at FROM abuse_counters WHERE key='parallel-test'",
  );
  assert.equal(String(before.rows[0].expires_at), String(after.rows[0].expires_at));
  await db.exec(
    "UPDATE abuse_counters SET expires_at=now()-interval '1 second' WHERE key='parallel-test'",
  );
  assert.equal(
    (await consumeCounter(query, "parallel-test", { max: 5, seconds: 60 })).remaining,
    4,
  );
  assert.equal(
    (await consumeCounter(query, "bytes-test", { max: 10, seconds: 60 }, 8)).allowed,
    true,
  );
  assert.equal(
    (await consumeCounter(query, "bytes-test", { max: 10, seconds: 60 }, 3)).allowed,
    false,
  );
});

test("IP identities resist mapped-IPv4 and IPv6 rotation, with safe proxy defaults", () => {
  assert.equal(networkIdentity("::ffff:192.0.2.10"), networkIdentity("192.0.2.10"));
  assert.equal(networkIdentity("2001:db8:1:2::1"), networkIdentity("2001:db8:1:2::ffff"));
  assert.notEqual(networkIdentity("2001:db8:1:2::1"), networkIdentity("2001:db8:1:3::1"));
  assert.equal(trustedProxies(undefined), false);
  assert.throws(() => trustedProxies("true"));
  assert.throws(() => trustedProxies("0.0.0.0/0"));
  assert.throws(() => trustedProxies("192.0.2.10/0"));
});

test("publication quotas preserve no-op writes, enforce cooldowns, page limits and rollback", async () => {
  const owner = await user(true),
    profile = { ...defaultProfile, slug: "quota-page" };
  const first = await savePublication(profile, owner);
  assert.equal(first.unchanged, false);
  const same = await savePublication({ ...profile }, owner);
  assert.equal(same.unchanged, true);
  assert.equal(same.updatedAt, first.updatedAt);
  assert.equal(
    (
      await db.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM publication_events WHERE owner_id=$1",
        [owner],
      )
    ).rows[0].count,
    1,
  );
  await assert.rejects(savePublication({ ...profile, bio: "Changed" }, owner), {
    code: "PUBLISH_COOLDOWN",
  });
  await assert.rejects(savePublication({ ...profile, slug: "second-page" }, owner), {
    code: "PAGE_LIMIT",
  });
  assert.equal(
    (
      await db.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM profiles WHERE owner_id=$1",
        [owner],
      )
    ).rows[0].count,
    1,
  );
  await ageEvents(owner);
  await savePublication({ ...profile, bio: "Changed" }, owner);
  await db.query(
    `INSERT INTO publication_events(owner_id,content_hash,created_at) SELECT $1,'x',now()-interval '2 minutes' FROM generate_series(1,28)`,
    [owner],
  );
  await ageEvents(owner);
  await assert.rejects(savePublication({ ...profile, bio: "Another change" }, owner), {
    code: "PUBLICATION_QUOTA",
  });
  const other = await user();
  await assert.rejects(savePublication({ ...profile, bio: "Hijack" }, other), { status: 403 });
});

test("spam detection catches repetition and multi-account campaigns without flagging templates", async () => {
  assert.deepEqual(detectProfileSpam(defaultProfile), []);
  assert.ok(
    detectProfileSpam({
      ...defaultProfile,
      blocks: Array.from({ length: 6 }, (_, i) => ({
        id: String(i),
        type: "text",
        title: "Buy the same promotional offer today",
      })),
    }).length,
  );
  assert.ok(
    detectProfileSpam({
      ...defaultProfile,
      blocks: Array.from({ length: 12 }, (_, i) => ({
        id: String(i),
        type: "link",
        url: `https://example.com/offer?utm_source=${i}`,
      })),
    }).length,
  );
  assert.deepEqual(
    detectProfileSpam({
      ...defaultProfile,
      blocks: Array.from({ length: 12 }, (_, i) => ({
        id: String(i),
        type: "link",
        url: `https://example.com/offer#section-${i}`,
      })),
    }),
    [],
  );
  const profile: Profile = {
    ...defaultProfile,
    blocks: [0, 1, 2].map((i) => ({
      id: String(i),
      type: "banner",
      title: `Offer number ${i}: a detailed promotional description for the same coordinated campaign`,
      url: `https://campaign.example.com/offer-${i}`,
    })),
  };
  assert.ok(campaignFingerprint(profile));
  assert.equal(campaignFingerprint(defaultProfile), null);
  const originalOwner = await user();
  await savePublication({ ...profile, slug: "original-campaign" }, originalOwner);
  await db.query(
    "UPDATE publication_events SET created_at=now()-interval '2 hours' WHERE owner_id=$1",
    [originalOwner],
  );
  for (let i = 0; i < 5; i++)
    await savePublication({ ...profile, slug: `campaign-${i}` }, await user());
  const blocked = await user();
  await assert.rejects(savePublication({ ...profile, slug: "campaign-six" }, blocked), {
    code: "DUPLICATE_CAMPAIGN",
  });
  assert.equal(
    (await db.query("SELECT slug FROM profiles WHERE owner_id=$1", [blocked])).rows.length,
    0,
  );
  await savePublication(
    { ...profile, slug: "original-campaign", bio: "An update from the original owner" },
    originalOwner,
  );
});

test("registration and HTTP limits reject replay, forged IP headers and honeypots", async () => {
  const app = express();
  app.use(cookieParser(), express.json());
  app.get("/challenge", issueRegistrationChallenge);
  app.post("/proof", async (req, res) => {
    await verifyRegistration(req);
    res.json({ ok: true });
  });
  app.get("/limited", rateLimit("http-fixture", { max: 2, seconds: 60 }), (_req, res) =>
    res.json({ ok: true }),
  );
  app.use("/api/auth", authRouter);
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    for (let i = 0; i < 2; i++)
      assert.equal(
        (await fetch(origin + "/limited", { headers: { "X-Forwarded-For": `192.0.2.${i}` } }))
          .status,
        200,
      );
    const excess = await fetch(origin + "/limited", {
      headers: { "X-Forwarded-For": "192.0.2.99" },
    });
    assert.equal(excess.status, 429);
    assert.ok(Number(excess.headers.get("Retry-After")) > 0);
    const issued = await fetch(origin + "/challenge");
    const challenge = await issued.json();
    const cookie = issued.headers.get("set-cookie")!.split(";")[0];
    const proof = solveRegistrationProof(challenge.nonce, challenge.difficulty);
    assert.equal(validProof(challenge.nonce, proof, challenge.difficulty), true);
    await db.query(
      "UPDATE registration_challenges SET created_at=now()+interval '1 minute' WHERE id=$1",
      [challenge.id],
    );
    const post = (website = "", withCookie = true) =>
      fetch(origin + "/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(withCookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify({ challengeId: challenge.id, proof, website }),
      });
    assert.equal((await post()).status, 400, "too fast");
    await db.query(
      "UPDATE registration_challenges SET created_at=now()-interval '3 seconds' WHERE id=$1",
      [challenge.id],
    );
    assert.equal((await post("https://bot.example")).status, 400);
    assert.equal((await post("", false)).status, 400);
    const raced = await Promise.all([post(), post()]);
    assert.deepEqual(raced.map((r) => r.status).sort(), [200, 400]);
    assert.equal((await post()).status, 400, "replayed proof");
    assert.equal(
      (
        await fetch(origin + "/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Bot",
            email: "bot@example.com",
            password: "fake-test-password",
          }),
        })
      ).status,
      400,
    );
    assert.equal(validProof(challenge.nonce, "not-a-proof", 18), false);
    assert.throws(() => solveRegistrationProof(challenge.nonce, 99));
    const signChallengeResponse = await fetch(origin + "/api/auth/registration-challenge");
    const signChallenge = await signChallengeResponse.json();
    const signCookie = signChallengeResponse.headers.get("set-cookie")!.split(";")[0];
    const signProof = solveRegistrationProof(signChallenge.nonce, signChallenge.difficulty);
    await db.query(
      "UPDATE registration_challenges SET created_at=now()-interval '3 seconds' WHERE id=$1",
      [signChallenge.id],
    );
    const registered = await fetch(origin + "/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: signCookie },
      body: JSON.stringify({
        name: "Test Human",
        email: "human@example.com",
        password: "fake-test-password",
        website: "",
        challengeId: signChallenge.id,
        proof: signProof,
      }),
    });
    assert.equal(registered.status, 201);
    assert.ok(!registered.headers.get("set-cookie")?.includes("linqo_session="));
    const result = await registered.json();
    assert.equal(result.email, "human@example.com");
    assert.equal(result.verificationRequired, true);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
