import type { LinkBlock, Profile } from "./link-store";
import { moderateText, type ModerationCategory } from "./text-moderation";

export type ContentWarning = { path: string; category: ModerationCategory; message: string };
function warningsForFields(object: object, keys: readonly string[], prefix = ""): ContentWarning[] {
  return keys.flatMap((key) => {
    const value = (object as Record<string, unknown>)[key];
    if (typeof value !== "string") return [];
    return moderateText(value)
      .filter((f) => f.severity === "warning")
      .map((f) => ({ path: prefix + key, category: f.category, message: f.message }));
  });
}
export function blockModerationWarnings(block: LinkBlock): ContentWarning[] {
  const warnings = warningsForFields(block, [
    "title",
    "subtitle",
    "quoteText",
    "quoteAuthor",
    "videoTitle",
    "countdownLabel",
    "countdownExpiredMessage",
  ]);
  for (const key of ["galleryImages", "timelineItems", "faqItems"] as const) {
    for (const [index, item] of (block[key] ?? []).entries())
      warnings.push(
        ...warningsForFields(
          item,
          ["caption", "title", "date", "description", "question", "answer"],
          `${key}.${index}.`,
        ),
      );
  }
  if (block.textRuns)
    warnings.push(
      ...warningsForFields({ textRuns: block.textRuns.map((r) => r.text).join("") }, ["textRuns"]),
    );
  return warnings.slice(0, 12);
}
export function profileModerationWarnings(profile: Profile): ContentWarning[] {
  return [
    ...warningsForFields(profile, ["name", "bio", "seoTitle", "seoDescription"]),
    ...profile.blocks.flatMap((block, index) =>
      blockModerationWarnings(block).map((w) => ({ ...w, path: `blocks.${index}.${w.path}` })),
    ),
  ].slice(0, 12);
}
