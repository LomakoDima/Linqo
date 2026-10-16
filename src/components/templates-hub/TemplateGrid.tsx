import type { Template } from "@/lib/templates";
import { TemplateCard } from "./TemplateCard";

export function TemplateGrid({
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
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {templates.map((t) => (
        <TemplateCard
          key={t.id}
          template={t}
          layout="grid"
          active={activeTemplateId === t.id}
          favorite={favorites.includes(t.id)}
          onToggleFavorite={() => onToggleFavorite(t.id)}
          onUse={() => onUse(t)}
          onPreview={() => onPreview(t)}
          onHoverChange={(hovering) => onHoverChange(t.id, hovering)}
        />
      ))}
    </div>
  );
}
