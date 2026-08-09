import { Router } from "express";
import { pool } from "../db";
import { requireAuth, hashPassword, verifyPassword, SESSION_COOKIE, type AuthUser } from "../auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const meRouter = Router();

// Separate from /api/profiles/:slug (which is public, keyed by slug, and has
// no notion of "the current user") — this is the one lookup a signed-in
// user's own dashboard needs: "what did I already publish, if anything".
meRouter.get("/profile", requireAuth, async (req, res) => {
  const result = await pool.query<{ slug: string; data: unknown; updated_at: Date }>(
    "SELECT slug, data, updated_at FROM profiles WHERE owner_id = $1 LIMIT 1",
    [req.user!.id],
  );
  const row = result.rows[0];
  res.json({
    profile: row
      ? { slug: row.slug, data: row.data, updatedAt: row.updated_at.toISOString() }
      : null,
  });
});

meRouter.patch("/", requireAuth, async (req, res) => {
  const body = req.body ?? {};
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";

  if (name !== undefined && (!name || name.length > 100)) {
    res.status(400).json({ error: "Enter your name" });
    return;
  }

  const emailChanging = email !== undefined && email !== req.user!.email;
  if (emailChanging) {
    if (!EMAIL_PATTERN.test(email)) {
      res.status(400).json({ error: "Enter a valid email" });
      return;
    }
    // An OAuth-only account has no password of its own to confirm the
    // change with — email there is whatever the provider says it is.
    if (!req.user!.hasPassword) {
      res.status(400).json({ error: "Manage your email with the provider you signed in with" });
      return;
    }
    const current = await pool.query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [req.user!.id],
    );
    if (!(await verifyPassword(currentPassword, current.rows[0].password_hash))) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    const existing = await pool.query("SELECT id FROM users WHERE email = $1 AND id != $2", [
      email,
      req.user!.id,
    ]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
  }

  const result = await pool.query<AuthUser>(
    `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email)
     WHERE id = $3 RETURNING id, name, email, (password_hash IS NOT NULL) AS "hasPassword"`,
    [name ?? null, email ?? null, req.user!.id],
  );
  res.json({ user: result.rows[0] });
});

meRouter.patch("/password", requireAuth, async (req, res) => {
  const body = req.body ?? {};
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  if (!req.user!.hasPassword) {
    res.status(400).json({
      error: 'This account signed in with Google/GitHub — use "Forgot password" to set one',
    });
    return;
  }
  const result = await pool.query<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id = $1",
    [req.user!.id],
  );
  if (!(await verifyPassword(currentPassword, result.rows[0].password_hash))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await hashPassword(newPassword);
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, req.user!.id]);
  // Every other session gets signed out — but not the one making this
  // change, or a successful password change would log the user out of
  // their own request.
  const currentToken = req.cookies?.[SESSION_COOKIE] as string | undefined;
  await pool.query("DELETE FROM sessions WHERE user_id = $1 AND token != $2", [
    req.user!.id,
    currentToken ?? "",
  ]);
  res.json({ ok: true });
});

meRouter.delete("/", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM users WHERE id = $1", [req.user!.id]);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

// Best-effort personalization data from the post-signup quiz — never
// blocks anything, so no strict schema validation beyond "is an object".
meRouter.patch("/onboarding", requireAuth, async (req, res) => {
  const answers = req.body?.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    res.status(400).json({ error: "Invalid answers" });
    return;
  }
  await pool.query("UPDATE users SET onboarding_answers = $1 WHERE id = $2", [
    JSON.stringify(answers),
    req.user!.id,
  ]);
  res.json({ ok: true });
});
