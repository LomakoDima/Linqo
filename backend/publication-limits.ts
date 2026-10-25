import { createHash } from "node:crypto";
import { pool } from "./db";
import { AbuseError } from "./abuse-error";
import type { CounterQuery } from "./abuse";
import type { Profile } from "../src/lib/link-store";
import { promotionalItems } from "../src/lib/spam-detection";

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, stable(v)]),
    );
  return value;
}
export function contentFingerprint(profile: Profile): string {
  return createHash("sha256")
    .update(JSON.stringify(stable(profile)))
    .digest("hex");
}
export function campaignFingerprint(profile: Profile): string | null {
  const items = promotionalItems(profile).filter((item) => item.text.length >= 24 || item.target);
  if (
    items.filter((i) => i.text.length >= 24).length < 3 ||
    items.reduce((n, i) => n + i.text.length, 0) < 160 ||
    new Set(items.map((i) => i.target).filter(Boolean)).size < 2
  )
    return null;
  return createHash("sha256")
    .update(
      JSON.stringify(
        items.sort((a, b) =>
          JSON.stringify(a) < JSON.stringify(b)
            ? -1
            : JSON.stringify(a) > JSON.stringify(b)
              ? 1
              : 0,
        ),
      ),
    )
    .digest("hex");
}
export const publicationDb = {
  async transaction<T>(operation: (query: CounterQuery) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation((sql, values) => client.query(sql, values));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};
export function savePublication(
  profile: Profile,
  userId: string,
): Promise<{ updatedAt: string; unchanged: boolean }> {
  return publicationDb.transaction(async (query) => {
    // Account row lock serializes page creation and quota checks for this owner.
    const user = await query("SELECT created_at FROM users WHERE id=$1 FOR UPDATE", [userId]);
    if (!user.rows[0]) throw Object.assign(new Error("Account no longer exists"), { status: 401 });
    const fresh = Date.now() - new Date(user.rows[0].created_at as string).getTime() < 86400_000;
    const existing = await query(
      "SELECT data,owner_id,updated_at FROM profiles WHERE slug=$1 FOR UPDATE",
      [profile.slug],
    );
    if (existing.rows[0] && existing.rows[0].owner_id !== userId)
      throw Object.assign(new Error("This username belongs to another page"), { status: 403 });
    const hash = contentFingerprint(profile);
    if (existing.rows[0] && contentFingerprint(existing.rows[0].data as Profile) === hash)
      return {
        updatedAt: new Date(existing.rows[0].updated_at as string).toISOString(),
        unchanged: true,
      };
    if (!existing.rows[0]) {
      const pages = await query("SELECT count(*)::int AS count FROM profiles WHERE owner_id=$1", [
        userId,
      ]);
      if (Number(pages.rows[0].count) >= (fresh ? 1 : 3)) {
        if (!fresh)
          throw Object.assign(
            new AbuseError(
              "PAGE_LIMIT",
              "This account has reached its limit of 3 published pages. Existing pages can still be updated.",
              0,
            ),
            { status: 403 },
          );
        throw new AbuseError(
          "PAGE_LIMIT",
          "New accounts can publish one page during their first 24 hours.",
          Math.max(
            1,
            Math.ceil(
              (new Date(user.rows[0].created_at as string).getTime() + 86400_000 - Date.now()) /
                1000,
            ),
          ),
        );
      }
    }
    const activity = await query(
      `SELECT count(*)::int AS count,
      COALESCE(EXTRACT(EPOCH FROM now()-max(created_at)),86400)::float AS elapsed,
      COALESCE(CEIL(EXTRACT(EPOCH FROM min(created_at)+interval '24 hours'-now())),1)::int AS retry
      FROM publication_events WHERE owner_id=$1 AND created_at>now()-interval '24 hours'`,
      [userId],
    );
    const stats = activity.rows[0],
      cooldown = fresh ? 10 : 5;
    if (Number(stats.elapsed) < cooldown)
      throw new AbuseError(
        "PUBLISH_COOLDOWN",
        "You are publishing too quickly. Keep editing your draft and publish again shortly.",
        Math.max(1, Math.ceil(cooldown - Number(stats.elapsed))),
      );
    if (Number(stats.count) >= (fresh ? 30 : 150))
      throw new AbuseError(
        "PUBLICATION_QUOTA",
        "Daily publication limit reached. Your draft is still available.",
        Math.max(1, Number(stats.retry)),
      );
    const campaign = campaignFingerprint(profile);
    // Copies must not let attackers prevent an original owner from updating an
    // already-existing campaign. Only introducing a campaign spends this gate.
    const introducingCampaign =
      campaign &&
      (!existing.rows[0] || campaignFingerprint(existing.rows[0].data as Profile) !== campaign);
    if (introducingCampaign) {
      // Serialize identical campaigns across different accounts as well.
      await query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", ["campaign:" + campaign]);
      const copies = await query(
        `SELECT count(DISTINCT owner_id)::int AS count FROM publication_events
        WHERE campaign_hash=$1 AND owner_id<>$2 AND created_at>now()-interval '1 hour'`,
        [campaign, userId],
      );
      if (Number(copies.rows[0].count) >= 5)
        throw new AbuseError(
          "DUPLICATE_CAMPAIGN",
          "This promotional content has been published by too many accounts recently. Review the duplicated content.",
          3600,
        );
    }
    const updatedAt = new Date().toISOString();
    const saved = await query(
      `INSERT INTO profiles (slug,data,owner_id,updated_at) VALUES($1,$2::jsonb,$3,$4)
      ON CONFLICT(slug) DO UPDATE SET data=$2::jsonb,updated_at=$4 WHERE profiles.owner_id = $3 RETURNING slug`,
      [profile.slug, JSON.stringify(profile), userId, updatedAt],
    );
    if (!saved.rows.length)
      throw Object.assign(new Error("This username belongs to another page"), { status: 403 });
    await query(
      "INSERT INTO publication_events (owner_id,content_hash,campaign_hash) VALUES($1,$2,$3)",
      [userId, hash, campaign],
    );
    await query(
      `DELETE FROM publication_events WHERE id IN (SELECT id FROM publication_events WHERE created_at<now()-interval '7 days' LIMIT 1000)`,
      [],
    );
    return { updatedAt, unchanged: false };
  });
}
