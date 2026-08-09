import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { THEME_CATEGORIES, type ThemeCategory } from "@/lib/theme-meta";

export type ThemeFilter = "Featured" | ThemeCategory;

const FILTERS: ThemeFilter[] = ["Featured", ...THEME_CATEGORIES];

export function ThemeFilterBar({
  query,
  onQueryChange,
  activeFilter,
  onFilterChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  activeFilter: ThemeFilter | null;
  onFilterChange: (filter: ThemeFilter | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search themes…"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const active = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(active ? null : filter)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
