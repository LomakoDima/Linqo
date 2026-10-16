import type { Template } from "@/lib/templates";
import { TemplateCard } from "./TemplateCard";

export function FeaturedTemplates({
  templates,
  favorites,
  activeTemplateId,
  onToggleFavorite,
  onUse,
  onPreview,
  onHoverChange,
}: {
  templates: Template[];
  favorites: string[];
  activeTemplateId?: string;
  onToggleFavorite: (id: string) => void;
  onUse: (t: Template) => void;
  onPreview: (t: Template) => void;
  onHoverChange: (id: string, hovering: boolean) => void;
}) {
  if (templates.length === 0) return null;
  return (
    <section className="space-y-4">
      <h3 className="eyebrow">Featured</h3>
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-5 sm:gap-y-8 sm:overflow-visible sm:px-0 sm:pb-0 [&>article]:w-[68%] [&>article]:shrink-0 [&>article]:snap-start sm:[&>article]:w-auto">
        {templates.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            layout="featured"
            active={activeTemplateId === t.id}
            favorite={favorites.includes(t.id)}
            onToggleFavorite={() => onToggleFavorite(t.id)}
            onUse={() => onUse(t)}
            onPreview={() => onPreview(t)}
            onHoverChange={(hovering) => onHoverChange(t.id, hovering)}
          />
        ))}
      </div>
    </section>
  );
}
