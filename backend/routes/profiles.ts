import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../auth";

// Same rule the slug input already enforces client-side — re-checked here
// because it's untrusted input hitting a SQL query and a URL param.
const SLUG_PATTERN = /^[a-z0-9_-]{1,64}$/;
const MAX_PROFILE_JSON_BYTES = 400_000;

export const profilesRouter = Router();

profilesRouter.put("/:slug", requireAuth, async (req, res) => {
  // requireAuth as a second handler makes Express infer `req.params` as the
  // looser `string | string[]` here (same overload interaction as multer in
  // routes/music.ts) — a real slug is always a single segment.
  const slug = String(req.params.slug);
  if (!SLUG_PATTERN.test(slug)) {
    res.status(400).json({ error: "Invalid slug" });
    return;
  }

  const json = JSON.stringify(req.body ?? {});
  if (json.length > MAX_PROFILE_JSON_BYTES) {
    res.status(413).json({ error: "Profile too large to publish" });
    return;
  }

  // A slug already owned by someone else is off-limits; unclaimed (or
  // already-yours) slugs go through and this write claims/reaffirms it.
  const existing = await pool.query<{ owner_id: string | null }>(
    "SELECT owner_id FROM profiles WHERE slug = $1",
    [slug],
  );
  const ownerId = existing.rows[0]?.owner_id;
  if (ownerId && ownerId !== req.user!.id) {
    res.status(403).json({ error: "This username is already taken" });
    return;
  }

  const updatedAt = new Date().toISOString();
  await pool.query(
    `INSERT INTO profiles (slug, data, owner_id, updated_at) VALUES ($1, $2::jsonb, $3, $4)
     ON CONFLICT (slug) DO UPDATE SET data = $2::jsonb, owner_id = $3, updated_at = $4`,
    [slug, json, req.user!.id, updatedAt],
  );
  res.json({ ok: true, updatedAt });
});

profilesRouter.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  if (!SLUG_PATTERN.test(slug)) {
    res.json({ profile: null, updatedAt: null });
    return;
  }

  const result = await pool.query<{ data: unknown; updated_at: Date }>(
    "SELECT data, updated_at FROM profiles WHERE slug = $1",
    [slug],
  );
  const row = result.rows[0];
  res.json({ profile: row?.data ?? null, updatedAt: row?.updated_at?.toISOString() ?? null });
});
