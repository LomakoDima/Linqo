import { createHash, randomBytes } from "node:crypto";
import { authDb } from "./auth-transaction";
import { pool } from "./db";
import { AbuseError, enforceLimit } from "./abuse";
import { emailConfiguration, sendVerificationEmail, verificationPageUrl } from "./email";

export const VERIFICATION_TTL_MS = 30 * 60 * 1000;
export const verificationHash = (token: string) => createHash("sha256").update(token).digest("hex");
type VerificationUser = {
  id: string;
  email: string;
  email_verified_at: Date | null;
  pending_email: string | null;
};
const invalid = () =>
  Object.assign(new Error("This confirmation link is invalid or expired. Request a new email."), {
    status: 400,
  });

export async function requestEmailVerification(
  userId: string,
  changedEmail?: string,
): Promise<void> {
  emailConfiguration();
  const url = verificationPageUrl();
  await enforceLimit("verification-user", userId, { max: 5, seconds: 3600 });
  const token = randomBytes(32).toString("hex");
  const hash = verificationHash(token);
  const reserved = await authDb.transaction(async (client) => {
    const row = (
      await client.query<VerificationUser>(
        "SELECT id,email,email_verified_at,pending_email FROM users WHERE id=$1 FOR UPDATE",
        [userId],
      )
    ).rows[0];
    if (!row) throw invalid();
    const purpose = changedEmail ? "email_change" : "registration";
    if (!changedEmail && row.email_verified_at) return null;
    const email = changedEmail ?? row.email;
    if (
      changedEmail &&
      (await client.query("SELECT id FROM users WHERE email=$1 AND id<>$2", [email, userId])).rows
        .length
    )
      throw Object.assign(new Error("An account with this email already exists"), { status: 409 });
    const previous = (
      await client.query<{ wait: number }>(
        "SELECT GREATEST(0,CEIL(60-EXTRACT(EPOCH FROM clock_timestamp()-created_at)))::int AS wait FROM email_verification_tokens WHERE user_id=$1",
        [userId],
      )
    ).rows[0];
    if (previous?.wait > 0)
      throw new AbuseError(
        "VERIFICATION_COOLDOWN",
        "Please wait before requesting another confirmation email.",
        previous.wait,
      );
    await client.query(
      `INSERT INTO email_verification_tokens(user_id,email,current_email,purpose,token_hash,expires_at)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id) DO UPDATE SET email=EXCLUDED.email,current_email=EXCLUDED.current_email,purpose=EXCLUDED.purpose,token_hash=EXCLUDED.token_hash,created_at=now(),expires_at=EXCLUDED.expires_at`,
      [userId, email, row.email, purpose, hash, new Date(Date.now() + VERIFICATION_TTL_MS)],
    );
    if (changedEmail)
      await client.query("UPDATE users SET pending_email=$1 WHERE id=$2", [email, userId]);
    return { email, purpose };
  });
  if (!reserved) return;
  url.hash = new URLSearchParams({ token }).toString();
  // Keep the token valid on a timeout: the provider may already have accepted
  // the email. A subsequent resend rotates it; failures never grant access.
  await sendVerificationEmail(reserved.email, url.href, hash, reserved.purpose === "email_change");
}

export async function confirmEmail(token: string): Promise<{ emailChange: boolean }> {
  if (!/^[a-f0-9]{64}$/.test(token)) throw invalid();
  const hash = verificationHash(token);
  const candidate = (
    await pool.query<{ user_id: string }>(
      "SELECT user_id FROM email_verification_tokens WHERE token_hash=$1",
      [hash],
    )
  ).rows[0];
  if (!candidate) throw invalid();
  return authDb.transaction(async (client) => {
    const user = (
      await client.query<VerificationUser>(
        "SELECT id,email,email_verified_at,pending_email FROM users WHERE id=$1 FOR UPDATE",
        [candidate.user_id],
      )
    ).rows[0];
    const row = (
      await client.query<{ email: string; current_email: string; purpose: string }>(
        "DELETE FROM email_verification_tokens WHERE user_id=$1 AND token_hash=$2 AND expires_at>now() RETURNING email,current_email,purpose",
        [candidate.user_id, hash],
      )
    ).rows[0];
    if (
      !user ||
      !row ||
      row.current_email !== user.email ||
      (row.purpose === "email_change" && row.email !== user.pending_email)
    )
      throw invalid();
    if (row.purpose === "email_change") {
      if (
        (await client.query("SELECT id FROM users WHERE email=$1 AND id<>$2", [row.email, user.id]))
          .rows.length
      )
        throw Object.assign(
          new Error("This email is already in use. Choose another address in Settings."),
          { status: 409 },
        );
      try {
        await client.query(
          "UPDATE users SET email=$1,pending_email=NULL,email_verified_at=now(),email_verification_required=true WHERE id=$2",
          [row.email, user.id],
        );
      } catch (error) {
        if ((error as { code?: string }).code === "23505")
          throw Object.assign(new Error("This email is already in use."), { status: 409 });
        throw error;
      }
    } else {
      await client.query(
        "UPDATE users SET email_verified_at=COALESCE(email_verified_at,now()),email_verification_required=true WHERE id=$1",
        [user.id],
      );
    }
    await client.query("DELETE FROM sessions WHERE user_id=$1", [user.id]);
    await client.query("DELETE FROM password_reset_tokens WHERE user_id=$1", [user.id]);
    return { emailChange: row.purpose === "email_change" };
  });
}
