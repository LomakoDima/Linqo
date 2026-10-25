import { createHmac, randomBytes } from "node:crypto";
import ipaddr from "ipaddr.js";
import type { Request, RequestHandler } from "express";
import { pool } from "./db";
import { AbuseError } from "./abuse-error";
export { AbuseError } from "./abuse-error";
export const LIMITS = {
  api: { max: 600, seconds: 60 },
  auth: { max: 40, seconds: 900 },
  signup: { max: 10, seconds: 3600 },
  registration: { max: 20, seconds: 86400 },
  challenge: { max: 30, seconds: 900 },
  signin: { max: 12, seconds: 900 },
  reset: { max: 5, seconds: 3600 },
  content: { max: 30, seconds: 60 },
  uploads: { max: 128 * 1024 * 1024, seconds: 86400 },
  downloads: { max: 1024 * 1024 * 1024, seconds: 3600 },
} as const;
type Rule = { max: number; seconds: number };
type CounterResult = { allowed: boolean; retryAfter: number; remaining: number };
export type CounterQuery = (
  sql: string,
  values: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;

export function networkIdentity(ip: string): string {
  try {
    const address = ipaddr.process(ip);
    if (address.kind() === "ipv4") return address.toString();
    // Aggregate IPv6 privacy addresses within a /64 rather than trusting /128.
    return (
      (address as ipaddr.IPv6).parts
        .slice(0, 4)
        .map((n) => n.toString(16))
        .join(":") + "::/64"
    );
  } catch {
    return "unknown";
  }
}
export function clientNetwork(req: Request): string {
  return networkIdentity(req.ip ?? req.socket.remoteAddress ?? "unknown");
}
export function trustedProxies(value: string | undefined): false | string[] {
  if (!value?.trim()) return false;
  const values = value.split(",").map((s) => s.trim());
  if (values.some((v) => !v || v === "true" || /^\d+$/.test(v) || /\/0$/.test(v)))
    throw new Error("TRUSTED_PROXIES must name trusted proxy IPs/CIDRs, never all clients");
  return values;
}
let secretPromise: Promise<string> | undefined;
async function secret(): Promise<string> {
  const configured = process.env.ABUSE_SECRET;
  if (configured) {
    if (configured.length < 32) throw new Error("ABUSE_SECRET must have at least 32 characters");
    return configured;
  }
  return (secretPromise ??= pool
    .query<{ value: string }>(
      `INSERT INTO app_secrets (name,value) VALUES ('anti-abuse',$1)
    ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name RETURNING value`,
      [randomBytes(32).toString("hex")],
    )
    .then((r) => r.rows[0].value)
    .catch((error) => {
      secretPromise = undefined;
      throw error;
    }));
}
export async function privateKey(scope: string, identity: string): Promise<string> {
  return createHmac("sha256", await secret())
    .update(scope + "\0" + identity)
    .digest("hex");
}

// Single-statement counters work across API processes. Rejected traffic cannot
// extend an active window or increment the counter without bound.
export async function consumeCounter(
  query: CounterQuery,
  key: string,
  rule: Rule,
  cost = 1,
): Promise<CounterResult> {
  if (!Number.isSafeInteger(cost) || cost < 1) throw new Error("Invalid abuse counter cost");
  const result = await query(
    `INSERT INTO abuse_counters (key,hits,expires_at)
    VALUES ($1,$2,clock_timestamp()+$3*interval '1 second')
    ON CONFLICT(key) DO UPDATE SET
      hits=CASE WHEN abuse_counters.expires_at<=clock_timestamp() THEN $2 ELSE LEAST(abuse_counters.hits+$2,$4+$2) END,
      expires_at=CASE WHEN abuse_counters.expires_at<=clock_timestamp() THEN clock_timestamp()+$3*interval '1 second' ELSE abuse_counters.expires_at END
    RETURNING hits, GREATEST(1,CEIL(EXTRACT(EPOCH FROM expires_at-clock_timestamp())))::int AS retry_after`,
    [key, cost, rule.seconds, rule.max],
  );
  const hits = Number(result.rows[0].hits);
  return {
    allowed: hits <= rule.max,
    remaining: Math.max(0, rule.max - hits),
    retryAfter: Number(result.rows[0].retry_after),
  };
}
const denied = new Map<string, number>();
let nextCleanup = 0;
export async function enforceLimit(
  scope: string,
  identity: string,
  rule: Rule,
  cost = 1,
): Promise<CounterResult> {
  const key = await privateKey(scope, identity);
  const now = Date.now(),
    until = denied.get(key);
  if (until && until > now)
    throw new AbuseError(
      "RATE_LIMITED",
      "Too many requests. Please try again later.",
      Math.ceil((until - now) / 1000),
    );
  const result = await consumeCounter((sql, values) => pool.query(sql, values), key, rule, cost);
  if (now >= nextCleanup) {
    nextCleanup = now + 60_000;
    for (const [entry, expiry] of denied) if (expiry <= now) denied.delete(entry);
    // Bounded TTL cleanup, with no request bodies or raw identifiers logged.
    void pool
      .query(
        `DELETE FROM abuse_counters WHERE key IN (SELECT key FROM abuse_counters WHERE expires_at<now() ORDER BY expires_at LIMIT 1000)`,
      )
      .catch(() => {
        nextCleanup = 0;
      });
  }
  if (!result.allowed) {
    if (denied.size >= 10_000) denied.delete(denied.keys().next().value!);
    denied.set(key, now + result.retryAfter * 1000);
    throw new AbuseError(
      "RATE_LIMITED",
      "Too many requests. Please try again later.",
      result.retryAfter,
    );
  }
  return result;
}
export const rateLimit =
  (scope: string, rule: Rule, identity: (req: Request) => string = clientNetwork): RequestHandler =>
  async (req, res, next) => {
    const result = await enforceLimit(scope, identity(req), rule);
    res.setHeader("RateLimit-Limit", String(rule.max));
    res.setHeader("RateLimit-Remaining", String(result.remaining));
    res.setHeader("RateLimit-Reset", String(result.retryAfter));
    next();
  };
const emailIdentity = (req: Request) =>
  typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase().slice(0, 254)
    : "invalid";
export const apiRateLimit: RequestHandler = (req, res, next) =>
  req.path === "/health" ? next() : rateLimit("api-ip", LIMITS.api)(req, res, next);
export const authRateLimit = rateLimit("auth-ip", LIMITS.auth);
export const signupRateLimit = rateLimit("signup-ip", LIMITS.signup);
export const signinRateLimit = rateLimit("signin-email", LIMITS.signin, emailIdentity);
export const resetRateLimit = rateLimit("reset-email", LIMITS.reset, emailIdentity);
export const contentRateLimit = rateLimit(
  "content-user",
  LIMITS.content,
  (req) => req.user?.id ?? clientNetwork(req),
);
export async function registrationBudget(req: Request): Promise<void> {
  await enforceLimit("registrations-ip", clientNetwork(req), LIMITS.registration);
}
export async function uploadBudget(userId: string, bytes: number): Promise<void> {
  if (!Number.isSafeInteger(bytes) || bytes <= 0)
    throw Object.assign(new Error("Choose a non-empty file"), { status: 400 });
  await enforceLimit("upload-bytes", userId, LIMITS.uploads, bytes);
}
export async function downloadBudget(req: Request, bytes: number): Promise<void> {
  if (bytes > 0) await enforceLimit("download-bytes", clientNetwork(req), LIMITS.downloads, bytes);
}
