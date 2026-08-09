import { motion } from "motion/react";
import { Star, Check } from "lucide-react";
import { THEMES, type ThemeName } from "@/lib/link-store";
import { THEME_META } from "@/lib/theme-meta";
import { blockSpring, libraryCardHover, libraryCardTap } from "@/lib/block-motion/variants";

// The entire card is the selection target — clicking anywhere but the star
// applies the theme immediately, no separate preview-then-confirm step.
export function ThemeCard({
  name,
  active,
  favorite,
  onSelect,
  onToggleFavorite,
}: {
  name: ThemeName;
  active: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  const theme = THEMES[name];
  const meta = THEME_META[name];

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      whileHover={libraryCardHover}
      whileTap={libraryCardTap}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 text-left transition-colors duration-200 ${
        active ? "border-primary shadow-md" : "border-transparent hover:border-muted-foreground/30"
      }`}
    >
      <div className={`relative h-20 w-full p-3 ${theme.bg}`}>
        <div className="mb-2 h-2 w-8 rounded bg-white/50" />
        <div className={`h-3.5 rounded ${theme.card}`} />
        <div className={`mt-1.5 h-3.5 w-2/3 rounded ${theme.card}`} />

        {active && (
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={blockSpring}
            className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground shadow"
          >
            <Check className="h-3 w-3" />
          </motion.span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          className={`absolute left-2 top-2 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${
            favorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <Star
            className={`h-3.5 w-3.5 ${favorite ? "fill-amber-400 text-amber-400" : "text-white"}`}
          />
        </button>
      </div>

      <div className="bg-card px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <span>{meta.emoji}</span>
          <span className="truncate">{theme.label}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta.tagline}</p>
      </div>
    </motion.div>
  );
}
