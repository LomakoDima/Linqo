import type { Template } from "@/lib/templates";
import { TemplateCard } from "./TemplateCard";

// Hidden entirely when there's no history — see TemplatesHub, which only
// renders this once localStorage actually has recent ids.
export function RecentTemplates({
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
      <h3 className="eyebrow">Recently used</h3>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 [&>article]:w-28 [&>article]:shrink-0">
        {templates.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            layout="compact"
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
