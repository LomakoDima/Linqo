// A slim sticky row of section chips that jump-scrolls the matching card
// into view — not a structural sidebar. Sections stay the same collapsible
// SectionCard stack every other builder tab already uses; this is purely a
// navigation shortcut on top of that, so there's no controlled-open state
// to plumb through SectionCard.
export interface AppearanceSection {
  id: string;
  label: string;
}

export function AppearanceSidebar({
  sections,
  onSelect,
}: {
  sections: AppearanceSection[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-1 mb-1 flex gap-1.5 overflow-x-auto bg-background/85 px-1 py-2 backdrop-blur-sm [scrollbar-width:none]">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSelect(section.id)}
          className="shrink-0 cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:text-foreground active:scale-95"
        >
          {section.label}
        </button>
      ))}
    </div>
  );
}
