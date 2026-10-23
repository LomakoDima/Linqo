import { Sparkle } from "lucide-react";

const UPCOMING = [
  "Day / Night mode",
  "Weather",
  "Seasonal themes",
  "Dynamic backgrounds",
  "Interactive cursor",
  "Floating objects",
  "Bloom",
  "Screen vignette",
];

// Static and inert — names what's coming without pretending it's live.
// Keeps the tab reading as a growing set of modules rather than a closed
// list, without building any of these before they're real.
export function FutureEffectsPlaceholderCard() {
  return (
    <div className="rounded-lg border border-dashed border-border p-5">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-muted-foreground">
          <Sparkle className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-display text-xl font-medium">More on the way</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            New atmosphere modules land here as they ship.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {UPCOMING.map((label) => (
          <span
            key={label}
            className="rounded-ui border border-border px-2.5 py-1 text-xs text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
