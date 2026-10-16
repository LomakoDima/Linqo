import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { Profile } from "@/lib/link-store";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  previewProfileForTemplate,
  sortTemplates,
  type Template,
  type TemplateSortMode,
} from "@/lib/templates";
import {
  getFavoriteTemplateIds,
  getRecentTemplateIds,
  pushRecentTemplateId,
  toggleFavoriteTemplateId,
} from "@/lib/template-library-storage";
import { TemplateHeader } from "./TemplateHeader";
import { TemplateSearch } from "./TemplateSearch";
import { TemplateSort } from "./TemplateSort";
import { TemplateCategoryFilter, type TemplateCategoryFilterValue } from "./TemplateCategoryFilter";
import { FeaturedTemplates } from "./FeaturedTemplates";
import { RecentTemplates } from "./RecentTemplates";
import { TemplateGrid } from "./TemplateGrid";
import { TemplateEmptyState } from "./TemplateEmptyState";
import { TemplatePreviewModal } from "./TemplatePreviewModal";

// The Templates tab's orchestrator — mirrors ThemeLibrary's "search + filter
// collapse the curated rows down to a flat result list" shape, but for the
// template gallery: Featured and Recently Used only show up while browsing
// unfiltered, same as Theme Library's Favorites/Recent/Featured rows.
export function TemplatesHub({
  profile,
  activeTemplateId,
  onUseTemplate,
  onPreviewTemplate,
}: {
  profile: Profile;
  activeTemplateId?: string;
  onUseTemplate: (t: Template) => void;
  onPreviewTemplate: (previewProfile: Profile | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TemplateCategoryFilterValue>("all");
  const [sort, setSort] = useState<TemplateSortMode>("recommended");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [modalTemplate, setModalTemplate] = useState<Template | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    setFavorites(getFavoriteTemplateIds());
    setRecentIds(getRecentTemplateIds());
  }, []);

  // "Recently Used" tracks templates that were actually committed — driven
  // by `activeTemplateId` (profile.templateId), not the Use click itself.
  // Clicking Use on a non-empty page first opens a replace confirmation
  // (see requestApplyTemplate in build.tsx); if the visitor cancels that,
  // profile.templateId never changes, so nothing gets recorded here. Skips
  // the very first run so a fresh profile's default templateId ("standard")
  // doesn't get logged as "recently used" on mount.
  const prevActiveTemplateId = useRef(activeTemplateId);
  useEffect(() => {
    if (activeTemplateId && activeTemplateId !== prevActiveTemplateId.current) {
      setRecentIds(pushRecentTemplateId(activeTemplateId));
    }
    prevActiveTemplateId.current = activeTemplateId;
  }, [activeTemplateId]);

  // The phone aside (rendered by the parent, outside this tab) previews
  // whichever template the visitor is actively engaging with — the open
  // modal wins over an idle hover underneath it.
  const previewTarget =
    modalTemplate ?? (hoveredId ? TEMPLATES.find((t) => t.id === hoveredId) : null);
  useEffect(() => {
    onPreviewTemplate(previewTarget ? previewProfileForTemplate(profile, previewTarget) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewTarget, profile]);
  useEffect(() => () => onPreviewTemplate(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  const deferredQuery = useDeferredValue(query);

  const handleToggleFavorite = (id: string) => setFavorites(toggleFavoriteTemplateId(id));
  const handleUseFromModal = (t: Template) => {
    onUseTemplate(t);
    setModalTemplate(null);
  };
  const clearFilters = () => {
    setQuery("");
    setCategory("all");
  };

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        TEMPLATE_CATEGORIES[t.category].label.toLowerCase().includes(q)
      );
    });
  }, [deferredQuery, category]);

  const sorted = useMemo(() => sortTemplates(filtered, sort), [filtered, sort]);

  const showBrowseSections = !deferredQuery.trim() && category === "all";
  const featured = showBrowseSections ? TEMPLATES.filter((t) => t.featured) : [];
  const recentTemplates = showBrowseSections
    ? recentIds
        .map((id) => TEMPLATES.find((t) => t.id === id))
        .filter((t): t is Template => t !== undefined)
    : [];

  const cardHandlers = {
    favorites,
    activeTemplateId,
    onToggleFavorite: handleToggleFavorite,
    onUse: onUseTemplate,
    onPreview: (t: Template) => setModalTemplate(t),
    onHoverChange: (id: string, hovering: boolean) =>
      setHoveredId((prev) => {
        if (hovering) return id;
        return prev === id ? null : prev;
      }),
  };

  return (
    <div className="space-y-10">
      <TemplateHeader />

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TemplateSearch value={query} onChange={setQuery} />
          <TemplateSort value={sort} onChange={setSort} />
        </div>
        <TemplateCategoryFilter value={category} onChange={setCategory} />
      </div>

      <FeaturedTemplates templates={featured} {...cardHandlers} />
      <RecentTemplates templates={recentTemplates} {...cardHandlers} />

      <section className="space-y-4" aria-live="polite">
        <h3 className="eyebrow">
          {showBrowseSections
            ? "All templates"
            : `${sorted.length} result${sorted.length === 1 ? "" : "s"}`}
        </h3>
        {sorted.length === 0 ? (
          <TemplateEmptyState onClear={clearFilters} />
        ) : (
          <TemplateGrid templates={sorted} {...cardHandlers} />
        )}
      </section>

      <TemplatePreviewModal
        template={modalTemplate}
        profile={profile}
        open={modalTemplate !== null}
        onOpenChange={(o) => !o && setModalTemplate(null)}
        onUse={handleUseFromModal}
      />
    </div>
  );
}
