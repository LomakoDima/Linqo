import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  HEADING_FONTS,
  HEADING_FONT_CATEGORY_LABEL,
  getHeadingFont,
  loadAllHeadingFonts,
  type HeadingFontCategory,
} from "@/lib/fonts";
import { Check, ChevronsUpDown } from "lucide-react";

const CATEGORIES: HeadingFontCategory[] = ["sans", "serif", "display", "mono"];

// A deliberately large, face-rendered picker — every font shown set in its
// own typeface, not just named in a plain-text dropdown — so the choice is
// visual, not a guess from a font name.
export function HeadingFontPicker({
  value,
  onChange,
  variant = "full",
}: {
  value?: string;
  onChange: (key: string) => void;
  // "compact" is a small toolbar-style trigger ("Aa" + chevron) for contexts
  // that sit inline with other controls (the Text block's rich-text
  // toolbar); "full" is the wide, name-and-preview trigger used standalone.
  variant?: "full" | "compact";
}) {
  const current = getHeadingFont(value);
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) loadAllHeadingFonts();
      }}
    >
      <PopoverTrigger asChild>
        {variant === "compact" ? (
          <button
            type="button"
            title={`Font: ${current.label}`}
            aria-label={`Font: ${current.label}`}
            className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <span style={{ fontFamily: current.family }} className="text-foreground">
              Aa
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0" />
          </button>
        ) : (
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3.5 py-3 text-left transition-colors hover:border-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span style={{ fontFamily: current.family }} className="truncate text-lg">
              {current.label}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-96 w-[22rem] overflow-y-auto p-2">
        <div className="grid gap-3">
          {CATEGORIES.map((category) => {
            const fonts = HEADING_FONTS.filter((f) => f.category === category);
            if (fonts.length === 0) return null;
            return (
              <div key={category}>
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {HEADING_FONT_CATEGORY_LABEL[category]}
                </div>
                <div className="grid gap-0.5">
                  {fonts.map((f) => {
                    const active = f.key === (value ?? "default");
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => onChange(f.key)}
                        className={`flex items-center justify-between rounded-md px-3 py-2.5 text-left transition-colors ${
                          active ? "bg-accent" : "hover:bg-muted"
                        }`}
                      >
                        <span style={{ fontFamily: f.family }} className="truncate text-lg">
                          {f.label}
                        </span>
                        {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
