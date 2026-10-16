// Editor-only browsing state for the Templates gallery — same convention as
// theme-library-storage.ts (neither favorites nor recents affect the
// published page, so neither belongs in the profile JSON or needs a
// backend round-trip).
const FAVORITES_KEY = "linqo_template_favorites_v1";
const RECENT_KEY = "linqo_template_recent_v1";
const RECENT_CAP = 6;

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage can be unavailable (private mode, disabled) — never block the
    // interaction it was tracking.
  }
}

export function getFavoriteTemplateIds(): string[] {
  return readList(FAVORITES_KEY);
}

export function toggleFavoriteTemplateId(id: string): string[] {
  const current = getFavoriteTemplateIds();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  writeList(FAVORITES_KEY, next);
  return next;
}

export function getRecentTemplateIds(): string[] {
  return readList(RECENT_KEY);
}

export function pushRecentTemplateId(id: string): string[] {
  const next = [id, ...getRecentTemplateIds().filter((x) => x !== id)].slice(0, RECENT_CAP);
  writeList(RECENT_KEY, next);
  return next;
}
