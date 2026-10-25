// Local heuristics, not semantic/visual moderation. Keep this policy separate
// from validation so a self-hosted CV classifier can replace it independently.
import { blockedTextFinding } from "./text-moderation";
export const BLOCKED_CONTENT_DOMAINS = [
  "pornhub.com",
  "xvideos.com",
  "xnxx.com",
  "xhamster.com",
  "redtube.com",
  "youporn.com",
];

const RULES: { category: string; pattern: RegExp }[] = [
  {
    category: "explicit sexual content",
    pattern:
      /(?:^|[^\p{L}\p{N}])(?:porn(?:ography|ographic)?|porno|порно|порнография|хентай|hentai|nsfw|nudes|csam)(?=$|[^\p{L}\p{N}])/iu,
  },
  {
    category: "graphic violence",
    pattern: /(?:^|[^\p{L}\p{N}])(?:gore|snuff|расчлен[её]нка|гуро)(?=$|[^\p{L}\p{N}])/iu,
  },
];

function legacyTextViolation(text: string): string | null {
  const normalized = text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\s+/g, " ");
  return RULES.find((rule) => rule.pattern.test(normalized))?.category ?? null;
}

export function localTextViolation(text: string): string | null {
  return legacyTextViolation(text) ?? blockedTextFinding(text)?.category ?? null;
}

export function localTextViolationMessage(text: string): string | null {
  if (legacyTextViolation(text)) return "This text is blocked by the local content policy";
  return blockedTextFinding(text)?.message ?? null;
}

export function isBlockedContentHost(host: string): boolean {
  const value = host.toLowerCase().replace(/\.$/, "");
  return BLOCKED_CONTENT_DOMAINS.some((domain) => value === domain || value.endsWith(`.${domain}`));
}
