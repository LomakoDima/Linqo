import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../auth";
import { uploadBudget, downloadBudget } from "../abuse";
import { ASSET_ID_PATTERN } from "../../src/lib/content-safety";
import { assertUploadFile } from "../../src/lib/file-safety";
import {
  checkUploadedFile,
  contentRateLimit,
  limitedUpload,
  requireSlugOwnership,
} from "../content-security";

const MUSIC_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
]);
export const musicRouter = Router();
musicRouter.post(
  "/:slug",
  requireAuth,
  contentRateLimit,
  requireSlugOwnership,
  limitedUpload("audio"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "Choose an audio file to upload" });
      return;
    }
    await uploadBudget(req.user!.id, req.file.size);
    const bytes = await checkUploadedFile(req.file, "audio");
    const mime = assertUploadFile(
      { name: req.file.originalname, type: req.file.mimetype, size: req.file.size },
      "audio",
      bytes,
    );
    const result = await pool.query<{ id: string }>(
      "INSERT INTO music_tracks (slug, mime_type, data, uploaded_by) VALUES ($1, $2, $3, $4) RETURNING id",
      [String(req.params.slug), mime, bytes, req.user!.id],
    );
    res.json({ url: `/api/music/file/${result.rows[0].id}` });
  },
);
musicRouter.get("/file/:id", async (req, res) => {
  if (!ASSET_ID_PATTERN.test(req.params.id)) {
    res.status(404).end();
    return;
  }
  const result = await pool.query<{ mime_type: string; data: Buffer }>(
    "SELECT mime_type, data FROM music_tracks WHERE id = $1",
    [req.params.id],
  );
  const row = result.rows[0];
  if (!row || !MUSIC_MIME_TYPES.has(row.mime_type)) {
    res.status(404).end();
    return;
  }
  await downloadBudget(req, row.data.length);
  res.setHeader("Content-Type", row.mime_type);
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(row.data);
});
