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
    <div className="rounded-2xl border border-dashed border-border bg-card/30 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/50 text-accent-foreground">
          <Sparkle className="h-5 w-5" />
        </span>
        <div>
          <div className="font-semibold">More on the way</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            New atmosphere modules land here as they ship.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {UPCOMING.map((label) => (
          <span
            key={label}
            className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
