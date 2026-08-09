import { Router } from "express";
import multer from "multer";
import { pool } from "../db";

const SLUG_PATTERN = /^[a-z0-9_-]{1,64}$/;
const TRACK_ID_PATTERN = /^[0-9a-f-]{36}$/i;
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

// Memory storage, no size limit — the track is small enough (a background
// loop) that buffering the whole upload before writing one BYTEA row is
// simpler than streaming, and there's no artificial cap here on purpose.
const upload = multer({ storage: multer.memoryStorage() });

export const musicRouter = Router();

musicRouter.post("/:slug", upload.single("file"), async (req, res) => {
  // Multer's typings make Express infer `req.params` as the looser
  // `string | string[]` here (route + multi-handler overload interaction) —
  // a real slug is always a single segment, so this is just a type coercion.
  const slug = String(req.params.slug);
  if (!SLUG_PATTERN.test(slug)) {
    res.status(400).json({ error: "Invalid slug" });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  if (!MUSIC_MIME_TYPES.has(file.mimetype)) {
    res.status(400).json({ error: "Unsupported audio format" });
    return;
  }

  const result = await pool.query<{ id: string }>(
    "INSERT INTO music_tracks (slug, mime_type, data) VALUES ($1, $2, $3) RETURNING id",
    [slug, file.mimetype, file.buffer],
  );
  res.json({ url: `/api/music/file/${result.rows[0].id}` });
});

musicRouter.get("/file/:id", async (req, res) => {
  const { id } = req.params;
  if (!TRACK_ID_PATTERN.test(id)) {
    res.status(404).end();
    return;
  }

  const result = await pool.query<{ mime_type: string; data: Buffer }>(
    "SELECT mime_type, data FROM music_tracks WHERE id = $1",
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
