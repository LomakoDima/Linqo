import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { pool } from "./db";
import { clientNetwork, privateKey } from "./abuse";
import { ASSET_ID_PATTERN } from "../src/lib/content-safety";

const COOKIE = "linqo_registration";
export const REGISTRATION_DIFFICULTY = 18;
export const REGISTRATION_MIN_AGE_MS = 2000;
const invalid = () =>
  Object.assign(new Error("Registration check expired or invalid. Please try again."), {
    status: 400,
  });

export function validProof(nonce: string, proof: unknown, difficulty: number): boolean {
  if (
    typeof proof !== "string" ||
    !/^\d{1,10}$/.test(proof) ||
    !Number.isInteger(difficulty) ||
    difficulty < 16 ||
    difficulty > 20
  )
    return false;
  const hash = createHash("sha256").update(`${nonce}:${proof}`).digest();
  for (let bit = 0; bit < difficulty; bit++) if (hash[bit >> 3] & (128 >> (bit % 8))) return false;
  return true;
}
export async function issueRegistrationChallenge(req: Request, res: Response): Promise<void> {
  const browser = /^[a-f0-9]{64}$/.test(req.cookies?.[COOKIE] ?? "")
    ? (req.cookies[COOKIE] as string)
    : randomBytes(32).toString("hex");
  res.cookie(COOKIE, browser, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600_000,
    path: "/api/auth",
  });
  const id = randomUUID(),
    nonce = randomBytes(32).toString("hex");
  await pool.query(
    `INSERT INTO registration_challenges (id,nonce,difficulty,network_key,browser_key,expires_at)
    VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes')`,
    [
      id,
      nonce,
      REGISTRATION_DIFFICULTY,
      await privateKey("registration-network", clientNetwork(req)),
      await privateKey("registration-browser", browser),
    ],
  );
  res.setHeader("Cache-Control", "no-store");
  res.json({ id, nonce, difficulty: REGISTRATION_DIFFICULTY, minAgeMs: REGISTRATION_MIN_AGE_MS });
  void pool
    .query(
      `DELETE FROM registration_challenges WHERE id IN (SELECT id FROM registration_challenges WHERE expires_at<now() ORDER BY expires_at LIMIT 1000)`,
    )
    .catch(() => {});
}
export async function verifyRegistration(req: Request): Promise<void> {
  if (req.body?.website !== undefined && req.body.website !== "") throw invalid();
  const { challengeId, proof } = req.body ?? {};
  const browser = req.cookies?.[COOKIE];
  if (
    typeof challengeId !== "string" ||
    !ASSET_ID_PATTERN.test(challengeId) ||
    typeof browser !== "string" ||
    !/^[a-f0-9]{64}$/.test(browser)
  )
    throw invalid();
  const network = await privateKey("registration-network", clientNetwork(req));
  const browserKey = await privateKey("registration-browser", browser);
  const result = await pool.query<{ nonce: string; difficulty: number }>(
    `SELECT nonce,difficulty FROM registration_challenges
    WHERE id=$1 AND network_key=$2 AND browser_key=$3 AND used_at IS NULL AND expires_at>now()
    AND created_at<=now()-interval '2 seconds'`,
    [challengeId, network, browserKey],
  );
  const challenge = result.rows[0];
  if (!challenge || !validProof(challenge.nonce, proof, challenge.difficulty)) throw invalid();
  // Only one concurrent request can consume this proof, even across processes.
  const consumed = await pool.query(
    `UPDATE registration_challenges SET used_at=now()
    WHERE id=$1 AND network_key=$2 AND browser_key=$3 AND used_at IS NULL AND expires_at>now() RETURNING id`,
    [challengeId, network, browserKey],
  );
  if (!consumed.rows.length) throw invalid();
}
