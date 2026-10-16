import { TEMPLATE_BADGE_LABEL, type TemplateBadgeKind } from "@/lib/templates";

// One quiet label style regardless of kind — badges differ by text only, and
// sit on a solid chip so they stay legible over any template's own colours.
export function TemplateBadge({ kind }: { kind: TemplateBadgeKind }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-ui border border-border bg-background px-1.5 py-1 text-[0.6875rem] font-medium leading-none text-foreground">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
      {TEMPLATE_BADGE_LABEL[kind]}
    </span>
  );
}
