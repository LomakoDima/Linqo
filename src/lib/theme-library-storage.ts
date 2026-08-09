import type { ThemeName } from "@/lib/link-store";

// Editor-only browsing state — neither affects the published page, so
// neither belongs in the ~400KB profile JSON or needs a backend round-trip.
// Same convention as linqo_theme / TOUR_SEEN_KEY / the audio opt-in flags
// already used elsewhere in this app.
const FAVORITES_KEY = "linqo_theme_favorites_v1";
const RECENT_KEY = "linqo_theme_recent_v1";
const RECENT_CAP = 6;

function readList(key: string): ThemeName[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ThemeName[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: ThemeName[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage can be unavailable (private mode, disabled) — never block the
    // interaction it was tracking.
  }
}

export function getFavorites(): ThemeName[] {
  return readList(FAVORITES_KEY);
}

export function toggleFavorite(name: ThemeName): ThemeName[] {
  const current = getFavorites();
  const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
  writeList(FAVORITES_KEY, next);
  return next;
}

export function getRecent(): ThemeName[] {
  return readList(RECENT_KEY);
}

export function pushRecent(name: ThemeName): ThemeName[] {
  const next = [name, ...getRecent().filter((n) => n !== name)].slice(0, RECENT_CAP);
  writeList(RECENT_KEY, next);
  return next;
}
