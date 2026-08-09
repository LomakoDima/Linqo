import { normalizeProfile, type Profile } from "@/lib/link-store";
import { readJsonOrThrow } from "@/lib/http";

// Talks to the standalone Express + Postgres API in backend/ — this used to
// go through Vercel Blob for both profile storage and music files; now it's
// our own service, reachable at VITE_API_URL (defaults to the local dev
// server started by `npm run dev` / `dev:server`). Runs both client-side
// and inside the SSR loader in routes/p.$slug.tsx, so this can't rely on
// anything browser-only — plain fetch works in both.
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

// Publishing now requires the caller's session cookie — the API rejects (401)
// an unclaimed session and (403) a slug someone else already owns.
export async function publishProfile(
  slug: string,
  json: string,
): Promise<{ ok: true; updatedAt: string }> {
  const res = await fetch(`${API_URL}/api/profiles/${encodeURIComponent(slug)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: json,
  });
  return (await readJsonOrThrow(res)) as { ok: true; updatedAt: string };
}

// The signed-in user's own saved page, if they've published one before —
// lets the builder resume their real page instead of always starting blank.
export async function getMyProfile(): Promise<{
  slug: string;
  profile: Profile;
  updatedAt: string | null;
} | null> {
  const res = await fetch(`${API_URL}/api/me/profile`, { credentials: "include" });
  if (!res.ok) return null;
  const { profile } = (await res.json()) as {
    profile: { slug: string; data: unknown; updatedAt: string | null } | null;
  };
  return profile
    ? { slug: profile.slug, profile: normalizeProfile(profile.data), updatedAt: profile.updatedAt }
    : null;
}

// Advisory only — the authoritative check still happens server-side at
// publish time (PUT /:slug's ownership check), so this never needs to be
// more than "is this worth warning the user about right now". Short-
// circuits when the typed slug is the one the caller already owns, so
// switching back to your own current slug never round-trips to the server.
export async function isSlugAvailable(slug: string, myOwnedSlug: string | null): Promise<boolean> {
  if (slug === myOwnedSlug) return true;
  try {
    const res = await fetch(`${API_URL}/api/profiles/${encodeURIComponent(slug)}`);
    if (!res.ok) return true;
    const { profile } = (await res.json()) as { profile: unknown };
    return profile === null;
  } catch {
    // Unreachable API shouldn't block typing — treat as unknown/available,
    // the real gate is still the server at publish time.
    return true;
  }
}

export async function getPublishedProfile(slug: string): Promise<Profile | null> {
  try {
    const res = await fetch(`${API_URL}/api/profiles/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const { profile } = (await res.json()) as { profile: unknown };
    return profile ? normalizeProfile(profile) : null;
  } catch {
    // Unreachable API (e.g. backend not running) shouldn't crash the public
    // page — it just falls back to whatever routes/p.$slug.tsx does next
    // (the URL-fragment or local-draft paths).
    return null;
  }
}

export async function uploadMusicTrack(slug: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/music/${encodeURIComponent(slug)}`, {
    method: "POST",
    body: formData,
  });
  const data = (await readJsonOrThrow(res)) as { url: string };
  // The API returns a path relative to itself, not an absolute CDN URL like
  // Vercel Blob used to — resolve it so the resulting <audio src> works.
  return { url: new URL(data.url, API_URL).toString() };
}

// Unlike uploadMusicTrack, the images route requires auth (see
// backend/routes/images.ts) — the resulting URL is embedded in a public
// og:image meta tag, so credentials must travel with the request.
export async function uploadOgImage(slug: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/images/${encodeURIComponent(slug)}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const data = (await readJsonOrThrow(res)) as { url: string };
  return { url: new URL(data.url, API_URL).toString() };
}
