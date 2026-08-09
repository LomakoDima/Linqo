import { useEffect, useMemo, useState } from "react";
import { Palette } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { THEMES, type Profile, type ThemeName } from "@/lib/link-store";
import { THEME_META } from "@/lib/theme-meta";
import { getFavorites, getRecent, pushRecent, toggleFavorite } from "@/lib/theme-library-storage";
import { ThemeCard } from "./ThemeCard";
import { ThemeFilterBar, type ThemeFilter } from "./ThemeFilterBar";
import { ThemeInspector } from "./ThemeInspector";

const ALL_THEME_NAMES = Object.keys(THEMES) as ThemeName[];

export function ThemeLibrary({
  profile,
  update,
}: {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ThemeFilter | null>(null);
  const [favorites, setFavorites] = useState<ThemeName[]>([]);
  const [recent, setRecent] = useState<ThemeName[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
    setRecent(getRecent());
  }, []);

  const selectTheme = (name: ThemeName) => {
    update({ theme: name });
    setRecent(pushRecent(name));
  };

  const handleToggleFavorite = (name: ThemeName) => {
    setFavorites(toggleFavorite(name));
  };

  const filteredNames = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_THEME_NAMES.filter((name) => {
      const meta = THEME_META[name];
      const label = THEMES[name].label;
      if (q && !label.toLowerCase().includes(q) && !meta.tagline.toLowerCase().includes(q)) {
        return false;
      }
      if (filter === "Featured") return !!meta.featured;
      if (filter) return meta.categories.includes(filter);
      return true;
    });
  }, [query, filter]);

  const featuredNames = ALL_THEME_NAMES.filter((name) => THEME_META[name].featured);
  const showBrowseSections = !query && !filter;

  return (
    <SectionCard
      icon={Palette}
      title="Theme Library"
      description="Pick the visual identity of your page."
    >
      <ThemeFilterBar
        query={query}
        onQueryChange={setQuery}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      {showBrowseSections && favorites.length > 0 && (
        <ThemeRow
          label="Favorites"
          names={favorites}
          profile={profile}
          favorites={favorites}
          onSelect={selectTheme}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {showBrowseSections && recent.length > 0 && (
        <ThemeRow
          label="Recently Used"
          names={recent}
          profile={profile}
          favorites={favorites}
          onSelect={selectTheme}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {showBrowseSections && (
        <ThemeRow
          label="Featured"
          names={featuredNames}
          profile={profile}
          favorites={favorites}
          onSelect={selectTheme}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {showBrowseSections
            ? "All Themes"
            : `${filteredNames.length} result${filteredNames.length === 1 ? "" : "s"}`}
        </p>
        {filteredNames.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No themes match "{query}"
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredNames.map((name) => (
              <ThemeCard
                key={name}
                name={name}
                active={profile.theme === name}
                favorite={favorites.includes(name)}
                onSelect={() => selectTheme(name)}
                onToggleFavorite={() => handleToggleFavorite(name)}
              />
            ))}
          </div>
        )}
      </div>

      <ThemeInspector theme={profile.theme} />
    </SectionCard>
  );
}

function ThemeRow({
  label,
  names,
  profile,
  favorites,
  onSelect,
  onToggleFavorite,
}: {
  label: string;
  names: ThemeName[];
  profile: Profile;
  favorites: ThemeName[];
  onSelect: (name: ThemeName) => void;
  onToggleFavorite: (name: ThemeName) => void;
}) {
  if (names.length === 0) return null;
  return (
    <div>
      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label === "Featured" && "⭐"} {label}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {names.map((name) => (
          <ThemeCard
            key={name}
            name={name}
            active={profile.theme === name}
            favorite={favorites.includes(name)}
            onSelect={() => onSelect(name)}
            onToggleFavorite={() => onToggleFavorite(name)}
          />
        ))}
      </div>
    </div>
  );
}
