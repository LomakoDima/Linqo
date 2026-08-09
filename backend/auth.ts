import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { pool } from "./db";

export const SESSION_COOKIE = "linqo_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BCRYPT_COST = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Not signed/stateless on purpose — an opaque random token looked up against
// a sessions row means signing out (or an admin revoking a session) actually
// invalidates it immediately, which a self-verifying JWT can't do without
// extra denylist infrastructure of its own.
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)", [
    token,
    userId,
    expiresAt,
  ]);
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
}

// hasPassword distinguishes an OAuth-only account (password_hash is NULL)
// from one that can sign in with a password — Settings and /signin both
// need to know this without a second round trip.
export type AuthUser = { id: string; email: string; name: string; hasPassword: boolean };

export async function getUserForToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const result = await pool.query<AuthUser>(
    `SELECT users.id, users.email, users.name, (users.password_hash IS NOT NULL) AS "hasPassword"
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = $1 AND sessions.expires_at > now()`,
    [token],
  );
  return result.rows[0] ?? null;
}

declare global {
  // Augmenting Express's own ambient types requires its namespace form —
  // there's no ES2015-module equivalent for adding a property to a type
  // declared by another package.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const user = await getUserForToken(token);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  req.user = user;
  next();
}
