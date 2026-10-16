import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_ORDER,
  type TemplateCategory,
} from "@/lib/templates";

export type TemplateCategoryFilterValue = TemplateCategory | "all";

// Plain text filters with a rule under the active one — a category row is
// navigation, not a set of buttons, so it shouldn't compete with Use.
export function TemplateCategoryFilter({
  value,
  onChange,
}: {
  value: TemplateCategoryFilterValue;
  onChange: (value: TemplateCategoryFilterValue) => void;
}) {
  const count = (c: TemplateCategoryFilterValue) =>
    c === "all" ? TEMPLATES.length : TEMPLATES.filter((t) => t.category === c).length;
  const items: TemplateCategoryFilterValue[] = ["all", ...TEMPLATE_CATEGORY_ORDER];

  return (
    <div
      role="group"
      aria-label="Filter templates by category"
      className="-mx-4 flex gap-5 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
    >
      {items.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-pressed={active}
            className={`-mb-px flex h-10 shrink-0 cursor-pointer items-baseline gap-1.5 border-b-2 pt-2.5 text-sm transition-colors duration-150 ${
              active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {c === "all" ? "All" : TEMPLATE_CATEGORIES[c].label}
            <span className="tabular text-[0.6875rem] text-muted-foreground">{count(c)}</span>
          </button>
        );
      })}
    </div>
  );
}
