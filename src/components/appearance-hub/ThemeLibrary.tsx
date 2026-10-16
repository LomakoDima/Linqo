import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { THEMES, type Profile, type ThemeName } from "@/lib/link-store";
import { THEME_CATEGORIES, THEME_META, type ThemeCategory } from "@/lib/theme-meta";
import { getFavorites, getRecent, pushRecent, toggleFavorite } from "@/lib/theme-library-storage";
import { ThemeCard } from "./ThemeCard";

const ALL_THEME_NAMES = Object.keys(THEMES) as ThemeName[];

type Filter = "all" | "featured" | ThemeCategory;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "featured", label: "Featured" },
  ...THEME_CATEGORIES.map((c) => ({ id: c as Filter, label: c })),
];

function matches(name: ThemeName, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "featured") return !!THEME_META[name].featured;
  return THEME_META[name].categories.includes(filter);
}

// Step one of Appearance: choose a complete theme. Everything else (accent,
// background, effects) is a refinement layered on top of it, so this is the
// first thing in the panel and it applies instantly — hovering a tile shows
// it in the phone preview without committing.
export function ThemeLibrary({
  profile,
  update,
  onPreviewProfile,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  onPreviewProfile: (p: Profile | null) => void;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<Filter>("all");
  const [favorites, setFavorites] = useState<ThemeName[]>([]);
  const [recent, setRecent] = useState<ThemeName[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
    setRecent(getRecent());
    // A hovered tile unmounts without a mouseleave when the panel switches —
    // never leave the phone stuck on a theme that was only being previewed.
    return () => onPreviewProfile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTheme = (name: ThemeName) => {
    update({ theme: name });
    setRecent(pushRecent(name));
    onPreviewProfile(null);
  };

  const filteredNames = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return ALL_THEME_NAMES.filter((name) => {
      if (!matches(name, filter)) return false;
      if (!q) return true;
      return (
        THEMES[name].label.toLowerCase().includes(q) ||
        THEME_META[name].tagline.toLowerCase().includes(q)
      );
    });
  }, [deferredQuery, filter]);

  const browsing = !deferredQuery.trim() && filter === "all";

  const renderGrid = (names: ThemeName[]) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {names.map((name) => (
        <ThemeCard
          key={name}
          name={name}
          active={profile.theme === name}
          favorite={favorites.includes(name)}
          onSelect={() => selectTheme(name)}
          onToggleFavorite={() => setFavorites(toggleFavorite(name))}
          onHoverChange={(hovering) =>
            onPreviewProfile(
              hovering && profile.theme !== name ? { ...profile, theme: name } : null,
            )
          }
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search themes…"
            aria-label="Search themes"
            className="pl-9"
          />
        </div>
        <div
          role="group"
          aria-label="Theme collections"
          className="-mx-4 flex gap-5 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`-mb-px h-10 shrink-0 cursor-pointer border-b-2 text-sm transition-colors duration-150 ${
                filter === f.id
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {browsing && favorites.length > 0 && (
        <section className="space-y-3">
          <h3 className="eyebrow">Favorites</h3>
          {renderGrid(favorites)}
        </section>
      )}
      {browsing && recent.length > 0 && (
        <section className="space-y-3">
          <h3 className="eyebrow">Recently used</h3>
          {renderGrid(recent)}
        </section>
      )}

      <section className="space-y-3" aria-live="polite">
        <h3 className="eyebrow">
          {browsing
            ? `All themes · ${filteredNames.length}`
            : `${filteredNames.length} result${filteredNames.length === 1 ? "" : "s"}`}
        </h3>
        {filteredNames.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
            <p className="font-display text-lg font-medium">No themes match</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="mt-2 cursor-pointer text-sm text-brand-ink underline-offset-4 hover:underline"
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          renderGrid(filteredNames)
        )}
      </section>
    </div>
  );
}
