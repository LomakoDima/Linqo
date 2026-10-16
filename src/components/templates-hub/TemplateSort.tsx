import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TemplateSortMode } from "@/lib/templates";

const SORT_OPTIONS: { value: TemplateSortMode; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
];

// Deliberately quiet — a sort control, not a filter, so it stays out of the
// way of the category chips that actually do most of the narrowing.
export function TemplateSort({
  value,
  onChange,
}: {
  value: TemplateSortMode;
  onChange: (value: TemplateSortMode) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TemplateSortMode)}>
      <SelectTrigger className="h-10 w-[150px] shrink-0 text-xs text-muted-foreground">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
