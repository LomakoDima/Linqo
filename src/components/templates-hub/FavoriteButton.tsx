import { Star } from "lucide-react";

// Stays out of the way until the tile is hovered/focused, then sticks once
// set — a bookmark, not a call to action.
export function FavoriteButton({
  active,
  onToggle,
  className = "",
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={active}
      className={`grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-ui border border-border bg-background transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100 ${
        active ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      <Star
        className={`h-3.5 w-3.5 ${active ? "fill-brand text-brand" : "text-muted-foreground"}`}
      />
    </button>
  );
}
