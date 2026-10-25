import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../auth";
import { ASSET_ID_PATTERN } from "../../src/lib/content-safety";
import { uploadBudget, downloadBudget } from "../abuse";
import {
  checkUploadedFile,
  contentRateLimit,
  limitedUpload,
  requireSlugOwnership,
} from "../content-security";

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export const imagesRouter = Router();
imagesRouter.post(
  "/:slug",
  requireAuth,
  contentRateLimit,
  requireSlugOwnership,
  limitedUpload("image"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "Choose an image to upload" });
      return;
    }
    await uploadBudget(req.user!.id, req.file.size);
    const bytes = await checkUploadedFile(req.file, "image");
    const result = await pool.query<{ id: string }>(
      "INSERT INTO og_images (slug, mime_type, data, uploaded_by) VALUES ($1, $2, $3, $4) RETURNING id",
      [String(req.params.slug), "image/webp", bytes, req.user!.id],
    );
    res.json({ url: `/api/images/file/${result.rows[0].id}` });
  },
);
imagesRouter.get("/file/:id", async (req, res) => {
  if (!ASSET_ID_PATTERN.test(req.params.id)) {
    res.status(404).end();
    return;
  }
  const result = await pool.query<{ mime_type: string; data: Buffer }>(
    "SELECT mime_type, data FROM og_images WHERE id = $1",
    [req.params.id],
  );
  const row = result.rows[0];
  if (!row || !IMAGE_MIME_TYPES.has(row.mime_type)) {
    res.status(404).end();
    return;
  }
  await downloadBudget(req, row.data.length);
  res.setHeader("Content-Type", row.mime_type);
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(row.data);
});
