import { Router } from "express";
import multer from "multer";
import { pool } from "../db";
import { requireAuth } from "../auth";

const SLUG_PATTERN = /^[a-z0-9_-]{1,64}$/;
const IMAGE_ID_PATTERN = /^[0-9a-f-]{36}$/i;
const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// Memory storage, no size limit — same call as music_tracks (routes/music.ts):
// small enough content that buffering the whole upload beats streaming.
const upload = multer({ storage: multer.memoryStorage() });

export const imagesRouter = Router();

// Unlike music_tracks (no auth at all today — a pre-existing, separate gap
// left alone here), this route requires auth *and* ownership: the resulting
// URL gets embedded in a public <meta property="og:image"> tag that social
// crawlers fetch and cache, a more attractive target than an unlisted audio
// blob, so it's held to the same bar as profiles.ts's PUT.
imagesRouter.post("/:slug", requireAuth, upload.single("file"), async (req, res) => {
  const slug = String(req.params.slug);
  if (!SLUG_PATTERN.test(slug)) {
    res.status(400).json({ error: "Invalid slug" });
    return;
  }

  const existing = await pool.query<{ owner_id: string | null }>(
    "SELECT owner_id FROM profiles WHERE slug = $1",
    [slug],
  );
  const ownerId = existing.rows[0]?.owner_id;
  if (ownerId && ownerId !== req.user!.id) {
    res.status(403).json({ error: "This username is already taken" });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
    res.status(400).json({ error: "Unsupported image format" });
    return;
  }

  const result = await pool.query<{ id: string }>(
    "INSERT INTO og_images (slug, mime_type, data) VALUES ($1, $2, $3) RETURNING id",
    [slug, file.mimetype, file.buffer],
  );
  res.json({ url: `/api/images/file/${result.rows[0].id}` });
});

imagesRouter.get("/file/:id", async (req, res) => {
  const { id } = req.params;
  if (!IMAGE_ID_PATTERN.test(id)) {
    res.status(404).end();
    return;
  }

  const result = await pool.query<{ mime_type: string; data: Buffer }>(
    "SELECT mime_type, data FROM og_images WHERE id = $1",
    [id],
  );
  const row = result.rows[0];
  if (!row) {
    res.status(404).end();
    return;
  }

  res.setHeader("Content-Type", row.mime_type);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(row.data);
});
