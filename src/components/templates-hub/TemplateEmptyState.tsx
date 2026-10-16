import { Button } from "@/components/ui/button";

export function TemplateEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <p className="font-display text-xl font-medium">No templates found</p>
      <p className="mt-1.5 text-sm text-muted-foreground">Try another search or category.</p>
      <Button variant="outline" size="sm" onClick={onClear} className="mt-5">
        Clear filters
      </Button>
    </div>
  );
}
