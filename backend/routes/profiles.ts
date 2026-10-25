import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../auth";
import { CONTENT_LIMITS, SLUG_PATTERN, validateProfileContent } from "../../src/lib/content-safety";
import { contentRateLimit, prepareProfileContent, requireSlugOwnership } from "../content-security";
import { profileModerationWarnings } from "../../src/lib/moderation-warnings";
import { detectProfileSpam } from "../../src/lib/spam-detection";
import { savePublication } from "../publication-limits";

export const profilesRouter = Router();
profilesRouter.put(
  "/:slug",
  requireAuth,
  contentRateLimit,
  requireSlugOwnership,
  async (req, res) => {
    const slug = String(req.params.slug);
    if (Buffer.byteLength(JSON.stringify(req.body ?? {})) > CONTENT_LIMITS.profileBytes) {
      res.status(413).json({ error: "Profile too large to publish" });
      return;
    }
    const result = validateProfileContent(req.body);
    if (!result.profile) {
      res
        .status(422)
        .json({ error: "Review the content before publishing", issues: result.issues });
      return;
    }
    if (result.profile.slug !== slug) {
      res.status(400).json({ error: "Profile username does not match the URL" });
      return;
    }
    const spam = detectProfileSpam(result.profile);
    if (spam.length) {
      res.status(422).json({
        error: "Review repeated promotional content",
        code: "SPAM_DETECTED",
        issues: spam,
      });
      return;
    }
    await prepareProfileContent(result.profile, slug, req.user!.id);
    const prepared = validateProfileContent(result.profile);
    if (!prepared.profile) {
      res.status(422).json({
        error: "Processed content exceeds the page limits. Use smaller images.",
        issues: prepared.issues,
      });
      return;
    }
    const json = JSON.stringify(result.profile);
    if (Buffer.byteLength(json) > CONTENT_LIMITS.profileBytes) {
      res.status(413).json({ error: "Profile too large to publish. Use fewer or smaller images." });
      return;
    }
    const saved = await savePublication(result.profile, req.user!.id);
    res.json({ ok: true, ...saved, warnings: profileModerationWarnings(result.profile) });
  },
);
profilesRouter.get("/:slug", async (req, res) => {
  const slug = String(req.params.slug);
  if (!SLUG_PATTERN.test(slug)) {
    res.json({ profile: null, updatedAt: null, exists: false });
    return;
  }
  const result = await pool.query<{ data: unknown; updated_at: Date }>(
    "SELECT data, updated_at FROM profiles WHERE slug = $1",
    [slug],
  );
  const row = result.rows[0];
  const profile = row ? validateProfileContent(row.data).profile : null;
  // Invalid legacy data stays recoverable by its owner in /me/profile.
  res.json({ profile, exists: !!row, updatedAt: row?.updated_at?.toISOString() ?? null });
});
