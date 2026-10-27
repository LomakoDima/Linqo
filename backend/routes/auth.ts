import crypto from "node:crypto";
import { Router, type Response, type Request } from "express";
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
import {
  sendPasswordResetEmail,
  emailConfiguration,
  verificationPageUrl,
  EmailDeliveryError,
} from "../email";
import { confirmEmail, requestEmailVerification } from "../email-verification";
import { authDb } from "../auth-transaction";
import {
  accountNameSchema,
  accountEmailSchema,
  validNewPassword,
} from "../../src/lib/account-validation";
import {
  authRateLimit,
  signupRateLimit,
  signinRateLimit,
  resetRateLimit,
  registrationBudget,
  rateLimit,
  LIMITS,
} from "../abuse";
import { issueRegistrationChallenge, verifyRegistration } from "../registration";

const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const MAX_RESET_ATTEMPTS = 5;

function frontendUrl(): string {
  return process.env.FRONTEND_URL ?? "http://localhost:8080";
}

export const authRouter = Router();
authRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
authRouter.use((req, res, next) =>
  req.path === "/me" || req.path === "/signout" || req.path === "/registration-challenge"
    ? next()
    : authRateLimit(req, res, next),
);
authRouter.get(
  "/registration-challenge",
  rateLimit("challenge-ip", LIMITS.challenge),
  issueRegistrationChallenge,
);

authRouter.post("/signup", signupRateLimit, async (req, res) => {
  const body = req.body ?? {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!accountNameSchema.safeParse(name).success) {
    res
      .status(400)
      .json({ error: "Enter a valid name (1–100 characters) that follows the content policy" });
    return;
  }
  if (!accountEmailSchema.safeParse(email).success) {
    res.status(400).json({ error: "Enter a valid email" });
    return;
  }
  if (!validNewPassword(password)) {
    res
      .status(400)
      .json({ error: "Password must have at least 8 characters and at most 72 UTF-8 bytes" });
    return;
  }
  await verifyRegistration(req);

  const existing = await pool.query<{
    id: string;
    password_hash: string | null;
    email_verified_at: Date | null;
    email_verification_required: boolean;
  }>(
    "SELECT id,password_hash,email_verified_at,email_verification_required FROM users WHERE email = $1",
    [email],
  );
  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    if (
      row.email_verification_required &&
      !row.email_verified_at &&
      row.password_hash &&
      (await verifyPassword(password, row.password_hash))
    ) {
      res.status(403).json({
        error: "Confirm your email before signing in.",
        code: "EMAIL_VERIFICATION_REQUIRED",
      });
      return;
    }
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  await registrationBudget(req);
  const result = await pool.query<AuthUser>(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
     RETURNING id, name, email, (password_hash IS NOT NULL) AS "hasPassword"`,
    [name, email, passwordHash],
  );
  const user = result.rows[0];

  try {
    await requestEmailVerification(user.id);
  } catch (error) {
    // The account already exists. Preserve that result and open confirmation
    // even if delivery fails, without granting a session or claiming mail sent.
    console.error("Signup confirmation delivery failed", {
      code: error instanceof EmailDeliveryError ? error.code : "internal",
    });
    res.status(201).json({
      verificationRequired: true,
      email,
      emailSent: false,
      deliveryError:
        "Your account is saved, but the confirmation email couldn't be sent. Please request a new link.",
    });
    return;
  }
  res.status(201).json({ verificationRequired: true, email, emailSent: true });
});

authRouter.post("/resend-verification", resetRateLimit, async (req, res) => {
  emailConfiguration();
  verificationPageUrl();
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!accountEmailSchema.safeParse(email).success) {
    res.status(400).json({ error: "Enter a valid email" });
    return;
  }
  const row = (
    await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE email=$1 AND email_verified_at IS NULL",
      [email],
    )
  ).rows[0];
  if (row) await requestEmailVerification(row.id);
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true });
});

authRouter.post("/verify-email", async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const result = await confirmEmail(token);
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, ...result });
});

authRouter.post("/signin", signinRateLimit, async (req, res) => {
  const body = req.body ?? {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  // Keep unknown, OAuth-only and incorrect-password accounts indistinguishable.
  const invalid = () =>
    res.status(401).json({
      error: "Invalid email or password",
      code: "INVALID_CREDENTIALS",
    });
  if (!accountEmailSchema.safeParse(email).success || password.length > 1024) {
    invalid();
    return;
  }

  const result = await pool.query<
    AuthUser & {
      password_hash: string | null;
      email_verified_at: Date | null;
      email_verification_required: boolean;
    }
  >(
    'SELECT id, name, email, password_hash, email_verified_at,email_verification_required, pending_email AS "pendingEmail" FROM users WHERE email = $1',
    [email],
  );
  const row = result.rows[0];
  // Same message whether the email is unknown, the account is OAuth-only
  // (no password_hash), or the password is wrong — none of those should be
  // distinguishable from the outside.

  if (!row || !row.password_hash) {
    invalid();
    return;
  }
  if (!(await verifyPassword(password, row.password_hash))) {
    invalid();
    return;
  }
  if (row.email_verification_required && !row.email_verified_at) {
    res.status(403).json({
      error: "Confirm your email before signing in.",
      code: "EMAIL_VERIFICATION_REQUIRED",
    });
    return;
  }

  const token = await createSession(row.id);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  res.json({
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      hasPassword: true,
      pendingEmail: row.pendingEmail,
    },
  });
});

authRouter.post("/signout", async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (token) await destroySession(token);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

// --- Password reset ---

authRouter.post("/forgot-password", resetRateLimit, async (req, res) => {
  emailConfiguration();
  const body = req.body ?? {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  // Respond immediately and do the real work after — whether the email
  // exists, was recently throttled, or the send itself failed is never
  // observable from the response (shape or timing).
  res.json({ ok: true });

  try {
    if (!accountEmailSchema.safeParse(email).success) return;
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
    const issued = await pool.query<{ id: string }>(
      "INSERT INTO password_reset_tokens (user_id, code_hash, expires_at,email) VALUES ($1, $2, $3,$4) RETURNING id",
      [user.id, codeHash, expiresAt, email],
    );

    await sendPasswordResetEmail(email, code, issued.rows[0].id);
  } catch (err) {
    console.error("Password reset delivery failed", {
      code: err instanceof EmailDeliveryError ? err.code : "internal",
    });
  }
});

authRouter.post("/verify-reset-code", signinRateLimit, async (req, res) => {
  const body = req.body ?? {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const invalid = () =>
    res.status(400).json({ error: "Code expired or invalid — request a new one" });
  if (!accountEmailSchema.safeParse(email).success || !/^\d{6}$/.test(code)) {
    invalid();
    return;
  }

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
     WHERE user_id = $1 AND email=$2 AND verified_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [user.id, email],
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

  const attempt = await pool.query(
    `UPDATE password_reset_tokens SET attempts=attempts+1 WHERE id=$1 AND attempts<$2 AND verified_at IS NULL AND expires_at>now() RETURNING id`,
    [row.id, MAX_RESET_ATTEMPTS],
  );
  if (!attempt.rows.length) {
    invalid();
    return;
  }
  if (!(await verifyPassword(code, row.code_hash))) {
    invalid();
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const claimed = await pool.query(
    `UPDATE password_reset_tokens
     SET reset_token = $1, verified_at = now(), code_hash = NULL, expires_at = $2
     WHERE id = $3 AND verified_at IS NULL AND code_hash IS NOT NULL AND expires_at>now() RETURNING id`,
    [resetToken, new Date(Date.now() + RESET_CODE_TTL_MS), row.id],
  );
  if (!claimed.rows.length) {
    invalid();
    return;
  }
  res.json({ resetToken });
});

authRouter.post("/reset-password", async (req, res) => {
  const body = req.body ?? {};
  const resetToken = typeof body.resetToken === "string" ? body.resetToken : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!validNewPassword(password)) {
    res
      .status(400)
      .json({ error: "Password must have at least 8 characters and at most 72 UTF-8 bytes" });
    return;
  }
  if (!/^[0-9a-f]{64}$/.test(resetToken)) {
    res.status(401).json({ error: "That reset link expired — start over" });
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
  await authDb.transaction(async (client) => {
    const user = (
      await client.query<{ email: string }>("SELECT email FROM users WHERE id=$1 FOR UPDATE", [
        row.user_id,
      ])
    ).rows[0];
    const valid = await client.query(
      "SELECT id FROM password_reset_tokens WHERE id=$1 AND reset_token=$2 AND verified_at IS NOT NULL AND expires_at>now() AND email=$3",
      [row.id, resetToken, user?.email],
    );
    if (!user || !valid.rows.length)
      throw Object.assign(new Error("That reset link expired — start over"), { status: 401 });
    await client.query(
      "UPDATE users SET password_hash=$1,email_verified_at=COALESCE(email_verified_at,now()),email_verification_required=true,pending_email=NULL WHERE id=$2",
      [passwordHash, row.user_id],
    );
    await client.query("DELETE FROM password_reset_tokens WHERE user_id=$1", [row.user_id]);
    await client.query("DELETE FROM email_verification_tokens WHERE user_id=$1", [row.user_id]);
    await client.query("DELETE FROM sessions WHERE user_id=$1", [row.user_id]);
  });
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

async function trustProviderEmail(
  userId: string,
  profile: OAuthProfile,
  provider: OAuthProvider,
  link: boolean,
): Promise<AuthUser> {
  return authDb.transaction(async (client) => {
    const row = (
      await client.query<{
        email: string;
        email_verified_at: Date | null;
        email_verification_required: boolean;
      }>(
        "SELECT email,email_verified_at,email_verification_required FROM users WHERE id=$1 FOR UPDATE",
        [userId],
      )
    ).rows[0];
    if (!row) throw new Error("Account not found");
    const matchesCurrentEmail = row.email.toLowerCase() === profile.email.toLowerCase();
    if (!row.email_verified_at && !matchesCurrentEmail) {
      if (link || row.email_verification_required)
        throw new Error("Confirm your current account email before signing in with this provider.");
      // An existing provider identity keeps historical access without falsely
      // verifying an old address that the provider no longer attests to.
    }
    if (!row.email_verified_at && matchesCurrentEmail) {
      // Claiming an unverified email must not inherit a password chosen by
      // someone who registered the address before its actual owner.
      await client.query(
        "UPDATE users SET email_verified_at=now(),email_verification_required=true,pending_email=NULL,password_hash=CASE WHEN $2 THEN NULL ELSE password_hash END WHERE id=$1",
        [userId, link],
      );
      await client.query("DELETE FROM sessions WHERE user_id=$1", [userId]);
      await client.query("DELETE FROM password_reset_tokens WHERE user_id=$1", [userId]);
      await client.query("DELETE FROM email_verification_tokens WHERE user_id=$1", [userId]);
    }
    if (link)
      await client.query(
        "INSERT INTO oauth_accounts (user_id,provider,provider_user_id) VALUES($1,$2,$3)",
        [userId, provider, profile.providerUserId],
      );
    return (
      await client.query<AuthUser>(
        'SELECT id,name,email,pending_email AS "pendingEmail",(password_hash IS NOT NULL) AS "hasPassword" FROM users WHERE id=$1',
        [userId],
      )
    ).rows[0];
  });
}

// Shared by both providers' callbacks: link to an existing OAuth identity,
// link to an existing password account with the same email, or create a
// brand-new user — then start a real session exactly like signup/signin do.
async function completeOAuthSignIn(provider: OAuthProvider, profile: OAuthProfile, req: Request) {
  const linked = await pool.query<AuthUser>(
    `SELECT users.id, users.name, users.email, (users.password_hash IS NOT NULL) AS "hasPassword"
     FROM oauth_accounts
     JOIN users ON users.id = oauth_accounts.user_id
     WHERE oauth_accounts.provider = $1 AND oauth_accounts.provider_user_id = $2`,
    [provider, profile.providerUserId],
  );
  if (linked.rows[0]) {
    return {
      user: await trustProviderEmail(linked.rows[0].id, profile, provider, false),
      isNewUser: false,
    };
  }

  const existingByEmail = await pool.query<AuthUser>(
    `SELECT id, name, email, (password_hash IS NOT NULL) AS "hasPassword"
     FROM users WHERE email = $1`,
    [profile.email.toLowerCase()],
  );
  if (existingByEmail.rows[0]) {
    const user = await trustProviderEmail(existingByEmail.rows[0].id, profile, provider, true);
    return { user, isNewUser: false };
  }

  await registrationBudget(req);
  const user = await authDb.transaction(async (client) => {
    const created = await client.query<AuthUser>(
      `INSERT INTO users (name, email, password_hash,email_verified_at) VALUES ($1, $2, NULL,now())
     RETURNING id, name, email, (password_hash IS NOT NULL) AS "hasPassword"`,
      [profile.name, profile.email.toLowerCase()],
    );
    const user = created.rows[0];
    await client.query(
      "INSERT INTO oauth_accounts (user_id, provider, provider_user_id) VALUES ($1, $2, $3)",
      [user.id, provider, profile.providerUserId],
    );
    return user;
  });
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
    const { user, isNewUser } = await completeOAuthSignIn("google", profile, req);
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
    const { user, isNewUser } = await completeOAuthSignIn("github", profile, req);
    const token = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    res.redirect(`${frontendUrl()}${isNewUser ? "/welcome" : "/build"}`);
  } catch (err) {
    redirectWithError(res, err instanceof Error ? err.message : "GitHub sign-in failed");
  }
});
