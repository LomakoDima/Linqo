import sharp from "sharp";
import multer from "multer";
import type { RequestHandler } from "express";
import { CONTENT_LIMITS, managedAsset, SLUG_PATTERN } from "../src/lib/content-safety";
import { assertUploadFile, sniffMediaType } from "../src/lib/file-safety";
import { inspectMedia } from "./content-inspection";
import { pool } from "./db";
import type { Profile } from "../src/lib/link-store";

export const contentError = (message: string, status = 400) =>
  Object.assign(new Error(message), { status });
export { contentRateLimit } from "./abuse";

export const requireSlugOwnership: RequestHandler = async (req, res, next) => {
  const slug = String(req.params.slug);
  if (!SLUG_PATTERN.test(slug)) {
    res.status(400).json({ error: "Invalid username" });
    return;
  }
  const result = await pool.query<{ owner_id: string | null }>(
    "SELECT owner_id FROM profiles WHERE slug = $1",
    [slug],
  );
  // Existing unowned pages are not claimable through a content update.
  if (result.rows.length && result.rows[0].owner_id !== req.user?.id) {
    res.status(403).json({ error: "This username belongs to another page" });
    return;
  }
  next();
};

export function limitedUpload(kind: "image" | "audio") {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: kind === "image" ? CONTENT_LIMITS.imageBytes : CONTENT_LIMITS.audioBytes,
      files: 1,
      fields: 0,
      parts: 2,
    },
  }).single("file");
}

export async function cleanImage(bytes: Uint8Array): Promise<Buffer> {
  const mime = sniffMediaType(bytes);
  if (!mime?.startsWith("image/")) throw contentError("Unsupported image contents");
  try {
    const image = sharp(Buffer.from(bytes), {
      limitInputPixels: CONTENT_LIMITS.imagePixels,
      failOn: "warning",
      animated: false,
    });
    const metadata = await image.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > CONTENT_LIMITS.imageDimension ||
      metadata.height > CONTENT_LIMITS.imageDimension
    )
      throw new Error("Image dimensions are too large");
    const clean = await image
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    await inspectMedia({ bytes: clean, mime: "image/webp", kind: "image" });
    return clean;
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throw contentError(
      "Image could not be decoded safely. Use PNG, JPEG, WebP or GIF within the dimension limits.",
    );
  }
}

export async function checkUploadedFile(
  file: Express.Multer.File,
  kind: "image" | "audio",
): Promise<Buffer> {
  let mime: string;
  try {
    mime = assertUploadFile(
      { name: file.originalname, type: file.mimetype, size: file.size },
      kind,
      file.buffer,
    );
  } catch (err) {
    throw contentError(err instanceof Error ? err.message : "Invalid file");
  }
  if (kind === "image") return cleanImage(file.buffer);
  await inspectMedia({ bytes: file.buffer, mime, kind });
  return file.buffer;
}

// Called on the server for every publication, including direct API requests.
// Embedded raster images are decoded and re-encoded; client-side canvas is not
// trusted. Managed uploads must exist, match this page and use our API origin.
export async function prepareProfileContent(
  profile: Profile,
  slug: string,
  userId: string,
): Promise<void> {
  const images: { object: Record<string, unknown>; key: string }[] = [];
  const audio: string[] = [];
  const add = (object: object, key: string) => {
    if (
      typeof (object as Record<string, unknown>)[key] === "string" &&
      (object as Record<string, unknown>)[key]
    )
      images.push({ object: object as Record<string, unknown>, key });
  };
  for (const key of ["avatar", "cover", "bgImage", "ogImage"]) add(profile, key);
  for (const block of profile.blocks) {
    add(block, "image");
    for (const item of block.galleryImages ?? []) add(item, "image");
  }
  if (images.length > 40) throw contentError("Use at most 40 images per page");
  if (profile.music?.url) audio.push(profile.music.url);
  for (const layer of profile.ambient?.layers ?? []) if (layer.url) audio.push(layer.url);
  const cache = new Map<string, string>();
  const apiOrigin = new URL(
    process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`,
  ).origin;
  for (const item of images) {
    const value = item.object[item.key] as string;
    if (value.startsWith("data:")) {
      let clean = cache.get(value);
      if (!clean) {
        const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
          value,
        );
        if (!match) throw contentError("Invalid embedded image");
        const bytes = Buffer.from(match[2], "base64");
        if (sniffMediaType(bytes) !== match[1])
          throw contentError("Image data does not match its declared format");
        clean = `data:image/webp;base64,${(await cleanImage(bytes)).toString("base64")}`;
        cache.set(value, clean);
      }
      item.object[item.key] = clean;
    }
  }
  for (const value of [...images.map((i) => i.object[i.key] as string), ...audio]) {
    const asset = managedAsset(value);
    if (!asset) continue;
    if (asset.origin && asset.origin !== apiOrigin)
      throw contentError("Use a file uploaded to this Linqo server");
    const table = asset.kind === "images" ? "og_images" : "music_tracks";
    const result = await pool.query<{
      slug: string;
      data: Buffer;
      mime_type: string;
      uploaded_by: string | null;
    }>(`SELECT slug, data, mime_type, uploaded_by FROM ${table} WHERE id = $1`, [asset.id]);
    if (
      !result.rows[0] ||
      result.rows[0].slug !== slug ||
      (result.rows[0].uploaded_by !== null && result.rows[0].uploaded_by !== userId)
    )
      throw contentError("This uploaded file belongs to a different page or no longer exists");
    await inspectMedia({
      bytes: result.rows[0].data,
      mime: result.rows[0].mime_type,
      kind: asset.kind === "images" ? "image" : "audio",
    });
  }
}
