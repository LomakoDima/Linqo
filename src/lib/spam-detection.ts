import type { Profile } from "./link-store";
export type SpamIssue = { path: string; message: string };
export function normaliseSpamText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}
export function spamTarget(value: string): string {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()])
      if (/^utm_/i.test(key) || ["fbclid", "gclid"].includes(key.toLowerCase()))
        url.searchParams.delete(key);
    url.searchParams.sort();
    return url.href;
  } catch {
    return value;
  }
}
export function promotionalItems(profile: Profile): { text: string; target: string }[] {
  return profile.blocks.flatMap((block) => {
    const text = normaliseSpamText(
      [block.title, block.subtitle, block.quoteText, block.textRuns?.map((r) => r.text).join("")]
        .filter(Boolean)
        .join(" "),
    );
    return [{ text, target: block.url ? spamTarget(block.url) : "" }];
  });
}
export function detectProfileSpam(profile: Profile): SpamIssue[] {
  const items = promotionalItems(profile),
    issues: SpamIssue[] = [];
  const texts = items.filter((i) => i.text.length >= 24),
    targets = items.filter((i) => i.target);
  const counts = (values: string[]) => {
    const map = new Map<string, number>();
    for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
    return Math.max(0, ...map.values());
  };
  if (
    texts.length >= 6 &&
    counts(texts.map((i) => i.text)) >= Math.max(6, Math.ceil(texts.length * 0.8))
  )
    issues.push({
      path: "blocks",
      message: "Too many copies of the same text. Combine repeated promotional blocks.",
    });
  if (counts(targets.map((i) => i.target)) >= 12)
    issues.push({
      path: "blocks",
      message: "The same destination is repeated too often. Remove duplicate promotional links.",
    });
  return issues;
}
