import { createServerFn } from "@tanstack/react-start";
import { get, put } from "@vercel/blob";
import { normalizeProfile, type Profile } from "@/lib/link-store";

// Same rule the slug input already enforces client-side — re-checked here
// because this also doubles as the Blob pathname, so it's the one thing
// that must never contain "/" or "..".
const SLUG_PATTERN = /^[a-z0-9_-]{1,64}$/;

function blobPath(slug: string) {
  return `profiles/${slug}.json`;
}

export const publishProfile = createServerFn({ method: "POST" })
  .validator((input: { slug: string; json: string }) => {
    if (typeof input?.slug !== "string" || !SLUG_PATTERN.test(input.slug)) {
      throw new Error("Invalid slug");
    }
    if (typeof input.json !== "string" || input.json.length > 400_000) {
      throw new Error("Profile too large to publish");
    }
    return input;
  })
  .handler(async ({ data }) => {
    await put(blobPath(data.slug), data.json, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return { ok: true as const };
  });

export const getPublishedProfile = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => input)
  .handler(async ({ data }): Promise<Profile | null> => {
    if (!SLUG_PATTERN.test(data.slug)) return null;
    try {
      const result = await get(blobPath(data.slug), { access: "private", useCache: false });
      if (!result || !result.stream) return null;
      const text = await new Response(result.stream).text();
      return normalizeProfile(JSON.parse(text));
    } catch {
      return null;
    }
  });

// Background-music tracks are stored as their own Blob object (public, since
// the visitor's <audio> tag has to fetch it directly) and only the resulting
// URL goes into the profile JSON — the 400KB cap above is about that JSON
// blob, not about the audio, so a several-MB track doesn't touch it.
const MAX_MUSIC_BYTES = 6_000_000;
const MUSIC_MIME_EXT: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
};

export const uploadMusicTrack = createServerFn({ method: "POST" })
  .validator((input: { slug: string; base64: string; mimeType: string }) => {
    if (typeof input?.slug !== "string" || !SLUG_PATTERN.test(input.slug)) {
      throw new Error("Invalid slug");
    }
    const ext = MUSIC_MIME_EXT[input.mimeType];
    if (!ext) throw new Error("Unsupported audio format");
    if (typeof input.base64 !== "string" || input.base64.length === 0) {
      throw new Error("No file data");
    }
    // Base64 runs ~4/3 the size of the raw bytes it encodes.
    if (input.base64.length > (MAX_MUSIC_BYTES * 4) / 3) {
      throw new Error("File too large");
    }
    return { ...input, ext };
  })
  .handler(async ({ data }): Promise<{ url: string }> => {
    const blob = await put(`music/${data.slug}.${data.ext}`, Buffer.from(data.base64, "base64"), {
      access: "public",
      addRandomSuffix: true,
      contentType: data.mimeType,
    });
    return { url: blob.url };
  });
