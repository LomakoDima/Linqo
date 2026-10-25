import type { ContentWarning } from "@/lib/moderation-warnings";

const LABELS: Record<string, string> = {
  name: "Display name",
  bio: "Bio",
  seoTitle: "Link title",
  seoDescription: "Description",
  title: "Title",
  subtitle: "Subtitle",
  quoteText: "Quote",
  quoteAuthor: "Author",
  videoTitle: "Video title",
  countdownLabel: "Countdown label",
  countdownExpiredMessage: "Countdown message",
  textRuns: "Text",
  caption: "Caption",
  date: "Date",
  description: "Description",
  question: "Question",
  answer: "Answer",
};
function fieldLabel(path: string): string {
  const parts = path.split(".");
  const block = parts[0] === "blocks" ? `Block ${Number(parts[1]) + 1} · ` : "";
  const nested = parts.findIndex((part) =>
    ["galleryImages", "timelineItems", "faqItems"].includes(part),
  );
  const item =
    nested >= 0
      ? `${parts[nested] === "galleryImages" ? "Image" : parts[nested] === "timelineItems" ? "Event" : "FAQ"} ${Number(parts[nested + 1]) + 1} · `
      : "";
  const key = parts.at(-1) ?? "";
  return block + item + (LABELS[key] ?? "Content");
}

export function ContentWarnings({ warnings }: { warnings: ContentWarning[] }) {
  if (!warnings.length) return null;
  return (
    <div
      className="mt-3 rounded-lg border border-border p-3 text-xs text-muted-foreground"
      aria-live="polite"
    >
      <p className="font-medium text-foreground">Check wording</p>
      <ul className="mt-1.5 space-y-1.5">
        {warnings.map((warning, index) => (
          <li key={`${warning.path}-${index}`}>
            <span className="font-medium">{fieldLabel(warning.path)}: </span>
            {warning.message}
          </li>
        ))}
      </ul>
      <p className="mt-2">
        Advisory only. Ordinary profanity, opinions and criticism do not block publishing.
      </p>
    </div>
  );
}
