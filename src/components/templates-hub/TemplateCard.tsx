import { useMemo } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEMES, type Profile } from "@/lib/link-store";
import { TEMPLATE_CATEGORIES, instantiateTemplate, type Template } from "@/lib/templates";
import { PagePreviewThumb } from "@/components/PagePreviewThumb";
import { TemplateBadge } from "./TemplateBadge";
import { FavoriteButton } from "./FavoriteButton";

// "feature" is the larger editorial tile (taller page, description, display
// name); "grid" is the dense catalog tile; "compact" is the Recently Used
// strip. All three are the same component so selected / hover / focus
// behave identically everywhere.
export type TemplateCardLayout = "grid" | "featured" | "compact";

// A neutral stand-in identity for the card's own thumbnail — deliberately
// independent of the visitor's real profile, so re-renders elsewhere in the
// builder never cascade into every always-mounted tile re-instantiating its
// blocks. The personalized preview (the visitor's own name/avatar) is
// reserved for hover/click, where it syncs to the phone and the modal.
function thumbnailProfile(t: Template): Profile {
  return {
    slug: "you",
    name: "Your name",
    bio: "",
    avatar: "",
    cover: "",
    theme: t.theme,
    blocks: instantiateTemplate(t),
  };
}

const ASPECT: Record<TemplateCardLayout, string> = {
  grid: "3 / 4.2",
  featured: "3 / 4.5",
  compact: "3 / 3.6",
};

export function TemplateCard({
  template,
  layout = "grid",
  active,
  favorite,
  onToggleFavorite,
  onUse,
  onPreview,
  onHoverChange,
}: {
  template: Template;
  layout?: TemplateCardLayout;
  active: boolean;
  favorite: boolean;
  onToggleFavorite: () => void;
  onUse: () => void;
  onPreview: () => void;
  onHoverChange: (hovering: boolean) => void;
}) {
  const preview = useMemo(() => thumbnailProfile(template), [template]);
  const themeLabel = THEMES[template.theme]?.label ?? template.theme;
  const categoryLabel = TEMPLATE_CATEGORIES[template.category].label;
  const blockCount = template.blocks.length;
  const isFeatured = layout === "featured";
  const isCompact = layout === "compact";

  return (
    <article
      className="group relative min-w-0"
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
    >
      <div
        className={`relative overflow-hidden rounded-lg border transition-[border-color,box-shadow] duration-150 ${
          active
            ? "border-foreground shadow-[0_0_0_1px_var(--foreground)]"
            : "border-border group-hover:border-foreground/50"
        }`}
      >
        <button
          type="button"
          onClick={onPreview}
          aria-label={`Preview the ${template.name} template`}
          className="block w-full cursor-pointer text-left"
        >
          {template.blank ? (
            <div
              style={{ aspectRatio: ASPECT[layout] }}
              className="flex flex-col items-center justify-center gap-2 bg-surface text-muted-foreground"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full border border-dashed border-muted-foreground/60">
                <Plus className="h-4 w-4" />
              </span>
              {!isCompact && <span className="eyebrow">Nothing yet</span>}
            </div>
          ) : (
            <PagePreviewThumb profile={preview} aspect={ASPECT[layout]} crop={88} />
          )}
        </button>

        {!isCompact && template.badges && template.badges.length > 0 && (
          <div className="pointer-events-none absolute left-2 top-2 flex gap-1">
            {template.badges.map((b) => (
              <TemplateBadge key={b} kind={b} />
            ))}
          </div>
        )}

        {!isCompact && (
          <FavoriteButton
            active={favorite}
            onToggle={onToggleFavorite}
            className="absolute right-2 top-2"
          />
        )}

        {active && (
          <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-ui bg-foreground px-1.5 py-1 text-[0.6875rem] font-medium text-background">
            <Check className="h-3 w-3" aria-hidden /> In use
          </span>
        )}
      </div>

      <div className={isCompact ? "mt-2" : "mt-3"}>
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className={`min-w-0 truncate font-medium ${
              isFeatured ? "font-display text-xl" : isCompact ? "text-xs" : "text-sm"
            }`}
          >
            {template.name}
          </h3>
          {!isCompact && !isFeatured && !template.blank && (
            <span className="tabular shrink-0 text-xs text-muted-foreground">
              {blockCount} blocks
            </span>
          )}
        </div>
        {!isCompact && (
          <p className="eyebrow mt-1.5 truncate">
            {isFeatured ? `${categoryLabel} · ${template.tagline}` : template.tagline}
          </p>
        )}
        {isFeatured && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {template.description}
          </p>
        )}
        {isFeatured && !template.blank && (
          <p className="tabular mt-2 text-xs text-muted-foreground">
            {blockCount} blocks · {themeLabel}
          </p>
        )}

        <div className={`flex items-center gap-2 ${isCompact ? "mt-2" : "mt-3"}`}>
          <Button
            size="sm"
            onClick={onUse}
            className={isCompact ? "h-7 px-2.5 text-xs" : undefined}
          >
            {template.blank ? "Start blank" : "Use"}
          </Button>
          {!isCompact && (
            <Button size="sm" variant="ghost" onClick={onPreview}>
              Preview
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
