import crypto from "node:crypto";
import { Router, type Response } from "express";
import { pool } from "../db";
import {
  SESSION_COOKIE,
  createSession,
  destroySession,
  getUserForToken,
  hashPassword,
  sessionCookieOptions,
  verifyPassword,
  type AuthUser,
} from "../auth";
import {
  buildGoogleAuthUrl,
  buildGithubAuthUrl,
  exchangeGoogleCode,
  exchangeGithubCode,
  type OAuthProfile,
  type OAuthProvider,
} from "../oauth";
import { sendPasswordResetEmail } from "../email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const MAX_RESET_ATTEMPTS = 5;

function frontendUrl(): string {
  return process.env.FRONTEND_URL ?? "http://localhost:8080";
}

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const body = req.body ?? {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || name.length > 100) {
    res.status(400).json({ error: "Enter your name" });
    return;
  }
  if (!EMAIL_PATTERN.test(email)) {
    res.status(400).json({ error: "Enter a valid email" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const result = await pool.query<AuthUser>(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
     RETURNING id, name, email, (password_hash IS NOT NULL) AS "hasPassword"`,
    [name, email, passwordHash],
  );
  const user = result.rows[0];

  const token = await createSession(user.id);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  res.status(201).json({ user });
});

authRouter.post("/signin", async (req, res) => {
  const body = req.body ?? {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const result = await pool.query<AuthUser & { password_hash: string | null }>(
    "SELECT id, name, email, password_hash FROM users WHERE email = $1",
    [email],
  );
  const row = result.rows[0];
  // Same message whether the email is unknown, the account is OAuth-only
  // (no password_hash), or the password is wrong — none of those should be
  // distinguishable from the outside.
  const invalid = () => res.status(401).json({ error: "Invalid email or password" });

  if (!row || !row.password_hash) {
    invalid();
    return;
  }
  if (!(await verifyPassword(password, row.password_hash))) {
    invalid();
    return;
  }

  const token = await createSession(row.id);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  res.json({ user: { id: row.id, name: row.name, email: row.email, hasPassword: true } });
});

authRouter.post("/signout", async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (token) await destroySession(token);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

// --- Password reset ---

authRouter.post("/forgot-password", async (req, res) => {
  const body = req.body ?? {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  // Respond immediately and do the real work after — whether the email
  // exists, was recently throttled, or the send itself failed is never
  // observable from the response (shape or timing).
  res.json({ ok: true });

  try {
    if (!EMAIL_PATTERN.test(email)) return;
    const userResult = await pool.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    const user = userResult.rows[0];
    if (!user) return;

    const recent = await pool.query<{ created_at: string }>(
      "SELECT created_at FROM password_reset_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [user.id],
    );
    if (recent.rows[0] && Date.now() - new Date(recent.rows[0].created_at).getTime() < 60_000) {
      return;
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const codeHash = await hashPassword(code);
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, code_hash, expires_at) VALUES ($1, $2, $3)",
      [user.id, codeHash, expiresAt],
    );

    await sendPasswordResetEmail(email, code);
  } catch (err) {
    console.error("forgot-password: background work failed:", err);
  }
});

authRouter.post("/verify-reset-code", async (req, res) => {
  const body = req.body ?? {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const invalid = () =>
    res.status(400).json({ error: "Code expired or invalid — request a new one" });

  const userResult = await pool.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  const user = userResult.rows[0];
  if (!user) {
    invalid();
    return;
  }

  const tokenResult = await pool.query<{ id: string; code_hash: string | null; attempts: number }>(
    `SELECT id, code_hash, attempts FROM password_reset_tokens
     WHERE user_id = $1 AND verified_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [user.id],
  );
  const row = tokenResult.rows[0];
  if (!row || !row.code_hash) {
    invalid();
    return;
  }
  if (row.attempts >= MAX_RESET_ATTEMPTS) {
    await pool.query("DELETE FROM password_reset_tokens WHERE id = $1", [row.id]);
    res.status(400).json({ error: "Too many attempts — request a new code" });
    return;
  }

  if (!(await verifyPassword(code, row.code_hash))) {
    await pool.query("UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = $1", [
      row.id,
    ]);
    invalid();
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  await pool.query(
    `UPDATE password_reset_tokens
     SET reset_token = $1, verified_at = now(), code_hash = NULL, expires_at = $2
     WHERE id = $3`,
    [resetToken, new Date(Date.now() + RESET_CODE_TTL_MS), row.id],
  );
  res.json({ resetToken });
});

authRouter.post("/reset-password", async (req, res) => {
  const body = req.body ?? {};
  const resetToken = typeof body.resetToken === "string" ? body.resetToken : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const tokenResult = await pool.query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE reset_token = $1 AND verified_at IS NOT NULL AND expires_at > now()`,
    [resetToken],
  );
  const row = tokenResult.rows[0];
  if (!row) {
    res.status(401).json({ error: "That reset link expired — start over" });
    return;
  }

  const passwordHash = await hashPassword(password);
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
    passwordHash,
    row.user_id,
  ]);
  await pool.query("DELETE FROM password_reset_tokens WHERE id = $1", [row.id]);
  await pool.query("DELETE FROM sessions WHERE user_id = $1", [row.user_id]);
  res.json({ ok: true });
});

authRouter.get("/me", async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const user = await getUserForToken(token);
  res.json({ user });
});

// --- OAuth (Google + GitHub) ---
//
// The start/callback round trip needs to survive the user leaving this
// origin entirely (they're on accounts.google.com / github.com in between),
// so the CSRF `state` (and Google's PKCE verifier) can't live in server
// memory — they're stashed in short-lived cookies scoped to /api/auth and
// read back on the callback.

const OAUTH_STATE_COOKIE = "linqo_oauth_state";
const OAUTH_VERIFIER_COOKIE = "linqo_oauth_verifier";

function oauthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
    path: "/api/auth",
  };
}

function redirectWithError(res: Response, message: string) {
  res.redirect(`${frontendUrl()}/login?oauthError=${encodeURIComponent(message)}`);
}

// Shared by both providers' callbacks: link to an existing OAuth identity,
// link to an existing password account with the same email, or create a
// brand-new user — then start a real session exactly like signup/signin do.
async function completeOAuthSignIn(provider: OAuthProvider, profile: OAuthProfile) {
  const linked = await pool.query<AuthUser>(
    `SELECT users.id, users.name, users.email, (users.password_hash IS NOT NULL) AS "hasPassword"
     FROM oauth_accounts
     JOIN users ON users.id = oauth_accounts.user_id
     WHERE oauth_accounts.provider = $1 AND oauth_accounts.provider_user_id = $2`,
    [provider, profile.providerUserId],
  );
  if (linked.rows[0]) {
    return { user: linked.rows[0], isNewUser: false };
  }

  const existingByEmail = await pool.query<AuthUser>(
    `SELECT id, name, email, (password_hash IS NOT NULL) AS "hasPassword"
     FROM users WHERE email = $1`,
    [profile.email.toLowerCase()],
  );
  if (existingByEmail.rows[0]) {
    const user = existingByEmail.rows[0];
    await pool.query(
      "INSERT INTO oauth_accounts (user_id, provider, provider_user_id) VALUES ($1, $2, $3)",
      [user.id, provider, profile.providerUserId],
    );
    return { user, isNewUser: false };
  }

  const created = await pool.query<AuthUser>(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, NULL)
     RETURNING id, name, email, (password_hash IS NOT NULL) AS "hasPassword"`,
    [profile.name, profile.email.toLowerCase()],
  );
  const user = created.rows[0];
  await pool.query(
    "INSERT INTO oauth_accounts (user_id, provider, provider_user_id) VALUES ($1, $2, $3)",
    [user.id, provider, profile.providerUserId],
  );
  return { user, isNewUser: true };
}

authRouter.get("/google", (req, res) => {
  let start;
  try {
    start = buildGoogleAuthUrl();
  } catch (err) {
    redirectWithError(
      res,
      err instanceof Error ? err.message : "Google sign-in isn't configured yet",
    );
    return;
  }
  res.cookie(OAUTH_STATE_COOKIE, start.state, oauthCookieOptions());
  res.cookie(OAUTH_VERIFIER_COOKIE, start.codeVerifier, oauthCookieOptions());
  res.redirect(start.url);
});

authRouter.get("/google/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
  const codeVerifier = req.cookies?.[OAUTH_VERIFIER_COOKIE] as string | undefined;
  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/api/auth" });
  res.clearCookie(OAUTH_VERIFIER_COOKIE, { path: "/api/auth" });

  if (error) {
    redirectWithError(res, "Google sign-in was cancelled");
    return;
  }
  if (
    typeof code !== "string" ||
    typeof state !== "string" ||
    !expectedState ||
    !codeVerifier ||
    state !== expectedState
  ) {
    redirectWithError(res, "That sign-in link expired — try again");
    return;
  }

  try {
    const profile = await exchangeGoogleCode(code, codeVerifier);
    const { user, isNewUser } = await completeOAuthSignIn("google", profile);
    const token = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    res.redirect(`${frontendUrl()}${isNewUser ? "/welcome" : "/build"}`);
  } catch (err) {
    redirectWithError(res, err instanceof Error ? err.message : "Google sign-in failed");
  }
});

authRouter.get("/github", (req, res) => {
  let start;
  try {
    start = buildGithubAuthUrl();
  } catch (err) {
    redirectWithError(
      res,
      err instanceof Error ? err.message : "GitHub sign-in isn't configured yet",
    );
    return;
  }
  res.cookie(OAUTH_STATE_COOKIE, start.state, oauthCookieOptions());
  res.redirect(start.url);
});

authRouter.get("/github/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/api/auth" });

  if (error) {
    redirectWithError(res, "GitHub sign-in was cancelled");
    return;
  }
  if (
    typeof code !== "string" ||
    typeof state !== "string" ||
    !expectedState ||
    state !== expectedState
  ) {
    redirectWithError(res, "That sign-in link expired — try again");
    return;
  }

  try {
    const profile = await exchangeGithubCode(code);
    const { user, isNewUser } = await completeOAuthSignIn("github", profile);
    const token = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    res.redirect(`${frontendUrl()}${isNewUser ? "/welcome" : "/build"}`);
  } catch (err) {
    redirectWithError(res, err instanceof Error ? err.message : "GitHub sign-in failed");
  }
});
