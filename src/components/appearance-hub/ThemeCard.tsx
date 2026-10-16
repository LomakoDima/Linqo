import { Check, Star } from "lucide-react";
import { THEMES, type ThemeName } from "@/lib/link-store";
import { THEME_META } from "@/lib/theme-meta";

// A miniature of what the theme actually does to a page — its own background,
// text colour, card surface and accent — drawn with the same class strings
// the renderer uses, so a tile can't disagree with the real result.
//
// Two sibling buttons (select / favorite) rather than nested interactive
// elements; the tile's accessible name carries the theme and its state.
export function ThemeCard({
  name,
  active,
  favorite,
  onSelect,
  onToggleFavorite,
  onHoverChange,
}: {
  name: ThemeName;
  active: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onHoverChange: (hovering: boolean) => void;
}) {
  const theme = THEMES[name];
  const meta = THEME_META[name];

  return (
    <div
      className="group relative min-w-0"
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        aria-label={`${theme.label} — ${meta.tagline}${active ? " (current theme)" : ""}`}
        className={`block w-full cursor-pointer overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow] duration-150 ${
          active
            ? "border-foreground shadow-[0_0_0_1px_var(--foreground)]"
            : "border-border hover:border-foreground/50"
        }`}
      >
        <span className={`relative block h-24 p-3 ${theme.bg}`}>
          <span className="flex items-center gap-2" aria-hidden>
            <span className="h-5 w-5 rounded-full bg-current opacity-30" />
            <span className="space-y-1">
              <span className="block h-1.5 w-14 rounded-full bg-current opacity-80" />
              <span className="block h-1.5 w-9 rounded-full bg-current opacity-40" />
            </span>
          </span>
          <span aria-hidden className={`mt-3 block h-6 rounded-md ${theme.card}`} />
          <span
            aria-hidden
            className={`absolute bottom-3.5 right-3.5 h-2 w-2 rounded-full bg-current ${theme.accent}`}
          />
        </span>
        <span className="block bg-card px-3 py-2.5">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{theme.label}</span>
            {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          </span>
          <span className="eyebrow mt-1.5 block truncate">{meta.tagline}</span>
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={
          favorite ? `Remove ${theme.label} from favorites` : `Add ${theme.label} to favorites`
        }
        aria-pressed={favorite}
        className={`absolute right-2 top-2 grid h-7 w-7 cursor-pointer place-items-center rounded-ui border border-border bg-background transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100 ${
          favorite ? "opacity-100" : "opacity-0"
        }`}
      >
        <Star
          className={`h-3.5 w-3.5 ${favorite ? "fill-brand text-brand" : "text-muted-foreground"}`}
        />
      </button>
    </div>
  );
}
